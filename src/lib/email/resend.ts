import type { EmailPayload, EmailProvider } from './index';

export function createResendProvider(apiKey: string): EmailProvider {
  return {
    async send(payload: EmailPayload) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: payload.from,
          to: [payload.to],
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Resend ${res.status}: ${body}`);
      }
    },
  };
}
