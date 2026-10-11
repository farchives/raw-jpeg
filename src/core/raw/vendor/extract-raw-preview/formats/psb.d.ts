/**
 * Photoshop Large Document (PSB) extractor (SPEC §6).
 *
 * Same image-resource thumbnail as PSD (resource 1036). The file header
 * version is 2; resource lengths remain 32-bit.
 */
import type { Reader } from "../reader.js";
import type { ThumbnailCandidate } from "../types.js";
export declare function matches(bytes: Uint8Array): boolean;
export declare function extract(reader: Reader): Promise<ThumbnailCandidate[]>;
