/**
 * Public API (SPEC §4). Node entry: a path, a `file:` URL, or raw bytes.
 *
 * Reportable outcomes (`{ found: false, reason }`) resolve; operational errors
 * reject with an `ExtractError` carrying a `code` (SPEC §4.3).
 */
import { DEFAULT_MAX_BYTES } from "./core.js";
import type { ExtractInput, ExtractOptions, ExtractResult, FormatId, Thumbnail } from "./types.js";
export type { ExtractErrorCode } from "./errors.js";
export { ExtractError, isExtractError } from "./errors.js";
export { Reader } from "./reader.js";
export { supportedFormats } from "./registry.js";
export { SNIFF_BYTES } from "./sniff.js";
export type { ExtractInput, ExtractOptions, ExtractResult, FormatId, PreviewMimeType, Thumbnail, ThumbnailOrigin, } from "./types.js";
export { DEFAULT_MAX_BYTES };
/**
 * Sniffs `input` by magic bytes and returns the detected `FormatId`, or
 * `undefined` if the bytes match no known signature.
 */
export declare function detectFormat(input: ExtractInput): Promise<FormatId | undefined>;
/**
 * Returns every embedded preview candidate, largest first, **without**
 * `maxBytes` filtering and **including** non-decodable candidates.
 */
export declare function listThumbnails(input: ExtractInput): Promise<Thumbnail[]>;
/**
 * Locates and returns the best embedded preview.
 *
 * `maxBytes` is a per-candidate filter, not a hard error: an oversized candidate
 * is removed from consideration and never rejects the call (SPEC §4.2).
 */
export declare function extractThumbnail(input: ExtractInput, options?: ExtractOptions): Promise<ExtractResult>;
