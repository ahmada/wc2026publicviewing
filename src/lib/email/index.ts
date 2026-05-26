export interface EmailPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailProvider {
  send(payload: EmailPayload): Promise<void>;
}

const FROM_ADDRESS = 'onboarding@resend.dev';
const FROM_NAME = 'Total Sports Asia';

export async function sendEmail(
  payload: Omit<EmailPayload, 'from'>,
  env: { RESEND_API_KEY: string; BREVO_API_KEY?: string; EMAIL_PROVIDER?: string },
): Promise<void> {
  const full: EmailPayload = { ...payload, from: `${FROM_NAME} <${FROM_ADDRESS}>` };

  if (env.EMAIL_PROVIDER === 'brevo') {
    const { createBrevoProvider } = await import('./brevo');
    await createBrevoProvider(env.BREVO_API_KEY ?? '').send(full);
  } else {
    const { createResendProvider } = await import('./resend');
    await createResendProvider(env.RESEND_API_KEY).send(full);
  }
}
