// pages/index.tsx
import React, { useEffect, useState } from 'react';

const tones = ['Cinematic', 'Bold', 'Energetic', 'Friendly', 'Elegant', 'Professional'] as const;
const formats = ['Reel (9:16)', 'Square (1:1)', 'Wide (16:9)'] as const;

export default function Home() {
  const [desc, setDesc] = useState('');
  const [tone, setTone] = useState<(typeof tones)[number]>('Cinematic');
  const [format, setFormat] = useState<(typeof formats)[number]>('Reel (9:16)');

  // Video job state
  const [jobId, setJobId] = useState<string | null>(null);
  const [renderStatus, setRenderStatus] = useState<{ status?: string; url?: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Optional: AI copy block
  const [copyLoading, setCopyLoading] = useState(false);
  const [script, setScript] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);

  // Poll the status if we have a jobId
  useEffect(() => {
    if (!jobId) return;

    const iv = setInterval(async () => {
      try {
        const r = await fetch(`/api/status?jobId=${encodeURIComponent(jobId)}`);
        const j = await r.json();
        setRenderStatus(j);

        if (j.status === 'succeeded' || j.status === 'failed') {
          clearInterval(iv);
          setLoading(false);
          if (j.status === 'failed' && j.error) setError(j.error);
        }
      } catch (e: any) {
        clearInterval(iv);
        setLoading(false);
        setError(e?.message || 'Polling error');
      }
    }, 1800);

    return () => clearInterval(iv);
  }, [jobId]);

  async function handleGenerateVideo() {
    setError(null);
    setRenderStatus({});
    setJobId(null);
    setLoading(true);

    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: desc, tone, format }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Render failed (${res.status})`);
      }

      const data = await res.json();

      // If a job is returned → poll; if a url is returned → show immediately
      if (data.jobId) {
        setJobId(data.jobId);
      } else if (data.url) {
        setRenderStatus({ status: 'succeeded', url: data.url });
        setLoading(false);
      } else {
        setError('No job id or URL returned');
        setLoading(false);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to start render');
      setLoading(false);
    }
  }

  async function handleGenerateCopy() {
    setCopyLoading(true);
    setScript('');
    setCaption('');
    setHashtags([]);
    setError(null);

    try {
      // Simple on-client prompt with OpenAI via your own `/api/generate-copy` if you add it later.
      // For now just mock locally:
      const s = `A warm glow fills the coffee shop as the sun rises. Customers sip, smile, and start their day. ${tone} tone.`;
      const c = `Brewed to perfection — right by the waves! ☕🌊`;
      const h = ['#coffee', '#coffeeshop', '#beach', '#morningritual', '#cinematic'];

      setScript(s);
      setCaption(c);
      setHashtags(h);
    } catch (e: any) {
      setError(e?.message || 'Copy generation failed');
    } finally {
      setCopyLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.title}>
        Hi, I’m <span style={{ color: '#7aa2ff' }}>Orion</span> — Your Social Media Manager Assistant.
      </div>
      <div style={styles.sub}>Tell me what you’re posting today and I’ll mock up your ad.</div>

      <form style={styles.form} onSubmit={(e) => e.preventDefault()}>
        <label style={styles.label}>Post description</label>
        <textarea
          style={styles.textarea}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="e.g., 10s ad for a coffee shop by the beach"
        />

        <div style={styles.row}>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Tone</label>
            <select style={styles.select} value={tone} onChange={(e) => setTone(e.target.value as any)}>
              {tones.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label style={styles.label}>Format</label>
            <select style={styles.select} value={format} onChange={(e) => setFormat(e.target.value as any)}>
              {formats.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        <button type="button" onClick={handleGenerateVideo} style={styles.button} disabled={loading || !desc.trim()}>
          {loading ? 'Starting…' : 'Generate (Video)'}
        </button>

        <button type="button" onClick={handleGenerateCopy} style={styles.button} disabled={copyLoading || !desc.trim()}>
          {copyLoading ? 'Thinking…' : 'Generate Copy (AI)'}
        </button>

        {error && <div style={styles.error}>⚠ {error}</div>}

        {/* Render status box */}
        {(renderStatus.status || renderStatus.url) && (
          <div style={styles.statusBox}>
            <div style={styles.resultTitle}>Render Status</div>
            <div style={{ opacity: 0.9, fontSize: 13, marginBottom: 6 }}>
              {renderStatus.status || (renderStatus.url ? 'succeeded' : 'processing')}
            </div>
            {renderStatus.url && (
              <div style={styles.resultBox}>
                <div style={styles.resultTitle}>Result</div>
                <video controls src={renderStatus.url} style={{ width: '100%', borderRadius: 8 }} />
                <div style={{ marginTop: 8 }}>
                  <a href={renderStatus.url} style={styles.link} target="_blank" rel="noreferrer">Open video</a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Copy result box */}
        {(script || caption || hashtags.length) && (
          <div style={styles.resultBox}>
            <div style={styles.resultTitle}>AI Script</div>
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>
{`{
  "script": ${JSON.stringify(script)},
  "caption": ${JSON.stringify(caption)},
  "hashtags": ${JSON.stringify(hashtags, null, 0)}
}`}
            </pre>
          </div>
        )}
      </form>

      <footer style={styles.footer}>© Orion Studio — MVP</footer>
    </main>
  );
}

// ——— inline styles ———
const styles: Record<string, React.CSSProperties> = {
  page: { padding: '2rem', fontFamily: 'Inter, system-ui, sans-serif', color: '#E8EEFF', background: 'radial-gradient(60% 60% at 50% 20%, #0B1220 0%, #05080F 60%, #03060C 100%)', minHeight: '100vh' },
  title: { fontSize: '1.8rem', marginBottom: '0.75rem', fontWeight: 700 },
  sub: { opacity: 0.85, marginBottom: '1.25rem' },
  form: { background: '#0F1629', padding: '1rem', borderRadius: 12 },
  label: { display: 'block', marginBottom: 8, fontWeight: 600 },
  textarea: { width: '100%', height: 120, padding: 12, background: '#0B1324', color: '#E8EEFF', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' },
  row: { display: 'flex', gap: '1rem', marginTop: 12 },
  select: { width: '100%', padding: '10px 12px', background: '#0B1324', color: '#E8EEFF', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' },
  button: { width: '100%', height: 46, marginTop: 16, borderRadius: 12, border: '1px solid rgba(122,162,255,0.35)', background: 'linear-gradient(180deg,#87a6ff 0%,#6d8cff 70%,#3f6bff 100%)', color: '#071020', fontWeight: 700, cursor: 'pointer' },
  error: { marginTop: 12, padding: '10px 12px', border: '1px solid rgba(255,120,120,0.35)', background: 'rgba(120,0,0,0.25)', borderRadius: 10, color: '#ffbaba' },
  statusBox: { marginTop: 14, padding: 12, background: 'rgba(32,42,68,0.3)', borderRadius: 8 },
  resultBox: { marginTop: 16, padding: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 },
  resultTitle: { fontWeight: 700, marginBottom: 6 },
  link: { color: '#7aa2ff', textDecoration: 'underline' },
  footer: { position: 'fixed', bottom: 10, opacity: 0.6, fontSize: 12 },
};
