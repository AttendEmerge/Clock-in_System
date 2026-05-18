const nodemailer = require('nodemailer');

let transporter = null;

/** Prefer Resend (HTTP API) when RESEND_API_KEY is set — works on Render where SMTP ports are often blocked. */
function useResend() {
  return !!process.env.RESEND_API_KEY;
}

function getTransporter() {
  if (transporter) return transporter;

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM_EMAIL,
  } = process.env;

  const missing = [];
  if (!SMTP_HOST) missing.push('SMTP_HOST');
  if (!SMTP_PORT) missing.push('SMTP_PORT');
  if (!SMTP_USER) missing.push('SMTP_USER');
  if (!SMTP_PASS) missing.push('SMTP_PASS');
  if (!SMTP_FROM_EMAIL) missing.push('SMTP_FROM_EMAIL');
  if (missing.length > 0) {
    console.warn(
      '[emailService] SMTP configuration incomplete. Missing:', missing.join(', '), '- emails will not be sent via SMTP.'
    );
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === 'true',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporter;
}

async function sendViaResend({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || 'Emerge Livelihoods <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html: html || text,
      text: text || undefined,
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Resend API ${res.status}: ${errBody}`);
  }
}

async function sendEmail({ to, subject, html, text }) {
  if (useResend()) {
    await sendViaResend({ to, subject, html, text });
    return;
  }

  const tx = getTransporter();
  if (!tx) {
    console.log(
      '[emailService] Skipping email send: no RESEND_API_KEY and SMTP not configured.',
      { to, subject }
    );
    return;
  }

  await tx.sendMail({
    from: process.env.SMTP_FROM_EMAIL,
    to,
    subject,
    text,
    html,
  });
}

async function sendPasswordResetEmail(user, resetLink) {
  const subject = 'Emerge Livelihoods — Password Reset';
  const text = [
    `Hello ${user.name || 'there'},`,
    '',
    'We received a request to reset the password for your Emerge Livelihoods account.',
    'If you made this request, click the link below to choose a new password:',
    '',
    resetLink,
    '',
    'If you did not request a password reset, you can safely ignore this email.',
  ].join('\n');

  const html = `
    <p>Hello ${user.name || 'there'},</p>
    <p>We received a request to reset the password for your <strong>Emerge Livelihoods</strong> account.</p>
    <p>If you made this request, click the button below to choose a new password:</p>
    <p><a href="${resetLink}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:4px;">Reset Password</a></p>
    <p>Or copy and paste this link into your browser:</p>
    <p><a href="${resetLink}">${resetLink}</a></p>
    <p>If you did not request a password reset, you can safely ignore this email.</p>
  `;

  await sendEmail({
    to: user.email,
    subject,
    text,
    html,
  });
}

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
};

