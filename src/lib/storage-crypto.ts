import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
function key(): Buffer | null {
  const raw = process.env.KOSH_DATA_KEY;
  if (!raw) return null;
  const decoded = /^[a-f\d]{64}$/i.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");
  if (decoded.length !== 32)
    throw new Error("KOSH_DATA_KEY must encode 32 random bytes.");
  return decoded;
}
export function encodeStorage(plain: string): string {
  const secret = key();
  if (!secret) return plain;
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", secret, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  return JSON.stringify({
    encrypted: "aes-256-gcm",
    v: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: ciphertext.toString("base64"),
  });
}
export function decodeStorage(raw: string): {
  text: string;
  plaintext: boolean;
} {
  const envelope = JSON.parse(raw);
  if (envelope.encrypted !== "aes-256-gcm")
    return { text: raw, plaintext: true };
  const secret = key();
  if (!secret) throw new Error("Encrypted data requires KOSH_DATA_KEY.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    secret,
    Buffer.from(envelope.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  return {
    text: Buffer.concat([
      decipher.update(Buffer.from(envelope.data, "base64")),
      decipher.final(),
    ]).toString("utf8"),
    plaintext: false,
  };
}
