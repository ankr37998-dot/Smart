const normalizeApiBase = (value) => {
    if (!value) return "";
    return String(value).trim().replace(/\/+$/, "");
};

const getRuntimeApiBase = () => {
    const hostname = window.location.hostname.toLowerCase();
    const candidates = [
        window.__APP_API_BASE__,
        window.APP_API_BASE,
        document.body?.dataset?.apiBase,
        document.querySelector('meta[name="app-api-base"]')?.content,
        hostname === "localhost" || hostname === "127.0.0.1"
            ? `${window.location.protocol}//${hostname}:5000`
            : "",
        hostname.includes("vercel.app")
            ? "https://smart-attendance-backend.onrender.com"
            : "",
    ];

    for (const candidate of candidates) {
        const normalized = normalizeApiBase(candidate);
        if (normalized) return normalized;
    }

    return "";
};

window.__APP_API_BASE__ = getRuntimeApiBase();
