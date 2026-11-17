/**
 * An almanac: one day after another, each with its weekday and the phase
 * of the moon. Nothing is stored and nothing is waited for, so it is a
 * plain generator, with no promises in it.
 *
 * Its days are `Temporal.PlainDate`s: days on a calendar, with no clock
 * and no time zone.
 */

/**
 * The day async generators became Baseline "widely available".
 * @see https://web-platform-dx.github.io/web-features-explorer/features/async-generators
 */
export const WIDELY_AVAILABLE = Temporal.PlainDate.from("2022-07-15");

/** The almanac covers the years -6000 to 6000, and no others. */
const EARLIEST = Temporal.PlainDate.from("-006000-01-01");
const LATEST = Temporal.PlainDate.from("6000-12-31");

/**
 * @param {Temporal.PlainDate} date
 * @returns {boolean}
 */
function isCovered(date) {
  const { compare } = Temporal.PlainDate;
  return compare(EARLIEST, date) <= 0 && compare(date, LATEST) <= 0;
}

/**
 * How far apart the days are: whole numbers, all positive to go forwards
 * or all negative to go backwards.
 * @typedef {Pick<Temporal.DurationLikeObject, "years" | "months" | "weeks" | "days">} Step
 */

/**
 * Where to begin, and how far to go each time.
 * @typedef {object} Course
 * @property {Temporal.PlainDate} [epoch] today, if left out
 * @property {Step} [step] a day, if left out
 */

/**
 * One day after another, from the epoch onwards.
 * It ends when it leaves the years the almanac covers, and never begins
 * if the step goes nowhere.
 *
 * @param {Course} [course]
 * @returns {Generator<Temporal.PlainDate, void, undefined>}
 */
export function* days({ epoch = Temporal.Now.plainDateISO(), step = { days: 1 } } = {}) {
  const stride = Temporal.Duration.from(step);
  let date = epoch;
  while (!stride.blank && isCovered(date)) {
    yield date;
    date = date.add(stride);
  }
}

/** The days of the week, in the order `Temporal` counts them, from 1. */
export const WEEKDAYS = Object.freeze(
  /** @type {const} */ ([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ]),
);

/** @typedef {(typeof WEEKDAYS)[number]} Weekday */

/**
 * @param {Temporal.PlainDate} date
 * @returns {Weekday}
 */
export function weekday(date) {
  // `dayOfWeek` is a whole number from 1 to 7, so there is always a name.
  return /** @type {Weekday} */ (WEEKDAYS[date.dayOfWeek - 1]);
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

/** A day with a new moon to count from. */
const NEW_MOON = Temporal.PlainDate.from("2000-01-06");

/** That new moon came at 18:14 UTC: this much of a day after noon. */
const AFTER_NOON = 0.26;

/**
 * The phase the moon is nearest to at noon UTC on one day. Each of the
 * eight names covers a little under four days.
 *
 * It only counts lunations of average length from a known new moon.
 * The real moon runs up to half a day early or late, so around the time
 * the name changes it can be a day off.
 *
 * @param {Temporal.PlainDate} date
 * @returns {Phase}
 */
export function moonPhase(date) {
  const lunations = (NEW_MOON.until(date).days - AFTER_NOON) / LUNATION;
  const elapsed = lunations - Math.floor(lunations);
  const nearest = Math.round(elapsed * PHASES.length) % PHASES.length;
  // `nearest` is a whole number from 0 to 7, so there is always a phase.
  return /** @type {Phase} */ (PHASES[nearest]);
}

/**
 * What the almanac says about one day.
 * @typedef {Readonly<{ date: Temporal.PlainDate, weekday: Weekday, moon: Phase }>} Entry
 */

/**
 * @param {Temporal.PlainDate} date
 * @returns {Entry}
 */
export function entry(date) {
  return { date, weekday: weekday(date), moon: moonPhase(date) };
}

/**
 * The almanac's entries, one for each day from the epoch onwards.
 *
 * @param {Course} [course]
 * @returns {Generator<Entry, void, undefined>}
 */
export function* almanac(course) {
  for (const date of days(course)) {
    yield entry(date);
  }
}
