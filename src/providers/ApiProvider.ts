import type { Activity, ActivityProvider, CostLevel, Filters } from "./types";

export class ApiProvider implements ActivityProvider {
  private baseUrl: string;

  constructor(baseUrl = "/api") {
    this.baseUrl = baseUrl;
  }

  async getActivities(date: Date, filters?: Filters): Promise<Activity[]> {
    const params = new URLSearchParams();
    params.set("date", this.formatDate(date));
    this.appendFilters(params, filters);

    const res = await fetch(`${this.baseUrl}/activities?${params}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return data.activities;
  }

  async getWeekendActivities(fromDate: Date, filters?: Filters): Promise<Activity[]> {
    const dates = this.getWeekendDates(fromDate);
    if (dates.length === 0) return [];

    const from = this.formatDate(dates[0]);
    const to = this.formatDate(dates[dates.length - 1]);

    const params = new URLSearchParams();
    params.set("from", from);
    params.set("to", to);
    this.appendFilters(params, filters);

    const res = await fetch(`${this.baseUrl}/activities/range?${params}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return data.activities;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  private appendFilters(params: URLSearchParams, filters?: Filters) {
    if (!filters) return;
    if (filters.category) params.set("category", filters.category);
    if (filters.ageOfChild != null) params.set("age", String(filters.ageOfChild));
    if (filters.cost && filters.cost.length > 0) params.set("cost", (filters.cost as CostLevel[]).join(","));
    if (filters.indoorOnly) params.set("indoor", "true");
    if (filters.rainyDay) params.set("rainy", "true");
    if (filters.strollerFriendly) params.set("stroller", "true");
  }

  private getWeekendDates(fromDate: Date): Date[] {
    const dates: Date[] = [];
    const d = new Date(fromDate);
    for (let i = 0; i < 7; i++) {
      d.setDate(fromDate.getDate() + i);
      const dow = d.getDay();
      if (dow === 0 || dow === 6) dates.push(new Date(d));
    }
    return dates;
  }
}
