import React, { useState } from "react";

/**
 * Orion Studio — MVP UI
 * - Button 1: Generate (Simulated)  → POST /api/render  (returns previewUrl in sim mode)
 * - Button 2: Generate Copy (OpenAI)→ POST /api/generate-copy (returns script/caption/hashtags)
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

  // Render (sim) state
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Copy generation (OpenAI) state
  const [copyLoading, setCopyLoading] = useState(false);
  const [script, setScript] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);

  // TEMP DEBUG: raw response from /api/generate-copy
  const [rawResponse, setRawResponse] = useState<any>(null);

  // 1) Simulated “render”
  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResultUrl(null);

    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: desc,
          tone,
          format,
          simulate: true, // server returns a mock previewUrl
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Render failed (${res.status})`);
      }

      const data = await res.json();
      setResultUrl(data.previewUrl || null);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // 2) Real “copy” generation (OpenAI via /api/generate-copy)
  async function handleGenerateCopy() {
    setCopyLoading(true);
    setError(null);
    setRawResponse(null);

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

      // TEMP DEBUG
      console.log("🔎 OpenAI raw response:", data);
      setRawResponse(data);

      setScript(data.script || "");
      setCaption(data.caption || "");
      setHashtags(Array.isArray(data.hashtags) ? data.hashtags : []);
    } catch (e: any) {
      setError(e?.message || "Copy generation failed");
    } finally {
      setCopyLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={styles.title}>
          Hi, I’m <span style={{ color: "#7aa2ff" }}>Orion</span> — Your Social Media Manager Assistant.
        </div>
        <div style={styles.sub}>Tell me what you’re posting today and I’ll mock up your ad (simulated).</div>

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

        {/* Buttons */}
        <button
          onClick={handleGenerate}
          style={styles.button}
          disabled={loading || !desc.trim()}
          title={!desc.trim() ? "Add a short description first" : "Generate (simulated)"}
        >
          {loading ? "Generating…" : "Generate (Simulated)"}
        </button>

        <button
          onClick={handleGenerateCopy}
          style={{ ...styles.button, marginTop: 12 }}
          disabled={copyLoading || !desc.trim()}
          title={!desc.trim() ? "Add a short description first" : "Generate Copy (AI)"}
        >
          {copyLoading ? "Generating Copy…" : "Generate Copy (AI)"}
        </button>

        {error && <div style={styles.error}>⚠️ {error}</div>}

        {/* Copy results */}
        {(script || caption || hashtags.length > 0) && (
          <div style={styles.resultBox}>
            <div style={styles.resultTitle}>AI Copy</div>
            {script && (
              <>
                <div style={styles.resultHint}>Script</div>
                <div>{script}</div>
              </>
            )}
            {caption && (
              <>
                <div style={{ ...styles.resultHint, marginTop: 8 }}>Caption</div>
                <div>{caption}</div>
              </>
            )}
            {hashtags.length > 0 && (
              <>
                <div style={{ ...styles.resultHint, marginTop: 8 }}>Hashtags</div>
                <div>{hashtags.map((h) => `#${h}`).join(" ")}</div>
              </>
            )}
          </div>
        )}

        {/* Mock result (sim) */}
        {resultUrl && (
          <div style={styles.resultBox}>
            <div style={styles.resultTitle}>Mock Result</div>
            <div style={styles.resultHint}>This is a simulated link to a rendered asset.</div>
            <a href={resultUrl} style={styles.link} target="_blank" rel="noreferrer">
              {resultUrl}
            </a>
          </div>
        )}

        {/* TEMP DEBUG: raw OpenAI JSON */}
        {rawResponse && (
          <div style={styles.resultBox}>
            <div style={styles.resultTitle}>AI Script</div>
            <pre style={styles.pre}>{JSON.stringify(rawResponse, null, 2)}</pre>
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
    maxWidth: 880,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 10px 60px rgba(0,0,0,0.35)",
    backdropFilter: "blur(8px)",
  },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 8 },
  sub: { opacity: 0.8, marginBottom: 20 },
  label: { fontSize: 13, opacity: 0.8, margin: "10px 0 6px", display: "block" },
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
  row: { display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" },
  col: { flex: 1, minWidth: 220 },
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
  resultBox: { marginTop: 16, padding: 14, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" },
  resultTitle: { fontWeight: 700, marginBottom: 6 },
  resultHint: { opacity: 0.8, fontSize: 13, marginBottom: 8 },
  link: { color: "#7aa2ff", textDecoration: "underline" },
  pre: {
    whiteSpace: "pre-wrap",
    fontSize: 13,
    lineHeight: 1.35,
    color: "#d7e2ff",
    background: "#1d2636",
    padding: 10,
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.06)",
  },
  footer: { position: "fixed", bottom: 10, opacity: 0.6, fontSize: 12 },
};
