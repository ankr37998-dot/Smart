import express from "express";
import cors from "cors";
import morgan from "morgan";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server as SocketIOServer } from "socket.io";
import bcrypt from "bcryptjs";

import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import facultyRoutes from "./routes/facultyRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import mlRoutes from "./routes/mlRoutes.js";
import { User } from "./models/User.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { verifyToken } from "./utils/jwt.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS CONFIG
const parseOrigins = (value) => {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const configuredOrigins = [
  env.FRONTEND_URL,
  process.env.FRONTEND_URL,
  process.env.RENDER_EXTERNAL_URL,
  process.env.RENDER_URL,
  ...parseOrigins(process.env.ALLOWED_ORIGINS),
  "http://localhost:5500",
  "http://localhost:3000",
  "http://localhost:5173"
].filter(Boolean);

const allowedOrigins = [...new Set(configuredOrigins.map((origin) => origin.replace(/\/$/, "")))];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json());
app.use(morgan("dev"));

// Serve the current frontend with split HTML structure
const frontendDir = path.join(__dirname, "../frontend");
app.use(express.static(frontendDir));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(frontendDir, "admin-dashboard.html"));
});

// Admin split pages
app.get("/admin-dashboard.html", (req, res) => {
  res.sendFile(path.join(frontendDir, "admin-dashboard.html"));
});

app.get("/admin-users.html", (req, res) => {
  res.sendFile(path.join(frontendDir, "admin-users.html"));
});

app.get("/admin-departments.html", (req, res) => {
  res.sendFile(path.join(frontendDir, "admin-departments.html"));
});

app.get("/admin-sections.html", (req, res) => {
  res.sendFile(path.join(frontendDir, "admin-sections.html"));
});

app.get("/admin-courses.html", (req, res) => {
  res.sendFile(path.join(frontendDir, "admin-courses.html"));
});

app.get("/admin-timetable.html", (req, res) => {
  res.sendFile(path.join(frontendDir, "admin-timetable.html"));
});

app.get("/admin-promote.html", (req, res) => {
  res.sendFile(path.join(frontendDir, "admin-promote.html"));
});

app.get("/admin-analytics.html", (req, res) => {
  res.sendFile(path.join(frontendDir, "admin-analytics.html"));
});

app.get("/admin-face-id.html", (req, res) => {
  res.sendFile(path.join(frontendDir, "admin-face-id.html"));
});

app.get("/admin-profile.html", (req, res) => {
  res.sendFile(path.join(frontendDir, "admin-profile.html"));
});

app.get("/faculty", (req, res) => {
  res.sendFile(path.join(frontendDir, "faculty.html"));
});

app.get("/student", (req, res) => {
  res.sendFile(path.join(frontendDir, "student.html"));
});

app.get("/session", (req, res) => {
  res.sendFile(path.join(frontendDir, "session.html"));
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ message: "Smart Attendance System API" });
});

// REST endpoints
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/ml", mlRoutes);

app.use(notFound);
app.use(errorHandler);

// ---- SOCKET.IO SETUP ----
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ["websocket", "polling"],
  allowEIO3: true
});

// Attach io instance to app
app.set("io", io);

// Socket auth
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("No token"));
    }

    const decoded = verifyToken(token);

    socket.user = {
      id: decoded.id,
      role: decoded.role
    };

    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id, "role:", socket.user?.role);

  socket.on("join-class", ({ classId }) => {
    if (!classId) return;

    const room = `class:${classId}`;
    socket.join(room);
  });

  socket.on("leave-class", ({ classId }) => {
    if (!classId) return;

    const room = `class:${classId}`;
    socket.leave(room);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// ---- START SERVER ----
const PORT = process.env.PORT || env.PORT;

const ensureDefaultAdmin = async () => {
  const existingAdmin = await User.findOne({ role: "admin" });

  if (existingAdmin) {
    console.log(`Admin account already exists: ${existingAdmin.email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(env.DEFAULT_ADMIN_PASSWORD, 10);

  await User.create({
    name: env.DEFAULT_ADMIN_NAME,
    email: env.DEFAULT_ADMIN_EMAIL.toLowerCase(),
    passwordHash,
    role: "admin"
  });

  console.log(`Default admin created: ${env.DEFAULT_ADMIN_EMAIL}`);
};

const startServer = async () => {
  await connectDB();
  await ensureDefaultAdmin();

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch((err) => {
  console.error("Failed to start server:", err.message);
  process.exit(1);
});

// Global error handlers
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});
