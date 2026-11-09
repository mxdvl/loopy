// deno run examples/clocks.js
import { sleep, take } from "../helpers.js";
import { merge, zip } from "../merge.js";
import { pcg32 } from "../prng.js";

/**
 * A clock that strikes about once an hour. Here an hour lasts roughly
 * a third of a second, and every clock drifts in its own seeded way.
 * @param {string} name
 * @param {bigint} seed
 */
async function* clock(name, seed) {
  const start = performance.now();
  let hour = 0;
  try {
    for (const int of pcg32(seed)) {
      await sleep(100 + Number(int % 400n));
      hour = (hour % 12) + 1;
      yield `${name} strikes ${hour} (${Math.round(performance.now() - start)}ms)`;
    }
  } finally {
    console.log(`  (the ${name} clock stops)`);
  }
}

const clocks = () => [clock("tower", 1n), clock("station", 2n), clock("chapel", 3n)];

console.log("merge: every chime, as soon as it rings");
for await (const chime of take(merge(...clocks()), 9)) {
  console.log(chime);
}

console.log("zip: once all three have struck, at the pace of the slowest");
for await (const chimes of take(zip(...clocks()), 3)) {
  console.log(chimes.join(" | "));
}
