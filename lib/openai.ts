// lib/openai.ts
// Minimal OpenAI call that returns { script, caption, hashtags[] }
// Assumes process.env.OPENAI_API_KEY is set in Vercel

export async function generateCopy(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY missing");
  }

  // You can adjust the model and prompt format to taste
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You generate short social video copy. Reply strictly as compact JSON with keys: script, caption, hashtags (array of short tags without #).",
        },
        {
          role: "user",
          content:
            `Create script, caption, and 10 hashtags for this idea: "${prompt}". 
Return JSON only.`,
        },
      ],
      temperature: 0.7,
    }),
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`OpenAI error: ${text}`);
  }

  const data = await r.json();

  // Try to parse JSON out of the assistant message
  const msg = data?.choices?.[0]?.message?.content || "{}";
  let parsed: any;
  try {
    parsed = JSON.parse(msg);
  } catch {
    // Fallback: attempt to strip code fences
    const cleaned = msg.replace(/^```json\s*/i, "").replace(/```$/i, "");
    parsed = JSON.parse(cleaned);
  }

  const script = parsed?.script ?? "";
  const caption = parsed?.caption ?? "";
  const hashtags = Array.isArray(parsed?.hashtags) ? parsed.hashtags : [];

  // Prefix hashtags with #
  const tagged = hashtags.map((h: string) => (h.startsWith("#") ? h : `#${h}`));

  return { script, caption, hashtags: tagged };
}
