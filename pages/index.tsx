// pages/index.tsx
import { useState, useEffect } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("idle");

  async function handleGenerate() {
    setStatus("starting");
    setVideoUrl(null);

    const res = await fetch("/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json();
    setJobId(data.id);
  }

  // Poll Replicate until video is ready
  useEffect(() => {
    if (!jobId) return;

    const iv = setInterval(async () => {
      const res = await fetch(`/api/status?id=${jobId}`);
      const data = await res.json();

      if (data.status === "succeeded") {
        setVideoUrl(data.output?.[0] || null);
        setStatus("done");
        clearInterval(iv);
      } else if (data.status === "failed") {
        setStatus("failed");
        clearInterval(iv);
      } else {
        setStatus(data.status);
      }
    }, 5000);

    return () => clearInterval(iv);
  }, [jobId]);

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>🎬 Orion Social Media Studio</h1>
        <p>Type a description, I’ll create a short video ad for you.</p>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., 15s ad for a coffee shop, upbeat and friendly"
          style={styles.textarea}
        />

        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || status === "starting"}
          style={styles.button}
        >
          {status === "starting" ? "Generating…" : "Generate Video"}
        </button>

        {status !== "idle" && <p>Status: {status}</p>}

        {videoUrl && (
          <div style={styles.videoBox}>
            <video src={videoUrl} controls autoPlay muted width="100%" />
          </div>
        )}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0b0f1a",
    color: "#e8eeff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 600,
    padding: 20,
    borderRadius: 16,
    background: "rgba(255,255,255,0.05)",
    boxShadow: "0 0 30px rgba(0,0,0,0.3)",
  },
  title: { fontSize: 24, marginBottom: 12 },
  textarea: {
    width: "100%",
    minHeight: 100,
    borderRadius: 8,
    marginBottom: 12,
    padding: 10,
  },
  button: {
    padding: "10px 16px",
    borderRadius: 8,
    background: "#7aa2ff",
    color: "#0b0f1a",
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: 12,
  },
  videoBox: {
    marginTop: 16,
    borderRadius: 8,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.1)",
  },
};
