/// <reference lib="webworker" />
import { convertOne } from "../core/pipeline/convertOne";
import { handleRequest, type ConvertRequest } from "./protocol";

// Workers never touch the file system; they take bytes in and hand bytes back (contract rule 2).
self.onmessage = (ev: MessageEvent<ConvertRequest>) => {
  if (ev.data?.type !== "convert") return;
  void handleRequest(ev.data, convertOne, (msg, transfer) => self.postMessage(msg, transfer));
};
