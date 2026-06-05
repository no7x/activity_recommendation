import type { Activity } from "../providers/types";
import styles from "./ActivityCard.module.css";

interface ActivityCardProps {
  activity: Activity;
}

const timeLabels = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  "all-day": "All Day",
};

export function ActivityCard({ activity }: ActivityCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.emoji}>{activity.imageEmoji}</div>
      <div className={styles.content}>
        <div className={styles.badges}>
          <span className={styles.category}>{activity.category}</span>
          <span className={styles.time}>{timeLabels[activity.timeOfDay]}</span>
        </div>
        <h3 className={styles.title}>{activity.title}</h3>
        <p className={styles.description}>{activity.description}</p>
        <div className={styles.meta}>
          <span className={styles.age}>Ages {activity.ageRange}</span>
          <div className={styles.tags}>
            {activity.tags.slice(0, 3).map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
