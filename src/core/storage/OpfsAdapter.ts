import type { DirHandle, StorageAdapter } from "./StorageAdapter";
import { FsDirHandle } from "./FsDirHandle";

/**
 * Test adapter over the Origin Private File System. Playwright cannot drive the native OS
 * folder dialog, so "picking" returns pre-seeded OPFS directories instead. Directory semantics
 * are shared with FsaAdapter through FsDirHandle; only the pickers differ.
 */
export class OpfsAdapter implements StorageAdapter {
  constructor(
    private readonly source: FileSystemDirectoryHandle,
    private readonly destination: FileSystemDirectoryHandle,
  ) {}

  static async create(prefix = "rawjpeg-test"): Promise<{
    adapter: OpfsAdapter;
    source: FileSystemDirectoryHandle;
    destination: FileSystemDirectoryHandle;
    cleanup(): Promise<void>;
  }> {
    const root = await navigator.storage.getDirectory();
    const id = `${prefix}-${crypto.randomUUID()}`;
    const base = await root.getDirectoryHandle(id, { create: true });
    const source = await base.getDirectoryHandle("src", { create: true });
    const destination = await base.getDirectoryHandle("dst", { create: true });
    return {
      adapter: new OpfsAdapter(source, destination),
      source,
      destination,
      cleanup: () => root.removeEntry(id, { recursive: true }),
    };
  }

  isSupported(): boolean {
    return true;
  }
  async pickSourceDirectory(): Promise<DirHandle> {
    return new FsDirHandle(this.source, true);
  }
  async pickDestinationDirectory(): Promise<DirHandle> {
    return new FsDirHandle(this.destination, false);
  }
}
