import { handle } from "@/lib/api";
import { handleImportRequest } from "@/lib/ingest/request";
export const maxDuration = 60;
export const POST = handle(async (req: Request) => handleImportRequest(req));
