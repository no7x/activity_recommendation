import { activities } from "../../src/data/activities";
import { createDb } from "./db";
import { EventStore } from "./eventStore";

const db = createDb();
const store = new EventStore(db);

const today = new Date();
let seeded = 0;

for (const activity of activities) {
  // Create events for the next 14 days based on activity schedule
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dow = date.getDay();

    if (activity.daysOfWeek && !activity.daysOfWeek.includes(dow as 0|1|2|3|4|5|6)) {
      continue;
    }

    const dateStr = date.toISOString().slice(0, 10);

    store.upsertEvent({
      id: `static-${activity.id}-${dateStr}`,
      source: "manual",
      sourceId: `${activity.id}-${dateStr}`,
      title: activity.title,
      description: activity.description,
      url: "",
      dateStart: dateStr,
      location: activity.neighborhood,
      neighborhood: activity.neighborhood,
      price: activity.costNote,
      ageMin: activity.ageMin,
      ageMax: activity.ageMax,
      category: activity.category,
      imageEmoji: activity.imageEmoji,
      costLevel: activity.cost,
      costNote: activity.costNote,
      isIndoor: activity.isIndoor,
      isRainyDayFriendly: activity.isRainyDayFriendly,
      isStrollerFriendly: activity.isStrollerFriendly,
      bookingUrl: activity.bookingUrl ?? undefined,
      bookingRequired: activity.bookingRequired,
      tags: activity.tags,
      timeOfDay: activity.timeOfDay,
    });
    seeded++;
  }
}

console.log(`Seeded ${seeded} events from ${activities.length} activities over 14 days`);
db.close();
