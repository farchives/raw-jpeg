/**
 * TIFF extractor (SPEC §6).
 *
 * Any IFD with JPEG compression (6 or 7) holding strips, or a
 * `JPEGInterchangeFormat` thumbnail, is a candidate. `SubIFDs` are followed
 * because multi-image TIFFs nest their reduced-resolution images there.
 */
import type { Reader } from "../reader.js";
import type { ThumbnailCandidate } from "../types.js";
export declare function matches(bytes: Uint8Array): boolean;
export declare function extract(reader: Reader): Promise<ThumbnailCandidate[]>;
