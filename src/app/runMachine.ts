import type { RunState } from "../types";

export type RunEvent =
  | { type: "SCAN_START" }
  | { type: "SCAN_DONE"; eligibleCount: number }
  | { type: "FOLDER_CHANGED" }
  | { type: "START" }
  | { type: "CANCEL" }
  | { type: "CANCEL_SETTLED" }
  | { type: "FINISHED" }
  | { type: "FATAL" }
  | { type: "RESET" };

/** Top-level run state machine from data-model.md. Illegal events leave the state unchanged. */
export function runReducer(state: RunState, ev: RunEvent): RunState {
  switch (ev.type) {
    case "SCAN_START":
      return state === "idle" || state === "ready" || isTerminal(state) ? "scanning" : state;
    case "SCAN_DONE":
      return state === "scanning" ? (ev.eligibleCount > 0 ? "ready" : "idle") : state;
    case "FOLDER_CHANGED":
      // Only allowed before a run is in flight; changing folders mid-run is ignored.
      return state === "scanning" || state === "ready" || isTerminal(state) ? "idle" : state;
    case "START":
      return state === "ready" ? "running" : state;
    case "CANCEL":
      return state === "running" ? "cancelling" : state;
    case "CANCEL_SETTLED":
      return state === "cancelling" ? "cancelled" : state;
    case "FINISHED":
      return state === "running" ? "completed" : state;
    case "FATAL":
      return state === "running" || state === "cancelling" ? "stopped-by-error" : state;
    case "RESET":
      return isTerminal(state) ? "idle" : state;
  }
}

export function isTerminal(s: RunState): boolean {
  return s === "completed" || s === "cancelled" || s === "stopped-by-error";
}
