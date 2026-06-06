import "dotenv/config";
import cors from "cors";
import express from "express";
import cron from "node-cron";
import path from "path";
import { fileURLToPath } from "url";
import type { CostLevel, Filters } from "../../src/providers/types";
import { AiRanker } from "./aiRanker";
import { createDb } from "./db";
import { EventStore } from "./eventStore";
import { NodeFetchAdapter } from "./NodeFetchAdapter";
import { PipelineRunner } from "./pipelineRunner";
import { proxyHandler } from "./proxy";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const app = express();

app.use(cors());
app.use(express.json());

// Initialize database
const db = createDb();
const store = new EventStore(db);
const fetchAdapter = new NodeFetchAdapter();
const pipelineRunner = new PipelineRunner(db, fetchAdapter);
const aiRanker = new AiRanker();

// --- API Routes ---

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Get activities for a specific date
app.get("/api/activities", async (req, res) => {
  const date = (req.query.date as string) ?? new Date().toISOString().slice(0, 10);
  const filters = parseFilters(req.query);
  const activities = store.getActivities(date, filters);

  if (aiRanker.isAvailable() && activities.length > 10) {
    const ranked = await aiRanker.rank(activities, {
      childAge: filters?.ageOfChild,
      date: new Date(date),
      preferences: filters?.category ? [filters.category] : undefined,
    });
    res.json({ date, count: ranked.length, activities: ranked, aiRanked: true });
    return;
  }

  res.json({ date, count: activities.length, activities });
});

// Get activities for a date range (weekend, week, etc.)
app.get("/api/activities/range", (req, res) => {
  const from = req.query.from as string;
  const to = req.query.to as string;
  if (!from || !to) {
    res.status(400).json({ error: "from and to query params required" });
    return;
  }
  const filters = parseFilters(req.query);
  const activities = store.getActivitiesByDateRange(from, to, filters);
  res.json({ from, to, count: activities.length, activities });
});

// Database stats
app.get("/api/stats", (_req, res) => {
  const stats = store.getStats();
  res.json(stats);
});

// Pipeline status
app.get("/api/pipeline/status", (_req, res) => {
  const runs = pipelineRunner.getLastRuns(5);
  const scraperStatus = pipelineRunner.getScraperStatus();
  res.json({ runs, scraperStatus });
});

// Manually trigger a pipeline run
app.post("/api/pipeline/run", async (req, res) => {
  const daysAhead = parseInt(req.body?.daysAhead ?? "14", 10);
  const sources = req.body?.sources as string[] | undefined;

  const dateFrom = new Date();
  const dateTo = new Date();
  dateTo.setDate(dateTo.getDate() + daysAhead);

  console.log(
    `[Pipeline] Manual run triggered: ${dateFrom.toISOString().slice(0, 10)} to ${dateTo.toISOString().slice(0, 10)}` +
    (sources ? ` (sources: ${sources.join(", ")})` : " (all sources)")
  );

  try {
    const result = await pipelineRunner.run(dateFrom, dateTo, sources);
    console.log(`[Pipeline] Completed: ${result.inserted} new, ${result.updated} updated, ${result.errors.length} errors (${result.durationMs}ms)`);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pipeline run failed";
    console.error(`[Pipeline] Failed: ${message}`);
    res.status(500).json({ error: message });
  }
});

// Proxy for scraper fetches (used by client-side scrapers if needed)
app.get("/api/proxy", proxyHandler);

// Serve frontend in production
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, "..", "..", "dist");
app.use(express.static(distPath));
app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// --- Cron Jobs ---

// Run pipeline daily at 6:00 AM
cron.schedule("0 6 * * *", async () => {
  console.log("[Cron] Starting daily pipeline run...");
  const dateFrom = new Date();
  const dateTo = new Date();
  dateTo.setDate(dateTo.getDate() + 14);

  try {
    const result = await pipelineRunner.run(dateFrom, dateTo);
    console.log(
      `[Cron] Pipeline completed: ${result.inserted} new, ${result.updated} updated (${result.durationMs}ms)`
    );
  } catch (err) {
    console.error("[Cron] Pipeline failed:", err);
  }
});

// Also run a shorter scrape every 4 hours for the next 3 days
cron.schedule("0 */4 * * *", async () => {
  console.log("[Cron] Starting short-range pipeline run...");
  const dateFrom = new Date();
  const dateTo = new Date();
  dateTo.setDate(dateTo.getDate() + 3);

  try {
    const result = await pipelineRunner.run(dateFrom, dateTo);
    console.log(
      `[Cron] Short-range completed: ${result.inserted} new, ${result.updated} updated (${result.durationMs}ms)`
    );
  } catch (err) {
    console.error("[Cron] Short-range pipeline failed:", err);
  }
});

// --- Start ---

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/activities`);
  console.log(`Pipeline: POST http://localhost:${PORT}/api/pipeline/run`);
  console.log(`AI Ranking: ${aiRanker.isAvailable() ? "enabled" : "disabled (no OPENAI_API_KEY)"}`);
  console.log("Cron: daily at 6:00 AM + every 4 hours (3-day window)");
});

// --- Helpers ---

function parseFilters(query: Record<string, unknown>): Filters | undefined {
  const filters: Filters = {};
  let hasFilter = false;

  if (query.category) {
    filters.category = query.category as Filters["category"];
    hasFilter = true;
  }
  if (query.age) {
    filters.ageOfChild = parseInt(query.age as string, 10);
    hasFilter = true;
  }
  if (query.cost) {
    filters.cost = (query.cost as string).split(",") as CostLevel[];
    hasFilter = true;
  }
  if (query.indoor === "true") {
    filters.indoorOnly = true;
    hasFilter = true;
  }
  if (query.rainy === "true") {
    filters.rainyDay = true;
    hasFilter = true;
  }
  if (query.stroller === "true") {
    filters.strollerFriendly = true;
    hasFilter = true;
  }

  return hasFilter ? filters : undefined;
}
