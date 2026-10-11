/**
 * Operational errors (SPEC §4.3).
 *
 * `extract-raw-preview` separates *reportable outcomes* — which resolve as
 * `{ found: false, reason }` — from *operational errors*, which reject the
 * promise with an `Error` carrying one of these codes.
 */
export class ExtractError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.name = "ExtractError";
        this.code = code;
    }
}
export function isExtractError(value) {
    return value instanceof ExtractError;
}
/** Bounds violation on a *required* structure (SPEC §5.2). */
export function truncated(message) {
    return new ExtractError("ERR_TRUNCATED", message);
}
