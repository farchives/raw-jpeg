import type { Processor } from "../../workers/protocol";
import { ConvertFailure } from "../../workers/protocol";

/** Single-file conversion. Implemented in US1 (T033/T034); until then every file fails visibly. */
export const convertOne: Processor = async () => {
  throw new ConvertFailure("corrupt-or-unreadable");
};
