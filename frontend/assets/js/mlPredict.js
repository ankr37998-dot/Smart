/**
 * Attendance shortage risk prediction (proxied via Express → Flask).
 */
import { apiPost } from "./api.js?v=20260526";

/**
 * @param {number} attendancePercentage
 * @param {number} absentDays
 * @returns {Promise<{
 *   success: boolean,
 *   shortage_risk: number,
 *   shortage_risk_label: string,
 *   probability_high_risk: number,
 *   attendance_percentage: number,
 *   absent_days: number
 * }>}
 */
export async function predictShortageRisk(attendancePercentage, absentDays) {
  const data = await apiPost("/api/ml/predict-shortage", {
    attendance_percentage: attendancePercentage,
    absent_days: absentDays,
  });

  if (data && data.success === false) {
    throw new Error(data.message || "Prediction failed");
  }

  return data;
}
