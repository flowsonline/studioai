// lib/replicate.ts
// Minimal wrapper around Replicate's REST API with a safe simulator switch.

const REPLICATE_TOKEN =
  process.env.REPLICATE_API_KEY ||
  process.env.REPLICATE_API_TOKEN ||
  "";

const USE_REPLICATE_SIMULATOR =
  (process.env.USE_REPLICATE_SIMULATOR ?? "true").toLowerCase() !== "false";

/**
 * You can override this in Vercel:
 *  - REPLICATE_MODEL_VERSION: a specific model version ID
 *
 * Example (text→video models on Replicate change often). Keep this configurable.
 */
const DEFAULT_MODEL_VERSION =
  process.env.REPLICATE_MODEL_VERSION ||
  // A placeholder model version; replace with the version you choose later.
  "zeroscope-v2-xl"; // (not used directly unless you add a resolver)

type StartOpts = {
  prompt: string;
  aspect?: "9:16" | "1:1" | "16:9";
};

export type JobStartOut = { jobId: string };
export type JobStatusOut = {
  status: "starting" | "processing" | "succeeded" | "failed";
  url?: string | null;
  error?: string;
};

const SAMPLE_VIDEO =
  "https://filesamples.com/samples/video/mp4/sample_640x360.mp4";

/**
 * ---- SIMULATOR HELPERS ----
 */
function simId() {
  return `sim-${Date.now()}`;
}
async function simStatus(_id: string): Promise<JobStatusOut> {
  // Pretend it finished so the flow is fast during wiring.
  return { status: "succeeded", url: SAMPLE_VIDEO };
}

/**
 * ---- REAL API HELPERS ----
 * Replicate REST docs: https://replicate.com/docs/reference/http
 */
async function createPrediction(body: any) {
  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REPLICATE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Replicate create error: ${txt}`);
  }
  return res.json();
}

async function fetchPrediction(id: string) {
  const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: { Authorization: `Bearer ${REPLICATE_TOKEN}` },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Replicate get error: ${txt}`);
  }
  return res.json();
}

/**
 * Start a job on Replicate.
 * NOTE: Different models take different inputs. We keep this generic and configurable.
 * When you pick your final model, we’ll adjust the payload in one place here.
 */
export async function startReplicateJob(opts: StartOpts): Promise<JobStartOut> {
  const { prompt, aspect = "9:16" } = opts;

  if (USE_REPLICATE_SIMULATOR || !REPLICATE_TOKEN) {
    return { jobId: simId() };
  }

  // Example payload structure. You will likely tweak this once you decide on a model.
  // Many text→video models expect fields like: "prompt", "num_frames", "fps", "aspect_ratio".
  const input = {
    prompt,
    num_frames: 24,
    fps: 12,
    aspect_ratio: aspect, // if unsupported by your model, remove/adjust here.
  };

  // If you later set REPLICATE_MODEL_VERSION to an official version id, use that here.
  // Some clients also accept "model" + "version". Replicate’s HTTP API requires "version" id.
  const body = {
    // version: "<MODEL_VERSION_ID>", // set this via env later for the model you choose
    // For wiring purposes, use a hosted model owner/name alias (if you install a serverless proxy)
    // Otherwise, you'll paste a concrete "version" once you pick the model.
    // We'll create a lightweight placeholder so this won't break deployment now.
    // Remove the next line and add 'version' when you finalize:
    model: DEFAULT_MODEL_VERSION,
    input,
  };

  const json = await createPrediction(body);
  // The returned object includes id + status
  return { jobId: json.id as string };
}

/**
 * Poll job status.
 * Normalize Replicate response → { status, url? }.
 */
export async function getReplicateStatus(jobId: string): Promise<JobStatusOut> {
  if (USE_REPLICATE_SIMULATOR || !REPLICATE_TOKEN) {
    return simStatus(jobId);
  }

  const json = await fetchPrediction(jobId);

  // Replicate statuses: starting | processing | succeeded | failed | canceled
  const status = (json.status || "processing") as JobStatusOut["status"];

  // Output may be a string URL or an array of URLs depending on model.
  let url: string | null | undefined = null;
  const out = json.output;

  if (typeof out === "string") {
    url = out;
  } else if (Array.isArray(out) && out.length) {
    // pick last item that looks like a video
    url =
      out.find((x: string) => /\.mp4|\.webm|\.mov/i.test(String(x))) ??
      out[out.length - 1];
  } else if (out && typeof out === "object" && out.video) {
    url = out.video;
  }

  return { status, url: url ?? null, error: json.error || undefined };
}
