/**
 * Sony ARW extractor (SPEC §6).
 *
 * ARW is a TIFF container. Preview JPEGs are stored as
 * `JPEGInterchangeFormat` blobs on IFD0 / IFD1.
 */
import { Tag } from "../ifd.js";
import { sniffFormat } from "../sniff.js";
import { extractTiffPreviews } from "./shared.js";
export function matches(bytes) {
    return sniffFormat(bytes) === "arw";
}
export async function extract(reader) {
    return extractTiffPreviews(reader, { pointerTags: [Tag.SubIFDs] });
}
