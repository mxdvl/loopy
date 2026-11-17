import { deepEqual as assertEquals, throws } from "node:assert/strict";
import { test } from "node:test";
import {
  PHASES,
  WEEKDAYS,
  WIDELY_AVAILABLE,
  almanac,
  days,
  entry,
  moonPhase,
  weekday,
  type Course,
} from "./almanac.js";

const { PlainDate } = Temporal;

/** The days of a course as text, since two `PlainDate`s always look alike to `deepEqual`. */
function dates(course?: Course) {
  return days(course).map(String);
}

test("days", async (t) => {
  const epoch = PlainDate.from("2024-02-27");

  await t.test("start at the epoch and go forwards a day at a time", () => {
    assertEquals(dates({ epoch }).take(4).toArray(), [
      "2024-02-27",
      "2024-02-28",
      "2024-02-29",
      "2024-03-01",
    ]);
  });

  await t.test("go backwards when the step is negative", () => {
    assertEquals(dates({ epoch, step: { days: -1 } }).take(3).toArray(), [
      "2024-02-27",
      "2024-02-26",
      "2024-02-25",
    ]);
  });

  await t.test("can step by weeks, months or years", () => {
    assertEquals(dates({ epoch, step: { weeks: 1 } }).take(2).toArray(), [
      "2024-02-27",
      "2024-03-05",
    ]);
    assertEquals(dates({ epoch, step: { months: -1 } }).take(2).toArray(), [
      "2024-02-27",
      "2024-01-27",
    ]);
    assertEquals(dates({ epoch, step: { years: 1, days: 1 } }).take(2).toArray(), [
      "2024-02-27",
      "2025-02-28",
    ]);
  });

  await t.test("start today, unless told otherwise", () => {
    const [first] = dates().take(1);

    assertEquals(first, String(Temporal.Now.plainDateISO()));
  });

  await t.test("end with the year 6000", () => {
    assertEquals(dates({ epoch: PlainDate.from("6000-12-30") }).toArray(), [
      "6000-12-30",
      "6000-12-31",
    ]);
  });

  await t.test("end with the year -6000 when going backwards", () => {
    const course = { epoch: PlainDate.from("-006000-01-02"), step: { days: -1 } };

    assertEquals(dates(course).toArray(), ["-006000-01-02", "-006000-01-01"]);
  });

  await t.test("are none at all from an epoch outside those years", () => {
    assertEquals(dates({ epoch: PlainDate.from("6001-01-01") }).toArray(), []);
    assertEquals(dates({ epoch: PlainDate.from("-006001-12-31") }).toArray(), []);
  });

  await t.test("are none at all when the step goes nowhere", () => {
    assertEquals(dates({ epoch, step: { days: 0 } }).toArray(), []);
    assertEquals(dates({ epoch, step: { weeks: 0, days: -0 } }).toArray(), []);
  });

  await t.test("refuse a step that is not whole, or that pulls both ways", () => {
    throws(() => dates({ epoch, step: { days: 0.5 } }).toArray(), RangeError);
    throws(() => dates({ epoch, step: { weeks: 1, days: -1 } }).toArray(), RangeError);
  });
});

test("weekday", () => {
  assertEquals(weekday(PlainDate.from("2022-07-15")), "Friday");
  assertEquals(
    days({ epoch: PlainDate.from("2026-11-16") }).take(7).map(weekday).toArray(),
    WEEKDAYS,
  );
});

test("moonPhase", async (t) => {
  await t.test("names moons that are on record", () => {
    // the days of these phases, from published tables in UTC
    assertEquals(moonPhase(PlainDate.from("1970-11-13")), "full moon");
    assertEquals(moonPhase(PlainDate.from("2000-01-06")), "new moon");
    assertEquals(moonPhase(PlainDate.from("2026-11-09")), "new moon");
    assertEquals(moonPhase(PlainDate.from("2026-11-17")), "first quarter");
    assertEquals(moonPhase(PlainDate.from("2026-11-24")), "full moon");
    assertEquals(moonPhase(PlainDate.from("2026-12-01")), "last quarter");
  });

  await t.test("goes through the phases in order, before 2000 as well", () => {
    // every 59 days the moon has gone twice round, less a fraction of a day
    for (const epoch of [PlainDate.from("2000-01-06"), PlainDate.from("1900-01-01")]) {
      const lunation = days({ epoch }).take(30).map(moonPhase).toArray();

      assertEquals(Array.from(new Set(lunation)), PHASES);
      assertEquals(lunation.at(0), "new moon");
      assertEquals(lunation.at(15), "full moon");
    }
  });
});

test("entry", () => {
  const { date, ...rest } = entry(WIDELY_AVAILABLE);

  assertEquals(String(date), "2022-07-15");
  assertEquals(rest, { weekday: "Friday", moon: "full moon" });
});

test("almanac", async (t) => {
  await t.test("has an entry for each day of its course", () => {
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

    assertEquals(String(entries.next().value?.date), "2022-07-15");
    assertEquals(String(entries.next().value?.date), "2022-07-16");
    assertEquals(entries.return().done, true);
    assertEquals(entries.next(), { done: true, value: undefined });
  });

  await t.test("knows of a Friday the 13th under a full moon", () => {
    const eerie = almanac({ epoch: WIDELY_AVAILABLE }).find(
      ({ date, weekday, moon }) => weekday === "Friday" && date.day === 13 && moon === "full moon",
    );

    assertEquals(String(eerie?.date), "2030-09-13");
  });

  await t.test("only lands on Fridays when it steps a week from a Friday", () => {
    const fridays = almanac({ epoch: WIDELY_AVAILABLE, step: { weeks: -1 } })
      .take(520)
      .toArray();

    assertEquals(new Set(fridays.map(({ weekday }) => weekday)), new Set(["Friday"]));
    assertEquals(String(fridays.find(({ date }) => date.day === 13)?.date), "2022-05-13");
  });
});
