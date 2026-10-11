export interface StorageAdapter {
  isSupported(): boolean;
  pickSourceDirectory(): Promise<DirHandle>;
  pickDestinationDirectory(): Promise<DirHandle>;
}

export interface FileEntry {
  readonly name: string;
  readonly byteLength: number;
  read(): Promise<Uint8Array>;
  readRange(offset: number, length: number): Promise<Uint8Array>;
}

export interface WritableTarget {
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
  /** MUST remove an entry this target created (FR-028). */
  abort(): Promise<void>;
}

export interface DirHandle {
  readonly displayName: string;
  listFiles(): AsyncIterable<FileEntry>;
  exists(name: string): Promise<boolean>;
  isSameEntry(other: DirHandle): Promise<boolean>;
  resolve(other: DirHandle): Promise<string[] | null>;
  createWritable(name: string): Promise<WritableTarget>;
  removeEntry(name: string): Promise<void>;
  assertWritable(): Promise<void>;
}
