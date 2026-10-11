import { describe, expect, it } from "vitest";
import { createPreviewExtractor, hasExifSegment, MAX_PREVIEW_BYTES, type PreviewLib } from "../../src/core/raw/PreviewExtractor";
import { makeJpeg, makeRaf } from "../helpers/synthetic";

const real = createPreviewExtractor();

describe("hasExifSegment", () => {
  it("detects an APP1 Exif segment and its absence", () => {
    expect(hasExifSegment(makeJpeg(10, 10, { exif: true }))).toBe(true);
    expect(hasExifSegment(makeJpeg(10, 10))).toBe(false);
    expect(hasExifSegment(new Uint8Array([1, 2, 3]))).toBe(false);
  });
});

describe("extract (real library, synthetic RAF)", () => {
  it("returns the stored JPEG bytes verbatim with accurate dimensions and hasExif", async () => {
    const jpeg = makeJpeg(6000, 4000, { exif: true });
    const r = await real.extract(makeRaf(jpeg), "raf");
    expect(r.found).toBe(true);
    if (!r.found) return;
    expect(r.preview.width).toBe(6000);
    expect(r.preview.height).toBe(4000);
    expect(r.preview.hasExif).toBe(true);
    expect(Buffer.from(r.preview.data).equals(Buffer.from(jpeg))).toBe(true);
  });

  it("selects the largest candidate rather than the first", async () => {
    const small = makeJpeg(160, 120);
    const big = makeJpeg(6000, 4000, { exif: true });
    // Fake a library listing both candidates; the wrapper must ask for 'largest'.
    let seen: unknown;
    const fake: PreviewLib = {
      extractThumbnail: async (_d, o) => {
        seen = o;
        return { found: true, format: "raf", data: big, mimeType: "image/jpeg", width: 6000, height: 4000, byteLength: big.length, origin: "embedded-jpeg", decodable: true };
      },
      listThumbnails: async () => [],
    };
    await createPreviewExtractor(fake).extract(small, "raf");
    expect(seen).toMatchObject({ prefer: "largest", maxBytes: MAX_PREVIEW_BYTES });
    expect(MAX_PREVIEW_BYTES).toBeGreaterThanOrEqual(32 * 1024 * 1024);
  });

  it("a RAF with no JPEG maps to no-preview-found", async () => {
    const raf = makeRaf(makeJpeg(10, 10));
    raf.fill(0, 160); // wipe the JPEG
    const r = await real.extract(raf, "raf");
    expect(r).toEqual({ found: false, reason: "no-preview-found" });
  });

  it("lossless-only previews map to preview-not-decodable", async () => {
    const raf = makeRaf(makeJpeg(6000, 4000, { sof: 0xc3 }));
    expect(await real.extract(raf, "raf")).toEqual({ found: false, reason: "preview-not-decodable" });
  });

  it("garbage input maps to a FailureReason, never throws", async () => {
    const r = await real.extract(new Uint8Array(10), "raf");
    expect(r.found).toBe(false);
  });

  it("a throwing library maps to corrupt-or-unreadable", async () => {
    const boom: PreviewLib = { extractThumbnail: async () => { throw new Error("x"); }, listThumbnails: async () => [] };
    expect(await createPreviewExtractor(boom).extract(new Uint8Array(1), "raf")).toEqual({ found: false, reason: "corrupt-or-unreadable" });
  });
});
