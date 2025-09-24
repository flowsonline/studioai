// lib/eden.ts
type StartArgs = {
  prompt: string;
  tone?: string;
  format?: string;
};

const SAMPLE_URL =
  "https://filesamples.com/samples/video/mp4/sample_640x360.mp4";

const useSim = (process.env.USE_EDEN_SIMULATOR ?? "true").toLowerCase() === "true";

/**
 * startVideo
 * - If simulator = true → returns { jobId: 'sim', previewUrl }
 * - If simulator = false → POST to Eden. Returns { jobId }
 */
export async function startVideo(args: StartArgs): Promise<{ jobId?: string; previewUrl?: string }> {
  if (useSim) {
    // Simulated (instant)
    return { jobId: "sim", previewUrl: SAMPLE_URL };
  }

  const apiKey = process.env.EDEN_API_KEY;
  if (!apiKey) throw new Error("EDEN_API_KEY missing");

  // ❗ Adjust this endpoint & payload to match your Eden plan/provider.
  // This is a safe default "text->video" shape—update as needed.
  const EDEN_ENDPOINT =
    process.env.EDEN_ENDPOINT ??
    "https://api.edenai.run/v2/video/text_to_video"; // <- EDIT if your endpoint differs

  const body = {
    text: args.prompt,
    // Add extra fields Eden requires here (provider, model, duration, size, etc.)
  };

  const r = await fetch(EDEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Eden start error: ${text}`);
  }
  const data = await r.json();

  // Normalize possible IDs
  const jobId = data.job_id || data.id || data.task_id;
  if (!jobId) throw new Error("Eden response missing job id");

  return { jobId };
}

/**
 * getJobStatus
 * - simulator → always "succeeded" with sample URL
 * - real → fetch Eden job status and normalize to { status, progress, url }
 */
export async function getJobStatus(jobId: string): Promise<{
  status: "queued" | "processing" | "succeeded" | "failed";
  progress: number;
  url?: string;
  raw?: any;
}> {
  if (useSim || jobId === "sim") {
    return { status: "succeeded", progress: 100, url: SAMPLE_URL };
  }

  const apiKey = process.env.EDEN_API_KEY;
  if (!apiKey) throw new Error("EDEN_API_KEY missing");

  // ❗ Adjust to your Eden status endpoint.
  const STATUS_ENDPOINT =
    process.env.EDEN_STATUS_ENDPOINT ??
    "https://api.edenai.run/v2/video/status"; // <- EDIT if your endpoint differs

  const r = await fetch(`${STATUS_ENDPOINT}?job_id=${encodeURIComponent(jobId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Eden status error: ${text}`);
  }
  const data = await r.json();

  // Normalize common shapes
  // Map whatever Eden returns into these fields.
  const state =
    (data.status as string)?.toLowerCase() ||
    (data.state as string)?.toLowerCase() ||
    "processing";

  const status =
    state.includes("success") || state === "succeeded"
      ? "succeeded"
      : state.includes("fail")
      ? "failed"
      : state.includes("queue")
      ? "queued"
      : "processing";

  const progress =
    typeof data.progress === "number"
      ? Math.max(0, Math.min(100, data.progress))
      : status === "succeeded"
      ? 100
      : 50;

  // Try multiple fields for a final URL
  const url =
    data.output_url ||
    data.url ||
    data.result_url ||
    data.output?.url ||
    undefined;

  return { status, progress, url, raw: data };
}
