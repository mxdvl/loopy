import { deepEqual as assertEquals, ok } from "node:assert/strict";
import { test } from "node:test";
import { createClock, replay, sleep, take } from "./helpers.js";

test("take", async (t) => {
  let closed = false;
  async function* forever() {
    try {
      for (let n = 0; ; n++) yield n;
    } finally {
      closed = true;
    }
  }

  await t.test("stops an endless source, and closes it", async () => {
    assertEquals(await Array.fromAsync(take(forever(), 3)), [0, 1, 2]);
    ok(closed);
  });

  await t.test("asks for nothing when the limit is zero", async () => {
    closed = false;

    assertEquals(await Array.fromAsync(take(forever(), 0)), []);
    assertEquals(closed, false);
  });
});

test("clock", async (t) => {
  const things = [100, 200, 300].map((time) => ({ time }));

  await t.test("replays things when their moment comes, faster than it did", async () => {
    const clock = createClock({ from: 0, speed: 10 });
    const started = Date.now();

    clock.run();
    assertEquals(await Array.fromAsync(replay(things, clock)), things);
    const elapsed = Date.now() - started;
    ok(elapsed >= 25 && elapsed < 300);
  });

  await t.test("lets nothing happen while it is held", async () => {
    const clock = createClock({ from: 0, speed: 100 });
    const replayed = replay(things, clock);
    const first = replayed.next();
    let happened = false;
    void first.then(() => (happened = true));

    await sleep(20);
    assertEquals(happened, false);

    clock.run();
    assertEquals(await first, { done: false, value: { time: 100 } });
    clock.hold();
    const second = replayed.next();
    void second.then(() => (happened = false));
    await sleep(20);
    assertEquals(happened, true);

    clock.stop();
    assertEquals(await second, { done: true, value: undefined });
  });

  await t.test("lets go of whoever is waiting when it stops", async () => {
    const clock = createClock({ from: 0, speed: 1 });
    const waiting = Array.fromAsync(replay([{ time: 1e12 }], clock));

    clock.run();
    clock.stop();
    assertEquals(await waiting, []);
    assertEquals(await clock.until(0), false);
  });
});
