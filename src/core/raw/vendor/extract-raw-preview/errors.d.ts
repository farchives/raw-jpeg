/**
 * Operational errors (SPEC §4.3).
 *
 * `extract-raw-preview` separates *reportable outcomes* — which resolve as
 * `{ found: false, reason }` — from *operational errors*, which reject the
 * promise with an `Error` carrying one of these codes.
 */
export type ExtractErrorCode = "ERR_UNRECOGNIZED_FORMAT" | "ERR_TRUNCATED" | "ERR_IO" | "ERR_UNSUPPORTED_FORMAT";
export declare class ExtractError extends Error {
    readonly code: ExtractErrorCode;
    constructor(code: ExtractErrorCode, message: string);
}
export declare function isExtractError(value: unknown): value is ExtractError;
/** Bounds violation on a *required* structure (SPEC §5.2). */
export declare function truncated(message: string): ExtractError;
