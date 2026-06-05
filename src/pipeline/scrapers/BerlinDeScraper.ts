import type { EventSource, RawEvent } from "../types";
import { BaseScraper } from "./BaseScraper";

interface BerlinDeEvent {
  id: string;
  title: string;
  teaser?: string;
  description?: string;
  url: string;
  startDate: string;
  endDate?: string;
  location?: { name: string; district?: string; address?: string };
  admission?: string;
  categories?: string[];
  image?: string;
}

export class BerlinDeScraper extends BaseScraper {
  source: EventSource = "berlin-de";

  private baseUrl = "https://www.berlin.de";

  async scrape(dateFrom: Date, dateTo: Date): Promise<RawEvent[]> {
    const events: RawEvent[] = [];

    // berlin.de has a family events section with date filtering
    const urls = [
      `${this.baseUrl}/kultur-und-tickets/tipps/kinder/`,
      `${this.baseUrl}/kultur-und-tickets/tipps/kinder/veranstaltungen/`,
    ];

    for (const url of urls) {
      try {
        const html = await this.fetch.get(
          `${url}?date_from=${this.formatDate(dateFrom)}&date_to=${this.formatDate(dateTo)}`
        );
        const parsed = this.parseListPage(html);
        events.push(...parsed);
      } catch {
        // Try alternative URL pattern
      }
    }

    // Also try the events API if available
    try {
      const apiUrl =
        `${this.baseUrl}/kiwi/api/v1/events/?` +
        `category=kinder` +
        `&from=${this.formatDate(dateFrom)}` +
        `&to=${this.formatDate(dateTo)}` +
        `&limit=100`;

      const data = await this.fetch.getJson<{ results: BerlinDeEvent[] }>(apiUrl);
      if (data.results) {
        for (const event of data.results) {
          events.push(this.apiEventToRaw(event));
        }
      }
    } catch {
      // API might not be available
    }

    return this.dedupeByTitle(events);
  }

  private parseListPage(html: string): RawEvent[] {
    const events: RawEvent[] = [];

    // Try JSON-LD
    const jsonLd = this.extractJsonLd(html);
    for (const item of jsonLd) {
      if (item["@type"] === "Event") {
        events.push(this.jsonLdToRaw(item));
      }
    }

    // Parse event listing HTML
    const itemRegex =
      /<div[^>]*class="[^"]*(?:event-teaser|modul-teaser|calendar-event)[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi;
    let match;
    while ((match = itemRegex.exec(html)) !== null) {
      const block = match[0];
      const title = this.findText(block, /class="[^"]*title[^"]*"[^>]*>([^<]+)/);
      if (!title) continue;

      const link = this.findAttr(block, /href="(\/[^"]*)"/) ?? "";
      const dateStr = this.findAttr(block, /datetime="([^"]*)"/);
      const location = this.findText(block, /class="[^"]*location[^"]*"[^>]*>([^<]+)/);
      const district = this.findText(block, /class="[^"]*district[^"]*"[^>]*>([^<]+)/);

      events.push({
        sourceId: `bde-${title.slice(0, 50).replace(/\W/g, "-")}`,
        source: this.source,
        title: title.trim(),
        description: this.findText(block, /class="[^"]*teaser[^"]*"[^>]*>([\s\S]*?)<\//) ?? "",
        url: link.startsWith("http") ? link : `${this.baseUrl}${link}`,
        dateStart: dateStr ?? "",
        location: location?.trim(),
        neighborhood: district?.trim(),
        raw: { html: block.slice(0, 500) },
      });
    }

    return events;
  }

  private jsonLdToRaw(item: Record<string, unknown>): RawEvent {
    const loc = item.location as Record<string, unknown> | undefined;
    const addr = loc?.address as Record<string, unknown> | undefined;

    return {
      sourceId: `bde-${String(item.name).slice(0, 50).replace(/\W/g, "-")}`,
      source: this.source,
      title: String(item.name ?? ""),
      description: String(item.description ?? ""),
      url: String(item.url ?? ""),
      dateStart: String(item.startDate ?? ""),
      dateEnd: item.endDate ? String(item.endDate) : undefined,
      location: loc ? String(loc.name ?? "") : undefined,
      neighborhood: addr ? String(addr.addressLocality ?? "") : undefined,
      price: this.extractPrice(item),
      imageUrl: item.image ? String(item.image) : undefined,
      raw: item,
    };
  }

  private apiEventToRaw(event: BerlinDeEvent): RawEvent {
    return {
      sourceId: `bde-${event.id}`,
      source: this.source,
      title: event.title,
      description: event.description ?? event.teaser ?? "",
      url: event.url.startsWith("http") ? event.url : `${this.baseUrl}${event.url}`,
      dateStart: event.startDate,
      dateEnd: event.endDate,
      location: event.location?.name,
      neighborhood: event.location?.district,
      price: event.admission,
      categories: event.categories,
      imageUrl: event.image,
      raw: event as unknown as Record<string, unknown>,
    };
  }

  private extractPrice(item: Record<string, unknown>): string | undefined {
    const offers = item.offers as Record<string, unknown> | undefined;
    if (!offers) return undefined;
    if (offers.price === 0 || offers.price === "0") return "Free";
    return offers.price ? `€${offers.price}` : undefined;
  }

  private findText(html: string, regex: RegExp): string | null {
    const m = regex.exec(html);
    return m ? this.stripHtml(m[1]) : null;
  }

  private findAttr(html: string, regex: RegExp): string | null {
    const m = regex.exec(html);
    return m ? m[1] : null;
  }

  private dedupeByTitle(events: RawEvent[]): RawEvent[] {
    const seen = new Set<string>();
    return events.filter((e) => {
      const key = e.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
