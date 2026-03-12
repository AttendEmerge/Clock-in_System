const nodemailer = require('nodemailer');

let transporter = null;

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

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM_EMAIL) {
    console.warn(
      '[emailService] SMTP configuration is incomplete. Emails will not be sent.'
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

async function sendEmail({ to, subject, html, text }) {
  const tx = getTransporter();
  if (!tx) {
    // In development without SMTP, just log and return.
    console.log(
      '[emailService] Skipping email send because SMTP is not configured.',
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
  const subject = 'Clock-in System — Password Reset';
  const text = [
    `Hello ${user.name || 'there'},`,
    '',
    'We received a request to reset the password for your Clock-in System account.',
    'If you made this request, click the link below to choose a new password:',
    '',
    resetLink,
    '',
    'If you did not request a password reset, you can safely ignore this email.',
  ].join('\n');

  const html = `
    <p>Hello ${user.name || 'there'},</p>
    <p>We received a request to reset the password for your <strong>Clock-in System</strong> account.</p>
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

