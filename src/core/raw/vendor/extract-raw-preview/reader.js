/**
 * Bounded cursor over a byte buffer (SPEC §5.2).
 *
 * Extractors skip to structures by absolute offset rather than walking the
 * container linearly. Bounds violations on *required* structures throw
 * `ERR_TRUNCATED`; callers probing *optional* structures use `has()` (or catch)
 * and treat the structure as absent.
 */
import { truncated } from "./errors.js";
export class Reader {
    bytes;
    #position = 0;
    #view;
    constructor(bytes) {
        this.bytes = bytes;
    }
    get length() {
        return this.bytes.length;
    }
    get position() {
        return this.#position;
    }
    /** True when `[offset, offset + length)` lies inside the buffer. */
    has(offset, length = 1) {
        return (Number.isInteger(offset) &&
            Number.isInteger(length) &&
            offset >= 0 &&
            length >= 0 &&
            offset + length <= this.bytes.length);
    }
    /** Moves the cursor to an absolute offset. */
    seek(offset) {
        this.#require(offset, 0, "seek target");
        this.#position = offset;
        return this;
    }
    /** Reads `n` bytes at the cursor, advancing it. Returns a copy. */
    read(n) {
        const out = this.slice(this.#position, n);
        this.#position += n;
        return out;
    }
    /**
     * Returns a copy of `[offset, offset + length)`.
     *
     * This always allocates (SPEC §3.1): `Uint8Array.prototype.slice` is
     * deliberately not used because `Buffer` overrides it to return a view, which
     * would keep an entire 40 MB RAW alive for the lifetime of the thumbnail.
     */
    slice(offset, length) {
        this.#require(offset, length, "slice");
        return new Uint8Array(this.bytes.subarray(offset, offset + length));
    }
    u8(offset) {
        this.#require(offset, 1, "uint8");
        return this.bytes[offset];
    }
    u16(offset, littleEndian) {
        this.#require(offset, 2, "uint16");
        return this.#dataView().getUint16(offset, littleEndian);
    }
    u32(offset, littleEndian) {
        this.#require(offset, 4, "uint32");
        return this.#dataView().getUint32(offset, littleEndian);
    }
    #dataView() {
        this.#view ??= new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength);
        return this.#view;
    }
    #require(offset, length, what) {
        if (!this.has(offset, length)) {
            throw truncated(`${what} at offset ${offset} (${length} byte(s)) runs past the end of the input (${this.bytes.length} byte(s))`);
        }
    }
}
