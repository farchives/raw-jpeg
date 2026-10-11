/**
 * Public API (SPEC §4). Node entry: a path, a `file:` URL, or raw bytes.
 *
 * Reportable outcomes (`{ found: false, reason }`) resolve; operational errors
 * reject with an `ExtractError` carrying a `code` (SPEC §4.3).
 */
import { open, readFile } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_MAX_BYTES, detectFormatFromBytes, extractThumbnailFromBytes, listThumbnailsFromBytes, } from "./core.js";
import { ExtractError } from "./errors.js";
import { SNIFF_BYTES } from "./sniff.js";
export { ExtractError, isExtractError } from "./errors.js";
export { Reader } from "./reader.js";
export { supportedFormats } from "./registry.js";
export { SNIFF_BYTES } from "./sniff.js";
export { DEFAULT_MAX_BYTES };
function isByteInput(input) {
    return input instanceof Uint8Array;
}
function pathFromUrl(url) {
    if (url.protocol !== "file:") {
        throw new ExtractError("ERR_IO", `unsupported URL scheme "${url.protocol}" — only file: is supported`);
    }
    try {
        return fileURLToPath(url);
    }
    catch (error) {
        throw new ExtractError("ERR_IO", `invalid file URL: ${error.message}`);
    }
}
async function readFileBytes(path) {
    try {
        return await readFile(path);
    }
    catch (error) {
        throw new ExtractError("ERR_IO", `could not read ${path}: ${error.message}`);
    }
}
/** Resolves any accepted input to bytes (SPEC §4.4). Bytes are used as-is. */
async function resolveBytes(input) {
    if (isByteInput(input))
        return input;
    if (typeof input === "string")
        return readFileBytes(resolvePath(input));
    if (input instanceof URL)
        return readFileBytes(pathFromUrl(input));
    throw new ExtractError("ERR_IO", "input must be a filesystem path, a file: URL, or a Uint8Array");
}
/** Resolves input to at most the first 64 KiB, for sniffing only (SPEC §4.1). */
async function resolveSniffBytes(input) {
    if (isByteInput(input)) {
        return input.length > SNIFF_BYTES ? input.subarray(0, SNIFF_BYTES) : input;
    }
    const path = typeof input === "string" ? resolvePath(input) : pathFromUrl(input);
    let handle;
    try {
        handle = await open(path, "r");
    }
    catch (error) {
        throw new ExtractError("ERR_IO", `could not open ${path}: ${error.message}`);
    }
    try {
        const buffer = new Uint8Array(SNIFF_BYTES);
        const { bytesRead } = await handle.read(buffer, 0, SNIFF_BYTES, 0);
        return bytesRead === buffer.length ? buffer : buffer.subarray(0, bytesRead);
    }
    catch (error) {
        throw new ExtractError("ERR_IO", `could not read ${path}: ${error.message}`);
    }
    finally {
        await handle.close();
    }
}
/**
 * Sniffs `input` by magic bytes and returns the detected `FormatId`, or
 * `undefined` if the bytes match no known signature.
 */
export async function detectFormat(input) {
    return detectFormatFromBytes(await resolveSniffBytes(input));
}
/**
 * Returns every embedded preview candidate, largest first, **without**
 * `maxBytes` filtering and **including** non-decodable candidates.
 */
export async function listThumbnails(input) {
    return listThumbnailsFromBytes(await resolveBytes(input));
}
/**
 * Locates and returns the best embedded preview.
 *
 * `maxBytes` is a per-candidate filter, not a hard error: an oversized candidate
 * is removed from consideration and never rejects the call (SPEC §4.2).
 */
export async function extractThumbnail(input, options = {}) {
    return extractThumbnailFromBytes(await resolveBytes(input), options);
}
