/**
 * Browser entry (SPEC §4).
 *
 * Same extraction API as the Node package, but input is bytes only — no
 * `node:fs`, no native addons. Bundlers resolve this file via the `browser`
 * export condition.
 */
import { DEFAULT_MAX_BYTES } from "./core.js";
import type { ExtractOptions, ExtractResult, FormatId, Thumbnail } from "./types.js";
export type { ExtractErrorCode } from "./errors.js";
export { ExtractError, isExtractError } from "./errors.js";
export { Reader } from "./reader.js";
export { supportedFormats } from "./registry.js";
export { SNIFF_BYTES } from "./sniff.js";
export type { ExtractOptions, ExtractResult, FormatId, PreviewMimeType, Thumbnail, ThumbnailOrigin, } from "./types.js";
/** Browser input is the file bytes. Paths and `file:` URLs are Node-only. */
export type ExtractInput = Uint8Array;
export { DEFAULT_MAX_BYTES };
/**
 * Sniffs `input` by magic bytes and returns the detected `FormatId`, or
 * `undefined` if the bytes match no known signature.
 */
export declare function detectFormat(input: Uint8Array): Promise<FormatId | undefined>;
/**
 * Returns every embedded preview candidate, largest first, **without**
 * `maxBytes` filtering and **including** non-decodable candidates.
 */
export declare function listThumbnails(input: Uint8Array): Promise<Thumbnail[]>;
/**
 * Locates and returns the best embedded preview.
 *
 * `maxBytes` is a per-candidate filter, not a hard error: an oversized candidate
 * is removed from consideration and never rejects the call (SPEC §4.2).
 */
export declare function extractThumbnail(input: Uint8Array, options?: ExtractOptions): Promise<ExtractResult>;
