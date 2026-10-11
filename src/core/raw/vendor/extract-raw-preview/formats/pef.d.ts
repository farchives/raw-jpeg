/**
 * Pentax PEF extractor (SPEC §6).
 *
 * PEF is a TIFF container. Preview JPEGs are stored as
 * `JPEGInterchangeFormat` blobs on later IFDs.
 */
import type { Reader } from "../reader.js";
import type { ThumbnailCandidate } from "../types.js";
export declare function matches(bytes: Uint8Array): boolean;
export declare function extract(reader: Reader): Promise<ThumbnailCandidate[]>;
