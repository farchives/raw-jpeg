/**
 * Olympus ORF extractor (SPEC §6).
 *
 * ORF is TIFF-like but uses magic `OR` (`MMOR` / `IIRO`) or `RS` (`IIRS`)
 * instead of 42. The thumbnail lives in IFD1 as `JPEGInterchangeFormat`.
 */
import { Tag, TiffMagic } from "../ifd.js";
import { sniffFormat } from "../sniff.js";
import { extractTiffPreviews } from "./shared.js";
export function matches(bytes) {
    return sniffFormat(bytes) === "orf";
}
export async function extract(reader) {
    return extractTiffPreviews(reader, {
        pointerTags: [Tag.SubIFDs],
        magics: [TiffMagic.orf, TiffMagic.orfRs],
    });
}
