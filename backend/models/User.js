import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "faculty", "student"],
      required: true
    },
    department: { type: String },
    semester: { type: String },
    section: { type: String },
    rollNo: { type: String, unique: true, sparse: true }, // e.g., 24CSE0001
    admissionYear: { type: Number }, // e.g., 2024
    status: { type: String, enum: ["active", "graduated", "inactive"], default: "active" },
    lowAttendanceAlertSentAt: { type: Date },

    /** Face registration metadata (descriptor is 128-length float vector).
     * Stored in MongoDB to persist across restarts/deploys.
     */
    face: {
      descriptor: { type: [Number], default: undefined },
      registeredAt: { type: Date },
      updatedAt: { type: Date },
      disabled: { type: Boolean, default: false },
      disabledAt: { type: Date },
      disabledReason: { type: String }
    }
  },
  { timestamps: true }
);

// Department code mapping
const departmentCodes = {
  "Computer Science & Engineering": "CSE",
  "Information Technology": "IT",
  "Electronics & Communication Engineering": "ECE",
  "Electrical & Electronics Engineering": "EEE",
  "Mechanical Engineering": "ME",
  "Civil Engineering": "CE"
};

// Static method to generate roll number
userSchema.statics.generateRollNo = async function (department, admissionYear) {
  const deptCode = departmentCodes[department] || "GEN";
  const yearCode = String(admissionYear).slice(-2); // Last 2 digits of year

  // Find the last roll number for this department and year
  const prefix = `${yearCode}${deptCode}`;
  const lastStudent = await this.findOne({
    rollNo: { $regex: `^${prefix}` }
  }).sort({ rollNo: -1 });

  let nextNum = 1;
  if (lastStudent && lastStudent.rollNo) {
    const lastNum = parseInt(lastStudent.rollNo.slice(-4));
    nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
};

// Static method to get department code
userSchema.statics.getDeptCode = function (department) {
  return departmentCodes[department] || "GEN";
};

// Static method to parse roll number
userSchema.statics.parseRollNo = function (rollNo) {
  if (!rollNo || rollNo.length < 7) return null;

  const yearCode = rollNo.slice(0, 2);
  const deptCode = rollNo.slice(2, -4);
  const serialNo = rollNo.slice(-4);

  // Find department name from code
  const deptName = Object.keys(departmentCodes).find(
    key => departmentCodes[key] === deptCode
  );

  return {
    admissionYear: 2000 + parseInt(yearCode),
    departmentCode: deptCode,
    department: deptName || "Unknown",
    serialNo: parseInt(serialNo)
  };
};

export const User = mongoose.model("User", userSchema);
export { departmentCodes };
