# Meridian FX — frontend

The real, deployable version of the dashboard — same design as the in-chat
preview, but wired to the [meridian-fx-backend](../meridian-fx-backend) API
instead of simulated data. This is a normal Vite + React app; it runs in any
browser, not just inside Claude.ai.

## Setup

```bash
npm install
cp .env.example .env
# .env: point VITE_API_BASE_URL at your backend (defaults to localhost:8787)
npm run dev
```

Make sure `meridian-fx-backend` is running first (see its own README) — this
app has nothing to show without it.

## Build & deploy

```bash
npm run build   # outputs static files to dist/
npm run preview # sanity-check the production build locally
```

`dist/` is a static site — deploy it anywhere (Vercel, Netlify, Cloudflare
Pages, S3+CloudFront). Set `VITE_API_BASE_URL` as a build-time environment
variable on whichever host you use, pointed at your deployed backend's URL.
And on the backend side, set `ALLOWED_ORIGIN` to this frontend's deployed
URL so CORS allows the connection.

## Why this couldn't just run inside the Claude.ai artifact

The dashboard artifact shown earlier in this chat is a browser-sandboxed
preview — it can only reach Anthropic's API, not an arbitrary backend URL.
This project is the unrestricted version: a real app, calling a real API,
that you run and deploy yourself.

## What's live vs. simulated now

Everything — price board, calendar, news, sentiment, and the AI briefing —
now reads from the backend's live provider calls instead of fixtures. The
one thing that's still "simulated" in spirit: each pair's sparkline is built
client-side from successive 20-second polls, since free-tier quote endpoints
return a snapshot, not a tick stream. It'll look sparse for the first minute
after you open the app and fill in from there.
