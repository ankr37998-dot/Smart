import { apiGet, apiPost, ensureAuth, getUser, logout } from "./api.js?v=20260526";

const user = ensureAuth(["faculty"]);

const logoutBtn = document.getElementById("logoutBtn");
logoutBtn?.addEventListener("click", logout);

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection in faculty.js:", event.reason);
  event.preventDefault();
});

window.addEventListener("error", (event) => {
  console.error("Unhandled error in faculty.js:", event.error || event.message || event);
});

// Cache for faculty classes to populate report dropdowns
let facultyClassesCache = [];

// Ensure logout works even if the API call fails — use the centralized `logout` helper
logoutBtn?.addEventListener("click", async () => {
  try {
    // Attempt server-side logout if available
    await logout().catch(err => console.error('logout() failed:', err));
  } catch (err) {
    console.error('Error during logout:', err);
  } finally {
    // Ensure client-side cleanup and redirect always happen
    try { sessionStorage.clear(); } catch (e) { console.error('sessionStorage clear failed', e); }
    window.location.href = "index.html";
  }
});

const timeTable = document.getElementById("timeTable");
const dashboardCards = document.getElementById("dashboardCards");
const upcomingClassDetails = document.getElementById("upcomingClassDetails");
const profileDetails = document.getElementById("profileDetails");
const sessionControls = document.getElementById("activeSessionPanel");
const sessionInfo = document.getElementById("activeSessionInfo");
const studentsTable = document.getElementById("studentsTable");
let qr;
let currentQrToken;
let currentSessionId;
let livePresent = 0;
let liveAbsent = 0;
let totalStudents = 0;

// ===================== MANUAL ATTENDANCE ELEMENTS (ADD-ONLY) =====================
const manualStudentSelect = document.getElementById("manualStudentSelect");
const manualMarkBtn = document.getElementById("manualMarkBtn");
const manualAttendanceMsg = document.getElementById("manualAttendanceMsg");
const manualAttendanceDetails = document.getElementById("manualAttendanceDetails");

// Set date to today for report form
document.getElementById('reportDate').valueAsDate = new Date();

// View switching
const dashboardBtn = document.getElementById("dashboardBtn");
const viewAttendanceBtn = document.getElementById("viewAttendanceBtn");
const analyticsBtn = document.getElementById("analyticsBtn");
const timeTableBtn = document.getElementById("timeTableBtn");
const profileBtn = document.getElementById("profileBtn");
const dashboardView = document.getElementById("dashboardView");
const viewAttendanceView = document.getElementById("viewAttendanceView");
const analyticsView = document.getElementById("analyticsView");
const timeTableView = document.getElementById("timeTableView");
const profileView = document.getElementById("profileView");
const activeSessionPanel = document.getElementById("activeSessionPanel");

dashboardBtn?.addEventListener("click", () => switchView("dashboard"));
viewAttendanceBtn?.addEventListener("click", () => switchView("view"));
analyticsBtn?.addEventListener("click", () => switchView("analytics"));
timeTableBtn?.addEventListener("click", () => switchView("timeTable"));
profileBtn?.addEventListener("click", () => switchView("profile"));

function switchView(view) {
  const views = [
    dashboardView,
    viewAttendanceView,
    analyticsView,
    timeTableView,
    profileView,
  ];

  views.forEach((viewElement) => {
    viewElement?.classList.add("hidden");
    if (viewElement) viewElement.style.display = "";
  });

  dashboardBtn.classList.remove("active");
  viewAttendanceBtn.classList.remove("active");
  analyticsBtn.classList.remove("active");
  timeTableBtn.classList.remove("active");
  profileBtn.classList.remove("active");

  if (view === "dashboard") {
    dashboardView.classList.remove("hidden");
    dashboardBtn.classList.add("active");
    loadDashboardFromDB();
  } else if (view === "view") {
    viewAttendanceView.classList.remove("hidden");
    viewAttendanceBtn.classList.add("active");
    // Fetch classes if not already cached, or refresh them
    if (facultyClassesCache.length === 0) {
      fetchFacultyClasses();
    }
  } else if (view === "analytics") {
    analyticsView.classList.remove("hidden");
    analyticsBtn.classList.add("active");
    loadFacultyAnalytics();
  } else if (view === "timeTable") {
    timeTableView.classList.remove("hidden");
    timeTableBtn.classList.add("active");
    loadTimeTableFromDB();
  } else if (view === "profile") {
    profileView.classList.remove("hidden");
    profileBtn.classList.add("active");
  }
}

// Add event listeners for report branch and semester changes
document.getElementById("reportBranch")?.addEventListener("change", populateSemesterDropdown);
document.getElementById("reportSemester")?.addEventListener("change", populateSectionDropdown);
document.getElementById("reportSection")?.addEventListener("change", populateSubjectDropdown);

// Populate subjects for report form based on branch and semester
async function fetchFacultyClasses() {
  try {
    const classes = await apiGet("/api/faculty/classes");
    facultyClassesCache = classes;
    populateBranchDropdown();
  } catch (error) {
    console.error("Error fetching classes:", error);
  }
}

function populateBranchDropdown() {
  const branchSelect = document.getElementById("reportBranch");
  const uniqueBranches = [...new Set(facultyClassesCache.map(c => c.department))];

  // Save current selection if exists
  const currentVal = branchSelect.value;

  branchSelect.innerHTML = '<option value="" disabled selected>Select Branch</option>';
  uniqueBranches.forEach(branch => {
    const option = document.createElement("option");
    option.value = branch;
    option.textContent = branch;
    branchSelect.appendChild(option);
  });

  if (uniqueBranches.includes(currentVal)) {
    branchSelect.value = currentVal;
  } else {
    // Reset downstream if branch changed or invalid
    document.getElementById("reportSemester").innerHTML = '<option value="" disabled selected>Select Semester</option>';
    document.getElementById("reportSection").innerHTML = '<option value="" disabled selected>Select Section</option>';
    document.getElementById("reportSubject").innerHTML = '<option value="" disabled selected>Select Subject</option>';
  }
}

function populateSemesterDropdown() {
  const branchSelect = document.getElementById("reportBranch");
  const semesterSelect = document.getElementById("reportSemester");
  const selectedBranch = branchSelect.value;

  // Filter classes by branch
  const filteredClasses = facultyClassesCache.filter(c => c.department === selectedBranch);
  const uniqueSemesters = [...new Set(filteredClasses.map(c => c.semester))].sort((a, b) => a - b);

  semesterSelect.innerHTML = '<option value="" disabled selected>Select Semester</option>';
  uniqueSemesters.forEach(sem => {
    const option = document.createElement("option");
    option.value = sem;
    option.textContent = sem;
    semesterSelect.appendChild(option);
  });

  // Reset downstream
  document.getElementById("reportSection").innerHTML = '<option value="" disabled selected>Select Section</option>';
  document.getElementById("reportSubject").innerHTML = '<option value="" disabled selected>Select Subject</option>';
}

function populateSectionDropdown() {
  const branchSelect = document.getElementById("reportBranch");
  const semesterSelect = document.getElementById("reportSemester");
  const sectionSelect = document.getElementById("reportSection");

  const selectedBranch = branchSelect.value;
  const selectedSemester = semesterSelect.value;

  const filteredClasses = facultyClassesCache.filter(c =>
    c.department === selectedBranch && c.semester == selectedSemester
  );

  const uniqueSections = [...new Set(filteredClasses.map(c => c.section))].sort();

  sectionSelect.innerHTML = '<option value="" disabled selected>Select Section</option>';
  uniqueSections.forEach(sec => {
    const option = document.createElement("option");
    option.value = sec;
    option.textContent = sec;
    sectionSelect.appendChild(option);
  });

  // Reset downstream
  document.getElementById("reportSubject").innerHTML = '<option value="" disabled selected>Select Subject</option>';
}

function populateSubjectDropdown() {
  const branchSelect = document.getElementById("reportBranch");
  const semesterSelect = document.getElementById("reportSemester");
  const sectionSelect = document.getElementById("reportSection");
  const subjectSelect = document.getElementById("reportSubject");

  const selectedBranch = branchSelect.value;
  const selectedSemester = semesterSelect.value;
  const selectedSection = sectionSelect.value;

  const filteredClasses = facultyClassesCache.filter(c =>
    c.department === selectedBranch &&
    c.semester == selectedSemester &&
    c.section === selectedSection
  );

  // Remove duplicates
  const uniqueSubjects = [];
  const seen = new Set();

  filteredClasses.forEach(c => {
    if (!seen.has(c.courseCode)) {
      seen.add(c.courseCode);
      uniqueSubjects.push({ code: c.courseCode, name: c.courseName });
    }
  });

  subjectSelect.innerHTML = '<option value="" disabled selected>Select Subject</option>';
  uniqueSubjects.forEach(sub => {
    const option = document.createElement("option");
    option.value = sub.code;
    option.textContent = `${sub.code} - ${sub.name}`;
    subjectSelect.appendChild(option);
  });
}

async function startSession(classId, sessionData) {
  sessionControls.style.display = "block"; // Show the session controls
  try {
    // Call the real API to start the session
    const session = await apiPost("/api/faculty/start-session", { classId });

    currentQrToken = session.qrToken;

    // Get class details for display
    const classDisplayName = `${sessionData.branch} - ${sessionData.subjectCode} (${sessionData.section})`;

    sessionInfo.textContent = `Session started for: ${classDisplayName}
Date: ${sessionData.date}
Token: ${session.qrToken}
Expires at: ${new Date(session.expiresAt).toLocaleTimeString()}`;

    const canvas = document.getElementById("sessionQr");
    qr = new QRious({ element: canvas, size: 200, value: session.qrToken });

    // Display token for manual entry
    const tokenDisplay = document.getElementById("sessionTokenDisplay");
    if (tokenDisplay) tokenDisplay.textContent = session.qrToken;

    loadStudents(classId);
  } catch (error) {
    console.error("Error starting session", error);

    if (sessionControls) {
      sessionControls.style.display = "none";
    }

    if (sessionInfo) {
      sessionInfo.textContent = `Failed to start attendance session: ${error?.message || "Unknown error"}. Please refresh and try again.`;
    }

    currentQrToken = null;
    return;
  }
}

async function loadStudents(classId) {
  try {
    // Fetch actual students from API
    let students = [];
    try {
      students = await apiGet(`/api/faculty/class/${classId}/students`);
    } catch (err) {
      console.error("Error fetching students from API, using mock data", err);
      // Fallback mock data
      students = [
        { _id: "1", rollNo: "23CSE0003", name: "Student C" },
        { _id: "2", rollNo: "23CSE0001", name: "Student A" },
        { _id: "3", rollNo: "23CSE0002", name: "Student B" },
      ];
    }

    // Sort students by roll number
    students.sort((a, b) => {
      const rollA = a.rollNo || '';
      const rollB = b.rollNo || '';
      return rollA.localeCompare(rollB);
    });

    const livePresentCount = document.getElementById("livePresentCount");
    const liveAbsentCount = document.getElementById("liveAbsentCount");
    const totalStudentCount = document.getElementById("totalStudentCount");

    totalStudents = students.length;
    livePresent = 0;
    liveAbsent = totalStudents;

    totalStudentCount.textContent = totalStudents;
    livePresentCount.textContent = livePresent;
    liveAbsentCount.textContent = liveAbsent;

    let studentStatus = {};
    students.forEach(s => studentStatus[s._id] = 'absent');

    const header = `
      <thead>
        <tr>
          <th>Roll No</th>
          <th>Student Name</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
    `;

    const rows = students
      .map(
        (s) => `
        <tr data-student-row-id="${s._id}">
          <td>${s.rollNo || 'N/A'}</td>
          <td>${s.name}</td>
          <td class="status-cell">Absent</td>
          <td>
            <button data-student-id="${s._id}" data-status="present" class="attendance-btn manual-attendance-btn-p">P</button>
            <button data-student-id="${s._id}" data-status="absent" class="attendance-btn manual-attendance-btn-a">A</button>
          </td>
        </tr>`
      )
      .join("");

    const footer = `
      <tfoot>
        <tr>
          <td colspan="4" style="text-align: center;">
            <button type="button" id="saveAttendanceBtn">Save Attendance</button>
          </td>
        </tr>
      </tfoot>
    `;

    if (studentsTable) {
      studentsTable.innerHTML = `${header}<tbody>${rows}</tbody>${footer}`;
    }

    document.querySelectorAll(".attendance-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const studentId = btn.dataset.studentId;
        const newStatus = btn.dataset.status;
        const oldStatus = studentStatus[studentId];

        if (newStatus === oldStatus) return;

        studentStatus[studentId] = newStatus;

        if (newStatus === 'present') {
          livePresent++;
          liveAbsent--;
        } else { // newStatus is 'absent'
          livePresent--;
          liveAbsent++;
        }

        livePresentCount.textContent = livePresent;
        liveAbsentCount.textContent = liveAbsent;

        const row = document.querySelector(`tr[data-student-row-id="${studentId}"]`);
        const statusCell = row.querySelector(".status-cell");
        statusCell.textContent = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
      });
    });

    document.getElementById("saveAttendanceBtn")?.addEventListener("click", async () => {
      if (!currentSessionId) {
        alert("No active session. Please start a session first.");
        return;
      }

      const attendanceData = students.map(student => ({
        studentId: student._id,
        status: studentStatus[student._id]
      }));

      try {
        const response = await apiPost("/api/faculty/save-attendance", {
          sessionId: currentSessionId,
          attendance: attendanceData
        });

        alert(`Attendance saved successfully! ${response.saved} records saved.`);
      } catch (error) {
        console.error("Error saving attendance:", error);
        alert("Failed to save attendance: " + (error.message || "Unknown error"));
      }
    });

  } catch (error) {
    console.error("Error loading students", error);
    if (studentsTable) {
      studentsTable.innerHTML = "<tr><td colspan='4'>Could not load students.</td></tr>";
    }
  }
}

// Modal
const modal = document.getElementById("qrModal");
const enlargeQrBtn = document.getElementById("enlargeQrBtn");
const closeBtn = document.querySelector(".close-btn");
const scannedStudentsList = document.getElementById("scannedStudentsList");
const modalPresentCount = document.getElementById("modalPresentCount");
const modalAbsentCount = document.getElementById("modalAbsentCount");
const modalTotalCount = document.getElementById("modalTotalCount");
const copySessionTokenBtn = document.getElementById("copySessionTokenBtn");

// Save Attendance button for Active Session panel
const saveAttendanceBtn = document.getElementById("saveAttendanceBtn");
if (saveAttendanceBtn) {
  saveAttendanceBtn.addEventListener("click", async () => {
    if (!currentSessionId) {
      alert("No active session. Please start a session first.");
      return;
    }
    // Collect attendance data from UI
    const studentRows = document.querySelectorAll("tr[data-student-row-id]");
    const attendanceData = Array.from(studentRows).map(row => {
      const studentId = row.getAttribute("data-student-row-id");
      const statusCell = row.querySelector(".status-cell");
      const status = statusCell ? statusCell.textContent.toLowerCase() : "absent";
      return { studentId, status };
    });
    try {
      const response = await apiPost("/api/faculty/save-attendance", {
        sessionId: currentSessionId,
        attendance: attendanceData
      });
      alert(`Attendance saved successfully! ${response.saved} records saved.`);
    } catch (error) {
      console.error("Error saving attendance:", error);
      alert("Failed to save attendance: " + (error.message || "Unknown error"));
    }
  });
}

// Copy token button
if (copySessionTokenBtn) {
  copySessionTokenBtn.onclick = function () {
    if (currentQrToken) {
      navigator.clipboard.writeText(currentQrToken).then(() => {
        copySessionTokenBtn.textContent = '✅ Copied!';
        setTimeout(() => { copySessionTokenBtn.textContent = '📋 Copy Token'; }, 2000);
      }).catch(err => {
        alert('Failed to copy. Token: ' + currentQrToken);
      });
    }
  };
}

enlargeQrBtn.onclick = function () {
  modal.style.display = "flex";
  const modalCanvas = document.getElementById('modalQrCanvas');
  new QRious({ element: modalCanvas, size: 400, value: currentQrToken });

  // MOCK DATA for modal
  const scannedStudents = ["Student A", "Student B"];
  scannedStudentsList.innerHTML = scannedStudents.map(s => `<li>${s}</li>`).join('');

  modalPresentCount.textContent = livePresent;
  modalAbsentCount.textContent = liveAbsent;
  modalTotalCount.textContent = totalStudents;
}

closeBtn.onclick = function () {
  modal.style.display = "none";
}

window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}

function loadTimeTable() {
  // MOCK DATA for time table
  const timeTableData = [
    { time: "09:00 - 10:00", monday: { course: "CS101", branch: "CSE", semester: "1", section: "A" }, tuesday: null, wednesday: { course: "CS101", branch: "CSE", semester: "1", section: "A" }, thursday: null, friday: { course: "CS101", branch: "CSE", semester: "1", section: "A" } },
    { time: "10:00 - 11:00", monday: null, tuesday: { course: "EC202", branch: "ECE", semester: "2", section: "B" }, wednesday: null, thursday: { course: "EC202", branch: "ECE", semester: "2", section: "B" }, friday: null },
    { time: "11:00 - 12:00", monday: { course: "CS101", branch: "CSE", semester: "1", section: "A" }, tuesday: null, wednesday: { course: "CS101", branch: "CSE", semester: "1", section: "A" }, thursday: null, friday: { course: "CS101", branch: "CSE", semester: "1", section: "A" } },
  ];

  const header = `
    <thead>
      <tr>
        <th>Time</th>
        <th>Monday</th>
        <th>Tuesday</th>
        <th>Wednesday</th>
        <th>Thursday</th>
        <th>Friday</th>
      </tr>
    </thead>
  `;

  const rows = timeTableData.map(t => `
    <tr>
      <td>${t.time}</td>
      <td>${t.monday ? t.monday.course : ''}</td>
      <td>${t.tuesday ? t.tuesday.course : ''}</td>
      <td>${t.wednesday ? t.wednesday.course : ''}</td>
      <td>${t.thursday ? t.thursday.course : ''}</td>
      <td>${t.friday ? t.friday.course : ''}</td>
    </tr>
  `).join('');

  timeTable.innerHTML = `${header}<tbody>${rows}</tbody>`;
  findUpcomingClass(timeTableData);
}

// Store timetable data for auto-session
let facultyTimetable = null;

async function loadTimeTableFromDB() {
  try {
    const response = await apiGet("/api/faculty/timetable");
    facultyTimetable = response;

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const timeSlots = new Set();
    let hasAnySlot = false;

    if (response.schedule) {
      for (const day of days) {
        if (response.schedule[day]) {
          response.schedule[day].forEach(slot => {
            if (slot && slot.startTime) {
              hasAnySlot = true;
              timeSlots.add(`${slot.startTime} - ${slot.endTime}`);
            }
          });
        }
      }
    }

    if (!hasAnySlot) {
      timeTable.innerHTML = `<p style="color: #aaa; padding: 20px;">No timetable assigned yet. Please contact admin.</p>`;
      upcomingClassDetails.innerHTML = `<p>No timetable data.</p>`;
      return;
    }

    // Sort time slots
    const sortedTimeSlots = Array.from(timeSlots).sort((a, b) => {
      const timeA = a.split(' - ')[0];
      const timeB = b.split(' - ')[0];
      return timeA.localeCompare(timeB);
    });

    // Build table
    const header = `
      <thead>
        <tr>
          <th>Time</th>
          <th>Monday</th>
          <th>Tuesday</th>
          <th>Wednesday</th>
          <th>Thursday</th>
          <th>Friday</th>
          <th>Saturday</th>
        </tr>
      </thead>
    `;

    const rows = sortedTimeSlots.map(timeSlot => {
      const [startTime, endTime] = timeSlot.split(' - ');
      let row = `<tr><td>${timeSlot}</td>`;

      for (const day of days) {
        const slot = response.schedule[day]?.find(s => s.startTime === startTime);
        if (slot) {
          row += `<td class="timetable-cell">
            <div class="course-code">${slot.courseCode}</div>
            <div class="course-name">${slot.courseName}</div>
            <div class="room">${slot.room || ''}</div>
            <div class="section">${slot.department?.substring(0, 3) || ''} ${slot.section || ''}</div>
          </td>`;
        } else {
          row += `<td></td>`;
        }
      }

      row += `</tr>`;
      return row;
    }).join('');

    timeTable.innerHTML = `${header}<tbody>${rows}</tbody>`;

    // Find upcoming class
    findUpcomingClassFromDB(response.schedule);

  } catch (error) {
    console.error("Error loading timetable", error);
    timeTable.innerHTML = `<p style="color: #aaa; padding: 20px;">No timetable assigned yet. Please contact admin.</p>`;
    upcomingClassDetails.innerHTML = `<p>No timetable data.</p>`;
  }
}

function findUpcomingClassFromDB(schedule) {
  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[now.getDay()];

  if (today === 'sunday' || !schedule[today]) {
    upcomingClassDetails.innerHTML = `<p>No classes today.</p>`;
    return;
  }

  const currentTime = now.getHours() * 60 + now.getMinutes();
  let currentClass = null;
  let nextClass = null;

  // Sort by start time
  const todayClasses = [...schedule[today]].sort((a, b) => a.startTime.localeCompare(b.startTime));

  for (const slot of todayClasses) {
    const [startH, startM] = slot.startTime.split(':').map(Number);
    const [endH, endM] = slot.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Currently ongoing
    if (currentTime >= startMinutes && currentTime < endMinutes) {
      currentClass = slot;
    }
    // Next class
    else if (currentTime < startMinutes && !nextClass) {
      nextClass = slot;
    }
  }

  if (currentClass) {
    upcomingClassDetails.innerHTML = `
      <div class="current-class-indicator">🔴 ONGOING CLASS</div>
      <div class="upcoming-class-grid">
        <p><strong>Course:</strong></p><p>${currentClass.courseCode} - ${currentClass.courseName}</p>
        <p><strong>Time:</strong></p><p>${currentClass.startTime} - ${currentClass.endTime}</p>
        <p><strong>Room:</strong></p><p>${currentClass.room || 'TBA'}</p>
        <p><strong>Class:</strong></p><p>${currentClass.department || ''} Sem ${currentClass.semester || ''} ${currentClass.section || ''}</p>
      </div>
      <button id="autoStartSessionBtn" class="btn btn-primary" style="margin-top: 15px;">
        Mark Attendance
      </button>
    `;

    // Attach event listener for auto session
    document.getElementById("autoStartSessionBtn")?.addEventListener("click", () => {
      startAutoSession(currentClass.classId);
    });
  } else if (nextClass) {
    upcomingClassDetails.innerHTML = `
      <div class="next-class-indicator">⏳ NEXT CLASS</div>
      <div class="upcoming-class-grid">
        <p><strong>Course:</strong></p><p>${nextClass.courseCode} - ${nextClass.courseName}</p>
        <p><strong>Time:</strong></p><p>${nextClass.startTime} - ${nextClass.endTime}</p>
        <p><strong>Room:</strong></p><p>${nextClass.room || 'TBA'}</p>
        <p><strong>Class:</strong></p><p>${nextClass.department || ''} Sem ${nextClass.semester || ''} ${nextClass.section || ''}</p>
      </div>
    `;
  } else {
    upcomingClassDetails.innerHTML = `<p>No more classes today.</p>`;
  }
}

async function startAutoSession(slotData) {
  try {
    // slotData can be either a classId string or an object with schedule info
    const payload = typeof slotData === 'string'
      ? { classId: slotData }
      : {
        courseCode: slotData.courseCode,
        courseName: slotData.courseName,
        department: slotData.department,
        semester: slotData.semester,
        section: slotData.section
      };

    const response = await apiPost("/api/faculty/auto-session", payload);

    // Build class name for display
    const className = typeof slotData === 'string' ? response.className :
      `${slotData.courseCode} - ${slotData.courseName} | ${slotData.department} Sem ${slotData.semester} ${slotData.section}`;

    // Store session data in sessionStorage for the session page
    sessionStorage.setItem('currentSessionId', response.id);
    sessionStorage.setItem('currentQrToken', response.qrToken);
    sessionStorage.setItem('currentClassName', className || 'Active Session');
    sessionStorage.setItem('currentExpiresAt', response.expiresAt);

    // Redirect to separate session page
    window.location.href = `session.html?sessionId=${response.id}&qrToken=${response.qrToken}&className=${encodeURIComponent(className || 'Active Session')}&expiresAt=${response.expiresAt}`;

  } catch (error) {
    console.error("Error starting auto session", error);
    alert("Failed to start session: " + (error.message || "Unknown error"));
  }
}

async function viewActiveSession(classId) {
  try {
    // Start auto session will show existing session if there is one
    const response = await apiPost("/api/faculty/auto-session", { classId });

    const className = response.className || 'Active Session';

    // Store session data in sessionStorage for the session page
    sessionStorage.setItem('currentSessionId', response.id);
    sessionStorage.setItem('currentQrToken', response.qrToken);
    sessionStorage.setItem('currentClassName', className);
    sessionStorage.setItem('currentExpiresAt', response.expiresAt);

    // Redirect to separate session page
    window.location.href = `session.html?sessionId=${response.id}&qrToken=${response.qrToken}&className=${encodeURIComponent(className)}&expiresAt=${response.expiresAt}`;

  } catch (error) {
    console.error("Error viewing session", error);
    alert("Failed to view session: " + (error.message || "Unknown error"));
  }
}

function loadDashboard() {
  // MOCK DATA for dashboard
  const cards = [
    { title: "Total Classes", value: 4, icon: "📚" },
    { title: "Today's Classes", value: 2, icon: "📅" },
    { title: "Active Sessions", value: 1, icon: "🔄" },
    { title: "Total Students", value: 120, icon: "👥" },
  ];

  dashboardCards.innerHTML = cards.map(c => `
    <div class="card">
        <div class="card-body">
            <div class="card-icon">${c.icon}</div>
            <div class="card-text">
                <h3>${c.title}</h3>
                <p style="font-size: 2rem; font-weight: bold; color: #6a11cb;">${c.value}</p>
            </div>
        </div>
    </div>
  `).join('');
}

async function loadDashboardFromDB() {
  try {
    // Get classes
    const classes = await apiGet("/api/faculty/classes");
    console.log("Faculty classes:", classes);

    // Get faculty's schedule from admin-assigned FacultySchedule
    const scheduleData = await apiGet("/api/faculty/my-schedule");
    console.log("Faculty schedule data:", scheduleData);

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const now = new Date();
    const today = days[now.getDay()];
    const currentTime = now.getHours() * 60 + now.getMinutes();

    // Use todayClasses from the new endpoint
    let todayClasses = scheduleData.todayClasses || [];

    const cards = [
      { title: "My Classes", value: classes.length, icon: "📚" },
      { title: "Today's Classes", value: todayClasses.length, icon: "📅" },
      { title: "Day", value: today.charAt(0).toUpperCase() + today.slice(1), icon: "📆" },
      { title: "Time", value: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), icon: "🕐" },
    ];

    dashboardCards.innerHTML = cards.map(c => `
      <div class="card">
          <div class="card-body">
              <div class="card-icon">${c.icon}</div>
              <div class="card-text">
                  <h3>${c.title}</h3>
                  <p style="font-size: 1.5rem; font-weight: bold; color: #6a11cb;">${c.value}</p>
              </div>
          </div>
      </div>
    `).join('');

    // Show today's classes list with one-click session start
    const todaysClassesList = document.getElementById("todaysClassesList");

    if (today === 'sunday') {
      todaysClassesList.innerHTML = `<div class="card"><p style="color: #666; text-align: center;">No classes on Sunday</p></div>`;
      return;
    }

    if (todayClasses.length === 0) {
      todaysClassesList.innerHTML = `<div class="card"><p style="color: #666; text-align: center;">No classes scheduled for today. Contact admin to set up your schedule.</p></div>`;
      return;
    }

    // Build class cards for today
    todaysClassesList.innerHTML = todayClasses.map((cls, index) => {
      const [startH, startM] = cls.startTime.split(':').map(Number);
      const [endH, endM] = cls.endTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      let status = 'upcoming';
      let statusBadge = '⏳ Upcoming';
      let statusClass = 'status-upcoming';

      if (cls.sessionActive) {
        status = 'ongoing';
        statusBadge = '🔴 SESSION ACTIVE';
        statusClass = 'status-ongoing';
      } else if (cls.hasSession) {
        status = 'completed';
        statusBadge = '✅ Session Done';
        statusClass = 'status-completed';
      } else if (currentTime >= startMinutes && currentTime < endMinutes) {
        status = 'ongoing';
        statusBadge = '🔴 ONGOING';
        statusClass = 'status-ongoing';
      } else if (currentTime >= endMinutes) {
        status = 'completed';
        statusBadge = '✅ Completed';
        statusClass = 'status-completed';
      }

      return `
        <div class="card today-class-card ${statusClass}" data-class-id="${cls.classId}" data-index="${index}">
          <div class="class-status-badge ${statusClass}">${statusBadge}</div>
          <div class="class-info">
            <h4 style="color: #6a11cb; margin: 0;">${cls.courseCode}</h4>
            <p style="color: #333; margin: 5px 0;">${cls.courseName}</p>
            <p style="color: #666; font-size: 0.9rem; margin: 5px 0;">
              <strong>Time:</strong> ${cls.startTime} - ${cls.endTime}
            </p>
            <p style="color: #666; font-size: 0.9rem; margin: 0;">
              <strong>Room:</strong> ${cls.room || 'TBA'} | 
              <strong>Class:</strong> ${cls.department?.substring(0, 3) || ''} Sem ${cls.semester || ''} ${cls.section || ''}
            </p>
          </div>
          ${!cls.hasSession ? `
            <button class="start-session-btn btn-primary" 
              data-course-code="${cls.courseCode || ''}"
              data-course-name="${cls.courseName || ''}"
              data-department="${cls.department || ''}"
              data-semester="${cls.semester || ''}"
              data-section="${cls.section || ''}"
              style="margin-top: 15px; width: 100%;">
              ${status === 'ongoing' ? '▶ Start Session Now' : '📝 Start Session'}
            </button>
          ` : cls.sessionActive ? `
            <button class="view-session-btn btn-secondary" data-session-id="${cls.sessionId}" data-class-id="${cls.classId}" style="margin-top: 15px; width: 100%;">
              👁 View Active Session
            </button>
          ` : ''}
        </div>
      `;
    }).join('');

    // Attach event listeners
    document.querySelectorAll('.start-session-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const slotData = {
          courseCode: btn.dataset.courseCode,
          courseName: btn.dataset.courseName,
          department: btn.dataset.department,
          semester: btn.dataset.semester,
          section: btn.dataset.section
        };
        if (slotData.courseCode && slotData.department) {
          await startAutoSession(slotData);
        } else {
          alert("Class data not found. Please contact admin to set up timetable properly.");
        }
      });
    });

    document.querySelectorAll('.view-session-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const classId = btn.dataset.classId;
        if (classId) {
          // Trigger viewing the active session
          await viewActiveSession(classId);
        }
      });
    });

    // Display all assigned classes grouped by day
    displayMyAssignedClasses(scheduleData.schedule || {});

  } catch (error) {
    console.error("Error loading dashboard", error);
    loadDashboard(); // Fall back to mock
  }
}

// Display all assigned classes grouped by day
function displayMyAssignedClasses(schedule) {
  const myClassesList = document.getElementById("myClassesList");

  if (!schedule || Object.keys(schedule).length === 0) {
    myClassesList.innerHTML = `<p style="text-align: center; color: #666;">No classes assigned yet. Contact admin to set up your schedule.</p>`;
    return;
  }

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayNames = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday' };

  let html = '<table style="width: 100%; border-collapse: collapse;">';
  html += '<thead><tr style="background: #f8f9fa;"><th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Day</th><th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Time</th><th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Course</th><th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Section</th><th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Action</th></tr></thead>';
  html += '<tbody>';

  let hasClasses = false;

  for (const day of days) {
    const slots = schedule[day] || [];
    if (slots.length > 0) {
      hasClasses = true;
      slots.forEach((slot, idx) => {
        html += `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: ${idx === 0 ? 'bold' : 'normal'}; color: ${idx === 0 ? '#6a11cb' : '#999'};">${idx === 0 ? dayNames[day] : ''}</td>
            <td style="padding: 10px;">${slot.startTime} - ${slot.endTime}</td>
            <td style="padding: 10px;"><strong>${slot.courseCode}</strong> - ${slot.courseName}</td>
            <td style="padding: 10px;">${slot.department?.substring(0, 3) || ''} Sem ${slot.semester || ''} ${slot.section || ''}</td>
            <td style="padding: 10px; text-align: center;">
              <button class="quick-session-btn" 
                data-course-code="${slot.courseCode || ''}"
                data-course-name="${slot.courseName || ''}"
                data-department="${slot.department || ''}"
                data-semester="${slot.semester || ''}"
                data-section="${slot.section || ''}"
                style="background: #6a11cb; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                📝 Start
              </button>
            </td>
          </tr>
        `;
      });
    }
  }

  html += '</tbody></table>';

  if (!hasClasses) {
    myClassesList.innerHTML = `<p style="text-align: center; color: #666;">No classes assigned yet. Contact admin to set up your schedule.</p>`;
  } else {
    myClassesList.innerHTML = html;

    // Attach event listeners for quick session buttons
    document.querySelectorAll('.quick-session-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const slotData = {
          courseCode: btn.dataset.courseCode,
          courseName: btn.dataset.courseName,
          department: btn.dataset.department,
          semester: btn.dataset.semester,
          section: btn.dataset.section
        };
        if (slotData.courseCode && slotData.department) {
          await startAutoSession(slotData);
        } else {
          alert("Class data not found.");
        }
      });
    });
  }
}

function findUpcomingClass(timeTableData) {
  const now = new Date();
  const dayOfWeek = now.toLocaleString('en-us', { weekday: 'long' }).toLowerCase();
  const currentTime = now.getHours() * 60 + now.getMinutes(); // in minutes

  let upcomingClass = null;

  for (const slot of timeTableData) {
    const timeParts = slot.time.split(' - ')[0].split(':');
    const classTime = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
    const classInfo = slot[dayOfWeek];

    if (classInfo && classTime > currentTime) {
      upcomingClass = { ...classInfo, time: slot.time };
      break;
    }
  }

  if (upcomingClass) {
    upcomingClassDetails.innerHTML = `
            <div class="upcoming-class-grid">
                <p><strong>Course:</strong></p><p>${upcomingClass.course}</p>
                <p><strong>Time:</strong></p><p>${upcomingClass.time}</p>
                <p><strong>Branch:</strong></p><p>${upcomingClass.branch}</p>
                <p><strong>Semester:</strong></p><p>${upcomingClass.semester}</p>
                <p><strong>Section:</strong></p><p>${upcomingClass.section}</p>
            </div>
        `;
  } else {
    upcomingClassDetails.innerHTML = `<p>No more classes today.</p>`;
  }
}

function loadProfile() {
  // Use actual logged-in user data
  const currentUser = getUser();
  const profile = {
    name: currentUser?.name || "Faculty Name",
    email: currentUser?.email || "faculty@example.com",
    facultyId: currentUser?._id || "FAC123",
    department: currentUser?.department || "Not specified",
  };

  profileDetails.innerHTML = `
        <div class="upcoming-class-grid">
            <p><strong>Name:</strong></p><p>${profile.name}</p>
            <p><strong>Email:</strong></p><p>${profile.email}</p>
            <p><strong>Faculty ID:</strong></p><p>${profile.facultyId}</p>
            <p><strong>Department:</strong></p><p>${profile.department}</p>
        </div>
    `;
}

// Set default date for report form
document.getElementById('reportDate').valueAsDate = new Date();

// Handle report form submission
const reportForm = document.getElementById("reportForm");
const attendanceReportTable = document.getElementById("attendanceReportTable");
const exportCsvBtn = document.getElementById("exportCsvBtn");

reportForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const branch = document.getElementById("reportBranch").value;
  const semester = document.getElementById("reportSemester").value;
  const section = document.getElementById("reportSection").value;
  const subjectCode = document.getElementById("reportSubject").value;
  const date = document.getElementById("reportDate").value;

  if (!branch || !semester || !section || !subjectCode || !date) {
    alert("Please fill all fields");
    return;
  }

  await loadAttendanceReport(branch, semester, section, subjectCode, date);
});

exportCsvBtn?.addEventListener("click", () => {
  exportToCSV();
});

async function loadAttendanceReport(branch, semester, section, subjectCode, date) {
  try {
    // Show loading state
    attendanceReportTable.innerHTML = `<p style="color: #888;">Loading attendance report...</p>`;

    // Find the classId for the selected branch, semester, section, subjectCode
    let classes = facultyClassesCache;
    if (classes.length === 0) {
      classes = await apiGet("/api/faculty/classes");
      facultyClassesCache = classes;
    }

    console.log("Looking for class:", { branch, semester, section, subjectCode });
    console.log("Available classes:", classes);

    const cls = classes.find(c =>
      c.department === branch &&
      c.semester?.toString() === semester?.toString() &&
      c.section === section &&
      c.courseCode === subjectCode
    );

    console.log("Found class:", cls);

    if (!cls || !cls._id) {
      attendanceReportTable.innerHTML = `<p style='color: #ff6b6b;'>Class not found for selected criteria. Please check your selection.</p>`;
      return;
    }
    // Call backend API to get attendance report for the class and date
    const response = await apiGet(`/api/faculty/class/${cls._id}/attendance-report?date=${encodeURIComponent(date)}`);
    console.log("Attendance report response:", response);
    displayAttendanceReport(response, branch, semester, section, subjectCode, date);
  } catch (error) {
    console.error("Error loading attendance report", error);
    attendanceReportTable.innerHTML = `<p style="color: #ff6b6b;">Error loading report: ${error.message}</p>`;
  }
}

function displayAttendanceReport(reportData, branch, semester, section, subjectCode, date) {
  if (!reportData || reportData.length === 0) {
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    attendanceReportTable.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #888;">
        <p style="font-size: 2rem; margin-bottom: 15px;">📭</p>
        <p style="font-size: 1.1rem; color: #fff; margin-bottom: 10px;">No attendance session found</p>
        <p style="font-size: 0.9rem;">No attendance was taken for <strong>${subjectCode}</strong> on <strong>${formattedDate}</strong>.</p>
        <p style="font-size: 0.85rem; margin-top: 10px;">Try selecting a different date when you conducted a class.</p>
      </div>
    `;
    return;
  }

  const cls = facultyClassesCache.find(c => c.courseCode === subjectCode && c.department === branch);
  const subjectName = cls ? cls.courseName : subjectCode;

  // Calculate summary
  const presentCount = reportData.filter(s => s.status === 'present').length;
  const absentCount = reportData.filter(s => s.status === 'absent').length;

  let html = `
    <h4 style="color: #fff; margin-bottom: 20px;">Attendance Report</h4>
    <div style="margin-bottom: 20px; color: #fff;">
      <p><strong>Branch:</strong> ${branch}</p>
      <p><strong>Semester:</strong> ${semester} | <strong>Section:</strong> ${section}</p>
      <p><strong>Subject:</strong> ${subjectCode} - ${subjectName}</p>
      <p><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</p>
      <p style="margin-top: 10px;"><strong>Summary:</strong> 
        <span style="color: #28a745;">✅ Present: ${presentCount}</span> | 
        <span style="color: #dc3545;">❌ Absent: ${absentCount}</span> | 
        Total: ${reportData.length}
      </p>
    </div>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background: rgba(255, 255, 255, 0.1);">
          <th style="border: 1px solid rgba(255, 255, 255, 0.2); padding: 12px; text-align: left; color: #fff;">Roll No</th>
          <th style="border: 1px solid rgba(255, 255, 255, 0.2); padding: 12px; text-align: left; color: #fff;">Name</th>
          <th style="border: 1px solid rgba(255, 255, 255, 0.2); padding: 12px; text-align: left; color: #fff;">Status</th>
        </tr>
      </thead>
      <tbody>
  `;

  reportData.forEach(student => {
    const statusColor = student.status === 'present' ? '#28a745' : '#dc3545';
    const statusIcon = student.status === 'present' ? '✅' : '❌';
    html += `
      <tr>
        <td style="border: 1px solid rgba(255, 255, 255, 0.2); padding: 12px; color: #fff;">${student.rollNo || student.studentId}</td>
        <td style="border: 1px solid rgba(255, 255, 255, 0.2); padding: 12px; color: #fff;">${student.name}</td>
        <td style="border: 1px solid rgba(255, 255, 255, 0.2); padding: 12px; color: ${statusColor};">${statusIcon} ${student.status.charAt(0).toUpperCase() + student.status.slice(1)}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  attendanceReportTable.innerHTML = html;
}

function exportToCSV() {
  // Mock CSV export functionality
  const csvContent = "Student ID,Name,Status\nSTU001,John Doe,Present\nSTU002,Jane Smith,Present\nSTU003,Bob Johnson,Absent\nSTU004,Alice Brown,Present";
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'attendance_report.csv';
  a.click();
  window.URL.revokeObjectURL(url);
}

// ===================== MANUAL ATTENDANCE FUNCTIONS (ADD-ONLY) =====================
// These functions support the secondary manual attendance feature
// QR scanning remains the primary method; manual is fallback only

/**
 * Load students for the current session into the manual attendance dropdown
 * Called when a session becomes active
 */
async function loadManualAttendanceStudents() {
  if (!currentSessionId || !manualStudentSelect) return;

  try {
    const data = await apiGet(`/api/faculty/session/${currentSessionId}/students`);

    manualStudentSelect.innerHTML = '<option value="">-- Select Student --</option>';

    // Filter to show only students NOT yet marked
    const unmarkedStudents = data.students.filter(s => !s.alreadyMarked);

    if (unmarkedStudents.length === 0) {
      manualStudentSelect.innerHTML = '<option value="">All students already marked ✓</option>';
    } else {
      unmarkedStudents.forEach(s => {
        manualStudentSelect.innerHTML += `<option value="${s.id}">${s.rollNo || 'N/A'} - ${s.name}</option>`;
      });
    }

    // Update count display
    if (manualAttendanceMsg) {
      manualAttendanceMsg.textContent = `${data.markedCount}/${data.totalStudents} students marked`;
      manualAttendanceMsg.style.color = '#888';
    }
  } catch (err) {
    console.error("Error loading students for manual attendance:", err);
    manualStudentSelect.innerHTML = '<option value="">Error loading students</option>';
  }
}

// ===================== ANALYTICS FUNCTIONS =====================

// Load faculty analytics data
async function loadFacultyAnalytics() {
  try {
    // Populate course dropdown with faculty's courses
    if (facultyClassesCache.length === 0) {
      await fetchFacultyClasses();
    }

    const courseSelect = document.getElementById("anCourseName");
    courseSelect.innerHTML = '<option value="">All</option>';

    // Get unique courses
    const uniqueCourses = [];
    const seen = new Set();

    facultyClassesCache.forEach(c => {
      if (!seen.has(c.courseCode)) {
        seen.add(c.courseCode);
        uniqueCourses.push({ code: c.courseCode, name: c.courseName });
      }
    });

    uniqueCourses.forEach(course => {
      const option = document.createElement("option");
      option.value = course.code;
      option.textContent = `${course.code} - ${course.name}`;
      courseSelect.appendChild(option);
    });

    // Set up form submission
    const analyticsForm = document.getElementById("analyticsForm");
    analyticsForm?.addEventListener("submit", handleAnalyticsSubmit);

    // Set up export button
    const exportBtn = document.getElementById("exportCsvBtn");
    exportBtn?.addEventListener("click", exportAnalyticsCsv);

  } catch (error) {
    console.error("Error loading faculty analytics:", error);
  }
}

// Handle analytics form submission
async function handleAnalyticsSubmit(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const filters = {
    semester: formData.get("anSemester") || undefined,
    section: formData.get("anSection") || undefined,
    courseName: formData.get("anCourseName") || undefined
  };

  try {
    const response = await apiGet("/api/analytics/report", filters);

    // Display chart
    displayFacultyChart(response.data);

    // Display table
    displayAnalyticsTable(response.data);

  } catch (error) {
    console.error("Error loading analytics:", error);
    alert("Failed to load analytics data: " + (error.message || "Unknown error"));
  }
}

// Display faculty analytics chart
function displayFacultyChart(data) {
  const ctx = document.getElementById("facultyChart").getContext("2d");

  // Prepare data for chart
  const labels = data.map(item => `${item.courseCode} - ${item.section}`);
  const presentData = data.map(item => item.present || 0);
  const absentData = data.map(item => item.absent || 0);

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Present",
          data: presentData,
          backgroundColor: "#28a745",
          borderColor: "#28a745",
          borderWidth: 1
        },
        {
          label: "Absent",
          data: absentData,
          backgroundColor: "#dc3545",
          borderColor: "#dc3545",
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Number of Students"
          }
        }
      },
      plugins: {
        title: {
          display: true,
          text: "Class Attendance Overview"
        }
      }
    }
  });
}

// Display analytics table
function displayAnalyticsTable(data) {
  const table = document.getElementById("analyticsTable");

  if (!data || data.length === 0) {
    table.innerHTML = "<tr><td colspan='6' style='text-align: center;'>No data available</td></tr>";
    return;
  }

  const headers = `
    <thead>
      <tr>
        <th>Course</th>
        <th>Section</th>
        <th>Semester</th>
        <th>Present</th>
        <th>Absent</th>
        <th>Attendance %</th>
      </tr>
    </thead>
  `;

  const rows = data.map(item => {
    const total = (item.present || 0) + (item.absent || 0);
    const percentage = total > 0 ? ((item.present || 0) / total * 100).toFixed(1) : 0;

    return `
      <tr>
        <td>${item.courseCode} - ${item.courseName}</td>
        <td>${item.section}</td>
        <td>${item.semester}</td>
        <td>${item.present || 0}</td>
        <td>${item.absent || 0}</td>
        <td>${percentage}%</td>
      </tr>
    `;
  }).join("");

  table.innerHTML = `${headers}<tbody>${rows}</tbody>`;
}

// Export analytics to CSV
async function exportAnalyticsCsv() {
  try {
    const response = await apiGet("/api/analytics/export");

    // Create and download CSV file
    const blob = new Blob([response], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "faculty_analytics.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

  } catch (error) {
    console.error("Error exporting CSV:", error);
    alert("Failed to export CSV: " + (error.message || "Unknown error"));
  }
}

/**
 * Mark a student present manually
 * Only allowed when session is active
 */
async function markStudentManually() {
  if (!currentSessionId) {
    showManualMsg("No active session", "error");
    return;
  }

  const studentId = manualStudentSelect?.value;
  if (!studentId) {
    showManualMsg("Please select a student", "error");
    return;
  }

  try {
    manualMarkBtn.disabled = true;
    manualMarkBtn.textContent = "Marking...";

    const result = await apiPost("/api/faculty/manual-attendance", {
      sessionId: currentSessionId,
      studentId,
      reason: "QR scan not possible"
    });

    showManualMsg(`✅ ${result.studentName} marked present`, "success");

    // Refresh the dropdown to remove the marked student
    await loadManualAttendanceStudents();

    // Update live counters
    livePresent++;
    updateLiveCounters();

  } catch (err) {
    const errorMsg = err.message || "Failed to mark attendance";
    showManualMsg(`❌ ${errorMsg}`, "error");
  } finally {
    manualMarkBtn.disabled = false;
    manualMarkBtn.textContent = "✅ Mark Present";
  }
}

/**
 * Display message in manual attendance panel
 */
function showManualMsg(msg, type) {
  if (!manualAttendanceMsg) return;
  manualAttendanceMsg.textContent = msg;
  manualAttendanceMsg.style.color = type === "success" ? "#28a745" :
    type === "error" ? "#dc3545" : "#888";
}

/**
 * Update live attendance counters
 */
function updateLiveCounters() {
  const presentEl = document.getElementById("livePresentCount");
  const absentEl = document.getElementById("liveAbsentCount");
  const totalEl = document.getElementById("totalStudentCount");

  if (presentEl) presentEl.textContent = livePresent;
  if (absentEl) absentEl.textContent = Math.max(0, totalStudents - livePresent);
  if (totalEl) totalEl.textContent = totalStudents;
}

// Setup manual mark button click handler
manualMarkBtn?.addEventListener("click", markStudentManually);


// Initial load (guarded to avoid runtime errors if some DOM sections are not present)
try {
  if (document.getElementById('dashboardView')) switchView("dashboard");
} catch (err) {
  console.error('Error during initial view switch', err);
}

if (document.getElementById('timeTable')) {
  loadTimeTableFromDB();
}

if (document.getElementById('dashboardCards')) {
  loadDashboardFromDB();
}

if (document.getElementById('profileDetails')) {
  loadProfile();
}
