import type { FetchAdapter } from "../../src/pipeline/scrapers/fetchAdapter";

export class NodeFetchAdapter implements FetchAdapter {
  private userAgent: string;

  constructor(userAgent = "FamilyFunFinder/1.0 (Berlin family activity aggregator)") {
    this.userAgent = userAgent;
  }

  async get(url: string, headers?: Record<string, string>): Promise<string> {
    const res = await fetch(url, {
      headers: {
        "User-Agent": this.userAgent,
        Accept: "text/html",
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
        ...headers,
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.text();
  }

  async getJson<T = unknown>(url: string, headers?: Record<string, string>): Promise<T> {
    const res = await fetch(url, {
      headers: {
        "User-Agent": this.userAgent,
        Accept: "application/json",
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
        ...headers,
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json() as Promise<T>;
  }
}
