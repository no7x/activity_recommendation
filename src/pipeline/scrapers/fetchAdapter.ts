export interface FetchAdapter {
  get(url: string, headers?: Record<string, string>): Promise<string>;
  getJson<T = unknown>(url: string, headers?: Record<string, string>): Promise<T>;
}

export class ServerFetchAdapter implements FetchAdapter {
  private baseUrl: string;

  constructor(proxyBaseUrl: string = "/api/proxy") {
    this.baseUrl = proxyBaseUrl;
  }

  async get(url: string, headers?: Record<string, string>): Promise<string> {
    const res = await fetch(`${this.baseUrl}?url=${encodeURIComponent(url)}`, {
      headers: { ...headers, "Accept": "text/html" },
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} for ${url}`);
    return res.text();
  }

  async getJson<T = unknown>(url: string, headers?: Record<string, string>): Promise<T> {
    const res = await fetch(`${this.baseUrl}?url=${encodeURIComponent(url)}`, {
      headers: { ...headers, "Accept": "application/json" },
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} for ${url}`);
    return res.json() as Promise<T>;
  }
}
