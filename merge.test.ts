import { deepEqual as assertEquals, rejects } from "node:assert/strict";
import { test } from "node:test";
import { createClock, replay } from "./helpers.js";
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
        await gates[position]?.promise;
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

test("merge", async (t) => {
  await t.test("yields values in order of arrival", async () => {
    const order = ["a", "b", "b", "c", "a", "c", "c", "b"];
    const { source, release } = scripted(order);
    const seen: string[] = [];

    release(0);
    for await (const value of merge(source("a"), source("b"), source("c"))) {
      seen.push(value);
      release(seen.length);
    }

    assertEquals(seen, ["a0", "b1", "b2", "c3", "a4", "c5", "c6", "b7"]);
  });

  await t.test("yields everything from sources of different lengths", async () => {
    const values = await Array.fromAsync(merge(count(1), count(4), count(2)));

    assertEquals(values.toSorted(), [0, 0, 0, 1, 1, 2, 3]);
  });

  await t.test("ends straight away without sources", async () => {
    assertEquals(await Array.fromAsync(merge()), []);
  });

  await t.test("closes the remaining sources when the consumer stops", async () => {
    const { source, release, closed } = scripted(["a", "b", "a", "b"]);

    for (const position of [0, 1, 2, 3]) release(position);
    for await (const value of merge(source("a"), source("b"))) {
      if (value === "b1") break;
    }

    assertEquals(closed.toSorted(), ["a", "b"]);
  });

  await t.test("rethrows a source’s error and closes the others", async () => {
    const { source, release, closed } = scripted(["a", "a"]);
    async function* faulty() {
      yield "fine";
      throw new Error("the sea has stopped");
    }

    release(0);
    release(1);
    await rejects(() => Array.fromAsync(merge(faulty(), source("a"))), /the sea has stopped/);
    assertEquals(closed, ["a"]);
  });

  await t.test("puts replayed timelines back in order of time", async () => {
    const clock = createClock({ from: 0, speed: 100 });
    const evens = [0, 2000, 4000, 6000].map((time) => ({ time }));
    const odds = [1000, 3000, 5000].map((time) => ({ time }));
    const merged = merge(replay(evens, clock), replay(odds, clock));

    clock.run();
    const times = [];
    for await (const { time } of merged) {
      times.push(time);
      if (time === 5000) clock.stop();
    }

    assertEquals(times, [0, 1000, 2000, 3000, 4000, 5000]);
  });
});

test("zip", async (t) => {
  await t.test("pairs values up until the shortest source ends", async () => {
    assertEquals(await Array.fromAsync(zip(count(3), count(5))), [
      [0, 0],
      [1, 1],
      [2, 2],
    ]);
  });

  await t.test("closes the longer sources", async () => {
    const { source, release, closed } = scripted(["a", "a", "a"]);

    for (const position of [0, 1, 2]) release(position);
    await Array.fromAsync(zip(count(1), source("a")));

    assertEquals(closed, ["a"]);
  });
});
