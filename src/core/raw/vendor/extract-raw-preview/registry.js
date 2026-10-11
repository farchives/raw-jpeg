/**
 * Format id → extractor (SPEC §5.1).
 *
 * Registering a format = one new file in `formats/` plus one line here.
 */
import * as arw from "./formats/arw.js";
import * as cr2 from "./formats/cr2.js";
import * as cr3 from "./formats/cr3.js";
import * as dng from "./formats/dng.js";
import * as jpeg from "./formats/jpeg.js";
import * as nef from "./formats/nef.js";
import * as orf from "./formats/orf.js";
import * as pef from "./formats/pef.js";
import * as psb from "./formats/psb.js";
import * as psd from "./formats/psd.js";
import * as raf from "./formats/raf.js";
import * as rw2 from "./formats/rw2.js";
import * as tiff from "./formats/tiff.js";
export const registry = {
    tiff,
    dng,
    cr2,
    jpeg,
    nef,
    arw,
    raf,
    orf,
    rw2,
    pef,
    cr3,
    psd,
    psb,
};
/** Returns the extractor for `id`, or `undefined` when none is registered. */
export function getExtractor(id) {
    return Object.hasOwn(registry, id) ? registry[id] : undefined;
}
export function isFormatId(value) {
    return Object.hasOwn(registry, value);
}
export const supportedFormats = Object.freeze([
    "tiff",
    "dng",
    "cr2",
    "jpeg",
    "nef",
    "arw",
    "raf",
    "orf",
    "rw2",
    "pef",
    "cr3",
    "psd",
    "psb",
]);
