// lib/eden.ts
// Robust Eden call with fallback endpoints + optional override

const USE_EDEN_SIMULATOR =
  (process.env.USE_EDEN_SIMULATOR ?? "false").toLowerCase() === "true";

const EDEN_API_KEY = process.env.EDEN_API_KEY || "";
const EDEN_BASE = "https://api.edenai.run/v2"; // absolute base

// Optional manual override in case your Eden workspace uses a custom route
const EDEN_VIDEO_ENDPOINT = process.env.EDEN_VIDEO_ENDPOINT || "";

// Known text-to-video endpoints we've seen in the wild
const CANDIDATE_PATHS = [
  "/video/text_to_video",
  "/video/generation",
];

type StartOut = { previewUrl?: string };

async function callEden(path: string, prompt: string) {
  const url = `${EDEN_BASE}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${EDEN_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // unified Eden payload
      providers: "pika", // If your workspace uses different provider id, set EDEN_PROVIDER
      text: prompt,
      resolution: "720p",
      safe_mode: false,
    }),
  });
  return res;
}

function pickPreviewUrl(data: any): string | null {
  // Cover common Eden response shapes for video
  return (
    data?.pika?.items?.[0]?.video_resource_url ||
    data?.pika?.video_resource_url ||
    data?.video_resource_url ||
    data?.output?.[0]?.video_resource_url ||
    data?.result?.url ||
    null
  );
}

export async function startVideo(opts: { prompt: string; tone?: string; format?: string }) {
  if (USE_EDEN_SIMULATOR || !EDEN_API_KEY) {
    return {
      previewUrl:
        "https://filesamples.com/samples/video/mp4/sample_640x360.mp4",
    } as StartOut;
  }

  const { prompt } = opts;

  // If user provided a custom endpoint, try that first
  const paths = EDEN_VIDEO_ENDPOINT
    ? [EDEN_VIDEO_ENDPOINT, ...CANDIDATE_PATHS]
    : CANDIDATE_PATHS;

  let lastErrText = "";
  for (const path of paths) {
    try {
      const res = await callEden(path, prompt);

      // Eden sometimes returns HTML on 404 — detect and throw clean error
      const contentType = res.headers.get("content-type") || "";
      if (!res.ok) {
        const text = await res.text();
        lastErrText = `(${res.status}) ${text.slice(0, 500)}`;
        // Try next path
        continue;
      }

      // Prefer JSON; if HTML sneaks in here it's the wrong route
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        lastErrText = `Unexpected content-type "${contentType}" @ ${path}: ${text.slice(0, 500)}`;
        continue;
      }

      const data = await res.json();
      const previewUrl = pickPreviewUrl(data);
      if (!previewUrl) {
        lastErrText = `No preview URL in response for ${path}: ${JSON.stringify(data).slice(0, 500)}`;
        continue;
      }

      return { previewUrl } as StartOut;
    } catch (e: any) {
      lastErrText = e?.message || String(e);
      continue;
    }
  }

  throw new Error(
    `Eden start error: could not resolve a valid endpoint. ${lastErrText}`
  );
}
