/**
 * Nikon NEF extractor (SPEC §6).
 *
 * NEF is a TIFF container. Preview JPEGs live in SubIFDs or as
 * `JPEGInterchangeFormat` blobs, same as CR2/DNG.
 */
import type { Reader } from "../reader.js";
import type { ThumbnailCandidate } from "../types.js";
export declare function matches(bytes: Uint8Array): boolean;
export declare function extract(reader: Reader): Promise<ThumbnailCandidate[]>;
