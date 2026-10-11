/** Builders for tiny synthetic files so tests never need real (huge) RAW fixtures. */

const u16 = (n: number) => [(n >> 8) & 0xff, n & 0xff];

export function makeExifSegment(): number[] {
  // APP1 "Exif\0\0" + minimal big-endian TIFF header with an empty IFD0
  const tiff = [0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0];
  const body = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  return [0xff, 0xe1, ...u16(body.length + 2), ...body];
}

export function makeJpeg(width: number, height: number, opts: { exif?: boolean; sof?: number } = {}): Uint8Array {
  const sof = opts.sof ?? 0xc0;
  const bytes = [
    0xff, 0xd8,
    ...(opts.exif ? makeExifSegment() : []),
    0xff, sof, ...u16(11), 8, ...u16(height), ...u16(width), 1, 1, 0x11, 0,
    0xff, 0xda, ...u16(8), 1, 1, 0, 0, 63, 0,
    0x12, 0x34, 0x56, 0x78,
    0xff, 0xd9,
  ];
  return new Uint8Array(bytes);
}

/** Synthetic Fujifilm RAF: 16-byte magic, JPEG offset (big-endian) at byte 84, then the JPEG. */
export function makeRaf(jpeg: Uint8Array, padding = 4096): Uint8Array {
  const offset = 160;
  const out = new Uint8Array(offset + jpeg.length + padding);
  out.set(new TextEncoder().encode("FUJIFILMCCD-RAW 0201"), 0);
  new DataView(out.buffer).setUint32(84, offset, false);
  new DataView(out.buffer).setUint32(88, jpeg.length, false);
  out.set(jpeg, offset);
  return out;
}

export const NOT_RAW_JPEG = makeJpeg(10, 10);
export const ORF_BYTES = new Uint8Array([0x49, 0x49, 0x52, 0x4f, 8, 0, 0, 0, ...new Array(64).fill(0)]);
export const X3F_BYTES = new Uint8Array([0x46, 0x4f, 0x56, 0x62, ...new Array(64).fill(0)]);
