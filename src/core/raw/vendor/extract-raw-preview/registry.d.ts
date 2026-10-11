/**
 * Format id → extractor (SPEC §5.1).
 *
 * Registering a format = one new file in `formats/` plus one line here.
 */
import type { Reader } from "./reader.js";
import type { FormatId, ThumbnailCandidate } from "./types.js";
export interface Extractor {
    matches(bytes: Uint8Array): boolean;
    extract(reader: Reader): Promise<ThumbnailCandidate[]>;
}
export declare const registry: Readonly<Record<FormatId, Extractor>>;
/** Returns the extractor for `id`, or `undefined` when none is registered. */
export declare function getExtractor(id: FormatId): Extractor | undefined;
export declare function isFormatId(value: string): value is FormatId;
export declare const supportedFormats: readonly FormatId[];
