import type { Activity } from "../providers/types";

export interface RawEvent {
  sourceId: string;
  source: EventSource;
  title: string;
  description: string;
  url: string;
  dateStart: string;
  dateEnd?: string;
  location?: string;
  neighborhood?: string;
  price?: string;
  ageInfo?: string;
  categories?: string[];
  imageUrl?: string;
  raw: Record<string, unknown>;
}

export type EventSource =
  | "kindaling"
  | "himbeer"
  | "berlin-de"
  | "familienportal"
  | "fez-berlin"
  | "museum"
  | "zoo-tierpark"
  | "bezirk"
  | "eventbrite"
  | "manual";

export interface EventScraper {
  source: EventSource;
  scrape(dateFrom: Date, dateTo: Date): Promise<RawEvent[]>;
}

export interface EventNormalizer {
  normalize(raw: RawEvent): Partial<Activity> & { title: string };
}

export interface EventDeduplicator {
  deduplicate(events: RawEvent[]): Promise<RawEvent[]>;
}

export interface PipelineResult {
  total: number;
  new: number;
  updated: number;
  duplicatesRemoved: number;
  errors: PipelineError[];
}

export interface PipelineError {
  source: EventSource;
  message: string;
  eventId?: string;
}

export interface EventPipeline {
  run(dateFrom: Date, dateTo: Date): Promise<PipelineResult>;
  addScraper(scraper: EventScraper): void;
}
