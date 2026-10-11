# Contract: PreviewExtractor

**Consumers**: `workers/convert.worker.ts` | **Implementation**: wraps the vendored `extract-raw-preview`

Isolates the one third-party dependency on the critical path (research R-001), so replacing it
— with hand-rolled parsers or with LibRaw-WASM — costs one file.

```ts
interface PreviewExtractor {
  detectFormat(head: Uint8Array): RawFormat;            // magic bytes, not extension
  extract(data: Uint8Array, format: RawFormat): Promise<ExtractResult>;
}

type ExtractResult =
  | { found: true;  preview: ExtractedPreview }
  | { found: false; reason: FailureReason };
```

## Behavioral requirements

1. **Largest candidate always.** Must select the largest embedded preview, never the first.
   Many Sony bodies embed a 1616×1080 `PreviewImage` alongside a full-size `JpgFromRaw`, and
   several embed only a 160×120 thumbnail — taking the first candidate silently hands the user
   a thumbnail named like a deliverable (research R-003).
2. **`maxBytes` ≥ 32 MiB.** The library default of 8 MiB drops full-size previews from
   high-megapixel bodies, reporting them as "all candidates exceed maxBytes" — a spurious
   failure on exactly the files that matter most.
3. **Never decode or re-encode.** Returns stored bytes verbatim. This is what makes the
   pass-through path byte-identical to the camera's own JPEG (SC-012).
4. **Reason mapping.** Library outcomes map onto `FailureReason`: no candidates →
   `no-preview-found`; only lossless-JPEG (SOF3) candidates → `preview-not-decodable`;
   malformed container → `corrupt-or-unreadable`. The library's own strings are never shown to
   users.
5. **`hasExif` must be accurate.** Set by checking for an APP1/`Exif\0\0` segment in the
   returned bytes. The re-encode path relies on it to decide whether to splice EXIF from the
   source container (research R-002); a wrong answer silently drops capture metadata.
6. **Format detection reads at most 64 KiB.** Detection must never require the whole file.
