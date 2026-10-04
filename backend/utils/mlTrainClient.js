import axios from "axios";
import { env } from "../config/env.js";

const TRAIN_TIMEOUT_MS = Number(process.env.ML_TRAIN_TIMEOUT_MS) || 120_000;

export const requestMlRetrain = async ({ force = true, auto = false } = {}) => {
    const headers = { "Content-Type": "application/json" };
    if (env.ML_TRAIN_SECRET) {
        headers["X-ML-Train-Secret"] = env.ML_TRAIN_SECRET;
    }

    const { data } = await axios.post(
        `${env.ML_PREDICT_URL}/train`,
        { force, auto },
        { headers, timeout: TRAIN_TIMEOUT_MS }
    );
    return data;
};

export const getMlTrainingStatus = async () => {
    const { data } = await axios.get(`${env.ML_PREDICT_URL}/training/status`, {
        timeout: 15_000,
    });
    return data;
};

export const mapMlTrainError = (error) => {
    if (error.code === "ECONNABORTED") {
        return { status: 504, message: "ML training timed out." };
    }
    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        return {
            status: 502,
            message: "ML service unavailable. Ensure Flask is running on port 8000.",
        };
    }
    if (error.response) {
        return {
            status: error.response.status,
            message: error.response.data?.error || error.response.data?.reason || "ML training failed",
            data: error.response.data,
        };
    }
    return { status: 502, message: "Failed to reach ML training service." };
};