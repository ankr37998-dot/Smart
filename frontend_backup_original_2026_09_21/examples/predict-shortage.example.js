/**
 * Example: call attendance shortage prediction via Node.js proxy.
 *
 * Prerequisites:
 *   1. Flask ML:  cd ml && python app.py          (port 8000)
 *   2. Express:   cd backend && npm start         (port 5000)
 *   3. Logged-in user token in localStorage (student/faculty/admin)
 *
 * Usage in browser console on student.html (after login):
 *   import { predictShortageRisk } from "../assets/js/mlPredict.js";
 *   predictShortageRisk(72.5, 12).then(console.log).catch(console.error);
 */

import { apiPost } from "../assets/js/api.js?v=20260518";

/**
 * Predict attendance shortage risk through Express → Flask.
 * @param {number} attendancePercentage - 0 to 100
 * @param {number} absentDays - non-negative
 * @returns {Promise<object>} Flask prediction payload
 */
export async function predictShortageRisk(attendancePercentage, absentDays) {
  const data = await apiPost("/api/ml/predict-shortage", {
    attendance_percentage: attendancePercentage,
    absent_days: absentDays,
  });

  if (!data?.success && data?.message) {
    throw new Error(data.message);
  }

  return data;
}

// --- Standalone fetch (no api.js) ---
export async function predictShortageRiskRaw(attendancePercentage, absentDays) {
  const token = localStorage.getItem("token");

  const res = await fetch("/api/ml/predict-shortage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      attendance_percentage: attendancePercentage,
      absent_days: absentDays,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }

  return data;
}

// Example calls (uncomment to test from a module script):
// predictShortageRisk(35, 40).then((r) => console.log("High risk?", r.shortage_risk_label, r));
// predictShortageRisk(92, 3).then((r) => console.log("Low risk?", r.shortage_risk_label, r));
