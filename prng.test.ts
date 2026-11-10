import { deepEqual as assertEquals, ok } from "node:assert/strict";
import { test } from "node:test";
import { pcg32, PRNG } from "./prng.js";

test("PNRG [0, 1)", () => {
  assertEquals(
    Array.from(PRNG(42n).take(12)),
    [
      0.13170378981158137, 0.755355317145586, 0.5831400000024587, 0.21037689154036343,
      0.9376081398222595, 0.6338424978312105, 0.7061422956176102, 0.06342564942315221,
      0.2751847072504461, 0.004724327474832535, 0.18847966892644763, 0.5039901344571263,
    ],
  );

  for (const seed of [42n, 120n, 987654321n, 0n]) {
    for (const value of PRNG(seed).take(2 ** 18)) {
      ok(value >= 0);
      ok(value < 1);
    }
  }
});

test("PCG32", async (t) => {
  const prng = pcg32().take(6);

  assertEquals(Array.from(prng), [
    565663470n,
    3244226384n,
    2504567229n,
    903561869n,
    4026996297n,
    2722332799n,
  ]);

  await t.test("Rosetta 42, 54 first five", () => {
    assertEquals(Array.from(pcg32(42n, 54n).take(5)), [
      2707161783n,
      2068313097n,
      3122475824n,
      2211639955n,
      3215226955n,
    ]);
  });

  await t.test("Rosetta first 100,000", () => {
    const counts = [0, 0, 0, 0, 0];
    for (const integer of pcg32(987654321n, 1n).take(100_000)) {
      const float = Number(integer) / 2 ** 32;
      const bucket = Math.floor(5 * float);
      counts[bucket] = (counts[bucket] ?? 0) + 1;
    }

    assertEquals(counts, [20049, 20022, 20115, 19809, 20005]);
  });
});
