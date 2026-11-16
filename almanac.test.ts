import { deepEqual as assertEquals, rejects } from "node:assert/strict";
import { test } from "node:test";
import { PHASES, day, fetchWeek, moonPhase } from "./almanac.js";
import { paginate } from "./paginate.js";

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
    const eighth = (29.530588853 / 8) * 86_400_000;
    for (const start of [Date.UTC(2000, 0, 6, 18, 14), Date.UTC(1900, 0, 1, 13, 52)]) {
      assertEquals(
        PHASES.map((_, index) => moonPhase(start + index * eighth)),
        PHASES,
      );
    }
  });
});

test("day", async (t) => {
  await t.test("counts from the day async generators became widely available", () => {
    assertEquals(day(0), { date: "2022-07-15", weekday: "Friday", moon: "full moon" });
  });

  await t.test("knows leap days and the days before the start", () => {
    assertEquals(day(594).date, "2024-02-29");
    assertEquals(day(-1), { date: "2022-07-14", weekday: "Thursday", moon: "full moon" });
  });
});

test("fetchWeek", async (t) => {
  await t.test("gives seven days in a row, and the number of the next page", async () => {
    const { items, next } = await fetchWeek(2);

    assertEquals(
      items.map(({ date }) => date),
      [
        "2022-07-29",
        "2022-07-30",
        "2022-07-31",
        "2022-08-01",
        "2022-08-02",
        "2022-08-03",
        "2022-08-04",
      ],
    );
    assertEquals(next, 3);
  });

  await t.test("gives the same page whenever it is asked", async () => {
    assertEquals(await fetchWeek(2944), await fetchWeek(2944));
  });

  await t.test("has no page for a number that is not whole", async () => {
    await rejects(fetchWeek(0.5), new RangeError("There is no page 0.5."));
    await rejects(fetchWeek(Number.NaN), new RangeError("There is no page NaN."));
  });

  await t.test("reads as one unbroken run of days", async () => {
    const dates: string[] = [];
    for await (const { date } of paginate(fetchWeek, 0)) {
      dates.push(date);
      if (date === "2024-02-29") break;
    }

    assertEquals(dates.length, 595);
    assertEquals(new Set(dates).size, 595);
    assertEquals(dates.toSorted(), dates);
  });

  await t.test("knows of a Friday the 13th under a full moon", async () => {
    for await (const { date, weekday, moon } of paginate(fetchWeek, 0)) {
      if (weekday !== "Friday" || !date.endsWith("-13") || moon !== "full moon") continue;
      assertEquals(date, "2030-09-13");
      break;
    }
  });
});
