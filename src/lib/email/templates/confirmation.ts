import type { RegistrationPayload } from '../../../types/registration';

const copy = {
  ms: {
    subject: (ref: string) => `Pendaftaran Diterima — ${ref} | Total Sports Asia`,
    heading: 'Pendaftaran Anda Telah Diterima',
    body: 'Terima kasih kerana mendaftar. Ahli pasukan Total Sports Asia akan menghubungi anda dalam masa 3 hari bekerja.',
    refLabel: 'ID Rujukan Anda',
    nextHeading: 'Langkah Seterusnya',
    next1: 'Pasukan kami akan menyemak butiran tempat dan permohonan anda.',
    next2: 'Anda akan menerima permit bertulis dan syarat pelesenan.',
    next3: 'Untuk pertanyaan segera, hubungi kami di WhatsApp.',
    footer: 'Total Sports Asia Sdn Bhd adalah pengendali hak komersial berlesen untuk FIFA World Cup 2026 di Malaysia.',
  },
  en: {
    subject: (ref: string) => `Registration Received — ${ref} | Total Sports Asia`,
    heading: 'Your Registration Has Been Received',
    body: 'Thank you for registering. A member of the Total Sports Asia team will be in touch within 3 working days.',
    refLabel: 'Your Reference ID',
    nextHeading: 'Next Steps',
    next1: 'Our team will review your venue details and application.',
    next2: 'You will receive your written permit and licensing terms.',
    next3: 'For urgent enquiries, message us on WhatsApp.',
    footer: 'Total Sports Asia Sdn Bhd is the licensed commercial rights operator for the FIFA World Cup 2026 in Malaysia.',
  },
};

export function buildConfirmationEmail(
  data: RegistrationPayload,
  referenceId: string,
): { subject: string; html: string; text: string } {
  const c = copy[data.lang] ?? copy.en;
  const subject = c.subject(referenceId);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#070c18;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <tr>
      <td>
        <!-- Header -->
        <div style="border-bottom:2px solid #c9a84c;padding-bottom:20px;margin-bottom:28px;">
          <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#c9a84c;font-weight:700;">TOTAL SPORTS ASIA</p>
          <h1 style="margin:0;font-size:22px;color:#f5f7fa;font-weight:700;">${c.heading}</h1>
        </div>

        <p style="color:#b0bac8;font-size:14px;line-height:1.65;margin-bottom:24px;">${c.body}</p>

        <!-- Reference ID box -->
        <div style="background:#0d1628;border:1px solid rgba(201,168,76,0.3);padding:20px 24px;margin-bottom:28px;border-radius:2px;">
          <p style="margin:0 0 6px;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#7a8499;font-weight:600;">${c.refLabel}</p>
          <p style="margin:0;font-size:22px;color:#c9a84c;font-family:'Courier New',monospace;font-weight:700;letter-spacing:0.05em;">${referenceId}</p>
        </div>

        <!-- Next steps -->
        <h2 style="margin:0 0 16px;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#f5f7fa;font-weight:700;">${c.nextHeading}</h2>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${[c.next1, c.next2, c.next3].map((step, i) => `
          <tr>
            <td style="width:28px;vertical-align:top;padding:0 12px 12px 0;">
              <div style="width:22px;height:22px;background:#c9a84c;border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#070c18;">${i + 1}</div>
            </td>
            <td style="padding-bottom:12px;color:#b0bac8;font-size:13px;line-height:1.6;">${step}</td>
          </tr>`).join('')}
        </table>

        <!-- Footer -->
        <div style="border-top:1px solid #1a2540;margin-top:32px;padding-top:20px;">
          <p style="margin:0;font-size:11px;color:#3a4560;line-height:1.5;">${c.footer}</p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    c.heading,
    '',
    c.body,
    '',
    `${c.refLabel}: ${referenceId}`,
    '',
    c.nextHeading,
    `1. ${c.next1}`,
    `2. ${c.next2}`,
    `3. ${c.next3}`,
    '',
    c.footer,
  ].join('\n');

  return { subject, html, text };
}
