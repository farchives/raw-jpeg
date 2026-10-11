# Phase 1 Data Model: RAW to JPEG Folder Converter

**Date**: 2026-10-10 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

All types live in `src/types/index.ts`. Nothing here is persisted to a server; the only
durable record is `ConversionSettings` in `localStorage`.

---

## ConversionSettings

Persisted between visits (FR-025). The only long-lived state in the application.

| Field | Type | Default | Rules |
|-------|------|---------|-------|
| `quality` | `"as-shot" \| number` | `"as-shot"` | Numeric values 1–100. `"as-shot"` selects the pass-through path (FR-015, FR-022) |
| `maxLongEdge` | `number \| null` | `null` | When set, 256–20000 px. Any value forces the re-encode path (FR-016, FR-023) |
| `keepMetadata` | `boolean` | `true` | FR-019 |
| `collisionPolicy` | `"skip" \| "overwrite" \| "keep-both"` | `"skip"` | FR-024; `"skip"` is the least destructive default |
| `schemaVersion` | `number` | `1` | Unknown or missing version → discard stored settings and use defaults |

**Derived rule — the single most important invariant in the model:**

```
isPassThrough = (quality === "as-shot") && (maxLongEdge === null)
```

When `isPassThrough` is true the embedded preview bytes are written **unmodified** and
`keepMetadata` is irrelevant — whatever the camera embedded comes along, and output is
byte-identical to it (SC-012). When false, the image is re-encoded and EXIF must be
re-attached with Orientation normalized to 1 (research R-002).

**Validation**: values outside their ranges are clamped rather than rejected; a corrupt
`localStorage` entry falls back to defaults silently. Settings are never a reason to block a
user from converting.

## SourceFolder / DestinationFolder

Thin wrappers over a `StorageAdapter` directory handle (see
[contracts/storage-adapter.md](./contracts/storage-adapter.md)).

| Field | Type | Notes |
|-------|------|-------|
| `handle` | `DirHandle` | Source opened read-only (FR-011); destination read-write |
| `displayName` | `string` | Shown to the user (FR-003). The API exposes a folder name, not a full path |
| `id` | `string` | Stable identity used for the containment check below |

**Relationship rule (FR-004)**: before a run may start, the destination must be checked against
the source for identity *and* containment. The File System Access API exposes
`isSameEntry()` and `resolve()` for exactly this. Both conditions produce a warning the user
must acknowledge — not a hard block, since a user may legitimately want output beside originals.

## RawFile

One eligible source file, captured during the scan. The scan produces an immutable snapshot
(spec: "the file list captured at start"), so files added mid-run are never half-processed.

| Field | Type | Notes |
|-------|------|-------|
| `name` | `string` | Full filename including extension |
| `baseName` | `string` | Filename without extension — the basis for output naming (FR-013) |
| `format` | `RawFormat` | From magic-byte detection, **not** the extension |
| `byteLength` | `number` | Drives the memory-budget admission control (research R-005) |
| `eligibility` | `"supported" \| "unsupported-raw" \| "not-raw"` | FR-007, FR-008, FR-009 |

```ts
type RawFormat = "raf" | "cr2" | "cr3" | "nef" | "arw" | "dng"       // supported (FR-007)
               | "orf" | "rw2" | "pef" | "srw" | "x3f" | "unknown";  // reported, not converted (FR-008)
```

**Rules**:

- `eligibility === "not-raw"` files are excluded from the run entirely and never copied (FR-009).
- `eligibility === "unsupported-raw"` files **do** appear in the results as `skipped`, so the
  user learns why their `.orf` produced nothing instead of guessing (FR-008, SC-005).
- Format detection reads magic bytes. A `.jpg` renamed to `.raf` is classified by content.

## ExtractedPreview

The intermediate product of extraction, never persisted.

| Field | Type | Notes |
|-------|------|-------|
| `data` | `Uint8Array` | The stored JPEG bytes, undecoded |
| `width`, `height` | `number` | As reported by the container |
| `mimeType` | `string` | JPEG expected; PNG previews exist and are treated as valid input to re-encode |
| `hasExif` | `boolean` | True when the bytes are already a complete EXIF JPEG (typical for RAF, CR3 `PRVW`) — determines whether the re-encode path must splice EXIF from the source |

**Validation gate (FR-017)**: `max(width, height)` is compared against the source's native
resolution. Below the threshold, the file becomes a `failed` result with reason
`"preview-too-small"` — never written. **The threshold is unset pending spike R-003.**

## ConversionRun

One batch execution. Exactly one may be active (spec Assumptions).

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | |
| `source`, `destination` | folder refs | |
| `settings` | `ConversionSettings` | **Snapshotted at start** — mid-run settings edits never apply to an in-flight run |
| `files` | `RawFile[]` | Immutable snapshot from the scan |
| `results` | `Map<string, FileResult>` | Keyed by source filename |
| `state` | `RunState` | See transitions below |
| `startedAt`, `endedAt` | `number \| null` | |

```ts
type RunState = "idle" | "scanning" | "ready" | "running" | "cancelling"
              | "completed" | "cancelled" | "stopped-by-error";
```

**State transitions**:

```
idle ──► scanning ──► ready ──► running ──┬─► completed
          │             │                 ├─► cancelling ──► cancelled
          │             │                 └─► stopped-by-error
          └─────────────┴──► idle   (user changes a folder selection)
```

- `ready` requires both folders chosen and at least one eligible file (FR-005, FR-010).
- `running → cancelling` is user-initiated (FR-027); `cancelling` must reach `cancelled` within
  a few seconds, which means cancellation is checked **between files**, not only between batches.
- `stopped-by-error` is reserved for conditions that make continuing pointless — destination
  deleted mid-run, permission revoked, disk full. Per-file failures never reach it (FR-029).
- `completed` is reached even when every single file failed. "Completed" describes the run,
  not success.

**Derived counts** (FR-026) are computed from `results`, never stored separately — two sources
of truth for the same number is how a progress display drifts from its own result list.

## FileResult

The outcome for one file. The structure is what makes SC-005's "zero silent failures"
enforceable by the type system rather than by discipline.

| Field | Type | Notes |
|-------|------|-------|
| `sourceName` | `string` | |
| `outcome` | `"succeeded" \| "failed" \| "skipped"` | |
| `reason` | `FailureReason \| SkipReason` | **Required** whenever `outcome !== "succeeded"` |
| `outputName` | `string \| null` | Set only on success — may differ from the input base name under `keep-both` |
| `outputBytes` | `number \| null` | |
| `durationMs` | `number` | |

```ts
type SkipReason =
  | "unsupported-format"      // FR-008
  | "exists-skip-policy"      // FR-024
  | "cancelled-before-start";

type FailureReason =
  | "preview-too-small"       // FR-017 — the Sony/half-size-RAF guard
  | "no-preview-found"        // FR-017
  | "preview-not-decodable"   // lossless-JPEG (SOF3) previews; see research R-001
  | "corrupt-or-unreadable"
  | "write-failed"
  | "permission-lost"
  | "out-of-space";
```

**Rule**: every entry in `ConversionRun.files` must have a corresponding `FileResult` by the
time the run leaves `running`. This is an assertion, not an aspiration — it is the
machine-checkable form of SC-005, and it should be tested directly.

**Rule**: each `FailureReason` maps to one plain-language sentence for display (FR-030). The
enum is internal; users never see `"preview-not-decodable"`.

## Entity relationships

```
ConversionSettings ──snapshotted into──► ConversionRun
SourceFolder ──scanned into──► RawFile[] ──├──► ConversionRun.files
DestinationFolder ──────────────────────────┘
RawFile ──extraction──► ExtractedPreview ──(pass-through | re-encode)──► output file
RawFile ──1:1──► FileResult
```

One `RawFile` always produces exactly one `FileResult`. `ExtractedPreview` is transient and
exists only inside a worker, never on the main thread — that is what keeps peak memory tied to
worker concurrency rather than to batch size (research R-005).
