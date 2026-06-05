import type { EventSource, RawEvent } from "../types";
import { BaseScraper } from "./BaseScraper";

interface MuseumSource {
  name: string;
  slug: string;
  neighborhood: string;
  urls: string[];
}

const BERLIN_MUSEUMS: MuseumSource[] = [
  {
    name: "Museum für Naturkunde",
    slug: "naturkunde",
    neighborhood: "Mitte",
    urls: [
      "https://www.museumfuernaturkunde.berlin/de/museum/veranstaltungen",
      "https://www.museumfuernaturkunde.berlin/de/museum/familien",
    ],
  },
  {
    name: "Deutsches Technikmuseum",
    slug: "technik",
    neighborhood: "Kreuzberg",
    urls: [
      "https://technikmuseum.berlin/veranstaltungen/",
      "https://technikmuseum.berlin/angebote/kinder-und-jugendliche/",
    ],
  },
  {
    name: "MACHmit! Museum",
    slug: "machmit",
    neighborhood: "Prenzlauer Berg",
    urls: [
      "https://www.machmitmuseum.de/programm/",
    ],
  },
  {
    name: "Labyrinth Kindermuseum",
    slug: "labyrinth",
    neighborhood: "Wedding",
    urls: [
      "https://www.labyrinth-kindermuseum.de/de/programm",
    ],
  },
  {
    name: "Jüdisches Museum Berlin",
    slug: "juedisches",
    neighborhood: "Kreuzberg",
    urls: [
      "https://www.jmberlin.de/programm?category=families",
    ],
  },
  {
    name: "Pergamonmuseum / Museumsinsel",
    slug: "museumsinsel",
    neighborhood: "Mitte",
    urls: [
      "https://www.smb.museum/veranstaltungen/?audience=families",
    ],
  },
];

export class MuseumScraper extends BaseScraper {
  source: EventSource = "museum";

  async scrape(dateFrom: Date, dateTo: Date): Promise<RawEvent[]> {
    const allEvents: RawEvent[] = [];

    const results = await Promise.allSettled(
      BERLIN_MUSEUMS.map((museum) => this.scrapeMuseum(museum, dateFrom, dateTo))
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        allEvents.push(...result.value);
      }
    }

    return allEvents;
  }

  private async scrapeMuseum(
    museum: MuseumSource,
    dateFrom: Date,
    dateTo: Date
  ): Promise<RawEvent[]> {
    const events: RawEvent[] = [];

    for (const url of museum.urls) {
      try {
        const html = await this.fetch.get(url);
        const parsed = this.parseMuseumPage(html, museum, url);
        const filtered = this.filterByDateRange(parsed, dateFrom, dateTo);
        events.push(...filtered);
      } catch {
        // Museum page might be unavailable
      }
    }

    return events;
  }

  private parseMuseumPage(html: string, museum: MuseumSource, pageUrl: string): RawEvent[] {
    const events: RawEvent[] = [];

    // JSON-LD extraction
    const jsonLd = this.extractJsonLd(html);
    for (const item of jsonLd) {
      if (item["@type"] === "Event") {
        events.push({
          sourceId: `mus-${museum.slug}-${String(item.name).slice(0, 40).replace(/\W/g, "-")}`,
          source: this.source,
          title: String(item.name ?? ""),
          description: String(item.description ?? ""),
          url: String(item.url ?? pageUrl),
          dateStart: String(item.startDate ?? ""),
          dateEnd: item.endDate ? String(item.endDate) : undefined,
          location: museum.name,
          neighborhood: museum.neighborhood,
          price: this.extractOfferPrice(item),
          imageUrl: item.image ? String(item.image) : undefined,
          categories: ["museum", "educational"],
          raw: item,
        });
      }
    }

    // HTML card parsing
    const cardPatterns = [
      /<div[^>]*class="[^"]*(?:event|program|veranstaltung|workshop|termin)[^"]*"[\s\S]*?(?:<\/div>\s*){1,3}/gi,
      /<article[^>]*>[\s\S]*?<\/article>/gi,
      /<li[^>]*class="[^"]*(?:event|program)[^"]*"[\s\S]*?<\/li>/gi,
    ];

    for (const pattern of cardPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const card = match[0];
        const title = this.extractTitle(card);
        if (!title || events.some((e) => e.title === title)) continue;

        const isKidsEvent = this.isKidsRelated(card);
        if (!isKidsEvent && events.length > 0) continue;

        const link = this.extractLink(card);
        events.push({
          sourceId: `mus-${museum.slug}-${title.slice(0, 40).replace(/\W/g, "-")}`,
          source: this.source,
          title,
          description: this.extractParagraph(card),
          url: link ? this.resolveUrl(link, pageUrl) : pageUrl,
          dateStart: this.extractDate(card) ?? "",
          location: museum.name,
          neighborhood: museum.neighborhood,
          price: this.extractPrice(card),
          ageInfo: this.extractAge(card),
          categories: ["museum", "educational"],
          raw: { html: card.slice(0, 500), museum: museum.name },
        });
      }
    }

    return events;
  }

  private isKidsRelated(html: string): boolean {
    const text = html.toLowerCase();
    return /kinder|famili|kids|jugend|young|workshop|mitmach|bastel|creative/i.test(text);
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

  private extractLink(html: string): string | null {
    const m = /href="([^"]+)"/.exec(html);
    return m ? m[1] : null;
  }

  private extractDate(html: string): string | null {
    const datetime = /datetime="([^"]*)"/.exec(html);
    if (datetime) return datetime[1];
    const deDate = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(html);
    if (deDate) return `${deDate[3]}-${deDate[2].padStart(2, "0")}-${deDate[1].padStart(2, "0")}`;
    return null;
  }

  private extractPrice(html: string): string | undefined {
    const m = /(?:€|EUR)\s*[\d,.]+/i.exec(html);
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

  private resolveUrl(href: string, pageUrl: string): string {
    if (href.startsWith("http")) return href;
    const base = new URL(pageUrl);
    return `${base.origin}${href.startsWith("/") ? "" : "/"}${href}`;
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
