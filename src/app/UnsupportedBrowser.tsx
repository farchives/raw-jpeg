import type { StorageAdapter } from "../core/storage/StorageAdapter";
import type { ReactNode } from "react";

export const SUPPORTED_BROWSERS = "Google Chrome, Microsoft Edge, or Opera (desktop)";

/** Renders children only when the folder-access API exists; otherwise blocks with a clear message (FR-034). */
export function BrowserGate({ adapter, children }: { adapter: StorageAdapter; children: ReactNode }) {
  if (adapter.isSupported()) return <>{children}</>;
  return <UnsupportedBrowser />;
}

export function UnsupportedBrowser() {
  return (
    <main className="mx-auto max-w-xl p-6" role="alert">
      <h1 className="text-xl font-semibold">This browser can't open folders</h1>
      <p className="mt-3">
        RAW to JPEG needs to read and write folders on your computer, which this browser doesn't
        allow. Please open this page in {SUPPORTED_BROWSERS}.
      </p>
      <p className="mt-3 text-sm opacity-70">
        Your files never leave your computer — nothing is uploaded.
      </p>
    </main>
  );
}
