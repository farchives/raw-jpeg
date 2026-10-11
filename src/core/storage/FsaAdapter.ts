import type { DirHandle, StorageAdapter } from "./StorageAdapter";
import { FsDirHandle } from "./FsDirHandle";

type PickerWindow = Window & {
  showDirectoryPicker?: (o?: { mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandle>;
};

/** Production adapter over the File System Access API (Chromium only, FR-034). */
export class FsaAdapter implements StorageAdapter {
  isSupported(): boolean {
    return typeof window !== "undefined" && "showDirectoryPicker" in window;
  }

  async pickSourceDirectory(): Promise<DirHandle> {
    const h = await (window as PickerWindow).showDirectoryPicker!({ mode: "read" });
    return new FsDirHandle(h, true);
  }

  async pickDestinationDirectory(): Promise<DirHandle> {
    const h = await (window as PickerWindow).showDirectoryPicker!({ mode: "readwrite" });
    return new FsDirHandle(h, false);
  }
}
