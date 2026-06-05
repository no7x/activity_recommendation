import styles from "./HeroBanner.module.css";

export function HeroBanner() {
  return (
    <header className={styles.hero}>
      <div className={styles.inner}>
        <span className={styles.location}>Berlin</span>
        <h1 className={styles.title}>Family Fun Finder</h1>
        <p className={styles.subtitle}>
          Discover the best activities and events for you and your kids — curated
          daily, just for Berlin families.
        </p>
      </div>
    </header>
  );
}
