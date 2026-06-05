import type { EventScraper, EventSource, RawEvent } from "../types";
import type { FetchAdapter } from "./fetchAdapter";

export abstract class BaseScraper implements EventScraper {
  abstract source: EventSource;
  protected fetch: FetchAdapter;

  constructor(fetchAdapter: FetchAdapter) {
    this.fetch = fetchAdapter;
  }

  abstract scrape(dateFrom: Date, dateTo: Date): Promise<RawEvent[]>;

  protected formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  protected formatDateDE(date: Date): string {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}.${m}.${y}`;
  }

  protected stripHtml(html: string): string {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  protected extractJsonLd(html: string): Record<string, unknown>[] {
    const results: Record<string, unknown>[] = [];
    const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (Array.isArray(parsed)) {
          results.push(...parsed);
        } else {
          results.push(parsed);
        }
      } catch {
        // skip malformed JSON-LD
      }
    }
    return results;
  }

  protected extractMetaContent(html: string, property: string): string | null {
    const regex = new RegExp(
      `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`,
      "i"
    );
    const match = regex.exec(html);
    return match ? match[1] : null;
  }
}
