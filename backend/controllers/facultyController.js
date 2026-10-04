// GET /faculty/class/:classId/attendance-report?date=YYYY-MM-DD
export const getAttendanceReport = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: "Date is required" });

    // Ensure faculty owns this class
    const cls = await Class.findOne({ _id: classId, facultyId: req.user._id });
    if (!cls) return res.status(403).json({ message: "You are not assigned to this class" });

    // Find session for this class and date
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    const session = await AttendanceSession.findOne({
      classId,
      createdAt: { $gte: dayStart, $lte: dayEnd }
    });
    if (!session) return res.json([]); // No session, no attendance

    // Get all students for this class
    const students = await User.find({
      role: "student",
      department: cls.department,
      semester: cls.semester,
      section: cls.section
    }).select("_id name rollNo").sort({ rollNo: 1 });

    // Get attendance records for this session
    const records = await AttendanceRecord.find({ sessionId: session._id });
    const statusMap = {};
    records.forEach(r => { statusMap[r.studentId.toString()] = r.status; });

    // Build report
    const report = students.map(s => ({
      studentId: s.rollNo || s._id,
      name: s.name,
      rollNo: s.rollNo,
      status: statusMap[s._id.toString()] || "absent"
    }));
    res.json(report);
  } catch (err) {
    next(err);
  }
};
import crypto from "crypto";
import mongoose from "mongoose";
import { Class } from "../models/Class.js";
import { AttendanceSession } from "../models/AttendanceSession.js";
import { AttendanceRecord } from "../models/AttendanceRecord.js";
import { TimeTable } from "../models/TimeTable.js";
import { FacultySchedule } from "../models/FacultySchedule.js";
import { User } from "../models/User.js";
import { normalizeLocation } from "../utils/geofence.js";

export const myClasses = async (req, res, next) => {
  try {
    // First try to get classes from the old Class model (for backwards compatibility)
    const classesFromClassModel = await Class.find({ facultyId: req.user._id });

    // Also get classes from FacultySchedule (new approach)
    const facultySchedule = await FacultySchedule.findOne({ facultyId: req.user._id });

    // Extract unique classes from the schedule
    const classesFromSchedule = [];
    if (facultySchedule && facultySchedule.schedule) {
      const seenCourses = new Set();
      for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']) {
        const slots = facultySchedule.schedule[day] || [];
        for (const slot of slots) {
          const key = `${slot.courseCode}-${slot.department}-${slot.semester}-${slot.section}`;
          if (!seenCourses.has(key) && slot.courseCode) {
            seenCourses.add(key);

            // Try to find actual Class document for this course
            const actualClass = await Class.findOne({
              courseCode: slot.courseCode,
              department: slot.department,
              semester: slot.semester,
              section: slot.section
            });

            classesFromSchedule.push({
              _id: actualClass?._id || slot.classId || slot.courseId || slot._id,
              courseCode: slot.courseCode,
              courseName: slot.courseName,
              department: slot.department,
              semester: slot.semester,
              section: slot.section,
              facultyId: req.user._id
            });
          }
        }
      }
    }

    // Merge both sources, preferring Class model if available
    let allClasses = [];

    if (classesFromClassModel.length > 0) {
      allClasses = classesFromClassModel;
    } else if (classesFromSchedule.length > 0) {
      allClasses = classesFromSchedule;
    }

    res.json(allClasses);
  } catch (err) {
    next(err);
  }
};

// GET /faculty/my-schedule - Get faculty's schedule directly from FacultySchedule
export const getMySchedule = async (req, res, next) => {
  try {
    const facultyId = req.user._id;

    // Get schedule from FacultySchedule model
    let schedule = await FacultySchedule.findOne({ facultyId });

    // If no schedule exists, return empty
    if (!schedule) {
      return res.json({
        schedule: {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: []
        },
        message: "No schedule assigned yet"
      });
    }

    // Get today's classes with session status
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];

    const todayClasses = schedule.schedule[today] || [];

    // Check session status for each class today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const enrichedTodayClasses = await Promise.all(todayClasses.map(async (slot) => {
      const session = await AttendanceSession.findOne({
        classId: slot.classId,
        createdAt: { $gte: todayStart, $lte: todayEnd }
      }).sort({ createdAt: -1 });

      return {
        ...slot.toObject ? slot.toObject() : slot,
        hasSession: !!session,
        sessionActive: session?.isActive && session?.expiresAt > new Date(),
        sessionId: session?._id
      };
    }));

    res.json({
      schedule: schedule.schedule,
      todayClasses: enrichedTodayClasses,
      today
    });
  } catch (err) {
    next(err);
  }
};

// GET /faculty/timetable - Get faculty's timetable based on their classes
export const getMyTimetable = async (req, res, next) => {
  try {
    // Get all classes assigned to this faculty
    const myClasses = await Class.find({ facultyId: req.user._id });
    const savedFacultySchedule = await FacultySchedule.findOne({ facultyId: req.user._id });

    const hasSavedSchedule = savedFacultySchedule && savedFacultySchedule.schedule &&
      Object.values(savedFacultySchedule.schedule).some(daySlots => Array.isArray(daySlots) && daySlots.length > 0);

    // Prefer the saved faculty schedule if it exists, because admin schedule edits may be stored there.
    if (hasSavedSchedule) {
      return res.json({ schedule: savedFacultySchedule.schedule, classes: myClasses });
    }

    if (myClasses.length === 0) {
      return res.json({ schedule: {}, classes: [] });
    }

    // Get unique department/semester/section combinations
    const combinations = [...new Set(myClasses.map(c =>
      `${c.department}|${c.semester}|${c.section}`
    ))];

    // Fetch timetables for these combinations
    const timetables = await TimeTable.find({
      $or: combinations.map(combo => {
        const [department, semester, section] = combo.split('|');
        return { department, semester, section };
      })
    });

    // Build faculty's personal schedule
    const facultySchedule = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: []
    };

    const myCourses = myClasses.map(c => c.courseCode);

    for (const tt of timetables) {
      for (const day of Object.keys(facultySchedule)) {
        if (!tt.schedule[day]) continue;

        for (const slot of tt.schedule[day]) {
          if (myCourses.includes(slot.courseCode)) {
            // Find the class ID for this course
            const cls = myClasses.find(c =>
              c.courseCode === slot.courseCode &&
              c.department === tt.department &&
              c.semester === tt.semester &&
              c.section === tt.section
            );

            facultySchedule[day].push({
              ...slot.toObject ? slot.toObject() : slot,
              classId: cls?._id,
              department: tt.department,
              semester: tt.semester,
              section: tt.section
            });
          }
        }
      }

      // Sort each day by start time
      for (const day of Object.keys(facultySchedule)) {
        facultySchedule[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
      }
    }

    res.json({ schedule: facultySchedule, classes: myClasses });
  } catch (err) {
    next(err);
  }
};

// GET /faculty/current-class - Get current or upcoming class
export const getCurrentClass = async (req, res, next) => {
  try {
    const myClasses = await Class.find({ facultyId: req.user._id });

    if (myClasses.length === 0) {
      return res.json({ currentClass: null });
    }

    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[now.getDay()];

    if (today === 'sunday') {
      return res.json({ currentClass: null, message: "No classes on Sunday" });
    }

    const currentTime = now.getHours() * 60 + now.getMinutes();
    const myCourses = myClasses.map(c => c.courseCode);

    // Get all relevant timetables
    const combinations = [...new Set(myClasses.map(c =>
      `${c.department}|${c.semester}|${c.section}`
    ))];

    const timetables = await TimeTable.find({
      $or: combinations.map(combo => {
        const [department, semester, section] = combo.split('|');
        return { department, semester, section };
      })
    });

    let currentClass = null;
    let upcomingClass = null;

    for (const tt of timetables) {
      if (!tt.schedule[today]) continue;

      for (const slot of tt.schedule[today]) {
        if (!myCourses.includes(slot.courseCode)) continue;

        const [startH, startM] = slot.startTime.split(':').map(Number);
        const [endH, endM] = slot.endTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        const cls = myClasses.find(c =>
          c.courseCode === slot.courseCode &&
          c.department === tt.department
        );

        // Current class
        if (currentTime >= startMinutes && currentTime < endMinutes) {
          currentClass = {
            ...slot.toObject ? slot.toObject() : slot,
            classId: cls?._id,
            department: tt.department,
            semester: tt.semester,
            section: tt.section,
            status: 'ongoing'
          };
          break;
        }

        // Upcoming class (within next 30 minutes)
        if (currentTime < startMinutes && startMinutes - currentTime <= 30) {
          if (!upcomingClass || startMinutes < upcomingClass.startMinutes) {
            upcomingClass = {
              ...slot.toObject ? slot.toObject() : slot,
              classId: cls?._id,
              department: tt.department,
              semester: tt.semester,
              section: tt.section,
              status: 'upcoming',
              startMinutes
            };
          }
        }
      }

      if (currentClass) break;
    }

    res.json({
      currentClass: currentClass || upcomingClass,
      serverTime: now.toISOString()
    });
  } catch (err) {
    next(err);
  }
};

// POST /faculty/auto-session - Create session for current scheduled class
export const autoStartSession = async (req, res, next) => {
  try {
    const { classId, courseCode, courseName, department, semester, section, latitude, longitude, accuracy } = req.body;
    const location = normalizeLocation(latitude, longitude, accuracy);
    if (!location) {
      return res.status(400).json({ message: "Valid faculty location with accuracy of 20 meters or better is required" });
    }

    // Helper to get today's date range
    const getTodayRange = () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      return { todayStart, todayEnd };
    };

    // If we have schedule data (courseCode, department, etc.), use that
    if (courseCode && department) {
      // Find or create a class for this faculty+course combination
      let cls = await Class.findOne({
        facultyId: req.user._id,
        courseCode,
        department,
        semester: semester?.toString(),
        section: section || ''
      });

      // If no class exists, create one from schedule data
      if (!cls) {
        cls = await Class.create({
          facultyId: req.user._id,
          courseCode,
          courseName: courseName || courseCode,
          department,
          semester: semester?.toString() || '1',
          section: section || 'A'
        });
      }

      // Check if there's any session today for this class (not just active)
      const { todayStart, todayEnd } = getTodayRange();
      const existingSession = await AttendanceSession.findOne({
        classId: cls._id,
        createdAt: { $gte: todayStart, $lte: todayEnd }
      }).sort({ createdAt: -1 }); // Get the most recent one

      if (existingSession) {
        let shouldSave = false;
        // Reactivate if needed (extend expiry by 30 min from now if expired)
        if (!existingSession.isActive || existingSession.expiresAt < new Date()) {
          existingSession.isActive = true;
          existingSession.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
          shouldSave = true;
        }
        if (existingSession.latitude == null || existingSession.longitude == null) {
          Object.assign(existingSession, location);
          shouldSave = true;
        }
        if (shouldSave) {
          await existingSession.save();
        }

        return res.json({
          id: existingSession._id,
          classId: cls._id,
          qrToken: existingSession.qrToken,
          createdAt: existingSession.createdAt,
          expiresAt: existingSession.expiresAt,
          isActive: true,
          existing: true,
          className: `${department} - ${courseCode} (${section || ''})`
        });
      }

      // Create new session
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);
      const qrToken = crypto.randomBytes(16).toString("hex");

      const session = await AttendanceSession.create({
        classId: cls._id,
        qrToken,
        ...location,
        createdAt: now,
        expiresAt,
        isActive: true
      });

      return res.status(201).json({
        id: session._id,
        classId: cls._id,
        qrToken: session.qrToken,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        isActive: true,
        className: `${department} - ${courseCode} (${section || ''})`
      });
    }

    // Legacy: If classId provided, use it directly
    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      const cls = await Class.findOne({ _id: classId, facultyId: req.user._id });
      if (!cls) {
        return res.status(403).json({ message: "You are not assigned to this class" });
      }

      // Check if there's any session today for this class
      const { todayStart, todayEnd } = getTodayRange();
      const existingSession = await AttendanceSession.findOne({
        classId,
        createdAt: { $gte: todayStart, $lte: todayEnd }
      }).sort({ createdAt: -1 });

      if (existingSession) {
        let shouldSave = false;
        // Reactivate if needed
        if (!existingSession.isActive || existingSession.expiresAt < new Date()) {
          existingSession.isActive = true;
          existingSession.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
          shouldSave = true;
        }
        if (existingSession.latitude == null || existingSession.longitude == null) {
          Object.assign(existingSession, location);
          shouldSave = true;
        }
        if (shouldSave) {
          await existingSession.save();
        }

        return res.json({
          id: existingSession._id,
          classId: existingSession.classId,
          qrToken: existingSession.qrToken,
          createdAt: existingSession.createdAt,
          expiresAt: existingSession.expiresAt,
          isActive: true,
          existing: true
        });
      }

      // Create new session
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);
      const qrToken = crypto.randomBytes(16).toString("hex");

      const session = await AttendanceSession.create({
        classId,
        qrToken,
        ...location,
        createdAt: now,
        expiresAt,
        isActive: true
      });

      return res.status(201).json({
        id: session._id,
        classId: session.classId,
        qrToken: session.qrToken,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        isActive: true,
        className: `${cls.department} - ${cls.courseCode} (${cls.section})`
      });
    }

    return res.status(400).json({ message: "courseCode and department OR classId is required" });
  } catch (err) {
    next(err);
  }
};

// GET /faculty/class/:classId/students - Get students for a class
export const getClassStudents = async (req, res, next) => {
  try {
    const { classId } = req.params;

    const cls = await Class.findOne({ _id: classId, facultyId: req.user._id });
    if (!cls) {
      return res.status(403).json({ message: "You are not assigned to this class" });
    }

    const students = await User.find({
      role: "student",
      department: cls.department,
      semester: cls.semester,
      section: cls.section
    }).select("name email rollNo department semester section");

    res.json(students);
  } catch (err) {
    next(err);
  }
};

// POST /faculty/start-session
export const startSession = async (req, res, next) => {
  try {
    const { classId, latitude, longitude, accuracy } = req.body;
    const location = normalizeLocation(latitude, longitude, accuracy);

    if (!location) {
      return res.status(400).json({ message: "Valid faculty location with accuracy of 20 meters or better is required" });
    }

    if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ message: "Valid classId is required" });
    }

    // Ensure this class belongs to the faculty
    const cls = await Class.findOne({ _id: classId, facultyId: req.user._id });
    if (!cls) {
      return res.status(403).json({ message: "You are not assigned to this class" });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
    const qrToken = crypto.randomBytes(16).toString("hex");

    const session = await AttendanceSession.create({
      classId,
      qrToken,
      ...location,
      createdAt: now,
      expiresAt,
      isActive: true
    });

    res.status(201).json({
      id: session._id,
      qrToken: session.qrToken,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isActive: session.isActive
    });
  } catch (err) {
    next(err);
  }
};

// GET /faculty/class/:classId/sessions (basic history + counts)
export const classSessions = async (req, res, next) => {
  try {
    const { classId } = req.params;

    const sessions = await AttendanceSession.find({ classId })
      .sort({ createdAt: -1 })
      .lean();

    const sessionIds = sessions.map((s) => s._id);
    const counts = await AttendanceRecord.aggregate([
      { $match: { sessionId: { $in: sessionIds } } },
      {
        $group: {
          _id: "$sessionId",
          present: {
            $sum: {
              $cond: [{ $eq: ["$status", "present"] }, 1, 0]
            }
          },
          absent: {
            $sum: {
              $cond: [{ $eq: ["$status", "absent"] }, 1, 0]
            }
          }
        }
      }
    ]);

    const countMap = counts.reduce((acc, c) => {
      acc[c._id.toString()] = {
        present: c.present,
        absent: c.absent
      };
      return acc;
    }, {});

    const result = sessions.map((s) => ({
      ...s,
      counts: countMap[s._id.toString()] || { present: 0, absent: 0 }
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// POST /faculty/save-attendance - Save manual attendance for a session
export const saveAttendance = async (req, res, next) => {
  try {
    const { sessionId, attendance } = req.body;

    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ message: "Valid sessionId is required" });
    }

    if (!attendance || !Array.isArray(attendance)) {
      return res.status(400).json({ message: "Attendance array is required" });
    }

    // Verify the session exists and belongs to faculty's class
    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const cls = await Class.findOne({ _id: session.classId, facultyId: req.user._id });
    if (!cls) {
      return res.status(403).json({ message: "You are not authorized for this session" });
    }

    // Save attendance records
    const operations = attendance.map(record => ({
      updateOne: {
        filter: { sessionId, studentId: record.studentId },
        update: {
          $set: {
            sessionId,
            studentId: record.studentId,
            status: record.status === 'present' ? 'present' : 'absent',
            timestamp: new Date()
          }
        },
        upsert: true
      }
    }));
    await AttendanceRecord.bulkWrite(operations);
    res.json({
      message: "Attendance saved successfully",
      saved: attendance.length
    });
  } catch (err) {
    next(err);
  }
};

// POST /faculty/end-session/:sessionId - End an active attendance session
export const endSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ message: "Valid sessionId is required" });
    }

    // Find the session
    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Verify the session belongs to faculty's class
    const cls = await Class.findOne({ _id: session.classId, facultyId: req.user._id });
    if (!cls) {
      return res.status(403).json({ message: "You are not authorized to end this session" });
    }

    // Check if session is already ended
    if (!session.isActive) {
      return res.status(400).json({ message: "Session is already ended" });
    }

    // End the session
    session.isActive = false;
    session.endedAt = new Date();
    await session.save();

    // Get attendance count for this session
    const attendanceCount = await AttendanceRecord.countDocuments({
      sessionId: session._id,
      status: "present"
    });

    res.json({
      message: "Session ended successfully",
      sessionId: session._id,
      endedAt: session.endedAt,
      totalPresent: attendanceCount
    });
  } catch (err) {
    next(err);
  }
};

// ===================== MANUAL ATTENDANCE (ADD-ONLY) =====================
// Why manual attendance exists under QR?
// - Primary method is QR scanning (fast, scalable)
// - Manual is a fallback for edge cases (phone issues, network problems)
// - Keeping it secondary prevents misuse and maintains QR as the standard

/**
 * POST /faculty/manual-attendance
 * Mark or update attendance for a student
 * 
 * Request: { sessionId, studentId, status?, reason? }
 * Response: { success, message, studentName, markedAt, status }
 */
export const manualMarkAttendance = async (req, res, next) => {
  try {
    const { sessionId, studentId, status = 'present', reason } = req.body;

    // Validate required fields
    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ message: "Valid sessionId is required" });
    }
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: "Valid studentId is required" });
    }

    // Validate status
    const validStatus = ['present', 'absent'].includes(status) ? status : 'present';

    // Find the session
    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Verify faculty owns this session's class
    const cls = await Class.findOne({ _id: session.classId, facultyId: req.user._id });
    if (!cls) {
      return res.status(403).json({ message: "You are not authorized to mark attendance for this session" });
    }

    // Verify student belongs to this class (same department, semester, section)
    const student = await User.findOne({
      _id: studentId,
      role: "student",
      department: cls.department,
      semester: cls.semester,
      section: cls.section
    });
    if (!student) {
      return res.status(400).json({ message: "Student not found in this class" });
    }

    // Check for existing attendance record
    const existingRecord = await AttendanceRecord.findOne({ sessionId, studentId });

    if (existingRecord) {
      // Update existing record
      existingRecord.status = validStatus;
      existingRecord.timestamp = new Date();
      await existingRecord.save();

      return res.json({
        success: true,
        message: `${student.name} marked as ${validStatus}`,
        studentName: student.name,
        studentRollNo: student.rollNo,
        markedAt: existingRecord.timestamp,
        status: validStatus,
        updated: true
      });
    }

    // Create new attendance record
    const record = await AttendanceRecord.create({
      sessionId,
      studentId,
      status: validStatus,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: `${student.name} marked ${validStatus}`,
      studentName: student.name,
      studentRollNo: student.rollNo,
      markedAt: record.timestamp,
      status: validStatus,
      reason: reason || "Manual entry by faculty"
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /faculty/session/:sessionId/students
 * Get list of students for a session with their attendance status
 * Returns all students with current status for viewing and modifying
 */
export const getSessionStudents = async (req, res, next) => {
  try {
    const { classId, courseCode, courseName, department, semester, section, latitude, longitude, accuracy } = req.body;
    const { sessionId } = req.params;

    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ message: "Valid sessionId is required" });
    }

    // Find the session
    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Verify faculty owns this session's class
    const cls = await Class.findOne({ _id: session.classId, facultyId: req.user._id });
    if (!cls) {
      return res.status(403).json({ message: "You are not authorized for this session" });
    }

    // Get all students in this class
    const students = await User.find({
      role: "student",
      department: cls.department,
      semester: cls.semester,
      section: cls.section
    }).select("name email rollNo").sort({ rollNo: 1 });

    // Get existing attendance records for this session
    const attendanceRecords = await AttendanceRecord.find({ sessionId });
    const attendanceMap = new Map(attendanceRecords.map(r => [r.studentId.toString(), r.status]));

    // Mark students with their attendance status (default to absent)
    const studentsWithStatus = students.map(s => ({
      id: s._id,
      name: s.name,
      rollNo: s.rollNo,
      email: s.email,
      status: attendanceMap.get(s._id.toString()) || 'absent',
      alreadyMarked: attendanceMap.has(s._id.toString())
    }));

    // Count statistics
    const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
    const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;

    res.json({
      students: studentsWithStatus,
      totalStudents: students.length,
      markedCount: attendanceRecords.length,
      presentCount,
      absentCount,
      sessionActive: session.isActive && new Date() < session.expiresAt
    });
  } catch (err) {
    next(err);
  }
};
