# Contract: Settings Persistence

**Storage**: `localStorage`, key `rawjpeg.settings.v1` | **Consumer**: `core/settings/settings.ts`

```jsonc
{
  "schemaVersion": 1,
  "quality": "as-shot",        // "as-shot" | 1..100
  "maxLongEdge": null,         // null | 256..20000
  "keepMetadata": true,
  "collisionPolicy": "skip"    // "skip" | "overwrite" | "keep-both"
}
```

## Behavioral requirements

1. **Never block on bad data.** Missing, malformed, or unknown-version entries fall back to
   defaults silently. A corrupted settings blob must never prevent someone converting photos.
2. **Clamp, don't reject.** Out-of-range numbers are clamped to their bounds.
3. **Defaults are the least-surprising choice**: `as-shot` quality and no size cap mean the
   default run is a lossless pass-through of the camera's own JPEG; `skip` means a second run
   over the same destination never destroys existing work.
4. **Written on change, read once at startup.** The in-memory copy is authoritative during a
   session; a run snapshots settings at start (see [data-model.md](../data-model.md)).
5. **No directory handles here.** `localStorage` cannot hold them, and persisting handles in
   IndexedDB is explicitly out of scope for v1 — it would require re-prompting for permission
   and FR-025 asks only that *settings* persist.
