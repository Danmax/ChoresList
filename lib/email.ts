import nodemailer from "nodemailer";

type ConfirmationEmail = {
  to: string;
  confirmUrl: string;
};

type PasswordResetEmail = {
  to: string;
  resetUrl: string;
};

type CommunityInviteEmail = {
  to: string;
  inviteUrl: string;
  groupName: string;
  eventTitle?: string | null;
  inviterEmail: string;
};

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.SMTP_FROM);
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendConfirmationEmail({ to, confirmUrl }: ConfirmationEmail) {
  if (!smtpConfigured()) {
    console.info(`[email] SMTP not configured. Confirmation link for ${to}: ${confirmUrl}`);
    return { sent: false, reason: "smtp-not-configured" as const };
  }

  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "Confirm your Chores List household",
    text: `Confirm your email to finish creating your private household:\n\n${confirmUrl}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
        <h1 style="font-size:20px">Confirm your Chores List household</h1>
        <p>Confirm your email to finish creating your private household.</p>
        <p><a href="${confirmUrl}" style="display:inline-block;background:#8b5cf6;color:#fff;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:700">Confirm email</a></p>
        <p style="font-size:12px;color:#64748b">If the button does not work, paste this link into your browser:<br>${confirmUrl}</p>
      </div>
    `,
  });

  return { sent: true as const };
}

export async function sendPasswordResetEmail({ to, resetUrl }: PasswordResetEmail) {
  if (!smtpConfigured()) {
    console.info(`[email] SMTP not configured. Password reset link for ${to}: ${resetUrl}`);
    return { sent: false, reason: "smtp-not-configured" as const };
  }

  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "Reset your Chores List password",
    text: `Use this link to reset your Chores List parent password:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
        <h1 style="font-size:20px">Reset your Chores List password</h1>
        <p>Use this link to choose a new parent password.</p>
        <p><a href="${resetUrl}" style="display:inline-block;background:#8b5cf6;color:#fff;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:700">Reset password</a></p>
        <p style="font-size:12px;color:#64748b">If the button does not work, paste this link into your browser:<br>${resetUrl}</p>
        <p style="font-size:12px;color:#64748b">If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });

  return { sent: true as const };
}

export async function sendCommunityInviteEmail({
  to,
  inviteUrl,
  groupName,
  eventTitle,
  inviterEmail,
}: CommunityInviteEmail) {
  if (!smtpConfigured()) {
    console.info(`[email] SMTP not configured. Community invite link for ${to}: ${inviteUrl}`);
    return { sent: false, reason: "smtp-not-configured" as const };
  }

  const transporter = createTransporter();
  const safeGroup = escapeHtml(groupName);
  const safeEvent = eventTitle ? escapeHtml(eventTitle) : null;
  const safeInviter = escapeHtml(inviterEmail);
  const safeInviteUrl = escapeHtml(inviteUrl);
  const subject = safeEvent ? `Join ${safeEvent} on ChoresList` : `Join ${safeGroup} on ChoresList`;
  const textTarget = eventTitle ? `${eventTitle} with ${groupName}` : groupName;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text: `${inviterEmail} invited you to participate in ${textTarget}.\n\nSign in or create a parent account to join:\n\n${inviteUrl}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
        <h1 style="font-size:20px">You&apos;re invited</h1>
        <p><strong>${safeInviter}</strong> invited you to participate in ${safeEvent ? `<strong>${safeEvent}</strong> with ` : ""}<strong>${safeGroup}</strong>.</p>
        <p><a href="${safeInviteUrl}" style="display:inline-block;background:#8b5cf6;color:#fff;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:700">Join and participate</a></p>
        <p style="font-size:12px;color:#64748b">If the button does not work, paste this link into your browser:<br>${safeInviteUrl}</p>
      </div>
    `,
  });

  return { sent: true as const };
}
