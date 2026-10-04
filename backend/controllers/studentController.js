import mongoose from "mongoose";
import { Class } from "../models/Class.js";
import { AttendanceSession } from "../models/AttendanceSession.js";
import { AttendanceRecord } from "../models/AttendanceRecord.js";
import { FaceVerification } from "../models/FaceVerification.js";
import { User } from "../models/User.js";
import { sendLowAttendanceEmail } from "../utils/mailer.js";
import { calculateDistance, normalizeLocation } from "../utils/geofence.js";

export const myClasses = async (req, res, next) => {
  try {
    const { department, semester, section } = req.user;
    const classes = await Class.find({ department, semester, section });
    res.json(classes);
  } catch (err) {
    next(err);
  }
};

// GET /student/dashboard
export const studentDashboard = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const enrolledClasses = await Class.find({
      department: req.user.department,
      semester: req.user.semester,
      section: req.user.section
    }).lean();
    const totalClasses = enrolledClasses.length;
    const classIds = enrolledClasses.map((cls) => cls._id);
    const now = new Date();
    const sessions = classIds.length
      ? await AttendanceSession.find({
        classId: { $in: classIds },
        $or: [{ isActive: false }, { expiresAt: { $lte: now } }]
      }).populate("classId").lean()
      : [];

    if (!sessions.length) {
      return res.json({
        overallPercentage: 0,
        subjects: [],
        lowestSubject: null,
        totalClasses,
        attendedClasses: 0,
        remainingClasses: totalClasses
      });
    }

    const sessionIds = sessions.map((session) => session._id);
    const records = await AttendanceRecord.find({
      studentId,
      sessionId: { $in: sessionIds }
    }).select("sessionId status").lean();
    const recordsBySession = new Map(
      records.map((record) => [record.sessionId.toString(), record])
    );

    const perClass = new Map();
    for (const session of sessions) {
      const cls = session.classId;
      if (!cls) continue;
      const key = cls._id.toString();
      if (!perClass.has(key)) {
        perClass.set(key, {
          class: {
            id: cls._id,
            courseCode: cls.courseCode,
            courseName: cls.courseName
          },
          total: 0,
          present: 0
        });
      }
      const agg = perClass.get(key);
      agg.total += 1;
      if (recordsBySession.get(session._id.toString())?.status === "present") {
        agg.present += 1;
      }
    }

    let totalOverall = 0;
    let totalPresentOverall = 0;
    const subjects = [];
    for (const { class: cls, total, present } of perClass.values()) {
      totalOverall += total;
      totalPresentOverall += present;
      const percentage = total ? Math.round((present / total) * 100) : 0;
      subjects.push({
        class: cls,
        total,
        present,
        percentage
      });
    }

    const overallPercentage = totalOverall
      ? Math.round((totalPresentOverall / totalOverall) * 100)
      : 0;

    let lowestSubject = null;
    for (const s of subjects) {
      if (!lowestSubject || s.percentage < lowestSubject.percentage) {
        lowestSubject = s;
      }
    }

    if (overallPercentage < 75 && req.user.email) {
      const sentAt = new Date();
      const cooldownStart = new Date(sentAt.getTime() - 24 * 60 * 60 * 1000);
      const alertClaim = await User.findOneAndUpdate(
        {
          _id: studentId,
          $or: [
            { lowAttendanceAlertSentAt: { $exists: false } },
            { lowAttendanceAlertSentAt: { $lte: cooldownStart } }
          ]
        },
        { $set: { lowAttendanceAlertSentAt: sentAt } },
        { new: true }
      ).select("_id");

      if (alertClaim) {
        try {
          await sendLowAttendanceEmail(req.user.email, overallPercentage);
        } catch (e) {
          console.error("Failed to send low attendance email", e.message);
        }
      }
    }

    const attendedClassIds = new Set(
      subjects
        .filter((s) => s.present > 0)
        .map((s) => (s.class?.id != null ? String(s.class.id) : ""))
        .filter(Boolean)
    );

    res.json({
      overallPercentage,
      subjects,
      lowestSubject,
      totalClasses,
      attendedClasses: attendedClassIds.size,
      remainingClasses: Math.max(0, totalClasses - attendedClassIds.size)
    });
  } catch (err) {
    console.error("studentDashboard error:", err.message);
    next(err);
  }
};

// POST /student/mark-attendance — dual verification (face token + live QR)
export const markAttendance = async (req, res, next) => {
  try {
    const { qrToken, faceVerificationToken, latitude, longitude, accuracy } = req.body;
    const studentId = req.user._id;

    if (!qrToken || typeof qrToken !== "string" || !qrToken.trim()) {
      return res.status(400).json({ message: "qrToken is required" });
    }
    if (!faceVerificationToken || typeof faceVerificationToken !== "string") {
      return res.status(400).json({
        message: "Face verification is required before marking attendance. Verify your face first.",
        code: "FACE_VERIFICATION_REQUIRED",
      });
    }

    const now = new Date();
    const session = await AttendanceSession.findOne({
      qrToken: qrToken.trim(),
      isActive: true,
      expiresAt: { $gt: now },
    });

    if (!session) {
      console.warn("markAttendance: invalid or expired QR session", { studentId });
      return res.status(400).json({ message: "Invalid or expired QR session" });
    }

    // Location validation
    const location = normalizeLocation(latitude, longitude, accuracy);
    if (!location) {
      return res.status(400).json({
        success: false,
        message: "Valid location with accuracy of 20 meters or better is required"
      });
    }

    // Session must have location
    if (session.latitude === undefined || session.longitude === undefined) {
      console.warn("markAttendance: session missing location", { sessionId: session._id });
      return res.status(400).json({ success: false, message: "Session location missing" });
    }

    // Calculate distance between student and session
    const distance = calculateDistance(location.latitude, location.longitude, session.latitude, session.longitude);
    if (distance === null) {
      return res.status(400).json({ success: false, message: "Invalid location data" });
    }
    if (distance > (session.radius || 30)) {
      return res.status(403).json({ success: false, message: "You are outside the classroom area" });
    }

    const { department, semester, section } = req.user;
    const studentClasses = await Class.find({ department, semester, section }).select("_id");
    const classIds = studentClasses.map((c) => c._id.toString());
    if (!classIds.includes(session.classId.toString())) {
      console.warn("markAttendance: session not for student class", {
        studentId,
        sessionClassId: session.classId,
      });
      return res.status(403).json({ message: "This QR session is not for your class" });
    }

    const existing = await AttendanceRecord.findOne({
      sessionId: session._id,
      studentId,
    });
    if (existing) {
      return res.status(409).json({ message: "Attendance already marked for this session" });
    }

    const faceProof = await FaceVerification.consumeToken(
      faceVerificationToken.trim(),
      studentId
    );
    if (!faceProof) {
      console.warn("markAttendance: invalid or expired face token", { studentId });
      return res.status(403).json({
        message: "Face verification expired or invalid. Please verify your face again.",
        code: "FACE_VERIFICATION_INVALID",
      });
    }

    try {
      const ipAddress = (req.headers["x-forwarded-for"] || req.ip || "").toString().split(",")[0].trim();
      const userAgent = req.get("User-Agent") || "";

      const record = await AttendanceRecord.create({
        sessionId: session._id,
        studentId,
        status: "present",
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        distanceFromSession: Math.round(distance),
        markedAt: new Date(),
        ipAddress,
        userAgent
      });

      const io = req.app.get("io");
      if (io) {
        io.to(`class:${session.classId}`).emit("attendance-updated", {
          sessionId: session._id,
          studentId,
        });
      }

      console.info("markAttendance: dual verification success", {
        studentId,
        sessionId: session._id,
      });

      res.status(201).json({
        message: "Attendance marked successfully (face + QR verified)",
        record,
        verification: { face: true, qr: true },
      });
    } catch (e) {
      if (e.code === 11000) {
        return res.status(409).json({ message: "Attendance already marked for this session" });
      }
      console.error("markAttendance: create failed", e.message);
      throw e;
    }
  } catch (err) {
    console.error("markAttendance error:", err.message);
    next(err);
  }
};

// GET /student/profile
export const getProfile = async (req, res, next) => {
  try {
    const user = req.user;
    res.json({
      name: user.name,
      email: user.email,
      studentId: user._id,
      branch: user.department,
      semester: user.semester,
      section: user.section
    });
  } catch (err) {
    console.error("getProfile error:", err.message);
    next(err);
  }
};

// GET /student/timetable
export const getTimetable = async (req, res, next) => {
  try {
    const { department, semester, section } = req.user;

    // Import TimeTable model
    const { TimeTable } = await import("../models/TimeTable.js");

    // Fetch timetable for student's department, semester, and section
    const timetable = await TimeTable.findOne({
      department,
      semester: String(semester),
      section
    });

    if (!timetable) {
      return res.json([]);
    }

    // Transform timetable data for frontend
    // Collect all unique time slots across all days
    const timeSlots = new Map();
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    days.forEach(day => {
      const daySchedule = timetable.schedule[day] || [];
      daySchedule.forEach(slot => {
        const timeKey = `${slot.startTime} - ${slot.endTime}`;
        if (!timeSlots.has(timeKey)) {
          timeSlots.set(timeKey, {
            time: timeKey,
            startTime: slot.startTime,
            monday: null,
            tuesday: null,
            wednesday: null,
            thursday: null,
            friday: null,
            saturday: null
          });
        }
        timeSlots.get(timeKey)[day] = {
          course: `${slot.courseCode || ''} ${slot.courseName || ''}`.trim(),
          courseCode: slot.courseCode,
          courseName: slot.courseName,
          room: slot.room,
          classId: slot.classId
        };
      });
    });

    // Sort by start time and convert to array
    const result = Array.from(timeSlots.values()).sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );

    res.json(result);
  } catch (err) {
    console.error("getTimetable error:", err.message);
    next(err);
  }
};

// GET /student/active-sessions - Get active attendance sessions for student's class
export const getActiveSessions = async (req, res, next) => {
  try {
    const { department, semester, section } = req.user;
    const now = new Date();

    // Find classes for this student
    const classes = await Class.find({ department, semester, section });
    const classIds = classes.map(c => c._id);

    // Find active sessions for these classes
    const sessions = await AttendanceSession.find({
      classId: { $in: classIds },
      isActive: true,
      expiresAt: { $gt: now }
    }).populate("classId");

    // Check which sessions the student has already marked attendance for
    const sessionIds = sessions.map(s => s._id);
    const markedRecords = await AttendanceRecord.find({
      sessionId: { $in: sessionIds },
      studentId: req.user._id
    });
    const markedSessionIds = new Set(markedRecords.map(r => r.sessionId.toString()));

    const result = sessions
      .filter((session) => session.classId)
      .map((session) => ({
        sessionId: session._id,
        classId: session.classId._id,
        courseCode: session.classId.courseCode,
        courseName: session.classId.courseName,
        qrToken: session.qrToken,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        alreadyMarked: markedSessionIds.has(session._id.toString())
      }));

    res.json(result);
  } catch (err) {
    console.error("getActiveSessions error:", err.message);
    next(err);
  }
};

// GET /student/attendance?date=YYYY-MM-DD
export const getAttendance = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { department, semester, section } = req.user;

    // Find classes for this student
    const classes = await Class.find({ department, semester, section });
    const classIds = classes.map(c => c._id);

    // Find sessions for these classes on the given date
    const sessions = await AttendanceSession.find({
      classId: { $in: classIds },
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).populate("classId");

    const results = [];
    for (const session of sessions) {
      if (!session.classId) continue;
      const record = await AttendanceRecord.findOne({
        sessionId: session._id,
        studentId: req.user._id
      });

      results.push({
        subject: session.classId.courseName,
        status: record ? "Present" : "Absent"
      });
    }

    res.json(results);
  } catch (err) {
    console.error("getAttendance error:", err.message);
    next(err);
  }
};

// GET /student/today-attendance - Get today's attendance with verification details
export const getTodayAttendance = async (req, res, next) => {
  try {
    const { department, semester, section } = req.user;

    // Get today's date range
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // Find all classes for this student
    const classes = await Class.find({ department, semester, section });
    const classIds = classes.map(c => c._id);

    // Find all sessions for today
    const sessions = await AttendanceSession.find({
      classId: { $in: classIds },
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).populate("classId").sort({ createdAt: -1 });

    const results = [];

    for (const session of sessions) {
      if (!session.classId) continue;
      const record = await AttendanceRecord.findOne({
        sessionId: session._id,
        studentId: req.user._id
      });

      results.push({
        sessionId: session._id,
        courseCode: session.classId.courseCode,
        courseName: session.classId.courseName,
        sessionStartedAt: session.createdAt,
        isActive: session.isActive && session.expiresAt > now,
        status: record ? record.status : 'absent',
        markedAt: record ? record.markedAt || record.createdAt : null,
        verificationCode: record ? `${session._id.toString().slice(-4).toUpperCase()}-${record._id.toString().slice(-4).toUpperCase()}` : null
      });
    }

    res.json({
      date: now.toISOString().split('T')[0],
      totalSessions: sessions.length,
      presentCount: results.filter(r => r.status === 'present').length,
      absentCount: results.filter(r => r.status === 'absent').length,
      records: results
    });
  } catch (err) {
    console.error("getTodayAttendance error:", err.message);
    next(err);
  }
};
