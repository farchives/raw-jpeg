# Contract: Worker Protocol

**Between**: `workers/pool.ts` (main thread) and `workers/convert.worker.ts`

One message per file. Workers are stateless between messages, so any worker can handle any file
and a crashed worker is replaced without losing run state.

```ts
// main thread → worker
interface ConvertRequest {
  type: "convert";
  requestId: string;
  sourceName: string;
  data: ArrayBuffer;                 // TRANSFERRED, not copied
  settings: ConversionSettings;      // run snapshot
  minLongEdge: number;               // FR-017 threshold (pending spike R-003)
}

// worker → main thread
type ConvertResponse =
  | { type: "done";  requestId: string; output: ArrayBuffer; // TRANSFERRED back
      outputBytes: number; width: number; height: number; passThrough: boolean }
  | { type: "error"; requestId: string; reason: FailureReason }
  | { type: "progress"; requestId: string; stage: "extract" | "reencode" | "exif" };
```

## Behavioral requirements

1. **Always transfer, never clone.** `data` and `output` move via the transfer list. Structured
   cloning a 60 MB buffer per file doubles peak memory and costs real time across a 1,000-file
   batch.
2. **Workers never write to disk.** They return bytes; the main thread owns all `StorageAdapter`
   calls. This keeps write ordering, collision policy, and FR-028 cleanup in one place rather
   than spread across concurrent workers.
3. **Workers never throw across the boundary.** Every failure becomes an `error` response with a
   mapped `FailureReason`. An unhandled rejection in a worker would strand a `requestId` and
   hang the run.
4. **Admission control is the pool's job.** The pool dispatches a request only when
   `in-flight bytes + file size ≤ 512 MB`, regardless of idle workers. Worker count alone does
   not bound memory when file sizes vary from 25 MB to 150 MB (research R-005).
5. **Cancellation is checked between files.** There is no mid-file abort. The pool stops
   dispatching and lets in-flight work finish, which is what keeps `cancelling → cancelled`
   within the "few seconds" FR-027 requires.
6. **`passThrough` is reported back, not assumed.** The main thread uses it to assert SC-012 in
   tests — under default settings, output bytes must equal the extracted preview bytes exactly.
