import mongoose from "mongoose";
import { createObjectCsvStringifier } from "csv-writer";
import { Class } from "../models/Class.js";
import { AttendanceSession } from "../models/AttendanceSession.js";
import { AttendanceRecord } from "../models/AttendanceRecord.js";
import { User } from "../models/User.js";
import { summarizeAttendance } from "../utils/attendanceMetrics.js";

const escapeRegExp = (value) => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const cohortKey = ({ department, semester, section }) =>
  `${department}|${semester}|${section}`;

const getStudentsByCohort = async (classes) => {
  const cohorts = [...new Map(
    classes.map((cls) => [cohortKey(cls), {
      department: cls.department,
      semester: cls.semester,
      section: cls.section
    }])
  ).values()];
  if (!cohorts.length) return new Map();

  const studentCounts = await User.aggregate([
    { $match: { role: "student", $or: cohorts } },
    {
      $group: {
        _id: { department: "$department", semester: "$semester", section: "$section" },
        count: { $sum: 1 }
      }
    }
  ]);
  return new Map(studentCounts.map((item) => [cohortKey(item._id), item.count]));
};

const createClassFilter = (query, user) => {
  const { department, semester, section, courseCode, courseName } = query;
  const classFilter = {};
  if (department) classFilter.department = department;
  if (semester) classFilter.semester = semester;
  if (section) classFilter.section = section;
  if (courseCode) classFilter.courseCode = new RegExp(`^${escapeRegExp(courseCode)}$`, "i");
  if (courseName) classFilter.courseName = new RegExp(`^${escapeRegExp(courseName)}$`, "i");
  if (user?.role === "faculty") classFilter.facultyId = user._id;
  return classFilter;
};

const buildClassAttendanceReport = async (classFilter) => {
  const classes = await Class.find(classFilter).lean();
  if (!classes.length) return [];

  const classIds = classes.map((cls) => cls._id);
  const now = new Date();
  const sessions = await AttendanceSession.find({
    classId: { $in: classIds },
    $or: [{ isActive: false }, { expiresAt: { $lte: now } }]
  }).sort({ createdAt: -1 }).lean();
  const sessionIds = sessions.map((session) => session._id);
  const attendance = sessionIds.length
    ? await AttendanceRecord.aggregate([
      { $match: { sessionId: { $in: sessionIds } } },
      {
        $group: {
          _id: "$sessionId",
          total: { $sum: 1 },
          presents: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] }
          }
        }
      }
    ])
    : [];
  const attendanceBySession = new Map(
    attendance.map((item) => [item._id.toString(), item])
  );

  const studentsByCohort = await getStudentsByCohort(classes);

  const statsByClass = new Map();
  for (const session of sessions) {
    const key = session.classId.toString();
    const stats = statsByClass.get(key) || { sessions: 0, totalMarked: 0, presents: 0 };
    const attendanceForSession = attendanceBySession.get(session._id.toString());
    stats.sessions += 1;
    stats.totalMarked += attendanceForSession?.total || 0;
    stats.presents += attendanceForSession?.presents || 0;
    statsByClass.set(key, stats);
  }

  return classes.map((cls) => {
    const stats = statsByClass.get(cls._id.toString()) || {
      sessions: 0,
      totalMarked: 0,
      presents: 0
    };
    const totalStudents = studentsByCohort.get(cohortKey(cls)) || 0;
    return {
      class: cls,
      courseCode: cls.courseCode,
      courseName: cls.courseName,
      department: cls.department,
      semester: cls.semester,
      section: cls.section,
      totalClassesConducted: stats.sessions,
      totalStudents,
      totalMarked: stats.totalMarked,
      presentCount: stats.presents,
      ...summarizeAttendance({
        studentCount: totalStudents,
        sessionCount: stats.sessions,
        totalMarked: stats.totalMarked,
        presentCount: stats.presents
      })
    };
  });
};

// GET /analytics/student — personal attendance analytics for logged-in student
export const studentAnalytics = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { startDate, endDate } = req.query;
    const classes = await Class.find({
      department: req.user.department,
      semester: req.user.semester,
      section: req.user.section
    }).select("_id").lean();
    const classIds = classes.map((cls) => cls._id);
    const now = new Date();
    const sessions = classIds.length
      ? await AttendanceSession.find({
        classId: { $in: classIds },
        $or: [{ isActive: false }, { expiresAt: { $lte: now } }]
      }).populate("classId").lean()
      : [];

    const inRange = (dateValue) => {
      if (!startDate && !endDate) return true;
      const d = new Date(dateValue);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (d < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    };

    const filteredSessions = sessions.filter((session) => inRange(session.createdAt));
    const sessionIds = filteredSessions.map((session) => session._id);
    const records = sessionIds.length
      ? await AttendanceRecord.find({
        studentId,
        sessionId: { $in: sessionIds }
      }).select("sessionId status").lean()
      : [];
    const recordsBySession = new Map(
      records.map((record) => [record.sessionId.toString(), record])
    );
    const sessionAttendance = filteredSessions.map((session) => ({
      session,
      status: recordsBySession.get(session._id.toString())?.status === "present"
        ? "present"
        : "absent"
    }));

    const presentCount = sessionAttendance.filter((entry) => entry.status === "present").length;
    const absentCount = sessionAttendance.length - presentCount;
    const totalSessions = sessionAttendance.length;
    const attendancePercentage = totalSessions
      ? Math.round((presentCount / totalSessions) * 100)
      : 0;

    const monthlyMap = new Map();
    for (const entry of sessionAttendance) {
      const when = new Date(entry.session.createdAt);
      const monthKey = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { month: monthKey, present: 0, absent: 0 });
      }
      const bucket = monthlyMap.get(monthKey);
      if (entry.status === "present") bucket.present += 1;
      else bucket.absent += 1;
    }

    const detailRecords = sessionAttendance.map((entry) => {
      const session = entry.session;
      const cls = session?.classId;
      return {
        date: session?.createdAt,
        subject: cls?.courseName || cls?.courseCode || "N/A",
        faculty: "N/A",
        status: entry.status,
        sessionTime: session?.createdAt
          ? new Date(session.createdAt).toLocaleTimeString()
          : "N/A",
        location: cls?.room || "N/A"
      };
    });

    res.json({
      totalSessions,
      presentCount,
      absentCount,
      attendancePercentage,
      monthlyData: Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
      records: detailRecords.sort((a, b) => new Date(b.date) - new Date(a.date))
    });
  } catch (err) {
    console.error("studentAnalytics error:", err.message);
    next(err);
  }
};

// GET /analytics/report
export const report = async (req, res, next) => {
  try {
    const classFilter = createClassFilter(req.query, req.user);
    const result = await buildClassAttendanceReport(classFilter);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// GET /analytics/export
export const exportCsv = async (req, res, next) => {
  try {
    const classFilter = createClassFilter(req.query || {}, req.user);
    const classes = await Class.find(classFilter).lean();
    const classIds = classes.map((cls) => cls._id);
    const now = new Date();
    const sessions = classIds.length
      ? await AttendanceSession.find({
        classId: { $in: classIds },
        $or: [{ isActive: false }, { expiresAt: { $lte: now } }]
      }).sort({ createdAt: -1 }).lean()
      : [];
    const sessionIds = sessions.map((session) => session._id);
    const attendance = sessionIds.length
      ? await AttendanceRecord.aggregate([
        { $match: { sessionId: { $in: sessionIds } } },
        {
          $group: {
            _id: "$sessionId",
            total: { $sum: 1 },
            presents: {
              $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] }
            }
          }
        }
      ])
      : [];
    const attendanceBySession = new Map(
      attendance.map((item) => [item._id.toString(), item])
    );
    const classById = new Map(classes.map((cls) => [cls._id.toString(), cls]));
    const studentsByCohort = await getStudentsByCohort(classes);
    const records = sessions.map((session) => {
      const cls = classById.get(session.classId.toString());
      const stats = attendanceBySession.get(session._id.toString()) || { total: 0, presents: 0 };
      const totalStudents = studentsByCohort.get(cohortKey(cls)) || 0;
      return {
        department: cls?.department || "",
        semester: cls?.semester || "",
        section: cls?.section || "",
        courseCode: cls?.courseCode || "",
        courseName: cls?.courseName || "",
        sessionCreatedAt: session.createdAt,
        totalStudents,
        totalMarked: stats.total,
        presentCount: stats.presents,
        ...summarizeAttendance({
          studentCount: totalStudents,
          sessionCount: 1,
          totalMarked: stats.total,
          presentCount: stats.presents
        })
      };
    });

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: "department", title: "Department" },
        { id: "semester", title: "Semester" },
        { id: "section", title: "Section" },
        { id: "courseCode", title: "Course Code" },
        { id: "courseName", title: "Course Name" },
        { id: "sessionCreatedAt", title: "Session Time" },
        { id: "totalStudents", title: "Students" },
        { id: "totalExpected", title: "Expected Attendance" },
        { id: "totalMarked", title: "Total Marked" },
        { id: "presentCount", title: "Present" },
        { id: "absentCount", title: "Absent" },
        { id: "unmarkedCount", title: "Unmarked" },
        { id: "averageAttendance", title: "Average %" }
      ]
    });

    const header = csvStringifier.getHeaderString();
    const body = csvStringifier.stringifyRecords(records);
    const csv = header + body;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=attendance_report.csv"
    );

    res.send(csv);
  } catch (err) {
    next(err);
  }
};
