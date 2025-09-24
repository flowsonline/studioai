// pages/api/status.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { setCors } from "../../lib/cors";
import { getReplicateStatus } from "../../lib/replicate";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS + preflight
  if (setCors(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const jobId = String(req.query.jobId || "").trim();
  if (!jobId) {
    return res.status(400).json({ error: "Missing jobId" });
  }

  try {
    const status = await getReplicateStatus(jobId);
    return res.status(200).json(status);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Status check failed" });
  }
}
