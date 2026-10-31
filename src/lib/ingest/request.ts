import { z } from "zod";
import { importFile, importSms, previewFile, previewSms } from "./index";

/** Shared request validation for import and preview; never writes on malformed input. */
export async function handleImportRequest(
  req: Request,
  preview = false,
): Promise<Response> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = z
      .object({ sms: z.string().trim().min(1).max(200000) })
      .safeParse(await req.json().catch(() => null));
    if (!body.success)
      return Response.json(
        { error: "Paste SMS text as { sms: string }." },
        { status: 400 },
      );
    return Response.json(
      await (preview ? previewSms(body.data.sms) : importSms(body.data.sms)),
    );
  }
  if (!type.includes("multipart/form-data"))
    return Response.json(
      { error: "Use JSON with sms or a multipart file upload." },
      { status: 415 },
    );
  const form = await req.formData().catch(() => null),
    file = form?.get("file");
  if (!(file instanceof File) || file.size === 0)
    return Response.json(
      { error: "Upload a non-empty CSV, PDF or SMS text file." },
      { status: 400 },
    );
  if (!/\.(csv|pdf|txt)$/i.test(file.name) && !/(?:csv|pdf)/i.test(file.type))
    return Response.json(
      { error: "Unsupported file type. Upload CSV, PDF or TXT." },
      { status: 400 },
    );
  if (file.size > 5 * 1024 * 1024)
    return Response.json(
      { error: "File exceeds 5 MB. Split the statement into smaller files." },
      { status: 413 },
    );
  const input = {
    name: file.name,
    type: file.type,
    buffer: Buffer.from(await file.arrayBuffer()),
  };
  const pdf =
    file.name.toLowerCase().endsWith(".pdf") ||
    (!/\.(csv|txt)$/i.test(file.name) && file.type.includes("pdf"));
  if (pdf && !input.buffer.subarray(0, 5).equals(Buffer.from("%PDF-")))
    return Response.json(
      { error: "This file is not a valid PDF." },
      { status: 400 },
    );
  if (!pdf) {
    try {
      const header = input.buffer.subarray(0, 8).toString("latin1");
      if (/^(?:MZ|PK\x03\x04|%PDF-|\x89PNG)/.test(header)) throw new Error();
      const text = new TextDecoder("utf-8", { fatal: true }).decode(
        input.buffer,
      );
      if (/[\x00-\x08\x0e-\x1f]/.test(text)) throw new Error();
    } catch {
      return Response.json(
        { error: "Upload a UTF-8 text/CSV file, not a binary file." },
        { status: 400 },
      );
    }
  }
  return Response.json(
    await (preview ? previewFile(input) : importFile(input)),
  );
}
