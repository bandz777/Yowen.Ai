import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  YAxis,
  Line,
  LineChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  RefreshCw,
  Clock,
  Newspaper,
  CalendarDays,
  Globe,
  AlertCircle,
  WifiOff,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";

/* ----------------------------- design tokens ----------------------------- */

const C = {
  ink: "#0A0F1C",
  panel: "#111A2E",
  panelAlt: "#0D1526",
  border: "#22304F",
  borderSoft: "#1A2540",
  text: "#E7ECF6",
  textDim: "#8A96B5",
  textFaint: "#576087",
  amber: "#E8A33D",
  teal: "#39D6A6",
  coral: "#EA6B6B",
  cyan: "#4FB3E8",
  violet: "#9B8CF2",
};

const PAIR_LIST = ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD", "EUR/JPY"];

const SESSIONS = [
  { name: "Sydney", start: 22, end: 7, color: C.violet },
  { name: "Tokyo", start: 0, end: 9, color: C.cyan },
  { name: "London", start: 8, end: 17, color: C.teal },
  { name: "New York", start: 13, end: 22, color: C.amber },
];

const BIAS_COLOR = { Bullish: C.teal, Bearish: C.coral, Neutral: C.textDim, Somewhat_Bullish: C.teal, Somewhat_Bearish: C.coral };

/* -------------------------------- helpers -------------------------------- */

function isJPY(symbol) {
  return symbol.endsWith("JPY");
}
function fmtPrice(symbol, price) {
  if (price == null || Number.isNaN(price)) return "—";
  return isJPY(symbol) ? price.toFixed(3) : price.toFixed(5);
}
function utcHourFloat(d) {
  return d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
}
function isActiveAt(sess, hourFloat) {
  if (sess.start < sess.end) return hourFloat >= sess.start && hourFloat < sess.end;
  return hourFloat >= sess.start || hourFloat < sess.end;
}
function daysUntil(dateStr, now) {
  if (!dateStr) return "";
  const target = new Date(dateStr + "T00:00:00Z");
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const diff = Math.round((target - today) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 0) return "Past";
  return `In ${diff}d`;
}
function fmtClock(d) {
  return d.toISOString().slice(11, 19) + " UTC";
}

async function getJSON(path, opts) {
  const res = await fetch(`${API_BASE_URL}${path}`, opts);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/* -------------------------------- header -------------------------------- */

function Header({ now, activeSessions, connected }) {
  return (
    <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: C.border }}>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md" style={{ background: `linear-gradient(135deg, ${C.amber}, ${C.coral})` }}>
          <Globe size={18} color={C.ink} strokeWidth={2.5} />
        </div>
        <div>
          <div className="text-lg font-semibold tracking-tight" style={{ color: C.text, fontFamily: "'Space Grotesk', sans-serif" }}>
            Meridian FX
          </div>
          <div className="text-[11px] uppercase tracking-widest" style={{ color: C.textFaint }}>
            macro desk — context, not signals
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-md border px-3 py-1.5" style={{ borderColor: connected ? C.border : C.coral, background: C.panelAlt }}>
          {connected ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: C.teal }} /> : <WifiOff size={13} color={C.coral} />}
          <span className="text-xs" style={{ color: connected ? C.textDim : C.coral }}>
            {connected ? "Backend connected" : "Backend unreachable"}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-md border px-3 py-1.5" style={{ borderColor: C.border, background: C.panelAlt }}>
          <Clock size={14} color={C.cyan} />
          <span className="font-mono text-sm tabular-nums" style={{ color: C.text }}>
            {fmtClock(now)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- session tide ----------------------------- */

function SessionTide({ now, activeSessions }) {
  const hourFloat = utcHourFloat(now);
  const nowPct = (hourFloat / 24) * 100;

  const overlapNote = useMemo(() => {
    const names = activeSessions.map((s) => s.name);
    const has = (a, b) => names.includes(a) && names.includes(b);
    if (has("London", "New York")) return "London / New York overlap — peak liquidity window";
    if (has("Tokyo", "London")) return "Tokyo / London overlap";
    if (has("Sydney", "Tokyo")) return "Sydney / Tokyo overlap";
    if (names.length === 1) return `${names[0]} session driving flow`;
    return "Quiet — between major sessions";
  }, [activeSessions]);

  return (
    <div className="border-b px-5 py-4" style={{ borderColor: C.border }}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: C.textFaint }}>
          Session Tide
        </span>
        <span className="text-xs" style={{ color: C.textDim }}>
          {overlapNote}
        </span>
      </div>
      <div className="space-y-1.5">
        {SESSIONS.map((sess) => {
          const active = isActiveAt(sess, hourFloat);
          const segments = sess.start < sess.end ? [[sess.start, sess.end]] : [[sess.start, 24], [0, sess.end]];
          return (
            <div key={sess.name} className="flex items-center gap-3">
              <div className="w-16 shrink-0 text-right text-[11px]" style={{ color: active ? C.text : C.textFaint }}>
                {sess.name}
              </div>
              <div className="relative h-3 flex-1 overflow-hidden rounded-full" style={{ background: C.panelAlt }}>
                {segments.map(([s, e], i) => (
                  <div
                    key={i}
                    className="absolute top-0 h-full rounded-full"
                    style={{ left: `${(s / 24) * 100}%`, width: `${((e - s) / 24) * 100}%`, background: sess.color, opacity: active ? 0.85 : 0.28 }}
                  />
                ))}
                <div className="absolute top-[-3px] h-[18px] w-[2px] rounded" style={{ left: `${nowPct}%`, background: C.text, boxShadow: `0 0 6px ${C.text}` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-mono" style={{ color: C.textFaint }}>
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>24:00</span>
      </div>
    </div>
  );
}

/* ------------------------------ price board ------------------------------ */

function PairCard({ symbol, quote, isFeatured, onClick }) {
  const up = quote && quote.changePct != null ? quote.changePct >= 0 : true;
  const history = quote?.history || [];
  const chartData = history.map((v, i) => ({ i, v }));

  return (
    <button
      onClick={onClick}
      className="flex flex-col rounded-lg border p-3 text-left transition-colors"
      style={{ borderColor: isFeatured ? C.amber : C.border, background: isFeatured ? "rgba(232,163,61,0.06)" : C.panelAlt }}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: C.text, fontFamily: "'Space Grotesk', sans-serif" }}>
          {symbol}
        </span>
        {quote?.error ? <AlertCircle size={14} color={C.textFaint} /> : up ? <TrendingUp size={14} color={C.teal} /> : <TrendingDown size={14} color={C.coral} />}
      </div>
      <div className="font-mono text-lg tabular-nums" style={{ color: C.text }}>
        {quote ? fmtPrice(symbol, quote.price) : "…"}
      </div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-mono" style={{ color: up ? C.teal : C.coral }}>
          {quote?.changePct != null ? `${quote.changePct > 0 ? "+" : ""}${quote.changePct.toFixed(2)}%` : quote?.error ? "unavailable" : "…"}
        </span>
      </div>
      <div className="h-8">
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line type="monotone" dataKey="v" stroke={up ? C.teal : C.coral} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center text-[10px]" style={{ color: C.textFaint }}>
            building chart…
          </div>
        )}
      </div>
    </button>
  );
}

function FeaturedPanel({ symbol, quote, activeSessions }) {
  const history = quote?.history || [];
  const chartData = history.map((v, i) => ({ i, v }));
  const up = quote && quote.changePct != null ? quote.changePct >= 0 : true;
  const min = history.length ? Math.min(...history) : null;
  const max = history.length ? Math.max(...history) : null;

  const contextLine =
    activeSessions.length >= 2
      ? `Trading inside the ${activeSessions.map((s) => s.name).join("/")} overlap — expect thicker liquidity and sharper reactions to headlines.`
      : activeSessions.length === 1
      ? `${activeSessions[0].name} session is driving current flow; ranges tend to be tighter outside session overlaps.`
      : "Between major sessions — liquidity is thinner and moves can look noisier than they are.";

  return (
    <div className="rounded-lg border p-4" style={{ borderColor: C.border, background: C.panelAlt }}>
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="text-sm" style={{ color: C.textDim }}>
            {symbol}
          </div>
          <div className="font-mono text-3xl tabular-nums" style={{ color: C.text }}>
            {quote ? fmtPrice(symbol, quote.price) : "…"}
          </div>
          <div className="mt-1 font-mono text-sm" style={{ color: up ? C.teal : C.coral }}>
            {quote?.changePct != null ? `${up ? "▲" : "▼"} ${quote.changePct.toFixed(2)}% today` : "waiting on data…"}
          </div>
        </div>
        {min != null && (
          <div className="text-right text-xs font-mono" style={{ color: C.textFaint }}>
            <div>Session high {fmtPrice(symbol, max)}</div>
            <div>Session low {fmtPrice(symbol, min)}</div>
          </div>
        )}
      </div>

      <div className="h-40">
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="fillFeatured" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={up ? C.teal : C.coral} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={up ? C.teal : C.coral} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis domain={["dataMin", "dataMax"]} hide />
              <RechartsTooltip
                contentStyle={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                labelFormatter={() => ""}
                formatter={(v) => [fmtPrice(symbol, v), symbol]}
              />
              <Area type="monotone" dataKey="v" stroke={up ? C.teal : C.coral} strokeWidth={2} fill="url(#fillFeatured)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs" style={{ color: C.textFaint }}>
            Chart fills in as live polls come in — check back in a minute.
          </div>
        )}
      </div>
      <p className="mt-3 text-xs leading-relaxed" style={{ color: C.textDim }}>
        {contextLine}
      </p>
    </div>
  );
}

/* ------------------------------- calendar ------------------------------- */

function CalendarPanel({ now, events, loading, error }) {
  const upcoming = (events || []).filter((e) => daysUntil(e.date, now) !== "Past");
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: C.border, background: C.panelAlt }}>
      <div className="mb-3 flex items-center gap-2">
        <CalendarDays size={14} color={C.amber} />
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: C.textFaint }}>
          Macro Calendar
        </span>
      </div>
      {loading && <p className="text-xs" style={{ color: C.textFaint }}>Loading calendar…</p>}
      {error && <p className="text-xs" style={{ color: C.coral }}>{error}</p>}
      {!loading && !error && upcoming.length === 0 && (
        <p className="text-xs" style={{ color: C.textFaint }}>No events returned for this window.</p>
      )}
      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {upcoming.map((e, i) => {
          const dEta = daysUntil(e.date, now);
          return (
            <div key={i} className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-2" style={{ borderColor: C.borderSoft }}>
              <div className="min-w-0">
                <div className="truncate text-xs" style={{ color: C.text }}>
                  {e.label}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span
                    className="rounded px-1 py-0.5 text-[9px] font-semibold"
                    style={{
                      color: e.impact === "high" ? C.coral : C.cyan,
                      background: e.impact === "high" ? "rgba(234,107,107,0.12)" : "rgba(79,179,232,0.12)",
                    }}
                  >
                    {(e.impact || "low").toUpperCase()}
                  </span>
                  <span className="text-[10px]" style={{ color: C.textFaint }}>
                    {e.currency}
                  </span>
                  {e.actual != null && (
                    <span className="text-[10px]" style={{ color: C.textFaint }}>
                      actual {e.actual} · est {e.estimate ?? "—"} · prev {e.previous ?? "—"}
                    </span>
                  )}
                </div>
              </div>
              <span className="shrink-0 rounded px-2 py-1 text-[10px] font-mono" style={{ color: dEta === "Today" ? C.ink : C.textDim, background: dEta === "Today" ? C.amber : "transparent" }}>
                {dEta}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------- sentiment ------------------------------- */

function SentimentPanel({ news, sentiment, loading, error }) {
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: C.border, background: C.panelAlt }}>
      <div className="mb-3 flex items-center gap-2">
        <Newspaper size={14} color={C.cyan} />
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: C.textFaint }}>
          Sentiment Feed
        </span>
      </div>
      {loading && <p className="text-xs" style={{ color: C.textFaint }}>Loading news…</p>}
      {error && <p className="text-xs" style={{ color: C.coral }}>{error}</p>}

      {!loading && !error && (
        <>
          <div className="space-y-2 mb-3">
            {(news || []).slice(0, 6).map((n, i) => (
              <a key={i} href={n.url} target="_blank" rel="noreferrer" className="block rounded-md border px-3 py-2 hover:opacity-90" style={{ borderColor: C.borderSoft }}>
                <div className="mb-0.5 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono" style={{ color: C.textFaint }}>{n.source}</span>
                </div>
                <div className="text-xs font-semibold" style={{ color: C.text }}>{n.headline}</div>
              </a>
            ))}
            {(!news || news.length === 0) && <p className="text-xs" style={{ color: C.textFaint }}>No headlines returned right now.</p>}
          </div>

          {sentiment ? (
            <div className="space-y-1.5 border-t pt-3" style={{ borderColor: C.borderSoft }}>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: C.textFaint }}>Scored sentiment</div>
              {sentiment.slice(0, 5).map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11px]" style={{ color: C.textDim }}>{s.title}</span>
                  <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase" style={{ color: BIAS_COLOR[s.sentimentLabel] || C.textDim, background: "rgba(255,255,255,0.04)" }}>
                    {(s.sentimentLabel || "n/a").replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="border-t pt-3 text-[11px]" style={{ borderColor: C.borderSoft, color: C.textFaint }}>
              Add ALPHA_VANTAGE_API_KEY on the backend for scored sentiment.
            </p>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------ AI briefing ------------------------------ */

function AIBriefing() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedAt, setGeneratedAt] = useState(null);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const data = await getJSON("/api/briefing", { method: "POST" });
      setText(data.text);
      setGeneratedAt(new Date(data.generatedAt));
    } catch (e) {
      setError(e.message || "Couldn't generate a briefing just now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border p-4" style={{ borderColor: C.violet + "55", background: "rgba(155,140,242,0.05)" }}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} color={C.violet} />
          <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: C.textFaint }}>
            AI Macro Briefing
          </span>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-opacity disabled:opacity-60"
          style={{ background: C.violet, color: C.ink }}
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          {loading ? "Synthesizing…" : text ? "Regenerate" : "Generate"}
        </button>
      </div>

      {!text && !loading && !error && (
        <p className="text-xs leading-relaxed" style={{ color: C.textDim }}>
          Pulls live prices, the calendar, and the news feed on the backend into one short, plain-language read of what's driving the market — context, never a signal.
        </p>
      )}
      {error && (
        <div className="flex items-start gap-2 text-xs" style={{ color: C.coral }}>
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {text && (
        <div>
          <p className="text-[13px] leading-relaxed" style={{ color: C.text }}>{text}</p>
          <div className="mt-3 flex items-center justify-between text-[10px]" style={{ color: C.textFaint }}>
            <span>Generated {generatedAt ? fmtClock(generatedAt) : ""}</span>
            <span>AI-generated context — not financial advice</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- app --------------------------------- */

export default function App() {
  const [now, setNow] = useState(new Date());
  const [featured, setFeatured] = useState("EUR/USD");
  const [connected, setConnected] = useState(true);

  const [quotes, setQuotes] = useState({});
  const [pricesError, setPricesError] = useState("");

  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState("");

  const [news, setNews] = useState([]);
  const [sentiment, setSentiment] = useState(null);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState("");

  const historyRef = useRef({});

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const loadPrices = useCallback(async () => {
    try {
      const res = await getJSON("/api/prices");
      setConnected(true);
      setPricesError("");
      const next = {};
      for (const q of res.data) {
        const prevHistory = historyRef.current[q.symbol] || [];
        const history = q.price != null ? [...prevHistory.slice(-39), q.price] : prevHistory;
        historyRef.current[q.symbol] = history;
        next[q.symbol] = { ...q, history, stale: res.stale };
      }
      setQuotes(next);
    } catch (e) {
      setConnected(false);
      setPricesError(e.message);
    }
  }, []);

  const loadCalendar = useCallback(async () => {
    setCalendarLoading(true);
    try {
      const res = await getJSON("/api/calendar?days=14");
      setCalendarEvents(res.data);
      setCalendarError("");
    } catch (e) {
      setCalendarError(e.message);
    } finally {
      setCalendarLoading(false);
    }
  }, []);

  const loadNews = useCallback(async () => {
    setNewsLoading(true);
    try {
      const res = await getJSON("/api/news");
      setNews(res.news);
      setSentiment(res.sentiment);
      setNewsError("");
    } catch (e) {
      setNewsError(e.message);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrices();
    loadCalendar();
    loadNews();
    const priceId = setInterval(loadPrices, 20_000);
    const calId = setInterval(loadCalendar, 30 * 60_000);
    const newsId = setInterval(loadNews, 10 * 60_000);
    return () => {
      clearInterval(priceId);
      clearInterval(calId);
      clearInterval(newsId);
    };
  }, [loadPrices, loadCalendar, loadNews]);

  const activeSessions = useMemo(() => {
    const hf = utcHourFloat(now);
    return SESSIONS.filter((s) => isActiveAt(s, hf));
  }, [now]);

  return (
    <div className="min-h-screen w-full" style={{ background: C.ink }}>
      <Header now={now} activeSessions={activeSessions} connected={connected} />
      <SessionTide now={now} activeSessions={activeSessions} />

      {!connected && (
        <div className="mx-4 mt-4 rounded-md border px-3 py-2 text-xs" style={{ borderColor: C.coral, color: C.coral, background: "rgba(234,107,107,0.08)" }}>
          Can't reach the backend at {API_BASE_URL}. Start it (npm run dev in meridian-fx-backend) or check VITE_API_BASE_URL. {pricesError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest" style={{ color: C.textFaint }}>
              Price Board
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PAIR_LIST.map((symbol) => (
                <PairCard key={symbol} symbol={symbol} quote={quotes[symbol]} isFeatured={symbol === featured} onClick={() => setFeatured(symbol)} />
              ))}
            </div>
          </div>
          <FeaturedPanel symbol={featured} quote={quotes[featured]} activeSessions={activeSessions} />
        </div>

        <div className="space-y-4 lg:col-span-5">
          <CalendarPanel now={now} events={calendarEvents} loading={calendarLoading} error={calendarError} />
          <SentimentPanel news={news} sentiment={sentiment} loading={newsLoading} error={newsError} />
          <AIBriefing />
        </div>
      </div>

      <div className="border-t px-5 py-3 text-center text-[10px]" style={{ borderColor: C.border, color: C.textFaint }}>
        Live data via Twelve Data &amp; Finnhub, polled on the backend and cached to stay inside free-tier limits · free-tier
        quotes can run a few minutes delayed · educational context only, not financial advice.
      </div>
    </div>
  );
}
