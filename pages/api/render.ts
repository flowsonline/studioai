// pages/api/render.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { prompt } = req.body;
    if (!process.env.REPLICATE_API_KEY) {
      throw new Error("Missing REPLICATE_API_KEY");
    }

    // Replicate endpoint for Pika Labs model (video generation)
    // Ref: https://replicate.com/pika-labs/pika
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "9f7b5dc1d9b3b4e0c4f4e0b7d6a1f7364b12f99cdd6ac0a2", // example Pika version
        input: { prompt }
      }),
    });

    if (!response.ok) {
      const txt = await response.text();
      throw new Error(`Replicate error: ${txt}`);
    }

    const data = await response.json();
    return res.status(200).json({ id: data.id });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Render failed" });
  }
}
