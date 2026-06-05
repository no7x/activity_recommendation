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

export type CostLevel = "free" | "budget" | "moderate" | "premium";

export interface Activity {
  id: string;
  title: string;
  description: string;
  category: Category;
  ageMin: number;
  ageMax: number;
  imageEmoji: string;
  tags: string[];
  daysOfWeek: DayOfWeek[] | null;
  seasonal: Season[] | null;
  timeOfDay: TimeOfDay;
  cost: CostLevel;
  costNote: string;
  neighborhood: string;
  isIndoor: boolean;
  isRainyDayFriendly: boolean;
  isStrollerFriendly: boolean;
  bookingUrl: string | null;
  bookingRequired: boolean;
}

export interface Filters {
  category?: Category;
  ageOfChild?: number;
  cost?: CostLevel[];
  indoorOnly?: boolean;
  rainyDay?: boolean;
  strollerFriendly?: boolean;
}

export interface ActivityProvider {
  getActivities(date: Date, filters?: Filters): Promise<Activity[]>;
}
