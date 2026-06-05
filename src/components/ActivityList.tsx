import type { Activity } from "../providers/types";
import { ActivityCard } from "./ActivityCard";
import styles from "./ActivityList.module.css";

interface ActivityListProps {
  activities: Activity[];
  loading: boolean;
}

export function ActivityList({ activities, loading }: ActivityListProps) {
  if (loading) {
    return <p className={styles.message}>Loading activities...</p>;
  }

  if (activities.length === 0) {
    return (
      <p className={styles.message}>
        No activities found for this date and filters. Try a different date or
        category!
      </p>
    );
  }

  return (
    <div className={styles.grid}>
      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  );
}
