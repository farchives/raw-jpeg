/**
 * Preview collection shared by every TIFF-container format (SPEC §5.3, §5.4).
 *
 * Format modules configure this rather than re-implementing it: registering a
 * format is one new file plus one line in `registry.ts`.
 */
import { Reader } from "../reader.js";
import type { ThumbnailCandidate } from "../types.js";
export interface PreviewExtractionOptions {
    /**
     * IFD-pointer tags to follow in addition to the next-IFD chain.
     * Defaults to `SubIFDs`, which is how DNG stores its preview images and how
     * multi-image TIFFs nest them.
     */
    pointerTags?: readonly number[];
    /** Extra IFD seeds beyond the container header's first IFD. */
    extraSeeds?: readonly number[];
    /** Accepted TIFF magic numbers. Defaults to classic TIFF (`42`). */
    magics?: readonly number[];
}
export declare function isJpegCompression(compression: number | undefined): boolean;
/** Wraps a standalone JPEG/PNG buffer as a candidate when it has a frame header. */
export declare function candidateFromImageBytes(data: Uint8Array): ThumbnailCandidate | undefined;
/**
 * EXIF IFD1 (and any other JPEG-bearing IFD) nested in a JPEG's APP1 segment.
 * Used by the JPEG extractor and by RAF/RW2, whose previews are themselves JPEGs
 * that often carry a smaller thumbnail.
 */
export declare function extractJpegExifPreviews(jpeg: Uint8Array): ThumbnailCandidate[];
/** Drops duplicates that share dimensions and byte length. */
export declare function uniqueCandidates(candidates: readonly ThumbnailCandidate[]): ThumbnailCandidate[];
/**
 * Walks the container and returns every embedded preview it can identify,
 * including non-decodable ones, which `listThumbnails` exposes for inspection.
 */
export declare function extractTiffPreviews(reader: Reader, options?: PreviewExtractionOptions): ThumbnailCandidate[];
