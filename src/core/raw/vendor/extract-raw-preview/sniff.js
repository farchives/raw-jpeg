/**
 * Magic-byte format detection (SPEC §4.1, §6).
 *
 * Sniffing reads at most the first 64 KiB: enough for every signature here,
 * including the DNG version tag and IFD0 `Make`, which live near the front of
 * TIFF-container files.
 */
import { findEntry, readIfd, readIfd0Make, readTiffHeader, Tag } from "./ifd.js";
import { Reader } from "./reader.js";
/** Upper bound on how much of an input sniffing may look at (SPEC §4.1). */
export const SNIFF_BYTES = 64 * 1024;
export function hasJpegSignature(bytes) {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}
export function hasPhotoshopSignature(bytes) {
    return (bytes.length >= 6 &&
        bytes[0] === 0x38 && // 8
        bytes[1] === 0x42 && // B
        bytes[2] === 0x50 && // P
        bytes[3] === 0x53 // S
    );
}
function photoshopVersion(bytes) {
    return (bytes[4] << 8) | bytes[5];
}
export function hasRafSignature(bytes) {
    if (bytes.length < 16)
        return false;
    const magic = "FUJIFILMCCD-RAW ";
    for (let i = 0; i < magic.length; i++) {
        if (bytes[i] !== magic.charCodeAt(i))
            return false;
    }
    return true;
}
export function hasCr3Signature(bytes) {
    if (bytes.length < 16)
        return false;
    if (bytes[4] !== 0x66 || bytes[5] !== 0x74 || bytes[6] !== 0x79 || bytes[7] !== 0x70) {
        return false;
    }
    const size = ((bytes[0] << 24) |
        (bytes[1] << 16) |
        (bytes[2] << 8) |
        bytes[3]) >>>
        0;
    if (size < 16 || size > bytes.length)
        return false;
    for (let offset = 8; offset + 4 <= size; offset += 4) {
        if (bytes[offset] === 0x63 && // c
            bytes[offset + 1] === 0x72 && // r
            bytes[offset + 2] === 0x78 && // x
            bytes[offset + 3] === 0x20 // space
        ) {
            return true;
        }
    }
    return false;
}
export function hasOrfSignature(bytes) {
    if (bytes.length < 4)
        return false;
    const mmor = bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x4f && bytes[3] === 0x52;
    const iiro = bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x52 && bytes[3] === 0x4f;
    const iirs = bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x52 && bytes[3] === 0x53;
    return mmor || iiro || iirs;
}
export function hasRw2Signature(bytes) {
    return (bytes.length >= 4 &&
        bytes[0] === 0x49 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x55 &&
        bytes[3] === 0x00);
}
export function hasTiffMagic(bytes) {
    if (bytes.length < 8)
        return false;
    const littleEndian = bytes[0] === 0x49 && bytes[1] === 0x49;
    const bigEndian = bytes[0] === 0x4d && bytes[1] === 0x4d;
    if (!littleEndian && !bigEndian)
        return false;
    const magic = littleEndian
        ? bytes[2] | (bytes[3] << 8)
        : (bytes[2] << 8) | bytes[3];
    return magic === 42;
}
/** `II*\x00` followed by the CR2 signature `CR\x02\x00` at offset 8. */
export function hasCr2Signature(bytes) {
    return (hasTiffMagic(bytes) &&
        bytes.length >= 11 &&
        bytes[8] === 0x43 && // C
        bytes[9] === 0x52 && // R
        bytes[10] === 0x02);
}
/** TIFF magic plus a `DNGVersion` tag in IFD0. */
export function hasDngVersion(bytes) {
    if (!hasTiffMagic(bytes))
        return false;
    try {
        const reader = new Reader(bytes);
        const header = readTiffHeader(reader);
        const ifd = readIfd(reader, header.firstIfdOffset, header.littleEndian);
        return findEntry(ifd, Tag.DNGVersion) !== undefined;
    }
    catch {
        // IFD0 lies beyond the sniffed prefix, or is malformed.
        return false;
    }
}
function formatFromMake(make) {
    const value = make.trim().toUpperCase();
    if (value.startsWith("NIKON"))
        return "nef";
    if (value.startsWith("SONY"))
        return "arw";
    if (value.startsWith("PENTAX") || value.startsWith("RICOH IMAGING"))
        return "pef";
    return undefined;
}
/** Returns the detected format, or `undefined` when nothing matches. */
export function sniffFormat(bytes) {
    if (hasJpegSignature(bytes))
        return "jpeg";
    if (hasPhotoshopSignature(bytes)) {
        const version = photoshopVersion(bytes);
        if (version === 2)
            return "psb";
        if (version === 1)
            return "psd";
    }
    if (hasRafSignature(bytes))
        return "raf";
    if (hasCr3Signature(bytes))
        return "cr3";
    if (hasOrfSignature(bytes))
        return "orf";
    if (hasRw2Signature(bytes))
        return "rw2";
    if (!hasTiffMagic(bytes))
        return undefined;
    if (hasCr2Signature(bytes))
        return "cr2";
    if (hasDngVersion(bytes))
        return "dng";
    const make = readIfd0Make(new Reader(bytes));
    if (make) {
        const fromMake = formatFromMake(make);
        if (fromMake)
            return fromMake;
    }
    return "tiff";
}
