import type { Category, CostLevel } from "../providers/types";
import styles from "./FilterBar.module.css";

const categories: Category[] = [
  "Outdoor",
  "Arts & Crafts",
  "Sports",
  "Educational",
  "Music",
  "Nature",
  "Cooking",
  "Science",
];

const categoryEmojis: Record<Category, string> = {
  Outdoor: "🌳",
  "Arts & Crafts": "🎨",
  Sports: "⚽",
  Educational: "📚",
  Music: "🎵",
  Nature: "🌿",
  Cooking: "👨‍🍳",
  Science: "🧪",
};

const costOptions: { value: CostLevel; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "budget", label: "Under €10" },
  { value: "moderate", label: "€10-20" },
  { value: "premium", label: "€20+" },
];

const ageOptions = [
  { value: 0, label: "All ages" },
  { value: 2, label: "0-3" },
  { value: 5, label: "4-6" },
  { value: 8, label: "7-9" },
  { value: 11, label: "10-12" },
];

export interface FilterState {
  category: Category | null;
  ageOfChild: number | null;
  cost: CostLevel[];
  rainyDay: boolean;
  indoorOnly: boolean;
  strollerFriendly: boolean;
}

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const toggleCost = (cost: CostLevel) => {
    const current = filters.cost;
    const next = current.includes(cost)
      ? current.filter((c) => c !== cost)
      : [...current, cost];
    onChange({ ...filters, cost: next });
  };

  const activeCount =
    (filters.category ? 1 : 0) +
    (filters.ageOfChild != null ? 1 : 0) +
    filters.cost.length +
    (filters.rainyDay ? 1 : 0) +
    (filters.indoorOnly ? 1 : 0) +
    (filters.strollerFriendly ? 1 : 0);

  return (
    <div className={styles.bar}>
      <div className={styles.section}>
        <div className={styles.chips}>
          <button
            className={`${styles.chip} ${filters.category === null ? styles.active : ""}`}
            onClick={() => onChange({ ...filters, category: null })}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`${styles.chip} ${filters.category === cat ? styles.active : ""}`}
              onClick={() =>
                onChange({
                  ...filters,
                  category: filters.category === cat ? null : cat,
                })
              }
            >
              {categoryEmojis[cat]} {cat}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.chips}>
          {ageOptions.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.chip} ${styles.small} ${
                opt.value === 0
                  ? filters.ageOfChild == null
                    ? styles.active
                    : ""
                  : filters.ageOfChild === opt.value
                    ? styles.active
                    : ""
              }`}
              onClick={() =>
                onChange({
                  ...filters,
                  ageOfChild: opt.value === 0 ? null : opt.value,
                })
              }
            >
              {opt.value === 0 ? "All ages" : `Ages ${opt.label}`}
            </button>
          ))}

          <span className={styles.divider} />

          {costOptions.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.chip} ${styles.small} ${filters.cost.includes(opt.value) ? styles.active : ""}`}
              onClick={() => toggleCost(opt.value)}
            >
              {opt.label}
            </button>
          ))}

          <span className={styles.divider} />

          <button
            className={`${styles.chip} ${styles.small} ${filters.rainyDay ? styles.active : ""}`}
            onClick={() =>
              onChange({ ...filters, rainyDay: !filters.rainyDay })
            }
          >
            Rainy day
          </button>
          <button
            className={`${styles.chip} ${styles.small} ${filters.indoorOnly ? styles.active : ""}`}
            onClick={() =>
              onChange({ ...filters, indoorOnly: !filters.indoorOnly })
            }
          >
            Indoor
          </button>
          <button
            className={`${styles.chip} ${styles.small} ${filters.strollerFriendly ? styles.active : ""}`}
            onClick={() =>
              onChange({
                ...filters,
                strollerFriendly: !filters.strollerFriendly,
              })
            }
          >
            Stroller OK
          </button>
        </div>
      </div>

      {activeCount > 0 && (
        <button
          className={styles.clear}
          onClick={() =>
            onChange({
              category: null,
              ageOfChild: null,
              cost: [],
              rainyDay: false,
              indoorOnly: false,
              strollerFriendly: false,
            })
          }
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
