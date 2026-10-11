import type { ConvertRequest, ConvertResponse, FinalResponse } from "./protocol";

export const DEFAULT_BUDGET_BYTES = 512 * 1024 * 1024;

export function defaultPoolSize(hardwareConcurrency: number): number {
  return Math.max(1, Math.min(hardwareConcurrency - 1, 4));
}

export interface WorkerLike {
  onmessage: ((ev: { data: ConvertResponse }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  postMessage(msg: ConvertRequest, transfer: Transferable[]): void;
  terminate(): void;
}

export type PoolResult = FinalResponse | { type: "cancelled"; requestId: string };

type Job = {
  req: ConvertRequest;
  size: number;
  resolve(r: PoolResult): void;
  onProgress?: (stage: "extract" | "reencode" | "exif") => void;
};

interface Slot {
  worker: WorkerLike;
  job: Job | null;
}

export interface PoolOptions {
  size: number;
  budgetBytes?: number;
  createWorker: () => WorkerLike;
}

/**
 * Pool of stateless workers with byte-budget admission control: a request is dispatched only
 * when in-flight bytes + its size fit the budget (a lone oversized file still runs, alone).
 */
export class WorkerPool {
  private readonly slots: Slot[] = [];
  private readonly queue: Job[] = [];
  private readonly budget: number;
  private inFlightBytes = 0;
  private stopped = false;
  private seq = 0;

  constructor(private readonly opts: PoolOptions) {
    this.budget = opts.budgetBytes ?? DEFAULT_BUDGET_BYTES;
    for (let i = 0; i < opts.size; i++) this.slots.push(this.makeSlot());
  }

  get inFlight(): number {
    return this.inFlightBytes;
  }

  submit(
    input: Omit<ConvertRequest, "type" | "requestId">,
    onProgress?: Job["onProgress"],
  ): Promise<PoolResult> {
    const requestId = `req-${++this.seq}`;
    return new Promise((resolve) => {
      const req: ConvertRequest = { type: "convert", requestId, ...input };
      if (this.stopped) return resolve({ type: "cancelled", requestId });
      this.queue.push({ req, size: input.data.byteLength, resolve, onProgress });
      this.pump();
    });
  }

  /** Stop dispatching; queued jobs resolve as cancelled, in-flight work finishes (FR-027). */
  stopDispatching(): void {
    this.stopped = true;
    for (const job of this.queue.splice(0)) {
      job.resolve({ type: "cancelled", requestId: job.req.requestId });
    }
  }

  destroy(): void {
    this.stopDispatching();
    for (const s of this.slots) s.worker.terminate();
  }

  private makeSlot(): Slot {
    const slot: Slot = { worker: this.opts.createWorker(), job: null };
    this.wire(slot);
    return slot;
  }

  private wire(slot: Slot): void {
    slot.worker.onmessage = (ev) => {
      const msg = ev.data;
      const job = slot.job;
      if (!job || msg.requestId !== job.req.requestId) return;
      if (msg.type === "progress") return job.onProgress?.(msg.stage);
      this.finish(slot, msg);
    };
    slot.worker.onerror = () => {
      // Crashed worker: fail its request visibly and replace the worker (stateless, so safe).
      const job = slot.job;
      slot.worker.terminate();
      slot.worker = this.opts.createWorker();
      this.wire(slot);
      if (job) this.finish(slot, { type: "error", requestId: job.req.requestId, reason: "corrupt-or-unreadable" });
    };
  }

  private finish(slot: Slot, result: FinalResponse): void {
    const job = slot.job!;
    slot.job = null;
    this.inFlightBytes -= job.size;
    job.resolve(result);
    this.pump();
  }

  private pump(): void {
    while (!this.stopped && this.queue.length > 0) {
      const slot = this.slots.find((s) => s.job === null);
      if (!slot) return;
      const next = this.queue[0]!;
      const fits = this.inFlightBytes === 0 || this.inFlightBytes + next.size <= this.budget;
      if (!fits) return; // FIFO: wait for in-flight work to release budget
      this.queue.shift();
      slot.job = next;
      this.inFlightBytes += next.size;
      slot.worker.postMessage(next.req, [next.req.data]);
    }
  }
}
