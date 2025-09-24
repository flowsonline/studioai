// pages/api/eden-probe.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { setCors } from "../../lib/cors";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setCors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  const EDEN_API_KEY = process.env.EDEN_API_KEY || "";
  const provider = (process.env.EDEN_PROVIDER || "pika").toLowerCase();
  const base = process.env.EDEN_BASE || "https://api.edenai.run/v2";
  const url = `${base}/video/text_to_video`;

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${EDEN_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        providers: provider,
        text: "1-second test clip",
        resolution: "720p",
        safe_mode: false,
      }),
    });

    const rawText = await r.text();
    // Only return a small snippet (avoid dumping huge HTML)
    const snippet = rawText.slice(0, 500);

    return res.status(200).json({
      tried: { url, method: "POST", provider },
      response: { status: r.status, ok: r.ok, snippet },
      env: {
        hasKey: Boolean(EDEN_API_KEY),
        EDEN_PROVIDER: provider,
        EDEN_BASE: base,
        USE_EDEN_SIMULATOR: (process.env.USE_EDEN_SIMULATOR ?? "").toString(),
        NODE_ENV: process.env.NODE_ENV,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "probe failed" });
  }
}
