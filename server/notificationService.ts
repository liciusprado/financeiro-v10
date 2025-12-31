import nodemailer from "nodemailer";
import twilio from "twilio";
import { ENV } from "./_core/env";

/**
 * This service centralizes the delivery of notifications via e‑mail and WhatsApp.
 * It relies on environment variables defined in ENV to determine whether each channel
 * is enabled. When a channel is misconfigured, the send functions become no‑ops.
 */

// Initialize Twilio client if credentials are present
const twilioClient =
  ENV.twilioAccountSid && ENV.twilioAuthToken
    ? twilio(ENV.twilioAccountSid, ENV.twilioAuthToken)
    : null;

// Initialize Nodemailer transporter if SMTP config is present
const smtpPort = Number(ENV.smtpPort) || 0;
const transporter =
  ENV.smtpHost && smtpPort && ENV.smtpUser && ENV.smtpPass
    ? nodemailer.createTransport({
        host: ENV.smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: ENV.smtpUser,
          pass: ENV.smtpPass,
        },
      })
    : null;

/**
 * Send a WhatsApp message to one or more numbers.
 *
 * The `toNumbers` array must contain numbers in E.164 format without the `whatsapp:` prefix.
 * If Twilio is not configured, this function simply resolves without sending anything.
 */
export async function sendWhatsAppNotification(
  message: string,
  toNumbers: string[]
): Promise<void> {
  if (!twilioClient || !ENV.twilioWhatsAppFrom) {
    // WhatsApp notifications are disabled
    return;
  }
  try {
    const promises = toNumbers.map((to) =>
      twilioClient!.messages.create({
        from: `whatsapp:${ENV.twilioWhatsAppFrom}`,
        to: `whatsapp:${to}`,
        body: message,
      })
    );
    await Promise.all(promises);
  } catch (error) {
    console.error(
      "[notificationService] Failed to send WhatsApp message:",
      error
    );
  }
}

/**
 * Send an e‑mail notification.
 *
 * The list of recipients is derived from the NOTIFICATION_EMAILS environment variable.
 * If the SMTP transporter is not configured or no recipients are specified,
 * this function resolves without sending anything.
 */
export async function sendEmailNotification(
  subject: string,
  content: string
): Promise<void> {
  if (!transporter) {
    // Email notifications are disabled
    return;
  }
  const recipients = ENV.notificationEmails
    ? ENV.notificationEmails.split(",")
        .map((email) => email.trim())
        .filter(Boolean)
    : [];
  if (recipients.length === 0) {
    return;
  }
  try {
    await transporter.sendMail({
      from: `"Planejamento Familiar" <${ENV.smtpUser}>`,
      to: recipients,
      subject,
      text: content,
    });
  } catch (error) {
    console.error("[notificationService] Failed to send email:", error);
  }
}

/**
 * Helper to broadcast a notification through all configured channels.
 * Provide both a short subject/title (for e‑mail subject) and a full message.
 */
export async function broadcastNotification(
  subject: string,
  message: string,
  whatsAppNumbers: string[]
): Promise<void> {
  await Promise.all([
    sendEmailNotification(subject, message),
    sendWhatsAppNotification(message, whatsAppNumbers),
  ]);
}

/**
 * Sends a notification to a specific person (Lícius or Marielly) via both email and WhatsApp,
 * using the contact details defined in ENV. If the corresponding contact is not configured,
 * that channel will be skipped.
 */
export async function sendNotificationToPerson(
  person: "licius" | "marielly",
  subject: string,
  message: string
): Promise<void> {
  const emails: string[] = [];
  const numbers: string[] = [];
  if (person === "licius") {
    if (ENV.liciusEmail) emails.push(ENV.liciusEmail);
    if (ENV.liciusWhatsApp) numbers.push(ENV.liciusWhatsApp);
  } else if (person === "marielly") {
    if (ENV.mariellyEmail) emails.push(ENV.mariellyEmail);
    if (ENV.mariellyWhatsApp) numbers.push(ENV.mariellyWhatsApp);
  }
  // Swap recipient: if requesting review for person A's transaction, we want to notify the other person.
  // But this function expects the target person directly. If an array of recipients is empty, skip.
  // Send email
  if (emails.length > 0 && transporter) {
    try {
      await transporter.sendMail({
        from: `"Planejamento Familiar" <${ENV.smtpUser}>`,
        to: emails.join(","),
        subject,
        text: message,
      });
    } catch (error) {
      console.error("[notificationService] Failed to send targeted email:", error);
    }
  }
  // Send WhatsApp
  if (numbers.length > 0 && twilioClient && ENV.twilioWhatsAppFrom) {
    try {
      const promises = numbers.map((to) =>
        twilioClient!.messages.create({
          from: `whatsapp:${ENV.twilioWhatsAppFrom}`,
          to: `whatsapp:${to}`,
          body: message,
        })
      );
      await Promise.all(promises);
    } catch (error) {
      console.error("[notificationService] Failed to send targeted WhatsApp:", error);
    }
  }
}