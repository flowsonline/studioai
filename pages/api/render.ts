// pages/api/render.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { setCors } from "@/lib/cors";

// We’ll hit Eden directly from here.
// You must have EDEN_API_KEY set on Vercel.
// Set USE_EDEN_SIMULATOR=false to call Eden, true to return a mock.
const USE_EDEN_SIMULATOR = (process.env.USE_EDEN_SIMULATOR ?? "true").toLowerCase() !== "false";
const EDEN_API_KEY = process.env.EDEN_API_KEY || "";
const EDEN_BASE = "https://api.edenai.run/v2";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { prompt = "", tone, format } = req.body || {};
    if (!prompt.trim()) return res.status(400).json({ error: "Missing prompt" });

    // SIMULATOR: return a playable sample immediately
    if (USE_EDEN_SIMULATOR || !EDEN_API_KEY) {
      return res.status(200).json({
        // no job needed
        url: "https://filesamples.com/samples/video/mp4/sample_640x360.mp4",
      });
    }

    // REAL EDEN: async job creation (video generation)
    // Docs: https://docs.edenai.co/reference/video_generation_async_create
    const create = await fetch(`${EDEN_BASE}/video/generation`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${EDEN_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        providers: "pika",           // or "pikalabs" if your account has it
        text: prompt,                 // core prompt text
        resolution: "720p",
        safe_mode: false,
        // Some accounts require async explicitly; Eden’s unified endpoint returns a task.
        // If your account requires different fields, change here per Eden’s reply.
        // For safety we’ll request dict response:
        response_as_dict: true,
        attributes_as_list: true,
        show_original_response: false,
      }),
    });

    if (!create.ok) {
      const txt = await create.text();
      return res.status(create.status).json({ error: `Eden create error: ${txt}` });
    }

    const data: any = await create.json();

    // Try to extract a task/job id in a provider-agnostic way.
    // Common places Eden returns it:
    const jobId =
      data?.pika?.items?.[0]?.task_id ||
      data?.pika?.task_id ||
      data?.task_id ||
      data?.job_id ||
      data?.pika?.job_id ||
      null;

    // Some providers may return a direct URL (rare for generation):
    const directUrl =
      data?.pika?.items?.[0]?.video_resource_url ||
      data?.pika?.video_resource_url ||
      data?.video_resource_url ||
      null;

    if (directUrl) {
      // No polling needed
      return res.status(200).json({ url: directUrl });
    }

    if (!jobId) {
      return res.status(500).json({ error: "No job id returned by Eden" });
    }

    return res.status(200).json({ jobId });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Render failed" });
  }
}
