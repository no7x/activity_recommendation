import type { Request, Response } from "express";

const ALLOWED_DOMAINS = [
  "kindaling.de",
  "himbeer.com",
  "berlin.de",
  "familienportal.de",
  "fez-berlin.de",
  "museumfuernaturkunde.berlin",
  "technikmuseum.berlin",
  "machmitmuseum.de",
  "labyrinth-kindermuseum.de",
  "jmberlin.de",
  "smb.museum",
  "zoo-berlin.de",
  "tierpark-berlin.de",
  "aquarium-berlin.de",
];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS.some(
      (domain) =>
        parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

export async function proxyHandler(req: Request, res: Response) {
  const targetUrl = req.query.url as string;

  if (!targetUrl) {
    res.status(400).json({ error: "Missing url parameter" });
    return;
  }

  if (!isAllowedUrl(targetUrl)) {
    res.status(403).json({ error: "Domain not in allowlist" });
    return;
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "FamilyFunFinder/1.0 (Berlin family activity aggregator; contact@familyfunfinder.de)",
        Accept: (req.headers.accept as string) || "text/html",
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    });

    const contentType = response.headers.get("content-type") ?? "text/html";

    if (contentType.includes("application/json")) {
      const data = await response.json();
      res.json(data);
    } else {
      const text = await response.text();
      res.type("text/html").send(text);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Proxy fetch failed";
    res.status(502).json({ error: message });
  }
}
