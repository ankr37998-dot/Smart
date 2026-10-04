import dotenv from "dotenv";

dotenv.config();

const requiredEnv = (name) => {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Environment variable ${name} is required and must not be empty.`);
  }
  return value;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || 5000,
  MONGO_URI: requiredEnv("MONGO_URI"),
  JWT_SECRET: requiredEnv("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1d",
  EMAIL_HOST: process.env.EMAIL_HOST || "",
  EMAIL_PORT: process.env.EMAIL_PORT || 587,
  EMAIL_USER: process.env.EMAIL_USER || "",
  EMAIL_PASS: process.env.EMAIL_PASS || "",
  FRONTEND_URL: process.env.FRONTEND_URL || "",
  /** Flask attendance shortage predictor (ml/app.py) */
  ML_PREDICT_URL: process.env.ML_PREDICT_URL || "",
  ML_TRAIN_SECRET: process.env.ML_TRAIN_SECRET || "",
  /** Face recognition runs locally via Python worker (backend/ml/face_worker.py).
   * No separate deployed service is required.
   */
  FACE_ML_SERVICE_URL: process.env.FACE_ML_SERVICE_URL || process.env.FACE_SERVICE_URL || "",
  FACE_ML_TIMEOUT_MS: Number(process.env.FACE_ML_TIMEOUT_MS || 30000),
  DEFAULT_ADMIN_EMAIL: requiredEnv("DEFAULT_ADMIN_EMAIL"),
  DEFAULT_ADMIN_PASSWORD: requiredEnv("DEFAULT_ADMIN_PASSWORD"),
  DEFAULT_ADMIN_NAME: process.env.DEFAULT_ADMIN_NAME || "Super Admin"
};
