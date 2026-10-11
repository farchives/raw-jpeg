/**
 * Byte-oriented extraction shared by the Node and browser entry points.
 *
 * This module must stay free of Node built-ins so the browser bundle can load
 * it as-is.
 */
import { type ExtractOptions, type ExtractResult, type FormatId, type Thumbnail } from "./types.js";
/** Per-candidate byte cap default (SPEC §4.2). */
export declare const DEFAULT_MAX_BYTES: number;
/**
 * Sniffs `bytes` by magic bytes and returns the detected `FormatId`, or
 * `undefined` if the bytes match no known signature. Looks at at most 64 KiB.
 */
export declare function detectFormatFromBytes(bytes: Uint8Array): FormatId | undefined;
/**
 * Returns every embedded preview candidate, largest first, **without**
 * `maxBytes` filtering and **including** non-decodable candidates.
 */
export declare function listThumbnailsFromBytes(bytes: Uint8Array): Promise<Thumbnail[]>;
/**
 * Locates and returns the best embedded preview from already-resolved bytes.
 *
 * `maxBytes` is a per-candidate filter, not a hard error: an oversized candidate
 * is removed from consideration and never rejects the call (SPEC §4.2).
 */
export declare function extractThumbnailFromBytes(bytes: Uint8Array, options?: ExtractOptions): Promise<ExtractResult>;
