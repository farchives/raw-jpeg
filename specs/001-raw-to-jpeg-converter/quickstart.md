# Quickstart & Validation Guide: RAW to JPEG Folder Converter

**Date**: 2026-10-10 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

How to run the project and prove it satisfies the spec. Scenarios map to Success Criteria;
each one is runnable and has a stated expected outcome.

---

## Step 0 — Close the blocking spike (do this first)

Implementation must not begin until research item **R-003** is settled. The threshold in
FR-017 cannot be chosen without it.

```bash
# Against a real folder of the user's Fujifilm files
exiftool -ImageSize -PreviewImageSize -FileName /path/to/shoot/*.RAF
```

**Expected**: `PreviewImageSize` matches `ImageSize` (e.g. `7728x5152` on a 40 MP X-H2).

- **Match** → set `minLongEdge` to 90% of native long edge and proceed.
- **Roughly half** (e.g. `3864x2576`) → **stop.** Reopen spec question Q2 before writing code;
  half-resolution output is not what "convert my RAWs to JPEG" asked for.

## Prerequisites

- Node.js 20+ and npm
- A Chromium browser — Chrome 86+, Edge 86+, or Opera 72+. Firefox and Safari cannot run this
  (they support only OPFS, not the local-disk pickers), which is the behavior FR-034 covers.
- A folder of real RAW files. The fixture corpus needs at least one file per supported format;
  Fujifilm `.raf` is the priority case.

## Setup

```bash
npm install
npm run dev          # http://localhost:5173
```

```bash
npm run build        # static output in dist/
npm run preview      # serve the production build locally
```

Deployment is a push to `main`: `.github/workflows/deploy.yml` builds and publishes to GitHub
Pages. If assets 404 on the deployed site, `base` in `vite.config.ts` does not match the
repository name.

## Test suites

```bash
npm run test:unit           # Vitest — naming, collision, spliceExif, formats, settings
npm run test:integration    # Vitest — runBatch against OpfsAdapter
npm run test:e2e            # Playwright, Chromium
npm run test:conformance    # StorageAdapter conformance, run against BOTH adapters
npm test                    # everything
```

The conformance suite is the one that matters most: it runs identical assertions against
`FsaAdapter` and `OpfsAdapter`, so the OPFS implementation used by every other test is proven
to behave like the real file system. See
[contracts/storage-adapter.md](./contracts/storage-adapter.md).

---

## Validation scenarios

### V1 — Core conversion (SC-001, SC-002, FR-012, FR-013)

Point the tool at a folder of 10 RAF files and an empty destination; start.

**Expected**: 10 `.jpg` files appear, base names preserved; summary reads 10 of 10 succeeded;
each opens in Preview at the correct orientation.

### V2 — Byte-identical pass-through (SC-012, FR-015)

Run V1 with default settings. Then extract the embedded preview independently and compare:

```bash
exiftool -b -JpgFromRaw /path/to/shoot/DSCF0001.RAF > /tmp/ref.jpg
cmp /tmp/ref.jpg /path/to/dest/DSCF0001.jpg && echo "IDENTICAL"
```

**Expected**: `IDENTICAL`. If this fails, something is decoding and re-encoding on the default
path, which breaks the central premise of the design.

### V3 — Film simulation preserved (SC-011)

Convert a RAF shot with Velvia or Acros. Compare against the in-camera JPEG for the same frame.

**Expected**: output carries the film-simulation look — not a flat or neutral rendering.

### V4 — Local-only processing (SC-004, FR-021)

Load the page, then disconnect from the network (or set DevTools to Offline). Run a full
conversion. Keep the Network panel open.

**Expected**: the conversion completes, and the Network panel records **zero requests** after
page load.

### V5 — Mixed content is left alone (FR-009, FR-008)

Source folder containing `.raf`, `.jpg`, `.xmp`, `.mov`, and one `.orf`.

**Expected**: only the RAF files convert. The `.orf` is reported as skipped-unsupported **by
name**. The `.jpg`, `.xmp`, and `.mov` are untouched and not copied. Source folder byte-for-byte
unchanged (FR-011) — verify with a checksum taken before and after.

### V6 — Undersized preview guard (FR-017)

Include a Sony ARW from a body that embeds only a 1616×1080 preview.

**Expected**: reported as **failed** with a plain-language reason, and **no file written**.
A 1616×1080 file sitting in the destination named like a full-resolution deliverable is the
failure mode this guard exists to prevent.

### V7 — Collision policies (SC-008, FR-024)

Run the same conversion three times into a non-empty destination, once per policy.

**Expected**: `skip` leaves existing files byte-for-byte unchanged and reports them skipped;
`overwrite` replaces them; `keep-both` writes under a distinct name and leaves the original
intact. No policy ever produces a corrupt file.

### V8 — Cancellation leaves no debris (SC-010, FR-028)

Start a 200-file run; cancel at a random point. Repeat 20 times.

```bash
find /path/to/dest -name '*.jpg' -size 0 | wc -l    # expect 0, every time
```

**Expected**: zero zero-byte files across all 20 runs, and every file present is a complete,
openable JPEG. This is the scenario that justifies the `StorageAdapter` abstraction — the
20-iteration form is automated against OPFS; spot-check a few by hand against the real API.

### V9 — Scale and responsiveness (SC-007, FR-032)

A 1,000-file batch. Keep a performance profile running.

**Expected**: the UI stays interactive throughout — scrolling the results list, opening
settings; peak memory stays bounded (~512 MB budget) and does not grow with batch size.

### V10 — Re-encode path (FR-016, FR-019, FR-023)

Set max long edge to 2048 and quality to 80.

**Expected**: no output exceeds 2048 px on its long edge, aspect ratio preserved, files
noticeably smaller; EXIF capture date and camera model survive; and — the easy bug —
orientation is correct, **not rotated twice**. Canvas bakes orientation into pixels, so the
spliced EXIF must carry `Orientation=1` (research R-002).

### V11 — Unsupported browser (FR-034)

Open the deployed site in Firefox or Safari.

**Expected**: a clear notice naming the browsers that work. No folder picker is offered at all —
the user must not be able to get partway in before discovering it cannot work.

### V12 — Error paths (spec Edge Cases)

| Action | Expected |
|--------|----------|
| Empty source folder | "No convertible images found" — not an empty success |
| Destination inside source | Warning before start, acknowledgeable |
| Read-only destination | Reported before the batch starts, not after the first write fails |
| Destination deleted mid-run | Run stops with a clear reason; completed files remain intact |
| Corrupt RAF in the batch | That file fails by name; the batch continues (FR-029) |

---

## Definition of done

All twelve scenarios pass, the conformance suite passes against both adapters, and every
Success Criterion in [spec.md](./spec.md) has a scenario that exercises it.
