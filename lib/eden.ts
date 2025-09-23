export type StartVideoInput = { prompt: string; tone?: string; format?: string };
export type StartVideoResult = { jobId: string; previewUrl?: string };

export async function startVideo(input: StartVideoInput): Promise<StartVideoResult>{
  const simulate = (process.env.USE_EDEN_SIMULATOR ?? 'true') !== 'false';
  if (simulate){
    return { jobId: `sim_${Date.now()}`, previewUrl: "https://filesamples.com/samples/video/mp4/sample_640x360.mp4" };
  }
  throw new Error('Real Eden integration not implemented yet.');
}

export async function pollStatus(jobId: string): Promise<{ status: 'queued'|'processing'|'succeeded'|'failed'; progress: number; url?: string; }>{ 
  const simulate = (process.env.USE_EDEN_SIMULATOR ?? 'true') !== 'false';
  if (simulate){
    return { status: 'succeeded', progress: 100, url: "https://filesamples.com/samples/video/mp4/sample_640x360.mp4" };
  }
  throw new Error('Real Eden integration not implemented yet.');
}
