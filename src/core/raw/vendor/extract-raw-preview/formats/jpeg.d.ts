/**
 * JPEG extractor (SPEC §6).
 *
 * The primary image is not a preview. The thumbnail lives in EXIF IFD1 as a
 * `JPEGInterchangeFormat` blob inside the APP1 segment.
 */
import type { Reader } from "../reader.js";
import type { ThumbnailCandidate } from "../types.js";
export declare function matches(bytes: Uint8Array): boolean;
export declare function extract(reader: Reader): Promise<ThumbnailCandidate[]>;
