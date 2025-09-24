// pages/api/status.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { setCors } from "@/lib/cors";

const USE_EDEN_SIMULATOR = (process.env.USE_EDEN_SIMULATOR ?? "true").toLowerCase() !== "false";
const EDEN_API_KEY = process.env.EDEN_API_KEY || "";
const EDEN_BASE = "https://api.edenai.run/v2";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setCors(req, res)) return;

  const jobId = (req.query.jobId as string) || "";
  if (!jobId) return res.status(400).json({ status: "failed", error: "Missing jobId" });

  // Simulator: pretend the job finished successfully
  if (USE_EDEN_SIMULATOR || !EDEN_API_KEY) {
    return res.status(200).json({
      status: "succeeded",
      url: "https://filesamples.com/samples/video/mp4/sample_640x360.mp4",
    });
  }

  try {
    // Eden “retrieve”/status for video generation:
    // Docs: https://docs.edenai.co/reference/video_generation_async_retrieve
    // Many unified endpoints accept GET with task_id
    const r = await fetch(`${EDEN_BASE}/video/generation?response_as_dict=true&attributes_as_list=true&show_original_response=false&task_id=${encodeURIComponent(jobId)}`, {
      headers: {
        Authorization: `Bearer ${EDEN_API_KEY}`,
      },
    });

    if (!r.ok) {
      const txt = await r.text();
      return res.status(r.status).json({ status: "failed", error: `Eden status error: ${txt}` });
    }

    const data: any = await r.json();

    // Normalize provider output
    const provider = data?.pika || data?.pikalabs || data; // try the common buckets
    const state = provider?.status || data?.status || "processing";

    if (state === "processing" || state === "pending") {
      return res.status(200).json({ status: "processing" });
    }

    if (state === "failed" || provider?.error) {
      return res.status(200).json({ status: "failed", error: provider?.error || "Eden reported failure" });
    }

    const url =
      provider?.items?.[0]?.video_resource_url ||
      provider?.video_resource_url ||
      data?.video_resource_url ||
      null;

    if (!url) return res.status(200).json({ status: "processing" });

    return res.status(200).json({ status: "succeeded", url });
  } catch (e: any) {
    return res.status(500).json({ status: "failed", error: e?.message || "Status check failed" });
  }
}
