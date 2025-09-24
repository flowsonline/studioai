// pages/api/status.ts
import type { NextApiRequest, NextApiResponse } from 'next';

type StatusData =
  | { status: 'processing' | 'succeeded' | 'failed'; url?: string; error?: string }
  | { error: string };

const BASE = 'https://api.replicate.com/v1/predictions';

export default async function handler(req: NextApiRequest, res: NextApiResponse<StatusData>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.REPLICATE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing REPLICATE_API_KEY' });

  const jobId = req.query.jobId as string | undefined;
  if (!jobId) return res.status(400).json({ error: 'Missing jobId' });

  try {
    const resp = await fetch(`${BASE}/${encodeURIComponent(jobId)}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ status: 'failed', error: `Replicate status error: ${text}` });
    }

    const data = await resp.json();

    // Replicate states: starting, processing, succeeded, failed, canceled
    const state = (data?.status || 'processing') as 'processing' | 'succeeded' | 'failed';

    if (state === 'succeeded') {
      const url = tryExtractUrl(data);
      return res.status(200).json({ status: 'succeeded', url: url || undefined });
    }
    if (state === 'failed') {
      const errMsg = data?.error || 'Job failed';
      return res.status(200).json({ status: 'failed', error: errMsg });
    }

    return res.status(200).json({ status: 'processing' });
  } catch (e: any) {
    return res.status(500).json({ status: 'failed', error: e?.message || 'Status check failed' });
  }
}

function tryExtractUrl(prediction: any): string | null {
  if (!prediction) return null;
  const out = prediction.output;
  if (typeof out === 'string' && out.startsWith('http')) return out;
  if (Array.isArray(out)) {
    const last = out[out.length - 1];
    if (typeof last === 'string') return last;
    if (last?.video) return last.video;
  }
  if (out?.video) return out.video;
  return null;
}
