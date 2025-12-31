export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Email configuration (SMTP)
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: process.env.SMTP_PORT ?? "",
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  // Twilio configuration (WhatsApp)
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioWhatsAppFrom: process.env.TWILIO_WHATSAPP_FROM ?? "",
  // Notification recipients
  notificationEmails: process.env.NOTIFICATION_EMAILS ?? "",
  notificationWhatsAppNumbers: process.env.NOTIFICATION_WHATSAPP_NUMBERS ?? "",
  liciusEmail: process.env.LICIUS_EMAIL ?? "",
  liciusWhatsApp: process.env.LICIUS_WHATSAPP ?? "",
  mariellyEmail: process.env.MARIELLY_EMAIL ?? "",
  mariellyWhatsApp: process.env.MARIELLY_WHATSAPP ?? "",
  // Belvo API configuration (Open Finance integration)
  belvoSecretId: process.env.BELVO_SECRET_ID ?? "",
  belvoSecretPassword: process.env.BELVO_SECRET_PASSWORD ?? "",
  belvoApiUrl: process.env.BELVO_API_URL ?? "https://sandbox.belvo.com",
};
