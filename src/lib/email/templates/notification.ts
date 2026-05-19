import type { RegistrationPayload } from '../../../types/registration';

export function buildNotificationEmail(
  data: RegistrationPayload,
  referenceId: string,
): { subject: string; html: string; text: string } {
  const subject = `[TSA] New Public Viewing Registration — ${referenceId}`;

  const rows = [
    ['Reference ID', referenceId],
    ['Full Name', data.fullName],
    ['Position', data.position],
    ['Email', data.email],
    ['Phone', data.phone],
    ['Organisation', data.orgName],
    ['Business Type', data.orgType],
    ['SSM Number', data.ssmNumber || '—'],
    ['Venue Name', data.venueName || '—'],
    ['Venue Address', data.venueAddress],
    ['State', data.state],
    ['Capacity', data.capacity],
    ['Screen Setup', data.screenSetup || '—'],
    ['Matches Planned', data.matchesPlanned.join(', ')],
    ['Est. Audience', data.estimatedAudience || '—'],
    ['Charges Entry', data.chargesEntry],
    ['Sells F&B', data.sellsFnb],
    ['Sponsorship Interest', data.sponsorshipInterest || '—'],
    ['Language', data.lang],
    ['Notes', data.notes || '—'],
  ];

  const tableRows = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #1a2540;background:#0d1628;color:#7a8499;font-size:12px;white-space:nowrap;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">${label}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1a2540;background:#070c18;color:#f5f7fa;font-size:13px;word-break:break-word;">${escHtml(String(value))}</td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#070c18;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;padding:24px 16px;">
    <tr>
      <td>
        <div style="border-left:4px solid #c9a84c;padding:16px 20px;background:#0d1628;margin-bottom:24px;">
          <p style="margin:0;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#c9a84c;font-weight:700;">TOTAL SPORTS ASIA</p>
          <h1 style="margin:8px 0 4px;font-size:20px;color:#f5f7fa;">New Registration Received</h1>
          <p style="margin:0;font-size:12px;color:#7a8499;">Reference: <strong style="color:#c9a84c;">${escHtml(referenceId)}</strong></p>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #1a2540;">
          ${tableRows}
        </table>
        <p style="font-size:11px;color:#3a4560;margin-top:24px;text-align:center;">
          Automated notification from the TSA Public Viewing Registration portal.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');

  return { subject, html, text };
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
