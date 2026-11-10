import { sleep } from "./helpers.js";
import { pcg32 } from "./prng.js";
import { DAY, HOUR, daylight, scilly, local, moon, season, seaHappenings } from "./sky.js";

/**
 * @typedef {object} Day
 * @property {number} day days since the almanac began
 * @property {string} date as `YYYY-MM-DD`
 * @property {string} weekday
 * @property {string} season
 * @property {string} moon its phase at noon
 * @property {string} [sunrise] as `HH:MM`
 * @property {string} [sunset] as `HH:MM`
 * @property {{ clock: string, kind: string, height: number }[]} tides heights in metres
 * @property {number} lowest how far out the sea goes that day, in metres
 */

/**
 * A pretend paginated API over an almanac with no last page.
 * One page is one week, and week 0 starts when JavaScript's clocks do:
 * on Thursday 1 January 1970.
 *
 * Nothing is stored. Every sunrise, moon and tide is worked out when its
 * week is asked for, and would come out the same if asked again.
 *
 * @param {object} [options]
 * @param {import("./sky.js").Place} [options.place]
 * @param {number} [options.weeks] where the almanac stops, if it ever does
 * @param {number} [options.latency] longest response time, in milliseconds
 * @param {bigint} [options.seed] decides how long each response takes
 */
export function createAlmanac({
  place = scilly,
  weeks = Infinity,
  latency = 0,
  seed = 42n,
} = {}) {
  /** every week that was requested, in order @type {number[]} */
  const requests = [];
  const jitter = pcg32(seed, 1n);
  const epoch = -place.offset * HOUR;

  /**
   * @param {number} day
   * @returns {Day}
   */
  function page(day) {
    const midnight = epoch + day * DAY;
    const noon = midnight + DAY / 2;
    const { rise, set } = daylight(midnight, place);
    const { date, weekday } = local(noon, place);

    const tides = [];
    for (const { time, kind, height } of seaHappenings(place, midnight)) {
      if (time >= midnight + DAY) break;
      tides.push({ clock: local(time, place).clock, kind, height: Math.round(height * 100) / 100 });
    }

    return {
      day,
      date,
      weekday,
      season: season(noon, place),
      moon: moon(noon).glyph,
      ...(rise === undefined ? {} : { sunrise: local(rise, place).clock }),
      ...(set === undefined ? {} : { sunset: local(set, place).clock }),
      tides,
      lowest: Math.min(...tides.map(({ height }) => height)),
    };
  }

  /**
   * @param {number} [week]
   * @returns {Promise<import("./paginate.js").Page<Day, number>>}
   */
  async function fetchPage(week = 0) {
    requests.push(week);
    if (latency > 0) {
      await sleep(Number(jitter.next().value % BigInt(latency)));
    }
    if (week >= weeks) return { items: [], next: null };

    const items = Array.from({ length: 7 }, (_, index) => page(week * 7 + index));
    return { items, next: week + 1 < weeks ? week + 1 : null };
  }

  return { fetchPage, requests };
}
