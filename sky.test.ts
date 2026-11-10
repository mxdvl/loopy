import { deepEqual as assertEquals, ok } from "node:assert/strict";
import { test } from "node:test";
import {
  DAY,
  HOUR,
  MINUTE,
  daylight,
  halfMoonBay,
  local,
  moon,
  moonHappenings,
  sea,
  seaHappenings,
  season,
  sun,
  sunHappenings,
} from "./sky.js";

/** @param a one moment @param b another @param minutes how far apart they may be */
const near = (a: number, b: number, minutes: number) => Math.abs(a - b) <= minutes * MINUTE;

test("sun", async (t) => {
  await t.test("crosses the equator at the March equinox", () => {
    // 20 March 2026 at 14:46 UTC
    const { longitude, declination } = sun(Date.UTC(2026, 2, 20, 14, 46));

    ok(Math.min(longitude, 360 - longitude) < 0.05);
    ok(Math.abs(declination) < 0.05);
  });

  await t.test("rises and sets over Half Moon Bay", () => {
    const { midnight } = local(Date.UTC(2026, 10, 10, 20), halfMoonBay);
    const { rise, noon, set } = daylight(midnight, halfMoonBay);

    assertEquals(
      [rise, noon, set].map((time) => local(time ?? 0, halfMoonBay).clock),
      ["06:44", "11:54", "17:03"],
    );
  });

  await t.test("neither rises nor sets in the polar night", () => {
    const pole = { ...halfMoonBay, latitude: 80, offset: 0, longitude: 0 };
    const { rise, set } = daylight(Date.UTC(2026, 11, 21), pole);

    assertEquals([rise, set], [undefined, undefined]);
  });

  await t.test("sets the seasons", () => {
    const south = { ...halfMoonBay, latitude: -37.5 };

    assertEquals(season(Date.UTC(1970, 0, 1), halfMoonBay), "winter");
    assertEquals(season(Date.UTC(1970, 3, 1), halfMoonBay), "spring");
    assertEquals(season(Date.UTC(1970, 6, 1), halfMoonBay), "summer");
    assertEquals(season(Date.UTC(1970, 9, 1), halfMoonBay), "autumn");
    assertEquals(season(Date.UTC(1970, 0, 1), south), "summer");
  });

  await t.test("happens twice a day, for as long as anyone asks", () => {
    const { midnight: from } = local(Date.UTC(2026, 0, 1, 20), halfMoonBay);
    const kinds = sunHappenings(halfMoonBay, from)
      .take(730)
      .map(({ kind }) => kind)
      .toArray();

    assertEquals(kinds.slice(0, 4), ["sunrise", "sunset", "sunrise", "sunset"]);
    assertEquals(kinds.filter((kind) => kind === "sunrise").length, 365);
  });
});

test("moon", async (t) => {
  await t.test("was full on Friday 13 November 1970", () => {
    // at 07:28 UTC, by the tables
    const [full] = moonHappenings(Date.UTC(1970, 10, 10)).take(1);

    assertEquals(full?.kind, "full moon");
    ok(near(full?.time ?? 0, Date.UTC(1970, 10, 13, 7, 28), 30));
    assertEquals(moon(Date.UTC(1970, 10, 13, 12)).glyph, "🌕");
  });

  await t.test("comes round every 29.53 days, on average", () => {
    const news = moonHappenings(Date.UTC(1970, 0, 1))
      .filter(({ kind }) => kind === "new moon")
      .take(501)
      .map(({ time }) => time)
      .toArray();
    const mean = ((news.at(-1) ?? 0) - (news[0] ?? 0)) / 500 / DAY;

    ok(Math.abs(mean - 29.530589) < 0.001);
  });

  await t.test("goes through its phases in order", () => {
    const kinds = moonHappenings(Date.UTC(2026, 10, 1))
      .take(5)
      .map(({ kind }) => kind);

    assertEquals(Array.from(kinds), [
      "last quarter",
      "new moon",
      "first quarter",
      "full moon",
      "last quarter",
    ]);
  });
});

test("sea", async (t) => {
  await t.test("agrees with the published tide table, give or take", () => {
    // Pillar Point Harbor on 15 September 2025, in Pacific Daylight Time
    // and metres, as listed by tidetime.org
    const published = [
      { clock: [0, 14], kind: "low water", height: -0.02 },
      { clock: [7, 35], kind: "high water", height: 1.19 },
      { clock: [11, 30], kind: "low water", height: 1.02 },
      { clock: [17, 36], kind: "high water", height: 1.73 },
    ] as const;
    const midnight = Date.UTC(2025, 8, 15, 7);
    const computed = seaHappenings(halfMoonBay, midnight).take(4).toArray();

    for (const [index, { clock, kind, height }] of published.entries()) {
      const [hours, minutes] = clock;
      const happening = computed[index];

      assertEquals(happening?.kind, kind);
      ok(near(happening?.time ?? 0, midnight + hours * HOUR + minutes * MINUTE, 20));
      ok(Math.abs((happening?.height ?? 0) - height) < 0.15);
    }
  });

  await t.test("turns a little under four times a day", () => {
    const from = Date.UTC(2000, 0, 1);
    const turns = seaHappenings(halfMoonBay, from).take(1000).toArray();
    const perDay = 1000 / (((turns.at(-1)?.time ?? 0) - from) / DAY);

    ok(perDay > 3.8 && perDay < 3.9);
    ok(turns.every(({ kind }, index) => kind !== turns[index + 1]?.kind));
    ok(turns.every(({ time, height }) => height === sea(time, halfMoonBay)));
  });

  await t.test("falls lowest around new and full moons", () => {
    const from = Date.UTC(2026, 0, 1);
    let lowest = { time: from, height: Infinity };
    for (const turn of seaHappenings(halfMoonBay, from)) {
      if (turn.time > from + 60 * DAY) break;
      if (turn.height < lowest.height) lowest = turn;
    }
    const { lit } = moon(lowest.time);

    ok(lit < 0.25 || lit > 0.75);
  });
});

test("local time ignores daylight saving", () => {
  assertEquals(local(Date.UTC(2026, 6, 4, 19, 30), halfMoonBay), {
    date: "2026-07-04",
    clock: "11:30",
    weekday: "Saturday",
    long: "Saturday 4 July 2026",
    midnight: Date.UTC(2026, 6, 4, 8),
  });
});
