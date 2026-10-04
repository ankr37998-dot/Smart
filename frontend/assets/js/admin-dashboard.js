// Dashboard functionality
// Using global api functions from api.js

const statsEl = document.getElementById("adminStats");

async function loadStats() {
  try {
    const [users, classes, departments, sections, courses] = await Promise.all([
      window.apiGet("/api/admin/users"),
      window.apiGet("/api/admin/classes"),
      window.apiGet("/api/admin/departments"),
      window.apiGet("/api/admin/sections"),
      window.apiGet("/api/admin/courses"),
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
    const sessions = await window.apiGet("/api/admin/analytics/report");
    if (!sessions || sessions.length === 0) {
      overview.innerHTML = "<p>No attendance sessions recorded yet.</p>";
      status.textContent = "No data";
      return;
    }

    status.textContent = `Updated: ${formatDateTime(new Date())}`;

    // Calculate attendance overview
    const totalSessions = sessions.length;
    const averageAttendance = sessions.reduce((sum, s) => sum + (s.attendancePercentage || 0), 0) / totalSessions;

    overview.innerHTML = `
      <div class="attendance-stat">
        <h4>Total Sessions</h4>
        <p>${totalSessions}</p>
      </div>
      <div class="attendance-stat">
        <h4>Average Attendance</h4>
        <p>${averageAttendance.toFixed(1)}%</p>
      </div>
    `;

    // Load alerts for low attendance
    const lowAttendanceSessions = sessions.filter(s => (s.attendancePercentage || 0) < 75);
    if (lowAttendanceSessions.length > 0) {
      alerts.innerHTML = lowAttendanceSessions.map(s => `
        <div class="alert-item">
          <strong>${s.courseName || 'Unknown'}</strong>
          <span>${s.attendancePercentage.toFixed(1)}% attendance</span>
        </div>
      `).join('');
    } else {
      alerts.innerHTML = "<p>All classes have good attendance (>75%)</p>";
    }

  } catch (error) {
    console.error("Attendance dashboard load error", error);
    overview.innerHTML = "<p>Could not load attendance data.</p>";
    status.textContent = "Error";
  }
}

function loadSemesterDistribution(students) {
  const semesterDist = {};
  students.forEach(s => {
    const sem = s.semester || 'Unknown';
    semesterDist[sem] = (semesterDist[sem] || 0) + 1;
  });

  const distEl = document.getElementById("semesterDistribution");
  if (distEl) {
    distEl.innerHTML = Object.entries(semesterDist)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([sem, count]) => `
        <div class="semester-item">
          <span>Semester ${sem}</span>
          <span>${count} students</span>
        </div>
      `).join('');
  }
}

function loadDepartmentOverview(students, faculty, departments) {
  const deptEl = document.getElementById("departmentOverview");
  if (!deptEl) return;

  deptEl.innerHTML = departments.map(dept => {
    const deptStudents = students.filter(s => s.department === dept._id);
    const deptFaculty = faculty.filter(f => f.department === dept._id);
    return `
      <div class="dept-item">
        <h4>${dept.name}</h4>
        <p>${deptStudents.length} students, ${deptFaculty.length} faculty</p>
      </div>
    `;
  }).join('');
}

function loadSystemSummary(students, faculty, departments, sections, courses, classes) {
  const summaryEl = document.getElementById("systemSummary");
  if (!summaryEl) return;

  summaryEl.innerHTML = `
    <div class="summary-item">
      <h4>Total Users</h4>
      <p>${students + faculty}</p>
    </div>
    <div class="summary-item">
      <h4>Academic Structure</h4>
      <p>${departments} depts, ${sections} sections, ${courses} courses</p>
    </div>
    <div class="summary-item">
      <h4>Class Schedule</h4>
      <p>${classes} active classes</p>
    </div>
  `;
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  loadStats().catch(console.error);
});