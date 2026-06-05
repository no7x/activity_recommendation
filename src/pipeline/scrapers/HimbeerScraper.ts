import type { EventSource, RawEvent } from "../types";
import { BaseScraper } from "./BaseScraper";
import { orUndefined } from "./utils";

export class HimbeerScraper extends BaseScraper {
  source: EventSource = "himbeer";

  private baseUrl = "https://www.himbeer.com";

  async scrape(dateFrom: Date, dateTo: Date): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const months = this.getMonthRange(dateFrom, dateTo);

    for (const { year, month } of months) {
      const monthName = this.germanMonth(month);
      const url = `${this.baseUrl}/berlin/veranstaltungen/${monthName}-${year}/`;

      try {
        const html = await this.fetch.get(url);
        const pageEvents = this.parseListPage(html, url);
        events.push(...pageEvents);
      } catch {
        // Month page might not exist yet
      }
    }

    return this.filterByDateRange(events, dateFrom, dateTo);
  }

  private parseListPage(html: string, pageUrl: string): RawEvent[] {
    const events: RawEvent[] = [];

    // Try JSON-LD first
    const jsonLd = this.extractJsonLd(html);
    for (const item of jsonLd) {
      if (item["@type"] === "Event") {
        events.push({
          sourceId: `hb-${String(item.name).slice(0, 50).replace(/\W/g, "-")}`,
          source: this.source,
          title: String(item.name ?? ""),
          description: String(item.description ?? ""),
          url: String(item.url ?? pageUrl),
          dateStart: String(item.startDate ?? ""),
          dateEnd: item.endDate ? String(item.endDate) : undefined,
          location: this.extractLocation(item),
          neighborhood: this.extractNeighborhood(item),
          price: this.extractPrice(item),
          imageUrl: item.image ? String(item.image) : undefined,
          raw: item,
        });
      }
    }

    // Fall back to HTML parsing
    if (events.length === 0) {
      const articleRegex =
        /<article[^>]*>[\s\S]*?<\/article>/gi;
      let match;
      while ((match = articleRegex.exec(html)) !== null) {
        const article = match[0];
        const title = this.extractTextFromTag(article, "h2") ??
          this.extractTextFromTag(article, "h3");
        if (!title) continue;

        const link = this.extractHref(article, this.baseUrl);
        const dateStr = this.extractDateTime(article);
        const desc = this.extractTextFromTag(article, "p");

        events.push({
          sourceId: `hb-${title.slice(0, 50).replace(/\W/g, "-")}`,
          source: this.source,
          title,
          description: desc ?? "",
          url: link ?? pageUrl,
          dateStart: dateStr ?? "",
          location: orUndefined(this.extractTextByClass(article, "location")),
          price: orUndefined(this.extractTextByClass(article, "price")),
          ageInfo: this.extractAgeInfo(article),
          raw: { html: article.slice(0, 500) },
        });
      }
    }

    return events;
  }

  private extractLocation(item: Record<string, unknown>): string | undefined {
    const loc = item.location as Record<string, unknown> | undefined;
    return loc ? String(loc.name ?? "") : undefined;
  }

  private extractNeighborhood(item: Record<string, unknown>): string | undefined {
    const loc = item.location as Record<string, unknown> | undefined;
    if (!loc) return undefined;
    const addr = loc.address as Record<string, unknown> | undefined;
    return addr ? String(addr.addressLocality ?? "") : undefined;
  }

  private extractPrice(item: Record<string, unknown>): string | undefined {
    const offers = item.offers as Record<string, unknown> | undefined;
    if (!offers) return undefined;
    return offers.price ? `€${offers.price}` : undefined;
  }

  private extractTextFromTag(html: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
    const m = regex.exec(html);
    return m ? this.stripHtml(m[1]) : null;
  }

  private extractTextByClass(html: string, className: string): string | null {
    const regex = new RegExp(
      `class="[^"]*${className}[^"]*"[^>]*>([\\s\\S]*?)<\\/`,
      "i"
    );
    const m = regex.exec(html);
    return m ? this.stripHtml(m[1]) : null;
  }

  private extractHref(html: string, base: string): string | null {
    const m = /href="([^"]*)"/.exec(html);
    if (!m) return null;
    const href = m[1];
    return href.startsWith("http") ? href : `${base}${href}`;
  }

  private extractDateTime(html: string): string | null {
    const m = /datetime="([^"]*)"/.exec(html);
    return m ? m[1] : null;
  }

  private extractAgeInfo(html: string): string | undefined {
    const ageMatch = /(\d+)\s*[-–]\s*(\d+)\s*(?:Jahre|years|J\.)/i.exec(html);
    if (ageMatch) return `${ageMatch[1]}-${ageMatch[2]}`;
    const abMatch = /ab\s*(\d+)\s*(?:Jahre|J\.)/i.exec(html);
    if (abMatch) return `ab ${abMatch[1]}`;
    return undefined;
  }

  private getMonthRange(from: Date, to: Date): { year: number; month: number }[] {
    const months: { year: number; month: number }[] = [];
    const d = new Date(from.getFullYear(), from.getMonth(), 1);
    while (d <= to) {
      months.push({ year: d.getFullYear(), month: d.getMonth() });
      d.setMonth(d.getMonth() + 1);
    }
    return months;
  }

  private germanMonth(month: number): string {
    const months = [
      "januar", "februar", "maerz", "april", "mai", "juni",
      "juli", "august", "september", "oktober", "november", "dezember",
    ];
    return months[month];
  }

  private filterByDateRange(events: RawEvent[], from: Date, to: Date): RawEvent[] {
    return events.filter((e) => {
      if (!e.dateStart) return true;
      const d = new Date(e.dateStart);
      return d >= from && d <= to;
    });
  }
}
