import nodemailer from "nodemailer";

type ConfirmationEmail = {
  to: string;
  confirmUrl: string;
};

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.SMTP_FROM);
}

export async function sendConfirmationEmail({ to, confirmUrl }: ConfirmationEmail) {
  if (!smtpConfigured()) {
    console.info(`[email] SMTP not configured. Confirmation link for ${to}: ${confirmUrl}`);
    return { sent: false, reason: "smtp-not-configured" as const };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

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
