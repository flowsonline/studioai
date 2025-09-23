// pages/api/render.ts
import type { NextApiRequest, NextApiResponse } from 'next';

// Simple simulator so the UI can work end-to-end.
// Later we can switch this to Eden once keys are set.
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow easy testing in the browser:
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      jobId: 'sim-001',
      previewUrl:
        'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // In “real” mode you’d read { prompt, tone, format } from req.body
  // and call Eden. For now, we just return a mock URL.
  return res.status(200).json({
    jobId: 'sim-001',
    previewUrl:
      'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
  });
}
