/*
 * Email sender. Uses Brevo's transactional HTTPS API when BREVO_API_KEY is set
 * (works on Render and other PaaS providers that block outbound SMTP), and
 * falls back to console logging when no provider is configured.
 *
 * Falls back to nodemailer SMTP only if you explicitly set SMTP_HOST etc. AND
 * leave BREVO_API_KEY blank — useful for local dev with Mailtrap/Ethereal.
 */
const nodemailer = require('nodemailer');

let smtpTransporter = null;
let mode = 'none'; // 'brevo' | 'smtp' | 'console'

function init() {
  if (mode !== 'none') return;
  if (process.env.BREVO_API_KEY) {
    mode = 'brevo';
    console.log('[email] using Brevo HTTPS API');
    return;
  }
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    smtpTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      family: 4,
    });
    mode = 'smtp';
    console.log(`[email] using SMTP ${SMTP_HOST}:${SMTP_PORT}`);
    return;
  }
  mode = 'console';
  console.warn('[email] no BREVO_API_KEY and no SMTP config — emails will be logged to console only.');
}

function parseFrom(raw) {
  const fallback = { name: 'Neta Rating', email: raw || 'no-reply@neta-rating.local' };
  if (!raw) return fallback;
  const m = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (m) return { name: m[1].trim().replace(/^"|"$/g, ''), email: m[2].trim() };
  return fallback;
}

async function sendMail({ to, subject, text, html }) {
  init();
  const from = parseFrom(process.env.SMTP_FROM || process.env.SMTP_USER);

  if (mode === 'brevo') {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: from,
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Brevo ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = await res.json().catch(() => ({}));
    return { mode: 'brevo', messageId: data.messageId };
  }

  if (mode === 'smtp') {
    const info = await smtpTransporter.sendMail({
      from: `${from.name} <${from.email}>`,
      to, subject, text, html,
    });
    return { mode: 'smtp', messageId: info.messageId };
  }

  // Console fallback
  console.log('--- EMAIL (console fallback) ---');
  console.log(`From:    ${from.name} <${from.email}>`);
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(text);
  console.log('--- /EMAIL ---');
  return { mode: 'console' };
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
