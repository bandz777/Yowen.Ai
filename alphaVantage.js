// Optional: pre-scored macro news sentiment via Alpha Vantage's NEWS_SENTIMENT
// endpoint (alphavantage.co). Free tier is only ~25 requests/day, so this is
// cached hard (see routes) and the app works fine without it — the AI
// briefing can read raw headlines and reason about tone itself.

export async function fetchMacroSentiment() {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) return null;

  const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=economy_macro,finance&limit=20&apikey=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Alpha Vantage HTTP ${res.status}`);
  const json = await res.json();
  const feed = json.feed || [];

  return feed.slice(0, 10).map((a) => ({
    title: a.title,
    source: a.source,
    url: a.url,
    sentimentScore: Number(a.overall_sentiment_score),
    sentimentLabel: a.overall_sentiment_label,
  }));
}
