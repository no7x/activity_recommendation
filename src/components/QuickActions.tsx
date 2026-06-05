import type { FilterState } from "./FilterBar";
import styles from "./QuickActions.module.css";

interface QuickActionsProps {
  onApply: (filters: Partial<FilterState>) => void;
}

const actions = [
  { label: "Free today", emoji: "🆓", filters: { cost: ["free" as const] } },
  { label: "Rainy day ideas", emoji: "🌧️", filters: { rainyDay: true, indoorOnly: true } },
  { label: "Toddler friendly", emoji: "👶", filters: { ageOfChild: 2, strollerFriendly: true } },
  { label: "Weekend outdoors", emoji: "☀️", filters: { category: "Outdoor" as const } },
];

export function QuickActions({ onApply }: QuickActionsProps) {
  return (
    <div className={styles.wrapper}>
      <p className={styles.label}>Quick picks</p>
      <div className={styles.actions}>
        {actions.map((action) => (
          <button
            key={action.label}
            className={styles.action}
            onClick={() => onApply(action.filters)}
          >
            <span className={styles.emoji}>{action.emoji}</span>
            <span className={styles.text}>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
