/**
 * Olympus ORF extractor (SPEC §6).
 *
 * ORF is TIFF-like but uses magic `OR` (`MMOR` / `IIRO`) or `RS` (`IIRS`)
 * instead of 42. The thumbnail lives in IFD1 as `JPEGInterchangeFormat`.
 */
import type { Reader } from "../reader.js";
import type { ThumbnailCandidate } from "../types.js";
export declare function matches(bytes: Uint8Array): boolean;
export declare function extract(reader: Reader): Promise<ThumbnailCandidate[]>;
