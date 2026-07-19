/**
 * Profile scheduling compute without HTTP overhead.
 * Usage: node scripts/bench-shifts-compute.mjs
 */
import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import {
  buildEditorOpenSlotKeys,
  buildVanSlotOccupancy,
  vanCapacitySummary,
} from "../lib/scheduling/van-capacity.ts";
import { shiftAnalyticsSummary } from "../lib/scheduling/shift-analytics.ts";
import { getShiftHorizonEndDate, getTodayPacificDate } from "../lib/scheduling/slots.ts";

const raw = readFileSync("data/scheduling.json", "utf8");
const data = JSON.parse(raw);
const today = getTodayPacificDate();
const maxDate = getShiftHorizonEndDate();

function bench(label, fn, runs = 3) {
  // warmup
  fn();
  const times = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    const result = fn();
    times.push(performance.now() - start);
    if (i === 0) {
      const size = Array.isArray(result)
        ? result.length
        : result?.availableTimeslots?.length ?? result?.available?.days30 ?? "n/a";
      console.log(`  result size: ${size}`);
    }
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`${label}: avg ${avg.toFixed(0)}ms (${times.map((t) => t.toFixed(0)).join(", ")}ms)`);
}

console.log(
  `Data: ${data.availability.length} availability days, ${data.appointments.length} appointments`
);
console.log(`Horizon: ${today} → ${maxDate}\n`);

bench("buildVanSlotOccupancy(nissan)", () =>
  buildVanSlotOccupancy(data, { from: today, to: maxDate, van: "nissan", groomerId: "melanie" })
);
bench("buildVanSlotOccupancy(dodge)", () =>
  buildVanSlotOccupancy(data, { from: today, to: maxDate, van: "dodge", groomerId: "melanie" })
);
bench("buildEditorOpenSlotKeys(nissan)", () =>
  buildEditorOpenSlotKeys(data, "melanie", { from: today, to: maxDate, van: "nissan" })
);
bench("vanCapacitySummary(nissan)", () => vanCapacitySummary(data, { van: "nissan", groomerId: "melanie" }));
bench("shiftAnalyticsSummary", () => shiftAnalyticsSummary(data));

console.log("\nSimulated single availability GET (nissan):");
bench("availability GET work", () => {
  buildEditorOpenSlotKeys(data, "melanie", { from: today, to: maxDate, van: "nissan" });
  buildVanSlotOccupancy(data, { from: today, to: maxDate, van: "nissan", groomerId: "melanie" });
});

console.log("\nSimulated admin Shifts tab server work (5 endpoints, sequential):");
bench("all 5 endpoints CPU", () => {
  shiftAnalyticsSummary(data);
  buildEditorOpenSlotKeys(data, "melanie", { from: today, to: maxDate, van: "nissan" });
  buildVanSlotOccupancy(data, { from: today, to: maxDate, van: "nissan", groomerId: "melanie" });
  buildEditorOpenSlotKeys(data, "melanie", { from: today, to: maxDate, van: "dodge" });
  buildVanSlotOccupancy(data, { from: today, to: maxDate, van: "dodge", groomerId: "melanie" });
  vanCapacitySummary(data, { van: "nissan", groomerId: "melanie" });
  vanCapacitySummary(data, { van: "dodge", groomerId: "melanie" });
}, 1);
