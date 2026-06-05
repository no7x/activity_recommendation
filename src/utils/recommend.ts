import type { Activity, DayOfWeek, Filters, Season } from "../providers/types";

function getSeason(date: Date): Season {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter";
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function dateSeed(date: Date): number {
  return date.getFullYear() * 10000 + date.getMonth() * 100 + date.getDate();
}

function applyFilters(activities: Activity[], filters?: Filters): Activity[] {
  if (!filters) return activities;

  return activities.filter((a) => {
    if (filters.category && a.category !== filters.category) return false;
    if (filters.ageOfChild != null) {
      if (filters.ageOfChild < a.ageMin || filters.ageOfChild > a.ageMax)
        return false;
    }
    if (filters.cost && filters.cost.length > 0) {
      if (!filters.cost.includes(a.cost)) return false;
    }
    if (filters.indoorOnly && !a.isIndoor) return false;
    if (filters.rainyDay && !a.isRainyDayFriendly) return false;
    if (filters.strollerFriendly && !a.isStrollerFriendly) return false;
    return true;
  });
}

function curate(activities: Activity[], seed: number, limit = 10): Activity[] {
  if (activities.length <= limit) return activities;

  const shuffled = seededShuffle(activities, seed);
  const picked: Activity[] = [];
  const usedCategories = new Set<string>();

  // First: one from each category
  for (const a of shuffled) {
    if (picked.length >= limit) break;
    if (!usedCategories.has(a.category)) {
      usedCategories.add(a.category);
      picked.push(a);
    }
  }

  // Fill remaining with variety
  const remaining = shuffled.filter((a) => !picked.includes(a));
  for (const a of remaining) {
    if (picked.length >= limit) break;
    picked.push(a);
  }

  return picked;
}

export function getRecommendations(
  allActivities: Activity[],
  date: Date,
  filters?: Filters
): Activity[] {
  const dayOfWeek = date.getDay() as DayOfWeek;
  const season = getSeason(date);

  let results = allActivities.filter((a) => {
    if (a.seasonal && !a.seasonal.includes(season)) return false;
    if (a.daysOfWeek && !a.daysOfWeek.includes(dayOfWeek)) return false;
    return true;
  });

  results = applyFilters(results, filters);

  results.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    if (a.daysOfWeek?.includes(dayOfWeek)) scoreA += 2;
    if (b.daysOfWeek?.includes(dayOfWeek)) scoreB += 2;
    if (a.seasonal?.includes(season)) scoreA += 1;
    if (b.seasonal?.includes(season)) scoreB += 1;
    return scoreB - scoreA;
  });

  return curate(results, dateSeed(date), 10);
}

export function getWeekendDates(fromDate: Date): Date[] {
  const dates: Date[] = [];
  const d = new Date(fromDate);
  for (let i = 0; i < 7; i++) {
    d.setDate(fromDate.getDate() + i);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) {
      dates.push(new Date(d));
    }
  }
  return dates;
}

export function getWeekendActivities(
  allActivities: Activity[],
  fromDate: Date,
  filters?: Filters
): Activity[] {
  const weekendDates = getWeekendDates(fromDate);
  if (weekendDates.length === 0) return [];

  const seen = new Set<string>();
  const results: Activity[] = [];

  for (const date of weekendDates) {
    const recs = getRecommendations(allActivities, date, filters);
    for (const a of recs) {
      if (!seen.has(a.id)) {
        seen.add(a.id);
        results.push(a);
      }
    }
  }

  return curate(results, dateSeed(fromDate), 12);
}
