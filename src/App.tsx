import { useCallback, useEffect, useState } from "react";
import styles from "./App.module.css";
import { ActivityList } from "./components/ActivityList";
import { DatePicker } from "./components/DatePicker";
import { FilterBar } from "./components/FilterBar";
import type { FilterState } from "./components/FilterBar";
import { HeroBanner } from "./components/HeroBanner";
import { SectionHeader } from "./components/SectionHeader";
import type { Activity } from "./providers";
import { StaticProvider } from "./providers";

const provider = new StaticProvider();

function formatDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateString(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const defaultFilters: FilterState = {
  category: null,
  ageOfChild: null,
  cost: [],
  rainyDay: false,
  indoorOnly: false,
  strollerFriendly: false,
};

type ViewMode = "today" | "browse";

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("today");
  const [dateStr, setDateStr] = useState(formatDateString(new Date()));
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const [todayActivities, setTodayActivities] = useState<Activity[]>([]);
  const [weekendActivities, setWeekendActivities] = useState<Activity[]>([]);
  const [browseActivities, setBrowseActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const filtersForProvider = useCallback(() => {
    return {
      category: filters.category ?? undefined,
      ageOfChild: filters.ageOfChild ?? undefined,
      cost: filters.cost.length > 0 ? filters.cost : undefined,
      indoorOnly: filters.indoorOnly || undefined,
      rainyDay: filters.rainyDay || undefined,
      strollerFriendly: filters.strollerFriendly || undefined,
    };
  }, [filters]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const f = filtersForProvider();
      const today = new Date();
      const [todayRes, weekendRes] = await Promise.all([
        provider.getActivities(today, f),
        provider.getWeekendActivities(today, f),
      ]);
      setTodayActivities(todayRes);
      setWeekendActivities(weekendRes);
      setLoading(false);
    };
    if (viewMode === "today") load();
  }, [viewMode, filtersForProvider]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const date = parseDateString(dateStr);
      const results = await provider.getActivities(date, filtersForProvider());
      setBrowseActivities(results);
      setLoading(false);
    };
    if (viewMode === "browse") load();
  }, [viewMode, dateStr, filtersForProvider]);

  const today = new Date();
  const todayLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const browseDate = parseDateString(dateStr);
  const browseLabel = browseDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className={styles.app}>
      <HeroBanner />

      <div className={styles.viewToggle}>
        <button
          className={`${styles.toggleBtn} ${viewMode === "today" ? styles.toggleActive : ""}`}
          onClick={() => setViewMode("today")}
        >
          Today & Weekend
        </button>
        <button
          className={`${styles.toggleBtn} ${viewMode === "browse" ? styles.toggleActive : ""}`}
          onClick={() => setViewMode("browse")}
        >
          Browse by Date
        </button>
      </div>

      <FilterBar filters={filters} onChange={setFilters} />

      {viewMode === "today" ? (
        <>
          <SectionHeader
            title={`Today — ${todayLabel}`}
            subtitle="Recommended activities for today in Berlin"
            count={todayActivities.length}
          />
          <ActivityList activities={todayActivities} loading={loading} />

          {weekendActivities.length > 0 && (
            <>
              <SectionHeader
                title="This Weekend"
                subtitle="Featured activities for Saturday & Sunday"
                count={weekendActivities.length}
              />
              <ActivityList
                activities={weekendActivities}
                loading={loading}
              />
            </>
          )}
        </>
      ) : (
        <>
          <div className={styles.browseControls}>
            <DatePicker value={dateStr} onChange={setDateStr} />
            <p className={styles.dateInfo}>
              Showing activities for <strong>{browseLabel}</strong> in{" "}
              <strong>Berlin</strong>
            </p>
          </div>
          <ActivityList activities={browseActivities} loading={loading} />
        </>
      )}
    </div>
  );
}
