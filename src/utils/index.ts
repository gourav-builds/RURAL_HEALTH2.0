/**
 * UUIDv7 generator — time-ordered, offline-safe.
 * Spec: https://www.ietf.org/rfc/rfc9562.html#section-5.7
 *
 * Layout (128 bits):
 *   48 bits unix_ts_ms | 4 bits ver=7 | 12 bits rand_a | 2 bits var=0b10 | 62 bits rand_b
 */
export function uuidv7(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  const ms = BigInt(Date.now());

  // unix_ts_ms (48 bits) — bytes 0-5
  bytes[0] = Number((ms >> 40n) & 0xffn);
  bytes[1] = Number((ms >> 32n) & 0xffn);
  bytes[2] = Number((ms >> 24n) & 0xffn);
  bytes[3] = Number((ms >> 16n) & 0xffn);
  bytes[4] = Number((ms >>  8n) & 0xffn);
  bytes[5] = Number( ms         & 0xffn);

  // Version 7 — high nibble of byte 6
  bytes[6] = (bytes[6] & 0x0f) | 0x70;

  // Variant bits 0b10xx — high bits of byte 8
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  // Format as UUID string
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

/**
 * SHA-256 hash of a string, returned as hex.
 * Uses native WebCrypto — no external dependency.
 */
export async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('');
}

/** ISO-8601 timestamp string */
export const now = (): string => new Date().toISOString();

/** Display-friendly date */
export const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));

/** Display-friendly datetime */
export const formatDateTime = (iso: string): string =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));

/** Calculate age from ISO date */
export const calcAge = (dob: string): number => {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

/** Exponential backoff with jitter (ms) */
export function backoffMs(retryCount: number, baseMs = 2000, maxMs = 300_000): number {
  const exp = Math.min(baseMs * Math.pow(2, retryCount), maxMs);
  const jitter = Math.random() * 1000;
  return Math.floor(exp + jitter);
}

/** Clamp a value between min and max */
export const clamp = (val: number, min: number, max: number): number =>
  Math.min(Math.max(val, min), max);

/** Format bytes to human-readable */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};
