export type RawFormat =
  | "raf" | "cr2" | "cr3" | "nef" | "arw" | "dng" // supported (FR-007)
  | "orf" | "rw2" | "pef" | "srw" | "x3f" | "unknown"; // reported, not converted (FR-008)

export type Eligibility = "supported" | "unsupported-raw" | "not-raw";

export type CollisionPolicy = "skip" | "overwrite" | "keep-both";

export interface ConversionSettings {
  quality: "as-shot" | number;
  maxLongEdge: number | null;
  keepMetadata: boolean;
  collisionPolicy: CollisionPolicy;
  schemaVersion: number;
}

export const DEFAULT_SETTINGS: ConversionSettings = {
  quality: "as-shot",
  maxLongEdge: null,
  keepMetadata: true,
  collisionPolicy: "skip",
  schemaVersion: 1,
};

/** True when the embedded preview bytes are written unmodified (FR-015, SC-012). */
export function isPassThrough(s: Pick<ConversionSettings, "quality" | "maxLongEdge">): boolean {
  return s.quality === "as-shot" && s.maxLongEdge === null;
}

export interface RawFile {
  name: string;
  baseName: string;
  format: RawFormat;
  byteLength: number;
  eligibility: Eligibility;
}

export interface ExtractedPreview {
  data: Uint8Array;
  width: number;
  height: number;
  mimeType: string;
  hasExif: boolean;
}

export type RunState =
  | "idle" | "scanning" | "ready" | "running" | "cancelling"
  | "completed" | "cancelled" | "stopped-by-error";

export type SkipReason = "unsupported-format" | "exists-skip-policy" | "cancelled-before-start";

export type FailureReason =
  | "preview-too-small"
  | "no-preview-found"
  | "preview-not-decodable"
  | "corrupt-or-unreadable"
  | "write-failed"
  | "permission-lost"
  | "out-of-space";

export type FileResult =
  | {
      sourceName: string;
      outcome: "succeeded";
      outputName: string;
      outputBytes: number;
      durationMs: number;
    }
  | {
      sourceName: string;
      outcome: "failed";
      reason: FailureReason;
      outputName: null;
      outputBytes: null;
      durationMs: number;
    }
  | {
      sourceName: string;
      outcome: "skipped";
      reason: SkipReason;
      outputName: null;
      outputBytes: null;
      durationMs: number;
    };

export interface ConversionRun {
  id: string;
  settings: ConversionSettings;
  files: RawFile[];
  results: Map<string, FileResult>;
  state: RunState;
  startedAt: number | null;
  endedAt: number | null;
}
