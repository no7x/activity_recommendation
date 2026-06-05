export type Season = "spring" | "summer" | "fall" | "winter";
export type TimeOfDay = "morning" | "afternoon" | "evening" | "all-day";
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Category =
  | "Outdoor"
  | "Arts & Crafts"
  | "Sports"
  | "Educational"
  | "Music"
  | "Nature"
  | "Cooking"
  | "Science";

export interface Activity {
  id: string;
  title: string;
  description: string;
  category: Category;
  ageRange: string;
  imageEmoji: string;
  tags: string[];
  daysOfWeek: DayOfWeek[] | null;
  seasonal: Season[] | null;
  timeOfDay: TimeOfDay;
}

export interface Filters {
  category?: Category;
}

export interface ActivityProvider {
  getActivities(date: Date, filters?: Filters): Promise<Activity[]>;
}
