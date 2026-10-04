import { apiGet, apiPost, ensureAuth, logout } from "./api.js?v=20260526";

const user = ensureAuth(["student"]);

const getCurrentLocation = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error("Location is not supported by this browser."));
    return;
  }

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      if (coords.accuracy > 20) {
        reject(new Error("Location accuracy is too low. Move near a window and try again."));
        return;
      }
      resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy });
    },
    (error) => reject(new Error(error.code === 1 ? "Allow location access to mark attendance." : "Could not determine your location. Try again.")),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
});

const logoutBtn = document.getElementById("logoutBtn");
logoutBtn?.addEventListener("click", logout);

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection in student.js:", event.reason);
  event.preventDefault();
});

window.addEventListener("error", (event) => {
  console.error("Unhandled error in student.js:", event.error || event.message || event);
});

const subjectCards = document.getElementById("subjectCards");
const dashboardSummaryCards = document.getElementById("dashboardSummaryCards");
const upcomingClassDetails = document.getElementById("upcomingClassDetails");
const todaySchedule = document.getElementById("todaySchedule");
const profileDetails = document.getElementById("profileDetails");
const qrTokenInput = document.getElementById("qrTokenInput");
const markBtn = document.getElementById("markBtn");
const markMsg = document.getElementById("markMsg");
const timeTable = document.getElementById("timeTable");
const activeSessionsList = document.getElementById("activeSessionsList");
const activeSessionBanner = document.getElementById("activeSessionBanner");
const activeSessionBannerText = document.getElementById("activeSessionBannerText");
const stepFaceLabel = document.getElementById("stepFaceLabel");
const stepQrLabel = document.getElementById("stepQrLabel");
const stepQrStatus = document.getElementById("stepQrStatus");
const dualVerifyStatus = document.getElementById("dualVerifyStatus");
const qrStepCard = document.getElementById("qrStepCard");

/** Dual verification state (face AND QR required) */
const dualVerifyState = {
  faceVerified: false,
  faceVerificationToken: null,
  faceExpiresAt: null,
};

function resetDualVerification() {
  dualVerifyState.faceVerified = false;
  dualVerifyState.faceVerificationToken = null;
  dualVerifyState.faceExpiresAt = null;
  sessionStorage.removeItem("faceVerificationToken");
  sessionStorage.removeItem("faceExpiresAt");
  updateDualVerifyUI();
  setQrStepEnabled(false);
  if (typeof window.stopQrScan === "function") window.stopQrScan();
}

function setQrStepEnabled(enabled) {
  if (qrStepCard) {
    qrStepCard.style.opacity = enabled ? "1" : "0.45";
    qrStepCard.style.pointerEvents = enabled ? "auto" : "none";
  }
  if (stepQrStatus) stepQrStatus.style.opacity = enabled ? "1" : "0.5";
  if (qrTokenInput) {
    qrTokenInput.disabled = !enabled;
    qrTokenInput.placeholder = enabled
      ? "Paste faculty QR token..."
      : "Available after face verification...";
  }
  if (markBtn) markBtn.disabled = !enabled;
}

function updateDualVerifyUI() {
  if (stepFaceLabel) {
    if (dualVerifyState.faceVerified) {
      stepFaceLabel.textContent = "✅ Verified";
      stepFaceLabel.style.color = "#28a745";
    } else {
      stepFaceLabel.textContent = "⏳ Pending";
      stepFaceLabel.style.color = "#ffc107";
    }
  }
  if (stepQrLabel) {
    if (dualVerifyState.faceVerified) {
      stepQrLabel.textContent = "📱 Scan QR";
      stepQrLabel.style.color = "#17a2b8";
    } else {
      stepQrLabel.textContent = "🔒 Locked";
      stepQrLabel.style.color = "#666";
    }
  }
  if (dualVerifyStatus) {
    if (dualVerifyState.faceVerified && dualVerifyState.faceExpiresAt) {
      const exp = new Date(dualVerifyState.faceExpiresAt);
      dualVerifyStatus.textContent = `Face verified until ${exp.toLocaleTimeString()}. Complete QR scan before it expires.`;
    } else {
      dualVerifyStatus.textContent = "Verify your face to unlock QR scanning.";
    }
  }
}

function enableQrStepAfterFace(token, expiresAt) {
  dualVerifyState.faceVerified = true;
  dualVerifyState.faceVerificationToken = token;
  dualVerifyState.faceExpiresAt = expiresAt;
  sessionStorage.setItem("faceVerificationToken", token);
  if (expiresAt) sessionStorage.setItem("faceExpiresAt", expiresAt);
  updateDualVerifyUI();
  setQrStepEnabled(true);
  if (typeof window.startQrScan === "function") window.startQrScan();
}

const studentDateInput = document.getElementById("studentDate");
if (studentDateInput) {
  studentDateInput.valueAsDate = new Date();
}

// Update welcome banner with user info
function updateWelcomeBanner() {
  const storedUser = JSON.parse(sessionStorage.getItem("user") || "{}");
  const nameEl = document.getElementById("studentNameDisplay");
  const infoEl = document.getElementById("studentInfoDisplay");
  const dateEl = document.getElementById("currentDateStudent");
  const dayEl = document.getElementById("currentDayStudent");

  if (nameEl && storedUser.name) {
    nameEl.textContent = storedUser.name;
  }
  if (infoEl) {
    const dept = storedUser.department || '';
    const sem = storedUser.semester || '';
    const sec = storedUser.section || '';
    infoEl.textContent = `${dept} | Semester ${sem} | Section ${sec}`;
  }

  const now = new Date();
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  if (dayEl) {
    dayEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long' });
  }
}

// View switching
const dashboardBtn = document.getElementById("dashboardBtn");
const markAttendanceBtn = document.getElementById("markAttendanceBtn");
const viewAttendanceBtn = document.getElementById("viewAttendanceBtn");
const analyticsBtn = document.getElementById("analyticsBtn");
const timeTableBtn = document.getElementById("timeTableBtn");
const profileBtn = document.getElementById("profileBtn");
const dashboardView = document.getElementById("dashboardView");
const markAttendanceView = document.getElementById("markAttendanceView");
const viewAttendanceView = document.getElementById("viewAttendanceView");
const analyticsView = document.getElementById("analyticsView");
const timeTableView = document.getElementById("timeTableView");
const profileView = document.getElementById("profileView");

dashboardBtn?.addEventListener("click", () => switchView("dashboard"));
markAttendanceBtn?.addEventListener("click", () => switchView("mark"));
viewAttendanceBtn?.addEventListener("click", () => switchView("view"));
analyticsBtn?.addEventListener("click", () => switchView("analytics"));
timeTableBtn?.addEventListener("click", () => switchView("timeTable"));
profileBtn?.addEventListener("click", () => switchView("profile"));

// Make switchView accessible globally for button onclick
window.switchView = switchView;

function showToast(message, type = "info") {
  console.error(`[${type}] ${message}`);
  const banner = document.getElementById("activeSessionBanner");
  const bannerText = document.getElementById("activeSessionBannerText");
  if (!banner || !bannerText) return;
  const colors = { error: "#dc3545", warning: "#ffc107", info: "#17a2b8" };
  banner.style.display = "block";
  banner.style.background = colors[type] || colors.info;
  bannerText.textContent = message;
  setTimeout(() => {
    if (bannerText.textContent === message) {
      checkActiveSessionsForBanner().catch(() => {
        banner.style.display = "none";
      });
    }
  }, 4000);
}

function switchView(view) {
  if (!dashboardView || !markAttendanceView || !viewAttendanceView || !analyticsView || !timeTableView || !profileView) {
    console.error("switchView: missing view container elements");
    return;
  }
  dashboardView.style.display = "none";
  markAttendanceView.style.display = "none";
  viewAttendanceView.style.display = "none";
  analyticsView.style.display = "none";
  timeTableView.style.display = "none";
  profileView.style.display = "none";
  dashboardBtn?.classList.remove("active");
  markAttendanceBtn?.classList.remove("active");
  viewAttendanceBtn?.classList.remove("active");
  analyticsBtn?.classList.remove("active");
  timeTableBtn?.classList.remove("active");
  profileBtn?.classList.remove("active");

  if (view === "dashboard") {
    dashboardView.style.display = "block";
    dashboardBtn?.classList.add("active");
  } else if (view === "mark") {
    markAttendanceView.style.display = "block";
    markAttendanceBtn?.classList.add("active");
    resetDualVerification();
    loadActiveSessions().catch((err) => console.error("loadActiveSessions failed", err));
  } else if (view === "view") {
    viewAttendanceView.style.display = "block";
    viewAttendanceBtn?.classList.add("active");
  } else if (view === "analytics") {
    analyticsView.style.display = "block";
    analyticsBtn?.classList.add("active");
    loadStudentAnalytics().catch((err) => console.error("loadStudentAnalytics failed", err));
  } else if (view === "timeTable") {
    timeTableView.style.display = "block";
    timeTableBtn?.classList.add("active");
  } else if (view === "profile") {
    profileView.style.display = "block";
    profileBtn?.classList.add("active");
  }
}

// Load today's attendance verification
async function loadTodayAttendance() {
  const todayAttendanceList = document.getElementById("todayAttendanceList");
  if (!todayAttendanceList) return;

  try {
    const data = await apiGet("/api/student/today-attendance");
    if (!data) return;

    if (!data.records || data.records.length === 0) {
      todayAttendanceList.innerHTML = `
        <div style="text-align: center; padding: 30px; color: #888;">
          <span style="font-size: 2.5rem;">📭</span>
          <p style="margin-top: 10px;">No attendance sessions today yet.</p>
          <small>Your attendance records will appear here once your faculty starts a session.</small>
        </div>
      `;
      return;
    }

    const recordsHTML = data.records.map(record => {
      const statusColor = record.status === 'present' ? '#28a745' : '#dc3545';
      const statusIcon = record.status === 'present' ? '✅' : '❌';
      const statusText = record.status === 'present' ? 'PRESENT' : 'ABSENT';

      const markedTime = record.markedAt ? new Date(record.markedAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) : null;

      const sessionTime = new Date(record.sessionStartedAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid #333; ${record.status === 'present' ? 'background: rgba(40, 167, 69, 0.1);' : ''}">
          <div style="flex: 1;">
            <div style="font-weight: bold; color: #fff; font-size: 1rem;">${record.courseCode}</div>
            <div style="color: #aaa; font-size: 0.85rem;">${record.courseName}</div>
            <div style="color: #666; font-size: 0.75rem; margin-top: 5px;">Session started at ${sessionTime}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 1.5rem;">${statusIcon}</div>
            <div style="color: ${statusColor}; font-weight: bold; font-size: 0.9rem;">${statusText}</div>
            ${markedTime ? `
              <div style="color: #888; font-size: 0.75rem; margin-top: 3px;">
                Marked at ${markedTime}
              </div>
              <div style="color: #666; font-size: 0.7rem; font-family: monospace; margin-top: 2px;">
                ID: ${record.verificationCode}
              </div>
            ` : record.isActive ? `
              <button onclick="switchView('mark')" style="padding: 5px 10px; font-size: 0.75rem; background: #ffc107; color: #000; margin-top: 5px; cursor: pointer;">
                Mark Now →
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Summary header
    const summaryHTML = `
      <div style="display: flex; justify-content: space-around; padding: 15px; background: #1a1a1a; border-bottom: 2px solid #333;">
        <div style="text-align: center;">
          <div style="font-size: 1.5rem; font-weight: bold; color: #28a745;">${data.presentCount}</div>
          <div style="color: #888; font-size: 0.75rem;">Present</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 1.5rem; font-weight: bold; color: #dc3545;">${data.absentCount}</div>
          <div style="color: #888; font-size: 0.75rem;">Absent</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 1.5rem; font-weight: bold; color: #17a2b8;">${data.totalSessions}</div>
          <div style="color: #888; font-size: 0.75rem;">Total</div>
        </div>
      </div>
    `;

    todayAttendanceList.innerHTML = summaryHTML + recordsHTML;

  } catch (error) {
    console.error("Today attendance load error", error);
    todayAttendanceList.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #dc3545;">
        <p>Could not load today's attendance. Please try again.</p>
      </div>
    `;
  }
}

// Make loadTodayAttendance globally accessible
window.loadTodayAttendance = loadTodayAttendance;

async function loadDashboard() {
  if (!dashboardSummaryCards || !subjectCards) return;
  try {
    const data = await apiGet("/api/student/dashboard");
    if (!data) return;
    const totalClasses = data.totalClasses ?? data.subjects?.length ?? 0;
    const remainingClasses = data.remainingClasses ?? Math.max(0, totalClasses - (data.attendedClasses ?? 0));
    const summaryCardsHTML = `
        <div class="card"><h3>Overall Attendance</h3><p style="font-size: 2rem; font-weight: bold;">${data.overallPercentage ?? 0}%</p></div>
        <div class="card"><h3>Total Classes</h3><p style="font-size: 2rem; font-weight: bold;">${totalClasses}</p></div>
        <div class="card"><h3>Remaining Classes</h3><p style="font-size: 2rem; font-weight: bold;">${remainingClasses}</p></div>
    `;
    dashboardSummaryCards.innerHTML = summaryCardsHTML;

    const subjects = Array.isArray(data.subjects) ? data.subjects : [];
    const subjectCardsHTML = subjects.map(subject => `
        <div class="card">
            <h3>${subject.class?.courseCode ?? "N/A"}</h3>
            <p>${subject.class?.courseName ?? ""}</p>
            <p style="font-size: 2rem; font-weight: bold;">${subject.percentage ?? 0}%</p>
        </div>
    `).join('');
    subjectCards.innerHTML = subjectCardsHTML || "<p>No subject attendance data yet.</p>";
  } catch (error) {
    console.error("Dashboard load error", error);
    dashboardSummaryCards.innerHTML = "<p>Could not load dashboard stats.</p>";
    subjectCards.innerHTML = "<p>Could not load subject details.</p>";
  }
}

// Load active attendance sessions for the student
async function loadActiveSessions() {
  if (!activeSessionsList) return;
  try {
    const sessions = await apiGet("/api/student/active-sessions");
    if (!sessions) return;

    if (!Array.isArray(sessions) || sessions.length === 0) {
      activeSessionsList.innerHTML = `
        <p style="color: #888; text-align: center;">
          <span style="font-size: 2rem;">📭</span><br>
          No active attendance sessions at the moment.<br>
          <small>Wait for your faculty to start an attendance session.</small>
        </p>
      `;
      return;
    }

    const sessionCardsHTML = sessions.map(session => {
      const expiresAt = new Date(session.expiresAt);
      const now = new Date();
      const remainingMs = expiresAt - now;
      const remainingMins = Math.max(0, Math.floor(remainingMs / 60000));
      const remainingSecs = Math.max(0, Math.floor((remainingMs % 60000) / 1000));

      if (session.alreadyMarked) {
        return `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 15px; background: #1a3d1a; border-left: 4px solid #28a745; border-radius: 8px; margin-bottom: 10px;">
            <div>
              <div style="font-weight: bold; color: #fff; font-size: 1.1rem;">${session.courseCode}</div>
              <div style="color: #aaa; font-size: 0.9rem;">${session.courseName || ''}</div>
            </div>
            <div style="text-align: right;">
              <span style="color: #28a745; font-weight: bold;">✅ Attendance Marked</span>
            </div>
          </div>
        `;
      }

      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 15px; background: #2d2d2d; border-left: 4px solid #ffc107; border-radius: 8px; margin-bottom: 10px;">
          <div>
            <div style="font-weight: bold; color: #fff; font-size: 1.1rem;">${session.courseCode}</div>
            <div style="color: #aaa; font-size: 0.9rem;">${session.courseName || ''}</div>
            <div style="color: #ffc107; font-size: 0.8rem; margin-top: 5px;">
              ⏰ Expires in: <span class="session-timer" data-expires="${session.expiresAt}">${remainingMins}m ${remainingSecs}s</span>
            </div>
          </div>
          <div style="text-align: right;">
            <button onclick="switchView('mark')" 
                    style="background: #28a745; padding: 10px 20px; font-size: 1rem; cursor: pointer;">
              🔐 Start Dual Verification
            </button>
          </div>
        </div>
      `;
    }).join('');

    activeSessionsList.innerHTML = sessionCardsHTML;

    // Start countdown timers
    startSessionTimers();

  } catch (error) {
    console.error("Active sessions load error", error);
    activeSessionsList.innerHTML = `<p style="color: red;">Could not load active sessions. Please try again.</p>`;
  }
}

// Timer update for session expiry countdown
let sessionTimerInterval = null;

function startSessionTimers() {
  // Clear existing interval
  if (sessionTimerInterval) {
    clearInterval(sessionTimerInterval);
  }

  sessionTimerInterval = setInterval(() => {
    const timers = document.querySelectorAll('.session-timer');
    let anyActive = false;

    timers.forEach(timer => {
      const expiresAt = new Date(timer.dataset.expires);
      const now = new Date();
      const remainingMs = expiresAt - now;

      if (remainingMs <= 0) {
        timer.textContent = 'Expired';
        timer.style.color = '#dc3545';
        // Reload sessions to refresh the list
        loadActiveSessions();
      } else {
        anyActive = true;
        const remainingMins = Math.floor(remainingMs / 60000);
        const remainingSecs = Math.floor((remainingMs % 60000) / 1000);
        timer.textContent = `${remainingMins}m ${remainingSecs}s`;
      }
    });

    if (!anyActive && sessionTimerInterval) {
      clearInterval(sessionTimerInterval);
      sessionTimerInterval = null;
    }
  }, 1000);
}

// Check for active sessions and show banner on dashboard
async function checkActiveSessionsForBanner() {
  if (!activeSessionBanner || !activeSessionBannerText) return;
  try {
    const sessions = await apiGet("/api/student/active-sessions");
    if (!sessions || !Array.isArray(sessions)) {
      activeSessionBanner.style.display = "none";
      return;
    }

    const unmarkedSessions = sessions.filter((s) => !s.alreadyMarked);

    if (unmarkedSessions.length > 0) {
      activeSessionBanner.style.display = 'block';
      if (unmarkedSessions.length === 1) {
        activeSessionBannerText.textContent = `${unmarkedSessions[0].courseCode} - ${unmarkedSessions[0].courseName || ''} is taking attendance now!`;
      } else {
        activeSessionBannerText.textContent = `${unmarkedSessions.length} classes are taking attendance now!`;
      }
    } else {
      activeSessionBanner.style.display = 'none';
    }
  } catch (error) {
    console.error("Error checking active sessions", error);
    activeSessionBanner.style.display = 'none';
  }
}

markBtn?.addEventListener("click", () => {
  const token = qrTokenInput?.value?.trim() ?? "";
  console.debug("student.markBtn clicked", { qrTokenInput: token });
  handleMarkAttendance(token);
});

async function handleMarkAttendance(token) {
  if (!token) return;
  if (!markMsg) return;

  if (!dualVerifyState.faceVerified || !dualVerifyState.faceVerificationToken) {
    markMsg.style.color = "red";
    markMsg.textContent = "Complete face verification (Step 1) before scanning QR.";
    return;
  }

  if (dualVerifyState.faceExpiresAt && new Date(dualVerifyState.faceExpiresAt) < new Date()) {
    markMsg.style.color = "red";
    markMsg.textContent = "Face verification expired. Please verify your face again.";
    resetDualVerification();
    return;
  }

  markMsg.textContent = "Verifying face + QR...";
  markMsg.style.color = "orange";
  if (markBtn) markBtn.disabled = true;

  try {
    const location = await getCurrentLocation();
    await apiPost("/api/student/mark-attendance", {
      qrToken: token,
      faceVerificationToken: dualVerifyState.faceVerificationToken,
      ...location,
    });
    markMsg.style.color = "green";
    markMsg.textContent = "Attendance marked (face + QR verified)!";
    if (qrTokenInput) qrTokenInput.value = token;
    resetDualVerification();
    await loadDashboard();
    await loadTodayAttendance();
    await loadActiveSessions();
    await checkActiveSessionsForBanner();
  } catch (err) {
    console.error("student.handleMarkAttendance error", err);
    markMsg.style.color = "red";
    markMsg.textContent = err.message || "Failed to mark attendance.";
    if (err.message?.includes("Face verification")) {
      resetDualVerification();
    }
  } finally {
    if (markBtn && dualVerifyState.faceVerified) markBtn.disabled = false;
  }
}

// QR scanner using html5-qrcode
if (window.Html5Qrcode) {
  const qrRegionId = "qrReader";
  const qrFormats = window.Html5QrcodeSupportedFormats?.QR_CODE != null
    ? [window.Html5QrcodeSupportedFormats.QR_CODE]
    : undefined;
  const qrScanner = new Html5Qrcode(qrRegionId, {
    formatsToSupport: qrFormats,
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: true
    },
    verbose: false
  });

  const config = {
    fps: 15,  // Higher FPS for faster detection
    qrbox: { width: 250, height: 250 },
    aspectRatio: 1.0,
    disableFlip: false,  // Allow scanning flipped QR codes
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: true
    }
  };

  let isScanning = false;

  const startScan = () => {
    if (!dualVerifyState.faceVerified) {
      if (markMsg) {
        markMsg.textContent = "Verify your face first to unlock the QR scanner.";
        markMsg.style.color = "orange";
      }
      return;
    }
    if (isScanning) return;
    isScanning = true;

    // Try to get available cameras first
    Html5Qrcode.getCameras().then(cameras => {
      if (cameras && cameras.length > 0) {
        // Prefer back camera if available
        const backCamera = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear'));
        const cameraId = backCamera ? backCamera.id : cameras[0].id;

        qrScanner.start(
          cameraId,
          config,
          (decodedText) => {
            if (isScanning) {
              isScanning = false; // Prevent multiple submissions from one scan
              // Play a success sound/vibration feedback
              if (navigator.vibrate) navigator.vibrate(200);
              qrScanner.stop().then(() => {
                handleMarkAttendance(decodedText);
              }).catch(err => console.error("Failed to stop scanner", err));
            }
          },
          (errorMessage) => { /* ignore scan errors */ }
        ).catch((err) => {
          isScanning = false;
          console.warn(`QR scanner error: ${err}`);
          markMsg.textContent = "Could not start QR Scanner. Please allow camera access.";
          markMsg.style.color = 'red';
        });
      } else {
        // Fallback to facingMode
        qrScanner.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            if (isScanning) {
              isScanning = false;
              if (navigator.vibrate) navigator.vibrate(200);
              qrScanner.stop().then(() => {
                handleMarkAttendance(decodedText);
              }).catch(err => console.error("Failed to stop scanner", err));
            }
          },
          (errorMessage) => { /* ignore scan errors */ }
        ).catch((err) => {
          isScanning = false;
          console.warn(`QR scanner error: ${err}`);
          markMsg.textContent = "Could not start QR Scanner. Please allow camera access.";
          markMsg.style.color = 'red';
        });
      }
    }).catch(err => {
      // Fallback if getCameras fails
      qrScanner.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          if (isScanning) {
            isScanning = false;
            if (navigator.vibrate) navigator.vibrate(200);
            qrScanner.stop().then(() => {
              handleMarkAttendance(decodedText);
            }).catch(err => console.error("Failed to stop scanner", err));
          }
        },
        (errorMessage) => { /* ignore scan errors */ }
      ).catch((err) => {
        isScanning = false;
        console.warn(`QR scanner error: ${err}`);
        markMsg.textContent = "Could not start QR Scanner. Please allow camera access.";
        markMsg.style.color = 'red';
      });
    });
  };

  const stopScan = () => {
    if (isScanning && qrScanner.isScanning) {
      qrScanner.stop().then(() => (isScanning = false)).catch((err) => {
        console.error("Failed to stop scanner", err);
        isScanning = false;
      });
    } else {
      isScanning = false;
    }
  };

  window.startQrScan = startScan;
  window.stopQrScan = stopScan;

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === "style") {
        if (markAttendanceView.style.display === "block") {
          if (markMsg) markMsg.textContent = "";
          if (qrTokenInput) qrTokenInput.value = "";
          resetDualVerification();
        } else {
          stopScan();
        }
      }
    });
  });

  if (markAttendanceView) observer.observe(markAttendanceView, { attributes: true });
}

async function loadTimeTable() {
  if (!timeTable) return;
  try {
    const timeTableData = await apiGet("/api/student/timetable");
    if (!timeTableData) return;

    if (!Array.isArray(timeTableData) || timeTableData.length === 0) {
      timeTable.innerHTML = `
        <thead>
          <tr><th colspan="7" style="text-align: center; color: #888;">No timetable available for your class</th></tr>
        </thead>
      `;
      upcomingClassDetails.innerHTML = `<p style="color: #888;">No classes scheduled yet. Please contact your admin.</p>`;
      return;
    }

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

    const rows = timeTableData.map(t => `
      <tr>
        <td style="font-weight: bold; white-space: nowrap;">${t.time}</td>
        <td>${t.monday ? `<div style="font-weight:bold;">${t.monday.courseCode || ''}</div><small style="color:#888;">${t.monday.courseName || ''}</small>${t.monday.room ? `<br><small style="color:#666;">📍 ${t.monday.room}</small>` : ''}` : '-'}</td>
        <td>${t.tuesday ? `<div style="font-weight:bold;">${t.tuesday.courseCode || ''}</div><small style="color:#888;">${t.tuesday.courseName || ''}</small>${t.tuesday.room ? `<br><small style="color:#666;">📍 ${t.tuesday.room}</small>` : ''}` : '-'}</td>
        <td>${t.wednesday ? `<div style="font-weight:bold;">${t.wednesday.courseCode || ''}</div><small style="color:#888;">${t.wednesday.courseName || ''}</small>${t.wednesday.room ? `<br><small style="color:#666;">📍 ${t.wednesday.room}</small>` : ''}` : '-'}</td>
        <td>${t.thursday ? `<div style="font-weight:bold;">${t.thursday.courseCode || ''}</div><small style="color:#888;">${t.thursday.courseName || ''}</small>${t.thursday.room ? `<br><small style="color:#666;">📍 ${t.thursday.room}</small>` : ''}` : '-'}</td>
        <td>${t.friday ? `<div style="font-weight:bold;">${t.friday.courseCode || ''}</div><small style="color:#888;">${t.friday.courseName || ''}</small>${t.friday.room ? `<br><small style="color:#666;">📍 ${t.friday.room}</small>` : ''}` : '-'}</td>
        <td>${t.saturday ? `<div style="font-weight:bold;">${t.saturday.courseCode || ''}</div><small style="color:#888;">${t.saturday.courseName || ''}</small>${t.saturday.room ? `<br><small style="color:#666;">📍 ${t.saturday.room}</small>` : ''}` : '-'}</td>
      </tr>
    `).join('');

    timeTable.innerHTML = `${header}<tbody>${rows}</tbody>`;
    findUpcomingClass(timeTableData);
  } catch (error) {
    console.error("Timetable load error", error);
    timeTable.innerHTML = "<tr><td colspan='7'>Could not load timetable.</td></tr>";
  }
}

function findUpcomingClass(timeTableData) {
  const now = new Date();
  const dayOfWeek = now.toLocaleString('en-us', { weekday: 'long' }).toLowerCase();
  const currentTime = now.getHours() * 60 + now.getMinutes(); // in minutes

  let currentClass = null;
  let upcomingClass = null;

  for (const slot of timeTableData) {
    const classInfo = slot[dayOfWeek];
    if (!classInfo) continue;

    const timeParts = slot.time.split(' - ');
    const startParts = timeParts[0].split(':');
    const endParts = timeParts[1].split(':');
    const startTime = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    const endTime = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

    // Check if this is current class
    if (currentTime >= startTime && currentTime < endTime) {
      currentClass = {
        course: classInfo.courseCode || classInfo.course,
        courseName: classInfo.courseName,
        time: slot.time,
        room: classInfo.room
      };
    }
    // Check for upcoming class (within next hour)
    else if (startTime > currentTime && startTime - currentTime <= 60 && !upcomingClass) {
      upcomingClass = {
        course: classInfo.courseCode || classInfo.course,
        courseName: classInfo.courseName,
        time: slot.time,
        room: classInfo.room,
        startsIn: startTime - currentTime
      };
    }
  }

  if (currentClass) {
    upcomingClassDetails.innerHTML = `
            <div style="border-left: 4px solid #28a745; padding-left: 15px;">
                <p style="color: #28a745; font-weight: bold; margin-bottom: 5px;">🟢 ONGOING CLASS</p>
                <p><strong>Course:</strong> ${currentClass.course} ${currentClass.courseName ? `- ${currentClass.courseName}` : ''}</p>
                <p><strong>Time:</strong> ${currentClass.time}</p>
                ${currentClass.room ? `<p><strong>Room:</strong> ${currentClass.room}</p>` : ''}
                <button onclick="switchView('mark')" style="margin-top: 10px; background: #28a745;">📱 Mark Attendance Now</button>
            </div>
        `;
  } else if (upcomingClass) {
    upcomingClassDetails.innerHTML = `
            <div style="border-left: 4px solid #ffc107; padding-left: 15px;">
                <p style="color: #ffc107; font-weight: bold; margin-bottom: 5px;">⏰ NEXT CLASS (in ${upcomingClass.startsIn} min)</p>
                <p><strong>Course:</strong> ${upcomingClass.course} ${upcomingClass.courseName ? `- ${upcomingClass.courseName}` : ''}</p>
                <p><strong>Time:</strong> ${upcomingClass.time}</p>
                ${upcomingClass.room ? `<p><strong>Room:</strong> ${upcomingClass.room}</p>` : ''}
            </div>
        `;
  } else {
    upcomingClassDetails.innerHTML = `<p style="color: #888;">📚 No more classes today.</p>`;
  }

  // Show today's full schedule
  showTodaySchedule(timeTableData, dayOfWeek, currentTime);
}

// Step 1: Face verification only (unlocks QR step)
const facialAttendanceBtn = document.getElementById("facialAttendanceBtn");
const facialReader = document.getElementById("facialReader");
const facialMsg = document.getElementById("facialMsg");

facialAttendanceBtn?.addEventListener("click", () => {
  verifyFaceForAttendance().catch((err) => console.error("verifyFaceForAttendance failed", err));
});

async function verifyFaceForAttendance() {
  if (!facialMsg || !facialReader) return;

  facialMsg.textContent = "Opening camera...";
  facialMsg.style.color = "orange";
  facialAttendanceBtn.disabled = true;

  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    facialReader.style.display = "block";
    facialReader.srcObject = stream;
    await facialReader.play();

    facialMsg.textContent = "Hold still — capturing in 3 seconds...";

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const canvas = document.createElement("canvas");
    canvas.width = facialReader.videoWidth;
    canvas.height = facialReader.videoHeight;
    canvas.getContext("2d").drawImage(facialReader, 0, 0);
    const imageData = canvas.toDataURL("image/jpeg").split(",")[1];

    stream.getTracks().forEach((t) => t.stop());
    stream = null;
    facialReader.style.display = "none";

    facialMsg.textContent = "Verifying face...";

    const result = await apiPost("/api/ml/verify-face", { image: imageData });
    if (!result?.verified || !result.faceVerificationToken) {
      throw new Error(result?.message || "Face verification failed");
    }

    enableQrStepAfterFace(result.faceVerificationToken, result.expiresAt);
    facialMsg.textContent = result.message || "Face verified! Scan the faculty QR code.";
    facialMsg.style.color = "green";
  } catch (error) {
    console.error("Face verification error", error);
    facialMsg.textContent = error.message || "Face verification failed. Try again.";
    facialMsg.style.color = "red";
    resetDualVerification();
  } finally {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    facialReader.style.display = "none";
    facialAttendanceBtn.disabled = false;
  }
}

function showTodaySchedule(timeTableData, dayOfWeek, currentTime) {
  const todayClasses = [];

  for (const slot of timeTableData) {
    const classInfo = slot[dayOfWeek];
    if (classInfo) {
      const timeParts = slot.time.split(' - ');
      const startParts = timeParts[0].split(':');
      const endParts = timeParts[1].split(':');
      const startTime = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
      const endTime = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

      let status = 'upcoming';
      if (currentTime >= endTime) status = 'completed';
      else if (currentTime >= startTime && currentTime < endTime) status = 'ongoing';

      todayClasses.push({
        time: slot.time,
        course: classInfo.courseCode || classInfo.course,
        courseName: classInfo.courseName,
        room: classInfo.room,
        status
      });
    }
  }

  if (todayClasses.length === 0) {
    todaySchedule.innerHTML = `<p style="color: #888; text-align: center;">No classes scheduled for today.</p>`;
    return;
  }

  todaySchedule.innerHTML = todayClasses.map(cls => {
    const statusColors = {
      completed: { bg: '#2d2d2d', border: '#555', icon: '✅' },
      ongoing: { bg: '#1a3d1a', border: '#28a745', icon: '🟢' },
      upcoming: { bg: '#2d2d2d', border: '#3d3d3d', icon: '⏳' }
    };
    const style = statusColors[cls.status];

    return `
            <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: ${style.bg}; border-left: 3px solid ${style.border}; border-radius: 6px; margin-bottom: 8px;">
                <span style="font-size: 1.2rem;">${style.icon}</span>
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: #fff;">${cls.course}</div>
                    ${cls.courseName ? `<small style="color: #888;">${cls.courseName}</small>` : ''}
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.85rem; color: #aaa;">${cls.time}</div>
                    ${cls.room ? `<small style="color: #666;">📍 ${cls.room}</small>` : ''}
                </div>
            </div>
        `;
  }).join('');
}

async function registerFace() {
  const registerMsg = document.getElementById("registerMsg");
  const registerBtn = document.getElementById("registerFaceBtn");
  if (!registerMsg) return;

  // Helper to set message with styling
  const setMessage = (text, isError = false) => {
    registerMsg.textContent = text;
    registerMsg.style.color = isError ? "#ff6b6b" : "#28a745";
  };

  const setStatus = (text) => {
    registerMsg.textContent = text;
    registerMsg.style.color = "#ffc107";
  };

  // Disable button during registration
  if (registerBtn) {
    registerBtn.disabled = true;
    registerBtn.textContent = "🔄 Processing...";
  }

  try {
    setStatus("📷 Accessing camera...");
    console.log("[registerFace] Requesting camera access");

    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    console.log("[registerFace] Camera stream obtained");

    const video = document.createElement("video");
    video.setAttribute("playsinline", "true");
    video.muted = true;
    video.autoplay = true;
    video.srcObject = stream;

    // Render a visible preview overlay (previously video was never added to the DOM)
    const previewOverlay = document.createElement("div");
    previewOverlay.id = "faceRegisterPreviewOverlay";
    previewOverlay.style.position = "fixed";
    previewOverlay.style.inset = "0";
    previewOverlay.style.background = "rgba(0,0,0,0.8)";
    previewOverlay.style.zIndex = "99999";
    previewOverlay.style.display = "flex";
    previewOverlay.style.alignItems = "center";
    previewOverlay.style.justifyContent = "center";
    previewOverlay.style.flexDirection = "column";
    previewOverlay.style.gap = "12px";

    const previewTitle = document.createElement("div");
    previewTitle.textContent = "Align your face in the frame…";
    previewTitle.style.color = "#fff";
    previewTitle.style.fontSize = "16px";
    previewTitle.style.fontWeight = "600";

    video.style.width = "min(520px, 92vw)";
    video.style.maxHeight = "70vh";
    video.style.borderRadius = "12px";
    video.style.border = "2px solid rgba(255,255,255,0.25)";
    video.style.boxShadow = "0 12px 40px rgba(0,0,0,0.6)";
    video.style.background = "#000";

    const previewHint = document.createElement("div");
    previewHint.textContent = "Capturing in 3 seconds…";
    previewHint.style.color = "rgba(255,255,255,0.85)";
    previewHint.style.fontSize = "13px";

    previewOverlay.appendChild(previewTitle);
    previewOverlay.appendChild(video);
    previewOverlay.appendChild(previewHint);
    document.body.appendChild(previewOverlay);
    await video.play();

    setTimeout(async () => {
      try {
        setStatus("📸 Capturing face image...");

        // Validate video dimensions
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          console.error("[registerFace] Invalid video dimensions", {
            width: video.videoWidth,
            height: video.videoHeight,
          });
          setMessage("Failed to capture video. Please try again.", true);
          stream.getTracks().forEach((track) => track.stop());
          previewOverlay.remove();
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        console.log("[registerFace] Canvas created", {
          width: canvas.width,
          height: canvas.height,
        });

        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0);

        // Convert to JPEG and extract base64
        const imageData = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
        console.log("[registerFace] Image captured and converted to base64", {
          imageSize: imageData.length,
        });

        // Stop camera immediately
        stream.getTracks().forEach((track) => track.stop());
        console.log("[registerFace] Camera stream stopped");
        previewOverlay.remove();

        setStatus("👤 Uploading to face recognition service...");

        // Get profile to get student ID
        let profile;
        try {
          profile = await apiGet("/api/student/profile");
        } catch (err) {
          console.error("[registerFace] Failed to get profile", err);
          setMessage("Failed to load your profile. Please try again.", true);
          return;
        }

        if (!profile) {
          console.error("[registerFace] Profile is empty");
          setMessage("Profile data is missing.", true);
          return;
        }

        const storedUser = JSON.parse(sessionStorage.getItem("user") || "{}");
        const studentIdForMl = storedUser.rollNo || profile.studentId;
        console.log("[registerFace] Sending face registration request", {
          studentId: studentIdForMl,
          imageSize: imageData.length,
        });

        // Send to backend
        const response = await apiPost("/api/ml/register-face", {
          studentId: studentIdForMl,
          image: imageData,
        });

        console.log("[registerFace] Face registration successful", response);
        setMessage("✅ Face registered successfully! You can now mark attendance.", false);

        // Re-enable button
        if (registerBtn) {
          registerBtn.disabled = false;
          registerBtn.textContent = "📷 Register Face";
        }
      } catch (error) {
        console.error("[registerFace] Capture/upload error", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          fullError: error,
        });

        try { previewOverlay.remove(); } catch (e) { /* ignore */ }

        // Provide specific error messages based on error type
        let errorMsg = "Error registering face.";

        if (error.response?.data?.code) {
          const code = error.response.data.code;
          const msg = error.response.data.message;

          if (code === "FACE_SERVICE_NOT_RUNNING") {
            errorMsg =
              "🔧 Face recognition service is offline. Contact administrator.";
          } else if (code === "FACE_SERVICE_UNREACHABLE") {
            errorMsg =
              "🌐 Cannot reach face service. Check network and try again.";
          } else if (code === "FACE_DETECTION_FAILED") {
            errorMsg = `Face not detected: ${msg}. Ensure face is clearly visible.`;
          } else if (code === "FACE_SERVICE_TIMEOUT") {
            errorMsg = "⏱️ Face service took too long. Try again.";
          } else if (code === "FACE_SERVICE_UNAVAILABLE") {
            errorMsg =
              "🔧 Face service not configured. Contact administrator.";
          } else {
            errorMsg = msg || "Face registration failed.";
          }
        } else if (error.message?.includes("network")) {
          errorMsg = "🌐 Network error. Check your connection.";
        }

        setMessage(errorMsg, true);

        // Re-enable button
        if (registerBtn) {
          registerBtn.disabled = false;
          registerBtn.textContent = "📷 Register Face";
        }
      }
    }, 3000);
  } catch (error) {
    console.error("[registerFace] Camera access error", {
      message: error.message,
      name: error.name,
      code: error.code,
      fullError: error,
    });

    let errorMsg = "Error accessing camera.";
    if (error.name === "NotAllowedError") {
      errorMsg =
        "📷 Camera permission denied. Enable camera in your browser settings.";
    } else if (error.name === "NotFoundError") {
      errorMsg = "📷 No camera found. Check your device.";
    } else if (error.name === "NotReadableError") {
      errorMsg = "📷 Camera is in use by another application.";
    }

    setMessage(errorMsg, true);
    try { document.getElementById("faceRegisterPreviewOverlay")?.remove(); } catch (e) { /* ignore */ }

    // Re-enable button
    if (registerBtn) {
      registerBtn.disabled = false;
      registerBtn.textContent = "📷 Register Face";
    }
  }
}

async function loadProfile() {
  if (!profileDetails) return;
  try {
    const profile = await apiGet("/api/student/profile");
    if (!profile) return;
    profileDetails.innerHTML = `
        <div class="upcoming-class-grid">
            <p><strong>Name:</strong></p><p>${profile.name ?? ""}</p>
            <p><strong>Email:</strong></p><p>${profile.email ?? ""}</p>
            <p><strong>Student ID:</strong></p><p>${profile.studentId ?? ""}</p>
            <p><strong>Branch:</strong></p><p>${profile.branch ?? ""}</p>
            <p><strong>Semester:</strong></p><p>${profile.semester ?? ""}</p>
            <p><strong>Section:</strong></p><p>${profile.section ?? ""}</p>
        </div>
        <div style="margin-top: 20px;">
            <h4 style="color: #fff;">Face Registration for ML Attendance</h4>
            <button id="registerFaceBtn" style="background: #17a2b8; padding: 10px 20px; cursor: pointer;">📷 Register Face</button>
            <p id="registerMsg" style="margin-top: 10px;"></p>
        </div>
    `;

    document.getElementById("registerFaceBtn")?.addEventListener("click", () => {
      registerFace().catch((err) => console.error("registerFace failed", err));
    });
  } catch (error) {
    console.error("Profile load error", error);
    profileDetails.innerHTML = "<p>Could not load profile.</p>";
  }
}

// View Attendance
const viewAttendanceForm = document.getElementById("viewAttendanceForm");
const attendanceStatusTable = document.getElementById("attendanceStatusTable");

viewAttendanceForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!attendanceStatusTable) return;
  attendanceStatusTable.style.display = "table";
  const date = document.getElementById("studentDate")?.value;
  if (!date) return;

  try {
    const attendance = await apiGet(`/api/student/attendance?date=${date}`);
    if (!attendance) return;
    const header = `
            <thead>
                <tr>
                    <th>Subject</th>
                    <th>Status</th>
                </tr>
            </thead>
        `;

    const rows = (Array.isArray(attendance) ? attendance : []).map(a => `
            <tr>
                <td>${a.subject}</td>
                <td style="color: ${a.status === 'Present' ? 'green' : 'red'};">${a.status}</td>
            </tr>
        `).join('');

    attendanceStatusTable.innerHTML = `${header}<tbody>${rows}</tbody>`;
  } catch (error) {
    console.error("Attendance status load error", error);
    attendanceStatusTable.innerHTML = "<tr><td colspan='2'>Could not load attendance.</td></tr>";
  }
});

// Initial load
async function init() {
  try {
    switchView("dashboard");
    updateWelcomeBanner();
    await Promise.allSettled([
      loadDashboard(),
      loadTodayAttendance(),
      loadTimeTable(),
      loadProfile(),
      checkActiveSessionsForBanner()
    ]);

    setInterval(() => {
      checkActiveSessionsForBanner().catch((err) => console.error("Banner poll failed", err));
      loadTodayAttendance().catch((err) => console.error("Today attendance poll failed", err));
    }, 30000);
  } catch (error) {
    console.error("Student dashboard init failed", error);
  }
}


// Student Analytics Functions
async function loadStudentAnalytics() {
  try {
    const data = await apiGet("/api/analytics/student");
    if (!data) return;

    const overallEl = document.getElementById("overallAttendance");
    const presentEl = document.getElementById("totalPresent");
    const absentEl = document.getElementById("totalAbsent");
    const sessionsEl = document.getElementById("totalSessions");
    if (overallEl) overallEl.textContent = `${data.attendancePercentage ?? 0}%`;
    if (presentEl) presentEl.textContent = data.presentCount ?? 0;
    if (absentEl) absentEl.textContent = data.absentCount ?? 0;
    if (sessionsEl) sessionsEl.textContent = data.totalSessions ?? 0;

    loadStudentChart(data.monthlyData || []);
    displayStudentAnalyticsTable(data.records || []);
  } catch (error) {
    console.error("Error loading student analytics:", error);
    showToast("Failed to load analytics data", "error");
  }
}

function loadStudentChart(monthlyData) {
  const canvas = document.getElementById("studentChart");
  if (!canvas || typeof Chart === "undefined") {
    console.error("Chart.js not loaded or canvas missing");
    return;
  }
  const ctx = canvas.getContext("2d");

  const labels = monthlyData.map((item) => item.month);
  const presentData = monthlyData.map((item) => item.present);
  const absentData = monthlyData.map((item) => item.absent);

  if (window.studentChart) {
    window.studentChart.destroy();
  }

  window.studentChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Present",
          data: presentData,
          borderColor: "#28a745",
          backgroundColor: "rgba(40, 167, 69, 0.1)",
          tension: 0.4,
          fill: true
        },
        {
          label: "Absent",
          data: absentData,
          borderColor: "#dc3545",
          backgroundColor: "rgba(220, 53, 69, 0.1)",
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Monthly Attendance Trend"
        },
        legend: {
          display: true,
          position: "top"
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Number of Sessions"
          }
        },
        x: {
          title: {
            display: true,
            text: "Month"
          }
        }
      }
    }
  });
}

async function handleStudentAnalyticsSubmit(event) {
  event.preventDefault();

  const startDate = document.getElementById("anFromDate")?.value;
  const endDate = document.getElementById("anToDate")?.value;

  if (!startDate || !endDate) {
    showToast("Please select both start and end dates", "warning");
    return;
  }

  try {
    const data = await apiGet(`/api/analytics/student?startDate=${startDate}&endDate=${endDate}`);
    if (!data) return;
    displayStudentAnalyticsTable(data.records || []);
  } catch (error) {
    console.error("Error filtering analytics:", error);
    showToast("Failed to filter analytics data", "error");
  }
}

function displayStudentAnalyticsTable(records) {
  const table = document.getElementById("analyticsTable");
  if (!table) return;

  if (!records || records.length === 0) {
    table.innerHTML = `
      <thead>
        <tr>
          <th>Date</th>
          <th>Subject</th>
          <th>Status</th>
          <th>Session Time</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td colspan="4" style="text-align: center; padding: 30px; color: #888;">
            No attendance records found for the selected period.
          </td>
        </tr>
      </tbody>
    `;
    return;
  }

  const rows = records.map((record) => `
    <tr>
      <td>${record.date ? new Date(record.date).toLocaleDateString() : "N/A"}</td>
      <td>${record.subject || "N/A"}</td>
      <td style="color: ${record.status === "present" ? "#28a745" : "#dc3545"};">
        ${record.status === "present" ? "Present" : "Absent"}
      </td>
      <td>${record.sessionTime || "N/A"}</td>
    </tr>
  `).join("");

  table.innerHTML = `
    <thead>
      <tr>
        <th>Date</th>
        <th>Subject</th>
        <th>Status</th>
        <th>Session Time</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  `;
}

document.getElementById("analyticsForm")?.addEventListener("submit", (e) => {
  handleStudentAnalyticsSubmit(e).catch((err) => console.error("analytics form submit failed", err));
});

if (user && document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    init().catch((err) => console.error("init failed", err));
  });
} else if (user) {
  init().catch((err) => console.error("init failed", err));
}
