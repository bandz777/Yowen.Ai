// Server-side call to Claude for the macro briefing. Keeping this on the
// backend means ANTHROPIC_API_KEY never reaches the browser.

export async function generateBriefing({ prices, calendar, news, sentiment }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Missing ANTHROPIC_API_KEY");

  const priceLines = prices
    .map((p) => (p.price != null ? `${p.symbol} ${p.price} (${p.changePct > 0 ? "+" : ""}${p.changePct}%)` : `${p.symbol} unavailable`))
    .join(", ");

  const calendarLines = calendar
    .slice(0, 5)
    .map((e) => `${e.label} [${e.currency}, ${e.impact} impact, ${e.date}]`)
    .join("; ");

  const newsLines = news
    .slice(0, 6)
    .map((n) => `${n.headline} — ${n.summary}`)
    .join(" | ");

  const sentimentLines = sentiment
    ? sentiment.slice(0, 5).map((s) => `${s.title} (${s.sentimentLabel})`).join(" | ")
    : "not available";

  const prompt = `Live price snapshot: ${priceLines}.
Upcoming calendar (high/medium impact): ${calendarLines}.
Recent forex headlines: ${newsLines}.
Scored sentiment signals: ${sentimentLines}.

Write a concise macro context briefing (110-150 words) for a discretionary FX trader. Connect the calendar and news to what the price action is likely reflecting. Note what to watch next and why it matters. Do not issue a buy/sell recommendation, price target, or trade signal — describe context and risk only. Plain, professional desk tone, no headers, no hype.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      system:
        "You are a macro FX analyst writing internal desk notes. You explain market context clearly and never issue trade signals, price targets, or buy/sell calls.",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API HTTP ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}
