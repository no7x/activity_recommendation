import { activities } from "../data/activities";
import {
  getRecommendations,
  getWeekendActivities,
} from "../utils/recommend";
import type { Activity, ActivityProvider, Filters } from "./types";

export class StaticProvider implements ActivityProvider {
  async getActivities(date: Date, filters?: Filters): Promise<Activity[]> {
    return getRecommendations(activities, date, filters);
  }

  async getWeekendActivities(
    fromDate: Date,
    filters?: Filters
  ): Promise<Activity[]> {
    return getWeekendActivities(activities, fromDate, filters);
  }
}
