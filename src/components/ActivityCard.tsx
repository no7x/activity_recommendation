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
        <div className={styles.topBadges}>
          <span className={styles.category}>{activity.category}</span>
          <span className={styles.time}>{timeLabels[activity.timeOfDay]}</span>
          {activity.isRainyDayFriendly && (
            <span className={styles.rainy}>Rainy day OK</span>
          )}
        </div>
        <h3 className={styles.title}>{activity.title}</h3>
        <p className={styles.description}>{activity.description}</p>
        <div className={styles.details}>
          <span className={styles.detail}>
            Ages {activity.ageMin}-{activity.ageMax}
          </span>
          <span className={styles.detail}>{activity.costNote}</span>
          <span className={styles.detail}>{activity.neighborhood}</span>
        </div>
        <div className={styles.bottomBadges}>
          {activity.isIndoor && <span className={styles.badge}>Indoor</span>}
          {!activity.isIndoor && <span className={styles.badge}>Outdoor</span>}
          {activity.isStrollerFriendly && (
            <span className={styles.badge}>Stroller OK</span>
          )}
          {activity.bookingRequired && (
            <span className={styles.bookBadge}>Booking needed</span>
          )}
        </div>
      </div>
    </article>
  );
}
