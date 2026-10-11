/**
 * Minimal ISO BMFF box walker for CR3.
 *
 * Only container boxes are recursed into. `mdat` is reported but not walked,
 * so a compressed raw payload cannot hide extra false-positive JPEGs.
 */
import type { Reader } from "./reader.js";
export interface BmffBox {
    type: string;
    /** Absolute offset of the 4-byte size field. */
    offset: number;
    /** Total box size, including the header. */
    size: number;
    headerSize: number;
    payloadOffset: number;
    payloadLength: number;
}
/**
 * Walks `[start, end)` as a sequence of boxes. Malformed tails are dropped
 * rather than thrown — CR3 still yields its thumbnail boxes when `mdat` is
 * truncated.
 */
export declare function walkBmff(reader: Reader, start?: number, end?: number, depth?: number): BmffBox[];
