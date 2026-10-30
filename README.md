# RuralCare — Milestone 1

**Offline-first healthcare records for rural clinicians**

> ✅ Milestone 1 complete: Application shell, offline patient records, consultation editor, sync outbox, unit tests.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start dev server (http://localhost:5173)
npm run dev

# 3. Run unit tests
npm test

# 4. Run tests with UI
npm run test:ui
```

## Tech Stack (M1)

| Layer | Choice |
|-------|--------|
| Frontend | React 18 + TypeScript + Vite 5 |
| Styling | Tailwind CSS 3 (dark theme) |
| Local DB | Dexie 4 (IndexedDB) |
| Routing | React Router 6 |
| PWA | vite-plugin-pwa (Workbox) |
| Tests | Vitest 2 + fake-indexeddb |

## Milestone Status

| Milestone | Status |
|-----------|--------|
| M1 — App shell + offline records | ✅ **Complete** |
| M2 — Auth + E2E encryption | ⏳ Next |
| M3 — Sync engine + conflicts | ⏳ Planned |
| M4 — OCR + Voice transcription | ⏳ Planned |
| M5 — AI extraction + review | ⏳ Planned |
| M6 — Local history retrieval | ⏳ Planned |
| M7 — Hardening + E2E tests | ⏳ Planned |

## Key Design Decisions

- **UUIDv7** for all IDs — time-ordered, offline-safe, no server needed
- **Every write** creates an outbox entry in the **same Dexie transaction** — offline changes are never lost
- **QuotaExceededError** is caught and surfaces an actionable message — saves never silently fail
- **"Saved on device"** vs **"Synced"** distinction shown on every record badge
- Clinical data is **never in localStorage** or HTTP caches — only IndexedDB

## M1 Acceptance Criteria

Run `npm test` to verify:

- [x] UUIDv7 generates 1000 unique time-ordered IDs
- [x] SHA-256 is deterministic
- [x] Patient create → patient + outbox entry in same transaction
- [x] QuotaExceededError propagates (never silent fail)
- [x] Consultation creates with `draft` status
- [x] Edit after `reviewed` → auto-promotes to `amended`
- [x] Soft delete creates tombstone + excludes from list
- [x] Keyword search scoped to org
- [x] DeviceState persists in IndexedDB
- [x] Outbox entries survive DB re-open

## Environment

No `.env` required for M1 (fully local). M2 will add:

```env
VITE_API_URL=https://api.ruralcare.example
```

## Project Structure

```
src/
├── db/             # Dexie schema + patient/consultation repositories
├── context/        # DeviceContext, SyncContext
├── components/     # Sidebar, TopBar, Icons, Badges, Layout
├── screens/        # One file per screen
├── utils/          # UUIDv7, SHA-256, formatters, backoff
├── types/          # TypeScript interfaces
└── test/           # Vitest setup + unit tests
```
