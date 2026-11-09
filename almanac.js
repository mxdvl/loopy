import { pcg32 } from "./prng.js";
import { sleep } from "./helpers.js";

/**
 * @typedef {object} Day
 * @property {number} day days since the almanac began
 * @property {string} date as `YYYY-MM-DD`
 * @property {string} weekday
 * @property {string} moon the phase, give or take a day
 * @property {string} sky a forecast, made with total confidence
 */

const DAY = 86_400_000;
const weekdays = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
const moons = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];
const skies = ["sun", "cloud", "rain", "fog", "wind", "snow", "hail", "rainbow"];

/** how long the moon takes to come round again, in days */
const lunation = 29.530588853;
/** a new moon: 6 January 2000 at 18:14 UTC */
const newMoon = Date.UTC(2000, 0, 6, 18, 14);

/**
 * @param {number} time
 * @returns {string}
 */
function moon(time) {
  const age = (((time - newMoon) / DAY) % lunation + lunation) % lunation;
  return moons[Math.round((age / lunation) * moons.length) % moons.length];
}

/**
 * A pretend paginated API over an almanac with no last page.
 * One page is one week, and week 0 starts when JavaScript's clocks do:
 * on Thursday 1 January 1970.
 *
 * Nothing is stored. Weekdays and moons come round on their own,
 * and the sky of day `n` is the `n`th value of a seeded generator.
 *
 * @param {object} [options]
 * @param {bigint} [options.seed] decides the weather, forever
 * @param {number} [options.weeks] where the almanac stops, if it ever does
 * @param {number} [options.latency] longest response time, in milliseconds
 */
export function createAlmanac(
  { seed = 42n, weeks = Infinity, latency = 0 } = {},
) {
  /** every week that was requested, in order @type {number[]} */
  const requests = [];
  const jitter = pcg32(seed, 1n);

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

    const items = pcg32(seed)
      .drop(week * 7)
      .take(7)
      .map((int, index) => {
        const day = week * 7 + index;
        const noon = (day + 0.5) * DAY;
        return {
          day,
          date: new Date(noon).toISOString().slice(0, 10),
          weekday: weekdays[new Date(noon).getUTCDay()],
          moon: moon(noon),
          sky: skies[Number(int) >>> 29],
        };
      })
      .toArray();
    return { items, next: week + 1 < weeks ? week + 1 : null };
  }

  return { fetchPage, requests };
}
