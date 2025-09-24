// lib/eden.ts
// Eden async video generation (job + polling) with a simulator switch

type StartOut = { jobId?: string; previewUrl?: string | null };
type StatusOut = { status: string; progress?: number; url?: string | null };

const USE_EDEN_SIMULATOR =
  (process.env.USE_EDEN_SIMULATOR ?? "true").toLowerCase() !== "false";

const EDEN_API_KEY = process.env.EDEN_API_KEY || "";

// If Eden tells you your org uses the .co/v1 host, set EDEN_BASE accordingly
const EDEN_BASE =
  process.env.EDEN_BASE?.trim() || "https://api.edenai.run/v2";

function pickUrl(data: any): string | undefined {
  // Eden responses vary by provider; check common locations
  return (
    data?.video_resource_url ||
    data?.result_url ||
    data?.output_url ||
    data?.items?.[0]?.video_resource_url ||
    data?.providers?.pika?.video_resource_url ||
    data?.providers?.pikalabs?.video_resource_url ||
    data?.url ||
    undefined
  );
}

export async function startVideo(opts: {
  prompt: string;
  provider?: "pika" | "pikalabs";
}): Promise<StartOut> {
  const { prompt, provider = "pika" } = opts;

  if (USE_EDEN_SIMULATOR || !EDEN_API_KEY) {
    return { previewUrl: "https://filesamples.com/samples/video/mp4/sample_640x360.mp4" };
  }

  const res = await fetch(`${EDEN_BASE}/video/generation`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${EDEN_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      providers: provider,   // "pika" or "pikalabs"
      text: prompt,          // your prompt
      // add optional fields Eden supports here (resolution, duration, etc.)
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Eden start error: ${text}`);
  }

  const data = JSON.parse(text);
  const jobId = data?.job_id || data?.jobId;
  if (!jobId) {
    // in case some plan/provider returns a direct URL (rare), surface it
    const direct = pickUrl(data) || null;
    return { jobId: undefined, previewUrl: direct };
  }

  return { jobId };
}

export async function getStatus(jobId: string): Promise<StatusOut> {
  if (USE_EDEN_SIMULATOR || !EDEN_API_KEY) {
    return { status: "succeeded", url: "https://filesamples.com/samples/video/mp4/sample_640x360.mp4" };
  }

  const res = await fetch(`${EDEN_BASE}/video/generation/${jobId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${EDEN_API_KEY}`,
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Eden status error: ${text}`);
  }

  const data = JSON.parse(text);
  // Eden often returns { status: "pending|processing|succeeded|failed", providers: {...} }
  const status: string =
    data?.status || data?.job?.status || "processing";

  const url = pickUrl(data) || null;

  // Some providers also return progress/step info; surface if present
  const progress =
    data?.progress ??
    data?.job?.progress ??
    data?.providers?.pika?.progress ??
    undefined;

  return { status, progress, url };
}
