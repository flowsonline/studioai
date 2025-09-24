import React, { useState } from "react";

/**
 * Orion Studio — MVP UI
 * - Button 1: Generate (Simulated / or Real if USE_EDEN_SIMULATOR=false)
 * - Button 2: Generate Copy (OpenAI) → /api/generate-copy (script/caption/hashtags)
 * - Status box shows progress + final URL when real Eden is active
 */

const tones = [
  "Cinematic",
  "Bold",
  "Energetic",
  "Friendly",
  "Elegant",
  "Professional",
] as const;

const formats = ["Reel (9:16)", "Story (9:16)", "Square (1:1)", "Wide (16:9)"] as const;

export default function Home() {
  // Basic inputs
  const [desc, setDesc] = useState("");
  const [tone, setTone] = useState<(typeof tones)[number]>("Cinematic");
  const [format, setFormat] = useState<(typeof formats)[number]>("Reel (9:16)");

  // Render (sim/real) state
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // NEW: job + status for real Eden polling
  const [jobId, setJobId] = useState<string | null>(null);
  const [renderStatus, setRenderStatus] = useState<{
    status?: string;
    progress?: number;
    url?: string;
  } | null>(null);

  // AI Copy state
  const [copyLoading, setCopyLoading] = useState(false);
  const [script, setScript] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);

  /**
   * Button 1: Generate (Simulated/Real)
   * - Simulator: returns previewUrl immediately
   * - Real: returns jobId, then we poll /api/status
   */
  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResultUrl(null);
    setRenderStatus(null);
    setJobId(null);

    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: desc,
          tone,
          format,
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Render failed (${res.status})`);
      }

      const data = await res.json();

      // Simulator returns previewUrl immediately
      if (data.previewUrl) {
        setResultUrl(data.previewUrl);
        setRenderStatus({ status: "succeeded", progress: 100, url: data.previewUrl });
        return;
      }

      // Real job → poll /api/status
      if (data.jobId) {
        setJobId(data.jobId);
        const poll = setInterval(async () => {
          try {
            const r = await fetch(`/api/status?jobId=${encodeURIComponent(data.jobId)}`);
            const j = await r.json();
            setRenderStatus(j);
            if (j.status === "succeeded" || j.status === "failed") {
              clearInterval(poll);
              if (j.url) setResultUrl(j.url);
            }
          } catch (e) {
            clearInterval(poll);
            setError("Failed to check status");
          }
        }, 1200);
      }
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Button 2: Generate Copy (AI)
   * - Calls /api/generate-copy → returns { script, caption, hashtags[] }
   */
  async function handleGenerateCopy() {
    setCopyLoading(true);
    setError(null);
    setScript("");
    setCaption("");
    setHashtags([]);

    try {
      const res = await fetch("/api/generate-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: desc }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Copy failed (${res.status})`);
      }

      const data = await res.json();
      setScript(data.script || "");
      setCaption(data.caption || "");
      setHashtags(Array.isArray(data.hashtags) ? data.hashtags : []);
    } catch (err: any) {
      setError(err?.message || "Copy failed");
    } finally {
      setCopyLoading(false);
    }
  }

  // Render
  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={styles.title}>
          Hi, I’m <span style={{ color: "#7aa2ff" }}>Orion</span> — Your Social Media Manager Assistant.
        </div>
        <div style={styles.sub}>Tell me what you’re posting today and I’ll mock up your ad.</div>

        <label style={styles.label}>Post description</label>
        <textarea
          placeholder="e.g., 15s ad for a coffee shop launch, upbeat and friendly."
          style={styles.textarea}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />

        <div style={styles.row}>
          <div style={styles.col}>
            <label style={styles.label}>Tone</label>
            <select style={styles.select} value={tone} onChange={(e) => setTone(e.target.value as any)}>
              {tones.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.col}>
            <label style={styles.label}>Format</label>
            <select style={styles.select} value={format} onChange={(e) => setFormat(e.target.value as any)}>
              {formats.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Button 1 */}
        <button
          onClick={handleGenerate}
          style={styles.button}
          disabled={loading || !desc.trim()}
          title={!desc.trim() ? "Add a short description first" : "Render video"}
        >
          {loading ? "Generating…" : "Generate (Simulated)"}
        </button>

        {/* Button 2 */}
        <button
          onClick={handleGenerateCopy}
          style={{ ...styles.button, marginTop: 12 }}
          disabled={copyLoading || !desc.trim()}
          title={!desc.trim() ? "Add a short description first" : "Generate copy with AI"}
        >
          {copyLoading ? "Generating Copy…" : "Generate Copy (AI)"}
        </button>

        {/* Error banner */}
        {error && <div style={styles.error}>⚠️ {error}</div>}

        {/* NEW: Render status box (works for sim + real) */}
        {renderStatus && (
          <div style={styles.resultBox}>
            <div style={styles.resultTitle}>Render Status</div>
            <div>
              <strong>Status:</strong> {renderStatus.status ?? "starting…"} —{" "}
              {renderStatus.progress ?? 0}%
            </div>
            {jobId && <div style={styles.resultHint}>Job: {jobId}</div>}
            {renderStatus.url && (
              <div style={{ marginTop: 6 }}>
                <a href={renderStatus.url} style={styles.link} target="_blank" rel="noreferrer">
                  Open Video
                </a>
              </div>
            )}
          </div>
        )}

        {/* Mock Result (still useful in sim mode) */}
        {resultUrl && (
          <div style={styles.resultBox}>
            <div style={styles.resultTitle}>Mock Result</div>
            <div style={styles.resultHint}>This is a simulated link to a rendered asset.</div>
            <a href={resultUrl} style={styles.link} target="_blank" rel="noreferrer">
              {resultUrl}
            </a>
          </div>
        )}

        {/* AI Copy output */}
        {(script || caption || hashtags.length) && (
          <div style={styles.resultBox}>
            <div style={styles.resultTitle}>AI Script</div>
            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 13,
              }}
            >{`{
  "script": ${JSON.stringify(script)},
  "caption": ${JSON.stringify(caption)},
  "hashtags": ${JSON.stringify(hashtags, null, 2)}
}`}</pre>
          </div>
        )}
      </div>
      <footer style={styles.footer}>© Orion Studio — MVP</footer>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100svh",
    background: "radial-gradient(60% 60% at 50% 20%, #0b1220 0%, #05080f 60%, #04060b 100%)",
    color: "#e8eefc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 16px",
    boxSizing: "border-box",
  },
  card: {
    width: "100%",
    maxWidth: 980,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 10px 60px rgba(0,0,0,0.35)",
    backdropFilter: "blur(8px)",
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 8,
  },
  sub: {
    opacity: 0.8,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    opacity: 0.8,
    margin: "10px 0 6px",
    display: "block",
  },
  textarea: {
    width: "100%",
    minHeight: 110,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.25)",
    color: "#e8eefc",
    padding: 12,
    outline: "none",
  },
  row: {
    display: "flex",
    gap: 12,
    marginTop: 10,
    flexWrap: "wrap",
  },
  col: {
    flex: 1,
    minWidth: 220,
  },
  select: {
    width: "100%",
    height: 40,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.25)",
    color: "#e8eefc",
    padding: "0 10px",
    outline: "none",
    appearance: "none",
  },
  button: {
    width: "100%",
    height: 46,
    marginTop: 16,
    borderRadius: 12,
    border: "1px solid rgba(122,162,255,0.35)",
    background: "linear-gradient(180deg, #87a6ff 0%, #6d8cff 100%)",
    color: "#071020",
    fontWeight: 700,
    cursor: "pointer",
  },
  error: {
    marginTop: 14,
    padding: "10px 12px",
    border: "1px solid rgba(255, 120, 120, 0.4)",
    background: "rgba(120, 0, 0, 0.25)",
    borderRadius: 10,
    color: "#ffbaba",
    fontSize: 14,
  },
  resultBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
  },
  resultTitle: { fontWeight: 700, marginBottom: 6 },
  resultHint: { opacity: 0.8, fontSize: 13, marginTop: 6 },
  link: { color: "#7aa2ff", textDecoration: "underline", wordBreak: "break-all" },
  footer: { position: "fixed", bottom: 10, opacity: 0.6, fontSize: 12 },
};
