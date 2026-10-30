import '@testing-library/jest-dom'
import { vi } from 'vitest'

// ── IndexedDB mock via fake-indexeddb ────────────────────────────────────────
import 'fake-indexeddb/auto'

// ── WebCrypto shim (Node 18+ has it natively, but needs to be assigned) ──────
import { webcrypto } from 'node:crypto'
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  })
}

// ── navigator.storage mock ────────────────────────────────────────────────────
Object.defineProperty(globalThis.navigator, 'storage', {
  value: {
    persist:  vi.fn().mockResolvedValue(true),
    estimate: vi.fn().mockResolvedValue({ quota: 10 * 1024 * 1024 * 1024, usage: 1024 * 1024 }),
    persisted: vi.fn().mockResolvedValue(true),
  },
  configurable: true,
})

// ── navigator.onLine ──────────────────────────────────────────────────────────
Object.defineProperty(globalThis.navigator, 'onLine', {
  value: true,
  configurable: true,
  writable: true,
})

// ── BroadcastChannel stub ─────────────────────────────────────────────────────
globalThis.BroadcastChannel = class {
  name: string
  constructor(name: string) { this.name = name }
  postMessage = vi.fn()
  addEventListener = vi.fn()
  removeEventListener = vi.fn()
  close = vi.fn()
} as unknown as typeof BroadcastChannel
