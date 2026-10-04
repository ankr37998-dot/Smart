// Face ID management functionality
// Using global api functions from api.js

const faceRegsTableBody = document.getElementById("faceRegsTableBody");
const faceRegsMsg = document.getElementById("faceRegsMsg");
const faceRegsSearch = document.getElementById("faceRegsSearch");
const faceRegsRefreshBtn = document.getElementById("faceRegsRefreshBtn");

let _faceRegsCache = [];

const formatDateTime = (d) => {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleString();
  } catch (e) {
    return "";
  }
};

function renderFaceRegs(rows) {
  if (!faceRegsTableBody) return;
  if (!rows || rows.length === 0) {
    faceRegsTableBody.innerHTML =
      '<tr><td colspan="7" style="text-align:center;">No students found</td></tr>';
    return;
  }

  faceRegsTableBody.innerHTML = rows
    .map((s) => {
      const has = Boolean(s.face?.hasDescriptor);
      const disabled = Boolean(s.face?.disabled);
      const reg = formatDateTime(s.face?.registeredAt);
      const upd = formatDateTime(s.face?.updatedAt);

      return `
        <tr>
          <td>${s.rollNo || ""}</td>
          <td>${s.name || ""}</td>
          <td>${s.email || ""}</td>
          <td>${has ? reg || "Yes" : '<span style="color:#6b7280;">No</span>'}</td>
          <td>${has ? upd || "" : ""}</td>
          <td>${disabled ? `<span style="color:#b42318;">Yes</span>` : `<span style="color:#15803d;">No</span>`}</td>
          <td style="white-space: nowrap;">
            <button class="small-btn ${disabled ? 'btn-info' : 'btn-danger'}" data-action="toggle" data-id="${s._id}">
              ${disabled ? "Enable" : "Disable"}
            </button>
            <button class="small-btn btn-secondary" data-action="reset" data-id="${s._id}">
              Reset
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function filterFaceRegs() {
  const q = String(faceRegsSearch?.value || "").trim().toLowerCase();
  if (!q) return _faceRegsCache;
  return _faceRegsCache.filter((s) => {
    const hay = `${s.name || ""} ${s.rollNo || ""} ${s.email || ""}`.toLowerCase();
    return hay.includes(q);
  });
}

async function loadFaceRegistrations() {
  if (!faceRegsTableBody) return;
  if (faceRegsMsg) faceRegsMsg.textContent = "";
  faceRegsTableBody.innerHTML =
    '<tr><td colspan="7" style="text-align:center;">Loading...</td></tr>';

  try {
    const rows = await apiGet("/api/admin/face-registrations");
    _faceRegsCache = Array.isArray(rows) ? rows : [];
    renderFaceRegs(filterFaceRegs());
  } catch (err) {
    console.error("Error loading face registrations", err);
    faceRegsTableBody.innerHTML =
      '<tr><td colspan="7" style="text-align:center; color:#ff6b6b;">Error loading face registrations</td></tr>';
    if (faceRegsMsg) faceRegsMsg.textContent = err.message || "Failed to load face registrations";
  }
}

faceRegsSearch?.addEventListener("input", () => renderFaceRegs(filterFaceRegs()));
faceRegsRefreshBtn?.addEventListener("click", () => loadFaceRegistrations());

faceRegsTableBody?.addEventListener("click", async (e) => {
  const btn = e.target?.closest("button[data-action]");
  if (!btn) return;
  const action = btn.getAttribute("data-action");
  const id = btn.getAttribute("data-id");
  if (!id) return;

  try {
    if (action === "reset") {
      if (!confirm("Reset face registration for this student?")) return;
      await apiDelete(`/api/admin/face-registrations/${id}`);
      await loadFaceRegistrations();
    } else if (action === "toggle") {
      const row = _faceRegsCache.find((x) => x._id === id);
      const currentlyDisabled = Boolean(row?.face?.disabled);
      const disabled = !currentlyDisabled;
      const reason = disabled ? prompt("Reason for disabling (optional):") : "";
      await apiPost(`/api/admin/face-registrations/${id}/disable`, { disabled, reason });
      await loadFaceRegistrations();
    }
  } catch (err) {
    console.error("Face registration admin action failed", err);
    if (faceRegsMsg) faceRegsMsg.textContent = err.message || "Action failed";
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadFaceRegistrations().catch(console.error);
});