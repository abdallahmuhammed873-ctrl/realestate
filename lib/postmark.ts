import nodemailer from "nodemailer";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendPasswordResetOtpEmail(input: { to: string; userName: string; otp: string }) {
  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const passRaw = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM_EMAIL ?? user ?? "";

  if (!host) return { ok: false as const, error: "SMTP_HOST is missing." };
  if (!portRaw) return { ok: false as const, error: "SMTP_PORT is missing." };
  if (!user) return { ok: false as const, error: "SMTP_USER is missing." };
  if (!passRaw) return { ok: false as const, error: "SMTP_PASS is missing." };
  if (!from) return { ok: false as const, error: "SMTP_FROM_EMAIL is missing." };

  const safeName = escapeHtml(input.userName);
  const safeOtp = escapeHtml(input.otp);
  const htmlBody = `
    <strong>Hi ${safeName}</strong>.<br/><br/>
    Enter this code to complete the reset.<br/><br/>
    <strong>${safeOtp}</strong><br/><br/>
    If you didn't request this pin, we recommend you change your account password.<br/><br/>
    Regards, Cheque and Key team.
  `.trim();
  const textBody = [
    `Hi ${input.userName}.`,
    "",
    "Enter this code to complete the reset.",
    "",
    input.otp,
    "",
    "If you didn't request this pin, we recommend you change your account password.",
    "",
    "Regards, Cheque and Key team."
  ].join("\n");

  const port = Number(portRaw);
  const secure = port === 465;
  const pass = passRaw.replaceAll(" ", "");

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });

  try {
    await transporter.sendMail({
      from,
      to: input.to,
      subject: "Password Reset Request",
      html: htmlBody,
      text: textBody
    });
    return { ok: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false as const, error: `SMTP error: ${message}` };
  }
}
