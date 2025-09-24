// lib/openai.ts
export async function generateCopy(prompt: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY missing');

  const body = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You write concise ad scripts, punchy captions, and 10 relevant hashtags." },
      { role: "user", content: `Brief: ${prompt}\nReturn JSON with keys: script, caption, hashtags (array).` }
    ],
    temperature: 0.7,
  };

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
    body: JSON.stringify(body)
  });

  if (!r.ok) throw new Error(`OpenAI error: ${r.status}`);

  const j = await r.json();
  const text = j.choices?.[0]?.message?.content ?? "";

  try {
    const parsed = JSON.parse(text);
    return {
      script: parsed.script || "",
      caption: parsed.caption || "",
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : []
    };
  } catch {
    return { script: text.trim(), caption: "", hashtags: [] };
  }
}
