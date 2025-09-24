import React, { useMemo, useState } from "react";
import Typewriter from "../components/Typewriter";
import OrionChat from "../components/OrionChat";
import StepTone from "../components/steps/StepTone";
import StepFormats from "../components/steps/StepFormats";
import StepVoiceMusic from "../components/steps/StepVoiceMusic";
import StepReview from "../components/steps/StepReview";

type Tone =
  | "Elegant"
  | "Bold"
  | "Energetic"
  | "Friendly"
  | "Professional"
  | "Cinematic"
  | "Commercial";

type Formats = {
  reel?: boolean;
  story?: boolean;
  square?: boolean;
  wide?: boolean;
  carousel?: boolean;
  mode: "video" | "photo";
};

type CopyOut = {
  script?: string;
  caption?: string;
  hashtags?: string[];
};

type Preview = {
  url?: string | null;
};

type Brand = {
  name?: string;
  website?: string;
  notes?: string;
};

type Media = {
  logoFile?: File | null;
  logoUrl?: string | null;
};

type WizardState = {
  step: number; // 0 tone, 1 formats, 2 voice/music, 3 review
  description?: string;
  brand: Brand;
  media: Media;
  tone?: Tone;
  formats: Formats;
  voice: boolean;
  music: boolean;
  copy: CopyOut;
  preview: Preview;
  orionTip?: string; // short mini reply above chat
};

const initialState: WizardState = {
  step: 0,
  brand: {},
  media: {},
  formats: { mode: "video", reel: true }, // Reel preselected
  voice: false,
  music: false,
  copy: {},
  preview: {},
};

export default function Home() {
  const [s, setS] = useState<WizardState>(initialState);

  function next() {
    setS((p) => ({ ...p, step: Math.min(3, p.step + 1) }));
  }
  function back() {
    setS((p) => ({ ...p, step: Math.max(0, p.step - 1) }));
  }

  // --- CHAT handlers (single sticky bar everywhere) ---
  async function handleChatSubmit(message: string) {
    // Simple routing by step history:
    if (!s.description) {
      setS((p) => ({
        ...p,
        description: message,
        orionTip:
          "Great! Add your business name, website, or any note—attach a logo if you’d like.",
      }));
      return;
    }

    // heuristics: if looks like URL -> website, else store as notes or brand name
    if (!s.brand.name) {
      setS((p) => ({
        ...p,
        brand: { ...p.brand, name: message },
        orionTip: "Got it—now drop your website (or say 'skip').",
      }));
      return;
    }

    if (!s.brand.website) {
      const looksUrl = /^https?:\/\//i.test(message);
      setS((p) => ({
        ...p,
        brand: { ...p.brand, website: looksUrl ? message : undefined, notes: looksUrl ? p.brand.notes : message },
        orionTip:
          "Thanks! When you’re ready, choose a Tone/Style above to continue.",
      }));
      return;
    }

    // If everything filled, store as extra notes:
    setS((p) => ({
      ...p,
      brand: { ...p.brand, notes: p.brand.notes ? p.brand.notes + " " + message : message },
      orionTip: "Noted. You can keep chatting, or move on to the next step.",
    }));
  }

  function handleAttach(files: File[]) {
    if (!files?.length) return;
    const file = files[0];
    const url = URL.createObjectURL(file);
    setS((p) => ({
      ...p,
      media: { ...p.media, logoFile: file, logoUrl: url },
      orionTip: "Logo received! We’ll include it in your preview.",
    }));
  }

  // --- Tone Auto-advance ---
  function setToneAndNext(tone: Tone) {
    setS((p) => ({ ...p, tone, orionTip: `Tone set to ${tone}. Next, pick your formats.` }));
    next();
  }

  // --- Formats Auto-advance when valid ---
  function setFormatsAndMaybeNext(f: Formats, canAdvance: boolean) {
    setS((p) => ({ ...p, formats: f, orionTip: canAdvance ? "Formats noted. Toggle voice/music if you want, then continue." : p.orionTip }));
    if (canAdvance) next();
  }

  // --- Voice/Music done -> continue ---
  function setAudioAndNext(values: { voice: boolean; music: boolean }) {
    setS((p) => ({
      ...p,
      voice: values.voice,
      music: values.music,
      orionTip: "Audio preferences saved. Review & generate when ready.",
    }));
    next();
  }

  // Render current step
  const view = useMemo(() => {
    switch (s.step) {
      case 0:
        return (
          <StepTone
            onBack={undefined}
            onSelect={(tone) => setToneAndNext(tone)}
          />
        );
      case 1:
        return (
          <StepFormats
            value={s.formats}
            onBack={back}
            onChange={(f, ready) => setFormatsAndMaybeNext(f, ready)}
          />
        );
      case 2:
        return (
          <StepVoiceMusic
            value={{ voice: s.voice, music: s.music }}
            onBack={back}
            onDone={(vals) => setAudioAndNext(vals)}
          />
        );
      default:
        return (
          <StepReview
            state={s}
            onBack={back}
            onSimulated={(previewUrl, copy) =>
              setS((p) => ({ ...p, preview: { url: previewUrl }, copy: { ...p.copy, ...copy } }))
            }
            onAI={(previewUrl, copy) =>
              setS((p) => ({ ...p, preview: { url: previewUrl }, copy: { ...p.copy, ...copy } }))
            }
          />
        );
    }
  }, [s.step, s.formats, s.voice, s.music, s]);

  return (
    <main style={styles.page}>
      {/* Orion headline */}
      <Typewriter
        text={`Hi, I’m Orion — Your Social Media Manager Assistant.`}
        hint={`Tell me what you’re posting today and I’ll mock up your ad (simulated).`}
      />

      {/* Current step */}
      <section style={styles.stepBox}>{view}</section>

      {/* Mini Orion tip (shows above chat bar) */}
      {s.orionTip && <div style={styles.tip}>{s.orionTip}</div>}

      {/* Sticky chat bar */}
      <OrionChat onSubmit={handleChatSubmit} onAttach={handleAttach} />
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    paddingBottom: 140,
    color: "#E8EEFF",
    background: "radial-gradient(1200px 800px at 20% -10%, rgba(122,162,255,0.08), transparent), #0B0F1A",
  },
  stepBox: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "24px 16px 0",
  },
  tip: {
    maxWidth: 1200,
    margin: "8px auto 0",
    opacity: 0.85,
    fontSize: 13,
    padding: "8px 12px",
    borderRadius: 12,
    background: "rgba(255,255,255,.05)",
  },
};
