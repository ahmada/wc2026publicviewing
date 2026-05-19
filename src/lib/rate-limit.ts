const HOURLY_LIMIT = 3;
const DAILY_LIMIT = 20;

async function hashIp(ip: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

export async function checkRateLimit(
  ip: string,
  kv: KVNamespace,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const hash = await hashIp(ip);
  const hourKey = `rl:h:${hash}`;
  const dayKey = `rl:d:${hash}`;

  const [hourRaw, dayRaw] = await Promise.all([kv.get(hourKey), kv.get(dayKey)]);
  const hourCount = hourRaw ? parseInt(hourRaw, 10) : 0;
  const dayCount = dayRaw ? parseInt(dayRaw, 10) : 0;

  if (hourCount >= HOURLY_LIMIT) return { allowed: false, retryAfter: 3600 };
  if (dayCount >= DAILY_LIMIT) return { allowed: false, retryAfter: 86400 };

  await Promise.all([
    kv.put(hourKey, String(hourCount + 1), { expirationTtl: 3600 }),
    kv.put(dayKey, String(dayCount + 1), { expirationTtl: 86400 }),
  ]);

  return { allowed: true };
}
