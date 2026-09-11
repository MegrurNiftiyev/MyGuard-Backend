import { env } from '../config/env.js';

/**
 * Email Service for sending OTP emails to users
 */

export async function sendOtpEmail(email: string, otp: string, fullName?: string): Promise<boolean> {
  console.log(`\n=============================================================`);
  console.log(`[EMAIL SERVICE] 🔐 PASSWORD RESET OTP SENT`);
  console.log(`To: ${fullName || 'User'} <${email}>`);
  console.log(`OTP Code: ${otp}`);
  console.log(`Valid for: 60 seconds`);
  console.log(`=============================================================\n`);

  if (env.RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM || 'MyGuard Security <noreply@myguard.az>',
          to: [email],
          subject: 'MyGuard — Şifrə Yeniləmə OTP Kodu',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
              <h2 style="color: #1a365d;">MyGuard Təhlükəsizlik Sistemi</h2>
              <p>Hörmətli ${fullName || 'istifadəçi'},</p>
              <p>Şifrənizi yeniləmək üçün birdəfəlik 6-rəqəmli OTP kodunuz:</p>
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2b6cb0; margin: 20px 0; text-align: center;">
                ${otp}
              </div>
              <p style="color: #718096; font-size: 14px;">Bu kod yalnız <strong>60 saniyə</strong> müddətində etibarlıdır.</p>
              <p style="color: #e53e3e; font-size: 13px;">Təhlükəsizlik xəbərdarlığı: Bu kodu heç kimə təqdim etməyin.</p>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        console.warn('[Email Service] Resend API error:', await response.text());
      }
    } catch (err) {
      console.warn('[Email Service] Resend API call failed:', err);
    }
  }

  return true;
}
