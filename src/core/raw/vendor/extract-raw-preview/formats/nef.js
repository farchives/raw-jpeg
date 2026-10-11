/**
 * Nikon NEF extractor (SPEC §6).
 *
 * NEF is a TIFF container. Preview JPEGs live in SubIFDs or as
 * `JPEGInterchangeFormat` blobs, same as CR2/DNG.
 */
import { Tag } from "../ifd.js";
import { sniffFormat } from "../sniff.js";
import { extractTiffPreviews } from "./shared.js";
export function matches(bytes) {
    return sniffFormat(bytes) === "nef";
}
export async function extract(reader) {
    return extractTiffPreviews(reader, { pointerTags: [Tag.SubIFDs] });
}
