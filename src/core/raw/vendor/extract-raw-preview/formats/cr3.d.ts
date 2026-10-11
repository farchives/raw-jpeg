/**
 * Canon CR3 extractor (SPEC §6).
 *
 * CR3 is an ISO BMFF (`ftyp` brand `crx `) file. Preview JPEGs live in a `THMB`
 * box, a Canon `uuid` preview box, and often at the start of `mdat`. Each JPEG
 * is copied as stored; nested EXIF thumbnails are collected too.
 */
import type { Reader } from "../reader.js";
import type { ThumbnailCandidate } from "../types.js";
export declare function matches(bytes: Uint8Array): boolean;
export declare function extract(reader: Reader): Promise<ThumbnailCandidate[]>;
