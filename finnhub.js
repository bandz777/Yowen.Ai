// Economic calendar + forex news via Finnhub (finnhub.io). Free tier: ~60 calls/min.
//
// Note: Finnhub occasionally moves endpoints between free/paid tiers, and
// exact field names have shifted across API versions. If /calendar/economic
// starts returning 403 on your key, that endpoint has likely gone premium —
// swap in an alternative (e.g. Trading Economics' paid API, or FMP's
// economic calendar) here without touching any route or the frontend.

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD", "CNY"];

export async function fetchEconomicCalendar(fromDate, toDate) {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error("Missing FINNHUB_API_KEY");

  const url = `https://finnhub.io/api/v1/calendar/economic?from=${fromDate}&to=${toDate}&token=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub calendar HTTP ${res.status}`);
  const json = await res.json();
  const events = json.economicCalendar || json.events || [];

  return events
    .filter((e) => CURRENCIES.includes(e.country || e.currency))
    .map((e) => ({
      date: (e.time || e.date || "").slice(0, 10),
      time: e.time || null,
      label: e.event,
      currency: e.country || e.currency,
      impact: (e.impact || "low").toLowerCase(),
      actual: e.actual ?? null,
      estimate: e.estimate ?? null,
      previous: e.prev ?? e.previous ?? null,
    }))
    .sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
}

export async function fetchForexNews() {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error("Missing FINNHUB_API_KEY");

  const url = `https://finnhub.io/api/v1/news?category=forex&token=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub news HTTP ${res.status}`);
  const json = await res.json();

  return json.slice(0, 12).map((n) => ({
    id: n.id,
    headline: n.headline,
    summary: n.summary,
    source: n.source,
    url: n.url,
    datetime: n.datetime ? new Date(n.datetime * 1000).toISOString() : null,
  }));
}
