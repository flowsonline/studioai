import type { NextApiRequest, NextApiResponse } from 'next';
import { setCors } from '@/lib/cors';
import { startVideo } from '@/lib/eden';
export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if (setCors(req,res)) return;
  if (req.method!=='POST') return res.status(405).json({ error:'Method Not Allowed' });
  try{
    const { prompt='', tone, format } = req.body || {};
    const out = await startVideo({ prompt, tone, format });
    return res.status(200).json(out);
  }catch(e:any){
    return res.status(500).json({ error: e?.message || 'Render failed' });
  }
}
