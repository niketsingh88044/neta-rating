const nodemailer = require('nodemailer');

let transporter = null;
let transporterMode = 'none'; // 'smtp' | 'console' | 'none'

function init() {
  if (transporter) return;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465, // 465 = SMTPS; everything else uses STARTTLS
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    transporterMode = 'smtp';
    console.log(`[email] SMTP configured: ${SMTP_HOST}:${SMTP_PORT}`);
  } else {
    transporterMode = 'console';
    console.warn('[email] SMTP env vars missing — emails will be logged to console only.');
  }
}

async function sendMail({ to, subject, text, html }) {
  init();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@neta-rating.local';
  if (transporterMode === 'console') {
    console.log('--- EMAIL (console fallback) ---');
    console.log(`From: ${from}`);
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log('--- /EMAIL ---');
    return { mode: 'console' };
  }
  const info = await transporter.sendMail({ from, to, subject, text, html });
  return { mode: 'smtp', messageId: info.messageId };
}

function verificationEmail({ name, code }) {
  const subject = `Your Neta Rating verification code: ${code}`;
  const text =
    `Hi ${name},\n\n` +
    `Your verification code is: ${code}\n\n` +
    `Enter this code on the verification screen to confirm your email. ` +
    `The code expires in 15 minutes. If you didn't sign up, you can ignore this message.`;
  const html =
    `<p>Hi ${escapeHtml(name)},</p>` +
    `<p>Your verification code is:</p>` +
    `<p style="font-size:2rem;letter-spacing:0.4rem;font-weight:700;margin:18px 0;` +
    `background:#f3f4f6;padding:14px 20px;display:inline-block;border-radius:8px">` +
    `${escapeHtml(code)}</p>` +
    `<p>Enter this code on the verification screen to confirm your email.</p>` +
    `<p style="color:#666;font-size:0.9em">This code expires in 15 minutes. ` +
    `If you didn't sign up, you can ignore this message.</p>`;
  return { subject, text, html };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}

module.exports = { sendMail, verificationEmail };
