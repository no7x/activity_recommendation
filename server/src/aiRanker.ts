import OpenAI from "openai";
import type { Activity } from "../../src/providers/types";

export interface RankingContext {
  childAge?: number;
  date: Date;
  preferences?: string[];
  previouslyShown?: string[];
}

interface RankedActivity {
  id: string;
  score: number;
  reason: string;
}

export class AiRanker {
  private client: OpenAI;
  private model = "gpt-4o-mini";

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey ?? process.env.OPENAI_API_KEY,
    });
  }

  async rank(
    activities: Activity[],
    context: RankingContext,
    limit = 10
  ): Promise<Activity[]> {
    if (activities.length <= limit) return activities;

    const dayName = context.date.toLocaleDateString("en-US", { weekday: "long" });
    const month = context.date.toLocaleDateString("en-US", { month: "long" });
    const hour = new Date().getHours();
    const timeContext = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

    const activitySummaries = activities.map((a) => ({
      id: a.id,
      title: a.title,
      category: a.category,
      ages: `${a.ageMin}-${a.ageMax}`,
      cost: a.costNote,
      neighborhood: a.neighborhood,
      indoor: a.isIndoor,
      stroller: a.isStrollerFriendly,
      time: a.timeOfDay,
    }));

    const prompt = `You are a family activity curator for Berlin. Pick the ${limit} best activities for this family and rank them.

Context:
- Day: ${dayName}, ${month}
- Time of day: ${timeContext}
${context.childAge != null ? `- Child's age: ${context.childAge} years old` : "- No specific age given"}
${context.preferences?.length ? `- Parent preferences: ${context.preferences.join(", ")}` : ""}
${context.previouslyShown?.length ? `- Already shown recently (avoid repeating): ${context.previouslyShown.join(", ")}` : ""}

Available activities:
${JSON.stringify(activitySummaries, null, 1)}

Rules:
- Pick diverse categories (don't cluster)
- Include at least 2 free options
- Mix indoor and outdoor
- Match time of day when possible
- For young children (<4), prefer stroller-friendly
- Weekend = more ambitious activities; weekday = simpler ones
- Consider seasonal appropriateness for ${month}

Return ONLY a JSON array of objects with "id", "score" (1-10), and "reason" (one short sentence). No markdown, no explanation outside the array.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content ?? "[]";
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const ranked: RankedActivity[] = JSON.parse(cleaned);

      const idToActivity = new Map(activities.map((a) => [a.id, a]));
      const result: Activity[] = [];

      const sorted = ranked.sort((a, b) => b.score - a.score);
      for (const r of sorted) {
        const activity = idToActivity.get(r.id);
        if (activity) result.push(activity);
      }

      // Fill with unranked activities if AI returned fewer than limit
      if (result.length < limit) {
        for (const a of activities) {
          if (result.length >= limit) break;
          if (!result.includes(a)) result.push(a);
        }
      }

      return result.slice(0, limit);
    } catch (err) {
      console.error("[AiRanker] Failed, falling back to default order:", err instanceof Error ? err.message : err);
      return activities.slice(0, limit);
    }
  }

  isAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }
}
