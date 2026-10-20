import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

let transporter = null;

if (config.smtpHost && config.smtpUser && config.smtpPass) {
    transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpPort === 465, // true for 465, false for 587/other
        auth: {
            user: config.smtpUser,
            pass: config.smtpPass
        }
    });
}

export const emailService = {
    /**
     * Send OTP verification code to user's email
     * @param {string} to Destination email
     * @param {string} otp 6-digit numeric OTP
     * @param {string} fullName Recipient's full name
     */
    async sendSignupOtp(to, otp, fullName = 'User') {
        const subject = `[Argus Security] Verification Code: ${otp}`;
        const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #090d16; color: #f1f5f9; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #38bdf8; font-size: 24px; margin: 0; letter-spacing: 1px;">ARGUS SECURITY</h1>
                    <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">Unified Document Security & Cryptographic Audit Vault</p>
                </div>
                <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 20px;">
                    <p style="font-size: 15px; color: #cbd5e1; margin-top: 0;">Hello ${fullName},</p>
                    <p style="font-size: 14px; color: #94a3b8; margin-bottom: 16px;">Please use the following 6-digit verification code to complete your Argus account registration. This code will expire in <strong>10 minutes</strong>.</p>
                    <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #34d399; background: #022c22; padding: 14px 20px; border-radius: 8px; border: 1px solid #059669; display: inline-block; font-family: monospace;">
                        ${otp}
                    </div>
                </div>
                <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0; text-align: center;">
                    If you did not request this registration, please disregard this email. Never share this code with anyone.
                </p>
            </div>
        `;

        const text = `Hello ${fullName},\n\nYour Argus Security registration OTP is: ${otp}\nThis code expires in 10 minutes.\n\nArgus Security Engine`;

        if (transporter) {
            try {
                const info = await transporter.sendMail({
                    from: config.smtpFrom,
                    to,
                    subject,
                    text,
                    html
                });
                console.log(`📧 [Email Service] OTP email dispatched to ${to} (MessageId: ${info.messageId})`);
                return { success: true, mode: 'smtp', messageId: info.messageId };
            } catch (err) {
                console.error(`❌ [Email Service] SMTP dispatch error: ${err.message}. Falling back to system console.`);
                return { success: true, mode: 'fallback_console', otp };
            }
        } else {
            // Development / Zero-Config fallback: print to console and return
            console.log(`\n======================================================`);
            console.log(`📧 [Argus Email Mock / Console Delivery]`);
            console.log(`To: ${to} (${fullName})`);
            console.log(`Subject: ${subject}`);
            console.log(`🔑 VERIFICATION OTP: >>> ${otp} <<<`);
            console.log(`======================================================\n`);
            return { success: true, mode: 'console', otp };
        }
    }
};
