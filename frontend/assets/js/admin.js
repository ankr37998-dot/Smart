import { apiGet, apiPost, apiPut, apiPatch, apiDelete, apiDownload, ensureAuth, getUser, logout } from "./api.js?v=20260526";

const user = ensureAuth(["admin"]);

const logoutBtn = document.getElementById("logoutBtn");
logoutBtn?.addEventListener("click", logout);

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection in admin.js:", event.reason);
  event.preventDefault();
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection in admin.js:", event.reason);
  event.preventDefault();
});

const statsEl = document.getElementById("adminStats");
const analyticsForm = document.getElementById("analyticsForm");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const analyticsTable = document.getElementById("analyticsTable");
const profileDetails = document.getElementById("profileDetails");
let adminChart;

// Faculty form elements
const createFacultyForm = document.getElementById("createFacultyForm");
const facultyFormTitle = document.getElementById("facultyFormTitle");
const cfMsg = document.getElementById("cfMsg");
const cfEditId = document.getElementById("cfEditId");
const cfSubmitBtn = document.getElementById("cfSubmitBtn");
const cfCancelBtn = document.getElementById("cfCancelBtn");
const facultyListBody = document.getElementById("facultyListBody");
const showCreateFacultyBtn = document.getElementById("showCreateFacultyBtn");
const closeFacultyFormBtn = document.getElementById("closeFacultyFormBtn");
const facultyFilterDept = document.getElementById("facultyFilterDept");

// Student form elements
const createStudentForm = document.getElementById("createStudentForm");
const studentFormTitle = document.getElementById("studentFormTitle");
const csMsg = document.getElementById("csMsg");
const csEditId = document.getElementById("csEditId");
const csSubmitBtn = document.getElementById("csSubmitBtn");
const csCancelBtn = document.getElementById("csCancelBtn");
const studentListBody = document.getElementById("studentListBody");
const showCreateStudentBtn = document.getElementById("showCreateStudentBtn");
const closeStudentFormBtn = document.getElementById("closeStudentFormBtn");
const facultyManagementTab = document.getElementById("facultyManagementTab");
const studentManagementTab = document.getElementById("studentManagementTab");
const facultyManagementCard = document.getElementById("facultyManagementCard");
const studentManagementCard = document.getElementById("studentManagementCard");

// Promotion elements
const promoteForm = document.getElementById("promoteForm");
const prMsg = document.getElementById("prMsg");
const previewPromotionBtn = document.getElementById("previewPromotionBtn");
const promotionPreview = document.getElementById("promotionPreview");
const previewCount = document.getElementById("previewCount");
const previewTableBody = document.getElementById("previewTableBody");

// View switching
const dashboardBtn = document.getElementById("dashboardBtn");
const createUserBtn = document.getElementById("createUserBtn");
const departmentsBtn = document.getElementById("departmentsBtn");
const sectionsBtn = document.getElementById("sectionsBtn");
const coursesBtn = document.getElementById("coursesBtn");
const timetableBtn = document.getElementById("timetableBtn");
const faceRegsBtn = document.getElementById("faceRegsBtn");
const promoteBtn = document.getElementById("promoteBtn");
const analyticsBtn = document.getElementById("analyticsBtn");
const profileBtn = document.getElementById("profileBtn");

const dashboardView = document.getElementById("dashboardView");
const createUserView = document.getElementById("createUserView");
const departmentsView = document.getElementById("departmentsView");
const sectionsView = document.getElementById("sectionsView");
const coursesView = document.getElementById("coursesView");
const timetableView = document.getElementById("timetableView");
const faceRegsView = document.getElementById("faceRegsView");
const promoteView = document.getElementById("promoteView");
const analyticsView = document.getElementById("analyticsView");
const profileView = document.getElementById("profileView");

dashboardBtn.addEventListener("click", () => switchView("dashboard"));
createUserBtn.addEventListener("click", () => switchView("createUser"));
departmentsBtn.addEventListener("click", () => switchView("departments"));
sectionsBtn.addEventListener("click", () => switchView("sections"));
coursesBtn.addEventListener("click", () => switchView("courses"));
timetableBtn.addEventListener("click", () => switchView("timetable"));
faceRegsBtn?.addEventListener("click", () => switchView("faceRegs"));
promoteBtn.addEventListener("click", () => switchView("promote"));
analyticsBtn.addEventListener("click", () => switchView("analytics"));
profileBtn.addEventListener("click", () => switchView("profile"));

function switchUserManagementTab(tab) {
  const showFaculty = tab === "faculty";
  createFacultyForm?.classList.add("hidden");
  createStudentForm?.classList.add("hidden");
  document.body.classList.remove("user-form-modal-open");
  facultyManagementCard?.classList.toggle("hidden", !showFaculty);
  studentManagementCard?.classList.toggle("hidden", showFaculty);
  facultyManagementTab?.classList.toggle("active", showFaculty);
  studentManagementTab?.classList.toggle("active", !showFaculty);
  facultyManagementTab?.setAttribute("aria-selected", String(showFaculty));
  studentManagementTab?.setAttribute("aria-selected", String(!showFaculty));
}

function openUserForm(form) {
  form?.classList.remove("hidden");
  document.body.classList.add("user-form-modal-open");
}

function closeUserForm(form) {
  form?.classList.add("hidden");
  document.body.classList.remove("user-form-modal-open");
}

showCreateFacultyBtn?.addEventListener("click", () => {
  cfEditId.value = "";
  createFacultyForm.reset();
  if (facultyFormTitle) facultyFormTitle.textContent = "➕ Add Faculty";
  cfSubmitBtn.textContent = "Add Faculty";
  cfCancelBtn.classList.add("hidden");
  openUserForm(createFacultyForm);
});

showCreateStudentBtn?.addEventListener("click", () => {
  csEditId.value = "";
  createStudentForm.reset();
  if (studentFormTitle) studentFormTitle.textContent = "➕ Add Student";
  csSubmitBtn.textContent = "Add Student";
  csCancelBtn.classList.add("hidden");
  openUserForm(createStudentForm);
});

closeFacultyFormBtn?.addEventListener("click", () => closeUserForm(createFacultyForm));
closeStudentFormBtn?.addEventListener("click", () => closeUserForm(createStudentForm));

facultyManagementTab?.addEventListener("click", () => switchUserManagementTab("faculty"));
studentManagementTab?.addEventListener("click", () => switchUserManagementTab("student"));

function resetMainPanelScroll() {
  const mainPanel = document.querySelector(".app-shell__main");
  if (mainPanel) {
    mainPanel.scrollTop = 0;
    mainPanel.scrollTo({ top: 0, behavior: "instant" });
  }

  if (document.body) document.body.scrollTop = 0;
  if (document.documentElement) document.documentElement.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: "instant" });
}

window.addEventListener("load", resetMainPanelScroll);
window.addEventListener("pageshow", resetMainPanelScroll);
resetMainPanelScroll();

function switchView(view) {
  resetMainPanelScroll();

  const views = [
    dashboardView,
    createUserView,
    departmentsView,
    sectionsView,
    coursesView,
    timetableView,
    faceRegsView,
    promoteView,
    analyticsView,
    profileView
  ].filter(Boolean);

  views.forEach((viewElement) => {
    viewElement.classList.add("hidden");
    viewElement.style.display = "";
  });
  dashboardBtn.classList.remove("active");
  createUserBtn.classList.remove("active");
  departmentsBtn.classList.remove("active");
  sectionsBtn.classList.remove("active");
  coursesBtn.classList.remove("active");
  timetableBtn.classList.remove("active");
  faceRegsBtn?.classList.remove("active");
  promoteBtn.classList.remove("active");
  analyticsBtn.classList.remove("active");
  profileBtn.classList.remove("active");

  let activeViewElement = null;

  if (view === "dashboard") {
    dashboardView.classList.remove("hidden");
    dashboardBtn.classList.add("active");
    activeViewElement = dashboardView;
  } else if (view === "createUser") {
    createUserView.classList.remove("hidden");
    createUserBtn.classList.add("active");
    activeViewElement = createUserView;
    switchUserManagementTab("faculty");
    loadUserLists(); // Load faculty and student lists
  } else if (view === "departments") {
    departmentsView.classList.remove("hidden");
    departmentsBtn.classList.add("active");
    activeViewElement = departmentsView;
    loadDepartmentList(); // Load departments
  } else if (view === "sections") {
    sectionsView.classList.remove("hidden");
    sectionsBtn.classList.add("active");
    activeViewElement = sectionsView;
    loadSectionList(); // Load sections
    loadDepartmentDropdowns(); // Load department options for section form
  } else if (view === "courses") {
    coursesView.classList.remove("hidden");
    coursesBtn.classList.add("active");
    activeViewElement = coursesView;
    loadCourseList(); // Load courses
    loadCourseDepartmentDropdowns(); // Load department options for course form
  } else if (view === "timetable") {
    timetableView.classList.remove("hidden");
    timetableBtn.classList.add("active");
    activeViewElement = timetableView;
    loadFacultyDropdown(); // Load faculty list for timetable
    loadTimetableDepartmentFilter(); // Load department filter
  } else if (view === "faceRegs") {
    faceRegsView.classList.remove("hidden");
    faceRegsBtn?.classList.add("active");
    activeViewElement = faceRegsView;
    loadFaceRegistrations();
  } else if (view === "promote") {
    promoteView.classList.remove("hidden");
    promoteBtn.classList.add("active");
    activeViewElement = promoteView;
    loadPromoteDepartmentDropdowns(); // Load dropdowns for promote section
  } else if (view === "analytics") {
    analyticsView.classList.remove("hidden");
    analyticsBtn.classList.add("active");
    activeViewElement = analyticsView;
  } else if (view === "profile") {
    profileView.classList.remove("hidden");
    profileBtn.classList.add("active");
    activeViewElement = profileView;
  }

  if (activeViewElement) {
    activeViewElement.scrollIntoView({ behavior: "instant", block: "start" });
  }
}

// Expose switchView to global scope for onclick handlers
window.switchView = switchView;

// ---------------------------------------------------------------------------
// Face registration management (Admin)
// ---------------------------------------------------------------------------
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
      await apiPatch(`/api/admin/face-registrations/${id}/disable`, { disabled, reason });
      await loadFaceRegistrations();
    }
  } catch (err) {
    console.error("Face registration admin action failed", err);
    if (faceRegsMsg) faceRegsMsg.textContent = err.message || "Action failed";
  }
});

async function loadStats() {
  try {
    const [users, classes, departments, sections, courses] = await Promise.all([
      apiGet("/api/admin/users"),
      apiGet("/api/admin/classes"),
      apiGet("/api/admin/departments"),
      apiGet("/api/admin/sections"),
      apiGet("/api/admin/courses"),
    ]);

    const students = users.filter((u) => u.role === "student");
    const faculty = users.filter((u) => u.role === "faculty");
    const totalStudents = students.length;
    const totalFaculty = faculty.length;
    const totalClasses = classes.length;
    const totalDepartments = departments.length;
    const totalSections = sections.length;
    const totalCourses = courses.length;

    // Main Stats Cards
    statsEl.innerHTML = `
      <div class="stat-card stat-card--success">
        <h3>👨‍🎓 Students</h3>
        <p>${totalStudents}</p>
        <small>Total Enrolled</small>
      </div>
      <div class="stat-card stat-card--info">
        <h3>👨‍🏫 Faculty</h3>
        <p>${totalFaculty}</p>
        <small>Active Members</small>
      </div>
      <div class="stat-card stat-card--warning">
        <h3>🏢 Departments</h3>
        <p>${totalDepartments}</p>
        <small>Total Departments</small>
      </div>
      <div class="stat-card stat-card--purple">
        <h3>📚 Sections</h3>
        <p>${totalSections}</p>
        <small>Active Sections</small>
      </div>
      <div class="stat-card stat-card--orange">
        <h3>📖 Courses</h3>
        <p>${totalCourses}</p>
        <small>Course Catalog</small>
      </div>
      <div class="stat-card stat-card--pink">
        <h3>📅 Classes</h3>
        <p>${totalClasses}</p>
        <small>Scheduled</small>
      </div>
    `;

    // Update admin name
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    const adminNameEl = document.getElementById("adminNameDisplay");
    if (adminNameEl && user.name) {
      adminNameEl.textContent = user.name;
    }

    // Update date/time
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // Load semester distribution
    loadSemesterDistribution(students);

    // Load department overview
    loadDepartmentOverview(students, faculty, departments);

    // Load system summary
    loadSystemSummary(totalStudents, totalFaculty, totalDepartments, totalSections, totalCourses, totalClasses);
    loadAttendanceDashboard();

  } catch (error) {
    console.error("Stats load error", error);
    statsEl.innerHTML = "<p>Could not load dashboard stats.</p>";
  }
}

function updateDateTime() {
  const now = new Date();
  const dateEl = document.getElementById("currentDate");
  const timeEl = document.getElementById("currentTime");
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
  if (timeEl) {
    timeEl.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}

async function loadAttendanceDashboard() {
  const overview = document.getElementById("attendanceOverview");
  const alerts = document.getElementById("attendanceAlerts");
  const departments = document.getElementById("departmentAttendance");
  const status = document.getElementById("attendanceOverviewStatus");
  if (!overview || !alerts) return;

  try {
    const report = await apiGet("/api/admin/analytics/report");
    const rows = Array.isArray(report) ? report : [];
    const totalMarked = rows.reduce((sum, row) => sum + Number(row.totalMarked || 0), 0);
    const totalExpected = rows.reduce((sum, row) => sum + Number(row.totalExpected || 0), 0);
    const presentCount = rows.reduce((sum, row) => sum + Number(row.presentCount || 0), 0);
    const conducted = rows.reduce((sum, row) => sum + Number(row.totalClassesConducted || 0), 0);
    const attendance = totalExpected ? Math.round((presentCount / totalExpected) * 100) : 0;
    const lowAttendance = rows.filter(row => Number(row.averageAttendance || 0) < 75);

    overview.innerHTML = `
      <div class="dashboard-kpi dashboard-kpi-primary"><span>Overall attendance</span><strong>${attendance}%</strong><small>${presentCount} present of ${totalExpected} expected</small></div>
      <div class="dashboard-kpi"><span>Present records</span><strong>${presentCount}</strong><small>Across all recorded sessions</small></div>
      <div class="dashboard-kpi"><span>Classes conducted</span><strong>${conducted}</strong><small>Attendance sessions recorded</small></div>
      <div class="dashboard-kpi dashboard-kpi-warning"><span>Below 75%</span><strong>${lowAttendance.length}</strong><small>Courses needing attention</small></div>
    `;

    alerts.innerHTML = lowAttendance.length
      ? lowAttendance.slice(0, 5).map(row => `<div class="dashboard-alert-item"><span>${row.courseCode || "Course"} · ${row.section || "All sections"}</span><strong>${row.averageAttendance || 0}%</strong></div>`).join("")
      : '<p class="dashboard-empty-state">No shortage-risk courses right now.</p>';

    if (departments) {
      const departmentMap = new Map();
      rows.forEach(row => {
        const key = row.department || "Other";
        const current = departmentMap.get(key) || { present: 0, expected: 0 };
        current.present += Number(row.presentCount || 0);
        current.expected += Number(row.totalExpected || 0);
        departmentMap.set(key, current);
      });
      const departmentRows = [...departmentMap.entries()];
      departments.innerHTML = departmentRows.length
        ? departmentRows.map(([name, values]) => {
          const percentage = values.expected ? Math.round((values.present / values.expected) * 100) : 0;
          return `<div class="dashboard-department-item"><span>${name}</span><div class="dashboard-progress"><i style="width:${percentage}%"></i></div><strong>${percentage}%</strong></div>`;
        }).join("")
        : '<p class="dashboard-empty-state">No attendance data available yet.</p>';
    }

    if (status) {
      status.textContent = rows.length ? "Updated just now" : "No records yet";
      status.classList.toggle("dashboard-status-muted", !rows.length);
    }
  } catch (error) {
    console.error("Attendance dashboard load error", error);
    overview.innerHTML = '<p class="dashboard-empty-state">Attendance summary unavailable.</p>';
    alerts.innerHTML = '<p class="dashboard-empty-state">Could not load alerts.</p>';
    if (departments) {
      departments.innerHTML = '<p class="dashboard-empty-state">Could not load department data.</p>';
    }
    if (status) status.textContent = "Unavailable";
  }
}

document.querySelectorAll("[data-dashboard-target]").forEach(button => {
  button.addEventListener("click", () => switchView(button.dataset.dashboardTarget));
});

function loadSemesterDistribution(students) {
  const semesterCounts = {};
  for (let i = 1; i <= 8; i++) {
    semesterCounts[i] = 0;
  }

  students.forEach(s => {
    const sem = s.semester || 1;
    if (semesterCounts[sem] !== undefined) {
      semesterCounts[sem]++;
    }
  });

  const semesterEl = document.getElementById("semesterDistribution");
  if (semesterEl) {
    semesterEl.innerHTML = Object.entries(semesterCounts).map(([sem, count]) => `
      <div class="mini-metric-box" style="${count > 0 ? '' : 'opacity: 0.7;'}">
        <p>Sem ${sem}</p>
        <strong style="color: ${count > 0 ? '#15803d' : '#6b7280'};">${count}</strong>
      </div>
    `).join("");
  }
}

function loadDepartmentOverview(students, faculty, departments) {
  const deptEl = document.getElementById("departmentOverview");
  if (!deptEl) return;

  if (departments.length === 0) {
    deptEl.innerHTML = '<p style="color: #888; text-align: center;">No departments found</p>';
    return;
  }

  const deptStats = departments.map(dept => {
    const deptStudents = students.filter(s => s.department === dept.name || s.department === dept._id);
    const deptFaculty = faculty.filter(f => f.department === dept.name || f.department === dept._id);
    return {
      name: dept.name,
      code: dept.code || dept.name.substring(0, 3).toUpperCase(),
      students: deptStudents.length,
      faculty: deptFaculty.length
    };
  });

  deptEl.innerHTML = deptStats.map(d => `
    <div class="department-summary-row">
      <div class="meta">
        <strong>${d.name}</strong>
        <span>(${d.code})</span>
      </div>
      <div class="counts">
        <span class="status-success">👨‍🎓 ${d.students}</span>
        <span class="status-info">👨‍🏫 ${d.faculty}</span>
      </div>
    </div>
  `).join("");
}

function loadSystemSummary(students, faculty, departments, sections, courses, classes) {
  const summaryEl = document.getElementById("systemSummary");
  if (!summaryEl) return;

  const avgStudentsPerDept = departments > 0 ? Math.round(students / departments) : 0;
  const avgFacultyPerDept = departments > 0 ? Math.round(faculty / departments) : 0;
  const studentFacultyRatio = faculty > 0 ? (students / faculty).toFixed(1) : 'N/A';

  summaryEl.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
      <div class="summary-metric-box">
        <p>Student:Faculty Ratio</p>
        <strong style="color: #0f766e;">${studentFacultyRatio}:1</strong>
      </div>
      <div class="summary-metric-box">
        <p>Avg Students/Dept</p>
        <strong style="color: #15803d;">${avgStudentsPerDept}</strong>
      </div>
      <div class="summary-metric-box">
        <p>Avg Faculty/Dept</p>
        <strong style="color: #c2410c;">${avgFacultyPerDept}</strong>
      </div>
      <div class="summary-metric-box">
        <p>Classes/Course</p>
        <strong style="color: #be185d;">${courses > 0 ? (classes / courses).toFixed(1) : 0}</strong>
      </div>
    </div>
  `;
}

// ===================== FACULTY MANAGEMENT =====================

async function loadFacultyTable(filters = {}) {
  try {
    let url = "/api/admin/users?role=faculty";
    if (filters.department) url += `&department=${encodeURIComponent(filters.department)}`;
    const [users, departments] = await Promise.all([
      apiGet(url),
      apiGet("/api/admin/departments")
    ]);
    const departmentCodes = Object.fromEntries(
      departments.map(department => [department.name, department.code])
    );
    if (users.length === 0) {
      facultyListBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No faculty found</td></tr>';
      return;
    }
    facultyListBody.innerHTML = users.map(f => `
      <tr>
        <td><strong>${f.name}</strong></td>
        <td>${f.email}</td>
        <td>${departmentCodes[f.department] || 'N/A'}</td>
        <td>
          <button class="edit-faculty-btn" data-id="${f._id}" data-name="${f.name}" data-email="${f.email}" data-dept="${f.department || ''}">✏️ Edit</button>
          <button class="delete-faculty-btn" data-id="${f._id}" data-name="${f.name}">🗑️ Delete</button>
        </td>
      </tr>
    `).join("");

    // Add edit handlers
    document.querySelectorAll(".edit-faculty-btn").forEach(btn => {
      btn.addEventListener("click", () => editFaculty(btn.dataset));
    });

    // Add delete handlers
    document.querySelectorAll(".delete-faculty-btn").forEach(btn => {
      btn.addEventListener("click", () => deleteFaculty(btn.dataset.id, btn.dataset.name));
    });
  } catch (err) {
    console.error("Error loading faculty list:", err);
    facultyListBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Error loading faculty</td></tr>';
  }
}

facultyFilterDept?.addEventListener("change", () => {
  loadFacultyTable({ department: facultyFilterDept?.value || "" });
});

function editFaculty(data) {
  cfEditId.value = data.id;
  document.getElementById("cfName").value = data.name;
  document.getElementById("cfEmail").value = data.email;
  document.getElementById("cfDepartment").value = data.dept;
  document.getElementById("cfPassword").value = "";
  cfSubmitBtn.textContent = "Update Faculty";
  cfCancelBtn.style.display = "inline-block";
  cfMsg.textContent = "";
  openUserForm(createFacultyForm);
}

cfCancelBtn.addEventListener("click", () => {
  cfEditId.value = "";
  createFacultyForm.reset();
  cfSubmitBtn.textContent = "Add Faculty";
  cfCancelBtn.style.display = "none";
  cfMsg.textContent = "";
});

async function deleteFaculty(id, name) {
  if (!confirm(`Are you sure you want to delete faculty "${name}"?`)) return;
  try {
    await apiPost("/api/admin/users/delete", { userId: id });
    loadFacultyTable();
    loadStats();
  } catch (err) {
    alert("Error deleting faculty: " + err.message);
  }
}

createFacultyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  cfMsg.textContent = "";

  const editId = cfEditId.value;
  const userData = {
    name: document.getElementById("cfName").value,
    email: document.getElementById("cfEmail").value,
    department: document.getElementById("cfDepartment").value,
    role: "faculty"
  };

  const password = document.getElementById("cfPassword").value;
  if (password) userData.password = password;

  try {
    if (editId) {
      // Update existing faculty
      await apiPut(`/api/admin/users/${editId}`, userData);
      cfMsg.style.color = "green";
      cfMsg.textContent = "Faculty updated successfully!";
    } else {
      // Create new faculty
      if (!password) {
        cfMsg.style.color = "red";
        cfMsg.textContent = "Password is required for new faculty";
        return;
      }
      await apiPost("/api/admin/users", userData);
      cfMsg.style.color = "green";
      cfMsg.textContent = "Faculty created successfully!";
    }

    cfCancelBtn.click(); // Reset form
    closeUserForm(createFacultyForm);
    loadFacultyTable();
    loadFacultyDropdown(); // Refresh timetable faculty dropdown
    loadStats();
  } catch (err) {
    cfMsg.style.color = "red";
    cfMsg.textContent = err.message;
  }
});

// ===================== STUDENT MANAGEMENT =====================

async function loadStudentList(filters = {}) {
  try {
    let url = "/api/admin/users?role=student";
    if (filters.department) url += `&department=${encodeURIComponent(filters.department)}`;
    if (filters.section) url += `&section=${encodeURIComponent(filters.section)}`;

    const users = await apiGet(url);
    if (users.length === 0) {
      studentListBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No students found</td></tr>';
      return;
    }
    studentListBody.innerHTML = users.map(s => `
      <tr>
        <td>${s.rollNo || 'N/A'}</td>
        <td><strong>${s.name}</strong></td>
        <td>${s.email}</td>
        <td>${s.department?.substring(0, 3) || 'N/A'}</td>
        <td>${s.section || '-'}</td>
        <td>${s.semester || '1'}</td>
        <td>
          <button class="edit-student-btn" data-id="${s._id}" data-name="${s.name}" data-email="${s.email}" data-dept="${s.department || ''}" data-section="${s.section || ''}" data-semester="${s.semester || '1'}" data-year="${s.admissionYear || ''}">✏️ Edit</button>
          <button class="delete-student-btn" data-id="${s._id}" data-name="${s.name}">🗑️ Delete</button>
        </td>
      </tr>
    `).join("");

    // Add edit handlers
    document.querySelectorAll(".edit-student-btn").forEach(btn => {
      btn.addEventListener("click", () => editStudent(btn.dataset));
    });

    // Add delete handlers
    document.querySelectorAll(".delete-student-btn").forEach(btn => {
      btn.addEventListener("click", () => deleteStudent(btn.dataset.id, btn.dataset.name));
    });
  } catch (err) {
    console.error("Error loading student list:", err);
    studentListBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Error loading students</td></tr>';
  }
}

async function editStudent(data) {
  csEditId.value = data.id;
  document.getElementById("csName").value = data.name;
  document.getElementById("csEmail").value = data.email;
  document.getElementById("csDepartment").value = data.dept;
  document.getElementById("csSemester").value = data.semester || "1";

  // Load sections for the department, then set the section value
  const csSection = document.getElementById("csSection");
  csSection.innerHTML = '<option value="">-- Not Assigned --</option>';
  if (data.dept) {
    try {
      const sections = await apiGet(`/api/admin/sections?department=${encodeURIComponent(data.dept)}`);
      sections.forEach(s => {
        csSection.innerHTML += `<option value="${s.name}">${s.name}${s.description ? ' - ' + s.description : ''}</option>`;
      });
    } catch (err) {
      console.error("Error loading sections:", err);
    }
  }
  csSection.value = data.section;

  document.getElementById("csAdmissionYear").value = data.year;
  document.getElementById("csPassword").value = "";
  if (studentFormTitle) studentFormTitle.textContent = "✏️ Edit Student";
  csSubmitBtn.textContent = "Update Student";
  csCancelBtn.style.display = "inline-block";
  csMsg.textContent = "";

  // Update hint for Step 2 (editing/assigning academic details)
  const stepHint = document.getElementById("stepHint");
  if (stepHint) {
    stepHint.innerHTML = `✏️ <strong>Step 2:</strong> Assign/update academic details for <strong>${data.name}</strong>`;
    stepHint.style.color = "#28a745";
  }
  openUserForm(createStudentForm);
  const pwdRequired = document.getElementById("pwdRequired");
  if (pwdRequired) pwdRequired.style.display = "none";
}

csCancelBtn.addEventListener("click", () => {
  csEditId.value = "";
  createStudentForm.reset();
  if (studentFormTitle) studentFormTitle.textContent = "➕ Add Student";
  csSubmitBtn.textContent = "Add Student";
  csCancelBtn.style.display = "none";
  csMsg.textContent = "";


  const pwdRequired = document.getElementById("pwdRequired");
  if (pwdRequired) pwdRequired.style.display = "inline";
});

async function deleteStudent(id, name) {
  if (!confirm(`Are you sure you want to delete student "${name}"?`)) return;
  try {
    await apiPost("/api/admin/users/delete", { userId: id });
    loadStudentList();
    loadStats();
  } catch (err) {
    alert("Error deleting student: " + err.message);
  }
}

createStudentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  csMsg.textContent = "";

  const editId = csEditId.value;
  const semesterValue = document.getElementById("csSemester").value;
  const userData = {
    name: document.getElementById("csName").value,
    email: document.getElementById("csEmail").value,
    department: document.getElementById("csDepartment").value,
    section: document.getElementById("csSection").value,
    semester: semesterValue || "1", // Default to 1st semester if not selected
    role: "student"
  };

  const password = document.getElementById("csPassword").value;
  if (password) userData.password = password;

  const admissionYear = document.getElementById("csAdmissionYear").value;
  if (admissionYear) userData.admissionYear = parseInt(admissionYear);

  try {
    if (editId) {
      // Update existing student
      await apiPut(`/api/admin/users/${editId}`, userData);
      csMsg.style.color = "green";
      csMsg.textContent = "Student updated successfully!";
    } else {
      // Create new student
      if (!password) {
        csMsg.style.color = "red";
        csMsg.textContent = "Password is required for new student";
        return;
      }
      const result = await apiPost("/api/admin/users", userData);
      csMsg.style.color = "green";
      // Guide admin to Step 2 if department not assigned
      if (!userData.department) {
        csMsg.textContent = `✅ Student created! Click ✏️ Edit to assign department/section (Step 2)`;
      } else {
        csMsg.textContent = result.rollNo
          ? `Student created! Roll No: ${result.rollNo}`
          : "Student created successfully!";
      }
    }

    csCancelBtn.click(); // Reset form
    closeUserForm(createStudentForm);
    loadStudentList();
    loadStats();
  } catch (err) {
    csMsg.style.color = "red";
    csMsg.textContent = err.message;
  }
});

document.getElementById("studentFilterDept")?.addEventListener("change", () => {
  loadStudentList({
    department: document.getElementById("studentFilterDept").value,
    section: document.getElementById("studentFilterSection").value
  });
});

document.getElementById("studentFilterSection")?.addEventListener("change", () => {
  loadStudentList({
    department: document.getElementById("studentFilterDept").value,
    section: document.getElementById("studentFilterSection").value
  });
});

// Populate section filter dropdown
async function loadStudentFilterSections() {
  try {
    const sections = await apiGet("/api/admin/sections");
    const filterSelect = document.getElementById("studentFilterSection");
    filterSelect.innerHTML = '<option value="">All Sections</option>';
    sections.forEach(s => {
      filterSelect.innerHTML += `<option value="${s.name}">${s.name}</option>`;
    });
  } catch (err) {
    console.error("Error loading filter sections:", err);
  }
}

// Load users on view switch
function loadUserLists() {
  loadFacultyTable();
  loadStudentList();
  loadStudentSectionDropdown(); // Load sections for student form
  loadStudentFilterSections(); // Load sections for filter dropdown
  loadUserDepartmentDropdowns(); // Load department dropdowns
}

// ===================== PROMOTE STUDENTS =====================

const promoteGroupBtn = document.getElementById("promoteGroupBtn");
const promoteSelectedBtn = document.getElementById("promoteSelectedBtn");
const loadPromoteListBtn = document.getElementById("loadPromoteListBtn");
const promoteStudentListBody = document.getElementById("promoteStudentListBody");
const promoteGroupMsg = document.getElementById("promoteGroupMsg");
const promoteIndividualMsg = document.getElementById("promoteIndividualMsg");
const selectAllPromote = document.getElementById("selectAllPromote");
const selectedCountEl = document.getElementById("selectedCount");

// Load department dropdowns for promote section
async function loadPromoteDepartmentDropdowns() {
  try {
    const departments = await apiGet("/api/admin/departments");
    const selects = ["promoteFilterDept", "individualFilterDept"];
    selects.forEach(id => {
      const select = document.getElementById(id);
      if (select) {
        select.innerHTML = '<option value="">All Departments</option>';
        departments.forEach(d => {
          select.innerHTML += `<option value="${d.name}">${d.name}</option>`;
        });
      }
    });

    // Load sections for group promote filter
    const sections = await apiGet("/api/admin/sections");
    const promoteFilterSection = document.getElementById("promoteFilterSection");
    if (promoteFilterSection) {
      promoteFilterSection.innerHTML = '<option value="">All Sections</option>';
      sections.forEach(s => {
        promoteFilterSection.innerHTML += `<option value="${s.name}">${s.name}</option>`;
      });
    }
  } catch (err) {
    console.error("Error loading promote dropdowns:", err);
  }
}

// Group Promotion
promoteGroupBtn.addEventListener("click", async () => {
  promoteGroupMsg.textContent = "";

  const dept = document.getElementById("promoteFilterDept").value;
  const section = document.getElementById("promoteFilterSection").value;
  const fromSem = document.getElementById("promoteFromSem").value;
  const toSem = document.getElementById("promoteToSem").value;

  if (!toSem) {
    promoteGroupMsg.style.color = "red";
    promoteGroupMsg.textContent = "Please select target semester";
    return;
  }

  // Build filter query
  let url = "/api/admin/users?role=student";
  if (dept) url += `&department=${encodeURIComponent(dept)}`;
  if (section) url += `&section=${encodeURIComponent(section)}`;
  if (fromSem) url += `&semester=${encodeURIComponent(fromSem)}`;

  try {
    const students = await apiGet(url);

    if (students.length === 0) {
      promoteGroupMsg.style.color = "orange";
      promoteGroupMsg.textContent = "No students found matching the criteria";
      return;
    }

    const filterDesc = [
      dept ? `Dept: ${dept.substring(0, 15)}...` : "All Depts",
      section ? `Section: ${section}` : "All Sections",
      fromSem ? `Sem ${fromSem}` : "All Sems"
    ].join(", ");

    const targetDesc = toSem === "next" ? "next semester" : `semester ${toSem}`;

    if (!confirm(`Promote ${students.length} students (${filterDesc}) to ${targetDesc}?`)) {
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const student of students) {
      try {
        let newSem;
        if (toSem === "next") {
          const currentSem = parseInt(student.semester) || 1;
          newSem = Math.min(currentSem + 1, 8).toString();
        } else {
          newSem = toSem;
        }

        await apiPut(`/api/admin/users/${student._id}`, { semester: newSem });
        successCount++;
      } catch (err) {
        errorCount++;
        console.error(`Error promoting ${student.name}:`, err);
      }
    }

    promoteGroupMsg.style.color = "green";
    promoteGroupMsg.textContent = `✅ Promoted ${successCount} students${errorCount > 0 ? ` (${errorCount} errors)` : ""}`;
    loadStudentList();
  } catch (err) {
    promoteGroupMsg.style.color = "red";
    promoteGroupMsg.textContent = "Error: " + err.message;
  }
});

// Load students for individual promotion
loadPromoteListBtn.addEventListener("click", async () => {
  promoteIndividualMsg.textContent = "";

  const dept = document.getElementById("individualFilterDept").value;
  const sem = document.getElementById("individualFilterSem").value;

  let url = "/api/admin/users?role=student";
  if (dept) url += `&department=${encodeURIComponent(dept)}`;
  if (sem) url += `&semester=${encodeURIComponent(sem)}`;

  try {
    const students = await apiGet(url);

    if (students.length === 0) {
      promoteStudentListBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No students found</td></tr>';
      updateSelectedCount();
      return;
    }

    promoteStudentListBody.innerHTML = students.map(s => `
      <tr>
        <td><input type="checkbox" class="promote-checkbox" data-id="${s._id}" data-name="${s.name}" data-sem="${s.semester || '1'}" /></td>
        <td>${s.rollNo || 'N/A'}</td>
        <td>${s.name}</td>
        <td>${s.department?.substring(0, 3) || 'N/A'}</td>
        <td>${s.semester || '1'}</td>
        <td>
          <select class="new-sem-select" data-id="${s._id}" style="padding: 4px; background: #333; color: #fff; border: 1px solid #555; border-radius: 4px;">
            <option value="next" ${!s.semester || parseInt(s.semester) < 8 ? 'selected' : ''}>Next (+1)</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
            <option value="6">6</option>
            <option value="7">7</option>
            <option value="8">8</option>
          </select>
        </td>
      </tr>
    `).join("");

    // Add checkbox change listeners
    document.querySelectorAll(".promote-checkbox").forEach(cb => {
      cb.addEventListener("change", updateSelectedCount);
    });

    updateSelectedCount();
  } catch (err) {
    promoteStudentListBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Error loading students</td></tr>';
  }
});

// Select All checkbox
selectAllPromote.addEventListener("change", () => {
  const checkboxes = document.querySelectorAll(".promote-checkbox");
  checkboxes.forEach(cb => cb.checked = selectAllPromote.checked);
  updateSelectedCount();
});

function updateSelectedCount() {
  const checked = document.querySelectorAll(".promote-checkbox:checked").length;
  selectedCountEl.textContent = `${checked} students selected`;
}

// Promote selected students
promoteSelectedBtn.addEventListener("click", async () => {
  promoteIndividualMsg.textContent = "";

  const checkedBoxes = document.querySelectorAll(".promote-checkbox:checked");

  if (checkedBoxes.length === 0) {
    promoteIndividualMsg.style.color = "red";
    promoteIndividualMsg.textContent = "Please select at least one student";
    return;
  }

  if (!confirm(`Promote ${checkedBoxes.length} selected student(s)?`)) {
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const cb of checkedBoxes) {
    const studentId = cb.dataset.id;
    const currentSem = parseInt(cb.dataset.sem) || 1;
    const selectEl = document.querySelector(`.new-sem-select[data-id="${studentId}"]`);
    const targetSem = selectEl.value;

    let newSem;
    if (targetSem === "next") {
      newSem = Math.min(currentSem + 1, 8).toString();
    } else {
      newSem = targetSem;
    }

    try {
      await apiPut(`/api/admin/users/${studentId}`, { semester: newSem });
      successCount++;
    } catch (err) {
      errorCount++;
      console.error(`Error promoting student ${studentId}:`, err);
    }
  }

  promoteIndividualMsg.style.color = "green";
  promoteIndividualMsg.textContent = `✅ Promoted ${successCount} students${errorCount > 0 ? ` (${errorCount} errors)` : ""}`;

  // Reload the list
  loadPromoteListBtn.click();
  loadStudentList();
});

// ===================== DEPARTMENT MANAGEMENT =====================

const createDepartmentForm = document.getElementById("createDepartmentForm");
const deptMsg = document.getElementById("deptMsg");
const departmentListBody = document.getElementById("departmentListBody");
const departmentCreateCard = document.getElementById("departmentCreateCard");
const showCreateDepartmentBtn = document.getElementById("showCreateDepartmentBtn");
const closeCreateDepartmentBtn = document.getElementById("closeCreateDepartmentBtn");
const departmentFilter = document.getElementById("departmentFilter");
const departmentFormTitle = document.getElementById("departmentFormTitle");
const departmentSubmitBtn = document.getElementById("departmentSubmitBtn");
let editingDepartmentId = null;
let departmentCache = [];

showCreateDepartmentBtn?.addEventListener("click", () => {
  editingDepartmentId = null;
  createDepartmentForm?.reset();
  if (departmentFormTitle) departmentFormTitle.textContent = "➕ Create Department";
  if (departmentSubmitBtn) departmentSubmitBtn.textContent = "Add Department";
  departmentCreateCard?.classList.remove("hidden");
  document.body.classList.add("department-modal-open");
});

closeCreateDepartmentBtn?.addEventListener("click", () => {
  editingDepartmentId = null;
  createDepartmentForm?.reset();
  departmentCreateCard?.classList.add("hidden");
  document.body.classList.remove("department-modal-open");
});

function renderDepartmentList(departments = []) {
  if (!departmentListBody) return;

  const safeDepartments = Array.isArray(departments) ? departments : [];

  if (!safeDepartments.length) {
    departmentListBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No departments found.</td></tr>';
    return;
  }

  departmentListBody.innerHTML = safeDepartments.map(d => `
    <tr>
      <td><strong>${d.name || "Unnamed Department"}</strong></td>
      <td>${d.code || "—"}</td>
      <td>
        <button class="edit-dept-btn" data-id="${d._id}" data-name="${d.name}" data-code="${d.code}">✏️ Edit</button>
        <button class="delete-dept-btn" data-id="${d._id}" data-name="${d.name}">🗑️ Delete</button>
      </td>
    </tr>
  `).join("");

  document.querySelectorAll(".edit-dept-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      editingDepartmentId = btn.dataset.id;
      document.getElementById("deptName").value = btn.dataset.name || "";
      document.getElementById("deptCode").value = btn.dataset.code || "";
      if (departmentFormTitle) departmentFormTitle.textContent = "✏️ Edit Department";
      if (departmentSubmitBtn) departmentSubmitBtn.textContent = "Update Department";
      departmentCreateCard?.classList.remove("hidden");
      document.body.classList.add("department-modal-open");
    });
  });

  document.querySelectorAll(".delete-dept-btn").forEach(btn => {
    btn.addEventListener("click", () => deleteDepartment(btn.dataset.id, btn.dataset.name));
  });
}

async function loadDepartmentList() {
  try {
    const departments = await apiGet("/api/admin/departments");
    departmentCache = Array.isArray(departments) ? departments : [];

    if (departmentFilter) {
      departmentFilter.innerHTML = '<option value="">All Departments</option>' +
        departmentCache.map(d => `<option value="${d._id}">${d.name}</option>`).join("");
    }
    renderDepartmentList(departmentCache);
  } catch (err) {
    console.error("Error loading departments:", err);
    if (departmentListBody) {
      departmentListBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: red;">Error loading departments</td></tr>';
    }
  }
}

departmentFilter?.addEventListener("change", () => {
  const selectedId = departmentFilter.value;
  renderDepartmentList(selectedId
    ? departmentCache.filter(department => department._id === selectedId)
    : departmentCache);
});

async function deleteDepartment(id, name) {
  if (!confirm(`Are you sure you want to delete department "${name}"? This may affect users and sections.`)) return;
  try {
    await apiDelete(`/api/admin/departments/${id}`);
    loadDepartmentList();
    loadStats();
  } catch (err) {
    alert("Error deleting department: " + err.message);
  }
}

createDepartmentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  deptMsg.textContent = "";

  const deptData = {
    name: document.getElementById("deptName").value,
    code: document.getElementById("deptCode").value
  };

  try {
    if (editingDepartmentId) {
      await apiPut(`/api/admin/departments/${editingDepartmentId}`, deptData);
    } else {
      await apiPost("/api/admin/departments", deptData);
    }
    deptMsg.style.color = "green";
    deptMsg.textContent = editingDepartmentId
      ? `Department "${deptData.name}" updated successfully!`
      : `Department "${deptData.name}" (${deptData.code}) created successfully!`;
    editingDepartmentId = null;
    createDepartmentForm.reset();
    if (departmentFormTitle) departmentFormTitle.textContent = "➕ Create Department";
    if (departmentSubmitBtn) departmentSubmitBtn.textContent = "Add Department";
    departmentCreateCard?.classList.add("hidden");
    document.body.classList.remove("department-modal-open");
    loadDepartmentList();
    loadStats();
  } catch (err) {
    deptMsg.style.color = "red";
    deptMsg.textContent = err.message;
  }
});

// Load departments into various dropdowns
async function loadUserDepartmentDropdowns() {
  try {
    const departments = await apiGet("/api/admin/departments");
    const cfDepartment = document.getElementById("cfDepartment");
    const csDepartment = document.getElementById("csDepartment");
    const facultyFilterDept = document.getElementById("facultyFilterDept");
    const studentFilterDept = document.getElementById("studentFilterDept");

    // Faculty department dropdown
    cfDepartment.innerHTML = '<option value="">Select Department</option>';
    departments.forEach(d => {
      cfDepartment.innerHTML += `<option value="${d.name}">${d.name}</option>`;
    });

    // Student department dropdown
    csDepartment.innerHTML = '<option value="">Select Department</option>';
    departments.forEach(d => {
      csDepartment.innerHTML += `<option value="${d.name}">${d.name}</option>`;
    });

    // Faculty filter dropdown
    if (facultyFilterDept) {
      facultyFilterDept.innerHTML = '<option value="">All Departments</option>';
      departments.forEach(d => {
        facultyFilterDept.innerHTML += `<option value="${d.name}">${d.name}</option>`;
      });
    }

    // Student filter dropdown
    studentFilterDept.innerHTML = '<option value="">All Departments</option>';
    departments.forEach(d => {
      studentFilterDept.innerHTML += `<option value="${d.name}">${d.name}</option>`;
    });
  } catch (err) {
    console.error("Error loading department dropdowns:", err);
  }
}

// Load departments for section management dropdowns
async function loadDepartmentDropdowns() {
  try {
    const departments = await apiGet("/api/admin/departments");
    const secDepartment = document.getElementById("secDepartment");
    const sectionFilterDept = document.getElementById("sectionFilterDept");

    secDepartment.innerHTML = '<option value="">Select Department</option>';
    departments.forEach(d => {
      secDepartment.innerHTML += `<option value="${d.name}">${d.name}</option>`;
    });

    sectionFilterDept.innerHTML = '<option value="">All Departments</option>';
    departments.forEach(d => {
      sectionFilterDept.innerHTML += `<option value="${d.name}">${d.name}</option>`;
    });
  } catch (err) {
    console.error("Error loading department dropdowns for sections:", err);
  }
}

// Load departments for timetable filter
async function loadTimetableDepartmentFilter() {
  try {
    const departments = await apiGet("/api/admin/departments");
    const ttDepartmentFilter = document.getElementById("ttDepartmentFilter");

    ttDepartmentFilter.innerHTML = '<option value="">All Departments</option>';
    departments.forEach(d => {
      ttDepartmentFilter.innerHTML += `<option value="${d.name}">${d.code}</option>`;
    });
  } catch (err) {
    console.error("Error loading timetable department filter:", err);
  }
}

// ===================== SECTION MANAGEMENT =====================

const createSectionForm = document.getElementById("createSectionForm");
const secMsg = document.getElementById("secMsg");
const sectionListBody = document.getElementById("sectionListBody");
const sectionFilterDept = document.getElementById("sectionFilterDept");
const sectionCreateCard = document.getElementById("sectionCreateCard");
const showCreateSectionBtn = document.getElementById("showCreateSectionBtn");
const closeCreateSectionBtn = document.getElementById("closeCreateSectionBtn");
const sectionFormTitle = document.getElementById("sectionFormTitle");
const sectionSubmitBtn = document.getElementById("sectionSubmitBtn");
let editingSectionId = null;
let sectionCache = [];

showCreateSectionBtn?.addEventListener("click", () => {
  editingSectionId = null;
  createSectionForm?.reset();
  if (sectionFormTitle) sectionFormTitle.textContent = "➕ Create Section";
  if (sectionSubmitBtn) sectionSubmitBtn.textContent = "Add Section";
  sectionCreateCard?.classList.remove("hidden");
  document.body.classList.add("department-modal-open");
});

closeCreateSectionBtn?.addEventListener("click", () => {
  editingSectionId = null;
  createSectionForm?.reset();
  sectionCreateCard?.classList.add("hidden");
  document.body.classList.remove("department-modal-open");
});

function renderSectionList(sections) {
  if (!sections.length) {
    sectionListBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No sections found.</td></tr>';
    return;
  }

  sectionListBody.innerHTML = sections.map(s => `
    <tr>
      <td><strong>${s.name}</strong></td>
      <td>${s.department}</td>
      <td>
        <button class="edit-section-btn" data-id="${s._id}" data-name="${s.name}" data-dept="${s.department}" data-description="${s.description || ''}">✏️ Edit</button>
        <button class="delete-section-btn" data-id="${s._id}" data-name="${s.name}" data-dept="${s.department}">🗑️ Delete</button>
      </td>
    </tr>
  `).join("");

  document.querySelectorAll(".edit-section-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      editingSectionId = btn.dataset.id;
      const secDepartment = document.getElementById("secDepartment");
      secDepartment.value = btn.dataset.dept || "";
      document.getElementById("secName").value = btn.dataset.name || "";
      document.getElementById("secDescription").value = btn.dataset.description || "";
      if (sectionFormTitle) sectionFormTitle.textContent = "✏️ Edit Section";
      if (sectionSubmitBtn) sectionSubmitBtn.textContent = "Update Section";
      sectionCreateCard?.classList.remove("hidden");
      document.body.classList.add("department-modal-open");
    });
  });

  document.querySelectorAll(".delete-section-btn").forEach(btn => {
    btn.addEventListener("click", () => deleteSection(btn.dataset.id, btn.dataset.name, btn.dataset.dept));
  });
}

async function loadSectionList(department = "") {
  try {
    let url = "/api/admin/sections";
    if (department) url += `?department=${encodeURIComponent(department)}`;

    sectionCache = await apiGet(url);

    if (sectionFilterDept) {
      const departments = await apiGet("/api/admin/departments");
      sectionFilterDept.innerHTML = '<option value="">All Departments</option>' +
        departments.map(d => `<option value="${d.name}">${d.name}</option>`).join("");
      sectionFilterDept.value = department;
    }

    renderSectionList(sectionCache);
  } catch (err) {
    console.error("Error loading sections:", err);
    sectionListBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: red;">Error loading sections</td></tr>';
  }
}

async function deleteSection(id, name, dept) {
  if (!confirm(`Are you sure you want to delete section "${name}" from ${dept}?`)) return;
  try {
    await apiDelete(`/api/admin/sections/${id}`);
    loadSectionList(sectionFilterDept.value);
    loadStats();
  } catch (err) {
    alert("Error deleting section: " + err.message);
  }
}

createSectionForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  secMsg.textContent = "";

  const sectionData = {
    name: document.getElementById("secName").value,
    department: document.getElementById("secDepartment").value,
    description: document.getElementById("secDescription").value
  };

  try {
    if (editingSectionId) {
      await apiPut(`/api/admin/sections/${editingSectionId}`, {
        name: sectionData.name,
        description: sectionData.description
      });
    } else {
      await apiPost("/api/admin/sections", sectionData);
    }

    secMsg.style.color = "green";
    secMsg.textContent = editingSectionId
      ? `Section "${sectionData.name}" updated successfully!`
      : `Section "${sectionData.name}" created successfully!`;
    editingSectionId = null;
    createSectionForm.reset();
    if (sectionFormTitle) sectionFormTitle.textContent = "➕ Create Section";
    if (sectionSubmitBtn) sectionSubmitBtn.textContent = "Add Section";
    sectionCreateCard?.classList.add("hidden");
    document.body.classList.remove("department-modal-open");
    loadSectionList(sectionFilterDept.value);
    loadStats();
  } catch (err) {
    secMsg.style.color = "red";
    secMsg.textContent = err.message;
  }
});

sectionFilterDept.addEventListener("change", () => {
  renderSectionList(sectionCache.filter(section => !sectionFilterDept.value || section.department === sectionFilterDept.value));
});

// ===================== COURSE MANAGEMENT =====================

const createCourseForm = document.getElementById("createCourseForm");
const courseCreateCard = document.getElementById("courseCreateCard");
const showCreateCourseBtn = document.getElementById("showCreateCourseBtn");
const closeCreateCourseBtn = document.getElementById("closeCreateCourseBtn");
const courseFormTitle = document.getElementById("courseFormTitle");
const courseEditId = document.getElementById("courseEditId");
const courseSubmitBtn = document.getElementById("courseSubmitBtn");
const courseMsg = document.getElementById("courseMsg");
const courseListBody = document.getElementById("courseListBody");
const courseFilterDept = document.getElementById("courseFilterDept");
const courseFilterSem = document.getElementById("courseFilterSem");

showCreateCourseBtn?.addEventListener("click", () => {
  createCourseForm.reset();
  courseEditId.value = "";
  courseFormTitle.textContent = "➕ Create Course";
  courseSubmitBtn.textContent = "Add Course";
  courseMsg.textContent = "";
  courseCreateCard?.classList.remove("hidden");
  document.body.classList.add("department-modal-open");
});

closeCreateCourseBtn?.addEventListener("click", () => {
  courseCreateCard?.classList.add("hidden");
  document.body.classList.remove("department-modal-open");
});

function editCourse(course) {
  courseEditId.value = course.id;
  document.getElementById("courseDepartment").value = course.departmentId;
  document.getElementById("courseSemester").value = course.semester;
  document.getElementById("courseCode").value = course.courseCode;
  document.getElementById("courseName").value = course.courseName;
  document.getElementById("courseCredits").value = course.credits;
  document.getElementById("courseDescription").value = course.description || "";
  courseFormTitle.textContent = "✏️ Edit Course";
  courseSubmitBtn.textContent = "Update Course";
  courseMsg.textContent = "";
  courseCreateCard.classList.remove("hidden");
  document.body.classList.add("department-modal-open");
}

async function loadCourseList(department = "", semester = "") {
  try {
    let url = "/api/admin/courses";
    const params = [];
    if (department) params.push(`department=${encodeURIComponent(department)}`);
    if (semester) params.push(`semester=${semester}`);
    if (params.length > 0) url += `?${params.join("&")}`;

    const courses = await apiGet(url);
    if (courses.length === 0) {
      courseListBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No courses found. Create one above.</td></tr>';
      return;
    }

    courseListBody.innerHTML = courses.map(c => `
      <tr>
        <td><strong>${c.courseCode}</strong></td>
        <td>${c.courseName}</td>
        <td>${c.department?.code || 'N/A'}</td>
        <td>Semester ${c.semester}</td>
        <td>${c.credits}</td>
        <td>
          <button class="edit-course-btn" data-id="${c._id}" data-dept-id="${c.department?._id || c.department}" data-semester="${c.semester}" data-code="${c.courseCode}" data-name="${c.courseName}" data-credits="${c.credits}" data-description="${c.description || ''}">✏️ Edit</button>
          <button class="delete-course-btn" data-id="${c._id}" data-name="${c.courseName}">🗑️ Delete</button>
        </td>
      </tr>
    `).join("");

    document.querySelectorAll(".edit-course-btn").forEach(btn => {
      btn.addEventListener("click", () => editCourse({
        id: btn.dataset.id,
        departmentId: btn.dataset.deptId,
        semester: btn.dataset.semester,
        courseCode: btn.dataset.code,
        courseName: btn.dataset.name,
        credits: btn.dataset.credits,
        description: btn.dataset.description
      }));
    });

    // Add delete handlers
    document.querySelectorAll(".delete-course-btn").forEach(btn => {
      btn.addEventListener("click", () => deleteCourse(btn.dataset.id, btn.dataset.name));
    });
  } catch (err) {
    console.error("Error loading courses:", err);
    courseListBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Error loading courses</td></tr>';
  }
}

async function deleteCourse(id, name) {
  if (!confirm(`Are you sure you want to delete course "${name}"?`)) return;
  try {
    await apiDelete(`/api/admin/courses/${id}`);
    loadCourseList(courseFilterDept.value, courseFilterSem.value);
    loadStats();
  } catch (err) {
    alert("Error deleting course: " + err.message);
  }
}

createCourseForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  courseMsg.textContent = "";

  const courseData = {
    department: document.getElementById("courseDepartment").value,
    semester: document.getElementById("courseSemester").value,
    courseCode: document.getElementById("courseCode").value,
    courseName: document.getElementById("courseName").value,
    credits: document.getElementById("courseCredits").value || 3,
    description: document.getElementById("courseDescription").value
  };

  try {
    const isEditing = Boolean(courseEditId.value);
    if (isEditing) {
      await apiPut(`/api/admin/courses/${courseEditId.value}`, courseData);
    } else {
      await apiPost("/api/admin/courses", courseData);
    }
    courseMsg.style.color = "green";
    courseMsg.textContent = isEditing
      ? `Course "${courseData.courseCode} - ${courseData.courseName}" updated successfully!`
      : `Course "${courseData.courseCode} - ${courseData.courseName}" created successfully!`;
    createCourseForm.reset();
    courseEditId.value = "";
    courseFormTitle.textContent = "➕ Create Course";
    courseSubmitBtn.textContent = "Add Course";
    courseCreateCard.classList.add("hidden");
    document.body.classList.remove("department-modal-open");
    loadCourseList(courseFilterDept.value, courseFilterSem.value);
    loadStats();
  } catch (err) {
    courseMsg.style.color = "red";
    courseMsg.textContent = err.message;
  }
});

courseFilterDept?.addEventListener("change", () => {
  loadCourseList(courseFilterDept.value, courseFilterSem.value);
});

courseFilterSem?.addEventListener("change", () => {
  loadCourseList(courseFilterDept.value, courseFilterSem.value);
});

// Load departments for course management dropdowns
async function loadCourseDepartmentDropdowns() {
  try {
    const departments = await apiGet("/api/admin/departments");
    const courseDepartment = document.getElementById("courseDepartment");

    courseDepartment.innerHTML = '<option value="">Select Department</option>';
    departments.forEach(d => {
      courseDepartment.innerHTML += `<option value="${d._id}">${d.name} (${d.code})</option>`;
    });

    courseFilterDept.innerHTML = '<option value="">All Departments</option>';
    departments.forEach(d => {
      courseFilterDept.innerHTML += `<option value="${d._id}">${d.name}</option>`;
    });
  } catch (err) {
    console.error("Error loading course department dropdowns:", err);
  }
}

// Load sections for student form dropdown based on selected department
async function loadStudentSectionDropdown() {
  const csDepartment = document.getElementById("csDepartment");
  const csSection = document.getElementById("csSection");

  async function updateSections() {
    const dept = csDepartment.value;
    csSection.innerHTML = '<option value="">Select Section (Optional)</option>';

    if (dept) {
      try {
        const sections = await apiGet(`/api/admin/sections?department=${encodeURIComponent(dept)}`);
        sections.forEach(s => {
          csSection.innerHTML += `<option value="${s.name}">${s.name}${s.description ? ' - ' + s.description : ''}</option>`;
        });
      } catch (err) {
        console.error("Error loading sections:", err);
      }
    }
  }

  csDepartment.addEventListener("change", updateSections);
}

analyticsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const params = new URLSearchParams();
  const dep = document.getElementById("anDepartment").value;
  const sem = document.getElementById("anSemester").value;
  const sec = document.getElementById("anSection").value;
  const name = document.getElementById("anCourseName").value;
  if (dep) params.append("department", dep);
  if (sem) params.append("semester", sem);
  if (sec) params.append("section", sec);
  if (name) params.append("courseName", name);

  const report = await apiGet(`/api/analytics/report?${params.toString()}`);
  renderAnalytics(report);
});

exportCsvBtn.addEventListener("click", async () => {
  const params = new URLSearchParams();
  const dep = document.getElementById("anDepartment").value;
  const sem = document.getElementById("anSemester").value;
  const sec = document.getElementById("anSection").value;
  const name = document.getElementById("anCourseName").value;
  if (dep) params.append("department", dep);
  if (sem) params.append("semester", sem);
  if (sec) params.append("section", sec);
  if (name) params.append("courseName", name);

  await apiDownload(`/api/analytics/export?${params.toString()}`, "attendance_report.csv");
});

function renderAnalytics(report) {
  analyticsTable.innerHTML = "";
  if (!report.length) return;

  const header = `
    <tr>
      <th>Course</th>
      <th>Classes</th>
      <th>Students</th>
      <th>Present</th>
      <th>Absent</th>
      <th>Unmarked</th>
      <th>Avg %</th>
    </tr>
  `;
  const rows = report
    .map(
      (r) => `
      <tr>
        <td>${r.class.courseCode} - ${r.class.courseName}</td>
        <td>${r.totalClassesConducted}</td>
        <td>${r.totalStudents}</td>
        <td>${r.presentCount}</td>
        <td>${r.absentCount}</td>
        <td>${r.unmarkedCount}</td>
        <td>${r.averageAttendance}%</td>
      </tr>`
    )
    .join("");
  analyticsTable.innerHTML = header + rows;

  const ctx = document.getElementById("adminChart");
  const labels = report.map((r) => r.class.courseCode);
  const data = report.map((r) => r.averageAttendance);
  if (adminChart) adminChart.destroy();
  adminChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Average %",
          data,
          backgroundColor: "#1b1f3b"
        }
      ]
    }
  });
}

async function loadProfile() {
  const currentUser = getUser();
  const name = currentUser?.name || "Admin";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  profileDetails.innerHTML = `
      <div class="profile-id-card-topline">
        <span>SMART ATTENDANCE</span>
        <span>ADMIN ID</span>
      </div>
      <div class="profile-card-header">
        <div class="profile-avatar" aria-hidden="true">${initials}</div>
        <div class="profile-card-identity">
          <h4>${name}</h4>
          <p>Administrator account</p>
        </div>
        <span class="profile-status">Active</span>
      </div>
      <div class="profile-card-details">
        <div><strong>Email</strong><span>${currentUser?.email || "N/A"}</span></div>
        <div><strong>Account type</strong><span>Administrator</span></div>
        <div><strong>Access level</strong><span>Full dashboard access</span></div>
      </div>
    `;
}

// Promotion Preview
previewPromotionBtn.addEventListener("click", async () => {
  prMsg.textContent = "";
  const department = document.getElementById("prDepartment").value;
  const semester = document.getElementById("prFromSemester").value;
  const section = document.getElementById("prSection").value;

  if (!semester) {
    prMsg.style.color = "red";
    prMsg.textContent = "Please select a semester";
    return;
  }

  try {
    const params = new URLSearchParams();
    params.append("semester", semester);
    if (department) params.append("department", department);
    if (section) params.append("section", section);

    const result = await apiGet(`/api/admin/promote/preview?${params.toString()}`);

    previewCount.textContent = result.count;

    if (result.count === 0) {
      previewTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center;">No students found for the selected criteria</td></tr>`;
    } else {
      previewTableBody.innerHTML = result.students.map(s => `
        <tr>
          <td>${s.name}</td>
          <td>${s.email}</td>
          <td>${s.department || 'N/A'}</td>
          <td>${s.semester}</td>
          <td>${s.section || 'N/A'}</td>
        </tr>
      `).join("");
    }

    promotionPreview.style.display = "block";
  } catch (err) {
    prMsg.style.color = "red";
    prMsg.textContent = err.message;
  }
});

// Promote Students
promoteForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  prMsg.textContent = "";

  const department = document.getElementById("prDepartment").value;
  const fromSemester = document.getElementById("prFromSemester").value;
  const section = document.getElementById("prSection").value;

  if (!fromSemester) {
    prMsg.style.color = "red";
    prMsg.textContent = "Please select a semester";
    return;
  }

  const confirmMsg = fromSemester === "8"
    ? "Are you sure you want to mark these students as graduated?"
    : `Are you sure you want to promote students from semester ${fromSemester} to semester ${parseInt(fromSemester) + 1}?`;

  if (!confirm(confirmMsg)) {
    return;
  }

  try {
    let result;
    const body = { fromSemester };
    if (department) body.department = department;
    if (section) body.section = section;

    if (fromSemester === "8") {
      result = await apiPost("/api/admin/graduate", body);
    } else {
      result = await apiPost("/api/admin/promote", body);
    }

    prMsg.style.color = "green";
    prMsg.textContent = result.message;
    promotionPreview.style.display = "none";
    loadStats(); // Refresh stats
  } catch (err) {
    prMsg.style.color = "red";
    prMsg.textContent = err.message;
  }
});

// Initial load
switchView("dashboard");
loadStats().catch(console.error);
loadProfile();

// ===================== FACULTY SCHEDULE MANAGEMENT =====================

let currentFacultyId = null;
let currentFacultySchedule = null;
let facultyClasses = [];
let allFacultyList = [];
let departmentCodeMap = {};

const ttDepartmentFilter = document.getElementById("ttDepartmentFilter");
const ttFacultySelect = document.getElementById("ttFaculty");
const addSlotBtn = document.getElementById("addSlotBtn");
const addSlotCard = document.getElementById("addSlotCard");
const showAddSlotBtn = document.getElementById("showAddSlotBtn");
const closeAddSlotBtn = document.getElementById("closeAddSlotBtn");
const slotMsg = document.getElementById("slotMsg");
const adminTimetableBody = document.getElementById("adminTimetableBody");
const adminTimetableHead = document.getElementById("adminTimetableHead");
const slotStartSelect = document.getElementById("slotStart");
const slotEndSelect = document.getElementById("slotEnd");
const slotCourseSelect = document.getElementById("slotCourse");
const saveScheduleBtn = document.getElementById("saveScheduleBtn");
const scheduleStatus = document.getElementById("scheduleStatus");
const addSlotTitle = addSlotCard?.querySelector("h4");
let editingSlot = null;

function openAddSlotForm(day = "", startTime = "", endTime = "") {
  editingSlot = null;
  document.getElementById("addSlotForm")?.reset();
  document.getElementById("slotDay").value = day;
  slotStartSelect.value = startTime;
  syncSlotEndTime();
  if (endTime) slotEndSelect.value = endTime;
  if (addSlotTitle) addSlotTitle.textContent = "➕ Add Class to Schedule";
  if (addSlotBtn) addSlotBtn.textContent = "Add to Schedule";
  slotMsg.textContent = "";
  addSlotCard?.classList.remove("hidden");
  document.body.classList.add("department-modal-open");
}

showAddSlotBtn?.addEventListener("click", () => openAddSlotForm());

function syncSlotEndTime() {
  if (!slotEndSelect) return;
  const startMinutes = slotStartSelect?.value
    ? Number(slotStartSelect.value.split(":")[0]) * 60 + Number(slotStartSelect.value.split(":")[1])
    : null;
  let firstValidEnd = "";

  [...slotEndSelect.options].forEach(option => {
    if (!option.value) {
      option.hidden = false;
      return;
    }

    const [hours, minutes] = option.value.split(":").map(Number);
    const endMinutes = hours * 60 + minutes;
    const isBeforeLunch = startMinutes !== null && startMinutes < 13 * 60 + 30;
    const isValid = startMinutes === null || (
      endMinutes > startMinutes &&
      (!isBeforeLunch || endMinutes <= 13 * 60 + 30) &&
      (startMinutes >= 14 * 60 + 10 || endMinutes <= 13 * 60 + 30)
    );
    option.hidden = !isValid;
    if (isValid && !firstValidEnd) firstValidEnd = option.value;
  });

  slotEndSelect.value = firstValidEnd;
  slotEndSelect.disabled = false;
}

slotStartSelect?.addEventListener("change", syncSlotEndTime);
syncSlotEndTime();

closeAddSlotBtn?.addEventListener("click", () => {
  editingSlot = null;
  addSlotCard?.classList.add("hidden");
  document.body.classList.remove("department-modal-open");
});

// Load all faculty members for timetable dropdown
async function loadFacultyDropdown() {
  try {
    console.log("Loading faculty dropdown...");
    const users = await apiGet("/api/admin/users?role=faculty");
    console.log("Faculty users received:", users);
    allFacultyList = users;
    console.log("ttFacultySelect element:", ttFacultySelect);
    filterFacultyByDepartment();
  } catch (err) {
    console.error("Error loading faculty list:", err);
  }
}

// Alias for initial load
const loadFacultyList = loadFacultyDropdown;

// Filter faculty by department
function filterFacultyByDepartment() {
  const selectedDept = ttDepartmentFilter.value;
  const filteredFaculty = selectedDept
    ? allFacultyList.filter(f => f.department === selectedDept)
    : allFacultyList;

  ttFacultySelect.innerHTML = '<option value="">Select Faculty</option>';
  filteredFaculty.forEach(f => {
    ttFacultySelect.innerHTML += `<option value="${f._id}" data-dept="${f.department || ''}" data-email="${f.email}">${f.name} (${f.department || 'No Dept'})</option>`;
  });

}

// Department filter change handler
ttDepartmentFilter.addEventListener("change", filterFacultyByDepartment);

// Load faculty's schedule and classes
async function loadSelectedFacultySchedule() {
  const facultyId = ttFacultySelect.value;

  if (!facultyId) {
    alert("Please select a faculty member");
    return;
  }

  currentFacultyId = facultyId;

  try {
    // Get selected faculty's department
    const selectedFaculty = ttFacultySelect.options[ttFacultySelect.selectedIndex];
    const facultyDept = selectedFaculty.dataset.dept;

    // Load ALL courses (not just assigned classes) - filtered by faculty's department if available
    const departments = await apiGet("/api/admin/departments");
    departmentCodeMap = Object.fromEntries(
      departments.map(department => [department.name, department.code])
    );

    let coursesUrl = "/api/admin/courses";
    if (facultyDept) {
      const dept = departments.find(d => d.name === facultyDept);
      if (dept) {
        coursesUrl += `?department=${dept._id}`;
      }
    }
    const courses = await apiGet(coursesUrl);

    // Populate course dropdown with available courses
    slotCourseSelect.innerHTML = '<option value="">Select Course</option>';
    courses.forEach(c => {
      const deptName = c.department?.name || c.department;
      const deptCode = c.department?.code || deptName?.substring(0, 3);
      slotCourseSelect.innerHTML += `<option value="${c._id}" data-code="${c.courseCode}" data-name="${c.courseName}" data-dept="${deptName}" data-dept-id="${c.department?._id || c.department}" data-sem="${c.semester}">${c.courseCode} - ${c.courseName} (Sem ${c.semester}, ${deptCode})</option>`;
    });

    // Reset section dropdown
    document.getElementById("slotSection").innerHTML = '<option value="">Select Section</option>';

    if (courses.length === 0) {
      slotMsg.style.color = "orange";
      slotMsg.textContent = "No courses found. Create courses first in Manage Courses.";
    } else {
      slotMsg.textContent = "";
    }

    // Load faculty's schedule
    const schedule = await apiGet(`/api/admin/faculty-schedule?facultyId=${facultyId}`);
    currentFacultySchedule = schedule || { facultyId, schedule: {} };

    renderFacultySchedule();
  } catch (err) {
    console.error("Error loading faculty schedule:", err);
    alert("Error loading schedule: " + err.message);
  }
}

ttFacultySelect.addEventListener("change", () => {
  if (ttFacultySelect.value) loadSelectedFacultySchedule();
});

// Load sections when course is selected
async function loadSectionsForSelectedCourse() {
  const slotSection = document.getElementById("slotSection");
  const selectedOption = slotCourseSelect.options[slotCourseSelect.selectedIndex];

  slotSection.innerHTML = '<option value="">Select Section</option>';

  if (selectedOption.value && selectedOption.dataset.dept) {
    try {
      const deptName = selectedOption.dataset.dept;
      const sections = await apiGet(`/api/admin/sections?department=${encodeURIComponent(deptName)}`);
      sections.forEach(s => {
        slotSection.innerHTML += `<option value="${s.name}">${s.name}${s.description ? ' - ' + s.description : ''}</option>`;
      });
    } catch (err) {
      console.error("Error loading sections:", err);
    }
  }
}

slotCourseSelect.addEventListener("change", loadSectionsForSelectedCourse);

// Add time slot to faculty schedule
addSlotBtn.addEventListener("click", async () => {
  slotMsg.textContent = "";

  if (!currentFacultyId) {
    slotMsg.style.color = "red";
    slotMsg.textContent = "Please select a faculty first";
    return;
  }

  const day = document.getElementById("slotDay").value;
  const startTime = document.getElementById("slotStart").value;
  const endTime = document.getElementById("slotEnd").value;
  const courseSelect = document.getElementById("slotCourse");
  const selectedOption = courseSelect.options[courseSelect.selectedIndex];
  const courseId = courseSelect.value;
  const section = document.getElementById("slotSection").value;

  if (!startTime || !endTime || !courseId) {
    slotMsg.style.color = "red";
    slotMsg.textContent = "Please fill Day, Start Time, End Time, and Course";
    return;
  }

  try {
    if (editingSlot) {
      await apiPost("/api/admin/faculty-schedule/slot/delete", {
        facultyId: currentFacultyId,
        day: editingSlot.day,
        startTime: editingSlot.startTime
      });
    }

    await apiPost("/api/admin/faculty-schedule/slot", {
      facultyId: currentFacultyId,
      day,
      startTime,
      endTime,
      courseId,
      courseCode: selectedOption.dataset.code,
      courseName: selectedOption.dataset.name,
      department: selectedOption.dataset.dept,
      semester: selectedOption.dataset.sem,
      section
    });

    slotMsg.style.color = "green";
    slotMsg.textContent = editingSlot ? "Class updated in schedule!" : "Class added to schedule!";
    editingSlot = null;
    if (addSlotTitle) addSlotTitle.textContent = "➕ Add Class to Schedule";
    if (addSlotBtn) addSlotBtn.textContent = "Add to Schedule";

    // Reload schedule
    loadSelectedFacultySchedule();

    // Reset form
    document.getElementById("slotStart").value = "";
    document.getElementById("slotEnd").value = "";
    document.getElementById("slotSection").value = "";
  } catch (err) {
    slotMsg.style.color = "red";
    slotMsg.textContent = err.message;
  }
});

function renderFacultySchedule() {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const fixedPeriods = [
    { startTime: '09:30', endTime: '10:30', label: '9:30 - 10:30' },
    { startTime: '10:30', endTime: '11:30', label: '10:30 - 11:30' },
    { startTime: '11:30', endTime: '12:30', label: '11:30 - 12:30' },
    { startTime: '12:30', endTime: '13:30', label: '12:30 - 1:30' },
    { break: true, label: '1:30 - 2:10' },
    { startTime: '14:10', endTime: '15:10', label: '2:10 - 3:10' },
    { startTime: '15:10', endTime: '16:10', label: '3:10 - 4:10' }
  ];
  let periods = fixedPeriods;

  const renderHeader = () => {
    adminTimetableHead.innerHTML = `<tr><th>Day</th>${periods.map(period =>
      `<th class="${period.break ? 'timetable-break-header' : ''}">${period.label.replace('\n', '<br>')}</th>`
    ).join('')}</tr>`;
  };
  renderHeader();

  if (!currentFacultySchedule || !currentFacultySchedule.schedule) {
    adminTimetableBody.innerHTML = days.map(day =>
      `<tr><th class="timetable-day-label">${day.slice(0, 3).replace(/^./, letter => letter.toUpperCase())}</th>${periods.map(period =>
        `<td class="${period.break ? 'timetable-break-cell' : 'timetable-empty-cell'}">${period.break ? 'Lunch Break' : ''}</td>`
      ).join('')}</tr>`
    ).join('');
    return;
  }

  const schedule = currentFacultySchedule.schedule;
  const fixedTimes = new Set(
    fixedPeriods.filter(period => !period.break).map(period => `${period.startTime}|${period.endTime}`)
  );
  const extraPeriods = [...new Map(
    days.flatMap(day => schedule[day] || [])
      .filter(slot => !fixedTimes.has(`${slot.startTime}|${slot.endTime}`))
      .map(slot => [`${slot.startTime}|${slot.endTime}`, {
        startTime: slot.startTime,
        endTime: slot.endTime,
        label: `${slot.startTime} - ${slot.endTime} (Other)`
      }])
  ).values()].sort((first, second) => first.startTime.localeCompare(second.startTime));
  periods = [...fixedPeriods, ...extraPeriods];
  renderHeader();

  // Build one row per day, matching the reference timetable layout.
  let html = '';
  for (const day of days) {
    html += `<tr><th class="timetable-day-label">${day.slice(0, 3).replace(/^./, letter => letter.toUpperCase())}</th>`;

    for (const period of periods) {
      if (period.break) {
        html += '<td class="timetable-break-cell">Lunch Break</td>';
        continue;
      }

      const slot = schedule[day]?.find(s =>
        s.startTime === period.startTime && s.endTime === period.endTime
      );
      if (slot) {
        html += `<td class="timetable-cell">
          <div class="course-code">${slot.courseCode}</div>
          <div class="course-name">${slot.courseName}</div>
          <div class="section" style="font-weight: bold; color: #007bff;">${departmentCodeMap[slot.department] || slot.department?.substring(0, 3) || 'N/A'} ${slot.section || 'N/A'}</div>
          <div class="timetable-slot-actions">
            <button class="edit-slot-btn" type="button" data-day="${day}" data-start="${period.startTime}" data-end="${period.endTime}" data-course-id="${slot.courseId || slot.classId || ''}" data-course-code="${slot.courseCode}" data-section="${slot.section || ''}" aria-label="Edit ${slot.courseCode} timetable slot" title="Edit timetable slot"><span aria-hidden="true">✏️</span></button>
            <button class="delete-slot-btn" type="button" data-day="${day}" data-time="${period.startTime}" aria-label="Delete ${slot.courseCode} timetable slot" title="Delete timetable slot"><span aria-hidden="true">🗑️</span></button>
          </div>
        </td>`;
      } else {
        html += `<td class="timetable-empty-cell">
          <button class="add-slot-cell-btn" type="button" data-day="${day}" data-start="${period.startTime}" data-end="${period.endTime}" aria-label="Add class on ${day} at ${period.label}" title="Add class"><span aria-hidden="true">+</span></button>
        </td>`;
      }
    }

    html += '</tr>';
  }

  adminTimetableBody.innerHTML = html;

  document.querySelectorAll(".add-slot-cell-btn").forEach(btn => {
    btn.addEventListener("click", () => openAddSlotForm(
      btn.dataset.day,
      btn.dataset.start,
      btn.dataset.end
    ));
  });

  document.querySelectorAll(".edit-slot-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      editingSlot = {
        day: btn.dataset.day,
        startTime: btn.dataset.start,
        courseId: btn.dataset.courseId
      };
      document.getElementById("slotDay").value = btn.dataset.day;
      slotStartSelect.value = btn.dataset.start;
      syncSlotEndTime();
      slotEndSelect.value = btn.dataset.end;
      slotCourseSelect.value = btn.dataset.courseId;
      await loadSectionsForSelectedCourse();
      document.getElementById("slotSection").value = btn.dataset.section;
      if (addSlotTitle) addSlotTitle.textContent = "✎ Edit Class Schedule";
      if (addSlotBtn) addSlotBtn.textContent = "Update Schedule";
      slotMsg.textContent = "";
      addSlotCard?.classList.remove("hidden");
      document.body.classList.add("department-modal-open");
    });
  });

  // Add delete handlers
  document.querySelectorAll(".delete-slot-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this time slot?")) return;

      const day = btn.dataset.day;
      const startTime = btn.dataset.time;

      try {
        await apiPost("/api/admin/faculty-schedule/slot/delete", {
          facultyId: currentFacultyId,
          day,
          startTime
        });

        loadSelectedFacultySchedule();
      } catch (err) {
        alert("Error deleting slot: " + err.message);
      }
    });
  });
}

// Save Schedule button handler
saveScheduleBtn.addEventListener("click", async () => {
  if (!currentFacultyId) {
    alert("Please select a faculty member first");
    return;
  }

  if (!currentFacultySchedule || !currentFacultySchedule.schedule) {
    alert("No schedule to save");
    return;
  }

  try {
    saveScheduleBtn.disabled = true;
    saveScheduleBtn.textContent = "Saving...";

    // Save the complete schedule
    await apiPost("/api/admin/faculty-schedule/save", {
      facultyId: currentFacultyId,
      schedule: currentFacultySchedule.schedule
    });

    scheduleStatus.style.color = "#28a745";
    scheduleStatus.textContent = "✓ Schedule saved successfully!";

    setTimeout(() => {
      scheduleStatus.textContent = "";
    }, 3000);
  } catch (err) {
    scheduleStatus.style.color = "#dc3545";
    scheduleStatus.textContent = "✗ Error saving: " + err.message;
  } finally {
    saveScheduleBtn.disabled = false;
    saveScheduleBtn.textContent = "💾 Save Schedule";
  }
});
