import type { EmailPayload, EmailProvider } from './index';

export function createBrevoProvider(apiKey: string): EmailProvider {
  return {
    async send(payload: EmailPayload) {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          sender: { email: payload.from, name: 'Total Sports Asia' },
          to: [{ email: payload.to }],
          subject: payload.subject,
          htmlContent: payload.html,
          textContent: payload.text,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Brevo ${res.status}: ${body}`);
      }
    },
  };
}
