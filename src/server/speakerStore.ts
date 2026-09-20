/**
 * Persistence for the speaker hub.
 *
 * Everything the hub collects — availability, 1:1 bookings, the volunteer
 * roster, survey answers — is one small JSON document. There is no database in
 * this project and this feature does not justify introducing one, so the store
 * has two backends and picks whichever the deployment can actually honour:
 *
 *   1. **KV over REST** (Vercel KV / Upstash) when `KV_REST_API_URL` and
 *      `KV_REST_API_TOKEN` are set. Survives serverless, no new dependency —
 *      it is plain `fetch` against the REST command endpoint.
 *   2. **A JSON file** otherwise, for `next dev`, `next start`, and anything
 *      self-hosted with a real disk.
 *
 * The file backend on a serverless platform would hand every instance its own
 * empty `/tmp` and quietly lose sign-ups, so `isEphemeral()` exists purely so
 * the host console can say so out loud instead of looking like it works.
 */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { DEFAULT_SETTINGS } from "@/speaker/config";
import type { Booking, SpeakerData } from "@/speaker/types";

const KEY = "mano:speaker:v1";
const LOCK_KEY = `${KEY}:lock`;

function kvConfig() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function storeKind(): "kv" | "file" {
  return kvConfig() ? "kv" : "file";
}

/**
 * True when the chosen backend will not survive the next request — a file
 * store on a platform whose filesystem is a scratch disk. Worth surfacing:
 * the failure is invisible until the host opens an empty roster on Saturday.
 */
export function isEphemeral() {
  const serverless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  return serverless && storeKind() === "file";
}

function dataFile() {
  return resolve(process.env.SPEAKER_DATA_FILE ?? ".data/speaker.json");
}

export function emptyData(): SpeakerData {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    availability: {},
    bookings: [],
    volunteers: [],
    surveys: [],
  };
}

/**
 * A booking written before the practice questions existed.
 *
 * `hydrate` fills the settings back in for the same reason, and bookings need
 * it more: the console and the CSV read these fields directly, and a stored row
 * from an earlier deploy would otherwise hand them `undefined` where the type
 * promises a string. Normalising on the way out of the store means every reader
 * can trust the shape without each one re-checking it.
 */
function hydrateBooking(raw: Booking): Booking {
  return {
    ...raw,
    organization: raw.organization ?? "",
    role: raw.role ?? "",
    specialty: raw.specialty ?? "",
    interests: Array.isArray(raw.interests) ? raw.interests : [],
    topic: raw.topic ?? "",
  };
}

/**
 * Fills in anything a stored document is missing.
 *
 * Deployments get upgraded mid-event, and a settings field added after the
 * document was written must not come back `undefined` and render as a blank
 * video player. Unknown keys are dropped rather than merged through.
 */
function hydrate(raw: unknown): SpeakerData {
  const base = emptyData();
  if (!raw || typeof raw !== "object") return base;
  const doc = raw as Partial<SpeakerData>;
  return {
    version: 1,
    settings: { ...base.settings, ...(doc.settings ?? {}) },
    availability: { ...(doc.availability ?? {}) },
    bookings: Array.isArray(doc.bookings) ? doc.bookings.map(hydrateBooking) : [],
    volunteers: Array.isArray(doc.volunteers) ? doc.volunteers : [],
    surveys: Array.isArray(doc.surveys) ? doc.surveys : [],
  };
}

/** One Upstash/Vercel-KV REST command, in the `["SET", key, value]` form. */
async function kvCommand(command: (string | number)[]) {
  const config = kvConfig();
  if (!config) throw new Error("KV is not configured");
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`KV ${command[0]} failed: ${response.status}`);
  }
  const body = (await response.json()) as { result?: unknown; error?: string };
  if (body.error) throw new Error(`KV ${command[0]} failed: ${body.error}`);
  return body.result ?? null;
}

async function loadRaw(): Promise<SpeakerData> {
  if (kvConfig()) {
    const result = await kvCommand(["GET", KEY]);
    if (typeof result !== "string") return emptyData();
    try {
      return hydrate(JSON.parse(result));
    } catch {
      return emptyData();
    }
  }

  try {
    return hydrate(JSON.parse(await readFile(dataFile(), "utf8")));
  } catch {
    // Missing or corrupt is the same answer: start from empty. The file is
    // never deleted here — a corrupt one stays put so it can be inspected.
    return emptyData();
  }
}

async function saveRaw(data: SpeakerData) {
  const json = JSON.stringify(data, null, 2);
  if (kvConfig()) {
    await kvCommand(["SET", KEY, json]);
    return;
  }
  const path = dataFile();
  await mkdir(dirname(path), { recursive: true });
  // Write-then-rename: a crash mid-write otherwise truncates the roster, and
  // the roster is the one thing here that cannot be reconstructed.
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, json, "utf8");
  await rename(temporary, path);
}

export async function readData(): Promise<SpeakerData> {
  return loadRaw();
}

/**
 * Serialises mutations *within this process*.
 *
 * Two people tapping the same slot in the same second is the exact case this
 * app has to get right, and read-modify-write without a queue loses one of
 * them. Node is single-threaded but `await` is not: the second request happily
 * reads the document the first one hasn't written back yet.
 */
let queue: Promise<unknown> = Promise.resolve();

/** Cross-instance lock, for the KV backend. No-op on the file backend, which
 *  is single-process by definition. */
async function withKvLock<T>(run: () => Promise<T>): Promise<T> {
  if (!kvConfig()) return run();

  const token = randomUUID();
  for (let attempt = 0; attempt < 25; attempt += 1) {
    // EX 10 so a crashed holder cannot wedge bookings for the rest of the
    // weekend; every critical section here is a handful of milliseconds.
    const acquired = await kvCommand(["SET", LOCK_KEY, token, "NX", "EX", 10]);
    if (acquired === "OK") {
      try {
        return await run();
      } finally {
        // Not a compare-and-delete: only a section that already blew past the
        // 10s expiry could delete someone else's lock, and that section has
        // bigger problems than lock hygiene.
        await kvCommand(["DEL", LOCK_KEY]).catch(() => {});
      }
    }
    await new Promise((done) => setTimeout(done, 80));
  }
  throw new Error("Could not acquire the store lock — try again in a moment.");
}

/**
 * Read, change, write, atomically enough for a conference.
 *
 * `change` gets a mutable document and returns whatever the caller needs back
 * — usually the row it just created, so the handler can echo a confirmation
 * code without a second read.
 */
export async function mutate<T>(
  change: (data: SpeakerData) => T | Promise<T>,
): Promise<T> {
  const run = async () =>
    withKvLock(async () => {
      const data = await loadRaw();
      const result = await change(data);
      await saveRaw(data);
      return result;
    });

  // Chain onto the queue whether or not the previous link rejected, so one
  // failed booking doesn't jam every later one behind it.
  const next = queue.then(run, run);
  queue = next.catch(() => {});
  return next;
}

/**
 * Six characters someone can read off a phone screen to a stranger, from an
 * alphabet with no O/0 or I/1 in it for exactly that reason.
 */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newCode() {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function newId() {
  return randomUUID();
}
