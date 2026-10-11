import type { FailureReason } from "../../types";

/** Map platform exceptions onto FailureReason; callers never inspect platform error types. */
export function classifyStorageError(e: unknown): FailureReason {
  const name = (e as { name?: string } | null)?.name;
  if (name === "QuotaExceededError") return "out-of-space";
  if (name === "NotAllowedError" || name === "SecurityError") return "permission-lost";
  if (name === "NotFoundError" || name === "InvalidStateError") return "write-failed";
  return "write-failed";
}

export class StorageError extends Error {
  readonly reason: FailureReason;
  constructor(reason: FailureReason, cause?: unknown) {
    super(`storage error: ${reason}`, { cause });
    this.name = "StorageError";
    this.reason = reason;
  }
}
