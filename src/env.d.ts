/// <reference types="astro/client" />
/// <reference types="@astrojs/cloudflare" />

interface Env {
  RESEND_API_KEY: string;
  BREVO_API_KEY: string;
  NOTIFICATION_EMAIL: string;
  EMAIL_PROVIDER: string;
  TURNSTILE_SECRET_KEY: string;
  RATE_LIMIT_KV: KVNamespace;
  GOOGLE_SHEETS_WEBHOOK_URL: string;
  GOOGLE_SHEETS_SECRET: string;
  GOOGLE_SHEETS_URL: string;
}

