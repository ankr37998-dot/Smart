import express from "express";
import { login, register } from "../controllers/authController.js";
import { authMiddleware, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/register", authMiddleware, requireRole("admin"), register);

export default router;
