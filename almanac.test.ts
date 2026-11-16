import { deepEqual as assertEquals } from "node:assert/strict";
import { test } from "node:test";
import {
  BACKWARDS,
  DAY,
  FORWARDS,
  PHASES,
  WIDELY_AVAILABLE,
  almanac,
  entry,
  moments,
  moonPhase,
} from "./almanac.js";

test("moments", async (t) => {
  await t.test("start at the epoch and go forwards a step at a time", () => {
    assertEquals(moments(1000, 10, FORWARDS).take(4).toArray(), [1000, 1010, 1020, 1030]);
  });

  await t.test("go backwards when told to", () => {
    assertEquals(moments(1000, 10, BACKWARDS).take(4).toArray(), [1000, 990, 980, 970]);
  });

  await t.test("stay exact however far they go", () => {
    const [millionth] = moments(0.1, 0.1, FORWARDS).drop(1_000_000);

    assertEquals(millionth, 0.1 + 1_000_000 * 0.1);
  });

  await t.test("end where JavaScript's dates do, in both directions", () => {
    const furthest = 8_640_000_000_000_000;

    assertEquals(
      moments(furthest - 2.5 * DAY, DAY, FORWARDS).toArray(),
      [furthest - 2.5 * DAY, furthest - 1.5 * DAY, furthest - 0.5 * DAY],
    );
    assertEquals(
      moments(1 - furthest, 1, BACKWARDS).toArray(),
      [1 - furthest, -furthest],
    );
  });

  await t.test("are none at all from an epoch that is not a moment", () => {
    assertEquals(moments(Number.NaN, DAY, FORWARDS).toArray(), []);
  });
});

test("moonPhase", async (t) => {
  await t.test("names moons that are on record", () => {
    // from published tables, in UTC
    assertEquals(moonPhase(Date.UTC(1970, 10, 13, 7, 28)), "full moon");
    assertEquals(moonPhase(Date.UTC(2000, 0, 6, 18, 14)), "new moon");
    assertEquals(moonPhase(Date.UTC(2026, 10, 9, 7, 2)), "new moon");
    assertEquals(moonPhase(Date.UTC(2026, 10, 17, 11, 48)), "first quarter");
    assertEquals(moonPhase(Date.UTC(2026, 10, 24, 14, 53)), "full moon");
    assertEquals(moonPhase(Date.UTC(2026, 11, 1, 6, 9)), "last quarter");
  });

  await t.test("goes through the phases in order, before 1970 as well", () => {
    const eighth = (29.530588853 / 8) * DAY;
    for (const start of [Date.UTC(2000, 0, 6, 18, 14), Date.UTC(1900, 0, 1, 13, 52)]) {
      assertEquals(
        PHASES.map((_, index) => moonPhase(start + index * eighth)),
        PHASES,
      );
    }
  });
});

test("entry", async (t) => {
  await t.test("gives the date, the weekday and the moon of a moment", () => {
    assertEquals(entry(WIDELY_AVAILABLE), {
      time: WIDELY_AVAILABLE,
      date: "2022-07-15",
      weekday: "Friday",
      moon: "full moon",
    });
  });

  await t.test("knows leap days, and the last second before the turn of a year", () => {
    assertEquals(entry(Date.UTC(2024, 1, 29)).date, "2024-02-29");
    assertEquals(entry(Date.UTC(2025, 0, 1) - 1000).date, "2024-12-31");
  });

  await t.test("still has a date at the edges of JavaScript's dates", () => {
    assertEquals(entry(8_640_000_000_000_000).date, "+275760-09-13");
    assertEquals(entry(-8_640_000_000_000_000).date, "-271821-04-20");
  });
});

test("almanac", async (t) => {
  await t.test("has an entry for each moment of its course", () => {
    assertEquals(
      almanac(WIDELY_AVAILABLE, DAY, FORWARDS)
        .take(3)
        .map(({ date, weekday }) => `${weekday} ${date}`)
        .toArray(),
      ["Friday 2022-07-15", "Saturday 2022-07-16", "Sunday 2022-07-17"],
    );
  });

  await t.test("works out an entry only when it is asked for", () => {
    const entries = almanac(WIDELY_AVAILABLE, DAY, FORWARDS);

    assertEquals(entries.next().value?.date, "2022-07-15");
    assertEquals(entries.next().value?.date, "2022-07-16");
    assertEquals(entries.return().done, true);
    assertEquals(entries.next(), { done: true, value: undefined });
  });

  await t.test("knows of a Friday the 13th under a full moon", () => {
    const eerie = almanac(WIDELY_AVAILABLE, DAY, FORWARDS).find(
      ({ date, weekday, moon }) =>
        weekday === "Friday" && date.endsWith("-13") && moon === "full moon",
    );

    assertEquals(eerie?.date, "2030-09-13");
  });

  await t.test("only lands on Fridays when it steps a week from a Friday", () => {
    const fridays = almanac(WIDELY_AVAILABLE, 7 * DAY, BACKWARDS).take(520).toArray();

    assertEquals(new Set(fridays.map(({ weekday }) => weekday)), new Set(["Friday"]));
    assertEquals(fridays.find(({ date }) => date.endsWith("-13"))?.date, "2022-05-13");
  });
});
