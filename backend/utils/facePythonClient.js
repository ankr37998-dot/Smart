import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "../config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_WORKER_PATH = path.join(__dirname, "..", "ml", "face_worker.py");

const isLocalhostUrl = (url) => {
    if (!url || typeof url !== "string") return false;
    return (
        url.includes("localhost") ||
        url.includes("127.0.0.1") ||
        url.includes("0.0.0.0")
    );
};

export const runFaceWorker = async (
    payload,
    {
        timeoutMs = env.FACE_ML_TIMEOUT_MS || 30_000,
        pythonBin = process.env.FACE_PYTHON_BIN,
        workerPath = process.env.FACE_PYTHON_WORKER || DEFAULT_WORKER_PATH,
        extraEnv = {},
    } = {}
) => {
    const input = JSON.stringify(payload);

    const candidates = [
        pythonBin,
        process.platform === "win32" ? "python" : "python3",
        "python3",
        "python",
        process.platform === "win32" ? "py" : null,
    ].filter(Boolean);

    const tryOnce = (bin) =>
        new Promise((resolve, reject) => {
            const child = spawn(bin, [workerPath], {
                stdio: ["pipe", "pipe", "pipe"],
                env: {
                    ...process.env,
                    MONGO_URI: env.MONGO_URI || process.env.MONGO_URI,
                    ...extraEnv,
                },
            });

            let stdout = "";
            let stderr = "";

            const timer = setTimeout(() => {
                try {
                    child.kill("SIGKILL");
                } catch (e) {
                    // Ignore cleanup errors after timeout.
                }
                const err = new Error("Face worker timed out");
                err.code = "FACE_WORKER_TIMEOUT";
                reject(err);
            }, timeoutMs);

            child.stdout.on("data", (d) => (stdout += d.toString("utf8")));
            child.stderr.on("data", (d) => (stderr += d.toString("utf8")));

            child.on("error", (err) => {
                clearTimeout(timer);
                err.code = err.code || "FACE_WORKER_SPAWN_FAILED";
                err.stderr = stderr;
                reject(err);
            });

            child.on("close", (code) => {
                clearTimeout(timer);
                let data;
                try {
                    data = stdout ? JSON.parse(stdout) : null;
                } catch (e) {
                    const err = new Error("Face worker returned non-JSON output");
                    err.code = "FACE_WORKER_BAD_OUTPUT";
                    err.stdout = stdout;
                    err.stderr = stderr;
                    err.exitCode = code;
                    return reject(err);
                }

                if (!data) {
                    const pythonMissing =
                        /Python was not found/i.test(stderr) ||
                        /No such file or directory/i.test(stderr) ||
                        /not recognized as an internal or external command/i.test(stderr);
                    const depsMissing =
                        /ModuleNotFoundError:/i.test(stderr) ||
                        /No module named/i.test(stderr);
                    const err = new Error("Face worker returned empty output");
                    err.code = pythonMissing
                        ? "FACE_PYTHON_NOT_FOUND"
                        : depsMissing
                            ? "FACE_PYTHON_DEPS_MISSING"
                            : "FACE_WORKER_EMPTY_OUTPUT";
                    err.stderr = stderr;
                    err.exitCode = code;
                    return reject(err);
                }

                if (code !== 0 && (data.status || 500) >= 500) {
                    const err = new Error(data.error || "Face worker failed");
                    err.code = "FACE_WORKER_FAILED";
                    err.stderr = stderr;
                    err.exitCode = code;
                    err.response = { status: data.status || 500, data };
                    return reject(err);
                }

                data._stderr = stderr;
                return resolve(data);
            });

            child.stdin.write(input);
            child.stdin.end();
        });

    let lastErr;
    for (const bin of candidates) {
        try {
            return await tryOnce(bin);
        } catch (err) {
            lastErr = err;
            if (err.code === "ENOENT" || err.code === "FACE_PYTHON_NOT_FOUND") continue;
            throw err;
        }
    }
    throw lastErr;
};

export const assertNoExternalFaceService = () => {
    const url = env.FACE_ML_SERVICE_URL;
    if (!url) return;
    if (env.NODE_ENV === "production" && isLocalhostUrl(url)) return;
    console.warn("[facePythonClient] FACE_SERVICE_URL/FACE_ML_SERVICE_URL is set but external service is no longer required", { url });
};