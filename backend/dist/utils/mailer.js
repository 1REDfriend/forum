import nodemailer from 'nodemailer';
const isConfigured = !!process.env.SMTP_HOST &&
    !!process.env.SMTP_USER &&
    !!process.env.SMTP_PASS;
const transporter = isConfigured
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    })
    : null;
export async function sendPasswordResetEmail(to, resetUrl) {
    const subject = 'IT.FORUM — Password Reset Request';
    const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
      <h2 style="color: #4f46e5; margin-bottom: 8px;">Reset your password</h2>
      <p style="color: #374151;">We received a request to reset the password for your IT.FORUM account.</p>
      <p style="color: #374151;">Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="background: #4f46e5; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset Password</a>
      </div>
      <p style="color: #9ca3af; font-size: 13px;">If you didn't request a password reset, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">Or copy this link: <a href="${resetUrl}" style="color: #4f46e5;">${resetUrl}</a></p>
    </div>
  `;
    if (!transporter) {
        // In development without SMTP config, just log the link
        console.log('\n========== PASSWORD RESET LINK (dev mode) ==========');
        console.log(`To: ${to}`);
        console.log(`Reset URL: ${resetUrl}`);
        console.log('=====================================================\n');
        return;
    }
    await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        html,
    });
}
//# sourceMappingURL=mailer.js.map