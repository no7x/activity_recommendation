import type Database from "better-sqlite3";
import type { Activity, Category, CostLevel, Filters } from "../../src/providers/types";

interface EventRow {
  id: string;
  source: string;
  source_id: string;
  title: string;
  description: string;
  url: string;
  date_start: string;
  date_end: string | null;
  location: string | null;
  neighborhood: string | null;
  price: string | null;
  age_min: number;
  age_max: number;
  category: string;
  image_emoji: string;
  cost_level: string;
  cost_note: string | null;
  is_indoor: number;
  is_rainy_day_friendly: number;
  is_stroller_friendly: number;
  booking_url: string | null;
  booking_required: number;
  tags: string;
  time_of_day: string;
  image_url: string | null;
}

export class EventStore {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  upsertEvent(event: {
    id: string;
    source: string;
    sourceId: string;
    title: string;
    description: string;
    url: string;
    dateStart: string;
    dateEnd?: string;
    location?: string;
    neighborhood?: string;
    price?: string;
    ageMin: number;
    ageMax: number;
    category: string;
    imageEmoji: string;
    costLevel: string;
    costNote?: string;
    isIndoor: boolean;
    isRainyDayFriendly: boolean;
    isStrollerFriendly: boolean;
    bookingUrl?: string;
    bookingRequired: boolean;
    tags: string[];
    timeOfDay: string;
    imageUrl?: string;
    rawData?: string;
  }): "inserted" | "updated" {
    const existing = this.db
      .prepare("SELECT id FROM events WHERE source = ? AND source_id = ?")
      .get(event.source, event.sourceId);

    if (existing) {
      this.db.prepare(`
        UPDATE events SET
          title = ?, description = ?, url = ?, date_start = ?, date_end = ?,
          location = ?, neighborhood = ?, price = ?, age_min = ?, age_max = ?,
          category = ?, image_emoji = ?, cost_level = ?, cost_note = ?,
          is_indoor = ?, is_rainy_day_friendly = ?, is_stroller_friendly = ?,
          booking_url = ?, booking_required = ?, tags = ?, time_of_day = ?,
          image_url = ?, raw_data = ?, updated_at = datetime('now')
        WHERE source = ? AND source_id = ?
      `).run(
        event.title, event.description, event.url, event.dateStart, event.dateEnd ?? null,
        event.location ?? null, event.neighborhood ?? null, event.price ?? null,
        event.ageMin, event.ageMax, event.category, event.imageEmoji,
        event.costLevel, event.costNote ?? null, event.isIndoor ? 1 : 0,
        event.isRainyDayFriendly ? 1 : 0, event.isStrollerFriendly ? 1 : 0,
        event.bookingUrl ?? null, event.bookingRequired ? 1 : 0,
        JSON.stringify(event.tags), event.timeOfDay, event.imageUrl ?? null,
        event.rawData ?? null, event.source, event.sourceId
      );
      return "updated";
    }

    this.db.prepare(`
      INSERT INTO events (
        id, source, source_id, title, description, url, date_start, date_end,
        location, neighborhood, price, age_min, age_max, category, image_emoji,
        cost_level, cost_note, is_indoor, is_rainy_day_friendly, is_stroller_friendly,
        booking_url, booking_required, tags, time_of_day, image_url, raw_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      event.id, event.source, event.sourceId, event.title, event.description,
      event.url, event.dateStart, event.dateEnd ?? null,
      event.location ?? null, event.neighborhood ?? null, event.price ?? null,
      event.ageMin, event.ageMax, event.category, event.imageEmoji,
      event.costLevel, event.costNote ?? null, event.isIndoor ? 1 : 0,
      event.isRainyDayFriendly ? 1 : 0, event.isStrollerFriendly ? 1 : 0,
      event.bookingUrl ?? null, event.bookingRequired ? 1 : 0,
      JSON.stringify(event.tags), event.timeOfDay, event.imageUrl ?? null,
      event.rawData ?? null
    );
    return "inserted";
  }

  getActivities(date: string, filters?: Filters): Activity[] {
    let sql = `
      SELECT * FROM events
      WHERE date_start <= ? AND (date_end >= ? OR date_end IS NULL OR date_start = ?)
    `;
    const params: unknown[] = [date, date, date];

    if (filters?.category) {
      sql += " AND category = ?";
      params.push(filters.category);
    }
    if (filters?.ageOfChild != null) {
      sql += " AND age_min <= ? AND age_max >= ?";
      params.push(filters.ageOfChild, filters.ageOfChild);
    }
    if (filters?.cost && filters.cost.length > 0) {
      sql += ` AND cost_level IN (${filters.cost.map(() => "?").join(",")})`;
      params.push(...filters.cost);
    }
    if (filters?.indoorOnly) {
      sql += " AND is_indoor = 1";
    }
    if (filters?.rainyDay) {
      sql += " AND is_rainy_day_friendly = 1";
    }
    if (filters?.strollerFriendly) {
      sql += " AND is_stroller_friendly = 1";
    }

    sql += " ORDER BY date_start ASC LIMIT 50";

    const rows = this.db.prepare(sql).all(...params) as EventRow[];
    return rows.map(this.rowToActivity);
  }

  getActivitiesByDateRange(dateFrom: string, dateTo: string, filters?: Filters): Activity[] {
    let sql = `
      SELECT * FROM events
      WHERE date_start >= ? AND date_start <= ?
    `;
    const params: unknown[] = [dateFrom, dateTo];

    if (filters?.category) {
      sql += " AND category = ?";
      params.push(filters.category);
    }
    if (filters?.ageOfChild != null) {
      sql += " AND age_min <= ? AND age_max >= ?";
      params.push(filters.ageOfChild, filters.ageOfChild);
    }
    if (filters?.cost && filters.cost.length > 0) {
      sql += ` AND cost_level IN (${filters.cost.map(() => "?").join(",")})`;
      params.push(...filters.cost);
    }
    if (filters?.indoorOnly) {
      sql += " AND is_indoor = 1";
    }
    if (filters?.rainyDay) {
      sql += " AND is_rainy_day_friendly = 1";
    }
    if (filters?.strollerFriendly) {
      sql += " AND is_stroller_friendly = 1";
    }

    sql += " ORDER BY date_start ASC LIMIT 100";

    const rows = this.db.prepare(sql).all(...params) as EventRow[];
    return rows.map(this.rowToActivity);
  }

  getStats() {
    const total = (this.db.prepare("SELECT COUNT(*) as count FROM events").get() as { count: number }).count;
    const bySrc = this.db.prepare("SELECT source, COUNT(*) as count FROM events GROUP BY source").all() as { source: string; count: number }[];
    const byCat = this.db.prepare("SELECT category, COUNT(*) as count FROM events GROUP BY category").all() as { source: string; count: number }[];
    const upcoming = (this.db.prepare("SELECT COUNT(*) as count FROM events WHERE date_start >= date('now')").get() as { count: number }).count;

    return { total, upcoming, bySource: bySrc, byCategory: byCat };
  }

  private rowToActivity(row: EventRow): Activity {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category as Category,
      ageMin: row.age_min,
      ageMax: row.age_max,
      imageEmoji: row.image_emoji,
      tags: JSON.parse(row.tags || "[]"),
      daysOfWeek: null,
      seasonal: null,
      timeOfDay: row.time_of_day as Activity["timeOfDay"],
      cost: row.cost_level as CostLevel,
      costNote: row.cost_note ?? row.price ?? "Check website",
      neighborhood: row.neighborhood ?? row.location ?? "Berlin",
      isIndoor: row.is_indoor === 1,
      isRainyDayFriendly: row.is_rainy_day_friendly === 1,
      isStrollerFriendly: row.is_stroller_friendly === 1,
      bookingUrl: row.booking_url,
      bookingRequired: row.booking_required === 1,
    };
  }
}
