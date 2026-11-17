import { deepEqual as assertEquals, ok } from "node:assert/strict";
import { test } from "node:test";
import {
  DAY,
  PHASES,
  WIDELY_AVAILABLE,
  almanac,
  entry,
  moments,
  moonPhase,
} from "./almanac.js";

test("moments", async (t) => {
  await t.test("start at the epoch and go forwards a step at a time", () => {
    assertEquals(moments({ epoch: 1000, step: 10 }).take(4).toArray(), [1000, 1010, 1020, 1030]);
  });

  await t.test("go backwards when the step is negative", () => {
    assertEquals(moments({ epoch: 1000, step: -10 }).take(4).toArray(), [1000, 990, 980, 970]);
  });

  await t.test("start now and step a day, unless told otherwise", () => {
    const before = Date.now();
    const [first = Number.NaN, second = Number.NaN] = moments().take(2);

    ok(before <= first && first <= Date.now());
    assertEquals(second - first, DAY);
  });

  await t.test("end with the year 6000", () => {
    const lastDay = Date.UTC(6000, 11, 31);

    assertEquals(moments({ epoch: lastDay - DAY }).toArray(), [lastDay - DAY, lastDay]);
  });

  await t.test("end with the year -6000 when going backwards", () => {
    const firstDay = Date.UTC(-6000, 0, 1);

    assertEquals(moments({ epoch: firstDay + DAY, step: -DAY }).toArray(), [
      firstDay + DAY,
      firstDay,
    ]);
  });

  await t.test("are none at all when the step is zero or not a whole number", () => {
    for (const step of [0, -0, 0.5, DAY + 0.1, Number.NaN, Number.POSITIVE_INFINITY]) {
      assertEquals(moments({ epoch: 1000, step }).toArray(), []);
    }
  });

  await t.test("are none at all from an epoch outside those years, or from no moment", () => {
    assertEquals(moments({ epoch: Date.UTC(6001, 0, 1) }).toArray(), []);
    assertEquals(moments({ epoch: Date.UTC(-6001, 11, 31) }).toArray(), []);
    assertEquals(moments({ epoch: Number.NaN }).toArray(), []);
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

  await t.test("has a date at both ends of the almanac", () => {
    assertEquals(entry(Date.UTC(-6000, 0, 1)).date, "-006000-01-01");
    assertEquals(entry(Date.UTC(6000, 11, 31)).date, "6000-12-31");
  });
});

test("almanac", async (t) => {
  await t.test("has an entry for each moment of its course", () => {
    assertEquals(
      almanac({ epoch: WIDELY_AVAILABLE })
        .take(3)
        .map(({ date, weekday }) => `${weekday} ${date}`)
        .toArray(),
      ["Friday 2022-07-15", "Saturday 2022-07-16", "Sunday 2022-07-17"],
    );
  });

  await t.test("works out an entry only when it is asked for", () => {
    const entries = almanac({ epoch: WIDELY_AVAILABLE });

    assertEquals(entries.next().value?.date, "2022-07-15");
    assertEquals(entries.next().value?.date, "2022-07-16");
    assertEquals(entries.return().done, true);
    assertEquals(entries.next(), { done: true, value: undefined });
  });

  await t.test("knows of a Friday the 13th under a full moon", () => {
    const eerie = almanac({ epoch: WIDELY_AVAILABLE }).find(
      ({ date, weekday, moon }) =>
        weekday === "Friday" && date.endsWith("-13") && moon === "full moon",
    );

    assertEquals(eerie?.date, "2030-09-13");
  });

  await t.test("only lands on Fridays when it steps a week from a Friday", () => {
    const fridays = almanac({ epoch: WIDELY_AVAILABLE, step: -7 * DAY }).take(520).toArray();

    assertEquals(new Set(fridays.map(({ weekday }) => weekday)), new Set(["Friday"]));
    assertEquals(fridays.find(({ date }) => date.endsWith("-13"))?.date, "2022-05-13");
  });
});
