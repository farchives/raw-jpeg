import { describe, expect, it } from "vitest";
import { WorkerPool, defaultPoolSize, type WorkerLike } from "../../src/workers/pool";
import { handleRequest, ConvertFailure, type ConvertRequest, type ConvertResponse } from "../../src/workers/protocol";
import { DEFAULT_SETTINGS } from "../../src/types";

class FakeWorker implements WorkerLike {
  onmessage: WorkerLike["onmessage"] = null;
  onerror: WorkerLike["onerror"] = null;
  received: ConvertRequest[] = [];
  terminated = false;
  postMessage(msg: ConvertRequest) { this.received.push(msg); }
  terminate() { this.terminated = true; }
  reply(r: ConvertResponse) { this.onmessage?.({ data: r }); }
}

const input = (bytes: number) => ({ sourceName: "a.raf", data: new ArrayBuffer(bytes), settings: DEFAULT_SETTINGS, minLongEdge: 0 });
const done = (id: string): ConvertResponse => ({ type: "done", requestId: id, output: new ArrayBuffer(1), outputBytes: 1, width: 1, height: 1, passThrough: true });

function setup(size: number, budgetBytes: number) {
  const workers: FakeWorker[] = [];
  const pool = new WorkerPool({ size, budgetBytes, createWorker: () => { const w = new FakeWorker(); workers.push(w); return w; } });
  return { pool, workers };
}

describe("defaultPoolSize", () => {
  it("is min(cores-1, 4), at least 1", () => {
    expect(defaultPoolSize(1)).toBe(1);
    expect(defaultPoolSize(4)).toBe(3);
    expect(defaultPoolSize(16)).toBe(4);
  });
});

describe("WorkerPool admission control", () => {
  it("holds back a request that would exceed the byte budget even with idle workers", async () => {
    const { pool, workers } = setup(3, 100);
    const p1 = pool.submit(input(60));
    const p2 = pool.submit(input(60)); // 120 > 100 → must wait
    expect(workers.flatMap((w) => w.received)).toHaveLength(1);
    const first = workers.find((w) => w.received.length)!;
    first.reply(done(first.received[0]!.requestId));
    await p1;
    expect(workers.flatMap((w) => w.received)).toHaveLength(2);
    expect(pool.inFlight).toBe(60);
    const second = workers.find((w) => w.received.length && w !== first) ?? first;
    second.reply(done(second.received.at(-1)!.requestId));
    await p2;
    expect(pool.inFlight).toBe(0);
  });

  it("still runs a single file larger than the whole budget, alone", async () => {
    const { pool, workers } = setup(2, 10);
    const p = pool.submit(input(500));
    expect(workers.flatMap((w) => w.received)).toHaveLength(1);
    const w = workers.find((x) => x.received.length)!;
    w.reply(done(w.received[0]!.requestId));
    expect((await p).type).toBe("done");
  });

  it("stopDispatching resolves queued work as cancelled and lets in-flight finish", async () => {
    const { pool, workers } = setup(1, 1000);
    const p1 = pool.submit(input(10));
    const p2 = pool.submit(input(10));
    pool.stopDispatching();
    expect((await p2).type).toBe("cancelled");
    workers[0]!.reply(done(workers[0]!.received[0]!.requestId));
    expect((await p1).type).toBe("done");
    expect((await pool.submit(input(1))).type).toBe("cancelled");
  });

  it("a crashed worker fails its request visibly and is replaced", async () => {
    const { pool, workers } = setup(1, 1000);
    const p = pool.submit(input(10));
    workers[0]!.onerror?.({});
    expect(await p).toMatchObject({ type: "error", reason: "corrupt-or-unreadable" });
    expect(workers[0]!.terminated).toBe(true);
    expect(workers).toHaveLength(2);
    expect(pool.inFlight).toBe(0);
  });
});

describe("handleRequest", () => {
  const req: ConvertRequest = { type: "convert", requestId: "r1", ...input(1) };
  it("transfers the output buffer on success", async () => {
    const posts: { msg: ConvertResponse; transfer: Transferable[] }[] = [];
    await handleRequest(req, async () => ({ output: new Uint8Array([1, 2]), width: 2, height: 2, passThrough: true }), (msg, transfer) => posts.push({ msg, transfer }));
    expect(posts.at(-1)!.msg.type).toBe("done");
    expect(posts.at(-1)!.transfer).toHaveLength(1);
  });
  it("never throws: mapped and unmapped failures become error responses", async () => {
    const out: ConvertResponse[] = [];
    await handleRequest(req, async () => { throw new ConvertFailure("preview-too-small"); }, (m) => out.push(m));
    await handleRequest(req, async () => { throw new Error("boom"); }, (m) => out.push(m));
    expect(out).toEqual([
      { type: "error", requestId: "r1", reason: "preview-too-small" },
      { type: "error", requestId: "r1", reason: "corrupt-or-unreadable" },
    ]);
  });
});
