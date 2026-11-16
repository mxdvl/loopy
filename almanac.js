/**
 * An almanac that pretends to be a paginated API.
 *
 * Each page holds seven days. Nothing is stored: a page is worked out
 * when it is asked for, and would come out the same if asked again.
 *
 * There is no last page to speak of. JavaScript's dates run out in the
 * year 275760, long after anyone stops asking.
 */

const DAY = 86_400_000;
const DAYS_PER_PAGE = 7;

/**
 * The first day of page 0: Friday 15 July 2022, the day async generators
 * became Baseline "widely available".
 * @see https://web-platform-dx.github.io/web-features-explorer/features/async-generators
 */
const START = Date.UTC(2022, 6, 15);

/** How long the moon takes to go through its phases, in days. */
const LUNATION = 29.530588853;

/** A new moon to count from: 6 January 2000 at 18:14 UTC. */
const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);

/** The moon's phases, in the order they come round. */
export const PHASES = Object.freeze(
  /** @type {const} */ ([
    "new moon",
    "waxing crescent",
    "first quarter",
    "waxing gibbous",
    "full moon",
    "waning gibbous",
    "last quarter",
    "waning crescent",
  ]),
);

/** @typedef {(typeof PHASES)[number]} Phase */

/**
 * One day of the almanac.
 * @typedef {Readonly<{ date: string, weekday: string, moon: Phase }>} Day
 * `date` is written as `YYYY-MM-DD`.
 */

const weekdays = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" });

/**
 * The phase the moon is nearest to at one moment. Each of the eight
 * names covers a little under four days.
 *
 * It only counts lunations of average length from a known new moon.
 * The real moon runs up to half a day early or late, so around the time
 * the name changes it can be a day off.
 *
 * @param {number} time in milliseconds since the start of 1970
 * @returns {Phase}
 */
export function moonPhase(time) {
  const lunations = (time - NEW_MOON) / DAY / LUNATION;
  const elapsed = lunations - Math.floor(lunations);
  const nearest = Math.round(elapsed * PHASES.length) % PHASES.length;
  // `nearest` is a whole number from 0 to 7, so there is always a phase.
  return /** @type {Phase} */ (PHASES[nearest]);
}

/**
 * @param {number} index days since the almanac's first
 * @returns {Day}
 */
export function day(index) {
  const noon = START + (index + 0.5) * DAY;
  return {
    date: new Date(noon).toISOString().slice(0, 10),
    weekday: weekdays.format(noon),
    moon: moonPhase(noon),
  };
}

/**
 * Asks the almanac for one page.
 *
 * @param {number} cursor the number of the page, counted from 0
 * @returns {Promise<import("./paginate.js").Page<Day, number>>}
 */
export async function fetchWeek(cursor) {
  if (!Number.isInteger(cursor)) throw new RangeError(`There is no page ${cursor}.`);
  const first = cursor * DAYS_PER_PAGE;
  return {
    items: Array.from({ length: DAYS_PER_PAGE }, (_, offset) => day(first + offset)),
    next: cursor + 1,
  };
}
