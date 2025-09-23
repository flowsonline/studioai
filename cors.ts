import type { NextApiRequest, NextApiResponse } from 'next';
export function setCors(req: NextApiRequest, res: NextApiResponse){
  const origins = process.env.ALLOWED_ORIGINS?.split(',').map(s=>s.trim()).filter(Boolean) || [];
  const origin = req.headers.origin as string | undefined;
  if (origin && (origins.length===0 || origins.includes(origin))) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary','Origin'); res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
  if (req.method==='OPTIONS'){ res.status(200).end(); return true; }
  return false
}
