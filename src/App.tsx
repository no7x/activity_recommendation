import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./App.module.css";
import { ActivityList } from "./components/ActivityList";
import { DatePicker } from "./components/DatePicker";
import { FilterBar } from "./components/FilterBar";
import type { FilterState } from "./components/FilterBar";
import { HeroBanner } from "./components/HeroBanner";
import { QuickActions } from "./components/QuickActions";
import { SectionHeader } from "./components/SectionHeader";
import type { Activity } from "./providers";
import { SmartProvider } from "./providers";

const provider = new SmartProvider();

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
  const [isLive, setIsLive] = useState(false);

  const [todayActivities, setTodayActivities] = useState<Activity[]>([]);
  const [weekendActivities, setWeekendActivities] = useState<Activity[]>([]);
  const [browseActivities, setBrowseActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const providerFilters = useMemo(() => ({
    category: filters.category ?? undefined,
    ageOfChild: filters.ageOfChild ?? undefined,
    cost: filters.cost.length > 0 ? filters.cost : undefined,
    indoorOnly: filters.indoorOnly || undefined,
    rainyDay: filters.rainyDay || undefined,
    strollerFriendly: filters.strollerFriendly || undefined,
  }), [filters]);

  const loadToday = useCallback(async () => {
    setLoading(true);
    const today = new Date();
    const [todayRes, weekendRes] = await Promise.all([
      provider.getActivities(today, providerFilters),
      provider.getWeekendActivities(today, providerFilters),
    ]);
    setTodayActivities(todayRes);
    setWeekendActivities(weekendRes);
    setIsLive(provider.isLive);
    setLoading(false);
  }, [providerFilters]);

  const loadBrowse = useCallback(async () => {
    setLoading(true);
    const date = parseDateString(dateStr);
    const results = await provider.getActivities(date, providerFilters);
    setBrowseActivities(results);
    setIsLive(provider.isLive);
    setLoading(false);
  }, [dateStr, providerFilters]);

  useEffect(() => {
    if (viewMode === "today") loadToday();
  }, [viewMode, loadToday]);

  useEffect(() => {
    if (viewMode === "browse") loadBrowse();
  }, [viewMode, loadBrowse]);

  const handleQuickAction = (partial: Partial<FilterState>) => {
    setFilters({ ...defaultFilters, ...partial });
    setViewMode("today");
  };

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

      <QuickActions onApply={handleQuickAction} />

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
            subtitle="Our top picks for today in Berlin"
          />
          <ActivityList activities={todayActivities} loading={loading} />

          {weekendActivities.length > 0 && (
            <>
              <SectionHeader
                title="This Weekend"
                subtitle="Best picks for Saturday & Sunday"
              />
              <ActivityList activities={weekendActivities} loading={loading} />
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

      <footer className={styles.footer}>
        <p>Family Fun Finder — Berlin</p>
        <p className={styles.footerSub}>
          {isLive
            ? "Live data from Berlin event sources"
            : "Showing curated sample activities"}
        </p>
      </footer>
    </div>
  );
}
