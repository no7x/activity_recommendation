# Family Fun Finder — Berlin

Discover the best kids activities and events in Berlin. Parents pick a date and get curated recommendations, filtered by category, age, cost, and more.

## Quick Start

```bash
npm install

# Frontend only (sample data)
npm run dev

# Frontend + Backend (live data)
npm run dev:all
```

## Architecture

```
src/                          # React frontend
  components/                 # UI components
  data/activities.ts          # 36 curated Berlin activities
  providers/
    SmartProvider.ts           # API-first with static fallback
    ApiProvider.ts             # Fetches from backend API
    StaticProvider.ts          # Built-in sample data
  pipeline/
    scrapers/                 # 8 Berlin event source scrapers
    Pipeline.ts               # Scrape -> dedupe -> normalize orchestrator
    SimpleNormalizer.ts        # Auto-categorize, parse age/cost
    SimpleDeduplicator.ts      # Fingerprint-based dedup

server/                       # Express backend
  src/
    index.ts                  # API server + cron scheduling
    db.ts                     # SQLite schema
    eventStore.ts             # Query layer with filter support
    pipelineRunner.ts         # Orchestrates all scrapers
    proxy.ts                  # Domain-allowlisted fetch proxy
```

## Event Sources

| Source | Type | Coverage |
|--------|------|----------|
| Kindaling | API + HTML | Family events |
| HIMBEER | HTML | Monthly listings |
| Berlin.de | API + HTML | City kids events |
| Familienportal Berlin | HTML | Family services |
| FEZ Berlin | HTML | Europe's largest kids center |
| Museum calendars | HTML | 6 major museums |
| Zoo/Tierpark | HTML | Zoo, Tierpark, Aquarium |
| District calendars | HTML | All 12 Berlin Bezirke |

## API Endpoints

```
GET  /api/activities?date=2026-06-07&category=Nature&age=5
GET  /api/activities/range?from=2026-06-07&to=2026-06-08
GET  /api/stats
GET  /api/pipeline/status
POST /api/pipeline/run        # { daysAhead: 14, sources: ["kindaling"] }
```

## Scripts

```bash
npm run dev          # Frontend dev server
npm run dev:server   # Backend dev server (auto-reload)
npm run dev:all      # Both in parallel
npm run build        # Build frontend for production
npm start            # Production server (serves frontend + API)
npm run pipeline:run # Manual pipeline run
```

## Pipeline CLI

```bash
# Run all scrapers, 14 days ahead
npm run pipeline:run

# Specific sources, 7 days
npm run pipeline:run -- --days=7 --sources=kindaling,himbeer

# Just museums
npm run pipeline:run -- --sources=museum
```
