// pages/index.tsx
import React, { useState, useEffect } from "react";

const tones = ["Cinematic", "Bold", "Energetic", "Friendly", "Elegant", "Professional"] as const;
const formats = ["Reel (9:16)", "Story (9:16)", "Square (1:1)", "Wide (16:9)"] as const;

export default function Home() {
  const [desc, setDesc] = useState("");
  const [tone, setTone] = useState<typeof tones[number]>("Cinematic");
  const [format, setFormat] = useState<typeof formats[number]>("Reel (9:16)");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [jobId, setJobId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [renderStatus, setRenderStatus] = useState<string | null>(null);

  // Poll status if we have a jobId
  useEffect(() => {
    if (!jobId) return;
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`/api/status?jobId=${encodeURIComponent(jobId)}`);
        const j = await r.json();
        setRenderStatus(j.status);

        if (j.status === "succeeded" && j.url) {
          setResultUrl(j.url);
          setLoading(false);
          clearInterval(iv);
        }
        if (j.status === "failed") {
          setError(j.error || "Video generation failed");
          setLoading(false);
          clearInterval(iv);
        }
      } catch (e: any) {
        setError(e?.message || "Polling failed");
        setLoading(false);
        clearInterval(iv);
      }
    }, 5000);
    return () => clearInterval(iv);
  }, [jobId]);

  async function handleGenerate() {
    setError(null);
    setResultUrl(null);
    setJobId(null);
    setRenderStatus(null);
    setLoading(true);

    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: desc, tone, format }),
      });
      if (!res.ok) throw new Error(`Render failed (${res.status})`);
      const data = await res.json();

      if (data.jobId) setJobId(data.jobId);
      else if (data.url) {
        setResultUrl(data.url);
        setLoading(false);
      } else {
        throw new Error("No jobId or url returned");
      }
    } catch (e: any) {
      setError(e?.message || "Unexpected error");
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <h1 style={styles.title}>
        Hi, I’m <span style={{ color: "#7aa2ff" }}>Orion</span> — Your Social Media Manager Assistant.
      </h1>
      <p>Tell me what you’re posting today and I’ll mock up your ad.</p>

      <div style={styles.form}>
        <label>Post description</label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          style={styles.textarea}
          placeholder="15s ad for a coffee shop launch, upbeat."
        />

        <div style={styles.row}>
          <div>
            <label>Tone</label>
            <select value={tone} onChange={(e) => setTone(e.target.value as typeof tones[number])}>
              {tones.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Format</label>
            <select value={format} onChange={(e) => setFormat(e.target.value as typeof formats[number])}>
              {formats.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        <button onClick={handleGenerate} style={styles.button} disabled={loading}>
          {loading ? "Generating..." : "Generate Video"}
        </button>
      </div>

      {error && <div style={styles.error}>⚠️ {error}</div>}

      {renderStatus && !resultUrl && (
        <div style={styles.statusBox}>
          Status: {renderStatus} {jobId && <>(Job ID: {jobId})</>}
        </div>
      )}

      {resultUrl && (
        <div style={styles.resultBox}>
          <h3>Final Result</h3>
          <video src={resultUrl} controls width="480" />
        </div>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "2rem", fontFamily: "sans-serif", color: "#E8EEFF", background: "#0B0F1A", minHeight: "100vh" },
  title: { fontSize: "1.8rem", marginBottom: "1rem" },
  form: { background: "#0F1629", padding: "1rem", borderRadius: 12, marginBottom: "1rem" },
  textarea: { width: "100%", height: 80, marginTop: 8, marginBottom: 12 },
  row: { display: "flex", gap: "1rem", marginBottom: "1rem" },
  button: { background: "#7aa2ff", color: "#071020", fontWeight: 700, padding: "10px 16px", border: "none", borderRadius: 8, cursor: "pointer" },
  error: { marginTop: 12, color: "#ff6b6b", fontWeight: "bold" },
  statusBox: { marginTop: 12, padding: "8px 12px", background: "#1f2a48", borderRadius: 8 },
  resultBox: { marginTop: 16, padding: 12, background: "#1f2a48", borderRadius: 8 },
};
