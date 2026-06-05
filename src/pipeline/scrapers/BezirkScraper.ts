import type { EventSource, RawEvent } from "../types";
import { BaseScraper } from "./BaseScraper";
import { orUndefined } from "./utils";

interface Bezirk {
  name: string;
  slug: string;
  culturalUrl: string;
}

const BERLIN_BEZIRKE: Bezirk[] = [
  {
    name: "Mitte",
    slug: "mitte",
    culturalUrl: "https://www.berlin.de/ba-mitte/politik-und-verwaltung/aemter/amt-fuer-weiterbildung-und-kultur/kultur/veranstaltungen/",
  },
  {
    name: "Friedrichshain-Kreuzberg",
    slug: "friedrichshain-kreuzberg",
    culturalUrl: "https://www.berlin.de/ba-friedrichshain-kreuzberg/politik-und-verwaltung/aemter/amt-fuer-weiterbildung-und-kultur/kultur/veranstaltungen/",
  },
  {
    name: "Pankow",
    slug: "pankow",
    culturalUrl: "https://www.berlin.de/ba-pankow/politik-und-verwaltung/aemter/amt-fuer-weiterbildung-und-kultur/kultur/veranstaltungen/",
  },
  {
    name: "Charlottenburg-Wilmersdorf",
    slug: "charlottenburg-wilmersdorf",
    culturalUrl: "https://www.berlin.de/ba-charlottenburg-wilmersdorf/verwaltung/aemter/amt-fuer-weiterbildung-und-kultur/kultur/veranstaltungen/",
  },
  {
    name: "Tempelhof-Schöneberg",
    slug: "tempelhof-schoeneberg",
    culturalUrl: "https://www.berlin.de/ba-tempelhof-schoeneberg/politik-und-verwaltung/aemter/amt-fuer-weiterbildung-und-kultur/kultur/veranstaltungen/",
  },
  {
    name: "Neukölln",
    slug: "neukoelln",
    culturalUrl: "https://www.berlin.de/ba-neukoelln/politik-und-verwaltung/aemter/amt-fuer-weiterbildung-und-kultur/kultur/veranstaltungen/",
  },
  {
    name: "Treptow-Köpenick",
    slug: "treptow-koepenick",
    culturalUrl: "https://www.berlin.de/ba-treptow-koepenick/politik-und-verwaltung/aemter/amt-fuer-weiterbildung-und-kultur/kultur/veranstaltungen/",
  },
  {
    name: "Steglitz-Zehlendorf",
    slug: "steglitz-zehlendorf",
    culturalUrl: "https://www.berlin.de/ba-steglitz-zehlendorf/politik-und-verwaltung/aemter/amt-fuer-weiterbildung-und-kultur/kultur/veranstaltungen/",
  },
  {
    name: "Lichtenberg",
    slug: "lichtenberg",
    culturalUrl: "https://www.berlin.de/ba-lichtenberg/politik-und-verwaltung/aemter/amt-fuer-weiterbildung-und-kultur/kultur/veranstaltungen/",
  },
  {
    name: "Reinickendorf",
    slug: "reinickendorf",
    culturalUrl: "https://www.berlin.de/ba-reinickendorf/politik-und-verwaltung/aemter/amt-fuer-weiterbildung-und-kultur/kultur/veranstaltungen/",
  },
  {
    name: "Spandau",
    slug: "spandau",
    culturalUrl: "https://www.berlin.de/ba-spandau/politik-und-verwaltung/aemter/amt-fuer-weiterbildung-und-kultur/kultur/veranstaltungen/",
  },
  {
    name: "Marzahn-Hellersdorf",
    slug: "marzahn-hellersdorf",
    culturalUrl: "https://www.berlin.de/ba-marzahn-hellersdorf/politik-und-verwaltung/aemter/amt-fuer-weiterbildung-und-kultur/kultur/veranstaltungen/",
  },
];

export class BezirkScraper extends BaseScraper {
  source: EventSource = "bezirk";

  async scrape(dateFrom: Date, dateTo: Date): Promise<RawEvent[]> {
    const allEvents: RawEvent[] = [];

    // Scrape all 12 districts in parallel
    const results = await Promise.allSettled(
      BERLIN_BEZIRKE.map((bezirk) => this.scrapeBezirk(bezirk, dateFrom, dateTo))
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        allEvents.push(...result.value);
      }
    }

    return allEvents;
  }

  private async scrapeBezirk(
    bezirk: Bezirk,
    dateFrom: Date,
    dateTo: Date
  ): Promise<RawEvent[]> {
    const events: RawEvent[] = [];

    try {
      const url = `${bezirk.culturalUrl}?date_from=${this.formatDate(dateFrom)}&date_to=${this.formatDate(dateTo)}`;
      const html = await this.fetch.get(url);
      const parsed = this.parseDistrictPage(html, bezirk);
      events.push(...parsed);
    } catch {
      // District page might not be available or use different URL scheme
    }

    // Also try the family-specific pages
    const familyUrl = bezirk.culturalUrl.replace("/kultur/veranstaltungen/", "/familie/veranstaltungen/");
    try {
      const html = await this.fetch.get(familyUrl);
      const parsed = this.parseDistrictPage(html, bezirk);
      for (const event of parsed) {
        if (!events.some((e) => e.title === event.title)) {
          events.push(event);
        }
      }
    } catch {
      // Family page might not exist
    }

    return events;
  }

  private parseDistrictPage(html: string, bezirk: Bezirk): RawEvent[] {
    const events: RawEvent[] = [];

    // JSON-LD
    const jsonLd = this.extractJsonLd(html);
    for (const item of jsonLd) {
      if (item["@type"] === "Event" && this.isKidsEvent(item)) {
        events.push({
          sourceId: `bz-${bezirk.slug}-${String(item.name).slice(0, 40).replace(/\W/g, "-")}`,
          source: this.source,
          title: String(item.name ?? ""),
          description: String(item.description ?? ""),
          url: String(item.url ?? bezirk.culturalUrl),
          dateStart: String(item.startDate ?? ""),
          dateEnd: item.endDate ? String(item.endDate) : undefined,
          location: this.extractLocationName(item),
          neighborhood: bezirk.name,
          price: this.extractOfferPrice(item),
          imageUrl: item.image ? String(item.image) : undefined,
          raw: item,
        });
      }
    }

    // HTML parsing — berlin.de district pages use consistent markup
    const cardPatterns = [
      /<div[^>]*class="[^"]*(?:modul-teaser|event-teaser|calendar-event)[^"]*"[\s\S]*?(?:<\/div>\s*){1,4}/gi,
      /<article[^>]*>[\s\S]*?<\/article>/gi,
      /<tr[^>]*>[\s\S]*?<\/tr>/gi,
    ];

    for (const pattern of cardPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const card = match[0];
        const title = this.extractTitle(card);
        if (!title || events.some((e) => e.title === title)) continue;

        if (!this.isKidsRelated(card)) continue;

        const link = this.extractLink(card);
        events.push({
          sourceId: `bz-${bezirk.slug}-${title.slice(0, 40).replace(/\W/g, "-")}`,
          source: this.source,
          title,
          description: this.extractParagraph(card),
          url: link
            ? link.startsWith("http") ? link : `https://www.berlin.de${link}`
            : bezirk.culturalUrl,
          dateStart: this.extractDate(card) ?? "",
          location: orUndefined(this.extractTextByClass(card, "location,ort")),
          neighborhood: bezirk.name,
          price: this.extractPriceText(card),
          ageInfo: this.extractAge(card),
          raw: { html: card.slice(0, 500), bezirk: bezirk.name },
        });
      }
    }

    return events;
  }

  private isKidsEvent(item: Record<string, unknown>): boolean {
    const text = `${item.name} ${item.description}`.toLowerCase();
    return /kinder|famili|kids|jugend|workshop|mitmach/i.test(text);
  }

  private isKidsRelated(html: string): boolean {
    const text = html.toLowerCase();
    return /kinder|famili|kids|jugend|workshop|mitmach|bastel|spiel|märchen/i.test(text);
  }

  private extractTitle(html: string): string | null {
    for (const tag of ["h2", "h3", "h4", "a"]) {
      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
      const m = regex.exec(html);
      if (m) {
        const text = this.stripHtml(m[1]);
        if (text.length > 3 && text.length < 200) return text;
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

  private extractTextByClass(html: string, classNames: string): string | null {
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

  private extractPriceText(html: string): string | undefined {
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

  private extractLocationName(item: Record<string, unknown>): string | undefined {
    const loc = item.location as Record<string, unknown> | undefined;
    return loc ? String(loc.name ?? "") : undefined;
  }

  private extractOfferPrice(item: Record<string, unknown>): string | undefined {
    const offers = item.offers as Record<string, unknown> | undefined;
    if (!offers) return undefined;
    if (offers.price === 0 || offers.price === "0") return "Free";
    return offers.price ? `€${offers.price}` : undefined;
  }
}
