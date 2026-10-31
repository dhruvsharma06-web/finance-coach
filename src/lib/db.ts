import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { Database } from "./types";
import { buildSeed } from "./seed";

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
let queue: Promise<unknown> = Promise.resolve();

async function load(): Promise<Database> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    const parsed = JSON.parse(raw) as Database;
    if (parsed.version !== DB_VERSION) throw new Error("version mismatch");
    cache = parsed;
  } catch {
    cache = buildSeed();
    await persist(cache);
  }
  return cache;
}

async function persist(db: Database) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

export async function readDb(): Promise<Database> {
  return structuredClone(await load());
}

export async function updateDb<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await load();
    const result = await fn(db);
    await persist(db);
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
