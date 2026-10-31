import { importFile, importSms } from "@/lib/ingest";
import { fail, handle, ok } from "@/lib/api";

export const maxDuration = 60;

/**
 * POST /api/import
 *  - multipart/form-data with `file` (CSV / PDF / .txt of SMS)
 *  - OR application/json { sms: "pasted SMS text" }
 * → ImportResult
 */
export const POST = handle(async (req: Request) => {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const { sms } = await req.json();
    if (!sms?.trim()) return fail("Paste at least one SMS");
    return ok(await importSms(sms));
  }
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("No file uploaded");
  return ok(await importFile({ name: file.name, type: file.type, buffer: Buffer.from(await file.arrayBuffer()) }));
});
