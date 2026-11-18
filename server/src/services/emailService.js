import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { env } from '../config/env.js';

/* ─── Resend (primary — works from any cloud) ─── */
let resendClient = null;
function getResendClient() {
  if (!resendClient && env.RESEND_API_KEY) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

/* ─── Nodemailer (fallback — SMTP) ─── */
let transporter = null;
function getTransporter() {
  if (!transporter) {
    const port = Number(env.EMAIL_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port,
      secure: port === 465,
      auth: env.EMAIL_USER ? { user: env.EMAIL_USER, pass: env.EMAIL_PASS } : undefined,
      connectionTimeout: 6000,
      greetingTimeout: 6000,
      socketTimeout: 8000
    });
  }
  return transporter;
}

export async function sendMail({ to, subject, text, html }) {
  /* 1. Try Resend if API key is configured */
  const resend = getResendClient();
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: env.EMAIL_FROM,
        to,
        subject,
        html,
        text
      });
      if (error) {
        console.error('[email] Resend error:', error);
      } else {
        console.log('[email] Resend sent:', data?.id);
        return data?.id;
      }
    } catch (err) {
      console.error('[email] Resend exception:', err.message);
    }
  }

  /* 2. Fall back to nodemailer/SMTP */
  if (env.EMAIL_HOST) {
    try {
      const info = await getTransporter().sendMail({ from: env.EMAIL_FROM, to, subject, text, html });
      console.log('[email] SMTP sent:', info?.messageId);
      return info?.messageId;
    } catch (err) {
      console.error('[email] SMTP send failed:', err.message);
    }
  }

  console.warn('[email] No email provider configured — email not sent');
  return null;
}

/* ─────────────────────────────────────────────
   EZ Ads — Branded HTML Email Templates
   ───────────────────────────────────────────── */

const BASE_STYLE = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f0f2f5; font-family: 'Inter', Arial, sans-serif; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff;
               border-radius: 12px; overflow: hidden;
               box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #6C3EF4 0%, #A855F7 100%);
              padding: 32px 40px; text-align: center; }
    .header .logo { font-size: 28px; font-weight: 700; color: #ffffff;
                    letter-spacing: -0.5px; }
    .header .logo span { color: #E9D5FF; }
    .header .tagline { color: #DDD6FE; font-size: 13px; margin-top: 4px; }
    .body { padding: 36px 40px; color: #374151; line-height: 1.7; }
    .body h2 { font-size: 20px; font-weight: 600; color: #111827; margin-bottom: 12px; }
    .body p { margin-bottom: 14px; font-size: 15px; color: #4B5563; }
    .otp-box { background: #F5F3FF; border: 1.5px dashed #A855F7;
               border-radius: 10px; padding: 20px; text-align: center;
               margin: 24px 0; }
    .otp-code { font-size: 36px; font-weight: 700; color: #6C3EF4;
                letter-spacing: 8px; display: block; }
    .otp-note { font-size: 12px; color: #9CA3AF; margin-top: 8px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #6C3EF4, #A855F7);
           color: #ffffff !important; text-decoration: none; padding: 14px 32px;
           border-radius: 8px; font-weight: 600; font-size: 15px; margin: 20px 0;
           letter-spacing: 0.3px; }
    .divider { border: none; border-top: 1px solid #E5E7EB; margin: 24px 0; }
    .fallback-url { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px;
                    padding: 10px 14px; font-size: 12px; color: #6B7280;
                    word-break: break-all; margin: 10px 0; }
    .footer { background: #F9FAFB; border-top: 1px solid #E5E7EB;
              padding: 20px 40px; text-align: center; }
    .footer p { font-size: 12px; color: #9CA3AF; }
    .footer a { color: #6C3EF4; text-decoration: none; }
    .highlight { color: #6C3EF4; font-weight: 600; }
  </style>
`;

function baseLayout(bodyContent) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${BASE_STYLE}
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">EZ <span>Ads</span></div>
      <div class="tagline">India's Influencer Marketing Marketplace</div>
    </div>
    <div class="body">
      ${bodyContent}
    </div>
    <div class="footer">
      <p>&copy; ${year} EZ Ads. All rights reserved.</p>
      <p style="margin-top:6px;">
        Questions? <a href="mailto:${env.EMAIL_USER || 'support@ezads.in'}">Contact Support</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Branded verification email with 6-digit OTP code box.
 * Used by authService when EMAIL_HOST is configured.
 */
export function buildVerificationEmail(name, verifyUrl) {
  const html = baseLayout(`
    <h2>Verify your email address</h2>
    <p>Hi <span class="highlight">${name}</span>,</p>
    <p>Thanks for signing up on <strong>EZ Ads</strong> — where brands meet creators. 
       Click the button below to verify your email and activate your account:</p>
    <div style="text-align:center;">
      <a href="${verifyUrl}" class="btn">✅ Verify My Email</a>
    </div>
    <hr class="divider">
    <p style="font-size:13px; color:#6B7280;">Or copy and paste this link in your browser:</p>
    <div class="fallback-url">${verifyUrl}</div>
    <p style="font-size:13px; color:#9CA3AF; margin-top:16px;">
      This link expires in <strong>24 hours</strong>. 
      If you didn't sign up for EZ Ads, you can safely ignore this email.
    </p>
  `);

  const text = `Hi ${name},\n\nVerify your EZ Ads account by visiting:\n${verifyUrl}\n\nLink expires in 24 hours.\n\nIf you didn't create this account, please ignore this email.\n\n— EZ Ads Team`;

  return { html, text };
}

/**
 * Branded welcome email sent after successful email verification.
 */
export function buildWelcomeEmail(name) {
  const html = baseLayout(`
    <h2>Welcome to EZ Ads! 🎉</h2>
    <p>Hi <span class="highlight">${name}</span>,</p>
    <p>Your email is verified and your account is ready. You're now part of <strong>EZ Ads</strong> — 
       India's growing platform connecting brands with the right influencers.</p>
    <p>Here's what you can do next:</p>
    <ul style="padding-left:20px; margin-bottom:16px; color:#4B5563; font-size:15px; line-height:2;">
      <li>🎯 Create your first campaign</li>
      <li>🔍 Discover and shortlist influencers</li>
      <li>📊 Track campaign performance in real-time</li>
      <li>💬 Chat directly with creators</li>
    </ul>
    <div style="text-align:center;">
      <a href="${env.CLIENT_ORIGIN}/dashboard" class="btn">🚀 Go to Dashboard</a>
    </div>
    <hr class="divider">
    <p style="font-size:13px; color:#9CA3AF;">
      Need help getting started? Reply to this email — we're happy to assist.
    </p>
  `);

  const text = `Hi ${name},\n\nWelcome to EZ Ads! Your account is active.\n\nVisit your dashboard: ${env.CLIENT_ORIGIN}/dashboard\n\n— EZ Ads Team`;

  return { html, text };
}

/**
 * Branded password reset email.
 */
export function buildPasswordResetEmail(resetUrl) {
  const html = baseLayout(`
    <h2>Reset your password</h2>
    <p>We received a request to reset the password for your EZ Ads account.</p>
    <p>Click the button below to choose a new password:</p>
    <div style="text-align:center;">
      <a href="${resetUrl}" class="btn">🔐 Reset My Password</a>
    </div>
    <hr class="divider">
    <p style="font-size:13px; color:#6B7280;">Or copy and paste this link in your browser:</p>
    <div class="fallback-url">${resetUrl}</div>
    <p style="font-size:13px; color:#9CA3AF; margin-top:16px;">
      This link expires in <strong>60 minutes</strong>. 
      If you didn't request a password reset, you can safely ignore this email — 
      your password will not change.
    </p>
  `);

  const text = `Reset your EZ Ads password:\n${resetUrl}\n\nLink expires in 60 minutes.\n\nIf you didn't request this, ignore this email.\n\n— EZ Ads Team`;

  return { html, text };
}

