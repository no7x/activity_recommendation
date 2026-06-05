import type Database from "better-sqlite3";
import { SimpleNormalizer } from "../../src/pipeline/SimpleNormalizer";
import { SimpleDeduplicator } from "../../src/pipeline/SimpleDeduplicator";
import {
  BerlinDeScraper,
  BezirkScraper,
  FamilienportalScraper,
  FezBerlinScraper,
  HimbeerScraper,
  KindalingScraper,
  MuseumScraper,
  ZooTierparkScraper,
} from "../../src/pipeline/scrapers";
import type { FetchAdapter } from "../../src/pipeline/scrapers/fetchAdapter";
import type { EventScraper, RawEvent } from "../../src/pipeline/types";
import { EventStore } from "./eventStore";

export interface RunResult {
  total: number;
  inserted: number;
  updated: number;
  duplicatesRemoved: number;
  errors: { source: string; message: string }[];
  durationMs: number;
}

export class PipelineRunner {
  private db: Database.Database;
  private fetchAdapter: FetchAdapter;
  private normalizer = new SimpleNormalizer();
  private deduplicator = new SimpleDeduplicator();

  constructor(db: Database.Database, fetchAdapter: FetchAdapter) {
    this.db = db;
    this.fetchAdapter = fetchAdapter;
  }

  async run(dateFrom: Date, dateTo: Date, sources?: string[]): Promise<RunResult> {
    const start = Date.now();
    const store = new EventStore(this.db);
    const errors: { source: string; message: string }[] = [];

    const runId = this.db.prepare(
      "INSERT INTO pipeline_runs (status) VALUES ('running')"
    ).run().lastInsertRowid;

    const allScrapers: EventScraper[] = [
      new KindalingScraper(this.fetchAdapter),
      new HimbeerScraper(this.fetchAdapter),
      new BerlinDeScraper(this.fetchAdapter),
      new FamilienportalScraper(this.fetchAdapter),
      new FezBerlinScraper(this.fetchAdapter),
      new MuseumScraper(this.fetchAdapter),
      new ZooTierparkScraper(this.fetchAdapter),
      new BezirkScraper(this.fetchAdapter),
    ];

    const scrapers = sources
      ? allScrapers.filter((s) => sources.includes(s.source))
      : allScrapers;

    // Scrape all sources in parallel
    const allRaw: RawEvent[] = [];
    const scrapeResults = await Promise.allSettled(
      scrapers.map(async (scraper) => {
        const scraperStart = Date.now();
        try {
          const events = await scraper.scrape(dateFrom, dateTo);
          this.db.prepare(`
            INSERT OR REPLACE INTO scraper_status (source, last_run, last_success, events_found, last_error)
            VALUES (?, datetime('now'), datetime('now'), ?, NULL)
          `).run(scraper.source, events.length);
          return { source: scraper.source, events, duration: Date.now() - scraperStart };
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          this.db.prepare(`
            INSERT OR REPLACE INTO scraper_status (source, last_run, events_found, last_error)
            VALUES (?, datetime('now'), 0, ?)
          `).run(scraper.source, msg);
          throw err;
        }
      })
    );

    for (let i = 0; i < scrapeResults.length; i++) {
      const result = scrapeResults[i];
      const scraper = scrapers[i];
      if (result.status === "fulfilled") {
        allRaw.push(...result.value.events);
      } else {
        errors.push({
          source: scraper.source,
          message: result.reason?.message ?? "Scrape failed",
        });
      }
    }

    // Deduplicate
    const deduped = await this.deduplicator.deduplicate(allRaw);
    const duplicatesRemoved = allRaw.length - deduped.length;

    // Normalize and store
    let inserted = 0;
    let updated = 0;

    const upsertMany = this.db.transaction(() => {
      for (const raw of deduped) {
        try {
          const normalized = this.normalizer.normalize(raw);
          const result = store.upsertEvent({
            id: normalized.id ?? `${raw.source}-${raw.sourceId}`,
            source: raw.source,
            sourceId: raw.sourceId,
            title: normalized.title,
            description: normalized.description ?? "",
            url: raw.url,
            dateStart: raw.dateStart,
            dateEnd: raw.dateEnd,
            location: raw.location,
            neighborhood: normalized.neighborhood ?? raw.neighborhood,
            price: raw.price,
            ageMin: normalized.ageMin ?? 1,
            ageMax: normalized.ageMax ?? 12,
            category: normalized.category ?? "Outdoor",
            imageEmoji: normalized.imageEmoji ?? "🎉",
            costLevel: normalized.cost ?? "moderate",
            costNote: normalized.costNote ?? raw.price,
            isIndoor: normalized.isIndoor ?? false,
            isRainyDayFriendly: normalized.isRainyDayFriendly ?? false,
            isStrollerFriendly: normalized.isStrollerFriendly ?? false,
            bookingUrl: normalized.bookingUrl ?? raw.url,
            bookingRequired: normalized.bookingRequired ?? false,
            tags: normalized.tags ?? [],
            timeOfDay: normalized.timeOfDay ?? "afternoon",
            imageUrl: raw.imageUrl,
            rawData: JSON.stringify(raw.raw),
          });

          if (result === "inserted") inserted++;
          else updated++;
        } catch (err) {
          errors.push({
            source: raw.source,
            message: `Normalize/store failed for "${raw.title}": ${err instanceof Error ? err.message : "Unknown"}`,
          });
        }
      }
    });

    upsertMany();

    // Update pipeline run record
    this.db.prepare(`
      UPDATE pipeline_runs
      SET finished_at = datetime('now'),
          total = ?, new_count = ?, updated_count = ?,
          duplicates_removed = ?, errors = ?, status = 'completed'
      WHERE id = ?
    `).run(
      inserted + updated, inserted, updated,
      duplicatesRemoved, JSON.stringify(errors), runId
    );

    return {
      total: inserted + updated,
      inserted,
      updated,
      duplicatesRemoved,
      errors,
      durationMs: Date.now() - start,
    };
  }

  getLastRuns(limit = 10) {
    return this.db.prepare(
      "SELECT * FROM pipeline_runs ORDER BY id DESC LIMIT ?"
    ).all(limit);
  }

  getScraperStatus() {
    return this.db.prepare("SELECT * FROM scraper_status ORDER BY source").all();
  }
}
