/** Output name: base name (everything before the last dot) + ".jpg" (FR-013). */
export function baseNameOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}

export function outputNameFor(fileName: string): string {
  return `${baseNameOf(fileName)}.jpg`;
}

/** Name for the keep-both policy: "IMG.jpg" → "IMG (1).jpg", "IMG (2).jpg", ... */
export function numberedName(outName: string, n: number): string {
  const dot = outName.lastIndexOf(".");
  return `${outName.slice(0, dot)} (${n})${outName.slice(dot)}`;
}
