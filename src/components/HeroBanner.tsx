import styles from "./HeroBanner.module.css";

export function HeroBanner() {
  return (
    <section className={styles.hero}>
      <h1 className={styles.title}>Family Fun Finder</h1>
      <p className={styles.subtitle}>
        Discover amazing activities and events to enjoy with your kids — pick a
        date and get inspired!
      </p>
    </section>
  );
}
