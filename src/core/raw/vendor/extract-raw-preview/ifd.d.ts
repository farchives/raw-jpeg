/**
 * Shared TIFF/IFD walker (SPEC §5.4).
 *
 * TIFF-container formats (TIFF, DNG, CR2, NEF, ARW, PEF, ORF, RW2) configure
 * this walker rather than re-implementing it.
 */
import type { Reader } from "./reader.js";
/** TIFF/EXIF/DNG tags this library cares about. */
export declare const Tag: {
    readonly NewSubfileType: 254;
    readonly ImageWidth: 256;
    readonly ImageLength: 257;
    readonly Compression: 259;
    readonly Make: 271;
    readonly PhotometricInterpretation: 262;
    readonly StripOffsets: 273;
    readonly StripByteCounts: 279;
    readonly SubIFDs: 330;
    readonly JPEGInterchangeFormat: 513;
    readonly JPEGInterchangeFormatLength: 514;
    readonly ExifIFD: 34665;
    readonly DNGVersion: 50706;
    readonly ExifImageWidth: 40962;
    readonly ExifImageHeight: 40963;
};
/** Classic TIFF magic (`42`) plus the TIFF-like RAW variants. */
export declare const TiffMagic: {
    readonly classic: 42;
    /** Olympus ORF: `MMOR` / `IIRO`. */
    readonly orf: 20306;
    /** Olympus ORF: `IIRS`. */
    readonly orfRs: 21330;
    /** Panasonic RW2: `IIU\0`. */
    readonly rw2: 85;
};
/** Compression values relevant to embedded previews. */
export declare const Compression: {
    readonly none: 1;
    readonly ccitt: 2;
    readonly lzw: 5;
    /** Old-style JPEG (tags 0x0201/0x0202, no JPEG tables in the stream). */
    readonly oldJpeg: 6;
    /** New-style JPEG. */
    readonly jpeg: 7;
    readonly deflate: 8;
};
export interface TiffHeader {
    littleEndian: boolean;
    firstIfdOffset: number;
    /** True when the CR2 signature (`CR\x02\x00`) sits at offset 8. */
    cr2: boolean;
    /** CR2 only: the raw IFD offset recorded in the canonical header (bytes 12-15). */
    cr2RawIfdOffset?: number;
}
export interface IfdEntry {
    tag: number;
    type: number;
    count: number;
    /** Total size in bytes of the entry's value. */
    byteLength: number;
    /** Absolute offset of the value (inline when it fits in 4 bytes). */
    valueOffset: number;
}
export interface Ifd {
    offset: number;
    entries: readonly IfdEntry[];
    nextOffset: number;
}
export interface TiffHeaderOptions {
    /** Accepted 16-bit magic values. Defaults to classic TIFF (`42`). */
    magics?: readonly number[];
}
/** Reads and validates a TIFF / TIFF-like header, including the CR2 variant. */
export declare function readTiffHeader(reader: Reader, options?: TiffHeaderOptions): TiffHeader;
/** Reads one IFD. A malformed or out-of-bounds IFD on a *required* path throws. */
export declare function readIfd(reader: Reader, offset: number, littleEndian: boolean): Ifd;
export declare function findEntry(ifd: Ifd, tag: number): IfdEntry | undefined;
/**
 * Reads an entry's values as unsigned integers. Returns `[]` when the value is
 * unreadable: callers treat that as "structure absent" (SPEC §5.2).
 */
export declare function readUintValues(reader: Reader, entry: IfdEntry, littleEndian: boolean): number[];
/** Reads a single tag as an unsigned integer, or `undefined` when absent. */
export declare function readUint(reader: Reader, ifd: Ifd, tag: number, littleEndian: boolean): number | undefined;
/**
 * Reads an ASCII (type 2) tag, stripping trailing NUL bytes. Returns
 * `undefined` when the tag is absent or unreadable.
 */
export declare function readAscii(reader: Reader, ifd: Ifd, tag: number): string | undefined;
/** IFD0 `Make`, used to tell NEF / ARW / PEF apart from generic TIFF. */
export declare function readIfd0Make(reader: Reader): string | undefined;
export interface IfdWalkOptions {
    /** Additional IFD-pointer tags to follow (e.g. `SubIFDs`). */
    pointerTags?: readonly number[];
    /** Safety bound on the number of IFDs visited. */
    maxIfds?: number;
    /** Safety bound on chain/pointer depth, which also breaks pointer cycles. */
    maxDepth?: number;
}
/**
 * Walks the IFD graph breadth-first from `seeds`, following next-IFD links and
 * the configured pointer tags. Cycles are broken by offset; malformed branches
 * are dropped rather than thrown so one bad pointer cannot hide a good preview.
 */
export declare function walkIfds(reader: Reader, littleEndian: boolean, seeds: readonly number[], options?: IfdWalkOptions): Ifd[];
/**
 * Resolves the file-level EXIF image dimensions (`ExifImageWidth` /
 * `ExifImageHeight`, tags 0xA002/0xA003).
 *
 * These describe the main image rather than any single IFD, and they are the
 * only dimension source for containers whose raw IFD carries no
 * `ImageWidth`/`ImageLength` — notably CR2, where the raw image is stored as a
 * multi-slice lossless JPEG whose own frame header describes a slice, not the
 * image. See SPEC §6.
 */
export declare function readExifImageSize(reader: Reader, littleEndian: boolean, ifd: Ifd | undefined): {
    width: number;
    height: number;
} | undefined;
