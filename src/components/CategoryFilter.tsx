import type { Category } from "../providers/types";
import styles from "./CategoryFilter.module.css";

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

interface CategoryFilterProps {
  selected: Category | null;
  onChange: (category: Category | null) => void;
}

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div className={styles.wrapper}>
      <button
        className={`${styles.chip} ${selected === null ? styles.active : ""}`}
        onClick={() => onChange(null)}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          className={`${styles.chip} ${selected === cat ? styles.active : ""}`}
          onClick={() => onChange(cat)}
        >
          {categoryEmojis[cat]} {cat}
        </button>
      ))}
    </div>
  );
}
