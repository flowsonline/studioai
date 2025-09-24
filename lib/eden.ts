// lib/eden.ts
// Real Eden AI call with a safe simulator switch

const USE_EDEN_SIMULATOR =
  (process.env.USE_EDEN_SIMULATOR ?? "false").toLowerCase() === "true";

const EDEN_API_KEY = process.env.EDEN_API_KEY || "";
const EDEN_BASE = "https://api.edenai.run/v2"; // MUST be absolute

type StartOut = { jobId?: string; previewUrl?: string };

export async function startVideo(opts: {
  prompt: string;
  tone?: string;
  format?: string;
}) {
  // Keep sim handy for quick demos or local runs
  if (USE_EDEN_SIMULATOR || !EDEN_API_KEY) {
    return {
      previewUrl:
        "https://filesamples.com/samples/video/mp4/sample_640x360.mp4",
    } as StartOut;
  }

  const { prompt } = opts;

  // Eden Video: text_to_video (provider: pika)
  const url = `${EDEN_BASE}/video/text_to_video`;
  console.log("EDEN CALL →", url); // viewable in Vercel logs

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${EDEN_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      providers: "pika",     // some accounts use "pika", others "pika-labs"
      text: prompt,
      resolution: "720p",
      safe_mode: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Eden start error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as any;

  // Provider-normalized result mapping.
  const previewUrl =
    data?.pika?.items?.[0]?.video_resource_url ||
    data?.pika?.video_resource_url ||
    data?.video_resource_url ||
    null;

  return { previewUrl } as StartOut;
}
