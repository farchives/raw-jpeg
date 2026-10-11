/**
 * Panasonic RW2 extractor (SPEC §6).
 *
 * RW2 is TIFF-like with magic `IIU\0` (85) instead of 42. The embedded JPEG
 * preview is Panasonic tag 0x002E (`JpgFromRaw`); that JPEG often also carries
 * an EXIF IFD1 thumbnail.
 */
import type { Reader } from "../reader.js";
import type { ThumbnailCandidate } from "../types.js";
export declare function matches(bytes: Uint8Array): boolean;
export declare function extract(reader: Reader): Promise<ThumbnailCandidate[]>;
