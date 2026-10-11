# Phase 0 Research: RAW to JPEG Folder Converter

**Date**: 2026-10-10 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

All Technical Context unknowns are resolved below except **R-003**, which is deliberately
left as a spike with a decision gate — it cannot be settled from documentation, only from
the user's actual files.

---

## R-001: How to extract an embedded preview from a RAW file in a browser

**Decision**: Use `extract-raw-preview` (MIT, zero-dependency, isomorphic) behind our own
`PreviewExtractor` adapter interface. Pin an exact version and vendor the source into the
repo.

**Rationale**: It walks each container format directly — TIFF IFDs for DNG/CR2/NEF/ARW,
ISO-BMFF for CR3, the Fujifilm header for RAF — and returns the stored JPEG bytes with no
decode, re-encode, or resize. That is precisely FR-015's "pass through unmodified, zero
generation loss." It accepts a `Uint8Array`, runs in a worker, and `prefer: "largest"`
selects the biggest embedded candidate, which is what FR-014 needs.

**Risk, and why we mitigate rather than avoid**: The project shows 29 commits and an empty
Releases section — it is young, and it would sit on the critical path of the entire product.
Mitigation is threefold: (a) all use goes through our own adapter interface, so swapping it
costs one file; (b) the MIT license lets us vendor the source so an upstream lapse never
blocks a build; (c) the formats we most depend on are the easy ones — the RAF header is a
fixed offset table and TIFF IFD walking is well-trodden — so a hand-rolled replacement is a
bounded fallback, with only CR3's BMFF parsing being non-trivial.

**Alternatives considered**:

- **LibRaw compiled to WASM** — the heavyweight, fully-capable option. Rejected: it decodes
  pixels, which is exactly what the spec decided against (FR-014); it would add multiple MB
  to a static-site payload; and it would re-introduce the X-Trans demosaic quality problem
  that drove the preview decision in the first place.
- **`exifr` alone** — documents support for `.jpg/.tif/.png/.heic/.avif/.iiq`; camera RAW
  support is undocumented. It extracts the EXIF IFD1 thumbnail, which is a small
  thumbnail, not the full-size preview. Insufficient alone — but see R-002, where it still
  earns a place.
- **Hand-rolled parsers from day one** — rejected for v1 as unnecessary work when an MIT
  library already does it, but retained as the documented fallback above.

**Two configuration details that will bite if missed**:

1. `maxBytes` defaults to **8 MiB**. A full-size preview from a 40 MP body exceeds that and
   would be silently dropped with reason "all candidates exceed maxBytes". Must be raised
   (32 MiB) or the tool will report spurious failures on exactly the files users care most
   about.
2. Lossless-JPEG (SOF3) previews are returned with `decodable: false` and are never selected.
   Some DNGs carry only those. This surfaces as FR-017's named failure, which is correct
   behavior — but the reason string must say so in plain language, not echo the library's.

## R-002: Carrying EXIF metadata into the output (FR-019)

**Decision**: Two paths, chosen per file.

- **Pass-through path (FR-015)**: when the extracted preview is already a complete EXIF JPEG
  — true for RAF and for CR3's `PRVW` — write the bytes through untouched. Metadata comes
  along for free and the output is byte-identical to what the camera embedded (SC-012).
- **Re-encode path (FR-016)**: canvas re-encoding strips all metadata, so EXIF must be
  re-attached. Read the source APP1/EXIF block with `exifr` (MIT, isomorphic, accepts
  `Uint8Array`, reads Orientation and optionally MakerNotes) and splice it into the output
  JPEG with a small in-house utility.

**Rationale for an in-house splicer over `piexifjs`**: Inserting an APP1 segment immediately
after the SOI marker is about thirty lines of byte manipulation against a `Uint8Array`.
`piexifjs` operates on binary *strings*, which means converting a 20 MB buffer to and from a
JS string per file — a serious performance and memory cost repeated across a 1,000-file batch
(SC-007). Not worth a dependency for thirty lines.

**Orientation caveat**: FR-018 requires correct orientation. On the re-encode path the canvas
has already applied orientation to the pixels, so the spliced EXIF must have its Orientation
tag **normalized to 1** or viewers will rotate the image a second time. This is the single
most likely source of a "rotated twice" bug; it gets a dedicated unit test.

**Alternatives considered**: Dropping metadata on the re-encode path only — rejected, FR-019
makes carry-over the default and users converting a shoot need capture dates. Full MakerNote
preservation — deferred; MakerNotes are offset-sensitive and can break when relocated, so v1
carries standard EXIF and documents the limit.

## R-003 (SPIKE — unresolved by design): Actual preview dimensions in the user's files

**Status**: Open. Must be closed before implementation begins. This is the one place where
documentation is not good enough.

**What research established**: Embedded preview size varies by format *and by camera body*,
far more than the spec assumed.

- **Fujifilm RAF** — reported as full-size or half-size, with the in-camera film simulation
  rendered in. Sources conflict on which, and both appear in the wild.
- **Canon CR2/CR3, Nikon NEF** — generally full-size.
- **Sony ARW** — **the problem case.** Many bodies embed only **1616×1080**. Newer bodies
  (A7R V and similar) carry a full-resolution `JpgFromRaw` alongside the small `PreviewImage`.
  ExifTool documents several models (ILCE-5100, 7M2, 7RM2, 7SM2) with no usable preview at
  all, where a naive "first available" pick yields a 160×120 thumbnail.
- **Adobe DNG** — reduced-resolution JPEG SubIFDs; full-size only when the writer chose to
  embed one.

**Implications already folded into the design**: `prefer: "largest"` is mandatory, not
optional — picking the first candidate would hand Sony users a thumbnail. FR-017's
undersized-preview guard is load-bearing rather than defensive: it is the thing standing
between the user and a folder of 1616×1080 files named like full-resolution deliverables.

**The gate**: run `exiftool -PreviewImageSize -JpgFromRaw` (or the project's own
`listThumbnails`) across a real sample of the user's RAF files and compare against the
sensor's native resolution.

- **If RAF previews are full-size** — proceed as specified. The design is sound.
- **If RAF previews are half-size** — the spec's Q2 decision needs revisiting *before* code
  is written, because "convert my RAWs to JPEG" delivering half-resolution files is not what
  was asked for, even with the film simulation intact.

**Why this is not merely a to-do**: FR-017 defines "below a usable resolution threshold" but
the spec never sets the number. The threshold cannot be chosen honestly without this data.

## R-004: Browser folder access (FR-034)

**Decision**: Target Chromium desktop browsers — Chrome 86+, Edge 86+, Opera 72+. Feature-detect
with `'showDirectoryPicker' in window`; when absent, show the unsupported-browser notice and
never render the folder-selection flow.

**Rationale**: The File System Access API's local-disk pickers are Chromium-only. Firefox ships
only the Origin Private File System and has registered a standards position **opposing** the
local-disk pickers, so this is a deliberate divergence rather than a pending gap. Safari also
supports only OPFS. There is no evidence of either adding `showDirectoryPicker`. Q3 chose to
block rather than build a fallback, and this research confirms that blocking will remain correct
for the foreseeable future rather than being a temporary state.

**Never user-agent sniff** — feature detection is both the documented recommendation and the only
thing that stays true as browsers change.

**Alternatives considered**: `<input webkitdirectory>` for reading plus a ZIP download for
output — works everywhere, but destroys the "point at a destination directory" premise that is
the entire feature. Rejected at spec time (Q3) and nothing here changes that.

## R-005: Keeping the UI responsive and memory bounded (FR-032, SC-007)

**Decision**: A pool of Web Workers, sized `min(hardwareConcurrency - 1, 4)`, with a global
in-flight memory budget of ~512 MB. The main thread never touches image bytes.

**Rationale**: Extraction is byte-walking, not decoding, so it is fast — but reading a 60 MB
RAW into a `Uint8Array` is not free, and eight concurrent reads of large files is how a
1,000-file batch exhausts memory and violates SC-007. Admission control on total in-flight
bytes, rather than a fixed worker count alone, is what keeps a folder of 100 MB GFX files from
behaving differently than a folder of 25 MB X-T files.

**Known inefficiency, accepted for v1**: `extract-raw-preview` takes a whole-file
`Uint8Array`, while in principle only the header and the preview byte-range need to be read.
Range-based reading via `File.slice()` would cut peak memory by an order of magnitude. Deferred
as a documented optimization behind the `PreviewExtractor` adapter, not a v1 requirement.

## R-006: Never leaving a partial output file (FR-028)

**Decision**: On any error, abort, or cancellation during a write, call
`removeEntry(filename)` on the destination directory handle in a `finally` block.

**Rationale**: This matters because of a specific File System Access API behavior:
`getFileHandle(name, { create: true })` creates the directory entry **immediately**, while the
written data is only committed when the writable stream is closed. An aborted write therefore
leaves a **zero-byte file** behind, not nothing. Without explicit cleanup, cancelling a run
produces a destination full of empty `.jpg` files — a direct violation of FR-028 and SC-010.
There is no rename in the API, so the write-to-temp-then-rename pattern is unavailable and
explicit cleanup is the only mechanism.

## R-007: Making the file-system layer testable

**Decision**: Define a `StorageAdapter` interface. Ship two implementations: `FsaAdapter`
(File System Access API, production) and `OpfsAdapter` (Origin Private File System, tests).

**Rationale**: `showDirectoryPicker()` opens a **native OS dialog**, which Playwright cannot
drive. Without this abstraction the entire end-to-end path — scan, convert, collide, cancel,
clean up — would be untestable, and SC-010's "verified across 20 cancellations" would be
unverifiable. OPFS presents the same handle-based API shape and is available in automation, so
the adapter boundary is the difference between a testable product and one validated only by
hand. This decision is driven by testability, which is why it is recorded here rather than
treated as incidental structure.

## R-008: Stack and hosting

**Decision**: TypeScript + Vite + React 18 + Tailwind CSS, deployed to GitHub Pages via GitHub
Actions.

**Rationale**: The spec requires a static, publicly hosted site with no backend (FR-033,
FR-021). Vite's static build drops straight onto Pages. React earns its place through the live
progress view — a per-file result list over 1,000+ rows with continuously updating counts — which
is exactly the state-driven rendering React handles well, and a virtualized list keeps it cheap.

**Note**: `base` in the Vite config must be set to the repository name for project-pages URLs,
or every asset 404s. Small detail, guaranteed to cost an afternoon if missed.

**Alternatives considered**: Vanilla TypeScript — viable and lighter, rejected because the
progress UI is the part most likely to grow. Svelte — equally good technically, rejected as
less widely known with no offsetting advantage here.

---

## Sources

- [File System Access API — Chrome for Developers](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access)
- [File System Access API: Browser Support, Methods, Limits](https://www.testmuai.com/learning-hub/file-system-access-api-browser-support/)
- [File System Access API in Practice](https://www.mironsoft.de/en/blog/javascript-file-system-access-api-in-practice)
- [extract-raw-preview (GitHub)](https://github.com/radenkovic/extract-raw-preview)
- [exifr (GitHub)](https://github.com/MikeKovarik/exifr)
- [Where to check resolution of embedded preview in ARW file (DPReview)](https://www.dpreview.com/forums/threads/where-to-check-resolution-of-embedded-preview-in-arw-file.4795362/)
- [Which Sony cameras have larger embedded JPEGs in the ARW file (DPReview)](https://www.dpreview.com/forums/threads/anyone-which-sony-cameras-have-larger-embedded-jpegs-in-the-arw-file.4740079/)
- [ExifTool Sony tag names](https://exiftool.org/TagNames/Sony.html)
- [Film Simulations and RAF files (DPReview)](https://www.dpreview.com/forums/threads/film-simulations-and-raf-files.4356829/)
- [Prioritize extracting embedded JPEG previews to preserve in-camera look (PhotoPrism)](https://github.com/photoprism/photoprism/discussions/5333)
