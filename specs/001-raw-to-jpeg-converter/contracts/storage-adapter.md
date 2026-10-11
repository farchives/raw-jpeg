# Contract: StorageAdapter

**Consumers**: `core/pipeline/*` | **Implementations**: `FsaAdapter` (production), `OpfsAdapter` (tests)

The sole boundary between conversion logic and the file system. No module under `core/` may
touch `window.showDirectoryPicker`, `FileSystemDirectoryHandle`, or OPFS directly.

```ts
interface StorageAdapter {
  isSupported(): boolean;                              // FR-034 feature detection
  pickSourceDirectory(): Promise<DirHandle>;           // read-only (FR-001, FR-011)
  pickDestinationDirectory(): Promise<DirHandle>;      // read-write (FR-002)
}

interface DirHandle {
  readonly displayName: string;
  listFiles(): AsyncIterable<FileEntry>;               // non-recursive (spec Assumptions)
  exists(name: string): Promise<boolean>;              // FR-024 collision check
  isSameEntry(other: DirHandle): Promise<boolean>;     // FR-004
  resolve(other: DirHandle): Promise<string[] | null>; // FR-004 containment; null = not contained
  createWritable(name: string): Promise<WritableTarget>;
  removeEntry(name: string): Promise<void>;            // FR-028 cleanup — see below
  assertWritable(): Promise<void>;                     // pre-flight (spec Edge Cases)
}

interface FileEntry {
  readonly name: string;
  readonly byteLength: number;
  read(): Promise<Uint8Array>;
  readRange(offset: number, length: number): Promise<Uint8Array>; // reserved; see research R-005
}

interface WritableTarget {
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort(): Promise<void>;   // MUST remove the created entry — see below
}
```

## Behavioral requirements

Implementations are not interchangeable unless **all** of these hold. The integration suite runs
the same conformance tests against both.

1. **`listFiles` is non-recursive.** Subdirectories are not descended into and not reported.
2. **Source handles are read-only.** `createWritable` and `removeEntry` on a source handle
   must throw. This is the enforcement point for FR-011.
3. **`abort()` leaves nothing behind.** The File System Access API creates the directory entry
   the moment a writable is opened, so an aborted write otherwise leaves a **zero-byte file**.
   `abort()` must call `removeEntry` internally. Cancelling a run must not litter the
   destination with empty `.jpg` files (FR-028, SC-010). This is the single behavior most
   likely to be implemented wrongly, and it has a dedicated conformance test.
4. **`assertWritable()` runs before the batch, not during it.** A read-only destination is
   reported up front rather than as 400 identical write failures.
5. **Errors are classified, not raw.** Implementations map platform exceptions onto the
   `FailureReason` enum in [data-model.md](../data-model.md). `QuotaExceededError` →
   `out-of-space`; `NotAllowedError` → `permission-lost`. Callers never inspect
   platform-specific error types.
6. **`exists()` must not create.** It uses `getFileHandle(name, { create: false })` and treats
   `NotFoundError` as `false`.
