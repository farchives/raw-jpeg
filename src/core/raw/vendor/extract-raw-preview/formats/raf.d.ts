/**
 * Fujifilm RAF extractor (SPEC §6).
 *
 * RAF is a proprietary header followed by a JPEG preview. Offset 84 holds a
 * big-endian pointer to that JPEG; the JPEG itself often carries a smaller
 * EXIF IFD1 thumbnail.
 */
import type { Reader } from "../reader.js";
import type { ThumbnailCandidate } from "../types.js";
export declare function matches(bytes: Uint8Array): boolean;
export declare function extract(reader: Reader): Promise<ThumbnailCandidate[]>;
