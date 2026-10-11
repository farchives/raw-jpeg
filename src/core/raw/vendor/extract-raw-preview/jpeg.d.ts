/**
 * Minimal embedded-image inspection: identify the bytes and read the frame
 * header. Nothing here decodes pixels (SPEC §9.4) — we only need the MIME type,
 * the frame dimensions and whether a standard decoder could open the stream.
 */
import type { EmbeddedImageKind, PreviewMimeType } from "./types.js";
export interface ImageInfo {
    mimeType: PreviewMimeType;
    kind: EmbeddedImageKind;
    width: number;
    height: number;
    decodable: boolean;
}
export declare const PNG_SIGNATURE: readonly [137, 80, 78, 71, 13, 10, 26, 10];
export declare function looksLikeJpeg(bytes: Uint8Array): boolean;
export declare function looksLikePng(bytes: Uint8Array): boolean;
/**
 * Walks JPEG markers up to the first SOF, which always precedes entropy-coded
 * data. Returns zeroed dimensions when no SOF is reachable (a truncated or
 * corrupt stream), which callers treat as "not decodable".
 */
export declare function inspectJpeg(bytes: Uint8Array): ImageInfo;
export declare function inspectPng(bytes: Uint8Array): ImageInfo;
/** Identifies an embedded preview by content, not by container metadata. */
export declare function inspectImage(bytes: Uint8Array): ImageInfo | undefined;
/**
 * Byte length of a complete JPEG starting at `bytes[0]`, including the EOI
 * marker. APP bodies are skipped by their declared length so an EXIF thumbnail
 * nested in APP1 cannot truncate the outer stream. Returns `undefined` when no
 * EOI is reachable.
 */
export declare function jpegByteLength(bytes: Uint8Array): number | undefined;
/** Copy of the JPEG at `offset`, or `undefined` when no complete stream is there. */
export declare function extractJpegAt(bytes: Uint8Array, offset: number): Uint8Array | undefined;
/**
 * TIFF payload of the first APP1 `Exif\0\0` segment, or `undefined`. Offsets
 * inside the returned bytes are relative to the TIFF header, as EXIF requires.
 */
export declare function findExifTiff(bytes: Uint8Array): Uint8Array | undefined;
