/**
 * Sony ARW extractor (SPEC §6).
 *
 * ARW is a TIFF container. Preview JPEGs are stored as
 * `JPEGInterchangeFormat` blobs on IFD0 / IFD1.
 */
import type { Reader } from "../reader.js";
import type { ThumbnailCandidate } from "../types.js";
export declare function matches(bytes: Uint8Array): boolean;
export declare function extract(reader: Reader): Promise<ThumbnailCandidate[]>;
