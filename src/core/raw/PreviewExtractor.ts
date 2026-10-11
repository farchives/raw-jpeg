import * as lib from "./vendor/extract-raw-preview/browser.js";
import { classify } from "./formats";
import type { ExtractedPreview, FailureReason, RawFormat } from "../../types";

export const MAX_PREVIEW_BYTES = 32 * 1024 * 1024; // library default of 8 MiB drops big previews

export type ExtractResult =
  | { found: true; preview: ExtractedPreview }
  | { found: false; reason: FailureReason };

export interface PreviewExtractor {
  detectFormat(head: Uint8Array): RawFormat;
  extract(data: Uint8Array, format: RawFormat): Promise<ExtractResult>;
}

/** True when the JPEG starts with an APP1 "Exif\0\0" segment before any scan data. */
export function hasExifSegment(jpeg: Uint8Array): boolean {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) return false;
  let i = 2;
  while (i + 4 < jpeg.length) {
    if (jpeg[i] !== 0xff) return false;
    const marker = jpeg[i + 1]!;
    if (marker === 0xda || marker === 0xd9) return false;
    const len = (jpeg[i + 2]! << 8) | jpeg[i + 3]!;
    if (
      marker === 0xe1 &&
      jpeg[i + 4] === 0x45 && jpeg[i + 5] === 0x78 && jpeg[i + 6] === 0x69 &&
      jpeg[i + 7] === 0x66 && jpeg[i + 8] === 0 && jpeg[i + 9] === 0
    ) {
      return true;
    }
    if (len < 2) return false;
    i += 2 + len;
  }
  return false;
}

/** Narrow slice of the vendored library, injectable so reason mapping is testable. */
export interface PreviewLib {
  extractThumbnail: typeof lib.extractThumbnail;
  listThumbnails: typeof lib.listThumbnails;
}

export function createPreviewExtractor(l: PreviewLib = lib): PreviewExtractor {
  return {
    detectFormat: (head) => classify(head).format,

    async extract(data, format) {
      try {
        const r = await l.extractThumbnail(data, {
          prefer: "largest",
          maxBytes: MAX_PREVIEW_BYTES,
          // The library sniffs for itself; only force it for formats it knows by the same id.
          ...(format !== "unknown" && format !== "srw" && format !== "x3f" ? { format } : {}),
        });
        if (r.found) {
          return {
            found: true,
            preview: {
              data: r.data,
              width: r.width,
              height: r.height,
              mimeType: r.mimeType,
              hasExif: r.mimeType === "image/jpeg" && hasExifSegment(r.data),
            },
          };
        }
        // Not found: work out whether there was nothing, or only lossless (SOF3) candidates.
        const all = await l.listThumbnails(data);
        if (all.length > 0 && all.every((t) => !t.decodable)) {
          return { found: false, reason: "preview-not-decodable" };
        }
        return { found: false, reason: "no-preview-found" };
      } catch {
        return { found: false, reason: "corrupt-or-unreadable" };
      }
    },
  };
}
