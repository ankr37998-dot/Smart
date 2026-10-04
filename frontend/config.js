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
    ];

    for (const candidate of candidates) {
        const normalized = normalizeApiBase(candidate);
        if (normalized) return normalized;
    }

    return "";
};

window.__APP_API_BASE__ = getRuntimeApiBase();

// Faculty UI compatibility fixes. These run after the page's module scripts
// so legacy duplicate handlers can be replaced without touching attendance APIs.
const installFacultyUiFixes = () => {
    const reportForm = document.getElementById("reportForm");
    const analyticsForm = document.getElementById("analyticsForm");
    if (!reportForm || !analyticsForm) return;

    const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

    const replaceButton = (button, handler) => {
        if (!button) return null;
        const replacement = button.cloneNode(true);
        button.replaceWith(replacement);
        replacement.addEventListener("click", handler);
        return replacement;
    };

    const reportExportButton = document.getElementById("exportCsvBtn");
    replaceButton(reportExportButton, () => {
        const table = document.getElementById("attendanceReportTable");
        if (!table || !table.rows.length) {
            alert("No attendance report data available to export.");
            return;
        }

        const rows = [...table.rows].map((row) =>
            [...row.cells].map((cell) => csvEscape(cell.textContent)).join(",")
        );
        const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `attendance-report-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    });

    const exportButtons = document.querySelectorAll('[id="exportCsvBtn"]');
    const analyticsExportButton = exportButtons.length > 1 ? exportButtons[1] : null;

    if (analyticsExportButton) {
        analyticsExportButton.id = "analyticsExportCsvBtn";
        replaceButton(analyticsExportButton, async () => {
            try {
                const token = sessionStorage.getItem("token");
                const base = window.__APP_API_BASE__ || "";
                const response = await fetch(`${base}/api/analytics/export`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });

                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(error.message || "Failed to export analytics.");
                }

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "faculty_analytics.csv";
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error("Analytics export failed:", error);
                alert(error.message || "Failed to export analytics.");
            }
        });
    }
};

// faculty.js currently registers logout more than once. Intercept the click
// during capture so the action happens exactly once and uses the same storage
// cleanup semantics as the centralized logout helper.
const installLogoutGuard = () => {
    const logoutButton = document.getElementById("logoutBtn");
    if (!logoutButton) return;

    logoutButton.addEventListener("click", (event) => {
        event.stopImmediatePropagation();
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        window.location.href = "index.html";
    }, true);
};

installLogoutGuard();
window.addEventListener("load", installFacultyUiFixes, { once: true });
