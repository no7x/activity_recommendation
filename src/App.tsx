import { useCallback, useEffect, useState } from "react";
import styles from "./App.module.css";
import { ActivityList } from "./components/ActivityList";
import { CategoryFilter } from "./components/CategoryFilter";
import { DatePicker } from "./components/DatePicker";
import { HeroBanner } from "./components/HeroBanner";
import type { Activity, Category } from "./providers";
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

export default function App() {
  const [dateStr, setDateStr] = useState(formatDateString(new Date()));
  const [category, setCategory] = useState<Category | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    const date = parseDateString(dateStr);
    const filters = category ? { category } : undefined;
    const results = await provider.getActivities(date, filters);
    setActivities(results);
    setLoading(false);
  }, [dateStr, category]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const date = parseDateString(dateStr);
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  const dateLabel = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className={styles.app}>
      <HeroBanner />
      <div className={styles.controls}>
        <DatePicker value={dateStr} onChange={setDateStr} />
        <p className={styles.dateInfo}>
          Showing activities for <strong>{dayName}</strong>, {dateLabel} in{" "}
          <strong>Berlin</strong>
        </p>
        <CategoryFilter selected={category} onChange={setCategory} />
      </div>
      <ActivityList activities={activities} loading={loading} />
    </div>
  );
}
