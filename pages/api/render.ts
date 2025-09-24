// pages/api/render.ts
import type { NextApiRequest, NextApiResponse } from 'next';

type Data =
  | { jobId: string }
  | { url: string }
  | { error: string };

const REPLICATE_API = 'https://api.replicate.com/v1/predictions';

// Optional: set a default model in Vercel if you want to change it later.
// Example public text-to-video models come and go; you can override with REPLICATE_MODEL in Vercel
const DEFAULT_MODEL = process.env.REPLICATE_MODEL || 'tencentarc/zeroscope-v2-xl'; // replace with the model you want

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt = '', tone, format, model } = (req.body || {}) as {
    prompt?: string;
    tone?: string;
    format?: string;
    model?: string;
  };

  const apiKey = process.env.REPLICATE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing REPLICATE_API_KEY' });
  }

  // Map UI format → width/height (you can tweak)
  const size = (() => {
    switch (format) {
      case 'Square (1:1)':        return { width: 768, height: 768 };
      case 'Wide (16:9)':         return { width: 1280, height: 720 };
      case 'Reel (9:16)':
      default:                    return { width: 720, height: 1280 };
    }
  })();

  // Compose the final prompt with tone (totally optional)
  const finalPrompt = tone ? `${tone} tone. ${prompt}` : prompt;

  try {
    const resp = await fetch(REPLICATE_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // IMPORTANT: swap to the model you want to use on Replicate if needed.
        model: model || DEFAULT_MODEL,

        // Each model has different inputs. These are generic/common ones;
        // adjust in Vercel later if your chosen model expects different input.
        input: {
          prompt: finalPrompt,
          // "num_frames", "fps", "duration" etc vary by model.
          // We pass width/height for aspect matching when supported:
          width: size.width,
          height: size.height,
        }
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ error: `Replicate start error: ${text}` });
    }

    const data = await resp.json();

    // Replicate returns an ID we can poll with GET /v1/predictions/:id
    const jobId = data?.id as string | undefined;

    if (!jobId) {
      // Some models return a direct url in output — try to return it if present
      const direct = tryExtractUrl(data);
      if (direct) {
        return res.status(200).json({ url: direct });
      }
      return res.status(500).json({ error: 'No job id returned by Replicate' });
    }

    return res.status(200).json({ jobId });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to start render' });
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
