import type { EventSource, RawEvent } from "../types";
import { BaseScraper } from "./BaseScraper";
import { orUndefined } from "./utils";

interface KindalingEvent {
  id: number;
  title: string;
  slug: string;
  description: string;
  start_date: string;
  end_date?: string;
  location_name?: string;
  district?: string;
  price?: string;
  age_from?: number;
  age_to?: number;
  categories?: { name: string }[];
  image_url?: string;
  is_indoor?: boolean;
  is_outdoor?: boolean;
}

interface KindalingResponse {
  data: KindalingEvent[];
  meta?: { total: number; page: number; last_page: number };
}

export class KindalingScraper extends BaseScraper {
  source: EventSource = "kindaling";

  private baseUrl = "https://www.kindaling.de";

  async scrape(dateFrom: Date, dateTo: Date): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    let page = 1;
    const maxPages = 10;

    while (page <= maxPages) {
      const url =
        `${this.baseUrl}/api/events?` +
        `city=berlin` +
        `&date_from=${this.formatDate(dateFrom)}` +
        `&date_to=${this.formatDate(dateTo)}` +
        `&page=${page}`;

      try {
        const data = await this.fetch.getJson<KindalingResponse>(url);

        if (!data.data || data.data.length === 0) break;

        for (const event of data.data) {
          events.push(this.toRawEvent(event));
        }

        if (data.meta && page >= data.meta.last_page) break;
        page++;
      } catch {
        // If the API structure differs, fall back to HTML scraping
        const htmlEvents = await this.scrapeHtml(dateFrom, dateTo);
        return htmlEvents;
      }
    }

    return events;
  }

  private async scrapeHtml(dateFrom: Date, dateTo: Date): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const url =
      `${this.baseUrl}/berlin/veranstaltungen?` +
      `von=${this.formatDate(dateFrom)}&bis=${this.formatDate(dateTo)}`;

    const html = await this.fetch.get(url);

    const jsonLdItems = this.extractJsonLd(html);
    for (const item of jsonLdItems) {
      if (item["@type"] === "Event") {
        events.push({
          sourceId: `kl-${String(item.name).slice(0, 40).replace(/\s/g, "-")}`,
          source: this.source,
          title: String(item.name ?? ""),
          description: String(item.description ?? ""),
          url: String(item.url ?? url),
          dateStart: String(item.startDate ?? dateFrom.toISOString()),
          dateEnd: item.endDate ? String(item.endDate) : undefined,
          location: this.extractLocation(item),
          neighborhood: this.extractNeighborhood(item),
          price: this.extractPrice(item),
          categories: [],
          imageUrl: item.image ? String(item.image) : undefined,
          raw: item,
        });
      }
    }

    // Parse event cards from HTML if no JSON-LD found
    if (events.length === 0) {
      const cardRegex =
        /<article[^>]*class="[^"]*event-card[^"]*"[\s\S]*?<\/article>/gi;
      let match;
      while ((match = cardRegex.exec(html)) !== null) {
        const card = match[0];
        const title = this.extractFromTag(card, "h2,h3,.event-title");
        const link = this.extractHref(card);
        const dateStr = this.extractFromAttr(card, "time", "datetime");

        if (title) {
          events.push({
            sourceId: `kl-${title.slice(0, 40).replace(/\s/g, "-")}`,
            source: this.source,
            title,
            description: this.extractFromTag(card, ".event-description,p") ?? "",
            url: link ? `${this.baseUrl}${link}` : url,
            dateStart: dateStr ?? dateFrom.toISOString(),
            location: orUndefined(this.extractFromTag(card, ".event-location,.location")),
            price: orUndefined(this.extractFromTag(card, ".event-price,.price")),
            raw: { html: card },
          });
        }
      }
    }

    return events;
  }

  private toRawEvent(event: KindalingEvent): RawEvent {
    const ageInfo =
      event.age_from != null && event.age_to != null
        ? `${event.age_from}-${event.age_to}`
        : event.age_from != null
          ? `ab ${event.age_from}`
          : undefined;

    return {
      sourceId: `kl-${event.id}`,
      source: this.source,
      title: event.title,
      description: event.description ?? "",
      url: `${this.baseUrl}/berlin/veranstaltungen/${event.slug}`,
      dateStart: event.start_date,
      dateEnd: event.end_date,
      location: event.location_name,
      neighborhood: event.district,
      price: event.price,
      ageInfo,
      categories: event.categories?.map((c) => c.name) ?? [],
      imageUrl: event.image_url,
      raw: event as unknown as Record<string, unknown>,
    };
  }

  private extractLocation(item: Record<string, unknown>): string | undefined {
    const loc = item.location as Record<string, unknown> | undefined;
    if (!loc) return undefined;
    return String(loc.name ?? "");
  }

  private extractNeighborhood(item: Record<string, unknown>): string | undefined {
    const loc = item.location as Record<string, unknown> | undefined;
    if (!loc) return undefined;
    const addr = loc.address as Record<string, unknown> | undefined;
    return addr ? String(addr.addressLocality ?? "") : undefined;
  }

  private extractPrice(item: Record<string, unknown>): string | undefined {
    const offers = item.offers as Record<string, unknown> | Record<string, unknown>[] | undefined;
    if (!offers) return undefined;
    const offer = Array.isArray(offers) ? offers[0] : offers;
    if (offer.price === 0 || offer.price === "0") return "Free";
    return offer.price ? `€${offer.price}` : undefined;
  }

  private extractFromTag(html: string, selectors: string): string | null {
    for (const sel of selectors.split(",")) {
      const tag = sel.trim().replace(".", "");
      const regex = new RegExp(
        `<[^>]*(?:class="[^"]*${tag}[^"]*"|<${tag})[^>]*>([\\s\\S]*?)<\\/`,
        "i"
      );
      const m = regex.exec(html);
      if (m) return this.stripHtml(m[1]);
    }
    return null;
  }

  private extractHref(html: string): string | null {
    const m = /href="([^"]*)"/.exec(html);
    return m ? m[1] : null;
  }

  private extractFromAttr(html: string, tag: string, attr: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, "i");
    const m = regex.exec(html);
    return m ? m[1] : null;
  }
}
