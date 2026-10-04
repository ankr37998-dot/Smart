import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

const testUsers = [
  {
    name: "Admin User",
    email: "admin@example.com",
    password: "admin123",
    role: "admin",
    department: null,
    semester: null,
    section: null
  },
  {
    name: "Faculty User",
    email: "faculty@example.com",
    password: "faculty123",
    role: "faculty",
    department: "CSE",
    semester: null,
    section: null
  },
  {
    name: "Student User",
    email: "student@example.com",
    password: "student123",
    role: "student",
    department: "CSE",
    semester: 6,
    section: "A"
  }
];

async function seedUsers() {
  try {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Test users cannot be seeded in production.");
    }

    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI environment variable is not defined");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Check if users already exist
    const existingCount = await User.countDocuments();

    if (existingCount > 0) {
      console.log(`\n${existingCount} users already exist in database.`);
      const existing = await User.find({}, "name email role");
      console.log("\nExisting users:");
      existing.forEach((u) => console.log(`  - ${u.name} (${u.email}) [${u.role}]`));
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log("No users found. Adding test users...\n");

    for (const userData of testUsers) {
      const passwordHash = await bcrypt.hash(userData.password, 10);

      const user = await User.create({
        name: userData.name,
        email: userData.email.toLowerCase(),
        passwordHash,
        role: userData.role,
        department: userData.department,
        semester: userData.semester,
        section: userData.section
      });

      console.log(`✓ Created ${user.role}: ${user.email}`);
      console.log(`  Password: ${userData.password}\n`);
    }

    console.log(`Successfully added ${testUsers.length} test users.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

seedUsers();
