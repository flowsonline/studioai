// pages/api/status.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { id } = req.query;
    if (!id) throw new Error("Missing job id");

    const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const txt = await response.text();
      throw new Error(`Replicate status error: ${txt}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Status failed" });
  }
}
