// pages/api/render.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { setCors } from "../../lib/cors";
import { startReplicateJob } from "../../lib/replicate";

type RenderBody = {
  prompt?: string;
  tone?: string;
  format?: string; // "Reel (9:16)" | "Story (9:16)" | "Square (1:1)" | "Wide (16:9)" | etc.
};

function inferAspect(format?: string): "9:16" | "1:1" | "16:9" {
  const f = (format || "").toLowerCase();
  if (f.includes("square") || f.includes("(1:1)")) return "1:1";
  if (f.includes("wide") || f.includes("16:9")) return "16:9";
  // default to vertical
  return "9:16";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CORS + preflight
  if (setCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = (req.body || {}) as RenderBody;
    const prompt = (body.prompt || "").trim();
    const format = body.format || "";
    const aspect = inferAspect(format);

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    // Kick off a Replicate job
    const out = await startReplicateJob({ prompt, aspect });

    // Respond with the job id (the UI will poll /api/status)
    return res.status(200).json({ jobId: out.jobId });
  } catch (e: any) {
    return res
      .status(500)
      .json({ error: e?.message || "Render start failed" });
  }
}
