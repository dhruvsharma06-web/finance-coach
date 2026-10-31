import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { Database } from "./types";
import { buildSeed } from "./seed";
import { encodeStorage, decodeStorage } from "./storage-crypto";

/**
 * Tiny JSON-file database. Zero setup, works locally and on Vercel.
 * - Local: ./data/db.json (gitignored)
 * - Vercel: /tmp/db.json (ephemeral per instance; reseeds automatically — fine for demo)
 *
 * Usage:
 *   const db = await readDb();
 *   await updateDb((db) => { db.transactions.push(t); });
 *
 * Always mutate through updateDb so writes are serialized.
 */

const DB_VERSION = 1;
const DATA_DIR = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

let cache: Database | null = null;
let loading: Promise<Database> | null = null;
let queue: Promise<unknown> = Promise.resolve();

async function load(): Promise<Database> {
  if (cache) return cache;
  if (!loading)
    loading = loadFromDisk().finally(() => {
      loading = null;
    });
  return loading;
}
async function loadFromDisk(): Promise<Database> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    const decoded = decodeStorage(raw);
    const parsed = JSON.parse(decoded.text) as Database;
    if (parsed.version !== DB_VERSION) throw new Error("version mismatch");
    if (decoded.plaintext && process.env.KOSH_DATA_KEY) await persist(parsed);
    cache = parsed;
  } catch (error) {
    if (!(
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ))
      throw error;
    const seed = buildSeed();
    await persist(seed);
    cache = seed;
  }
  return cache;
}

async function persist(db: Database) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const temporary = DB_PATH + ".tmp";
  await fs.writeFile(temporary, encodeStorage(JSON.stringify(db)), {
    encoding: "utf8",
    mode: 0o600,
  });
  await fs.rename(temporary, DB_PATH);
}

export async function readDb(): Promise<Database> {
  return structuredClone(await load());
}

export async function updateDb<T>(
  fn: (db: Database) => T | Promise<T>,
): Promise<T> {
  const run = queue.then(async () => {
    const db = structuredClone(await load());
    const result = await fn(db);
    await persist(db);
    cache = db;
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

/** Wipe everything and restore demo seed data. */
export async function resetDb(): Promise<void> {
  await updateDb((db) => {
    Object.assign(db, buildSeed());
  });
}

export const newId = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();
