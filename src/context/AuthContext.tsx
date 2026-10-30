import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/db';
import type { DeviceState, ClinicianProfile, ClinicianRole } from '@/types';
import { uuidv7, now, generateSalt, hashPin, verifyPin } from '@/utils';

// Auto-lock inactivity duration: 10 minutes (600,000 ms)
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_COOLDOWN_MS = 30 * 1000; // 30s lockout after 5 fails

interface AuthContextValue {
  clinician: ClinicianProfile | null;
  device: DeviceState | null;
  isAuthenticated: boolean;
  isLocked: boolean;
  isEnrolled: boolean;
  isLoading: boolean;
  failedAttempts: number;
  lockoutUntil: number | null;
  login: (pin: string) => Promise<{ success: boolean; error?: string }>;
  unlock: (pin: string) => Promise<{ success: boolean; error?: string }>;
  lockStation: () => void;
  logout: () => void;
  enrollClinician: (name: string, role: ClinicianRole, pin: string, clinicName?: string) => Promise<void>;
  updatePin: (oldPin: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Safe session storage helpers (safeguards against browser privacy/quota restrictions)
function getSessionToken(): string | null {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('ruralcare_active_session') : null;
  } catch {
    return null;
  }
}

function setSessionToken(userId: string): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('ruralcare_active_session', userId);
    }
  } catch {
    // Ignore storage restriction
  }
}

function clearSessionToken(): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('ruralcare_active_session');
    }
  } catch {
    // Ignore storage restriction
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [device, setDevice] = useState<DeviceState | null>(null);
  const [clinician, setClinician] = useState<ClinicianProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  const lastActivityRef = useRef<number>(Date.now());

  // Load device on mount
  useEffect(() => {
    let mounted = true;
    db.deviceState.get('singleton').then(state => {
      if (!mounted) return;
      if (state) {
        setDevice(state);
        // Build clinician profile from device state
        const profile: ClinicianProfile = {
          id: state.userId,
          name: state.displayName,
          role: state.role ?? 'doctor',
          pinSalt: state.pinSalt ?? '',
          pinHash: state.pinHash ?? '',
          clinicName: state.clinicName ?? 'Rural Care Station',
          createdAt: state.enrolledAt,
          lastLoginAt: state.lastLoginAt,
        };
        setClinician(profile);

        // If an active session exists in this browser tab, restore session
        const activeSession = getSessionToken();
        if (activeSession && activeSession === state.userId) {
          setIsAuthenticated(true);
          setIsLocked(false);
        } else if (!state.pinHash) {
          // If no PIN was setup (legacy M1), allow immediate auth
          setIsAuthenticated(true);
          setIsLocked(false);
        } else {
          // New window/tab requires clinical PIN verification
          setIsAuthenticated(false);
          setIsLocked(false);
        }
      }
      setIsLoading(false);
    });

    return () => { mounted = false; };
  }, []);

  // Inactivity auto-lock listener
  const resetInactivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || isLocked) return;

    const checkInactivity = () => {
      if (Date.now() - lastActivityRef.current > INACTIVITY_TIMEOUT_MS) {
        setIsLocked(true);
      }
    };

    const interval = window.setInterval(checkInactivity, 15000);

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(evt => window.addEventListener(evt, resetInactivity, { passive: true }));

    return () => {
      window.clearInterval(interval);
      events.forEach(evt => window.removeEventListener(evt, resetInactivity));
    };
  }, [isAuthenticated, isLocked, resetInactivity]);

  // Lock station manually (e.g. keyboard shortcut or lock button)
  const lockStation = useCallback(() => {
    setIsLocked(true);
  }, []);

  // Terminate session
  const logout = useCallback(() => {
    clearSessionToken();
    setIsAuthenticated(false);
    setIsLocked(false);
  }, []);

  // Verify PIN helper with rate limiting
  const verifyPinInternal = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remainingSecs = Math.ceil((lockoutUntil - Date.now()) / 1000);
      return { success: false, error: `Station locked due to excessive failed attempts. Wait ${remainingSecs}s.` };
    }

    if (!device?.pinSalt || !device?.pinHash) {
      // Legacy device without PIN
      return { success: true };
    }

    const isValid = await verifyPin(pin, device.pinSalt, device.pinHash);

    if (isValid) {
      setFailedAttempts(0);
      setLockoutUntil(null);
      return { success: true };
    } else {
      const nextFailCount = failedAttempts + 1;
      setFailedAttempts(nextFailCount);

      if (nextFailCount >= MAX_FAILED_ATTEMPTS) {
        const lockoutTime = Date.now() + LOCKOUT_COOLDOWN_MS;
        setLockoutUntil(lockoutTime);
        return {
          success: false,
          error: `Incorrect PIN (${nextFailCount}/${MAX_FAILED_ATTEMPTS}). Station locked for 30 seconds.`,
        };
      }

      return {
        success: false,
        error: `Invalid clinical PIN (${MAX_FAILED_ATTEMPTS - nextFailCount} attempts remaining).`,
      };
    }
  };

  // Login handler
  const login = useCallback(async (pin: string): Promise<{ success: boolean; error?: string }> => {
    const res = await verifyPinInternal(pin);
    if (res.success) {
      setIsAuthenticated(true);
      setIsLocked(false);
      lastActivityRef.current = Date.now();

      if (device?.userId) {
        setSessionToken(device.userId);
      }

      // Update lastLoginAt
      if (device) {
        const updated: DeviceState = {
          ...device,
          lastLoginAt: now(),
        };
        await db.deviceState.put(updated);
        setDevice(updated);
      }
    }
    return res;
  }, [device, verifyPinInternal]);

  // Unlock handler
  const unlock = useCallback(async (pin: string): Promise<{ success: boolean; error?: string }> => {
    const res = await verifyPinInternal(pin);
    if (res.success) {
      setIsLocked(false);
      lastActivityRef.current = Date.now();
    }
    return res;
  }, [verifyPinInternal]);

  // Enroll clinician with cryptographic salt & PIN hash
  const enrollClinician = useCallback(async (
    name: string,
    role: ClinicianRole,
    pin: string,
    clinicName: string = 'Rural Care Station'
  ) => {
    const salt = generateSalt();
    const hash = await hashPin(pin, salt);

    const newState: DeviceState = {
      id: 'singleton',
      deviceId: uuidv7(),
      orgId: `org-${uuidv7().slice(0, 8)}`,
      userId: uuidv7(),
      displayName: name,
      clinicName,
      role,
      pinSalt: salt,
      pinHash: hash,
      enrolledAt: now(),
      lastLoginAt: now(),
      syncLockOwner: null,
      syncLockExpiry: null,
    };

    await db.deviceState.put(newState);
    setDevice(newState);

    const profile: ClinicianProfile = {
      id: newState.userId,
      name,
      role,
      pinSalt: salt,
      pinHash: hash,
      clinicName,
      createdAt: newState.enrolledAt,
      lastLoginAt: newState.lastLoginAt,
    };

    setClinician(profile);
    setSessionToken(newState.userId);
    setIsAuthenticated(true);
    setIsLocked(false);
    lastActivityRef.current = Date.now();
  }, []);

  // Update PIN
  const updatePin = useCallback(async (oldPin: string, newPin: string): Promise<{ success: boolean; error?: string }> => {
    if (!device?.pinSalt || !device?.pinHash) {
      return { success: false, error: 'Device not enrolled.' };
    }
    const isOldValid = await verifyPin(oldPin, device.pinSalt, device.pinHash);
    if (!isOldValid) {
      return { success: false, error: 'Current PIN is incorrect.' };
    }

    const newSalt = generateSalt();
    const newHash = await hashPin(newPin, newSalt);

    const updated: DeviceState = {
      ...device,
      pinSalt: newSalt,
      pinHash: newHash,
    };

    await db.deviceState.put(updated);
    setDevice(updated);
    return { success: true };
  }, [device]);

  return (
    <AuthContext.Provider
      value={{
        clinician,
        device,
        isAuthenticated,
        isLocked,
        isEnrolled: device !== null,
        isLoading,
        failedAttempts,
        lockoutUntil,
        login,
        unlock,
        lockStation,
        logout,
        enrollClinician,
        updatePin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
