import axios from "axios";
import { env } from "../config/env.js";

const ML_TIMEOUT_MS = Number(process.env.ML_PREDICT_TIMEOUT_MS) || 10_000;

const mlAxios = axios.create({
    baseURL: env.ML_PREDICT_URL,
    timeout: ML_TIMEOUT_MS,
    headers: { "Content-Type": "application/json" },
});

export function validateShortagePayload(body) {
    if (!body || typeof body !== "object") {
        throw new ValidationError("Request body must be a JSON object.");
    }

    const { attendance_percentage, absent_days } = body;
    if (attendance_percentage === undefined || attendance_percentage === null) {
        throw new ValidationError("attendance_percentage is required.");
    }
    if (absent_days === undefined || absent_days === null) {
        throw new ValidationError("absent_days is required.");
    }

    const pct = Number(attendance_percentage);
    const absent = Number(absent_days);
    if (Number.isNaN(pct) || Number.isNaN(absent)) {
        throw new ValidationError("attendance_percentage and absent_days must be valid numbers.");
    }
    if (pct < 0 || pct > 100) {
        throw new ValidationError("attendance_percentage must be between 0 and 100.");
    }
    if (absent < 0) {
        throw new ValidationError("absent_days must be zero or greater.");
    }

    return { attendance_percentage: pct, absent_days: absent };
}

export class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ValidationError";
        this.statusCode = 400;
    }
}

export async function requestShortagePrediction(payload) {
    const response = await mlAxios.post("/predict", payload);
    return response.data;
}

export function mapMlClientError(error) {
    if (error instanceof ValidationError) {
        return { status: error.statusCode, message: error.message };
    }
    if (error.code === "ECONNABORTED") {
        return {
            status: 504,
            message: "ML prediction service timed out. Please try again.",
        };
    }
    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        return {
            status: 502,
            message: "ML prediction service is unavailable. Ensure Flask is running on port 8000.",
        };
    }
    if (error.response) {
        const flaskMessage =
            error.response.data?.error ||
            error.response.data?.message ||
            "ML prediction service returned an error.";
        return {
            status: error.response.status >= 400 && error.response.status < 600
                ? error.response.status
                : 502,
            message: flaskMessage,
            details: error.response.data,
        };
    }
    return { status: 502, message: "Failed to reach ML prediction service." };
}