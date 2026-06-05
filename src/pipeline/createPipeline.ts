import { DefaultPipeline } from "./Pipeline";
import { SimpleDeduplicator } from "./SimpleDeduplicator";
import { SimpleNormalizer } from "./SimpleNormalizer";
import {
  BerlinDeScraper,
  BezirkScraper,
  FamilienportalScraper,
  FezBerlinScraper,
  HimbeerScraper,
  KindalingScraper,
  MuseumScraper,
  ZooTierparkScraper,
} from "./scrapers";
import type { FetchAdapter } from "./scrapers";
import type { EventPipeline, EventSource } from "./types";

export function createPipeline(
  fetchAdapter: FetchAdapter,
  sources?: EventSource[]
): EventPipeline {
  const pipeline = new DefaultPipeline(
    new SimpleNormalizer(),
    new SimpleDeduplicator()
  );

  const allScrapers = [
    new KindalingScraper(fetchAdapter),
    new HimbeerScraper(fetchAdapter),
    new BerlinDeScraper(fetchAdapter),
    new FamilienportalScraper(fetchAdapter),
    new FezBerlinScraper(fetchAdapter),
    new MuseumScraper(fetchAdapter),
    new ZooTierparkScraper(fetchAdapter),
    new BezirkScraper(fetchAdapter),
  ];

  for (const scraper of allScrapers) {
    if (!sources || sources.includes(scraper.source)) {
      pipeline.addScraper(scraper);
    }
  }

  return pipeline;
}
