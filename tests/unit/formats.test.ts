import { describe, expect, it } from "vitest";
import { classify } from "../../src/core/raw/formats";
import { NOT_RAW_JPEG, ORF_BYTES, X3F_BYTES, makeJpeg, makeRaf } from "../helpers/synthetic";

describe("classify", () => {
  it("recognises a Fujifilm RAF as supported", () => {
    expect(classify(makeRaf(makeJpeg(100, 100)))).toEqual({ format: "raf", eligibility: "supported" });
  });
  it("classifies by content: a JPEG renamed to .raf is not a RAW", () => {
    expect(classify(NOT_RAW_JPEG).eligibility).toBe("not-raw");
  });
  it("reports ORF and X3F as unsupported RAW, not as not-raw", () => {
    expect(classify(ORF_BYTES)).toEqual({ format: "orf", eligibility: "unsupported-raw" });
    expect(classify(X3F_BYTES)).toEqual({ format: "x3f", eligibility: "unsupported-raw" });
  });
  it("treats unrecognised bytes and empty input as not-raw", () => {
    expect(classify(new Uint8Array(0)).eligibility).toBe("not-raw");
    expect(classify(new Uint8Array(200).fill(7)).eligibility).toBe("not-raw");
  });
});
