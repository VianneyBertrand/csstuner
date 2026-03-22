/**
 * License key management.
 * Uses Vercel KV if available, falls back to in-memory Map.
 * For production, set up Vercel KV (free tier: 256MB).
 */

// In-memory fallback (works for single instance, not scaled)
const memoryStore = new Map<string, { email: string; created: string }>();

/**
 * Generate a random license key: cst_xxxxxxxxxxxx
 */
export function generateKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let key = 'cst_';
  for (let i = 0; i < 24; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

/**
 * Store a license key.
 */
export async function storeKey(key: string, email: string): Promise<void> {
  const kvUrl = getKvUrl();
  const kvToken = getKvToken();

  if (kvUrl && kvToken) {
    // Vercel KV (Redis-compatible)
    await fetch(`${kvUrl}/set/${key}/${encodeURIComponent(JSON.stringify({ email, created: new Date().toISOString() }))}`, {
      headers: { Authorization: `Bearer ${kvToken}` },
    });
  } else {
    // In-memory fallback
    memoryStore.set(key, { email, created: new Date().toISOString() });
  }
}

/**
 * Validate a license key. Returns true if valid.
 */
export async function validateKey(key: string): Promise<boolean> {
  if (!key || !key.startsWith('cst_')) return false;

  const kvUrl = getKvUrl();
  const kvToken = getKvToken();

  if (kvUrl && kvToken) {
    const res = await fetch(`${kvUrl}/get/${key}`, {
      headers: { Authorization: `Bearer ${kvToken}` },
    });
    const data = await res.json() as { result: string | null };
    return data.result !== null;
  } else {
    return memoryStore.has(key);
  }
}

function getKvUrl(): string | undefined {
  try { return import.meta.env.KV_REST_API_URL; } catch { return undefined; }
}

function getKvToken(): string | undefined {
  try { return import.meta.env.KV_REST_API_TOKEN; } catch { return undefined; }
}
