import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FsDirHandle } from "../../src/core/storage/FsDirHandle";
import { OpfsAdapter } from "../../src/core/storage/OpfsAdapter";
import { FsaAdapter } from "../../src/core/storage/FsaAdapter";
import { StorageError } from "../../src/core/storage/errors";
import type { DirHandle, StorageAdapter } from "../../src/core/storage/StorageAdapter";

interface Env {
  adapter: StorageAdapter;
  source: FileSystemDirectoryHandle;
  destination: FileSystemDirectoryHandle;
  cleanup(): Promise<void>;
}

async function seed(dir: FileSystemDirectoryHandle, name: string, bytes: Uint8Array) {
  const w = await (await dir.getFileHandle(name, { create: true })).createWritable();
  await w.write(bytes as unknown as BufferSource);
  await w.close();
}

async function names(dir: FileSystemDirectoryHandle): Promise<string[]> {
  const out: string[] = [];
  for await (const [n] of (dir as any).entries()) out.push(n);
  return out.sort();
}

/**
 * FsaAdapter's pickers need a native OS dialog, which no test can drive. It is exercised here by
 * stubbing window.showDirectoryPicker to hand back real OPFS directories, so the picker code path
 * and the read-only/read-write wrapping are genuinely covered.
 */
async function makeFsaEnv(): Promise<Env> {
  const o = await OpfsAdapter.create("fsa");
  const picks = [o.source, o.destination];
  const original = (window as any).showDirectoryPicker;
  (window as any).showDirectoryPicker = async () => picks.shift();
  return {
    adapter: new FsaAdapter(),
    source: o.source,
    destination: o.destination,
    cleanup: async () => {
      (window as any).showDirectoryPicker = original;
      if (original === undefined) delete (window as any).showDirectoryPicker;
      await o.cleanup();
    },
  };
}

const factories: Record<string, () => Promise<Env>> = {
  OpfsAdapter: async () => OpfsAdapter.create(),
  FsaAdapter: makeFsaEnv,
};

describe.each(Object.entries(factories))("StorageAdapter conformance: %s", (_name, make) => {
  let env: Env;
  let src: DirHandle;
  let dst: DirHandle;

  beforeEach(async () => {
    env = await make();
    src = await env.adapter.pickSourceDirectory();
    dst = await env.adapter.pickDestinationDirectory();
  });
  afterEach(() => env.cleanup());

  it("reports itself as supported", () => {
    expect(env.adapter.isSupported()).toBe(true);
  });

  it("listFiles is non-recursive", async () => {
    await seed(env.source, "a.raf", new Uint8Array([1, 2, 3]));
    const sub = await env.source.getDirectoryHandle("nested", { create: true });
    await seed(sub, "deep.raf", new Uint8Array([9]));
    const seen: string[] = [];
    for await (const f of src.listFiles()) seen.push(f.name);
    expect(seen).toEqual(["a.raf"]);
  });

  it("reads whole files and byte ranges", async () => {
    await seed(env.source, "a.raf", new Uint8Array([10, 11, 12, 13, 14]));
    for await (const f of src.listFiles()) {
      expect(f.byteLength).toBe(5);
      expect([...(await f.read())]).toEqual([10, 11, 12, 13, 14]);
      expect([...(await f.readRange(1, 3))]).toEqual([11, 12, 13]);
    }
  });

  it("source handles are read-only", async () => {
    await expect(src.createWritable("x.jpg")).rejects.toBeInstanceOf(StorageError);
    await expect(src.removeEntry("x.jpg")).rejects.toBeInstanceOf(StorageError);
    await expect(src.assertWritable()).rejects.toBeInstanceOf(StorageError);
    expect(await names(env.source)).toEqual([]);
  });

  it("exists() reports presence and never creates", async () => {
    expect(await dst.exists("nope.jpg")).toBe(false);
    expect(await names(env.destination)).toEqual([]);
    await seed(env.destination, "yes.jpg", new Uint8Array([1]));
    expect(await dst.exists("yes.jpg")).toBe(true);
  });

  it("assertWritable passes on a writable destination and leaves no probe behind", async () => {
    await dst.assertWritable();
    expect(await names(env.destination)).toEqual([]);
  });

  it("writes and closes a file", async () => {
    const w = await dst.createWritable("out.jpg");
    await w.write(new Uint8Array([5, 6, 7]));
    await w.close();
    const f = await env.destination.getFileHandle("out.jpg");
    expect((await f.getFile()).size).toBe(3);
  });

  it("abort() leaves no zero-byte file behind (FR-028, SC-010)", async () => {
    const w = await dst.createWritable("cancelled.jpg");
    await w.write(new Uint8Array([1, 2, 3]));
    await w.abort();
    expect(await names(env.destination)).toEqual([]);
  });

  it("abort() before any write also leaves nothing behind", async () => {
    const w = await dst.createWritable("empty.jpg");
    await w.abort();
    expect(await names(env.destination)).toEqual([]);
  });

  it("abort() never deletes a file that existed before (overwrite policy)", async () => {
    await seed(env.destination, "keep.jpg", new Uint8Array([4, 4, 4, 4]));
    const w = await dst.createWritable("keep.jpg");
    await w.write(new Uint8Array([1]));
    await w.abort();
    const f = await (await env.destination.getFileHandle("keep.jpg")).getFile();
    expect(f.size).toBe(4);
  });

  it("isSameEntry / resolve detect identity and containment (FR-004)", async () => {
    expect(await src.isSameEntry(src)).toBe(true);
    expect(await src.isSameEntry(dst)).toBe(false);
    const child = new FsDirHandle(await env.source.getDirectoryHandle("inside", { create: true }), false);
    expect(await src.resolve(child)).toEqual(["inside"]);
    expect(await child.resolve(src)).toBeNull();
  });

  it("removeEntry removes from a writable directory", async () => {
    await seed(env.destination, "gone.jpg", new Uint8Array([1]));
    await dst.removeEntry("gone.jpg");
    expect(await names(env.destination)).toEqual([]);
  });
});

describe("FsaAdapter feature detection (FR-034)", () => {
  it("isSupported follows 'showDirectoryPicker' in window", () => {
    const had = "showDirectoryPicker" in window;
    const orig = (window as any).showDirectoryPicker;
    delete (window as any).showDirectoryPicker;
    expect(new FsaAdapter().isSupported()).toBe(false);
    (window as any).showDirectoryPicker = () => {};
    expect(new FsaAdapter().isSupported()).toBe(true);
    if (had) (window as any).showDirectoryPicker = orig;
    else delete (window as any).showDirectoryPicker;
  });
});
