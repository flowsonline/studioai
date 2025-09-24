// pages/api/generate-copy.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { setCors } from '../../lib/cors';        // relative import
import { generateCopy } from '../../lib/openai'; // relative import

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS + preflight
  if (setCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt = '' } = req.body || {};
    if (!prompt.trim()) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const out = await generateCopy(prompt);
    return res.status(200).json(out);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Copy generation failed' });
  }
}
