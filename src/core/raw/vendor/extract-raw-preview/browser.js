/**
 * Browser entry (SPEC §4).
 *
 * Same extraction API as the Node package, but input is bytes only — no
 * `node:fs`, no native addons. Bundlers resolve this file via the `browser`
 * export condition.
 */
import { DEFAULT_MAX_BYTES, detectFormatFromBytes, extractThumbnailFromBytes, listThumbnailsFromBytes, } from "./core.js";
import { ExtractError } from "./errors.js";
export { ExtractError, isExtractError } from "./errors.js";
export { Reader } from "./reader.js";
export { supportedFormats } from "./registry.js";
export { SNIFF_BYTES } from "./sniff.js";
export { DEFAULT_MAX_BYTES };
function requireBytes(input) {
    if (!(input instanceof Uint8Array)) {
        throw new ExtractError("ERR_IO", "input must be a Uint8Array");
    }
    return input;
}
/**
 * Sniffs `input` by magic bytes and returns the detected `FormatId`, or
 * `undefined` if the bytes match no known signature.
 */
export async function detectFormat(input) {
    return detectFormatFromBytes(requireBytes(input));
}
/**
 * Returns every embedded preview candidate, largest first, **without**
 * `maxBytes` filtering and **including** non-decodable candidates.
 */
export async function listThumbnails(input) {
    return listThumbnailsFromBytes(requireBytes(input));
}
/**
 * Locates and returns the best embedded preview.
 *
 * `maxBytes` is a per-candidate filter, not a hard error: an oversized candidate
 * is removed from consideration and never rejects the call (SPEC §4.2).
 */
export async function extractThumbnail(input, options = {}) {
    return extractThumbnailFromBytes(requireBytes(input), options);
}
