// Live FX quotes via Twelve Data (twelvedata.com).
// Free tier: 800 calls/day, 8 calls/min — one batched call covers all pairs.

export const PAIRS = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "USD/CHF",
  "AUD/USD",
  "USD/CAD",
  "NZD/USD",
  "EUR/JPY",
];

export async function fetchQuotes() {
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key) throw new Error("Missing TWELVE_DATA_API_KEY");

  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(PAIRS.join(","))}&apikey=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Twelve Data HTTP ${res.status}`);
  const raw = await res.json();

  // Twelve Data returns a single quote object for one symbol, or a map of
  // {symbol: quote} for a batched multi-symbol request.
  const map = raw.symbol ? { [raw.symbol]: raw } : raw;

  return PAIRS.map((symbol) => {
    const q = map[symbol];
    if (!q || q.status === "error") {
      return { symbol, price: null, error: q?.message || "unavailable" };
    }
    return {
      symbol,
      price: Number(q.close),
      open: Number(q.open),
      high: Number(q.high),
      low: Number(q.low),
      previousClose: Number(q.previous_close),
      changePct: Number(q.percent_change),
      datetime: q.datetime,
      isMarketOpen: Boolean(q.is_market_open),
    };
  });
}
