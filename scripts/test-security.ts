import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
const checks: { test: string; status: string }[] = [];
const passcode = randomBytes(24).toString("hex");
function start(port: number, required: boolean): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          GOOGLE_GENERATIVE_AI_API_KEY: "",
          OPENAI_API_KEY: "",
          KOSH_PASSCODE: required ? passcode : "",
          KOSH_SECRET: required ? randomBytes(32).toString("hex") : "",
        },
      },
    );
    let output = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Test server readiness timed out"));
    }, 30000);
    child.stdout?.on("data", (b) => {
      output += b.toString();
      if (output.includes("Ready")) {
        clearTimeout(timer);
        resolve(child);
      }
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      if (!output.includes("Ready"))
        reject(new Error("Test server exited: " + code));
    });
  });
}
const json = (body: unknown) => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});
async function main() {
  const locked = await start(3112, true),
    base = "http://127.0.0.1:3112";
  try {
    const session = await fetch(base + "/api/auth/session").then((r) =>
      r.json(),
    );
    assert.deepEqual(session, { authenticated: false, required: true });
    assert.equal((await fetch(base + "/api/transactions")).status, 401);
    const redirect = await fetch(base + "/planner?x=1", { redirect: "manual" });
    assert.equal(redirect.status, 307);
    assert(
      new URL(redirect.headers.get("location")!, base).searchParams.get(
        "next",
      ) === "/planner?x=1",
    );
    assert.equal((await fetch(base + "/icon.svg")).status, 200);
    checks.push({ test: "401, page redirect, static assets", status: "PASS" });
    const wrong = await fetch(base + "/api/auth/login", {
      ...json({ passcode: "wrong" }),
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "lockout",
      },
    });
    assert.equal(wrong.status, 401);
    for (let i = 1; i < 5; i++)
      assert.equal(
        (
          await fetch(base + "/api/auth/login", {
            ...json({ passcode: "wrong" }),
            headers: {
              "content-type": "application/json",
              "x-forwarded-for": "lockout",
            },
          })
        ).status,
        401,
      );
    const block = await fetch(base + "/api/auth/login", {
      ...json({ passcode }),
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "lockout",
      },
    });
    assert.equal(block.status, 429);
    assert(Number(block.headers.get("retry-after")) > 0);
    checks.push({
      test: "Five failures lock out even correct login",
      status: "PASS",
    });
    const login = await fetch(base + "/api/auth/login", json({ passcode }));
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie")!;
    assert(
      /HttpOnly/i.test(cookie) &&
        /SameSite=lax/i.test(cookie) &&
        /Secure/i.test(cookie) &&
        /Max-Age=604800/i.test(cookie),
    );
    const sessionCookie = cookie.split(";")[0];
    const headers = {
      cookie: sessionCookie,
      "content-type": "application/json",
    };
    assert.equal((await fetch(base + "/api/health")).status, 200);
    assert.equal(
      (
        await fetch(base + "/api/data", {
          method: "DELETE",
          headers: { ...headers, origin: "https://foreign.example" },
        })
      ).status,
      403,
    );
    for (const [name, blob, status] of [
      ["fake.pdf", new Blob(["not PDF"], { type: "application/pdf" }), 400],
      ["fake.csv", new Blob(["MZ executable"], { type: "text/csv" }), 400],
      ["large.csv", new Blob([new Uint8Array(5 * 1024 * 1024 + 1)]), 413],
    ] as const) {
      const form = new FormData();
      form.set("file", blob, name);
      assert.equal(
        (
          await fetch(base + "/api/import", {
            method: "POST",
            headers: { cookie: sessionCookie },
            body: form,
          })
        ).status,
        status,
      );
    }
    checks.push({
      test: "Public health, CSRF rejection, upload size/magic checks",
      status: "PASS",
    });
    assert.equal(
      (await fetch(base + "/api/transactions", { headers })).status,
      200,
    );
    const tamper =
      sessionCookie.slice(0, -1) + (sessionCookie.endsWith("a") ? "b" : "a");
    assert.equal(
      (await fetch(base + "/api/transactions", { headers: { cookie: tamper } }))
        .status,
      401,
    );
    checks.push({
      test: "Login, signed cookie flags, tamper rejection",
      status: "PASS",
    });
    const exportResponse = await fetch(base + "/api/data/export", { headers });
    assert.equal(exportResponse.status, 200);
    assert(
      exportResponse.headers
        .get("content-disposition")
        ?.includes("kosh-export.json"),
    );
    for (const h of [
      "content-security-policy",
      "x-content-type-options",
      "referrer-policy",
      "x-frame-options",
      "permissions-policy",
      "strict-transport-security",
    ])
      assert(exportResponse.headers.has(h), h);
    checks.push({
      test: "Security headers and JSON attachment",
      status: "PASS",
    });
    const add = async (ref: string) =>
      fetch(base + "/api/transactions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          date: "2026-10-30",
          description: "POS card 1234567812345678 REF " + ref,
          account: "123456789012",
          amount: 123.45,
          direction: "debit",
        }),
      });
    const added = await add("111111111234"),
      data = await added.json();
    assert.equal(added.status, 200);
    assert(!/\d{8,}/.test(data.transactions[0].description));
    assert.equal((await add("222222221234").then((r) => r.json())).added, 1);
    assert.equal((await add("111111111234").then((r) => r.json())).added, 0);
    checks.push({
      test: "Masking preserves distinct refs and re-import dedupe",
      status: "PASS",
    });
    let limited: Response | undefined;
    for (let i = 0; i < 11; i++)
      limited = await fetch(base + "/api/import/preview", {
        method: "POST",
        headers: { ...headers, "x-forwarded-for": "rate-test" },
        body: JSON.stringify({ sms: "OTP 123456" }),
      });
    assert.equal(limited?.status, 429);
    assert(Number(limited?.headers.get("retry-after")) > 0);
    checks.push({
      test: "Import preview sliding-window rate limit",
      status: "PASS",
    });
    for (const [path, limit] of [
      ["/api/coach", 20],
      ["/api/simulate", 40],
      ["/api/plan/fix", 20],
      ["/api/import", 10],
      ["/api/profile/life-event", 20],
    ] as const) {
      let response: Response | undefined;
      for (let i = 0; i <= limit; i++) {
        response = await fetch(base + path, {
          method: "POST",
          headers: {
            ...headers,
            "x-forwarded-for": "limit-" + path + ", proxy",
          },
          body: "{}",
        });
        if (i < limit) assert.notEqual(response.status, 429, path);
      }
      assert.equal(response?.status, 429, path);
      assert(Number(response?.headers.get("retry-after")) > 0, path);
    }
    checks.push({ test: "All six configured endpoint limits", status: "PASS" });
    await Promise.all(
      Array.from({ length: 5 }, () =>
        fetch(base + "/api/auth/login", {
          ...json({ passcode: "wrong" }),
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": "parallel-failures",
          },
        }),
      ),
    );
    assert.equal(
      (
        await fetch(base + "/api/auth/login", {
          ...json({ passcode }),
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": "parallel-failures",
          },
        })
      ).status,
      429,
    );
    checks.push({
      test: "Concurrent login failures cannot bypass lockout",
      status: "PASS",
    });
    assert.equal(
      (await fetch(base + "/api/data", { method: "DELETE", headers })).status,
      200,
    );
    const empty = await fetch(base + "/api/data/export", { headers }).then(
      (r) => r.json(),
    );
    assert.equal(empty.transactions.length, 0);
    assert.equal(empty.profile.monthlyIncome, 0);
    assert.equal(empty.profile.goals.length, 0);
    await fetch(base + "/api/reset", { method: "POST", headers });
    assert(
      (
        await fetch(base + "/api/transactions", { headers }).then((r) =>
          r.json(),
        )
      ).length > 0,
    );
    checks.push({
      test: "Delete empties data; reset restores demo",
      status: "PASS",
    });
    const logout = await fetch(base + "/api/auth/logout", {
      method: "POST",
      headers,
    });
    assert(/Max-Age=0/i.test(logout.headers.get("set-cookie") ?? ""));
    checks.push({ test: "Logout clears cookie", status: "PASS" });
  } finally {
    locked.kill();
  }
  const open = await start(3113, false);
  try {
    assert.equal(
      (await fetch("http://127.0.0.1:3113/api/transactions")).status,
      200,
    );
    assert.deepEqual(
      await fetch("http://127.0.0.1:3113/api/auth/session").then((r) =>
        r.json(),
      ),
      { authenticated: true, required: false },
    );
    checks.push({ test: "Unset passcode keeps demo open", status: "PASS" });
  } finally {
    open.kill();
  }
}
main()
  .then(() => console.table(checks))
  .catch((e) => {
    checks.push({
      test: e instanceof Error ? e.message : "Security test failure",
      status: "FAIL",
    });
    console.table(checks);
    process.exitCode = 1;
  });
