// pages/api/status.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { setCors } from "../../lib/cors";
import { checkVideo } from "../../lib/eden";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setCors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { jobId } = req.query;
    if (!jobId || typeof jobId !== "string") {
      return res.status(400).json({ error: "Missing jobId" });
    }

    const out = await checkVideo(jobId);
    return res.status(200).json(out);
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Status check failed" });
  }
}
