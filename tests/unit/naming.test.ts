import { describe, expect, it } from "vitest";
import { baseNameOf, numberedName, outputNameFor } from "../../src/core/pipeline/naming";

describe("naming", () => {
  it("swaps the extension for .jpg", () => {
    expect(outputNameFor("DSCF0001.RAF")).toBe("DSCF0001.jpg");
  });
  it("uses everything before the last dot", () => {
    expect(baseNameOf("a.b.c.raf")).toBe("a.b.c");
    expect(baseNameOf(".hidden")).toBe(".hidden");
  });
  it("maps two formats sharing a base name to the same output (collision handled by policy)", () => {
    expect(outputNameFor("IMG_1.CR3")).toBe(outputNameFor("IMG_1.DNG"));
  });
  it("numbers keep-both names", () => {
    expect(numberedName("IMG.jpg", 2)).toBe("IMG (2).jpg");
  });
});
