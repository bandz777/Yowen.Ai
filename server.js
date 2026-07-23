import "dotenv/config";
import express from "express";
import cors from "cors";

import pricesRouter from "./src/routes/prices.js";
import calendarRouter from "./src/routes/calendar.js";
import newsRouter from "./src/routes/news.js";
import briefingRouter from "./src/routes/briefing.js";

const app = express();

app.use(express.json());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));

app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use("/api/prices", pricesRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/news", newsRouter);
app.use("/api/briefing", briefingRouter);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`Meridian FX backend listening on :${port}`);
});
