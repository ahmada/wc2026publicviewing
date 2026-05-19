/// <reference types="astro/client" />
/// <reference types="@astrojs/cloudflare" />

interface Env {
  RESEND_API_KEY: string;
  BREVO_API_KEY: string;
  NOTIFICATION_EMAIL: string;
  EMAIL_PROVIDER: string;
  TURNSTILE_SECRET_KEY: string;
  RATE_LIMIT_KV: KVNamespace;
}

declare namespace App {
  interface Locals {
    runtime: {
      env: Env;
    };
  }
}
