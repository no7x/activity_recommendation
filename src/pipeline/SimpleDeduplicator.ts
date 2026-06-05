import type { EventDeduplicator, RawEvent } from "./types";

export class SimpleDeduplicator implements EventDeduplicator {
  async deduplicate(events: RawEvent[]): Promise<RawEvent[]> {
    const seen = new Map<string, RawEvent>();

    for (const event of events) {
      const key = this.fingerprint(event);
      const existing = seen.get(key);

      if (!existing || this.sourcePriority(event) > this.sourcePriority(existing)) {
        seen.set(key, event);
      }
    }

    return Array.from(seen.values());
  }

  private fingerprint(event: RawEvent): string {
    const title = event.title.toLowerCase().trim().replace(/\s+/g, " ");
    const date = event.dateStart.slice(0, 10);
    return `${title}::${date}`;
  }

  private sourcePriority(event: RawEvent): number {
    const priorities: Record<string, number> = {
      manual: 10,
      "kindaling": 8,
      "himbeer": 7,
      "berlin-de": 6,
      "fez-berlin": 5,
      "eventbrite": 3,
    };
    return priorities[event.source] ?? 0;
  }
}
