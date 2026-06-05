import type { EventSource, RawEvent } from "../types";
import { BaseScraper } from "./BaseScraper";

interface ZooVenue {
  name: string;
  slug: string;
  neighborhood: string;
  baseUrl: string;
  eventPaths: string[];
}

const VENUES: ZooVenue[] = [
  {
    name: "Zoo Berlin",
    slug: "zoo",
    neighborhood: "Tiergarten",
    baseUrl: "https://www.zoo-berlin.de",
    eventPaths: [
      "/de/veranstaltungen",
      "/de/erleben/fuehrungen",
      "/de/erleben/kinder",
    ],
  },
  {
    name: "Tierpark Berlin",
    slug: "tierpark",
    neighborhood: "Friedrichsfelde",
    baseUrl: "https://www.tierpark-berlin.de",
    eventPaths: [
      "/de/veranstaltungen",
      "/de/erleben/fuehrungen",
      "/de/erleben/kinder",
    ],
  },
  {
    name: "Aquarium Berlin",
    slug: "aquarium",
    neighborhood: "Tiergarten",
    baseUrl: "https://www.aquarium-berlin.de",
    eventPaths: [
      "/de/veranstaltungen",
    ],
  },
];

export class ZooTierparkScraper extends BaseScraper {
  source: EventSource = "zoo-tierpark";

  async scrape(dateFrom: Date, dateTo: Date): Promise<RawEvent[]> {
    const allEvents: RawEvent[] = [];

    const results = await Promise.allSettled(
      VENUES.map((venue) => this.scrapeVenue(venue, dateFrom, dateTo))
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        allEvents.push(...result.value);
      }
    }

    return allEvents;
  }

  private async scrapeVenue(
    venue: ZooVenue,
    dateFrom: Date,
    dateTo: Date
  ): Promise<RawEvent[]> {
    const events: RawEvent[] = [];

    for (const path of venue.eventPaths) {
      try {
        const url = `${venue.baseUrl}${path}`;
        const html = await this.fetch.get(url);
        const parsed = this.parseEventsPage(html, venue, url);
        const filtered = this.filterByDateRange(parsed, dateFrom, dateTo);

        for (const event of filtered) {
          if (!events.some((e) => e.title === event.title)) {
            events.push(event);
          }
        }
      } catch {
        // Page might not be accessible
      }
    }

    return events;
  }

  private parseEventsPage(html: string, venue: ZooVenue, pageUrl: string): RawEvent[] {
    const events: RawEvent[] = [];

    // JSON-LD
    const jsonLd = this.extractJsonLd(html);
    for (const item of jsonLd) {
      if (item["@type"] === "Event") {
        events.push({
          sourceId: `${venue.slug}-${String(item.name).slice(0, 40).replace(/\W/g, "-")}`,
          source: this.source,
          title: String(item.name ?? ""),
          description: String(item.description ?? ""),
          url: String(item.url ?? pageUrl),
          dateStart: String(item.startDate ?? ""),
          dateEnd: item.endDate ? String(item.endDate) : undefined,
          location: venue.name,
          neighborhood: venue.neighborhood,
          price: this.extractOfferPrice(item),
          imageUrl: item.image ? String(item.image) : undefined,
          categories: ["nature", "animals", "family"],
          raw: item,
        });
      }
    }

    // HTML card parsing
    const cardPatterns = [
      /<div[^>]*class="[^"]*(?:event|teaser|card|veranstaltung)[^"]*"[\s\S]*?(?:<\/div>\s*){1,3}/gi,
      /<article[^>]*>[\s\S]*?<\/article>/gi,
    ];

    for (const pattern of cardPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const card = match[0];
        const title = this.extractTitle(card);
        if (!title || events.some((e) => e.title === title)) continue;

        events.push({
          sourceId: `${venue.slug}-${title.slice(0, 40).replace(/\W/g, "-")}`,
          source: this.source,
          title,
          description: this.extractParagraph(card),
          url: this.resolveLink(card, venue.baseUrl) ?? pageUrl,
          dateStart: this.extractDate(card) ?? "",
          location: venue.name,
          neighborhood: venue.neighborhood,
          price: this.extractPriceText(card),
          ageInfo: this.extractAge(card),
          categories: ["nature", "animals", "family"],
          raw: { html: card.slice(0, 500), venue: venue.name },
        });
      }
    }

    return events;
  }

  private extractTitle(html: string): string | null {
    for (const tag of ["h2", "h3", "h4"]) {
      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
      const m = regex.exec(html);
      if (m) {
        const text = this.stripHtml(m[1]);
        if (text.length > 2) return text;
      }
    }
    return null;
  }

  private extractParagraph(html: string): string {
    const m = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(html);
    return m ? this.stripHtml(m[1]) : "";
  }

  private resolveLink(html: string, baseUrl: string): string | null {
    const m = /href="([^"]+)"/.exec(html);
    if (!m) return null;
    const href = m[1];
    return href.startsWith("http") ? href : `${baseUrl}${href}`;
  }

  private extractDate(html: string): string | null {
    const datetime = /datetime="([^"]*)"/.exec(html);
    if (datetime) return datetime[1];
    const deDate = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(html);
    if (deDate) return `${deDate[3]}-${deDate[2].padStart(2, "0")}-${deDate[1].padStart(2, "0")}`;
    return null;
  }

  private extractPriceText(html: string): string | undefined {
    const m = /(?:€|EUR)\s*[\d,.]+(?:\s*[-\/]\s*(?:€|EUR)?\s*[\d,.]+)?/i.exec(html);
    if (m) return m[0];
    if (/eintritt\s*frei|kostenlos|free/i.test(html)) return "Free";
    return undefined;
  }

  private extractAge(html: string): string | undefined {
    const m = /(\d+)\s*[-–]\s*(\d+)\s*(?:Jahre|J\.)/i.exec(html);
    if (m) return `${m[1]}-${m[2]}`;
    const ab = /ab\s*(\d+)\s*(?:Jahre|J\.)/i.exec(html);
    if (ab) return `ab ${ab[1]}`;
    return undefined;
  }

  private extractOfferPrice(item: Record<string, unknown>): string | undefined {
    const offers = item.offers as Record<string, unknown> | undefined;
    if (!offers) return undefined;
    if (offers.price === 0 || offers.price === "0") return "Free";
    return offers.price ? `€${offers.price}` : undefined;
  }

  private filterByDateRange(events: RawEvent[], from: Date, to: Date): RawEvent[] {
    return events.filter((e) => {
      if (!e.dateStart) return true;
      const d = new Date(e.dateStart);
      if (isNaN(d.getTime())) return true;
      return d >= from && d <= to;
    });
  }
}
