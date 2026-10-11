import { useMemo, useReducer } from "react";
import { FsaAdapter } from "../core/storage/FsaAdapter";
import type { StorageAdapter } from "../core/storage/StorageAdapter";
import { BrowserGate } from "./UnsupportedBrowser";
import { runReducer } from "./runMachine";

export function App({ adapter }: { adapter?: StorageAdapter }) {
  const storage = useMemo(() => adapter ?? new FsaAdapter(), [adapter]);
  const [state] = useReducer(runReducer, "idle");
  return (
    <BrowserGate adapter={storage}>
      <main className="mx-auto max-w-xl p-6">
        <h1 className="text-xl font-semibold">RAW to JPEG</h1>
        <p className="mt-2 opacity-70">State: {state}</p>
      </main>
    </BrowserGate>
  );
}
