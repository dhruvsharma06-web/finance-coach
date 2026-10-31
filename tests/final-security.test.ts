import assert from "node:assert/strict";
import { serverTest } from "../scripts/server-test";
serverTest("tests/final-security.test.ts", async () => {
  const { encodeStorage, decodeStorage } =
      await import("../src/lib/storage-crypto"),
    {
      hashPasscode,
      checkPasscode,
      createSession,
      validSession,
      refreshSession,
    } = await import("../src/lib/auth");
  const oldKey = process.env.KOSH_DATA_KEY,
    oldHash = process.env.KOSH_PASSCODE_HASH;
  try {
    process.env.KOSH_DATA_KEY = Buffer.alloc(32, 1).toString("base64");
    const text = JSON.stringify({ version: 1, private: "sample-account" }),
      encrypted = encodeStorage(text);
    assert(!encrypted.includes("sample-account"));
    assert.equal(decodeStorage(encrypted).text, text);
    assert.notEqual(encodeStorage(text), encrypted);
    const envelope = JSON.parse(encrypted);
    envelope.tag = Buffer.alloc(16).toString("base64");
    assert.throws(() => decodeStorage(JSON.stringify(envelope)));
    process.env.KOSH_DATA_KEY = Buffer.alloc(32, 2).toString("base64");
    assert.throws(() => decodeStorage(encrypted));
    process.env.KOSH_PASSCODE_HASH = hashPasscode("test-only-passcode");
    assert(checkPasscode("test-only-passcode"));
    assert(!checkPasscode("wrong"));
    const now = Date.now(),
      token = createSession(now);
    assert(validSession(token, now + 29 * 60000));
    assert(!validSession(token, now + 31 * 60000));
    const refreshed = refreshSession(token, now + 29 * 60000);
    assert(validSession(refreshed, now + 58 * 60000));
    assert(!validSession(refreshed, now + 8 * 86400000));
    console.log(
      "PASS final security: ciphertext integrity, unique nonces, wrong-key/tamper failure, scrypt, idle refresh, absolute expiry.",
    );
  } finally {
    if (oldKey) process.env.KOSH_DATA_KEY = oldKey;
    else delete process.env.KOSH_DATA_KEY;
    if (oldHash) process.env.KOSH_PASSCODE_HASH = oldHash;
    else delete process.env.KOSH_PASSCODE_HASH;
  }
});
