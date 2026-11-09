import { assertEquals, assertRejects } from "jsr:@std/assert";
import { merge, zip } from "./merge.js";

/**
 * Sources whose values arrive in a scripted order: the value at
 * position `n` of `order` is only released by calling `release(n)`.
 */
function scripted(order: string[]) {
  const gates = order.map(() => Promise.withResolvers<void>());
  const closed: string[] = [];

  async function* source(name: string) {
    try {
      for (const [position, owner] of order.entries()) {
        if (owner !== name) continue;
        await gates[position].promise;
        yield `${name}${position}`;
      }
    } finally {
      closed.push(name);
    }
  }

  return {
    source,
    closed,
    release: (position: number) => gates[position]?.resolve(),
  };
}

async function* count(length: number) {
  for (let n = 0; n < length; n++) yield n;
}

Deno.test({
  name: "merge",
  async fn(t) {
    await t.step({
      name: "yields values in order of arrival",
      async fn() {
        const order = ["a", "b", "b", "c", "a", "c", "c", "b"];
        const { source, release } = scripted(order);
        const seen: string[] = [];

        release(0);
        for await (const value of merge(source("a"), source("b"), source("c"))) {
          seen.push(value);
          release(seen.length);
        }

        assertEquals(seen, ["a0", "b1", "b2", "c3", "a4", "c5", "c6", "b7"]);
      },
    });

    await t.step({
      name: "yields everything from sources of different lengths",
      async fn() {
        const values = await Array.fromAsync(merge(count(1), count(4), count(2)));

        assertEquals(values.toSorted(), [0, 0, 0, 1, 1, 2, 3]);
      },
    });

    await t.step({
      name: "ends straight away without sources",
      async fn() {
        assertEquals(await Array.fromAsync(merge()), []);
      },
    });

    await t.step({
      name: "closes the remaining sources when the consumer stops",
      async fn() {
        const { source, release, closed } = scripted(["a", "b", "a", "b"]);

        release(0);
        release(1);
        release(2);
        release(3);
        for await (const value of merge(source("a"), source("b"))) {
          if (value === "b1") break;
        }

        assertEquals(closed.toSorted(), ["a", "b"]);
      },
    });

    await t.step({
      name: "rethrows a source’s error and closes the others",
      async fn() {
        const { source, release, closed } = scripted(["a", "a"]);
        async function* faulty() {
          yield "fine";
          throw new Error("broken sensor");
        }

        release(0);
        release(1);
        await assertRejects(
          () => Array.fromAsync(merge(faulty(), source("a"))),
          Error,
          "broken sensor",
        );
        assertEquals(closed, ["a"]);
      },
    });
  },
});

Deno.test({
  name: "zip",
  async fn(t) {
    await t.step({
      name: "pairs values up until the shortest source ends",
      async fn() {
        assertEquals(await Array.fromAsync(zip(count(3), count(5))), [
          [0, 0],
          [1, 1],
          [2, 2],
        ]);
      },
    });

    await t.step({
      name: "closes the longer sources",
      async fn() {
        const { source, release, closed } = scripted(["a", "a", "a"]);

        release(0);
        release(1);
        release(2);
        await Array.fromAsync(zip(count(1), source("a")));

        assertEquals(closed, ["a"]);
      },
    });
  },
});
