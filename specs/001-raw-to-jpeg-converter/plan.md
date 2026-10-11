# Implementation Plan: RAW to JPEG Folder Converter

**Branch**: `001-raw-to-jpeg-converter` | **Date**: 2026-10-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-raw-to-jpeg-converter/spec.md`

## Summary

A static, publicly hosted web page that converts a folder of camera RAW files into JPEGs in a
second folder, entirely on the user's own machine. The user picks a source folder and a
destination folder through the browser's File System Access API; the page scans the source for
supported RAW files, extracts the full-size JPEG preview the camera embedded in each one, and
writes it to the destination.

The defining technical choice, settled in the spec: output comes from the **embedded preview**,
not from decoding sensor data. For the Fujifilm files this is built for, that preserves the
film simulation chosen at capture and sidesteps X-Trans demosaicing entirely. It also makes the
default path a **byte-for-byte copy** of the camera's own JPEG — no decode, no re-encode, no
generation loss — which is both the fastest possible implementation and the highest fidelity
one. Re-encoding happens only when the user asks for a size cap or an explicit quality.

Work happens in a pool of Web Workers under a memory budget, behind a `StorageAdapter`
abstraction that keeps the whole pipeline testable without driving native OS dialogs.

## Technical Context

**Language/Version**: TypeScript 5.x, targeting ES2022

**Primary Dependencies**: Vite 6 (build), React 18 (UI), Tailwind CSS 4 (styling),
`extract-raw-preview` (embedded preview extraction, MIT — vendored and pinned),
`exifr` (EXIF read on the re-encode path, MIT). No runtime backend dependencies.

**Storage**: No server storage. Output goes to a user-chosen local directory via the File
System Access API. Settings persist in `localStorage`. Test fixtures use the Origin Private
File System.

**Testing**: Vitest (unit + integration), Playwright against Chromium (end-to-end, using the
OPFS storage adapter), plus a small fixture corpus of real RAW files.

**Target Platform**: Chromium desktop browsers — Chrome 86+, Edge 86+, Opera 72+. Firefox and
Safari are detected and shown an unsupported notice (FR-034). Mobile is out of scope.

**Project Type**: Single-project static web application. No backend tier exists, by design.

**Performance Goals**: 100 files of ~25 MB in under 2 minutes (SC-003). Pass-through path
should be I/O-bound, not CPU-bound. UI stays interactive at 1,000+ files (SC-007, FR-032).

**Constraints**: Zero network transmission of image data after page load (FR-021, SC-004) —
verified by running a full conversion offline. Peak in-flight memory budget ~512 MB regardless
of batch size. No partially written output under any termination path (FR-028, SC-010).

**Scale/Scope**: Single-user, single-run-at-a-time tool. Batches up to ~2,000 files and
individual files up to ~150 MB. Roughly 6 UI views/states and ~12 core modules.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitution status**: `.specify/memory/constitution.md` is an **unfilled template** — every
principle is still a `[PRINCIPLE_N_NAME]` placeholder. There are no ratified project principles
to check against, so no constitutional gate can pass or fail on its own terms.

Rather than record a vacuous pass, the following provisional gates are derived directly from the
spec's own non-negotiables. They should be promoted into a real constitution (via
`/speckit-constitution`) if this project continues past v1.

| Provisional gate | Source | Pre-Phase 0 | Post-Phase 1 |
|------------------|--------|-------------|--------------|
| **Local-only processing** — no image bytes leave the device | FR-021, SC-004 | PASS | PASS — no network calls after page load; verified offline in `quickstart.md` |
| **No silent failures** — every file is accounted for | FR-026, SC-005 | PASS | PASS — `FileResult` requires an outcome; `reason` is required on non-success (see `data-model.md`) |
| **No destructive surprises** — source untouched, no partial output | FR-011, FR-028 | PASS | PASS — source opened read-only; R-006 mandates `removeEntry` cleanup |
| **Testability** — core paths verifiable without manual steps | SC-010 | AT RISK | PASS — resolved by the `StorageAdapter` split (R-007) |
| **Simplicity** — no component without a stated need | YAGNI | PASS | PASS — one deviation recorded in Complexity Tracking |

**Blocking issue carried into Phase 2**: research item **R-003** is an open spike, not a
resolved unknown. FR-017 requires rejecting previews "below a usable resolution threshold" and
that threshold cannot be set honestly without measuring real files. Implementation must not
begin until it is closed. See "Open Items" below.

## Project Structure

### Documentation (this feature)

```text
specs/001-raw-to-jpeg-converter/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── storage-adapter.md
│   ├── preview-extractor.md
│   ├── worker-protocol.md
│   └── settings-schema.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── main.tsx                      # Entry point
├── app/
│   ├── App.tsx                   # Top-level state machine: unsupported → idle → scanning → running → done
│   └── UnsupportedBrowser.tsx    # FR-034 gate, rendered before anything else
├── components/
│   ├── FolderPicker.tsx          # Source + destination selection (FR-001..FR-005)
│   ├── SettingsPanel.tsx         # Quality, max dimension, metadata, collision (FR-022..FR-025)
│   ├── ScanSummary.tsx           # Eligible count + warnings before start (FR-010, FR-004)
│   ├── ProgressView.tsx          # Live counts + current file (FR-026)
│   ├── ResultsTable.tsx          # Virtualized per-file results (FR-030, FR-032)
│   └── PrivacyNotice.tsx         # FR-035
├── core/
│   ├── storage/
│   │   ├── StorageAdapter.ts     # Interface — see contracts/storage-adapter.md
│   │   ├── FsaAdapter.ts         # File System Access API (production)
│   │   └── OpfsAdapter.ts        # Origin Private File System (tests)
│   ├── raw/
│   │   ├── PreviewExtractor.ts   # Adapter interface over the extraction library
│   │   ├── extractRawPreview.ts  # Vendored upstream, pinned
│   │   └── formats.ts            # Supported/unsupported classification (FR-007, FR-008)
│   ├── exif/
│   │   ├── readExif.ts           # exifr wrapper
│   │   └── spliceExif.ts         # APP1 insertion + Orientation normalization (R-002)
│   ├── image/
│   │   └── reencode.ts           # createImageBitmap + OffscreenCanvas (FR-016, FR-023)
│   ├── pipeline/
│   │   ├── scan.ts               # Directory scan + eligibility snapshot (FR-006, FR-010)
│   │   ├── convertOne.ts         # Single-file pipeline, pass-through vs re-encode
│   │   ├── runBatch.ts           # Orchestration, cancellation, admission control
│   │   ├── collision.ts          # skip / overwrite / keep-both (FR-024)
│   │   └── naming.ts             # Base name → output name (FR-013)
│   └── settings/
│       └── settings.ts           # localStorage load/save + defaults (FR-025)
├── workers/
│   ├── convert.worker.ts         # Per-file work — see contracts/worker-protocol.md
│   └── pool.ts                   # Worker pool + memory budget (R-005)
└── types/
    └── index.ts                  # Shared domain types (see data-model.md)

tests/
├── unit/                         # naming, collision, spliceExif, formats, settings
├── integration/                  # runBatch against OpfsAdapter
├── e2e/                          # Playwright, Chromium
└── fixtures/raw/                 # Real sample files, one per supported format

.github/workflows/deploy.yml      # Build + deploy to GitHub Pages
vite.config.ts                    # NOTE: `base` must be the repo name for project Pages
```

**Structure Decision**: Single project, flat `src/`. There is no backend tier to separate —
FR-021 forbids one existing at all — so the template's web-application split would create empty
ceremony. The meaningful boundary here is not client/server but **`core/` versus UI**: every
module under `core/` is pure TypeScript with no React and no direct File System Access API
calls, reached only through the `StorageAdapter` and `PreviewExtractor` interfaces. That is what
makes the pipeline unit-testable in Node and end-to-end-testable under Playwright, and it is the
same boundary that would let this ship as a CLI later without touching the conversion logic.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Two `StorageAdapter` implementations rather than calling the File System Access API directly | `showDirectoryPicker()` opens a **native OS dialog** that Playwright cannot drive. Without the OPFS implementation, the scan → convert → collide → cancel → clean-up path has no automated coverage at all, and SC-010's "verified across 20 cancellations" is unverifiable by anything but hand-testing. | Calling the API directly is less code, but it makes the product's core guarantees untestable. Mocking at the call site was considered and rejected: it would verify our mock's behavior rather than real directory semantics — precisely the semantics (immediate zero-byte entry creation, no rename) that FR-028 depends on. |

## Open Items

**R-003 blocks implementation.** Before `/speckit-tasks` output is executed, measure the
embedded preview dimensions in a real sample of the user's Fujifilm RAF files against the
sensor's native resolution:

```bash
exiftool -PreviewImageSize -ImageSize -JpgFromRaw -b /path/to/shoot/*.RAF | head
```

- **Full-size previews** → the plan stands as written; set FR-017's threshold at 90% of native
  resolution on the long edge.
- **Half-size previews** → stop and revisit spec Q2 before writing code. A tool that answers
  "convert my RAWs to JPEG" with half-resolution files is not what was asked for, however
  faithful the colors are.

This is the only item standing between this plan and implementation.
