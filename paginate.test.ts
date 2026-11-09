import { assertEquals } from "jsr:@std/assert";
import { createAlmanac } from "./almanac.js";
import { take } from "./helpers.js";
import { paginate } from "./paginate.js";

Deno.test({
  name: "paginate",
  async fn(t) {
    await t.step({
      name: "yields every item, across all pages",
      async fn() {
        const { fetchPage, requests } = createAlmanac({ weeks: 3 });
        const days = await Array.fromAsync(paginate(fetchPage));

        assertEquals(days.map(({ day }) => day), Array.from(Array(21).keys()));
        assertEquals(requests, [0, 1, 2]);
      },
    });

    await t.step({
      name: "only requests the pages that are consumed",
      async fn() {
        const { fetchPage, requests } = createAlmanac();
        const days = await Array.fromAsync(take(paginate(fetchPage), 16));

        assertEquals(days.length, 16);
        assertEquals(requests, [0, 1, 2]);
      },
    });

    await t.step({
      name: "can start from a cursor",
      async fn() {
        const { fetchPage, requests } = createAlmanac({ weeks: 3 });
        const days = await Array.fromAsync(paginate(fetchPage, 2));

        assertEquals(days.map(({ day }) => day), [14, 15, 16, 17, 18, 19, 20]);
        assertEquals(requests, [2]);
      },
    });

    await t.step({
      name: "handles an empty source",
      async fn() {
        const { fetchPage, requests } = createAlmanac({ weeks: 0 });

        assertEquals(await Array.fromAsync(paginate(fetchPage)), []);
        assertEquals(requests, [0]);
      },
    });
  },
});

Deno.test({
  name: "almanac",
  async fn(t) {
    const week = (seed: bigint) =>
      Array.fromAsync(take(paginate(createAlmanac({ seed }).fetchPage), 7));

    await t.step({
      name: "starts on the epoch, a Thursday",
      async fn() {
        const [first] = await week(42n);

        assertEquals(first, {
          day: 0,
          date: "1970-01-01",
          weekday: "Thursday",
          moon: "🌗",
          sky: "cloud",
        });
      },
    });

    await t.step({
      name: "has the same sky for the same seed only",
      async fn() {
        const skies = async (seed: bigint) =>
          (await week(seed)).map(({ sky }) => sky);

        assertEquals(await skies(42n), await skies(42n));
        assertEquals(await skies(42n), [
          "cloud",
          "hail",
          "wind",
          "cloud",
          "rainbow",
          "snow",
          "snow",
        ]);
        assertEquals((await skies(42n)).join() === (await skies(43n)).join(), false);
      },
    });

    await t.step({
      name: "knows of a Friday the 13th under a full moon",
      async fn() {
        const { fetchPage, requests } = createAlmanac();
        for await (const day of paginate(fetchPage)) {
          if (day.date !== "1970-11-13") continue;
          assertEquals([day.weekday, day.moon], ["Friday", "🌕"]);
          break;
        }

        assertEquals(requests.length, 46);
      },
    });
  },
});
