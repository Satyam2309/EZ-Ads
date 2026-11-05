import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT,
      secure: env.EMAIL_PORT === 465,
      auth: env.EMAIL_USER ? { user: env.EMAIL_USER, pass: env.EMAIL_PASS } : undefined
    });
  }
  return transporter;
}

export async function sendMail({ to, subject, text, html }) {
  try {
    const info = await getTransporter().sendMail({ from: env.EMAIL_FROM, to, subject, text, html });
    return info.messageId;
  } catch (err) {
    // log failure without credentials; callers decide whether to surface
    console.error('[email] send failed:', err.message);
    throw err;
  }
}
