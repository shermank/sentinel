import { Resend } from "resend";
import nodemailer from "nodemailer";

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Initialize Nodemailer transporter (fallback)
const transporter =
  process.env.SMTP_HOST && process.env.SMTP_USER
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_PORT === "465",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    : null;

const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@eternal-sentinel.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  try {
    if (resend) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
      return true;
    } else if (transporter) {
      await transporter.sendMail({
        from: FROM_EMAIL,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
      return true;
    } else {
      console.warn("No email service configured. Email not sent:", params.subject);
      return false;
    }
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
}

// Email templates
export function checkInReminderEmail(
  userName: string,
  checkInUrl: string,
  dueDate: Date
): SendEmailParams {
  const formattedDate = dueDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return {
    to: "", // Will be set by caller
    subject: "Eternal Sentinel - Check-in Required",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a1a2e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Eternal Sentinel</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName},</h2>
              <p>This is your scheduled check-in reminder. Please confirm you're well by clicking the button below.</p>
              <p><strong>Due by:</strong> ${formattedDate}</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${checkInUrl}" class="button">Confirm I'm OK</a>
              </p>
              <p>If you don't check in before the due date, we'll send you additional reminders. After multiple missed check-ins, your designated trustees will be notified.</p>
              <p>Stay safe,<br>The Eternal Sentinel Team</p>
            </div>
            <div class="footer">
              <p>If you didn't expect this email, please <a href="${APP_URL}/settings">update your settings</a>.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hello ${userName},

This is your scheduled check-in reminder. Please confirm you're well by visiting:
${checkInUrl}

Due by: ${formattedDate}

If you don't check in before the due date, we'll send you additional reminders. After multiple missed check-ins, your designated trustees will be notified.

Stay safe,
The Eternal Sentinel Team
    `.trim(),
  };
}

export function escalationWarningEmail(
  userName: string,
  missedCount: number,
  gracePeriodDays: number,
  checkInUrl: string
): SendEmailParams {
  return {
    to: "",
    subject: `URGENT: Eternal Sentinel - ${missedCount} Missed Check-ins`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #fef2f2; padding: 30px; border-radius: 0 0 8px 8px; border: 2px solid #dc2626; }
            .button { display: inline-block; background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; }
            .warning { background: #fee2e2; border: 1px solid #dc2626; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>URGENT - Action Required</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName},</h2>
              <div class="warning">
                <strong>Warning:</strong> You have missed ${missedCount} consecutive check-in(s).
              </div>
              <p>You have <strong>${gracePeriodDays} days</strong> to confirm you're OK before we proceed to the next escalation level.</p>
              <p>If you continue to miss check-ins, your trustees will be notified and given access to your vault.</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${checkInUrl}" class="button">Confirm I'm OK Now</a>
              </p>
              <p>If this is an emergency and you need to pause notifications, please <a href="${APP_URL}/settings">update your settings</a>.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
URGENT - Action Required

Hello ${userName},

Warning: You have missed ${missedCount} consecutive check-in(s).

You have ${gracePeriodDays} days to confirm you're OK before we proceed to the next escalation level.

Please confirm you're OK by visiting: ${checkInUrl}

If you continue to miss check-ins, your trustees will be notified and given access to your vault.
    `.trim(),
  };
}

export function trusteeNotificationEmail(
  trusteeName: string,
  userName: string,
  accessUrl: string,
  message?: string
): SendEmailParams {
  return {
    to: "",
    subject: `Eternal Sentinel - ${userName}'s Digital Legacy Access`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a1a2e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; }
            .message { background: #e5e7eb; padding: 20px; border-radius: 6px; margin: 20px 0; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Eternal Sentinel</h1>
              <p>Digital Legacy Notification</p>
            </div>
            <div class="content">
              <h2>Dear ${trusteeName},</h2>
              <p>You have been designated as a trusted contact by <strong>${userName}</strong> on Eternal Sentinel.</p>
              <p>After an extended period without check-ins, their digital legacy protocol has been activated. You have been granted access to view their secure vault.</p>
              ${message ? `<div class="message">"${message}"</div>` : ""}
              <p style="text-align: center; margin: 30px 0;">
                <a href="${accessUrl}" class="button">Access Digital Vault</a>
              </p>
              <p><strong>Important:</strong> This access link is time-limited and will expire in 30 days. Please save any important information before then.</p>
              <p>With respect,<br>The Eternal Sentinel Team</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Dear ${trusteeName},

You have been designated as a trusted contact by ${userName} on Eternal Sentinel.

After an extended period without check-ins, their digital legacy protocol has been activated. You have been granted access to view their secure vault.

${message ? `Message from ${userName}: "${message}"` : ""}

Access the digital vault: ${accessUrl}

Important: This access link is time-limited and will expire in 30 days.

With respect,
The Eternal Sentinel Team
    `.trim(),
  };
}

export function trusteeInvitationEmail(
  trusteeName: string,
  userName: string,
  verificationUrl: string
): SendEmailParams {
  return {
    to: "",
    subject: `${userName} has designated you as a trusted contact on Eternal Sentinel`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a1a2e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Eternal Sentinel</h1>
            </div>
            <div class="content">
              <h2>Hello ${trusteeName},</h2>
              <p><strong>${userName}</strong> has designated you as a trusted contact on Eternal Sentinel, a digital legacy service.</p>
              <p>As a trusted contact, you may be granted access to ${userName}'s digital vault in the event they become unreachable for an extended period.</p>
              <p>Please verify your email to confirm your role:</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" class="button">Verify My Email</a>
              </p>
              <p>If you have questions about this, please contact ${userName} directly.</p>
              <p>Best regards,<br>The Eternal Sentinel Team</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hello ${trusteeName},

${userName} has designated you as a trusted contact on Eternal Sentinel, a digital legacy service.

As a trusted contact, you may be granted access to ${userName}'s digital vault in the event they become unreachable for an extended period.

Please verify your email: ${verificationUrl}

If you have questions about this, please contact ${userName} directly.

Best regards,
The Eternal Sentinel Team
    `.trim(),
  };
}
