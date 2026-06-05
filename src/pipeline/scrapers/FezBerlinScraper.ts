import type { EventSource, RawEvent } from "../types";
import { BaseScraper } from "./BaseScraper";

export class FezBerlinScraper extends BaseScraper {
  source: EventSource = "fez-berlin";

  private baseUrl = "https://www.fez-berlin.de";

  async scrape(dateFrom: Date, dateTo: Date): Promise<RawEvent[]> {
    const events: RawEvent[] = [];

    // FEZ has a program page organized by month/week
    const url = `${this.baseUrl}/programm/`;
    try {
      const html = await this.fetch.get(url);
      const parsed = this.parseProgramPage(html);
      events.push(...this.filterByDateRange(parsed, dateFrom, dateTo));
    } catch {
      // Main page failed
    }

    // Also try specific category pages
    const categories = [
      "theater",
      "museum",
      "schwimmen",
      "kreativ",
      "natur",
      "sport",
      "ferienprogramm",
    ];

    for (const cat of categories) {
      try {
        const catUrl = `${this.baseUrl}/programm/${cat}/`;
        const html = await this.fetch.get(catUrl);
        const parsed = this.parseProgramPage(html);
        const filtered = this.filterByDateRange(parsed, dateFrom, dateTo);
        for (const event of filtered) {
          if (!events.some((e) => e.title === event.title)) {
            events.push(event);
          }
        }
      } catch {
        // Category page might not exist
      }
    }

    return events;
  }

  private parseProgramPage(html: string): RawEvent[] {
    const events: RawEvent[] = [];

    // JSON-LD
    const jsonLd = this.extractJsonLd(html);
    for (const item of jsonLd) {
      if (item["@type"] === "Event") {
        events.push({
          sourceId: `fez-${String(item.name).slice(0, 50).replace(/\W/g, "-")}`,
          source: this.source,
          title: String(item.name ?? ""),
          description: String(item.description ?? ""),
          url: String(item.url ?? `${this.baseUrl}/programm/`),
          dateStart: String(item.startDate ?? ""),
          dateEnd: item.endDate ? String(item.endDate) : undefined,
          location: "FEZ Berlin",
          neighborhood: "Köpenick",
          price: this.extractOfferPrice(item),
          imageUrl: item.image ? String(item.image) : undefined,
          raw: item,
        });
      }
    }

    // HTML parsing for program cards
    const cardPatterns = [
      /<div[^>]*class="[^"]*(?:program|event|veranstaltung|termin)[^"]*"[\s\S]*?<\/div>\s*(?:<\/div>)*/gi,
      /<article[^>]*>[\s\S]*?<\/article>/gi,
    ];

    for (const pattern of cardPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const card = match[0];
        const title = this.extractTitle(card);
        if (!title || events.some((e) => e.title === title)) continue;

        events.push({
          sourceId: `fez-${title.slice(0, 50).replace(/\W/g, "-")}`,
          source: this.source,
          title,
          description: this.extractParagraph(card),
          url: this.extractLink(card, this.baseUrl) ?? `${this.baseUrl}/programm/`,
          dateStart: this.extractDate(card) ?? "",
          location: "FEZ Berlin",
          neighborhood: "Köpenick",
          price: this.extractTextByPattern(card, /(?:€|EUR)\s*[\d,.]+|Eintritt[^<]*/i),
          ageInfo: this.extractAge(card),
          categories: this.guessCategories(card),
          raw: { html: card.slice(0, 500) },
        });
      }
    }

    return events;
  }

  private extractOfferPrice(item: Record<string, unknown>): string | undefined {
    const offers = item.offers as Record<string, unknown> | undefined;
    if (!offers) return undefined;
    if (offers.price === 0 || offers.price === "0") return "Free";
    return offers.price ? `€${offers.price}` : undefined;
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

  private extractLink(html: string, base: string): string | null {
    const m = /href="([^"]+)"/.exec(html);
    if (!m) return null;
    return m[1].startsWith("http") ? m[1] : `${base}${m[1]}`;
  }

  private extractDate(html: string): string | null {
    const datetime = /datetime="([^"]*)"/.exec(html);
    if (datetime) return datetime[1];
    const deDate = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(html);
    if (deDate) return `${deDate[3]}-${deDate[2].padStart(2, "0")}-${deDate[1].padStart(2, "0")}`;
    return null;
  }

  private extractAge(html: string): string | undefined {
    const m = /(\d+)\s*[-–]\s*(\d+)\s*(?:Jahre|J\.)/i.exec(html);
    if (m) return `${m[1]}-${m[2]}`;
    const ab = /ab\s*(\d+)\s*(?:Jahre|J\.)/i.exec(html);
    if (ab) return `ab ${ab[1]}`;
    return undefined;
  }

  private extractTextByPattern(html: string, pattern: RegExp): string | undefined {
    const m = pattern.exec(html);
    return m ? this.stripHtml(m[0]) : undefined;
  }

  private guessCategories(html: string): string[] {
    const text = this.stripHtml(html).toLowerCase();
    const cats: string[] = [];
    if (/theater|bühne|aufführung/.test(text)) cats.push("theater");
    if (/schwimm|baden|pool/.test(text)) cats.push("swimming");
    if (/kreativ|basteln|kunst/.test(text)) cats.push("creative");
    if (/natur|garten|tier/.test(text)) cats.push("nature");
    if (/sport|bewegung|turnen/.test(text)) cats.push("sports");
    if (/musik|konzert|singen/.test(text)) cats.push("music");
    return cats;
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
