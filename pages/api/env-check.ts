import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  // Never print the key; just show presence booleans.
  res.status(200).json({
    openaiKeyPresent: !!process.env.OPENAI_API_KEY,
    edenKeyPresent: !!process.env.EDEN_API_KEY,
    nodeEnv: process.env.NODE_ENV,
  });
}
