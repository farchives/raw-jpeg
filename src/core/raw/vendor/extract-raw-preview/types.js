/**
 * Public types (SPEC §3).
 *
 * The v0.1 `FormatId` union is closed on purpose: `ERR_UNSUPPORTED_FORMAT`
 * remains reachable at runtime for untyped callers, but typed callers cannot
 * name a format that has no registered extractor.
 */
/** Drops internal provenance, leaving exactly the public shape. */
export function toThumbnail(candidate) {
    return {
        data: candidate.data,
        mimeType: candidate.mimeType,
        width: candidate.width,
        height: candidate.height,
        byteLength: candidate.byteLength,
        origin: candidate.origin,
        decodable: candidate.decodable,
    };
}
