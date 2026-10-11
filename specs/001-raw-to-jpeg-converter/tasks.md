---
description: "Task list for RAW to JPEG Folder Converter"
---

# Tasks: RAW to JPEG Folder Converter

**Input**: Design documents from `/specs/001-raw-to-jpeg-converter/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Included. The spec asks for them directly — SC-010 requires cancellation behavior "verified across 20 cancellations at random points", and SC-005 requires provable zero silent failures. The plan's Complexity Tracking justifies the entire `StorageAdapter` abstraction on testability grounds, so the conformance suite is architecturally load-bearing rather than optional polish.

**Organization**: Grouped by user story so each can be implemented, tested, and shipped independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to a user story in spec.md (US1, US2, US3)

## Path Conventions

Single project at repository root: `src/`, `tests/`. Paths follow the structure in [plan.md](./plan.md).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Close the blocking spike, then initialize the project.

- [ ] T001 ⚠️ **DEFERRED GATE** (user has no RAF path yet) — Close spike R-003: measure `PreviewImageSize` vs `ImageSize` on real Fujifilm files (via `exiftool`, or the in-app diagnostics once T019 exists), then record the values and chosen `minLongEdge` in the R-003 section of `specs/001-raw-to-jpeg-converter/research.md`. **If previews are ~half native resolution, STOP** and reopen spec question Q2. Until measured, `minLongEdge` is a configurable constant defaulting to 0 (guard disabled). **Must close before US1 is validated (T043) or anything ships.**
- [X] T002 Initialize Vite + React 18 + TypeScript 5 project at repository root (`package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`)
- [X] T003 [P] Configure Tailwind CSS 4 in `tailwind.config.ts` and `src/index.css`
- [X] T004 [P] Configure ESLint + Prettier in `eslint.config.js` and `.prettierrc`
- [X] T005 [P] Configure Vitest with unit and integration projects in `vitest.config.ts`
- [X] T006 [P] Configure Playwright for Chromium only in `playwright.config.ts`
- [X] T007 [P] Vendor `extract-raw-preview` source into `src/core/raw/extractRawPreview.ts`, pinned to an exact version, with the upstream MIT notice retained in `src/core/raw/LICENSE-extract-raw-preview`
- [X] T008 [P] Add `exifr` as a pinned dependency in `package.json`
- [X] T009 [P] Create GitHub Pages deploy workflow in `.github/workflows/deploy.yml` and set `base` to the repository name in `vite.config.ts`
- [ ] T010 [P] Assemble the fixture corpus in `tests/fixtures/raw/` — at least one real file per supported format (`.raf` priority), plus one `.orf` (unsupported), one corrupt file, and one Sony `.arw` with a small embedded preview

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The contracts and infrastructure every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T011 Define all shared domain types from data-model.md in `src/types/index.ts` — `ConversionSettings`, `RawFile`, `RawFormat`, `ExtractedPreview`, `ConversionRun`, `RunState`, `FileResult`, `FailureReason`, `SkipReason`
- [X] T012 [P] Implement magic-byte format detection (never extension-based) in `src/core/raw/formats.ts`, classifying each file as `supported` / `unsupported-raw` / `not-raw` per FR-007 and FR-008
- [X] T013 [P] Unit tests for format detection, including a `.jpg` renamed to `.raf`, in `tests/unit/formats.test.ts`
- [X] T014 Define the `StorageAdapter`, `DirHandle`, `FileEntry`, and `WritableTarget` interfaces exactly as specified in `contracts/storage-adapter.md`, in `src/core/storage/StorageAdapter.ts`
- [X] T015 [P] Implement platform-error classification (`QuotaExceededError` → `out-of-space`, `NotAllowedError` → `permission-lost`) in `src/core/storage/errors.ts`
- [X] T016 [P] Implement `FsaAdapter` over the File System Access API in `src/core/storage/FsaAdapter.ts` — source handles must reject writes, and `abort()` must call `removeEntry` to avoid leaving zero-byte files
- [X] T017 [P] Implement `OpfsAdapter` over the Origin Private File System in `src/core/storage/OpfsAdapter.ts` with identical semantics
- [X] T018 Write the shared conformance suite in `tests/integration/storage-conformance.test.ts`, parameterized to run every assertion against **both** adapters — covering non-recursive listing, read-only source enforcement, `exists()` not creating, `assertWritable()` pre-flight, and the zero-byte-cleanup-on-abort case
- [X] T019 Implement the `PreviewExtractor` adapter in `src/core/raw/PreviewExtractor.ts` wrapping the vendored library with `prefer: "largest"` and `maxBytes: 32 MiB`, mapping library outcomes onto `FailureReason` and setting `hasExif` by APP1 detection
- [X] T020 [P] Unit tests for extractor reason mapping and largest-candidate selection, using the Sony fixture, in `tests/unit/preview-extractor.test.ts`
- [X] T021 [P] Implement output filename derivation (base name + `.jpg`) in `src/core/pipeline/naming.ts`
- [X] T022 [P] Unit tests for naming, including two formats sharing one base name, in `tests/unit/naming.test.ts`
- [X] T023 Implement the per-file worker entry point and message handling per `contracts/worker-protocol.md` in `src/workers/convert.worker.ts` — transfer buffers, never throw across the boundary
- [X] T024 Implement the worker pool with `min(hardwareConcurrency - 1, 4)` workers and a ~512 MB in-flight byte budget in `src/workers/pool.ts`
- [X] T025 Implement the top-level run state machine (`idle → scanning → ready → running → completed | cancelled | stopped-by-error`) in `src/app/App.tsx`
- [X] T026 Implement the unsupported-browser gate using `'showDirectoryPicker' in window` feature detection, rendering before any folder UI, in `src/app/UnsupportedBrowser.tsx`

**Checkpoint**: Contracts are implemented and conformance-tested. User story work can begin.

---

## Phase 3: User Story 1 - Convert a folder of RAW photos to JPEG (Priority: P1) 🎯 MVP

**Goal**: Point at a source folder, point at a destination, convert every supported RAW to a JPEG — byte-identical to the camera's own embedded preview.

**Independent Test**: Place a folder of known RAF files on disk, run the flow end to end, and confirm a matching JPEG exists for each and opens correctly at the right orientation.

### Tests for User Story 1

- [ ] T027 [P] [US1] Integration test: 10 RAF files + empty destination → 10 `.jpg` files with preserved base names, summary reports 10/10, in `tests/integration/us1-convert.test.ts`
- [ ] T028 [P] [US1] Integration test for SC-012: output bytes are identical to the extracted embedded preview under default settings, in `tests/integration/us1-passthrough.test.ts`
- [ ] T029 [P] [US1] Integration test: mixed folder (`.raf`, `.jpg`, `.xmp`, `.mov`, `.orf`) leaves non-RAW untouched and uncopied, reports the `.orf` as skipped-unsupported by name, and leaves the source checksum unchanged, in `tests/integration/us1-source-safety.test.ts`
- [ ] T030 [P] [US1] Unit test for the FR-017 guard: an undersized preview yields `failed` / `preview-too-small` and writes no file, in `tests/unit/preview-guard.test.ts`

### Implementation for User Story 1

- [ ] T031 [US1] Implement non-recursive directory scan producing an immutable `RawFile[]` snapshot with eligibility classification in `src/core/pipeline/scan.ts`
- [ ] T032 [P] [US1] Implement source/destination identity and containment checks using `isSameEntry` and `resolve` in `src/core/pipeline/containment.ts`
- [ ] T033 [US1] Implement the single-file pass-through pipeline (extract → guard → write) in `src/core/pipeline/convertOne.ts`
- [ ] T034 [US1] Add the `minLongEdge` guard from T001 to `src/core/pipeline/convertOne.ts`, rejecting undersized previews before any write occurs
- [ ] T035 [P] [US1] Implement the `skip` collision policy with a non-creating existence check in `src/core/pipeline/collision.ts`
- [ ] T036 [US1] Implement batch orchestration over the worker pool, producing one `FileResult` per `RawFile`, in `src/core/pipeline/runBatch.ts`
- [ ] T037 [US1] Wire the pass-through branch (extract and return stored bytes verbatim) in `src/workers/convert.worker.ts`
- [ ] T038 [P] [US1] Build source and destination folder selection with display names and change-before-start in `src/components/FolderPicker.tsx`
- [ ] T039 [P] [US1] Build the pre-run summary showing eligible file count and the same-folder / nested-folder warning in `src/components/ScanSummary.tsx`
- [ ] T040 [P] [US1] Build the always-visible local-processing notice (FR-035) in `src/components/PrivacyNotice.tsx`
- [ ] T041 [P] [US1] Build a basic end-of-run results list (non-virtualized) in `src/components/ResultsTable.tsx`
- [ ] T042 [US1] Wire selection → scan → ready → run → completed, gating the start control on both folders being chosen, in `src/app/App.tsx`
- [ ] T043 [US1] End-to-end test covering quickstart scenario V1 against the OPFS adapter in `tests/e2e/us1-convert.spec.ts`

**Checkpoint**: The tool converts a folder of RAW files to JPEG. This is a shippable MVP.

---

## Phase 4: User Story 2 - Watch progress and see exactly what failed (Priority: P2)

**Goal**: Live progress, safe cancellation, and a failure report that names every problem file with an actionable reason.

**Independent Test**: Run a batch containing one corrupt file and one unsupported file; confirm progress advances visibly, the batch still completes, and the report names both with distinct reasons.

### Tests for User Story 2

- [ ] T044 [P] [US2] Integration test for SC-010: 20 runs cancelled at random points leave zero zero-byte files and zero unreadable files, in `tests/integration/us2-cancel.test.ts`
- [ ] T045 [P] [US2] Integration test: a corrupt file fails by name while the rest of the batch completes, in `tests/integration/us2-resilience.test.ts`
- [ ] T046 [P] [US2] Integration test for SC-005: assert every `RawFile` has a `FileResult` on leaving `running`, and every non-success carries a reason, in `tests/integration/us2-accounting.test.ts`

### Implementation for User Story 2

- [ ] T047 [US2] Implement cancellation with between-file checks and the `cancelling → cancelled` transition in `src/core/pipeline/runBatch.ts`
- [ ] T048 [US2] Implement partial-write cleanup via `finally`-block `abort()` on every failure and cancellation path in `src/core/pipeline/convertOne.ts`
- [ ] T049 [US2] Implement `stopped-by-error` handling for destination deleted, permission revoked, and out-of-space, keeping per-file failures from triggering it, in `src/core/pipeline/runBatch.ts`
- [ ] T050 [US2] Emit derived progress counts (computed from `results`, never stored separately) in `src/core/pipeline/runBatch.ts`
- [ ] T051 [P] [US2] Map each `FailureReason` and `SkipReason` to one plain-language sentence in `src/core/pipeline/reasons.ts`
- [ ] T052 [P] [US2] Unit test asserting every enum member has a user-facing message in `tests/unit/reasons.test.ts`
- [ ] T053 [P] [US2] Build the live progress display — current file, completed/total, succeeded/failed/skipped tallies — in `src/components/ProgressView.tsx`
- [ ] T054 [US2] Replace the basic results list with a virtualized table that stays smooth at 1,000+ rows in `src/components/ResultsTable.tsx`
- [ ] T055 [US2] Implement retry-failed-only, reprocessing just the failed subset, in `src/core/pipeline/runBatch.ts`
- [ ] T056 [US2] Wire the cancel control and retry control into `src/app/App.tsx`
- [ ] T057 [US2] End-to-end test covering quickstart scenarios V8 and V12 in `tests/e2e/us2-progress.spec.ts`

**Checkpoint**: Realistic batches are safe to run, observable, and honest about failure.

---

## Phase 5: User Story 3 - Control output quality, sizing, and overwrite behavior (Priority: P3)

**Goal**: Optional re-encoding to a size cap and quality, metadata control, and all three collision policies.

**Independent Test**: Convert the same folder twice with different quality and size settings and confirm outputs differ as configured; convert a third time into a non-empty destination and confirm each policy behaves as specified.

### Tests for User Story 3

- [ ] T058 [P] [US3] Unit test: settings persistence, clamping of out-of-range values, and silent fallback to defaults on a corrupt blob, in `tests/unit/settings.test.ts`
- [ ] T059 [P] [US3] Unit test: `spliceExif` inserts APP1 correctly and normalizes Orientation to 1 so re-encoded images are not rotated twice, in `tests/unit/splice-exif.test.ts`
- [ ] T060 [P] [US3] Integration test: all three collision policies behave per FR-024, with `skip` leaving existing files byte-for-byte unchanged, in `tests/integration/us3-collision.test.ts`
- [ ] T061 [P] [US3] Integration test: max long edge is respected with aspect ratio preserved, lower quality yields smaller files, and EXIF capture date survives, in `tests/integration/us3-reencode.test.ts`

### Implementation for User Story 3

- [ ] T062 [P] [US3] Implement settings load/save against `localStorage` key `rawjpeg.settings.v1` per `contracts/settings-schema.md` in `src/core/settings/settings.ts`
- [ ] T063 [P] [US3] Implement EXIF reading from the source container via `exifr` in `src/core/exif/readExif.ts`
- [ ] T064 [P] [US3] Implement APP1 insertion after SOI with Orientation normalized to 1, operating on `Uint8Array` without string conversion, in `src/core/exif/spliceExif.ts`
- [ ] T065 [P] [US3] Implement resize and JPEG re-encode via `createImageBitmap` + `OffscreenCanvas` in `src/core/image/reencode.ts`
- [ ] T066 [US3] Add the re-encode branch, selected by the `isPassThrough` derived rule, in `src/core/pipeline/convertOne.ts`
- [ ] T067 [US3] Add `overwrite` and `keep-both` policies, with `keep-both` never clobbering, in `src/core/pipeline/collision.ts`
- [ ] T068 [US3] Snapshot settings at run start so mid-run edits never affect an in-flight run, in `src/core/pipeline/runBatch.ts`
- [ ] T069 [P] [US3] Build the settings panel for quality, max long edge, metadata, and collision policy in `src/components/SettingsPanel.tsx`
- [ ] T070 [US3] Wire the settings panel and persistence into `src/app/App.tsx`
- [ ] T071 [US3] End-to-end test covering quickstart scenarios V7 and V10 in `tests/e2e/us3-settings.spec.ts`

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T072 [P] Validate SC-007 with a 1,000-file batch: UI stays interactive and peak memory stays within the ~512 MB budget; record results in `specs/001-raw-to-jpeg-converter/quickstart.md`
- [ ] T073 [P] Validate SC-004 by running a full conversion with the network disconnected and confirming zero requests after page load (quickstart V4); record the outcome in `specs/001-raw-to-jpeg-converter/quickstart.md`
- [ ] T074 [P] Validate SC-011 by comparing a Velvia or Acros RAF conversion against the in-camera JPEG for the same frame (quickstart V3); record the outcome in `specs/001-raw-to-jpeg-converter/quickstart.md`
- [ ] T075 [P] Accessibility pass over `src/components/FolderPicker.tsx`, `src/components/SettingsPanel.tsx`, `src/components/ProgressView.tsx`, and `src/components/ResultsTable.tsx` — keyboard navigation, focus order, and live-region announcements for progress
- [ ] T076 [P] Write `README.md` covering what the tool does, browser requirements, supported formats, and the embedded-preview tradeoff
- [ ] T077 Deploy to GitHub Pages via `.github/workflows/deploy.yml` and verify assets resolve under the project-pages base path set in `vite.config.ts`
- [ ] T078 [P] Validate FR-034 on the deployed site in Firefox and Safari (quickstart V11) — notice shown, no folder picker offered; record the outcome in `specs/001-raw-to-jpeg-converter/quickstart.md`
- [ ] T079 Run the full quickstart validation suite V1–V12 and record outcomes in `specs/001-raw-to-jpeg-converter/quickstart.md`
- [ ] T080 [P] Promote the provisional gates in plan.md into a real constitution via `/speckit-constitution`, replacing the unfilled template at `.specify/memory/constitution.md`
- [ ] T081 Code cleanup and dead-code removal across `src/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **T001 blocks everything.** The spike is not a formality — FR-017's threshold is undefined without it, and a half-size result invalidates the spec's Q2 decision before any code exists.
- **Setup (Phase 1)**: T002 depends on T001. T003–T010 depend on T002.
- **Foundational (Phase 2)**: Depends on Setup. **Blocks all user stories.**
- **User Stories (Phases 3–5)**: All depend on Phase 2. US1 → US2 → US3 in priority order, or in parallel with enough people.
- **Polish (Phase 6)**: Depends on the stories you intend to ship.

### User Story Dependencies

- **US1 (P1)**: Depends only on Phase 2. No dependency on other stories.
- **US2 (P2)**: Depends only on Phase 2. Independently testable, though it replaces US1's basic results list (T041 → T054) rather than conflicting with it.
- **US3 (P3)**: Depends only on Phase 2. Adds the re-encode branch alongside US1's pass-through path without altering it.

### Within Each User Story

Tests are written first and must fail before implementation. Then: core pipeline → worker wiring → UI components → app integration → end-to-end.

### Known serialization points

`src/core/pipeline/runBatch.ts` is touched by T036, T047, T049, T050, T055, and T068 — the most contended file in the plan, and none of those are `[P]`. `src/core/pipeline/convertOne.ts` is touched by T033, T034, T048, and T066. If splitting work across people, keep `runBatch.ts` with one person.

---

## Parallel Opportunities

**Phase 1** — T003 through T010 all run in parallel once T002 lands (8 tasks).

**Phase 2** — two parallel clusters:

```bash
# Storage cluster (after T014)
Task: "Implement platform-error classification in src/core/storage/errors.ts"
Task: "Implement FsaAdapter in src/core/storage/FsaAdapter.ts"
Task: "Implement OpfsAdapter in src/core/storage/OpfsAdapter.ts"

# Pure-logic cluster (after T011)
Task: "Implement format detection in src/core/raw/formats.ts"
Task: "Unit tests for format detection in tests/unit/formats.test.ts"
Task: "Implement naming in src/core/pipeline/naming.ts"
Task: "Unit tests for naming in tests/unit/naming.test.ts"
```

**Phase 3 (US1)** — all four tests (T027–T030) in parallel, then the UI components:

```bash
Task: "Build FolderPicker in src/components/FolderPicker.tsx"
Task: "Build ScanSummary in src/components/ScanSummary.tsx"
Task: "Build PrivacyNotice in src/components/PrivacyNotice.tsx"
Task: "Build basic ResultsTable in src/components/ResultsTable.tsx"
```

**Phase 5 (US3)** — the four tests in parallel, then four independent core modules (T062–T065) in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. **T001 — close the spike.** Do not skip this.
2. Phase 1: Setup (T002–T010)
3. Phase 2: Foundational (T011–T026)
4. Phase 3: User Story 1 (T027–T043)
5. **STOP and VALIDATE** — run quickstart V1, V2, V5
6. Deploy. At this point the tool does the thing that was actually asked for.

### Incremental Delivery

- **MVP** (Setup + Foundational + US1) — converts a folder, byte-identical pass-through
- **+ US2** — safe to run on a 500-file shoot, with honest failure reporting
- **+ US3** — web proofs, client galleries, collision control
- **+ Polish** — validated against every success criterion and deployed

Each increment is independently shippable and leaves the previous one working.

---

## Notes

- `[P]` means a different file with no incomplete dependencies.
- The MVP's default path performs **no image decoding at all** — it locates the camera's embedded JPEG and copies those bytes. If an early implementation finds itself calling `createImageBitmap` on the default path, something has gone wrong.
- The `abort()` → `removeEntry` behavior (T016, T017, T018, T048) is the most likely thing to be implemented incorrectly, and the failure is silent: a destination quietly filling with zero-byte `.jpg` files. The conformance test exists specifically to catch it.
- Commit after each task or logical group. Stop at any checkpoint to validate a story independently.
