// pages/index.tsx
import React, { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

/**
 * Orion Social Media Studio — MVP (Replicate wired)
 * Steps
 * 1) Welcome + Post Description (chat bar)
 * 2) Brand Info (name + website) [optional]
 * 3) Media choice (Upload or “AI will create for me”) [UI only for now]
 * 4) Industry + Goal
 * 5) Tone / Style (gallery)
 * 6) Formats (multi-select) + Video/Photo toggle
 * 7) Voice / Music (optional)
 * 8) Copy (script + caption + hashtags; editable)
 * 9) Render & Preview (polls /api/status) in phone shell + inline copy
 */

const GOALS = ["Launch", "Promo", "Traffic", "Awareness"] as const;
const INDUSTRIES = ["Digital Marketing", "eCommerce", "SaaS", "Real Estate", "Wellness", "Education", "Other"] as const;

const TONES = [
  { id: "Cinematic", img: "/tone/cinematic.png" },
  { id: "Bold", img: "/tone/bold.png" },
  { id: "Energetic", img: "/tone/energetic.png" },
  { id: "Friendly", img: "/tone/friendly.png" },
  { id: "Elegant", img: "/tone/elegant.png" },
  { id: "Professional", img: "/tone/professional.png" },
] as const;

type FormatId = "Reel (9:16)" | "Story (9:16)" | "Square (1:1)" | "Wide (16:9)" | "Carousel (Photos)";
const ALL_FORMATS: FormatId[] = ["Reel (9:16)", "Story (9:16)", "Square (1:1)", "Wide (16:9)", "Carousel (Photos)"];

type Status = { status: "starting" | "processing" | "succeeded" | "failed"; url?: string | null; error?: string };

export default function Home() {
  const [step, setStep] = useState(1);

  // Chat + mini feedback
  const [orionLine, setOrionLine] = useState("Hi, I’m Orion. What are you posting today?");
  const [chatInput, setChatInput] = useState("");
  const [miniReply, setMiniReply] = useState<string | null>(null);

  // Inputs
  const [postDesc, setPostDesc] = useState("");
  const [brandName, setBrandName] = useState("");
  const [website, setWebsite] = useState("");
  const [useAiMedia, setUseAiMedia] = useState<"ai" | "upload">("ai");

  const [industry, setIndustry] = useState<(typeof INDUSTRIES)[number]>("Digital Marketing");
  const [goal, setGoal] = useState<(typeof GOALS)[number]>("Traffic");

  const [tone, setTone] = useState<(typeof TONES)[number]["id"]>("Cinematic");
  const [formats, setFormats] = useState<FormatId[]>(["Reel (9:16)"]);
  const [videoOrPhoto, setVideoOrPhoto] = useState<"video" | "photo">("video");

  const [voiceOn, setVoiceOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);

  // Copy (editable)
  const [script, setScript] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string>("");

  // Render state
  const [jobId, setJobId] = useState<string | null>(null);
  const [render, setRender] = useState<Status | null>(null);
  const [rendering, setRendering] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Phone orientation
  const phoneOrientation: "vertical" | "horizontal" | "square" = useMemo(() => {
    if (formats.includes("Wide (16:9)")) return "horizontal";
    if (formats.includes("Square (1:1)")) return "square";
    return "vertical";
  }, [formats]);

  /* Typewriter header per step */
  useEffect(() => {
    const lines: Record<number, string> = {
      1: "Hi, I’m Orion. What are you posting today?",
      2: "Got it. Add your brand name and website (optional).",
      3: "Do you want to upload media, or should I create it for you?",
      4: "Select your industry and goal.",
      5: "Pick a tone / style.",
      6: "Choose your format(s).",
      7: "Voiceover and music — on or off?",
      8: "Here’s your draft script + caption. Tweak anything, then render.",
      9: "Rendering your preview…",
    };
    const base = lines[step] || lines[1];
    setOrionLine("|");
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setOrionLine(base.slice(0, i) + " |");
      if (i >= base.length) clearInterval(iv);
    }, 18);
    return () => clearInterval(iv);
  }, [step]);

  // Poll /api/status until success/fail
  useEffect(() => {
    if (!jobId) return;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/status?jobId=${encodeURIComponent(jobId)}`);
        const j: Status = await r.json();
        setRender(j);
        if (j.status === "succeeded" || j.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          setRendering(false);
        }
      } catch {
        /* keep polling */
      }
    }, 900);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobId]);

  // Helpers
  function selectFormat(f: FormatId) {
    setFormats((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  }
  function pushMiniReply(text: string) {
    setMiniReply(text);
    setTimeout(() => setMiniReply(null), 1800);
  }
  function continueFromChat() {
    const txt = chatInput.trim();
    if (!txt) return;
    if (step === 1) {
      setPostDesc(txt);
      setChatInput("");
      pushMiniReply("Nice—moving on.");
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!brandName) {
        setBrandName(txt);
        setChatInput("");
        pushMiniReply("Saved. Now paste your website (or type 'skip').");
        return;
      }
      if (!website) {
        if (txt.toLowerCase() !== "skip") setWebsite(txt);
        setChatInput("");
        pushMiniReply("Thanks. Next → Media.");
        setStep(3);
        return;
      }
    }
  }
  function autoAdvance<T>(setter: (v: T) => void, value: T, nextStep: number) {
    setter(value);
    setTimeout(() => setStep(nextStep), 180);
  }
  function draftCopy() {
    const base = `${tone} ${goal.toLowerCase()} ${videoOrPhoto} for ${brandName || "your brand"} in ${industry}.`;
    const s =
      videoOrPhoto === "video"
        ? `Hook (0-2s): ${brandName || "Your brand"}\nBody (3-10s): ${postDesc}\nCTA (last 2s): ${ctaForGoal(goal)}`
        : `Headline: ${postDesc}\nSub: ${goal} with ${brandName || "our brand"}\nCTA: ${ctaForGoal(goal)}`;
    setScript(s);
    setCaption(`${base} ${postDesc}. ${ctaForGoal(goal)}`);
    setHashtags(hashForIndustry(industry, goal, tone));
  }

  async function startRender() {
    try {
      setRendering(true);
      setRender(null);
      setJobId(null);

      const primary = formats[0] || "Reel (9:16)";
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: buildPrompt(),
          tone,
          format: primary,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Render failed");
      if (data.url) {
        setRender({ status: "succeeded", url: data.url });
        setRendering(false);
      } else {
        setJobId(data.jobId);
      }
      setStep(9);
    } catch (e: any) {
      setRendering(false);
      setRender({ status: "failed", error: e?.message || "Render failed" });
      setStep(9);
    }
  }

  function buildPrompt() {
    const pieces = [
      postDesc,
      brandName && `Brand: ${brandName}`,
      website && `Website: ${website}`,
      `Industry: ${industry}`,
      `Goal: ${goal}`,
      `Tone: ${tone}`,
      `Formats: ${formats.join(", ")}`,
      videoOrPhoto === "photo" ? "Static image ad." : "Short video ad with captions and transitions.",
      voiceOn ? "Include voiceover." : "No voiceover.",
      musicOn ? "Add upbeat background music." : "No music.",
      "Make it clean, modern, high-contrast. Social-media ready.",
    ].filter(Boolean);
    return pieces.join(" | ");
  }

  // UI
  return (
    <div style={S.page}>
      <div style={S.center}>
        <div style={S.monitor}>
          <div style={S.orionLine}>
            <span style={S.orionName}>ORION:</span> <span>{orionLine}</span>
          </div>

          {/* — Steps — */}
          {step === 1 && (
            <Card>
              <p style={S.sub}>I’ll design your ad from a short description.</p>
              <ChatBar
                value={chatInput}
                onChange={setChatInput}
                onSend={continueFromChat}
                placeholder="e.g., 15s ad for a new coffee shop, energetic tone."
              />
              <div style={S.footerRow}>
                <span />
                <button
                  style={S.primary}
                  onClick={() => (postDesc ? setStep(2) : pushMiniReply("Type a description first"))}
                >
                  Continue
                </button>
              </div>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <p style={S.sub}>Brand info (optional). Use the chat to enter first your brand name, then website.</p>
              <div style={S.kv}>
                <div>
                  <strong>Brand:</strong> {brandName || <em>—</em>}
                </div>
                <div>
                  <strong>Website:</strong> {website || <em>—</em>}
                </div>
              </div>
              <ChatBar
                value={chatInput}
                onChange={setChatInput}
                onSend={continueFromChat}
                placeholder={!brandName ? "Type your brand or project name…" : "Paste your website or type 'skip'…"}
              />
              <div style={S.footerRow}>
                <button style={S.linkBtn} onClick={() => setStep(1)}>
                  Back
                </button>
                <button style={S.primary} onClick={() => setStep(3)}>
                  Continue
                </button>
              </div>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <p style={S.sub}>Media</p>
              <div style={S.rowWrap}>
                <Chip label="Create it for me (AI)" active={useAiMedia === "ai"} onClick={() => autoAdvance(setUseAiMedia, "ai", 4)} />
                <Chip label="I’ll upload logo / images / clips" active={useAiMedia === "upload"} onClick={() => setUseAiMedia("upload")} />
              </div>
              {useAiMedia === "upload" && (
                <div style={{ marginTop: 10 }}>
                  <label style={S.label}>Upload (logo / images / short clips)</label>
                  <input type="file" multiple />
                </div>
              )}
              <div style={S.footerRow}>
                <button style={S.linkBtn} onClick={() => setStep(2)}>
                  Back
                </button>
                <button style={S.primary} onClick={() => setStep(4)}>
                  Continue
                </button>
              </div>
            </Card>
          )}

          {step === 4 && (
            <Card>
              <p style={S.sub}>Industry & Goal</p>
              <label style={S.label}>Industry</label>
              <div style={S.rowWrap}>
                {INDUSTRIES.map((i) => (
                  <Chip key={i} label={i} active={industry === i} onClick={() => setIndustry(i)} />
                ))}
              </div>
              <label style={{ ...S.label, marginTop: 10 }}>Goal</label>
              <div style={S.rowWrap}>
                {GOALS.map((g) => (
                  <Chip key={g} label={g} active={goal === g} onClick={() => setGoal(g)} />
                ))}
              </div>
              <div style={S.footerRow}>
                <button style={S.linkBtn} onClick={() => setStep(3)}>
                  Back
                </button>
                <button style={S.primary} onClick={() => setStep(5)}>
                  Continue
                </button>
              </div>
            </Card>
          )}

          {step === 5 && (
            <Card>
              <p style={S.sub}>Tone / Style</p>
              <div style={S.gallery}>
                {TONES.map((t) => (
                  <ToneCard key={t.id} label={t.id} img={t.img} active={tone === t.id} onClick={() => setTone(t.id)} />
                ))}
              </div>
              <div style={S.footerRow}>
                <button style={S.linkBtn} onClick={() => setStep(4)}>
                  Back
                </button>
                <button style={S.primary} onClick={() => setStep(6)}>
                  Continue
                </button>
              </div>
            </Card>
          )}

          {step === 6 && (
            <Card>
              <p style={S.sub}>Formats (you can pick multiple)</p>
              <div style={S.rowWrap}>
                {ALL_FORMATS.map((f) => (
                  <Chip key={f} label={f} active={formats.includes(f)} onClick={() => selectFormat(f)} />
                ))}
              </div>
              <div style={S.row}>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="radio" name="vp" checked={videoOrPhoto === "video"} onChange={() => setVideoOrPhoto("video")} /> Video
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="radio" name="vp" checked={videoOrPhoto === "photo"} onChange={() => setVideoOrPhoto("photo")} /> Photo
                </label>
              </div>
              <div style={S.footerRow}>
                <button style={S.linkBtn} onClick={() => setStep(5)}>
                  Back
                </button>
                <button style={S.primary} onClick={() => setStep(7)}>
                  Continue
                </button>
              </div>
            </Card>
          )}

          {step === 7 && (
            <Card>
              <p style={S.sub}>Voice & Music</p>
              <div style={S.rowWrap}>
                <Toggle label="Voiceover" checked={voiceOn} onChange={setVoiceOn} />
                <Toggle label="Music" checked={musicOn} onChange={setMusicOn} />
              </div>
              <div style={S.footerRow}>
                <button style={S.linkBtn} onClick={() => setStep(6)}>
                  Back
                </button>
                <button style={S.primary} onClick={() => { draftCopy(); setStep(8); }}>
                  Continue
                </button>
              </div>
            </Card>
          )}

          {step === 8 && (
            <Card>
              <p style={S.sub}>Copy (you can edit)</p>
              <label style={S.label}>Script</label>
              <textarea style={S.textarea} rows={5} value={script} onChange={(e) => setScript(e.target.value)} />
              <label style={S.label}>Caption</label>
              <textarea style={S.textarea} value={caption} onChange={(e) => setCaption(e.target.value)} />
              <label style={S.label}>Hashtags</label>
              <textarea style={S.textarea} rows={2} value={hashtags} onChange={(e) => setHashtags(e.target.value)} />
              <div style={S.footerRow}>
                <button style={S.linkBtn} onClick={() => setStep(7)}>
                  Back
                </button>
                <button style={S.primary} onClick={startRender} disabled={rendering}>
                  {rendering ? "Starting…" : "Generate"}
                </button>
              </div>
            </Card>
          )}

          {step === 9 && (
            <Card>
              <p style={S.sub}>Preview</p>
              <div style={S.previewWrap}>
                <PhoneShell orientation={phoneOrientation} url={render?.url || undefined} />
                <div>
                  <div style={S.statusBox}>
                    <strong>Status:</strong>{" "}
                    {render?.status ?? (rendering ? "starting…" : "")} {render?.error ? ` — ${render.error}` : ""}
                  </div>
                  <div style={S.resultBox}>
                    <div style={S.resultTitle}>Caption</div>
                    <div style={S.resultHint}>{caption}</div>
                  </div>
                  <a
                    href={render?.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    style={{ ...S.primary, textDecoration: "none", display: "inline-block", pointerEvents: render?.url ? "auto" : "none", opacity: render?.url ? 1 : 0.6 }}
                  >
                    {render?.url ? "Open in new tab" : "Rendering…"}
                  </a>
                </div>
              </div>
            </Card>
          )}

          {/* Mini reply */}
          {miniReply && <div style={S.mini}>{miniReply}</div>}

          <footer style={S.footer}>© Orion Studio — MVP</footer>
        </div>
      </div>
    </div>
  );
}

/* ======== Small UI helpers ======== */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={S.card}>
      {children}
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} style={{ ...S.chip, ...(active ? S.chipActive : {}) }}>
      {label}
    </button>
  );
}

function ToneCard({
  label,
  img,
  active,
  onClick,
}: {
  label: string;
  img: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        ...S.toneCard,
        ...(active ? S.toneCardActive : null),
        backgroundImage: `url(${img})`,
      }}
      title={label}
      role="button"
    >
      <div style={S.toneBadge}>{label}</div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        ...S.choice,
        ...(checked ? S.choiceActive : {}),
      }}
    >
      {label}
    </button>
  );
}

function ChatBar({
  value,
  onChange,
  onSend,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  placeholder?: string;
}) {
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") onSend();
  };
  return (
    <div style={S.chat}>
      <input
        style={S.chatInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={handleKey}
      />
      <button style={S.primary} onClick={onSend}>Send</button>
    </div>
  );
}

function PhoneShell({
  url,
  orientation,
}: {
  url?: string;
  orientation: "vertical" | "horizontal" | "square";
}) {
  const dims =
    orientation === "horizontal"
      ? { width: 520, height: 300 }
      : orientation === "square"
      ? { width: 340, height: 340 }
      : { width: 300, height: 520 };

  return (
    <div style={S.phone}>
      <img src="/phone-shell.svg" style={{ width: "100%", height: "100%" }} alt="phone shell" />
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        {url ? (
          <video src={url} style={{ width: dims.width, height: dims.height, objectFit: "contain" }} controls autoPlay loop />
        ) : (
          <div style={{ opacity: 0.6, fontSize: 13 }}>Waiting for preview…</div>
        )}
      </div>
    </div>
  );
}

/* ======== Styles ======== */
const S: Record<string, CSSProperties> = {
  page: {
    minHeight: "100svh",
    background:
      "radial-gradient(60% 60% at 50% 20%, #0b1220 0%, #05080f 60%, #04060b 100%)",
    color: "#e8eefc",
  },
  center: { display: "grid", placeItems: "center", padding: "40px 16px" },
  monitor: {
    width: "100%",
    maxWidth: 980,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 18,
    boxShadow: "0 10px 60px rgba(0,0,0,0.35)",
    backdropFilter: "blur(8px)",
    position: "relative",
  },
  orionLine: {
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 20,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  orionName: { color: "#7aa2ff", fontWeight: 700 },

  sub: {
    margin: "0 12px 0",
    fontSize: 15,
    opacity: 0.9,
  },

  kv: { display: "grid", gridTemplateColumns: "1fr", gap: 8, marginBottom: 12, opacity: 0.95 },

  rowWrap: { display: "flex", flexWrap: "wrap", gap: 10, margin: "8px 0 6px" },
  row: { display: "flex", alignItems: "center", gap: 16, marginTop: 10 },

  card: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: 16,
    marginTop: 10,
  },

  primary: {
    background: "linear-gradient(135deg, #7aa2ff 0%, #6ba3ff 100%)",
    color: "#030611",
    border: "none",
    borderRadius: 12,
    padding: "10px 16px",
    fontWeight: 700,
    cursor: "pointer",
  },
  linkBtn: { background: "transparent", color: "#a6bafc", border: "none", cursor: "pointer" },

  label: { fontSize: 12, opacity: 0.7, marginBottom: 6 },

  gallery: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: 12,
    alignItems: "center",
  },

  footerRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 12,
  },

  toneCard: {
    position: "relative",
    height: 140,
    backgroundPosition: "center",
    backgroundSize: "cover",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.09)",
    cursor: "pointer",
    overflow: "hidden",
  },
  toneCardActive: {
    outline: "2px solid #7aa2ff",
  },
  toneBadge: {
    position: "absolute",
    left: 10,
    bottom: 10,
    background: "rgba(0,0,0,0.45)",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 12,
  },

  chip: {
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 13,
    color: "#e8eefc",
    cursor: "pointer",
  },
  chipActive: {
    background: "rgba(122,162,255,0.2)",
    borderColor: "rgba(122,162,255,0.6)",
  },

  choice: {
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    padding: "10px 14px",
    borderRadius: 12,
    cursor: "pointer",
  },
  choiceActive: {
    outline: "2px solid rgba(122,162,255,0.5)",
    background: "rgba(122,162,255,0.2)",
  },

  chat: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  chatInput: {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: "12px 14px",
    color: "#e8eefc",
  },

  textarea: {
    width: "100%",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    padding: 10,
    color: "#e8eefc",
  },

  galleryWrap: { display: "grid", placeItems: "center", gap: 12 },

  phone: {
    position: "relative",
    width: 330,
    height: 660,
    background: "linear-gradient(180deg, rgba(14,19,35,0) 0%, rgba(10,15,27,1) 100%)",
    borderRadius: 36,
    border: "1px solid rgba(255,255,255,0.06)",
    boxShadow: "0 20px 80px rgba(0,0,0,0.45)",
    padding: 14,
  },

  previewWrap: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    alignItems: "flex-start",
  },

  statusBox: { marginTop: 12, padding: "8px 10px" },

  resultBox: {
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  resultTitle: { fontWeight: 700, marginBottom: 6 },
  resultHint: { opacity: 0.8, fontSize: 13 },

  mini: {
    position: "absolute",
    right: 16,
    top: 12,
    background: "rgba(0,0,0,0.45)",
    border: "1px solid rgba(255,255,255,0.12)",
    padding: "6px 10px",
    borderRadius: 10,
    fontSize: 12,
  },

  footer: { opacity: 0.8, fontSize: 13, marginTop: 8, textAlign: "center" },
};

/* ======== tiny helpers for copy ======== */
function ctaForGoal(goal: (typeof GOALS)[number]) {
  switch (goal) {
    case "Launch": return "Sign up today";
    case "Promo": return "Claim the offer";
    case "Traffic": return "Learn more";
    case "Awareness": return "Follow for updates";
    default: return "Get started";
  }
}
function hashForIndustry(
  industry: (typeof INDUSTRIES)[number],
  goal: (typeof GOALS)[number],
  tone: (typeof TONES)[number]["id"]
) {
  const base = ["#ad", "#marketing", "#content", "#orion"];
  const extras = [
    `#${industry.replace(/\s+/g, "")}`,
    `#${goal.toLowerCase()}`,
    `#${tone.toLowerCase()}`,
  ];
  return [...base, ...extras].join(" ");
}
