const nodemailer = require("nodemailer");

// Gmail SMTP transporter. Requires a Gmail App Password (NOT your normal
// Gmail password) — the sending account must have 2-Step Verification
// enabled, then generate a 16-character app password at:
// https://myaccount.google.com/apppasswords
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "sonaliasrtech@gmail.com";

// Verify credentials once on server startup so a bad app password shows up
// in the logs immediately, instead of only failing silently on first submit.
transporter.verify((err) => {
  if (err) {
    console.error("❌ Mailer setup failed — check GMAIL_USER / GMAIL_APP_PASSWORD:", err.message);
  } else {
    console.log("✅ Mailer ready — admin notifications will be sent to", ADMIN_EMAIL);
  }
});

/**
 * Sends a notification email to the admin inbox. Never throws — a failed
 * email should never break the form-submission response the user already
 * received (the lead is already saved in MongoDB regardless).
 */
async function sendAdminNotification(subject, html) {
  try {
    await transporter.sendMail({
      from: `"Cosmic Infra Website" <${process.env.GMAIL_USER}>`,
      to: ADMIN_EMAIL,
      subject,
      html,
    });
  } catch (err) {
    console.error(`❌ Failed to send admin notification ("${subject}"):`, err.message);
  }
}

// Small helper so each route doesn't have to hand-build an HTML table.
// Fields with no value (undefined/null/empty string) are skipped.
function buildNotificationHtml(title, fields) {
  const rows = fields
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px;font-weight:600;color:#334155;">${label}</td><td style="padding:6px 12px;color:#0f172a;">${value}</td></tr>`
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
      <h2 style="color:#0f172a;margin-bottom:12px;">${title}</h2>
      <table style="border-collapse:collapse;width:100%;background:#f8fafc;border-radius:8px;overflow:hidden;">
        ${rows}
      </table>
      <p style="margin-top:16px;font-size:12px;color:#94a3b8;">
        Sent automatically from the Cosmic Infra website. Full details are also in the admin panel.
      </p>
    </div>
  `;
}

module.exports = { sendAdminNotification, buildNotificationHtml };