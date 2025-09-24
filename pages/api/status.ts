// pages/api/status.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { setCors } from "../../lib/cors";
import { getJobStatus } from "../../lib/eden";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setCors(req, res)) return;

  // GET /api/status?jobId=...
  const jobId = String(req.query.jobId || "");
  if (!jobId) return res.status(400).json({ error: "Missing jobId" });

  try {
    const st = await getJobStatus(jobId);
    return res.status(200).json(st);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Status check failed" });
  }
}
