/**
 * Photoshop PSD extractor (SPEC §6).
 *
 * PSD stores a JPEG thumbnail in image resource 1036 (Photoshop 5+), after a
 * 28-byte header. Resource 1033 is the older BGR form and is only used when
 * its format field says JPEG.
 */
import type { Reader } from "../reader.js";
import type { ThumbnailCandidate } from "../types.js";
export declare function matches(bytes: Uint8Array): boolean;
/** Image-resource thumbnails; shared with PSB (same 32-bit resource lengths). */
export declare function extractPhotoshopPreviews(reader: Reader): ThumbnailCandidate[];
export declare function extract(reader: Reader): Promise<ThumbnailCandidate[]>;
