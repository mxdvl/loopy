import { deepEqual as assertEquals, ok } from "node:assert/strict";
import { test } from "node:test";
import { createAlmanac } from "./almanac.js";
import { take } from "./helpers.js";
import { paginate } from "./paginate.js";

test("almanac", async (t) => {
  await t.test("starts on the epoch, a Thursday", async () => {
    const { fetchPage } = createAlmanac();
    const { items, next } = await fetchPage();

    assertEquals(next, 1);
    assertEquals(items.length, 7);
    assertEquals(items[0], {
      day: 0,
      date: "1970-01-01",
      weekday: "Thursday",
      season: "winter",
      moon: "🌗",
      sunrise: "07:25",
      sunset: "17:03",
      tides: [
        { clock: "04:40", kind: "high water", height: 1.54 },
        { clock: "11:47", kind: "low water", height: 0.41 },
        { clock: "17:30", kind: "high water", height: 0.95 },
        { clock: "22:25", kind: "low water", height: 0.59 },
      ],
      lowest: 0.41,
    });
  });

  await t.test("gives the same week whenever it is asked", async () => {
    const [once, again] = [createAlmanac(), createAlmanac({ seed: 7n })];

    assertEquals(await once.fetchPage(2944), await again.fetchPage(2944));
  });

  await t.test("can be made to stop", async () => {
    const { fetchPage, requests } = createAlmanac({ weeks: 3 });
    const days = await Array.fromAsync(paginate(fetchPage));

    assertEquals(
      days.map(({ day }) => day),
      Array.from(Array(21).keys()),
    );
    assertEquals(requests, [0, 1, 2]);
  });

  await t.test("has no last page otherwise", async () => {
    const { fetchPage, requests } = createAlmanac();
    const days = await Array.fromAsync(take(paginate(fetchPage), 1000));

    assertEquals(days.at(-1)?.date, "1972-09-26");
    assertEquals(requests.length, 143);
    ok(days.every(({ tides }) => tides.length === 3 || tides.length === 4));
  });

  await t.test("knows of a Friday the 13th under a full moon", async () => {
    const { fetchPage, requests } = createAlmanac();
    for await (const day of paginate(fetchPage)) {
      if (day.date !== "1970-11-13") continue;
      assertEquals([day.weekday, day.moon, day.season], ["Friday", "🌕", "autumn"]);
      break;
    }

    assertEquals(requests.length, 46);
  });
});
