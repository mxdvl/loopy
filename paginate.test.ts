import { assertEquals } from "jsr:@std/assert";
import { createCatalogue } from "./catalogue.js";
import { take } from "./helpers.js";
import { paginate } from "./paginate.js";

Deno.test({
  name: "paginate",
  async fn(t) {
    await t.step({
      name: "yields every item, across all pages",
      async fn() {
        const { fetchPage, requests } = createCatalogue({
          total: 95,
          pageSize: 10,
        });
        const stars = await Array.fromAsync(paginate(fetchPage));

        assertEquals(stars.length, 95);
        assertEquals(stars.map(({ id }) => id), Array.from(Array(95).keys()));
        assertEquals(requests, [0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
      },
    });

    await t.step({
      name: "only requests the pages that are consumed",
      async fn() {
        const { fetchPage, requests } = createCatalogue({
          total: 10_000,
          pageSize: 10,
        });
        const stars = await Array.fromAsync(take(paginate(fetchPage), 25));

        assertEquals(stars.length, 25);
        assertEquals(requests, [0, 10, 20]);
      },
    });

    await t.step({
      name: "can start from a cursor",
      async fn() {
        const { fetchPage, requests } = createCatalogue({
          total: 95,
          pageSize: 10,
        });
        const stars = await Array.fromAsync(paginate(fetchPage, 90));

        assertEquals(stars.map(({ id }) => id), [90, 91, 92, 93, 94]);
        assertEquals(requests, [90]);
      },
    });

    await t.step({
      name: "handles an empty source",
      async fn() {
        const { fetchPage, requests } = createCatalogue({ total: 0 });

        assertEquals(await Array.fromAsync(paginate(fetchPage)), []);
        assertEquals(requests, [0]);
      },
    });
  },
});

Deno.test({
  name: "catalogue is the same for the same seed",
  async fn() {
    const [first, second, other] = await Promise.all(
      [42n, 42n, 43n].map((seed) =>
        Array.fromAsync(
          paginate(createCatalogue({ seed, total: 30 }).fetchPage),
        )
      ),
    );

    assertEquals(first, second);
    assertEquals(first.slice(0, 3), [
      { id: 0, name: "Pipiga", magnitude: 0.8 },
      { id: 1, name: "Alfohy", magnitude: 4.8 },
      { id: 2, name: "Ormika", magnitude: 3.7 },
    ]);
    assertEquals(first[0].name === other[0].name, false);
  },
});
