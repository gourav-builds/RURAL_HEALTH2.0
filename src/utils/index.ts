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
 * Pure JS SHA-256 fallback.
 * Essential for non-secure HTTP contexts (e.g. tablet accessing local LAN IP 192.168.x.x)
 * where window.crypto.subtle is undefined per W3C WebCrypto specification.
 */
function sha256Fallback(ascii: string): string {
  const rightRotate = (value: number, amount: number) => (value >>> amount) | (value << (32 - amount));

  let i = 0, j = 0;
  let result = '';
  const words: number[] = [];

  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  const utf8 = unescape(encodeURIComponent(ascii));
  for (i = 0; i < utf8.length; i++) {
    words[i >> 2] |= (utf8.charCodeAt(i) & 0xff) << ((3 - (i % 4)) * 8);
  }

  words[utf8.length >> 2] |= 0x80 << ((3 - (utf8.length % 4)) * 8);
  words[(((utf8.length + 8) >> 6) << 4) + 15] = utf8.length * 8;

  const w = new Array(64);
  for (i = 0; i < words.length; i += 16) {
    let a = hash[0], b = hash[1], c = hash[2], d = hash[3];
    let e = hash[4], f = hash[5], g = hash[6], h = hash[7];

    for (j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j] | 0;
      } else {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }

      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + k[j] + w[j]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }

  return result;
}

/**
 * SHA-256 hash of a string, returned as hex.
 * Uses native WebCrypto when available in secure contexts, with pure JS fallback for LAN/HTTP.
 */
export async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle?.digest) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const buffer = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fall through to JS fallback
    }
  }
  return sha256Fallback(input);
}

/** Generate 16-byte cryptographically secure random salt */
export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/** Compute salted cryptographic hash for PIN / Password */
export async function hashPin(pin: string, salt: string): Promise<string> {
  return sha256Hex(`ruralcare:${salt}:${pin}:clinical_security`);
}

/** Verify PIN against stored salt and hash */
export async function verifyPin(pin: string, salt: string, expectedHash: string): Promise<boolean> {
  const computed = await hashPin(pin, salt);
  return computed === expectedHash;
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
