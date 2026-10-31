import { handle } from "@/lib/api";
import { handleImportRequest } from "@/lib/ingest/request";
export const maxDuration = 60;
/** Same request as /api/import; returns a categorized preview without saving anything. */
export const POST = handle(async (req: Request) =>
  handleImportRequest(req, true),
);
