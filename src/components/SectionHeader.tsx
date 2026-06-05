import styles from "./SectionHeader.module.css";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  count?: number;
}

export function SectionHeader({ title, subtitle, count }: SectionHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.titleRow}>
        <h2 className={styles.title}>{title}</h2>
        {count != null && (
          <span className={styles.count}>{count} activities</span>
        )}
      </div>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  );
}
