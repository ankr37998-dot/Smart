import { emailTransporter } from "../config/email.js";
import { env } from "../config/env.js";

export const sendLowAttendanceEmail = async (to, percentage) => {
    if (!env.EMAIL_USER) return; // skip if email not configured

    const mailOptions = {
        from: env.EMAIL_USER,
        to,
        subject: "Low Attendance Alert",
        text: `Your current overall attendance is ${percentage}%. Please ensure it stays above 75%.`
    };

    await emailTransporter.sendMail(mailOptions);
};