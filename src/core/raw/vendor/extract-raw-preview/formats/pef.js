/**
 * Pentax PEF extractor (SPEC §6).
 *
 * PEF is a TIFF container. Preview JPEGs are stored as
 * `JPEGInterchangeFormat` blobs on later IFDs.
 */
import { Tag } from "../ifd.js";
import { sniffFormat } from "../sniff.js";
import { extractTiffPreviews } from "./shared.js";
export function matches(bytes) {
    return sniffFormat(bytes) === "pef";
}
export async function extract(reader) {
    return extractTiffPreviews(reader, { pointerTags: [Tag.SubIFDs] });
}
