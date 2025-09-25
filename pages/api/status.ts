// pages/api/status.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { setCors } from "../../lib/cors";
import { getReplicateStatus } from "../../lib/replicate";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const id = (req.query.id as string) || "";
  if (!id) return res.status(400).json({ status: "failed", error: "missing id" });

  const status = await getReplicateStatus(id);
  res.status(200).json(status);
}
