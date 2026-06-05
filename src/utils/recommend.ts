import type { Activity, DayOfWeek, Filters, Season } from "../providers/types";

function getSeason(date: Date): Season {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter";
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getRecommendations(
  allActivities: Activity[],
  date: Date,
  filters?: Filters
): Activity[] {
  const dayOfWeek = date.getDay() as DayOfWeek;
  const season = getSeason(date);

  let filtered = allActivities.filter((activity) => {
    if (activity.seasonal && !activity.seasonal.includes(season)) return false;
    if (activity.daysOfWeek && !activity.daysOfWeek.includes(dayOfWeek))
      return false;
    if (filters?.category && activity.category !== filters.category)
      return false;
    return true;
  });

  filtered.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    if (a.daysOfWeek?.includes(dayOfWeek)) scoreA += 2;
    if (b.daysOfWeek?.includes(dayOfWeek)) scoreB += 2;

    if (a.seasonal?.includes(season)) scoreA += 1;
    if (b.seasonal?.includes(season)) scoreB += 1;

    return scoreB - scoreA;
  });

  const topMatches = filtered.slice(0, Math.min(8, filtered.length));
  const rest = filtered.slice(8);

  return [...topMatches, ...shuffle(rest)];
}
