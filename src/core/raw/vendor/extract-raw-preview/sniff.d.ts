/**
 * Magic-byte format detection (SPEC §4.1, §6).
 *
 * Sniffing reads at most the first 64 KiB: enough for every signature here,
 * including the DNG version tag and IFD0 `Make`, which live near the front of
 * TIFF-container files.
 */
import type { FormatId } from "./types.js";
/** Upper bound on how much of an input sniffing may look at (SPEC §4.1). */
export declare const SNIFF_BYTES: number;
export declare function hasJpegSignature(bytes: Uint8Array): boolean;
export declare function hasPhotoshopSignature(bytes: Uint8Array): boolean;
export declare function hasRafSignature(bytes: Uint8Array): boolean;
export declare function hasCr3Signature(bytes: Uint8Array): boolean;
export declare function hasOrfSignature(bytes: Uint8Array): boolean;
export declare function hasRw2Signature(bytes: Uint8Array): boolean;
export declare function hasTiffMagic(bytes: Uint8Array): boolean;
/** `II*\x00` followed by the CR2 signature `CR\x02\x00` at offset 8. */
export declare function hasCr2Signature(bytes: Uint8Array): boolean;
/** TIFF magic plus a `DNGVersion` tag in IFD0. */
export declare function hasDngVersion(bytes: Uint8Array): boolean;
/** Returns the detected format, or `undefined` when nothing matches. */
export declare function sniffFormat(bytes: Uint8Array): FormatId | undefined;
