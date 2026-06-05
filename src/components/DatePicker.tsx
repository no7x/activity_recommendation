import styles from "./DatePicker.module.css";

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  return (
    <div className={styles.wrapper}>
      <label className={styles.label} htmlFor="date-input">
        Pick a date
      </label>
      <input
        id="date-input"
        type="date"
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
