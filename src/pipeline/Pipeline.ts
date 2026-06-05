import type {
  EventDeduplicator,
  EventNormalizer,
  EventPipeline,
  EventScraper,
  PipelineError,
  PipelineResult,
  RawEvent,
} from "./types";

export class DefaultPipeline implements EventPipeline {
  private scrapers: EventScraper[] = [];
  private normalizer: EventNormalizer;
  private deduplicator: EventDeduplicator;

  constructor(normalizer: EventNormalizer, deduplicator: EventDeduplicator) {
    this.normalizer = normalizer;
    this.deduplicator = deduplicator;
  }

  addScraper(scraper: EventScraper): void {
    this.scrapers.push(scraper);
  }

  async run(dateFrom: Date, dateTo: Date): Promise<PipelineResult> {
    const errors: PipelineError[] = [];
    const allRaw: RawEvent[] = [];

    const scrapeResults = await Promise.allSettled(
      this.scrapers.map((s) => s.scrape(dateFrom, dateTo))
    );

    for (let i = 0; i < scrapeResults.length; i++) {
      const result = scrapeResults[i];
      const scraper = this.scrapers[i];
      if (result.status === "fulfilled") {
        allRaw.push(...result.value);
      } else {
        errors.push({
          source: scraper.source,
          message: result.reason?.message ?? "Unknown scrape error",
        });
      }
    }

    const deduped = await this.deduplicator.deduplicate(allRaw);
    const duplicatesRemoved = allRaw.length - deduped.length;

    const normalized = deduped.map((raw) => {
      try {
        return this.normalizer.normalize(raw);
      } catch (e) {
        errors.push({
          source: raw.source,
          eventId: raw.sourceId,
          message: e instanceof Error ? e.message : "Normalization error",
        });
        return null;
      }
    }).filter(Boolean);

    return {
      total: normalized.length,
      new: normalized.length,
      updated: 0,
      duplicatesRemoved,
      errors,
    };
  }
}
