import type { DirHandle, FileEntry, WritableTarget } from "./StorageAdapter";
import { StorageError, classifyStorageError } from "./errors";

/** DirHandle over any FileSystemDirectoryHandle (real FSA picker result, or an OPFS directory). */
export class FsDirHandle implements DirHandle {
  constructor(
    readonly handle: FileSystemDirectoryHandle,
    private readonly readOnly: boolean,
  ) {}

  get displayName(): string {
    return this.handle.name;
  }

  async *listFiles(): AsyncIterable<FileEntry> {
    // Non-recursive: directories are neither descended into nor reported.
    for await (const entry of (this.handle as any).values() as AsyncIterable<FileSystemHandle>) {
      if (entry.kind !== "file") continue;
      const fh = entry as FileSystemFileHandle;
      const file = await fh.getFile();
      yield {
        name: fh.name,
        byteLength: file.size,
        read: async () => new Uint8Array(await (await fh.getFile()).arrayBuffer()),
        readRange: async (offset, length) =>
          new Uint8Array(await (await fh.getFile()).slice(offset, offset + length).arrayBuffer()),
      };
    }
  }

  async exists(name: string): Promise<boolean> {
    try {
      await this.handle.getFileHandle(name, { create: false });
      return true;
    } catch (e) {
      if ((e as Error).name === "NotFoundError" || (e as Error).name === "TypeMismatchError") {
        return false;
      }
      throw new StorageError(classifyStorageError(e), e);
    }
  }

  isSameEntry(other: DirHandle): Promise<boolean> {
    return this.handle.isSameEntry((other as FsDirHandle).handle);
  }

  resolve(other: DirHandle): Promise<string[] | null> {
    return this.handle.resolve((other as FsDirHandle).handle);
  }

  async createWritable(name: string): Promise<WritableTarget> {
    if (this.readOnly) throw new StorageError("permission-lost", new Error("source is read-only"));
    // Only a target that created the entry may remove it on abort — never delete a pre-existing file.
    const existed = await this.exists(name);
    let writable: FileSystemWritableFileStream;
    try {
      const fh = await this.handle.getFileHandle(name, { create: true });
      writable = await fh.createWritable();
    } catch (e) {
      throw new StorageError(classifyStorageError(e), e);
    }
    const parent = this.handle;
    return {
      async write(data) {
        try {
          await writable.write(data as unknown as BufferSource);
        } catch (e) {
          throw new StorageError(classifyStorageError(e), e);
        }
      },
      async close() {
        try {
          await writable.close();
        } catch (e) {
          throw new StorageError(classifyStorageError(e), e);
        }
      },
      async abort() {
        try {
          await writable.abort();
        } catch {
          // already closed/aborted
        }
        if (!existed) {
          try {
            await parent.removeEntry(name);
          } catch {
            // entry was never materialised
          }
        }
      },
    };
  }

  async removeEntry(name: string): Promise<void> {
    if (this.readOnly) throw new StorageError("permission-lost", new Error("source is read-only"));
    try {
      await this.handle.removeEntry(name);
    } catch (e) {
      throw new StorageError(classifyStorageError(e), e);
    }
  }

  async assertWritable(): Promise<void> {
    if (this.readOnly) throw new StorageError("permission-lost", new Error("source is read-only"));
    const probe = `.rawjpeg-probe-${Math.random().toString(36).slice(2)}`;
    try {
      const fh = await this.handle.getFileHandle(probe, { create: true });
      const w = await fh.createWritable();
      await w.close();
      await this.handle.removeEntry(probe);
    } catch (e) {
      throw new StorageError(classifyStorageError(e), e);
    }
  }
}
