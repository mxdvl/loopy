// deno run examples/sensors.js
import { sleep, take } from "../helpers.js";
import { merge, zip } from "../merge.js";
import { pcg32 } from "../prng.js";

/**
 * A pretend sensor that reports at irregular, but seeded, intervals.
 * @param {string} name
 * @param {bigint} seed
 */
async function* sensor(name, seed) {
  const start = performance.now();
  try {
    for (const int of pcg32(seed)) {
      await sleep(100 + Number(int % 400n));
      yield `${name} at ${Math.round(performance.now() - start)}ms`;
    }
  } finally {
    console.log(`  (${name} switched off)`);
  }
}

console.log("merge: each reading as soon as it happens");
const sensors = merge(sensor("🌡️", 1n), sensor("💧", 2n), sensor("🌬️", 3n));
for await (const reading of take(sensors, 9)) {
  console.log(reading);
}

console.log("zip: one reading from each, at the pace of the slowest");
const rounds = zip(sensor("🌡️", 1n), sensor("💧", 2n), sensor("🌬️", 3n));
for await (const readings of take(rounds, 3)) {
  console.log(readings.join(" | "));
}
