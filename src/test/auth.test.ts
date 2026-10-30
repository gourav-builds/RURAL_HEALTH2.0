import { describe, it, expect, beforeEach } from 'vitest';
import { generateSalt, hashPin, verifyPin, uuidv7, now } from '@/utils';
import { db } from '@/db';
import type { DeviceState, ClinicianRole } from '@/types';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('Authentication & Cryptographic Security', () => {
  it('generateSalt creates unique 32-character hex strings', () => {
    const salts = Array.from({ length: 50 }, () => generateSalt());
    expect(new Set(salts).size).toBe(50);
    salts.forEach(s => {
      expect(s).toMatch(/^[0-9a-f]{32}$/);
    });
  });

  it('hashPin is deterministic for identical PIN and salt', async () => {
    const pin = '1234';
    const salt = 'abcdef0123456789abcdef0123456789';
    const hash1 = await hashPin(pin, salt);
    const hash2 = await hashPin(pin, salt);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('different salts yield different hashes for the same PIN', async () => {
    const pin = '5678';
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    const hash1 = await hashPin(pin, salt1);
    const hash2 = await hashPin(pin, salt2);
    expect(hash1).not.toBe(hash2);
  });

  it('verifyPin correctly validates valid PIN and rejects invalid PIN', async () => {
    const pin = '9876';
    const salt = generateSalt();
    const hash = await hashPin(pin, salt);

    const valid = await verifyPin(pin, salt, hash);
    expect(valid).toBe(true);

    const wrongPin = await verifyPin('0000', salt, hash);
    expect(wrongPin).toBe(false);

    const wrongLength = await verifyPin('987', salt, hash);
    expect(wrongLength).toBe(false);
  });

  it('persists clinician profile, role and PIN hash in IndexedDB deviceState', async () => {
    const salt = generateSalt();
    const hash = await hashPin('4321', salt);
    const role: ClinicianRole = 'nurse';

    const state: DeviceState = {
      id: 'singleton',
      deviceId: uuidv7(),
      orgId: 'org-health-post-1',
      userId: uuidv7(),
      displayName: 'Sister Anjali',
      clinicName: 'Primary Health Sub-centre',
      role,
      pinSalt: salt,
      pinHash: hash,
      enrolledAt: now(),
      lastLoginAt: now(),
      syncLockOwner: null,
      syncLockExpiry: null,
    };

    await db.deviceState.put(state);

    const stored = await db.deviceState.get('singleton');
    expect(stored?.displayName).toBe('Sister Anjali');
    expect(stored?.role).toBe('nurse');
    expect(stored?.clinicName).toBe('Primary Health Sub-centre');
    expect(stored?.pinSalt).toBe(salt);
    expect(stored?.pinHash).toBe(hash);

    // Verify stored hash against PIN
    const isValid = await verifyPin('4321', stored!.pinSalt!, stored!.pinHash!);
    expect(isValid).toBe(true);
  });

  it('works in non-secure HTTP contexts where crypto.subtle is undefined', async () => {
    const originalSubtle = crypto.subtle;
    try {
      // Simulate non-secure context (e.g. tablet accessing http://192.168.x.x/)
      Object.defineProperty(crypto, 'subtle', { value: undefined, configurable: true });

      const pin = '2468';
      const salt = generateSalt();
      const hash = await hashPin(pin, salt);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);

      const isValid = await verifyPin(pin, salt, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPin('1111', salt, hash);
      expect(isInvalid).toBe(false);
    } finally {
      Object.defineProperty(crypto, 'subtle', { value: originalSubtle, configurable: true });
    }
  });
});
