# Feature Specification: RAW to JPEG Folder Converter

**Feature Branch**: `main` (no branch extension configured; spec directory is `specs/001-raw-to-jpeg-converter`)

**Created**: 2026-10-10

**Status**: Draft (clarified 2026-10-10)

**Input**: User description: "can you help me create a github hosted frontend website that you can point a directory in your computer to and you point it to a destination dir. It should be able to take all the raw images in that directory and convert them to jpeg and store them in the destination directory"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Convert a folder of RAW photos to JPEG (Priority: P1)

A photographer has just offloaded a shoot from their camera card into a folder on their computer. They open the site, choose that folder as the source, choose (or create) a second folder as the destination, and start the conversion. Every RAW image in the source folder is written out as a JPEG into the destination folder, keeping its original base filename. Nothing is uploaded anywhere — the photos never leave their machine.

**Why this priority**: This is the entire reason the product exists. On its own it is a complete, shippable tool: point, point, convert. Every other story only makes this one nicer.

**Independent Test**: Place a folder of known RAW files on disk, run the flow end to end, and confirm a matching JPEG exists in the destination folder for each RAW file and that each JPEG opens correctly in a standard image viewer.

**Acceptance Scenarios**:

1. **Given** a source folder containing 10 RAW files in supported formats and an empty destination folder, **When** the user selects both folders and starts the conversion, **Then** 10 JPEG files appear in the destination folder, each named after its source file with a `.jpg` extension, and the user is shown a summary stating 10 of 10 succeeded.
2. **Given** a source folder containing a mix of RAW files, JPEGs, sidecar files, and video files, **When** the user starts the conversion, **Then** only the RAW files are converted, the non-RAW files are left untouched and are not copied to the destination, and the summary reports how many files were skipped as not-RAW.
3. **Given** the user has selected a source folder, **When** they have not yet selected a destination folder, **Then** the start control is unavailable and the interface states which selection is still missing.
4. **Given** a completed conversion, **When** the user inspects an output JPEG, **Then** it carries the capture date, camera make/model, lens, and exposure settings from the original RAW file, and looks the way the image looked on the back of the camera.

---

### User Story 2 - Watch progress and see exactly what failed (Priority: P2)

Converting a few hundred RAW files takes real time. While it runs, the user can see how far along it is, which file is being worked on, and a running count of succeeded / failed / skipped. They can cancel partway through without corrupting anything. When it finishes, any file that failed is listed by name with a plain-language reason.

**Why this priority**: Without it the tool is usable but nerve-racking on any realistic batch — the user cannot tell a slow conversion from a hung one, and a single bad file silently missing from the output is worse than a visible error.

**Independent Test**: Run a batch that deliberately includes one corrupt file and one unsupported file, and confirm progress advances visibly, the batch still completes, and the final report names both problem files with distinct reasons.

**Acceptance Scenarios**:

1. **Given** a conversion of 100 files is running, **When** the user looks at the interface, **Then** they see the current file name, a count of files completed out of the total, and a running tally of succeeded, failed, and skipped.
2. **Given** a conversion is running, **When** the user cancels it, **Then** processing stops within a few seconds, already-written JPEGs remain valid in the destination, no partially-written output file is left behind, and the user is told how many files were completed before cancelling.
3. **Given** a batch in which one file cannot be read, **When** the batch completes, **Then** the remaining files still convert, and the failure report names the file and gives a reason the user can act on.
4. **Given** a completed conversion with failures, **When** the user chooses to retry, **Then** only the previously failed files are reprocessed.

---

### User Story 3 - Control output quality, sizing, and overwrite behavior (Priority: P3)

Different jobs need different output. By default the user gets the camera's own full-size rendering passed through untouched. When they need something smaller — web proofs, email, a client gallery — they can cap the long edge to a maximum pixel dimension and set a JPEG quality level, which re-encodes. They can also choose whether camera metadata is carried over or stripped, and what happens when a file of the same name already exists in the destination: skip it, overwrite it, or write alongside it with a numbered suffix.

**Why this priority**: Valuable, but the tool delivers its core value with sensible defaults. These settings turn a one-trick converter into something a user will reach for repeatedly (web-sized proofs vs. full-size deliverables).

**Independent Test**: Convert the same source folder twice with different quality and max-dimension settings, and confirm the resulting file sizes and pixel dimensions differ as configured; then convert a third time into a non-empty destination and confirm each collision policy behaves as described.

**Acceptance Scenarios**:

1. **Given** the user leaves quality at the default "as shot" and sets no size cap, **When** the conversion completes, **Then** each output file is byte-identical to the preview embedded in its source RAW file.
2. **Given** the user sets an explicit JPEG quality to a low value, **When** the conversion completes, **Then** output files are measurably smaller than the same conversion at a high quality value.
3. **Given** the user sets a maximum long-edge dimension, **When** the conversion completes, **Then** no output image exceeds that dimension on its longer side and the original aspect ratio is preserved.
4. **Given** a destination folder that already contains a JPEG matching an output name and the collision policy is "skip", **When** the conversion runs, **Then** the existing file is left byte-for-byte unchanged and that file is reported as skipped.
5. **Given** the same situation with the policy set to "keep both", **When** the conversion runs, **Then** a new file is written under a distinct name and the existing file is left unchanged.
6. **Given** the user has chosen settings and returns to the site later, **When** the page loads, **Then** their previous settings are still in effect.

---

### Edge Cases

- **Empty or RAW-free source folder**: the user is told plainly that no convertible images were found, rather than being shown an empty success.
- **Source and destination are the same folder**: the user is warned before starting, since output can land next to the originals and future runs would re-scan their own output.
- **Destination is inside the source folder**: same warning, to avoid a run that feeds on its own output.
- **Output name collision** (including two different RAW formats sharing a base name, e.g. `IMG_0042.CR3` and `IMG_0042.NEF`): resolved by the configured collision policy; "keep both" must never silently clobber.
- **Corrupt or truncated RAW file**: that one file fails with a reason; the batch continues.
- **RAW file in a format outside the supported list**: reported as skipped-unsupported and named, distinct from a genuine failure.
- **RAW file with no embedded preview, or an undersized one**: reported as a named failure with the reason given; never silently written at reduced resolution.
- **Permission to the folder is revoked, or the destination folder is deleted, mid-run**: the run stops with a clear explanation and a count of what completed; already-written files remain intact.
- **User closes or reloads the page mid-run**: the run ends; files already written remain valid and complete, with no truncated output left behind.
- **Very large batches (1,000+ files) and very large individual files**: the run completes without the page becoming unresponsive and without memory exhaustion; memory use does not grow unbounded with batch size.
- **Destination drive runs out of space**: the run stops with a clear explanation rather than silently producing truncated files.
- **Read-only destination folder**: detected and reported before the batch starts, not after the first file fails.
- **Browser or device that cannot grant folder access**: the user is told up front, before being asked to select anything, and is given the names of browsers that do work.
- **Files added to the source folder while the run is in progress**: the run operates on the file list captured at start; late additions are not silently half-processed.

## Requirements *(mandatory)*

### Functional Requirements

**Folder selection**

- **FR-001**: Users MUST be able to designate a folder on their own computer as the source folder.
- **FR-002**: Users MUST be able to designate a separate folder on their own computer as the destination folder, including one they create at selection time.
- **FR-003**: System MUST display the chosen source and destination locations in a form the user can recognize, and allow either to be changed before starting.
- **FR-004**: System MUST warn the user before starting when the destination is the same as, or is contained within, the source folder.
- **FR-005**: System MUST prevent the conversion from starting until both a source and a destination have been chosen.

**Discovery and scope**

- **FR-006**: System MUST scan the source folder and identify which files are RAW images eligible for conversion.
- **FR-007**: System MUST support these RAW formats: Fujifilm (`.raf`), Canon (`.cr2`, `.cr3`), Nikon (`.nef`), Sony (`.arw`), and Adobe (`.dng`).
- **FR-008**: System MUST recognize RAW files outside the supported list (e.g. `.orf`, `.rw2`, `.pef`, `.srw`, `.x3f`) and report each by name as skipped-unsupported — a distinct outcome from a conversion failure.
- **FR-009**: System MUST leave every non-RAW file in the source folder untouched and MUST NOT copy it to the destination.
- **FR-010**: System MUST report the number of eligible RAW files found before conversion begins, so the user can confirm they picked the right folder.
- **FR-011**: System MUST never modify, move, or delete any file in the source folder.

**Conversion**

- **FR-012**: System MUST convert each eligible RAW file into a JPEG written to the destination folder.
- **FR-013**: Each output file MUST retain the base filename of its source file, with a `.jpg` extension.
- **FR-014**: System MUST source each output image from the full-size JPEG preview the camera embedded in the RAW file, so that the camera's own in-body rendering as selected at capture — including Fujifilm film simulations such as Provia, Velvia, Classic Chrome, and Acros — is preserved in the output.
- **FR-015**: When the user has requested neither a size cap nor an explicit quality change, System MUST write the embedded preview through unmodified, with no re-encoding and therefore no generation loss.
- **FR-016**: When the user has set a maximum dimension or an explicit quality level, System MUST re-encode from the embedded preview at those settings.
- **FR-017**: When a RAW file contains no embedded preview, or one below a usable resolution threshold, System MUST report that file as failed with a reason naming the cause. System MUST NOT silently write an undersized image in its place.
- **FR-018**: Output JPEGs MUST be valid files that open in standard image viewers, with correct orientation as recorded by the camera.
- **FR-019**: System MUST carry the original capture metadata (capture date/time, camera make and model, lens, exposure settings) into the output JPEG by default, and MUST allow the user to strip it instead.
- **FR-020**: System MUST process all eligible files in the source folder in a single run without the user acting on each file individually.
- **FR-021**: System MUST perform all conversion on the user's own machine; no image file or image content may be transmitted off the device.

**Output settings**

- **FR-022**: Users MUST be able to set the JPEG quality level for the batch, including an "as shot" option — the default — that passes the embedded preview through without re-encoding.
- **FR-023**: Users MUST be able to optionally cap the output's longer edge at a maximum pixel dimension, preserving aspect ratio.
- **FR-024**: Users MUST be able to choose the behavior when an output filename already exists in the destination: skip, overwrite, or write under a distinct name.
- **FR-025**: System MUST remember the user's settings between visits and apply sensible defaults on first use.

**Progress, control, and reporting**

- **FR-026**: System MUST show live progress during a run: files completed out of total, the file currently being processed, and running counts of succeeded, failed, and skipped.
- **FR-027**: Users MUST be able to cancel a run in progress, stopping within a few seconds.
- **FR-028**: System MUST ensure a cancelled, interrupted, or failed run never leaves a partially written output file in the destination.
- **FR-029**: System MUST continue processing remaining files after an individual file fails.
- **FR-030**: System MUST present an end-of-run summary listing every failed file by name with a plain-language reason, and every skipped file with the reason it was skipped.
- **FR-031**: Users MUST be able to retry only the files that failed, without reprocessing files that already succeeded.
- **FR-032**: System MUST remain responsive to user input throughout a run, including on batches of 1,000+ files.

**Access and availability**

- **FR-033**: System MUST be reachable as a public website requiring no installation, account, or sign-in.
- **FR-034**: System MUST detect, before the user is asked to select anything, whether their browser can grant the folder access this feature requires. When it cannot, System MUST state this plainly and name the browsers that do work, and MUST NOT present the folder-selection flow. No alternative upload-and-download flow is offered in this release.
- **FR-035**: System MUST state clearly and visibly that images are processed locally and never uploaded.

### Key Entities

- **Source Folder**: The user-designated location holding the original images. Read-only from this feature's perspective. Known by its display name and the list of files it contained at the moment a run started.
- **Destination Folder**: The user-designated location where output is written. Must be writable. May already contain files, which drives collision handling.
- **RAW Image File**: An individual eligible source file. Attributes: filename, base name, format, byte size, embedded capture metadata, embedded orientation.
- **Converted JPEG**: The output produced from one RAW Image File. Attributes: filename, pixel dimensions, quality level, carried-over metadata.
- **Conversion Settings**: The user's chosen quality, maximum dimension, metadata handling, and collision policy. Persisted between visits.
- **Conversion Run**: One batch execution. Attributes: source, destination, settings snapshot, file list captured at start, start/end time, and overall state (running, completed, cancelled, stopped-by-error).
- **File Result**: The outcome for one file within a run. Attributes: source filename, outcome (succeeded / failed / skipped), reason when not succeeded, and output filename when succeeded.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can go from landing on the page to a running conversion in under 60 seconds, with no account, install, or configuration.
- **SC-002**: At least 95% of files in the supported RAW formats convert successfully without any user intervention.
- **SC-003**: A batch of 100 typical RAW files (roughly 25 MB each) completes in under 2 minutes on a current consumer laptop.
- **SC-004**: With the network disconnected after the page has loaded, a full conversion still completes successfully — demonstrating that no image data leaves the device.
- **SC-005**: Zero silent failures: for every eligible file found, the end-of-run report accounts for it as succeeded, failed, or skipped, and every non-success carries a stated reason.
- **SC-006**: 100% of successfully converted output files open in standard image viewers at the correct orientation and retain capture date and camera identification.
- **SC-007**: A batch of 1,000 files completes without the interface becoming unresponsive and without memory growth that forces the page to reload.
- **SC-008**: Re-running the identical conversion into the same destination produces no duplicate or corrupted files, with the outcome matching the user's chosen collision policy every time.
- **SC-009**: At least 90% of first-time users successfully complete a conversion on their first attempt without needing outside help or documentation.
- **SC-010**: A cancelled run leaves zero partially written or unreadable files in the destination folder, verified across 20 cancellations at random points.
- **SC-011**: Output visually matches the camera's own in-body rendering as selected at capture — a Fujifilm file shot with a film simulation applied produces a JPEG carrying that look, not a neutral or flat rendering.
- **SC-012**: With default settings (no size cap, quality left "as shot"), output is byte-identical to the preview the camera embedded — zero generation loss — verified across every supported format.

## Assumptions

- **Users and context**: The primary user is a photographer or hobbyist converting a shoot's worth of RAW files at once, working on a desktop or laptop. They understand what a folder is and where their photos live.
- **Local-only processing**: Images are processed entirely on the user's device. The site is a static, publicly hosted page; there is no backend that receives images, and therefore no upload limits, accounts, or server storage to design for.
- **Folder depth**: Only files directly inside the chosen source folder are converted in v1. Recursing into subfolders and mirroring that structure into the destination is out of scope for this release.
- **Flat output**: All output lands directly in the destination folder; no per-run subfolder is created.
- **Output source**: Output is derived from the full-size JPEG preview the camera embeds in each RAW file, not from a full decode of the sensor data. This preserves the camera's own rendering (notably Fujifilm film simulations) and keeps conversion fast. The consequence, accepted deliberately: output reflects the camera's interpretation rather than a neutral starting point for editing, and resolution is bounded by what the camera embedded.
- **Not an editing pipeline**: Because output carries the camera's rendering baked in, this tool suits convert-and-deliver workflows. Anyone wanting a neutral file to grade from should use dedicated RAW software.
- **Defaults**: Quality defaults to "as shot" — the embedded preview is passed through with no re-encoding; no maximum dimension is applied by default; metadata is carried over by default; the default collision policy is "skip", as the least destructive choice.
- **Unsupported RAW formats**: Formats outside the supported list are detected and reported rather than ignored, so the user is never left guessing why a file produced no output. Adding a format later is an extension of FR-007, not a redesign.
- **Single run at a time**: One conversion run is active at a time. Queuing multiple folders is out of scope.
- **No editing**: This is a format conversion, not an editor. White balance, exposure correction, cropping, lens corrections, color grading, and watermarking are all out of scope.
- **No sidecar handling**: Sidecar files (e.g. `.xmp`) are treated as non-RAW files — left alone, not read, not applied, not copied.
- **Desktop only**: Mobile browsers are not a target for v1, as the folder-access and local-storage model does not fit mobile file systems.
- **Browser support**: Folder access is available only in some desktop browsers. Unsupported browsers are told so plainly and shown no folder-selection flow; no upload-and-download fallback is built in v1.
- **Hosting**: The site is served as a static site from a public code-hosting provider's page-hosting service, which imposes no runtime infrastructure requirements on this feature.
