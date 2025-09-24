// lib/eden.ts
// Eden AI: job-based video generation

const USE_EDEN_SIMULATOR =
  (process.env.USE_EDEN_SIMULATOR ?? "true").toLowerCase() !== "false";

const EDEN_API_KEY = process.env.EDEN_API_KEY || "";
const EDEN_BASE = "https://api.edenai.run/v2";

type StartOut = { jobId?: string; previewUrl?: string };

export async function startVideo(opts: {
  prompt: string;
  tone?: string;
  format?: string;
}): Promise<StartOut> {
  if (USE_EDEN_SIMULATOR || !EDEN_API_KEY) {
    return {
      previewUrl:
        "https://filesamples.com/samples/video/mp4/sample_640x360.mp4",
    };
  }

  const url = `${EDEN_BASE}/video/generation`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${EDEN_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      providers: "pika", // or another provider from Eden docs
      text: opts.prompt,
      resolution: "720p",
      fallback_providers: "",
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Eden start error: ${txt}`);
  }

  const data = (await res.json()) as any;
  return { jobId: data.job_id };
}

export async function checkVideo(jobId: string) {
  if (USE_EDEN_SIMULATOR || !EDEN_API_KEY) {
    return { status: "succeeded", url: "https://filesamples.com/samples/video/mp4/sample_640x360.mp4" };
  }

  const url = `${EDEN_BASE}/video/generation/${jobId}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${EDEN_API_KEY}`,
    },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Eden status error: ${txt}`);
  }

  const data = (await res.json()) as any;
  return {
    status: data.status,
    url: data?.result?.[0]?.video_resource_url || null,
  };
}
