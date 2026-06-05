import type { EventSource, RawEvent } from "../types";
import { BaseScraper } from "./BaseScraper";
import { orUndefined } from "./utils";

export class FamilienportalScraper extends BaseScraper {
  source: EventSource = "familienportal";

  private baseUrl = "https://familienportal.de";
  private berlinUrl = "https://www.berlin.de/familie";

  async scrape(dateFrom: Date, dateTo: Date): Promise<RawEvent[]> {
    const events: RawEvent[] = [];

    const urls = [
      `${this.berlinUrl}/veranstaltungen/`,
      `${this.berlinUrl}/freizeit/`,
      `${this.baseUrl}/informationen/familienleistungen-berlin`,
    ];

    for (const baseUrl of urls) {
      try {
        const url = `${baseUrl}?date_from=${this.formatDate(dateFrom)}&date_to=${this.formatDate(dateTo)}`;
        const html = await this.fetch.get(url);
        const parsed = this.parseEventPage(html, baseUrl);
        events.push(...parsed);
      } catch {
        // Some pages might not be available
      }
    }

    return events;
  }

  private parseEventPage(html: string, pageUrl: string): RawEvent[] {
    const events: RawEvent[] = [];

    // JSON-LD extraction
    const jsonLd = this.extractJsonLd(html);
    for (const item of jsonLd) {
      if (item["@type"] === "Event") {
        const loc = item.location as Record<string, unknown> | undefined;
        events.push({
          sourceId: `fp-${String(item.name).slice(0, 50).replace(/\W/g, "-")}`,
          source: this.source,
          title: String(item.name ?? ""),
          description: String(item.description ?? ""),
          url: String(item.url ?? pageUrl),
          dateStart: String(item.startDate ?? ""),
          dateEnd: item.endDate ? String(item.endDate) : undefined,
          location: loc ? String(loc.name ?? "") : undefined,
          raw: item,
        });
      }
    }

    // HTML card parsing
    const cardPatterns = [
      /<div[^>]*class="[^"]*(?:event|veranstaltung|termin)[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi,
      /<article[^>]*>[\s\S]*?<\/article>/gi,
      /<li[^>]*class="[^"]*(?:event|listing)[^"]*"[\s\S]*?<\/li>/gi,
    ];

    for (const pattern of cardPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const block = match[0];
        const title = this.extractTitle(block);
        if (!title || events.some((e) => e.title === title)) continue;

        const link = this.extractLink(block);
        events.push({
          sourceId: `fp-${title.slice(0, 50).replace(/\W/g, "-")}`,
          source: this.source,
          title,
          description: this.extractDescription(block),
          url: link
            ? link.startsWith("http") ? link : `${this.berlinUrl}${link}`
            : pageUrl,
          dateStart: this.extractDate(block) ?? "",
          location: orUndefined(this.extractByClass(block, "location,ort,venue")),
          neighborhood: orUndefined(this.extractByClass(block, "district,bezirk,stadtteil")),
          price: orUndefined(this.extractByClass(block, "price,preis,eintritt")),
          ageInfo: this.extractAgeInfo(block),
          raw: { html: block.slice(0, 500) },
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

  private extractDescription(html: string): string {
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

  private extractByClass(html: string, classNames: string): string | null {
    for (const cls of classNames.split(",")) {
      const regex = new RegExp(
        `class="[^"]*${cls.trim()}[^"]*"[^>]*>([\\s\\S]*?)<\\/`,
        "i"
      );
      const m = regex.exec(html);
      if (m) return this.stripHtml(m[1]);
    }
    return null;
  }

  private extractAgeInfo(html: string): string | undefined {
    const m = /(\d+)\s*[-–]\s*(\d+)\s*(?:Jahre|J\.|years)/i.exec(html);
    if (m) return `${m[1]}-${m[2]}`;
    const ab = /ab\s*(\d+)\s*(?:Jahre|J\.)/i.exec(html);
    if (ab) return `ab ${ab[1]}`;
    return undefined;
  }
}
