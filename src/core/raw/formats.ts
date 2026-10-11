import { detectFormatFromBytes } from "./vendor/extract-raw-preview/core.js";
import type { Eligibility, RawFormat } from "../../types";

const SUPPORTED = new Set<RawFormat>(["raf", "cr2", "cr3", "nef", "arw", "dng"]);
const KNOWN_UNSUPPORTED = new Set<RawFormat>(["orf", "rw2", "pef", "srw", "x3f"]);

export interface Classification {
  format: RawFormat;
  eligibility: Eligibility;
}

function isX3f(head: Uint8Array): boolean {
  // Sigma X3F: "FOVb"
  return head[0] === 0x46 && head[1] === 0x4f && head[2] === 0x56 && head[3] === 0x62;
}

/** Classify by magic bytes — never by extension (FR-007, FR-008). Reads at most 64 KiB. */
export function classify(head: Uint8Array): Classification {
  if (isX3f(head)) return { format: "x3f", eligibility: "unsupported-raw" };
  const id = detectFormatFromBytes(head.subarray(0, 64 * 1024));
  const format = (id ?? "unknown") as string;
  if (SUPPORTED.has(format as RawFormat)) {
    return { format: format as RawFormat, eligibility: "supported" };
  }
  if (KNOWN_UNSUPPORTED.has(format as RawFormat)) {
    return { format: format as RawFormat, eligibility: "unsupported-raw" };
  }
  // jpeg, tiff, psd, psb, or unrecognised: not a RAW file we handle or report.
  return { format: "unknown", eligibility: "not-raw" };
}
