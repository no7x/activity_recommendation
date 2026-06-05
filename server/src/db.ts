import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(import.meta.dirname, "..", "data", "events.db");

export function createDb(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      source_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      url TEXT DEFAULT '',
      date_start TEXT NOT NULL,
      date_end TEXT,
      location TEXT,
      neighborhood TEXT,
      price TEXT,
      age_min INTEGER DEFAULT 1,
      age_max INTEGER DEFAULT 12,
      category TEXT DEFAULT 'Outdoor',
      image_emoji TEXT DEFAULT '🎉',
      cost_level TEXT DEFAULT 'moderate',
      cost_note TEXT,
      is_indoor INTEGER DEFAULT 0,
      is_rainy_day_friendly INTEGER DEFAULT 0,
      is_stroller_friendly INTEGER DEFAULT 0,
      booking_url TEXT,
      booking_required INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]',
      time_of_day TEXT DEFAULT 'afternoon',
      image_url TEXT,
      raw_data TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(source, source_id)
    );

    CREATE INDEX IF NOT EXISTS idx_events_date ON events(date_start);
    CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);
    CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
    CREATE INDEX IF NOT EXISTS idx_events_neighborhood ON events(neighborhood);

    CREATE TABLE IF NOT EXISTS pipeline_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT DEFAULT (datetime('now')),
      finished_at TEXT,
      total INTEGER DEFAULT 0,
      new_count INTEGER DEFAULT 0,
      updated_count INTEGER DEFAULT 0,
      duplicates_removed INTEGER DEFAULT 0,
      errors TEXT DEFAULT '[]',
      status TEXT DEFAULT 'running'
    );

    CREATE TABLE IF NOT EXISTS scraper_status (
      source TEXT PRIMARY KEY,
      last_run TEXT,
      last_success TEXT,
      events_found INTEGER DEFAULT 0,
      last_error TEXT
    );
  `);

  return db;
}

export type { Database };
