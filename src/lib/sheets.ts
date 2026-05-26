import type { RegistrationPayload } from '../types/registration';

export async function appendRegistrationToSheet(
  data: RegistrationPayload,
  referenceId: string,
  webhookUrl: string,
  secret: string,
): Promise<void> {
  const row = {
    referenceId,
    submittedAt: new Date().toISOString(),
    lang: data.lang,
    fullName: data.fullName,
    position: data.position,
    email: data.email,
    phone: data.phone,
    orgName: data.orgName,
    orgType: data.orgType,
    ssmNumber: data.ssmNumber ?? '',
    venueName: data.venueName ?? '',
    venueAddress: data.venueAddress,
    state: data.state,
    capacity: data.capacity,
    screenSetup: data.screenSetup ?? '',
    matchesPlanned: data.matchesPlanned.join(', '),
    estimatedAudience: data.estimatedAudience ?? '',
    chargesEntry: data.chargesEntry,
    sellsFnb: data.sellsFnb,
    sponsorshipInterest: data.sponsorshipInterest ?? '',
    notes: data.notes ?? '',
  };

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, row }),
  });

  if (!res.ok) {
    throw new Error(`sheets webhook returned ${res.status}`);
  }
}
