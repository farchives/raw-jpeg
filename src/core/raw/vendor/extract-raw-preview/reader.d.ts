/**
 * Bounded cursor over a byte buffer (SPEC §5.2).
 *
 * Extractors skip to structures by absolute offset rather than walking the
 * container linearly. Bounds violations on *required* structures throw
 * `ERR_TRUNCATED`; callers probing *optional* structures use `has()` (or catch)
 * and treat the structure as absent.
 */
export declare class Reader {
    #private;
    readonly bytes: Uint8Array;
    constructor(bytes: Uint8Array);
    get length(): number;
    get position(): number;
    /** True when `[offset, offset + length)` lies inside the buffer. */
    has(offset: number, length?: number): boolean;
    /** Moves the cursor to an absolute offset. */
    seek(offset: number): this;
    /** Reads `n` bytes at the cursor, advancing it. Returns a copy. */
    read(n: number): Uint8Array;
    /**
     * Returns a copy of `[offset, offset + length)`.
     *
     * This always allocates (SPEC §3.1): `Uint8Array.prototype.slice` is
     * deliberately not used because `Buffer` overrides it to return a view, which
     * would keep an entire 40 MB RAW alive for the lifetime of the thumbnail.
     */
    slice(offset: number, length: number): Uint8Array;
    u8(offset: number): number;
    u16(offset: number, littleEndian: boolean): number;
    u32(offset: number, littleEndian: boolean): number;
}
