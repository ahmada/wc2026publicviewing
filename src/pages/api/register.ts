export const prerender = false;

import type { APIRoute } from 'astro';
import { env as cfEnv } from 'cloudflare:workers';
import { RegistrationSchema } from '../../types/registration';
import { verifyTurnstile } from '../../lib/turnstile';
import { checkRateLimit } from '../../lib/rate-limit';
import { sendEmail } from '../../lib/email/index';
import { buildNotificationEmail } from '../../lib/email/templates/notification';
import { buildConfirmationEmail } from '../../lib/email/templates/confirmation';
import { appendRegistrationToSheet } from '../../lib/sheets';

const ALLOWED_ORIGINS = [
  'https://www.totalsportsasia.com',
  'https://publicviewing.totalsportsasia.com',
  'https://2026wcpublicviewing.aasil.workers.dev',
  'http://localhost:4321',
  'http://localhost:3000',
];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Method guard
  if (request.method !== 'POST') return json({ ok: false, code: 'METHOD_NOT_ALLOWED' }, 405);

  // Content-Type guard
  const ct = request.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) return json({ ok: false, code: 'UNSUPPORTED_MEDIA_TYPE' }, 415);

  // Origin guard
  const origin = request.headers.get('origin');
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return json({ ok: false, code: 'FORBIDDEN' }, 403);
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, code: 'INVALID_JSON' }, 400);
  }

  // Honeypot check
  const raw = body as Record<string, unknown>;
  if (raw.websiteUrl && String(raw.websiteUrl).length > 0) {
    // Silent 200 to confuse bots
    return json({ ok: true, referenceId: crypto.randomUUID() });
  }

  // Zod validation
  const parsed = RegistrationSchema.safeParse(body);
  if (!parsed.success) {
    return json({ ok: false, code: 'VALIDATION_ERROR' }, 400);
  }
  const data = parsed.data;

  // Turnstile verification
  const ip = clientAddress ?? request.headers.get('cf-connecting-ip') ?? '0.0.0.0';
  const env = cfEnv as Env | undefined;
  const turnstileSecret = env?.TURNSTILE_SECRET_KEY ?? import.meta.env.TURNSTILE_SECRET_KEY ?? '';
  const turnstileOk = await verifyTurnstile(data.cfTurnstileToken, ip, turnstileSecret);
  if (!turnstileOk) {
    return json({ ok: false, code: 'TURNSTILE_FAILED' }, 400);
  }

  // Rate limiting (skip if KV not configured — dev fallback)
  const kv = env?.RATE_LIMIT_KV;
  if (kv) {
    const rl = await checkRateLimit(ip, kv);
    if (!rl.allowed) {
      return json({ ok: false, code: 'RATE_LIMITED', retryAfter: rl.retryAfter }, 429);
    }
  }

  // Generate reference ID
  const referenceId = crypto.randomUUID().toUpperCase().slice(0, 13).replace(/-/g, '').slice(0, 8);
  const fullRef = `TSA-${new Date().getUTCFullYear()}-${referenceId}`;

  // Build email content
  const sheetsUrl = env?.GOOGLE_SHEETS_URL ?? import.meta.env.GOOGLE_SHEETS_URL ?? '';
  const notification = buildNotificationEmail(data, fullRef, sheetsUrl);
  const confirmation = buildConfirmationEmail(data, fullRef);

  const notificationEmail = env?.NOTIFICATION_EMAIL ?? import.meta.env.NOTIFICATION_EMAIL ?? '';
  const emailEnv = {
    RESEND_API_KEY: env?.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY ?? '',
    BREVO_API_KEY: env?.BREVO_API_KEY ?? import.meta.env.BREVO_API_KEY ?? '',
    EMAIL_PROVIDER: env?.EMAIL_PROVIDER ?? import.meta.env.EMAIL_PROVIDER ?? 'resend',
  };

  const sheetsWebhookUrl = env?.GOOGLE_SHEETS_WEBHOOK_URL ?? import.meta.env.GOOGLE_SHEETS_WEBHOOK_URL ?? '';
  const sheetsSecret = env?.GOOGLE_SHEETS_SECRET ?? import.meta.env.GOOGLE_SHEETS_SECRET ?? '';

  // Send emails + sheet write (non-blocking — don't fail registration if any of these fail)
  const [notifResult, confirmResult, sheetsResult] = await Promise.allSettled([
    sendEmail({ to: notificationEmail, subject: notification.subject, html: notification.html, text: notification.text }, emailEnv),
    sendEmail({ to: data.email, subject: confirmation.subject, html: confirmation.html, text: confirmation.text }, emailEnv),
    sheetsWebhookUrl ? appendRegistrationToSheet(data, fullRef, sheetsWebhookUrl, sheetsSecret) : Promise.resolve(),
  ]);

  // Log failures without exposing PII
  if (notifResult.status === 'rejected') {
    console.error('[register] notification email failed:', notifResult.reason?.message);
  }
  if (confirmResult.status === 'rejected') {
    console.error('[register] confirmation email failed:', confirmResult.reason?.message);
  }
  if (sheetsResult.status === 'rejected') {
    console.error('[register] sheets write failed:', sheetsResult.reason?.message);
  }

  return json({ ok: true, referenceId: fullRef });
};
