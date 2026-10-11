import type { ConversionSettings, FailureReason } from "../types";

// main thread → worker
export interface ConvertRequest {
  type: "convert";
  requestId: string;
  sourceName: string;
  data: ArrayBuffer; // TRANSFERRED, not copied
  settings: ConversionSettings;
  minLongEdge: number; // FR-017 threshold (pending spike R-003; 0 disables the guard)
}

// worker → main thread
export type ConvertResponse =
  | {
      type: "done";
      requestId: string;
      output: ArrayBuffer; // TRANSFERRED back
      outputBytes: number;
      width: number;
      height: number;
      passThrough: boolean;
    }
  | { type: "error"; requestId: string; reason: FailureReason }
  | { type: "progress"; requestId: string; stage: "extract" | "reencode" | "exif" };

export type FinalResponse = Extract<ConvertResponse, { type: "done" | "error" }>;

export interface ConvertOutput {
  output: Uint8Array;
  width: number;
  height: number;
  passThrough: boolean;
}

/** Thrown by a processor to report a mapped failure; anything else maps to corrupt-or-unreadable. */
export class ConvertFailure extends Error {
  constructor(readonly reason: FailureReason) {
    super(reason);
  }
}

export type Processor = (
  req: ConvertRequest,
  progress: (stage: "extract" | "reencode" | "exif") => void,
) => Promise<ConvertOutput>;

/** Never throws: every failure becomes an `error` response (contract rule 3). */
export async function handleRequest(
  req: ConvertRequest,
  process: Processor,
  post: (msg: ConvertResponse, transfer: Transferable[]) => void,
): Promise<void> {
  try {
    const out = await process(req, (stage) =>
      post({ type: "progress", requestId: req.requestId, stage }, []),
    );
    // Copy only if the view doesn't cover its whole buffer, so we can transfer without cloning.
    const buf =
      out.output.byteOffset === 0 && out.output.byteLength === out.output.buffer.byteLength
        ? (out.output.buffer as ArrayBuffer)
        : (out.output.slice().buffer as ArrayBuffer);
    post(
      {
        type: "done",
        requestId: req.requestId,
        output: buf,
        outputBytes: out.output.byteLength,
        width: out.width,
        height: out.height,
        passThrough: out.passThrough,
      },
      [buf],
    );
  } catch (e) {
    const reason = e instanceof ConvertFailure ? e.reason : "corrupt-or-unreadable";
    post({ type: "error", requestId: req.requestId, reason }, []);
  }
}
