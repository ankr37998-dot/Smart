const normalizeApiBase = (value) => {
    if (!value) return "";
    return String(value).trim().replace(/\/+$/, "");
};

const getRuntimeApiBase = () => {
    const candidates = [
        window.__APP_API_BASE__,
        window.APP_API_BASE,
        document.body?.dataset?.apiBase,
        document.querySelector('meta[name="app-api-base"]')?.content,
        new URLSearchParams(window.location.search).get("api_base"),
        window.location.hostname.includes("vercel.app")
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
