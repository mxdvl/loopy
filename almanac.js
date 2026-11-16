/**
 * An almanac: one moment after another, each with its date, its weekday
 * and the phase of the moon. Nothing is stored and nothing is waited
 * for, so it is a plain generator, with no promises in it.
 */

export const DAY = 86_400_000;

/** A direction to step in. */
export const FORWARDS = 1;
export const BACKWARDS = -1;

/**
 * The day async generators became Baseline "widely available".
 * @see https://web-platform-dx.github.io/web-features-explorer/features/async-generators
 */
export const WIDELY_AVAILABLE = Date.UTC(2022, 6, 15);

/** JavaScript's dates reach this far either side of 1970, and no further. */
const FURTHEST = 8_640_000_000_000_000;

/**
 * One moment after another, from the epoch onwards.
 * It only ends where JavaScript's dates do, some 270,000 years either way.
 *
 * @param {number} epoch where to begin, in milliseconds since the start of 1970
 * @param {number} step how far apart the moments are, in milliseconds
 * @param {typeof FORWARDS | typeof BACKWARDS} direction which way to go
 * @returns {Generator<number, void, undefined>}
 */
export function* moments(epoch, step, direction) {
  for (let count = 0; ; count++) {
    const time = epoch + direction * count * step;
    if (!(Math.abs(time) <= FURTHEST)) return;
    yield time;
  }
}

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

/** How long the moon takes to go through its phases, in days. */
const LUNATION = 29.530588853;

/** A new moon to count from: 6 January 2000 at 18:14 UTC. */
const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);

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
 * What the almanac says about one moment.
 * @typedef {Readonly<{ time: number, date: string, weekday: string, moon: Phase }>} Entry
 * `date` is written as `YYYY-MM-DD`, in UTC. Years beyond four digits
 * are written the way JavaScript writes them, as in `+275760-09-13`.
 */

const weekdays = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" });

/**
 * @param {number} time in milliseconds since the start of 1970
 * @returns {Entry}
 */
export function entry(time) {
  const moment = new Date(time).toISOString();
  return {
    time,
    date: moment.slice(0, moment.indexOf("T")),
    weekday: weekdays.format(time),
    moon: moonPhase(time),
  };
}

/**
 * The almanac's entries, one for each moment from the epoch onwards.
 *
 * @param {number} epoch where to begin, in milliseconds since the start of 1970
 * @param {number} step how far apart the entries are, in milliseconds
 * @param {typeof FORWARDS | typeof BACKWARDS} direction which way to go
 * @returns {Generator<Entry, void, undefined>}
 */
export function* almanac(epoch, step, direction) {
  for (const time of moments(epoch, step, direction)) {
    yield entry(time);
  }
}
