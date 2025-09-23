import type { NextApiRequest, NextApiResponse } from 'next';
import { setCors } from '@/lib/cors';
import { pollStatus } from '@/lib/eden';
export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if (setCors(req,res)) return;
  const jobId = (req.query.jobId as string) || '';
  if (!jobId) return res.status(400).json({ error: 'Missing jobId' });
  try{
    const s = await pollStatus(jobId);
    return res.status(200).json(s);
  }catch(e:any){
    return res.status(500).json({ error: e?.message || 'Status check failed' });
  }
}
