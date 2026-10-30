# 🩺 RuralCare — Autonomous Offline-First Healthcare Workstation

> **Empowering rural healthcare clinicians with browser-based AI, offline cryptographic records, 3D anatomical spatial mapping, and resilient distributed synchronization.**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#)
[![Tests](https://img.shields.io/badge/tests-18%2F18%20passing-brightgreen)](#)
[![PWA](https://img.shields.io/badge/PWA-Workbox%20v2.0-blue)](#)
[![Three.js](https://img.shields.io/badge/3D%20Graphics-Three.js%20WebGL-cyan)](#)
[![Offline Storage](https://img.shields.io/badge/storage-Dexie%20IndexedDB-orange)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](#)

---

## 🌟 Executive Summary

**RuralCare** is engineered specifically for doctors, community health workers, and humanitarian responders operating in remote clinics with intermittent, high-latency, or absent internet connectivity.

Unlike traditional cloud-dependent EHRs (Electronic Health Records) that lock clinicians out or lose uncommitted notes during network drops, RuralCare operates on a **Local-First Distributed Architecture**:
1. **The browser device is a self-sufficient clinical node** with local IndexedDB storage.
2. **Every consultation, patient triage, and edit is committed locally in an atomic transaction** alongside a persistent outbox queue record.
3. **Interactive Three.js 3D visualizations** provide tactile anatomical symptom tagging and real-time mesh sync topology tracking without requiring external model downloads.
4. **When network connectivity returns**, the synchronization engine reconciles local changes with the central ledger using deterministic UUIDv7 ordering, SHA-256 cryptographic payload verification, and explicit conflict resolution.

---

## 🎮 Interactive 3D Visual Engine (Three.js)

To provide an intuitive, high-efficiency interface in high-stress field conditions, RuralCare integrates lightweight, procedural **Three.js WebGL visualizations** designed for 60 FPS performance on modest laptops and tablets:

### 1. 🌐 3D Bio-Mesh Telemetry Hero (`ThreeHeroCanvas`)
- **Location:** Dashboard header.
- **Functionality:** 
  - Represents the local clinical node's connectivity status through a bioluminescent particle constellation and geodesic core.
  - Features real-time pointer parallax (mouse movement tilts and rotates the constellation).
  - Simulates a 70 BPM cardiovascular pulse rhythm that accelerates during synchronization packet transmission.
  - Interactive shockwave ripple on pointer click.
  - Distinct visual states: *Vibrant Cyan/Emerald (Online Telemetry)* vs *Warm Amber (Autonomous Field Mode)*.

### 2. 👤 3D Anatomical Symptom Pinpointer (`ThreeAnatomyViewer`)
- **Location:** Consultation Editor & Clinical Records.
- **Functionality:**
  - Procedural wireframe + point-cloud 3D mannequin representing human body regions (*Head & Cranial, Thorax & Chest, Abdomen, Pelvic Region, Upper Extremities, Lower Extremities*).
  - **Raycasting Interaction:** Hovering over a body segment illuminates it with a futuristic medical scanner aura.
  - **Single-Click Tagging:** Clicking a body part pings a glowing green pulse, selects the region, and automatically inserts clinical anatomical tags (`[Target Anatomy: Thorax & Chest - Cardiopulmonary]`) directly into the consultation notes.
  - 360-degree interactive drag-to-rotate and camera reset controls.

### 3. 🛰️ 3D Distributed Mesh Topology (`ThreeSyncTopology`)
- **Location:** Sync Center.
- **Functionality:**
  - Visualizes the local device node, floating outbox queue packets in circular orbits, and the remote cloud relay gateway.
  - Color-codes packet orbits based on status (*Violet = Pending, Blue = Sending, Green = Synced, Red = Conflict*).
  - During synchronization, active Bezier energy splines stream data packets dynamically from the local node to the cloud gateway.

---

## 🏗️ System Architecture & Engineering Principles

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RURALCARE WEB APPLICATION                       │
│                                                                        │
│  ┌───────────────────────┐  ┌───────────────────────────────────────┐  │
│  │   UI & 3D Visuals     │  │          Reactive State               │  │
│  │  • Three.js WebGL     │  │  • DeviceContext (Keyring & Station)  │  │
│  │  • Tailwind CSS Dark  │  │  • SyncContext (Network & Outbox)     │  │
│  │  • Audio Waveforms    │  │  • ToastContext (Real-time alerts)    │  │
│  └───────────┬───────────┘  └───────────────────┬───────────────────┘  │
│              │                                  │                      │
│  ┌───────────▼──────────────────────────────────▼───────────────────┐  │
│  │                    DEXIE INDEXEDDB STORAGE                       │  │
│  │  • patients         (demographics, allergies, conditions)        │  │
│  │  • consultations    (clinical notes, status: draft/reviewed)     │  │
│  │  • outbox           (atomic operation ledger with SHA-256 hashes)│  │
│  │  • deviceState      (device identity & sync locks)               │  │
│  │  • conflicts        (base/local/remote snapshots for 3-way merge)│  │
│  └───────────────────────────────┬──────────────────────────────────┘  │
│                                  │                                     │
│  ┌───────────────────────────────▼──────────────────────────────────┐  │
│  │              DISTRIBUTED SYNCHRONIZATION ENGINE                  │  │
│  │  • UUIDv7 Deterministic Time-Ordering                            │  │
│  │  • Exponential Backoff & Jitter Retry Loop                       │  │
│  │  • 3-Way Snapshot Conflict Detection                             │  │
│  │  • Service Worker PWA Cache (Workbox Offline Assets)             │  │
│  └───────────────────────────────┬──────────────────────────────────┘  │
└──────────────────────────────────┼─────────────────────────────────────┘
                                   │ HTTPS / TLS (When online)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      CENTRAL REGIONAL HEALTH LEDGER                    │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. Atomic Outbox Transaction Pattern
Every clinical action that mutates patient data executes within a **single Dexie IndexedDB read-write transaction**:
```typescript
await db.transaction('rw', [db.patients, db.outbox], async () => {
  await db.patients.add(patient);
  await db.outbox.add({
    id: uuidv7(),
    orgId,
    deviceId,
    entityId: patient.id,
    entityType: 'patient',
    operationType: 'create',
    baseVersion: 0,
    schemaVersion: 1,
    payload: JSON.stringify(patient),
    payloadHash: await sha256Hex(JSON.stringify(patient)),
    clientCreatedAt: patient.createdAt,
    status: 'pending',
    retryCount: 0,
  });
});
```
*Result:* A record can never exist locally without its corresponding sync outbox entry. Changes can never be lost if the tab crashes or power cuts out.

### 2. Time-Ordered Identifiers (UUIDv7)
- IDs are generated client-side using **UUIDv7** (RFC 9562).
- Combines a 48-bit millisecond timestamp with cryptographically secure random bits.
- Guarantees natural chronological B-Tree sorting in IndexedDB and eliminates primary-key collision risks across independent clinic laptops.

### 3. Storage Quota Resilience (`QuotaExceededError`)
When browser storage reaches disk limits, saves do not silently fail. RuralCare intercepts `QuotaExceededError`, displays actionable UI alerts guiding the clinician to clear old local caches, and leaves uncommitted inputs intact in memory.

---

## 🗺️ How to Approach and Build This Application

If you are building or extending RuralCare, follow this phased roadmap:

### 📍 Phase 1: Local-First Core & Outbox Engine (✅ Completed)
- **Goal:** Robust client-side database, schema migrations, and outbox durability.
- **Tech:** React 18, Vite, TypeScript, Tailwind CSS, Dexie 4.
- **Checklist:**
  - [x] Provision device identity and persist `DeviceState` in IndexedDB.
  - [x] CRUD operations for patients and consultations with live Dexie hooks.
  - [x] Atomic outbox writes with SHA-256 payload hashing.
  - [x] Three.js interactive 3D hero, 3D anatomical symptom pinpointer, and mesh topology.
  - [x] Comprehensive Vitest acceptance test suite with `fake-indexeddb`.

### 📍 Phase 2: Field Keyring & Zero-Knowledge Encryption (⏳ Next)
- **Goal:** HIPAA/GDPR compliant field-level encryption before writing to IndexedDB.
- **Approach:**
  - Derive clinician master key using `PBKDF2` (100,000 iterations) or `Argon2id` from clinician PIN.
  - Generate an asymmetric `ECDH` (P-256) or `X25519` keypair for device enrollment.
  - Encrypt all patient demographic fields and consultation notes using `AES-GCM-256`.
  - Non-encrypted metadata kept minimal: `orgId`, `entityType`, `updatedAt` for sync indexing.

### 📍 Phase 3: Bi-directional Synchronization & 3-Way Merge
- **Goal:** Resilient HTTP push/pull sync engine with concurrent edit detection.
- **Approach:**
  - **Push Pipeline:** Scan pending outbox items sorted by `clientCreatedAt`. Transmit in batches of 20 with idempotency headers (`X-Operation-ID: <uuidv7>`).
  - **Pull Pipeline:** Request server changes where `server_version > last_synced_version`.
  - **Conflict Detection:** Compare `baseVersion` against the server's current version. If mismatch detected:
    - Retain `localSnapshot`, `remoteSnapshot`, and `baseSnapshot`.
    - Flag operation as `conflict` and display in the **3-Panel Conflict Resolution Screen**.
    - Allow clinician to choose *Keep Mine*, *Accept Remote*, or *Merge Clinical Fields*.

### 📍 Phase 4: Edge Voice Dictation & Document OCR
- **Goal:** Hands-free clinical documentation in busy field clinics.
- **Approach:**
  - **Audio Recording:** Capture microphone input via `MediaRecorder` API into 16kHz WAV blobs.
  - **Offline Transcription:** Execute Whisper-tiny/base compiled to WebAssembly (via ONNX Runtime Web or Transformers.js) directly inside a Web Worker.
  - **Document OCR:** Process photo scans of immunization cards or lab sheets using `Tesseract.js` in a background worker.

### 📍 Phase 5: Browser-Based Local LLM Clinical Extraction
- **Goal:** Structure messy dictated notes into standardized SOAP format (Subjective, Objective, Assessment, Plan).
- **Approach:**
  - Run quantized 1B–3B parameter LLM (e.g. Llama 3.2 1B or Gemma 2B) locally in the browser using **WebLLM** (WebGPU).
  - Extract structured JSON: chief complaint, symptoms, triage level, prescribed medications.
  - Validate extracted JSON against Zod clinical schemas with human-in-the-loop review.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18.0+ or Node.js 20.0+
- npm 9.0+ or pnpm 8.0+

### 1. Installation
```bash
# Clone repository
git clone https://github.com/gourav-builds/Rural_Health.git
cd Rural_Health

# Install dependencies
npm install
```

### 2. Development Server
```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser.

### 3. Running Unit Tests
```bash
# Run Vitest acceptance tests
npm test

# Run interactive Vitest UI
npm run test:ui
```

### 4. Production Build & PWA Testing
```bash
# Build optimized production bundle + PWA service worker
npm run build

# Preview production build locally
npm run preview
```

---

## 📂 Project Directory Structure

```
d:/RuralHealth/
├── public/                 # Static PWA manifests and app icons
├── src/
│   ├── components/         # Reusable UI & Layout Components
│   │   ├── three/          # Three.js 3D WebGL Components
│   │   │   ├── ThreeHeroCanvas.tsx      # 3D Bio-mesh telemetry hero
│   │   │   ├── ThreeAnatomyViewer.tsx   # 3D Anatomical symptom pinpointer
│   │   │   └── ThreeSyncTopology.tsx    # 3D Distributed mesh topology
│   │   ├── AppLayout.tsx               # Main responsive layout shell
│   │   ├── AudioWaveform.tsx           # Real-time reactive audio visualizer
│   │   ├── Icons.tsx                   # Accessible SVG icons
│   │   ├── Sidebar.tsx                 # Desktop navigation & sync status
│   │   ├── StatusBadges.tsx            # Sync & clinical status pills
│   │   ├── StorageWarningBanner.tsx    # QuotaExceededError warning
│   │   ├── ToastContainer.tsx          # Floating reactive notifications
│   │   └── TopBar.tsx                  # Mobile header & connectivity indicator
│   ├── context/            # React Global State Providers
│   │   ├── DeviceContext.tsx           # Station enrollment & storage telemetry
│   │   ├── SyncContext.tsx             # Outbox queue & online/offline listener
│   │   └── ToastContext.tsx            # Global reactive toast dispatch
│   ├── db/                 # Local-First Database Layer (Dexie)
│   │   ├── index.ts                    # Dexie schema & transaction outbox
│   │   ├── patients.ts                 # Patient repository & search
│   │   └── consultations.ts            # Consultation repository & lifecycle
│   ├── screens/            # Application Views / Routes
│   │   ├── DashboardScreen.tsx         # 3D Hero, recent triage, quick stats
│   │   ├── PatientsScreen.tsx          # Patient search with debounced index
│   │   ├── PatientRegistrationScreen.tsx # New patient intake form
│   │   ├── PatientProfileScreen.tsx    # Patient history & consultation timeline
│   │   ├── ConsultationEditorScreen.tsx# 3D Anatomy pinpointer & dictation editor
│   │   ├── ConsultationDetailScreen.tsx# Clinical audit & review view
│   │   ├── SyncCenterScreen.tsx        # 3D Topology, outbox queue & conflicts
│   │   ├── ConflictResolutionScreen.tsx# 3-Way diff and merge view
│   │   ├── SettingsScreen.tsx          # Storage quota breakdown & device info
│   │   └── SetupScreen.tsx             # First-time station enrollment
│   ├── test/               # Vitest Automated Test Suite
│   │   ├── db.test.ts                  # M1 acceptance criteria unit tests
│   │   └── setup.ts                    # fake-indexeddb & WebCrypto shims
│   ├── types/              # Domain TypeScript interfaces
│   │   └── index.ts                    # Patient, Consultation, Outbox, Device
│   └── utils/              # Cryptographic & Formatting Utilities
│       └── index.ts                    # UUIDv7, SHA-256 WebCrypto, date formatters
├── vite.config.ts          # Vite 5, PWA Workbox & Vitest configuration
├── tailwind.config.js      # Medical dark theme color tokens
└── package.json            # Project manifest
```

---

## 🧪 Acceptance Test Verification Matrix

All 18 acceptance tests pass deterministically on every commit:

| Test ID | Test Description | Status |
|---------|------------------|:------:|
| `M1-01` | UUIDv7 generates 1000 unique IDs without collision | ✅ PASS |
| `M1-02` | UUIDv7 IDs maintain strict chronological sort order | ✅ PASS |
| `M1-03` | UUIDv7 conforms to RFC 9562 standard format | ✅ PASS |
| `M1-04` | SHA-256 WebCrypto produces deterministic 64-char hex | ✅ PASS |
| `M1-05` | SHA-256 distinguishes different payload contents | ✅ PASS |
| `M1-06` | `createPatient` writes patient + outbox in same transaction | ✅ PASS |
| `M1-07` | Each save writes unique operation ID for idempotency | ✅ PASS |
| `M1-08` | `QuotaExceededError` propagates cleanly without data loss | ✅ PASS |
| `M1-09` | `createConsultation` assigns `draft` clinical status | ✅ PASS |
| `M1-10` | Editing a `reviewed` consultation auto-promotes to `amended` | ✅ PASS |
| `M1-11` | Editing a `draft` consultation maintains `draft` status | ✅ PASS |
| `M1-12` | `softDeletePatient` creates tombstone + outbox delete op | ✅ PASS |
| `M1-13` | Soft-deleted patients excluded from search results | ✅ PASS |
| `M1-14` | Keyword search matches first name, last name, and phone | ✅ PASS |
| `M1-15` | Keyword search properly scopes to clinician's `orgId` | ✅ PASS |
| `M1-16` | `DeviceState` persists across IndexedDB database re-open | ✅ PASS |
| `M1-17` | Pending outbox entries survive database disconnects | ✅ PASS |
| `M1-18` | Outbox status transitions correctly track lifecycle | ✅ PASS |

---

## 🔒 Security & Medical Data Governance

1. **Zero Unencrypted LocalStorage:** Clinical patient data and consultation notes are **never** stored in `localStorage` or `sessionStorage` (which are vulnerable to XSS and lack transactional guarantees). All records reside in structured IndexedDB stores.
2. **Cryptographic Integrity:** Every outbox record includes a SHA-256 hash of its JSON payload, allowing the central ledger to verify that records were not tampered with while stored on field devices.
3. **Audit Immutability:** Editing an approved clinical consultation never overwrites clinical history; the system automatically creates an `amended` revision with timestamped clinician attribution.

---

## 📄 License & Credits

Distributed under the MIT License. Designed and engineered for rural healthcare workers worldwide.
