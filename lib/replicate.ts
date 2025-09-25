// lib/replicate.ts
import { randomUUID } from "crypto";

export type RenderStatus =
  | { status: "starting"; url?: string | null; error?: string }
  | { status: "processing"; url?: string | null; error?: string }
  | { status: "succeeded"; url: string; error?: string }
  | { status: "failed"; url?: string | null; error: string };

// extremely simple in-memory job table (fine for the MVP on Vercel)
const jobs = new Map<string, number>();

type StartArgs = {
  prompt?: string;
  primary?: string; // e.g. "Reel (9:16)"
  tone?: string;    // e.g. "Cinematic"
};

/**
 * Start a fake "render" job and return an id.
 * This unblocks the UI end-to-end without any external API.
 */
export async function startReplicateJob(_: StartArgs): Promise<{ id: string }> {
  const id = randomUUID();
  jobs.set(id, Date.now());
  return { id };
}

/**
 * Pretend-progressive status:
 * <1s = starting, <3s = processing, >=3s = succeeded (returns a sample mp4).
 */
export async function getReplicateStatus(id: string): Promise<RenderStatus> {
  const started = jobs.get(id);
  if (!started) return { status: "failed", error: "unknown job id" };

  const ms = Date.now() - started;
  if (ms < 1000) return { status: "starting" };
  if (ms < 3000) return { status: "processing" };

  // Public sample video URL (no fetch performed; just linked)
  return {
    status: "succeeded",
    url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  };
}
