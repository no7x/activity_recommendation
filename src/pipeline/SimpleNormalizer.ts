import type { Activity, Category, CostLevel, Season, TimeOfDay } from "../providers/types";
import type { EventNormalizer, RawEvent } from "./types";

export class SimpleNormalizer implements EventNormalizer {
  normalize(raw: RawEvent): Partial<Activity> & { title: string } {
    return {
      id: `${raw.source}-${raw.sourceId}`,
      title: raw.title.trim(),
      description: raw.description?.trim() ?? "",
      category: this.guessCategory(raw),
      ageMin: this.parseAgeMin(raw.ageInfo),
      ageMax: this.parseAgeMax(raw.ageInfo),
      imageEmoji: this.pickEmoji(this.guessCategory(raw)),
      tags: raw.categories ?? [],
      daysOfWeek: null,
      seasonal: this.guessSeason(raw.dateStart),
      timeOfDay: this.guessTimeOfDay(raw.dateStart),
      cost: this.guessCost(raw.price),
      costNote: raw.price ?? "Check website",
      neighborhood: raw.neighborhood ?? raw.location ?? "Berlin",
      isIndoor: this.guessIndoor(raw),
      isRainyDayFriendly: this.guessIndoor(raw),
      isStrollerFriendly: false,
      bookingUrl: raw.url,
      bookingRequired: false,
    };
  }

  private guessCategory(raw: RawEvent): Category {
    const text = `${raw.title} ${raw.description} ${(raw.categories ?? []).join(" ")}`.toLowerCase();
    if (/sport|soccer|swim|yoga|climb|skate|bike/.test(text)) return "Sports";
    if (/music|dance|drum|concert|sing/.test(text)) return "Music";
    if (/cook|bak|küche|essen/.test(text)) return "Cooking";
    if (/science|experiment|robot|stem|dino/.test(text)) return "Science";
    if (/art|craft|paint|draw|creative|bastel/.test(text)) return "Arts & Crafts";
    if (/nature|garden|animal|zoo|farm|wald/.test(text)) return "Nature";
    if (/museum|librar|book|lego|learn|bildung/.test(text)) return "Educational";
    return "Outdoor";
  }

  private parseAgeMin(ageInfo?: string): number {
    if (!ageInfo) return 1;
    const match = ageInfo.match(/(\d+)/);
    return match ? parseInt(match[1]) : 1;
  }

  private parseAgeMax(ageInfo?: string): number {
    if (!ageInfo) return 12;
    const matches = ageInfo.match(/(\d+)/g);
    if (matches && matches.length >= 2) return parseInt(matches[1]);
    return 12;
  }

  private guessCost(price?: string): CostLevel {
    if (!price) return "moderate";
    const lower = price.toLowerCase();
    if (/free|frei|kostenlos|€\s*0/.test(lower)) return "free";
    const nums = price.match(/(\d+)/g);
    if (!nums) return "moderate";
    const max = Math.max(...nums.map(Number));
    if (max <= 10) return "budget";
    if (max <= 20) return "moderate";
    return "premium";
  }

  private guessSeason(dateStart: string): Season[] | null {
    const month = new Date(dateStart).getMonth();
    if (month >= 2 && month <= 4) return ["spring"];
    if (month >= 5 && month <= 7) return ["summer"];
    if (month >= 8 && month <= 10) return ["fall"];
    return ["winter"];
  }

  private guessTimeOfDay(dateStart: string): TimeOfDay {
    const hour = new Date(dateStart).getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    if (hour >= 17) return "evening";
    return "afternoon";
  }

  private guessIndoor(raw: RawEvent): boolean {
    const text = `${raw.title} ${raw.description} ${raw.location ?? ""}`.toLowerCase();
    return /indoor|museum|theater|bibliothek|library|kino|cinema|café|cafe|workshop|studio/.test(text);
  }

  private pickEmoji(category: Category): string {
    const map: Record<Category, string> = {
      Outdoor: "🌳",
      "Arts & Crafts": "🎨",
      Sports: "⚽",
      Educational: "📚",
      Music: "🎵",
      Nature: "🌿",
      Cooking: "👨‍🍳",
      Science: "🧪",
    };
    return map[category];
  }
}
