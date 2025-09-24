import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Orion Social Media Studio — MVP (Replicate wired)
 * Steps:
 *  1) Post Description (chat bar)
 *  2) Brand Info (name + website)  [optional]
 *  3) Media choice (Upload or “AI will create for me”)  [UI only for now]
 *  4) Industry + Goal
 *  5) Tone / Style (gallery)
 *  6) Formats (multi-select) + Video/Photo toggle
 *  7) Voice / Music toggles
 *  8) Copy (draft script + caption + hashtags)  [simple client draft]
 *  9) Render & Preview (polls /api/status) in phone shell + inline copy
 */

const GOALS = ["Launch", "Promo", "Traffic", "Awareness"] as const;
const INDUSTRIES = [
  "Digital Marketing",
  "eCommerce",
  "SaaS",
  "Real Estate",
  "Wellness",
  "Education",
  "Other",
] as const;

const TONES = [
  { id: "Cinematic", img: "/tone/cinematic.png" },
  { id: "Bold", img: "/tone/bold.png" },
  { id: "Energetic", img: "/tone/energetic.png" },
  { id: "Friendly", img: "/tone/friendly.png" },
  { id: "Elegant", img: "/tone/elegant.png" },
  { id: "Professional", img: "/tone/professional.png" },
] as const;

type FormatId = "Reel (9:16)" | "Story (9:16)" | "Square (1:1)" | "Wide (16:9)" | "Carousel (Photos)";
const ALL_FORMATS: FormatId[] = [
  "Reel (9:16)",
  "Story (9:16)",
  "Square (1:1)",
  "Wide (16:9)",
  "Carousel (Photos)",
];

type Status = {
  status: "starting" | "processing" | "succeeded" | "failed";
  url?: string | null;
  error?: string;
};

export default function Home() {
  const [step, setStep] = useState(1);

  // Chat + small feedback
  const [orionLine, setOrionLine] = useState("Hi, I’m Orion. What are you posting today?");
  const [chatInput, setChatInput] = useState("");
  const [miniReply, setMiniReply] = useState<string | null>(null);

  // Collected fields
  const [postDesc, setPostDesc] = useState("");
  const [brandName, setBrandName] = useState("");
  const [website, setWebsite] = useState("");
  const [useAiMedia, setUseAiMedia] = useState<"ai" | "upload">("ai");

  const [industry, setIndustry] = useState<(typeof INDUSTRIES)[number]>("Digital Marketing");
  const [goal, setGoal] = useState<(typeof GOALS)[number]>("Traffic");

  const [tone, setTone] = useState<(typeof TONES)[number]["id"]>("Cinematic");
  const [formats, setFormats] = useState<FormatId[]>(["Reel (9:16)"]);
  const [videoOrPhoto, setVideoOrPhoto] = useState<"video" | "photo">("video"); // for Reel/Story/Square

  const [voiceOn, setVoiceOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);

  // Copy (client-drafted MVP; can swap to OpenAI later)
  const [script, setScript] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string>("");

  // Render state
  const [jobId, setJobId] = useState<string | null>(null);
  const [render, setRender] = useState<Status | null>(null);
  const [rendering, setRendering] = useState(false);
  const pollRef = useRef<any>(null);

  // Phone orientation based on formats
  const phoneOrientation: "vertical" | "horizontal" | "square" = useMemo(() => {
    if (formats.includes("Wide (16:9)")) return "horizontal";
    if (formats.includes("Square (1:1)")) return "square";
    return "vertical";
  }, [formats]);

  // Typewriter effect
  useEffect(() => {
    let i = 0;
    const base =
      step === 1
        ? "Hi, I’m Orion. What are you posting today?"
        : step === 2
        ? "Got it. Add your brand name and website (optional)."
        : step === 3
        ? "Do you want to upload media, or should I create it for you?"
        : step === 4
        ? "Select your industry and goal."
        : step === 5
        ? "Pick a tone / style."
        : step === 6
        ? "Choose your format(s)."
        : step === 7
        ? "Voiceover and music — on or off?"
        : step === 8
        ? "Here’s your draft script + caption. Tweak anything, then render."
        : "Rendering your preview…";
    setOrionLine("|");
    const iv = setInterval(() => {
      i++;
      setOrionLine(base.slice(0, i) + " |");
      if (i >= base.length) clearInterval(iv);
    }, 18);
    return () => clearInterval(iv);
  }, [step]);

  // Polling for status
  useEffect(() => {
    if (!jobId) return;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/status?jobId=${encodeURIComponent(jobId)}`);
        const j: Status = await r.json();
        setRender(j);
        if (j.status === "succeeded" || j.status === "failed") {
          clearInterval(pollRef.current);
          setRendering(false);
        }
      } catch {
        // ignore; keep polling softly
      }
    }, 900);
    return () => clearInterval(pollRef.current);
  }, [jobId]);

  // Helpers
  function selectFormat(f: FormatId) {
    setFormats((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  }
  function pushMiniReply(text: string) {
    setMiniReply(text);
    setTimeout(() => setMiniReply(null), 2000);
  }
  function continueFromChat() {
    const txt = chatInput.trim();
    if (!txt) return;
    if (step === 1) {
      setPostDesc(txt);
      pushMiniReply("Nice—moving on.");
      setStep(2);
    } else if (step === 2) {
      if (!brandName) {
        setBrandName(txt);
        pushMiniReply("Saved. Now paste your website (or type 'skip').");
      } else if (!website) {
        if (txt.toLowerCase() !== "skip") setWebsite(txt);
        pushMiniReply("Thanks. Next → Media.");
        setStep(3);
      }
    }
    setChatInput("");
  }
  function autoAdvance<T>(setter: (v: T) => void, value: T, nextStep: number) {
    setter(value as any);
    setTimeout(() => setStep(nextStep), 180);
  }
  function draftCopy() {
    const base = `${tone} ${goal.toLowerCase()} ${videoOrPhoto} for ${
      brandName || "your brand"
    } in ${industry}.`;
    const s =
      videoOrPhoto === "video"
        ? `Hook (0-2s): ${brandName || "Your brand"}\nBody (3-10s): ${postDesc}\nCTA (last 2s): ${ctaForGoal(
            goal
          )}`
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

          {/* Steps */}
          {step === 1 && (
            <Card>
              <p style={S.sub}>I’ll design your ad from a short description.</p>
              <ChatBar
                value={chatInput}
                onChange={setChatInput}
                onSend={continueFromChat}
                placeholder="e.g., 15s ad for a new yoga class launch, energetic tone."
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
                <Choice
                  label="Create it for me (AI)"
                  active={useAiMedia === "ai"}
                  onClick={() => autoAdvance(setUseAiMedia, "ai", 4)}
                />
                <Choice
                  label="I’ll upload logo / images / clips"
                  active={useAiMedia === "upload"}
                  onClick={() => setUseAiMedia("upload")}
                />
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
                  <input
                    type="radio"
                    name="vp"
                    checked={videoOrPhoto === "video"}
                    onChange={() => setVideoOrPhoto("video")}
                  />{" "}
                  Video
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="radio"
                    name="vp"
                    checked={videoOrPhoto === "photo"}
                    onChange={() => setVideoOrPhoto("photo")}
                  />{" "}
                  Photo
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
              <p style={S.sub}>Voice / Music</p>
              <div style={S.row}>
                <label style={S.toggle}>
                  <input type="checkbox" checked={voiceOn} onChange={(e) => setVoiceOn(e.target.checked)} /> Voiceover
                </label>
                <label style={S.toggle}>
                  <input type="checkbox" checked={musicOn} onChange={(e) => setMusicOn(e.target.checked)} /> Music
                </label>
              </div>
              <div style={S.footerRow}>
                <button style={S.linkBtn} onClick={() => setStep(6)}>
                  Back
                </button>
                <button
                  style={S.primary}
                  onClick={() => {
                    draftCopy();
                    setStep(8);
                  }}
                >
                  Continue
                </button>
              </div>
            </Card>
          )}

          {step === 8 && (
            <Card>
              <p style={S.sub}>Copy — edit anything, then Render</p>
              <label style={S.label}>Script</label>
              <textarea style={S.textarea} value={script} onChange={(e) => setScript(e.target.value)} />

              <label style={S.label}>Caption</label>
              <textarea style={S.textarea} value={caption} onChange={(e) => setCaption(e.target.value)} />

              <label style={S.label}>Hashtags</label>
              <input style={S.input} value={hashtags} onChange={(e) => setHashtags(e.target.value)} />

              <div style={S.footerRow}>
                <button style={S.linkBtn} onClick={() => setStep(7)}>
                  Back
                </button>
                <button style={S.primary} onClick={startRender} disabled={rendering}>
                  {rendering ? "Rendering…" : "Render"}
                </button>
              </div>
            </Card>
          )}

          {step === 9 && (
            <Card>
              <p style={S.sub}>Preview</p>
              <PhonePreview orientation={phoneOrientation} url={render?.url || undefined} />
              <div style={{ marginTop: 10 }}>
                <strong>Status:</strong>{" "}
                {render?.status ?? (rendering ? "starting…" : "—")} {render?.error ? `— ${render.error}` : ""}
              </div>
              <div style={S.footerRow}>
                <button style={S.linkBtn} onClick={() => setStep(8)}>
                  Back
                </button>
                <a
                  style={{ ...S.primary, textDecoration: "none", display: "inline-block" }}
                  href={render?.url || "#"}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Video
                </a>
              </div>
              <div style={S.upgrade}>
                Want more variations + scheduling & analytics? <a href="#" style={S.link}>Upgrade to FLOWS Pro</a>
              </div>
            </Card>
          )}

          {/* mini reply strip */}
          {miniReply && <div style={S.mini}>{miniReply}</div>}
        </div>
      </div>
    </div>
  );
}

/* ========== Small components ========== */

function Card({ children }: { children: any }) {
  return <div style={S.card}>{children}</div>;
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
  return (
    <div style={S.chatBar}>
      <input
        style={S.chatInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Type here…"}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSend();
        }}
      />
      <button style={S.sendBtn} onClick={onSend}>
        Send
      </button>
    </div>
  );
}

function Choice({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} style={{ ...S.choice, ...(active ? S.choiceActive : {}) }}>
      {label}
    </button>
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
  return <button onClick={onClick} style={{ ...S.chip, ...(active ? S.chipActive : {}) }}>{label}</button>;
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
    <div onClick={onClick} style={{ ...S.toneCard, ...(active ? S.toneCardActive : {}) }}>
      <div style={S.toneImgWrap}>
        {/* If the image is missing, the background still shows a gradient */}
        <img src={img} onError={(e)=>{ (e.currentTarget as any).style.display='none'; }} style={S.toneImg} />
      </div>
      <div style={S.toneLabel}>{label}</div>
    </div>
  );
}

function PhonePreview({ orientation, url }: { orientation: "vertical" | "horizontal" | "square"; url?: string }) {
  const shell: any = { position: "relative", width: 340, height: 680 };
  const videoStyle: any = {
    position: "absolute",
    left: 30 + 8,
    top: 70 + 8,
    width: 280 - 16,
    height: 540 - 16,
    objectFit: "cover",
    background: "#0b0f14",
    borderRadius: 8,
  };
  if (orientation === "horizontal") videoStyle.objectFit = "contain";
  if (orientation === "square") videoStyle.objectFit = "contain";
  return (
    <div style={shell}>
      <img src="/phone-shell.svg" style={{ width: "100%", height: "100%" }} />
      {url ? (
        <video src={url} autoPlay muted controls style={videoStyle} />
      ) : (
        <div style={{ ...videoStyle, display: "grid", placeItems: "center", color: "#9aa4b2" }}>Waiting…</div>
      )}
    </div>
  );
}

/* ========= Styles ========= */

const S: Record<string, React.CSSProperties> = {
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
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: 20,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  orionName: { color: "#7aa2ff", fontWeight: 700 },

  sub: {
    opacity: 0.9,
    margin: "0 0 12px 0",
    fontSize: 15,
    lineHeight: 1.5,
  },

  kv: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 8,
    marginBottom: 12,
    opacity: 0.95,
  },

  rowWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    margin: "8px 0 6px",
  },
  row: { display: "flex", alignItems: "center", gap: 16, marginTop: 10 },

  footerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },

  primary: {
    background:
      "linear-gradient(180deg, rgba(135,179,255,0.7) 0%, rgba(88,138,255,0.7) 100%)",
    color: "#071020",
    fontWeight: 700,
    border: "1px solid rgba(122,162,255,0.35)",
    borderRadius: 12,
    padding: "10px 16px",
    cursor: "pointer",
  },
  linkBtn: {
    background: "transparent",
    color: "#7aa2ff",
    border: "none",
    cursor: "pointer",
    padding: "8px 6px",
  },

  label: { fontSize: 12, opacity: 0.7, marginBottom: 6 },

  gallery: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: 12,
  },
  toneCard: {
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    overflow: "hidden",
    cursor: "pointer",
    position: "relative",
    background: "rgba(255,255,255,0.02)",
  },
  toneImg: { width: "100%", height: 120, objectFit: "cover", display: "block" },
  toneLabel: {
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
    cursor: "pointer",
  },
  chipActive: {
    background:
      "linear-gradient(180deg, rgba(122,162,255,0.35) 0%, rgba(88,138,255,0.35) 100%)",
    color: "#071020",
    border: "1px solid rgba(122,162,255,0.6)",
    fontWeight: 700,
  },

  choice: {
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    padding: 14,
    borderRadius: 12,
    cursor: "pointer",
    minWidth: 220,
    textAlign: "center",
  },

  chatWrap: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 8,
    alignItems: "center",
  },

  phoneShell: {
    width: 330,
    height: 660,
    background: "linear-gradient(180deg, #0e1323 0%, #0a0f1b 100%)",
    borderRadius: 36,
    border: "1px solid rgba(255,255,255,0.06)",
    boxShadow: "0 20px 80px rgba(0,0,0,0.45)",
    padding: 14,
    position: "relative",
    overflow: "hidden",
  },
  phoneScreen: {
    width: "100%",
    height: "100%",
    borderRadius: 26,
    overflow: "hidden",
    background: "#000",
    display: "grid",
    placeItems: "center",
  },
  phoneScreenHorizontal: {
    width: "100%",
    height: "100%",
    borderRadius: 26,
    overflow: "hidden",
    background: "#000",
    display: "grid",
    placeItems: "center",
  },
  phoneScreenSquare: {
    width: "100%",
    aspectRatio: "1 / 1",
    borderRadius: 26,
    overflow: "hidden",
    background: "#000",
    display: "grid",
    placeItems: "center",
  },
  video: { width: "100%", height: "100%", objectFit: "cover" },

  error: {
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(240,120,120,0.4)",
    background: "rgba(240,80,80,0.08)",
    color: "#ffd6d6",
    fontSize: 13,
  },

  statusBox: {
    marginTop: 12,
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    fontSize: 13,
  },

  resultBox: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
    marginTop: 14,
  },
  resultTitle: { fontWeight: 700, marginBottom: 6 },
  resultHint: { opacity: 0.8, fontSize: 13 },
};

/* ========= Small UI helpers ========= */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "rgba(0,0,0,0.25)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 14,
        padding: 14,
      }}
    >
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
    <button
      onClick={onClick}
      style={{ ...S.chip, ...(active ? S.chipActive : null) }}
    >
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
        outline: active ? "2px solid #7aa2ff" : "none",
      }}
    >
      {/* You can replace with <Image /> if you use next/image and copy files to /public */}
      <img src={img} alt={label} style={S.toneImg} />
      <div style={S.toneLabel}>{label}</div>
    </div>
  );
}

function Choice({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        ...S.choice,
        outline: active ? "2px solid #7aa2ff" : "none",
      }}
    >
      {label}
    </div>
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
  return (
    <div style={S.chatWrap}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSend();
        }}
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          padding: "12px 14px",
          color: "#e8eefc",
        }}
      />
      <button style={S.primary} onClick={onSend}>
        Send
      </button>
    </div>
  );
}

function PhoneShell({
  url,
  orientation,
}: {
  url?: string | null;
  orientation: "vertical" | "horizontal" | "square";
}) {
  const screenStyle =
    orientation === "horizontal"
      ? S.phoneScreenHorizontal
      : orientation === "square"
      ? S.phoneScreenSquare
      : S.phoneScreen;

  return (
    <div style={S.phoneShell}>
      <div style={screenStyle}>
        {url ? (
          <video src={url} style={S.video} controls autoPlay loop />
        ) : (
          <div style={{ opacity: 0.6, fontSize: 13 }}>Waiting for preview…</div>
        )}
      </div>
    </div>
  );
}

