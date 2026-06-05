import { activities } from "../data/activities";
import { getRecommendations } from "../utils/recommend";
import type { Activity, ActivityProvider, Filters } from "./types";

export class StaticProvider implements ActivityProvider {
  async getActivities(date: Date, filters?: Filters): Promise<Activity[]> {
    return getRecommendations(activities, date, filters);
  }
}
