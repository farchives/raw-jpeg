import { describe, expect, it } from "vitest";
import { runReducer, type RunEvent } from "../../src/app/runMachine";
import type { RunState } from "../../src/types";

const run = (start: RunState, evs: RunEvent[]) => evs.reduce(runReducer, start);

describe("run state machine", () => {
  it("happy path: idle → scanning → ready → running → completed", () => {
    expect(run("idle", [{ type: "SCAN_START" }, { type: "SCAN_DONE", eligibleCount: 3 }, { type: "START" }, { type: "FINISHED" }])).toBe("completed");
  });
  it("a scan with no eligible files returns to idle (FR-010)", () => {
    expect(run("idle", [{ type: "SCAN_START" }, { type: "SCAN_DONE", eligibleCount: 0 }])).toBe("idle");
  });
  it("cancel goes running → cancelling → cancelled", () => {
    expect(run("running", [{ type: "CANCEL" }, { type: "CANCEL_SETTLED" }])).toBe("cancelled");
  });
  it("can stop by error while running or cancelling", () => {
    expect(run("running", [{ type: "FATAL" }])).toBe("stopped-by-error");
    expect(run("cancelling", [{ type: "FATAL" }])).toBe("stopped-by-error");
  });
  it("cannot start unless ready", () => {
    expect(run("idle", [{ type: "START" }])).toBe("idle");
    expect(run("scanning", [{ type: "START" }])).toBe("scanning");
  });
  it("changing folders mid-run is ignored; before the run it resets to idle", () => {
    expect(run("running", [{ type: "FOLDER_CHANGED" }])).toBe("running");
    expect(run("ready", [{ type: "FOLDER_CHANGED" }])).toBe("idle");
  });
  it("completed is reached even if every file failed — it describes the run, not success", () => {
    expect(run("running", [{ type: "FINISHED" }])).toBe("completed");
  });
  it("terminal states can start a new scan or reset", () => {
    expect(run("completed", [{ type: "SCAN_START" }])).toBe("scanning");
    expect(run("cancelled", [{ type: "RESET" }])).toBe("idle");
  });
});
