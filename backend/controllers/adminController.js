import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Class } from "../models/Class.js";
import { TimeTable } from "../models/TimeTable.js";
import { FacultySchedule } from "../models/FacultySchedule.js";
import { AttendanceSession } from "../models/AttendanceSession.js";
import Section from "../models/Section.js";
import Department from "../models/Department.js";
import Course from "../models/Course.js";

export const listUsers = async (req, res, next) => {
  try {
    const { role, department, semester, section } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (department) filter.department = department;
    if (semester) filter.semester = semester;
    if (section) filter.section = section;
    const users = await User.find(filter).select("-passwordHash");
    res.json(users);
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, department, semester, section, admissionYear } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "name, email, password, role are required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "User with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userData = {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      department,
      semester,
      section
    };

    // Auto-generate roll number for students
    if (role === "student" && department) {
      const year = admissionYear || new Date().getFullYear();
      userData.admissionYear = year;
      userData.rollNo = await User.generateRollNo(department, year);
    }

    const user = await User.create(userData);

    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      rollNo: user.rollNo
    });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, password, department, semester, section, admissionYear } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if email is being changed and if it's already taken
    if (email && email.toLowerCase() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(409).json({ message: "Email already in use by another user" });
      }
      user.email = email.toLowerCase();
    }

    if (name) user.name = name;
    if (department) user.department = department;
    if (semester) user.semester = semester;
    if (section) user.section = section;
    if (admissionYear) user.admissionYear = admissionYear;

    if (password) {
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    await user.save();

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      semester: user.semester,
      section: user.section
    });
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Don't allow deleting admin users
    if (user.role === "admin") {
      return res.status(403).json({ message: "Cannot delete admin users" });
    }

    await User.findByIdAndDelete(userId);

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// ===================== TWO-STEP STUDENT CREATION =====================
// Why two-step flow?
// 1. Separates identity creation from academic assignment
// 2. Allows students to be created first, then assigned to classes later
// 3. Makes semester/section changes easy without re-registration
// 4. Admin has full control over academic placement

/**
 * STEP 1: Create student with basic identity only
 * POST /admin/students/create-basic
 * 
 * Creates a student account with ONLY identity details:
 * - name, email, password, rollNo (optional)
 * - department/semester/section are NOT set here
 * 
 * Request: { name, email, password, rollNo? }
 * Response: { id, name, email, rollNo, role, academicAssigned: false }
 */
export const createStudentBasic = async (req, res, next) => {
  try {
    const { name, email, password, rollNo } = req.body;

    // Validate required fields - only identity info
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "name, email, and password are required for basic student creation"
      });
    }

    // Check if email already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "User with this email already exists" });
    }

    // Check if rollNo is provided and already exists
    if (rollNo) {
      const existingRoll = await User.findOne({ rollNo });
      if (existingRoll) {
        return res.status(409).json({ message: "Roll number already assigned to another student" });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create student with identity only - NO academic details
    const student = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: "student",
      rollNo: rollNo || null,
      // department, semester, section intentionally NOT set
      // These will be assigned in Step 2 by admin
    });

    res.status(201).json({
      id: student._id,
      name: student.name,
      email: student.email,
      rollNo: student.rollNo,
      role: student.role,
      academicAssigned: false, // Flag indicating Step 2 is pending
      message: "Student created. Use assign-academic API to set department/semester/section."
    });
  } catch (err) {
    next(err);
  }
};

/**
 * STEP 2: Assign academic details to a student (Admin only)
 * POST /admin/students/assign-academic
 * 
 * Assigns or updates academic placement for a student:
 * - department, semester, section, academicYear (optional)
 * - Auto-generates rollNo if not already set
 * 
 * This API can be called multiple times to update placement
 * (e.g., when student moves to next semester)
 * 
 * Request: { studentId, department, semester, section, academicYear? }
 * Response: { id, name, email, rollNo, department, semester, section, message }
 */
export const assignAcademicDetails = async (req, res, next) => {
  try {
    const { studentId, department, semester, section, academicYear } = req.body;

    // Validate required fields
    if (!studentId) {
      return res.status(400).json({ message: "studentId is required" });
    }
    if (!department || !semester || !section) {
      return res.status(400).json({
        message: "department, semester, and section are required for academic assignment"
      });
    }

    // Find the student
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Ensure it's a student account
    if (student.role !== "student") {
      return res.status(400).json({ message: "This user is not a student" });
    }

    // Track if this is first assignment or update
    const isFirstAssignment = !student.department;

    // Update academic details
    student.department = department;
    student.semester = semester;
    student.section = section;

    if (academicYear) {
      student.admissionYear = academicYear;
    }

    // Auto-generate roll number if not already set
    if (!student.rollNo && department) {
      const year = academicYear || student.admissionYear || new Date().getFullYear();
      student.admissionYear = year;
      student.rollNo = await User.generateRollNo(department, year);
    }

    await student.save();

    res.json({
      id: student._id,
      name: student.name,
      email: student.email,
      rollNo: student.rollNo,
      department: student.department,
      semester: student.semester,
      section: student.section,
      admissionYear: student.admissionYear,
      academicAssigned: true,
      message: isFirstAssignment
        ? "Academic details assigned successfully"
        : "Academic details updated successfully"
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /admin/students/unassigned
 * 
 * Lists all students who have NOT been assigned academic details yet.
 * Useful for admin to see who needs Step 2 completion.
 * 
 * Response: [{ id, name, email, rollNo, createdAt }]
 */
export const listUnassignedStudents = async (req, res, next) => {
  try {
    // Find students without department (meaning academic details not assigned)
    const students = await User.find({
      role: "student",
      $or: [
        { department: { $exists: false } },
        { department: null },
        { department: "" }
      ]
    }).select("name email rollNo createdAt").sort({ createdAt: -1 });

    res.json(students.map(s => ({
      id: s._id,
      name: s.name,
      email: s.email,
      rollNo: s.rollNo || null,
      createdAt: s.createdAt,
      academicAssigned: false
    })));
  } catch (err) {
    next(err);
  }
};

export const listClasses = async (req, res, next) => {
  try {
    const classes = await Class.find().populate("facultyId", "name email");
    res.json(classes);
  } catch (err) {
    next(err);
  }
};

export const createClass = async (req, res, next) => {
  try {
    const {
      department,
      semester,
      section,
      courseCode,
      courseName,
      facultyEmail,
      facultyId
    } = req.body;

    if (!department || !semester || !section || !courseCode || !courseName) {
      return res.status(400).json({ message: "department, semester, section, courseCode, courseName are required" });
    }

    let resolvedFacultyId = facultyId;

    if (!resolvedFacultyId && facultyEmail) {
      const faculty = await User.findOne({
        email: facultyEmail.toLowerCase(),
        role: "faculty"
      });
      if (!faculty) {
        return res.status(400).json({ message: "Faculty with this email not found" });
      }
      resolvedFacultyId = faculty._id;
    }

    if (!resolvedFacultyId) {
      return res.status(400).json({ message: "facultyEmail or facultyId is required" });
    }

    const cls = await Class.create({
      department,
      semester,
      section,
      courseCode,
      courseName,
      facultyId: resolvedFacultyId
    });

    res.status(201).json(cls);
  } catch (err) {
    next(err);
  }
};

// Promote students to next semester
export const promoteStudents = async (req, res, next) => {
  try {
    const { department, fromSemester, section, studentIds } = req.body;

    if (!fromSemester) {
      return res.status(400).json({ message: "fromSemester is required" });
    }

    const currentSem = parseInt(fromSemester);
    const nextSem = currentSem + 1;

    if (nextSem > 8) {
      return res.status(400).json({ message: "Students in semester 8 cannot be promoted further (graduated)" });
    }

    let filter = {
      role: "student",
      semester: fromSemester.toString()
    };

    if (department) filter.department = department;
    if (section) filter.section = section;
    if (studentIds && studentIds.length > 0) {
      filter._id = { $in: studentIds };
    }

    const result = await User.updateMany(
      filter,
      { $set: { semester: nextSem.toString() } }
    );

    res.json({
      message: `Successfully promoted ${result.modifiedCount} students from semester ${currentSem} to semester ${nextSem}`,
      promoted: result.modifiedCount
    });
  } catch (err) {
    next(err);
  }
};

// Get promotion preview (students who will be promoted)
export const getPromotionPreview = async (req, res, next) => {
  try {
    const { department, semester, section } = req.query;

    if (!semester) {
      return res.status(400).json({ message: "semester is required" });
    }

    let filter = {
      role: "student",
      semester: semester.toString()
    };

    if (department) filter.department = department;
    if (section) filter.section = section;

    const students = await User.find(filter).select("name email department semester section");

    res.json({
      count: students.length,
      students,
      fromSemester: semester,
      toSemester: parseInt(semester) + 1
    });
  } catch (err) {
    next(err);
  }
};

// Mark students as graduated (for semester 8)
export const graduateStudents = async (req, res, next) => {
  try {
    const { department, section, studentIds } = req.body;

    let filter = {
      role: "student",
      semester: "8"
    };

    if (department) filter.department = department;
    if (section) filter.section = section;
    if (studentIds && studentIds.length > 0) {
      filter._id = { $in: studentIds };
    }

    const result = await User.updateMany(
      filter,
      { $set: { semester: "graduated", status: "graduated" } }
    );

    res.json({
      message: `Successfully graduated ${result.modifiedCount} students`,
      graduated: result.modifiedCount
    });
  } catch (err) {
    next(err);
  }
};

// ===================== TIMETABLE MANAGEMENT =====================

// GET /admin/timetable - Get timetable for a class
export const getTimetable = async (req, res, next) => {
  try {
    const { department, semester, section } = req.query;

    if (!department || !semester || !section) {
      return res.status(400).json({ message: "department, semester, and section are required" });
    }

    let timetable = await TimeTable.findOne({ department, semester, section });

    // If no timetable exists, create an empty one
    if (!timetable) {
      timetable = await TimeTable.create({
        department,
        semester,
        section,
        academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        schedule: {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: []
        }
      });
    }

    res.json(timetable);
  } catch (err) {
    next(err);
  }
};

// POST /admin/timetable/slot - Add a time slot to timetable
export const addTimetableSlot = async (req, res, next) => {
  try {
    const { department, semester, section, day, startTime, endTime, classId, courseCode, courseName, room } = req.body;

    if (!department || !semester || !section || !day || !startTime || !endTime || !classId) {
      return res.status(400).json({ message: "All fields are required" });
    }

    let timetable = await TimeTable.findOne({ department, semester, section });

    if (!timetable) {
      timetable = await TimeTable.create({
        department,
        semester,
        section,
        academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        schedule: {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: []
        }
      });
    }

    // Check for time conflict
    const existingSlot = timetable.schedule[day]?.find(slot =>
      slot.startTime === startTime ||
      (slot.startTime < endTime && slot.endTime > startTime)
    );

    if (existingSlot) {
      return res.status(409).json({ message: "Time slot conflicts with existing schedule" });
    }

    // Add new slot
    if (!timetable.schedule[day]) {
      timetable.schedule[day] = [];
    }

    timetable.schedule[day].push({
      startTime,
      endTime,
      classId,
      courseCode,
      courseName,
      room: room || ''
    });

    // Sort by start time
    timetable.schedule[day].sort((a, b) => a.startTime.localeCompare(b.startTime));

    timetable.markModified('schedule');
    await timetable.save();

    res.json({ message: "Time slot added successfully", timetable });
  } catch (err) {
    next(err);
  }
};

// POST /admin/timetable/slot/delete - Delete a time slot
export const deleteTimetableSlot = async (req, res, next) => {
  try {
    const { department, semester, section, day, startTime } = req.body;

    const timetable = await TimeTable.findOne({ department, semester, section });

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    if (!timetable.schedule[day]) {
      return res.status(404).json({ message: "No slots on this day" });
    }

    timetable.schedule[day] = timetable.schedule[day].filter(slot => slot.startTime !== startTime);

    timetable.markModified('schedule');
    await timetable.save();

    res.json({ message: "Time slot deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// ===================== FACULTY SCHEDULE MANAGEMENT =====================

// GET /admin/faculty-schedule - Get schedule for a faculty
export const getFacultySchedule = async (req, res, next) => {
  try {
    const { facultyId } = req.query;

    if (!facultyId) {
      return res.status(400).json({ message: "facultyId is required" });
    }

    let schedule = await FacultySchedule.findOne({ facultyId });

    // If no schedule exists, create an empty one
    if (!schedule) {
      schedule = await FacultySchedule.create({
        facultyId,
        schedule: {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: []
        }
      });
    }

    res.json(schedule);
  } catch (err) {
    next(err);
  }
};

// POST /admin/faculty-schedule/slot - Add a time slot to faculty's schedule
export const addFacultyScheduleSlot = async (req, res, next) => {
  try {
    const { facultyId, day, startTime, endTime, classId, courseId, courseCode, courseName, department, semester, section, room } = req.body;

    // Accept either classId or courseId
    const slotId = classId || courseId;
    if (!facultyId || !day || !startTime || !endTime || !slotId) {
      return res.status(400).json({ message: "facultyId, day, startTime, endTime, and course are required" });
    }

    const toMinutes = (time) => {
      const [hours, minutes] = String(time).split(":").map(Number);
      return hours * 60 + minutes;
    };
    const startMinutes = toMinutes(startTime);
    const endMinutes = toMinutes(endTime);
    const lunchStart = 13 * 60 + 30;
    const lunchEnd = 14 * 60 + 10;

    if (endMinutes <= startMinutes) {
      return res.status(400).json({ message: "End time must be after start time" });
    }

    if (startMinutes < lunchEnd && endMinutes > lunchStart) {
      return res.status(400).json({ message: "No class can be scheduled from 1:30 PM to 2:10 PM" });
    }

    let schedule = await FacultySchedule.findOne({ facultyId });
    if (!schedule) {
      schedule = await FacultySchedule.create({
        facultyId,
        schedule: {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: []
        }
      });
    }
    // Initialize day array if not exists
    if (!schedule.schedule[day]) {
      schedule.schedule[day] = [];
    }
    // Check for exact duplicate (same course, same time, same section on same day)
    const exactDuplicate = schedule.schedule[day]?.find(slot =>
      slot.courseCode === courseCode &&
      slot.startTime === startTime &&
      slot.endTime === endTime &&
      slot.section === section
    );
    if (exactDuplicate) {
      return res.status(409).json({ message: "This exact class slot already exists in the schedule" });
    }
    // Add new slot
    schedule.schedule[day].push({
      startTime,
      endTime,
      classId: slotId,
      courseId: slotId,
      courseCode,
      courseName,
      department,
      semester,
      section,
      room: room || ''
    });
    // Sort by start time
    schedule.schedule[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
    schedule.markModified('schedule');
    await schedule.save();
    // Also update the class-based timetable for students
    await updateClassTimetable(department, semester, section, day, {
      startTime, endTime, classId: slotId, courseCode, courseName, room
    });

    // Automatically create AttendanceSession for this slot
    // Find the class object for this slot
    const classObj = await Class.findById(slotId);
    if (classObj) {
      // Generate a unique QR token (simple random string)
      const qrToken = `QR-${slotId}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      // Set session expiration (e.g., 2 hours after startTime)
      const today = new Date();
      // Parse startTime and endTime as today's date
      const [startHour, startMin] = startTime.split(":");
      const [endHour, endMin] = endTime.split(":");
      const sessionStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(startHour), parseInt(startMin));
      const sessionEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(endHour), parseInt(endMin));
      await AttendanceSession.create({
        classId: classObj._id,
        qrToken,
        createdAt: sessionStart,
        expiresAt: sessionEnd,
        isActive: true
      });
    }

    res.json({ message: "Class added to schedule and attendance session created", schedule });
  } catch (err) {
    next(err);
  }
};

// Helper to also update class timetable when adding faculty schedule
async function updateClassTimetable(department, semester, section, day, slotData) {
  try {
    let timetable = await TimeTable.findOne({ department, semester, section });

    if (!timetable) {
      timetable = await TimeTable.create({
        department,
        semester,
        section,
        academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        schedule: {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: []
        }
      });
    }

    // Check if slot already exists
    const exists = timetable.schedule[day]?.find(s => s.startTime === slotData.startTime);
    if (!exists) {
      if (!timetable.schedule[day]) timetable.schedule[day] = [];
      timetable.schedule[day].push(slotData);
      timetable.schedule[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
      timetable.markModified('schedule');
      await timetable.save();
    }
  } catch (err) {
    console.error("Error updating class timetable:", err);
  }
}

// POST /admin/faculty-schedule/slot/delete - Delete a time slot from faculty's schedule
export const deleteFacultyScheduleSlot = async (req, res, next) => {
  try {
    const { facultyId, day, startTime } = req.body;

    const schedule = await FacultySchedule.findOne({ facultyId });

    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    if (!schedule.schedule[day]) {
      return res.status(404).json({ message: "No slots on this day" });
    }

    // Get slot info before deleting (for class timetable cleanup)
    const slot = schedule.schedule[day].find(s => s.startTime === startTime);

    schedule.schedule[day] = schedule.schedule[day].filter(s => s.startTime !== startTime);

    schedule.markModified('schedule');
    await schedule.save();

    // Also remove from class timetable
    if (slot) {
      await removeFromClassTimetable(slot.department, slot.semester, slot.section, day, startTime);
    }

    res.json({ message: "Time slot deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// Helper to remove slot from class timetable
async function removeFromClassTimetable(department, semester, section, day, startTime) {
  try {
    const timetable = await TimeTable.findOne({ department, semester, section });
    if (timetable && timetable.schedule[day]) {
      timetable.schedule[day] = timetable.schedule[day].filter(s => s.startTime !== startTime);
      timetable.markModified('schedule');
      await timetable.save();
    }
  } catch (err) {
    console.error("Error removing from class timetable:", err);
  }
}

// POST /admin/faculty-schedule/save - Save complete faculty schedule
export const saveFacultySchedule = async (req, res, next) => {
  try {
    const { facultyId, schedule } = req.body;

    if (!facultyId) {
      return res.status(400).json({ message: "Faculty ID is required" });
    }

    let facultySchedule = await FacultySchedule.findOne({ facultyId });

    if (facultySchedule) {
      facultySchedule.schedule = schedule;
      facultySchedule.markModified('schedule');
      await facultySchedule.save();
    } else {
      facultySchedule = await FacultySchedule.create({
        facultyId,
        schedule
      });
    }

    res.json({ message: "Schedule saved successfully", schedule: facultySchedule });
  } catch (err) {
    next(err);
  }
};

// ===================== SECTION MANAGEMENT =====================

// GET /admin/sections - List all sections (optionally filter by department)
export const listSections = async (req, res, next) => {
  try {
    const { department, semester } = req.query;
    const filter = { isActive: true };
    if (department) filter.department = department;
    if (semester) filter.semester = semester;

    const sections = await Section.find(filter).sort({ department: 1, semester: 1, name: 1 });
    res.json(sections);
  } catch (err) {
    next(err);
  }
};

// POST /admin/sections - Create a new section
export const createSection = async (req, res, next) => {
  try {
    const { name, department, semester, description } = req.body;

    if (!name || !department || !semester) {
      return res.status(400).json({ message: "Section name, department, and semester are required" });
    }
    const normalizedSemester = String(semester);
    if (!/^[1-8]$/.test(normalizedSemester)) {
      return res.status(400).json({ message: "Semester must be between 1 and 8" });
    }

    const existing = await Section.findOne({
      name: name.toUpperCase(),
      department,
      semester: normalizedSemester
    });
    if (existing) {
      return res.status(409).json({ message: "Section already exists in this department and semester" });
    }

    const section = await Section.create({
      name: name.toUpperCase(),
      department,
      semester: normalizedSemester,
      description
    });

    res.status(201).json(section);
  } catch (err) {
    next(err);
  }
};

// PUT /admin/sections/:id - Update a section
export const updateSection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, semester, description, isActive } = req.body;

    const section = await Section.findById(id);
    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    const nextName = name ? name.toUpperCase() : section.name;
    const nextSemester = semester === undefined ? section.semester : String(semester);
    if (semester !== undefined && !/^[1-8]$/.test(nextSemester)) {
      return res.status(400).json({ message: "Semester must be between 1 and 8" });
    }

    if (nextSemester && (name || semester !== undefined)) {
      const duplicate = await Section.findOne({
        _id: { $ne: id },
        name: nextName,
        department: section.department,
        semester: nextSemester
      });
      if (duplicate) {
        return res.status(409).json({ message: "Section already exists in this department and semester" });
      }
    }

    if (name) section.name = nextName;
    if (semester !== undefined) section.semester = nextSemester;
    if (description !== undefined) section.description = description;
    if (isActive !== undefined) section.isActive = isActive;

    await section.save();
    res.json(section);
  } catch (err) {
    next(err);
  }
};

// DELETE /admin/sections/:id - Delete a section
export const deleteSection = async (req, res, next) => {
  try {
    const { id } = req.params;

    const section = await Section.findByIdAndDelete(id);
    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    res.json({ message: "Section deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// ===================== DEPARTMENT MANAGEMENT =====================

// GET /admin/departments - List all departments
export const listDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({ isActive: true }).sort({ name: 1 });
    res.json(departments);
  } catch (err) {
    next(err);
  }
};

// POST /admin/departments - Create a new department
export const createDepartment = async (req, res, next) => {
  try {
    const { name, code, description } = req.body;

    if (!name || !code) {
      return res.status(400).json({ message: "Department name and code are required" });
    }

    // Check if department already exists
    const existing = await Department.findOne({
      $or: [{ name }, { code: code.toUpperCase() }]
    });
    if (existing) {
      return res.status(409).json({ message: "Department with this name or code already exists" });
    }

    const department = await Department.create({
      name,
      code: code.toUpperCase(),
      description
    });

    res.status(201).json(department);
  } catch (err) {
    next(err);
  }
};

// PUT /admin/departments/:id - Update a department
export const updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, description, isActive } = req.body;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    if (name) department.name = name;
    if (code) department.code = code.toUpperCase();
    if (description !== undefined) department.description = description;
    if (isActive !== undefined) department.isActive = isActive;

    await department.save();
    res.json(department);
  } catch (err) {
    next(err);
  }
};

// DELETE /admin/departments/:id - Delete a department
export const deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const department = await Department.findByIdAndDelete(id);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.json({ message: "Department deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// ==================== COURSE MANAGEMENT ====================

// GET /admin/courses - List all courses (with optional filters)
export const listCourses = async (req, res, next) => {
  try {
    const { department, semester, isActive } = req.query;
    const filter = {};

    if (department) filter.department = department;
    if (semester) filter.semester = parseInt(semester);
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const courses = await Course.find(filter)
      .populate('department', 'name code')
      .sort({ department: 1, semester: 1, courseCode: 1 });

    res.json(courses);
  } catch (err) {
    next(err);
  }
};

// POST /admin/courses - Create a new course
export const createCourse = async (req, res, next) => {
  try {
    const { courseCode, courseName, department, semester, credits, description } = req.body;

    if (!courseCode || !courseName || !department || !semester) {
      return res.status(400).json({ message: "Course code, name, department, and semester are required" });
    }

    // Check if course code already exists in this department
    const existing = await Course.findOne({
      courseCode: courseCode.toUpperCase(),
      department
    });
    if (existing) {
      return res.status(409).json({ message: "Course code already exists in this department" });
    }

    const course = await Course.create({
      courseCode: courseCode.toUpperCase(),
      courseName,
      department,
      semester: parseInt(semester),
      credits: credits || 3,
      description: description || ''
    });

    const populated = await Course.findById(course._id).populate('department', 'name code');
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

// PUT /admin/courses/:id - Update a course
export const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { courseCode, courseName, department, semester, credits, description, isActive } = req.body;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Check for duplicate course code if changing
    if (courseCode && (courseCode.toUpperCase() !== course.courseCode || department !== course.department.toString())) {
      const existing = await Course.findOne({
        courseCode: courseCode.toUpperCase(),
        department: department || course.department,
        _id: { $ne: id }
      });
      if (existing) {
        return res.status(409).json({ message: "Course code already exists in this department" });
      }
    }

    if (courseCode) course.courseCode = courseCode.toUpperCase();
    if (courseName) course.courseName = courseName;
    if (department) course.department = department;
    if (semester) course.semester = parseInt(semester);
    if (credits !== undefined) course.credits = credits;
    if (description !== undefined) course.description = description;
    if (isActive !== undefined) course.isActive = isActive;

    await course.save();

    const populated = await Course.findById(course._id).populate('department', 'name code');
    res.json(populated);
  } catch (err) {
    next(err);
  }
};

// DELETE /admin/courses/:id - Delete a course
export const deleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;

    const course = await Course.findByIdAndDelete(id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json({ message: "Course deleted successfully" });
  } catch (err) {
    next(err);
  }
};