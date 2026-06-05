import type { Activity, Filters } from "./types";
import { ApiProvider } from "./ApiProvider";
import { StaticProvider } from "./StaticProvider";

export class SmartProvider {
  private api = new ApiProvider();
  private fallback = new StaticProvider();
  private useApi: boolean | null = null;

  async init(): Promise<void> {
    this.useApi = await this.api.isAvailable();
  }

  get isLive(): boolean {
    return this.useApi === true;
  }

  async getActivities(date: Date, filters?: Filters): Promise<Activity[]> {
    if (this.useApi === null) await this.init();

    if (this.useApi) {
      try {
        return await this.api.getActivities(date, filters);
      } catch {
        return this.fallback.getActivities(date, filters);
      }
    }
    return this.fallback.getActivities(date, filters);
  }

  async getWeekendActivities(fromDate: Date, filters?: Filters): Promise<Activity[]> {
    if (this.useApi === null) await this.init();

    if (this.useApi) {
      try {
        return await this.api.getWeekendActivities(fromDate, filters);
      } catch {
        return this.fallback.getWeekendActivities(fromDate, filters);
      }
    }
    return this.fallback.getWeekendActivities(fromDate, filters);
  }
}
