import { createDb } from "./db";
import { NodeFetchAdapter } from "./NodeFetchAdapter";
import { PipelineRunner } from "./pipelineRunner";

const args = process.argv.slice(2);
const daysAhead = parseInt(args.find((a) => a.startsWith("--days="))?.split("=")[1] ?? "14", 10);
const sourcesArg = args.find((a) => a.startsWith("--sources="))?.split("=")[1];
const sources = sourcesArg ? sourcesArg.split(",") : undefined;

const dateFrom = new Date();
const dateTo = new Date();
dateTo.setDate(dateTo.getDate() + daysAhead);

console.log(`Pipeline run: ${dateFrom.toISOString().slice(0, 10)} to ${dateTo.toISOString().slice(0, 10)}`);
if (sources) console.log(`Sources: ${sources.join(", ")}`);
else console.log("Sources: all");

const db = createDb();
const runner = new PipelineRunner(db, new NodeFetchAdapter());

try {
  const result = await runner.run(dateFrom, dateTo, sources);

  console.log("\n--- Results ---");
  console.log(`Total events: ${result.total}`);
  console.log(`New: ${result.inserted}`);
  console.log(`Updated: ${result.updated}`);
  console.log(`Duplicates removed: ${result.duplicatesRemoved}`);
  console.log(`Duration: ${result.durationMs}ms`);

  if (result.errors.length > 0) {
    console.log(`\nErrors (${result.errors.length}):`);
    for (const err of result.errors) {
      console.log(`  [${err.source}] ${err.message}`);
    }
  }
} catch (err) {
  console.error("Pipeline failed:", err);
  process.exit(1);
} finally {
  db.close();
}
