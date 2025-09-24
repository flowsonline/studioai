// lib/eden.ts
// Real Eden AI call with a safe simulator switch

const USE_EDEN_SIMULATOR =
  (process.env.USE_EDEN_SIMULATOR ?? "true").toLowerCase() !== "false";

const EDEN_API_KEY = process.env.EDEN_API_KEY || "";
const EDEN_BASE = "https://api.edenai.run/v2"; // <-- MUST be absolute!

type StartOut = { jobId?: string; previewUrl?: string; url?: string };

export async function startVideo(opts: {
  prompt: string;
  tone?: string;
  format?: string;
}) {
  // Sim mode stays handy for local or when you flip the flag back
  if (USE_EDEN_SIMULATOR || !EDEN_API_KEY) {
    return {
      previewUrl:
        "https://filesamples.com/samples/video/mp4/sample_640x360.mp4",
    } as StartOut;
  }

  const { prompt } = opts;

  // Example Eden text-to-video (Pika) via unified endpoint
  // Docs: https://api.edenai.run/docs#tag/Video
  const url = `${EDEN_BASE}/video/text_to_video`;
  console.log("EDEN CALL →", url); // helpful to debug wrong host/paths

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${EDEN_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      providers: "pika",          // provider to use
      text: prompt,               // your prompt
      resolution: "720p",         // optional
      safe_mode: false,           // optional
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Eden start error: ${txt}`);
  }

  const data = await res.json() as any;

  // Eden returns provider buckets. Pull a usable URL if available.
  // Adjust this mapping if your account/provider returns a different shape.
  const previewUrl =
    data?.pika?.items?.[0]?.video_resource_url ||
    data?.pika?.video_resource_url ||
    data?.video_resource_url ||
    null;

  // If Eden returns a job-based workflow on your plan, you can return a jobId
  // and let /api/status poll it. For now we return a URL when available.
  return { url: previewUrl } as StartOut;
}
