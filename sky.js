/**
 * Sun, moon and sea, worked out from first principles and a handful of
 * published constants. Good to a few minutes for the sun, an hour or so
 * for the moon's phases, and roughly a quarter of an hour and a hand's
 * width for the tide. An almanac, not a navigation aid.
 */

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/**
 * One wave in the tide: a named rhythm with a size and a delay.
 * @typedef {object} Constituent
 * @property {keyof typeof arguments_} name
 * @property {number} amplitude in metres
 * @property {number} phase how far it lags behind the sky at Greenwich, in degrees
 */

/**
 * @typedef {object} Place
 * @property {string} name
 * @property {number} latitude in degrees, north is positive
 * @property {number} longitude in degrees, east is positive
 * @property {number} offset of its standard time from UTC, in hours
 * @property {number} datum how far mean sea level is above the zero of its tide tables, in metres
 * @property {Constituent[]} constituents
 */

/**
 * Something the sky or the sea does at one moment.
 * @typedef {object} Happening
 * @property {number} time
 * @property {string} kind
 * @property {number} [height] of the sea, in metres above the datum
 */

const FOOT = 0.3048;

/**
 * Pillar Point Harbor, on Half Moon Bay in California.
 * Constituents are the eight largest of NOAA station 9414131, see
 * https://tidesandcurrents.noaa.gov/harcon.html?id=9414131
 *
 * The datum is this model's own mean lower low water, from 1983 to 2001.
 * @type {Place}
 */
export const halfMoonBay = {
  name: "Half Moon Bay",
  latitude: 37.5025,
  longitude: -122.4822,
  offset: -8,
  datum: 0.883,
  constituents: [
    { name: "M2", amplitude: 1.781 * FOOT, phase: 184.1 },
    { name: "K1", amplitude: 1.152 * FOOT, phase: 217.3 },
    { name: "O1", amplitude: 0.738 * FOOT, phase: 203.3 },
    { name: "S2", amplitude: 0.472 * FOOT, phase: 189.6 },
    { name: "N2", amplitude: 0.39 * FOOT, phase: 158.4 },
    { name: "P1", amplitude: 0.381 * FOOT, phase: 216.3 },
    { name: "Q1", amplitude: 0.144 * FOOT, phase: 196.3 },
    { name: "K2", amplitude: 0.128 * FOOT, phase: 190.0 },
  ],
};

const RADIAN = Math.PI / 180;
/** @param {number} degrees */
const sin = (degrees) => Math.sin(degrees * RADIAN);
/** @param {number} degrees */
const cos = (degrees) => Math.cos(degrees * RADIAN);
/** @param {number} degrees into [0, 360) */
const turn = (degrees) => ((degrees % 360) + 360) % 360;
/** @param {number} degrees into [-180, 180) */
const lean = (degrees) => turn(degrees + 180) - 180;

/** noon on 1 January 2000, where astronomers start counting */
const J2000 = Date.UTC(2000, 0, 1, 12);

/**
 * Where the slow hands of the sky point, in degrees.
 * Each one is a loop that started long ago and has no last turn.
 * @param {number} time
 */
function hands(time) {
  const days = (time - J2000) / DAY;
  return {
    /** hours since midnight at Greenwich, as an angle: once round per day */
    clock: turn(((time % DAY) / HOUR) * 15),
    /** the moon along its orbit: once round per 27.3 days */
    moon: turn(218.3165 + 13.17639648 * days),
    /** the sun along the year: once round per 365.24 days */
    sun: turn(280.4665 + 0.98564736 * days),
    /** the moon's nearest point to the Earth: once round per 8.85 years */
    perigee: turn(83.3532 + 0.11140353 * days),
    /** where the moon's orbit crosses the sun's: once round, backwards, per 18.6 years */
    node: turn(125.0445 - 0.05295377 * days),
    /** the sun from its nearest point to the Earth: once round per year */
    anomaly: turn(357.5291 + 0.98560028 * days),
  };
}

/**
 * The sun as seen from the centre of the Earth.
 * @param {number} time
 */
export function sun(time) {
  const { sun, anomaly } = hands(time);
  const days = (time - J2000) / DAY;
  const longitude = turn(
    sun + 1.9148 * sin(anomaly) + 0.02 * sin(2 * anomaly) + 0.0003 * sin(3 * anomaly),
  );
  const tilt = 23.4393 - 3.56e-7 * days;
  const ascension = Math.atan2(cos(tilt) * sin(longitude), cos(longitude)) / RADIAN;
  return {
    /** along the year, in degrees: 0 at the March equinox */
    longitude,
    /** north of the equator, in degrees */
    declination: Math.asin(sin(tilt) * sin(longitude)) / RADIAN,
    /** how far the sundial is ahead of the clock, in degrees */
    equation: lean(sun - ascension),
  };
}

/**
 * The moon, as far as its phase is concerned.
 * @param {number} time
 */
export function moon(time) {
  const { moon, sun: mean, perigee, node, anomaly } = hands(time);
  const own = moon - perigee;
  const apart = moon - mean;
  const longitude =
    moon +
    6.289 * sin(own) +
    1.274 * sin(2 * apart - own) +
    0.658 * sin(2 * apart) +
    0.214 * sin(2 * own) -
    0.186 * sin(anomaly) -
    0.114 * sin(2 * (moon - node));
  const elongation = turn(longitude - sun(time).longitude);
  return {
    /** ahead of the sun, in degrees: 0 when new, 180 when full */
    elongation,
    /** how much of the disc is lit, from 0 to 1 */
    lit: (1 - cos(elongation)) / 2,
    glyph: moons[Math.round(elongation / 45) % 8] ?? "🌑",
  };
}

const moons = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];
const phases = ["new moon", "first quarter", "full moon", "last quarter"];
const seasons = ["spring", "summer", "autumn", "winter"];

/**
 * The astronomical season, which starts at an equinox or a solstice.
 * @param {number} time
 * @param {Place} place
 */
export function season(time, place) {
  const quarter = Math.floor(sun(time).longitude / 90);
  return seasons[(quarter + (place.latitude < 0 ? 2 : 0)) % 4] ?? "spring";
}

/**
 * What each tidal rhythm is doing at Greenwich: its angle, and how the
 * 18.6-year swing of the moon's orbit stretches (`f`) and shifts (`u`) it.
 * @satisfies {Record<string, (h: ReturnType<typeof hands>) => { angle: number, f: number, u: number }>}
 */
const arguments_ = {
  M2: (h) => ({
    angle: 2 * h.clock - 2 * h.moon + 2 * h.sun,
    f: 1 - 0.037 * cos(h.node),
    u: -2.1 * sin(h.node),
  }),
  N2: (h) => ({
    angle: 2 * h.clock - 3 * h.moon + 2 * h.sun + h.perigee,
    f: 1 - 0.037 * cos(h.node),
    u: -2.1 * sin(h.node),
  }),
  S2: (h) => ({ angle: 2 * h.clock, f: 1, u: 0 }),
  K2: (h) => ({
    angle: 2 * h.clock + 2 * h.sun,
    f: 1.024 + 0.286 * cos(h.node),
    u: -17.7 * sin(h.node),
  }),
  K1: (h) => ({
    angle: h.clock + h.sun + 90,
    f: 1.006 + 0.115 * cos(h.node),
    u: -8.9 * sin(h.node),
  }),
  O1: (h) => ({
    angle: h.clock - 2 * h.moon + h.sun - 90,
    f: 1.009 + 0.187 * cos(h.node),
    u: 10.8 * sin(h.node),
  }),
  Q1: (h) => ({
    angle: h.clock - 3 * h.moon + h.sun + h.perigee - 90,
    f: 1.009 + 0.187 * cos(h.node),
    u: 10.8 * sin(h.node),
  }),
  P1: (h) => ({ angle: h.clock - h.sun - 90, f: 1, u: 0 }),
};

/**
 * How high the sea stands, in metres above the place's datum.
 * @param {number} time
 * @param {Place} place
 */
export function sea(time, place) {
  const now = hands(time);
  let height = place.datum;
  for (const { name, amplitude, phase } of place.constituents) {
    const { angle, f, u } = arguments_[name](now);
    height += f * amplitude * cos(angle + u - phase);
  }
  return height;
}

/**
 * Sunrise, noon and sunset of the day that starts at `midnight`.
 * Rise and set are missing where the sun does neither.
 * @param {number} midnight in the place's standard time
 * @param {Place} place
 */
export function daylight(midnight, place) {
  /** @param {number} guess @param {-1 | 0 | 1} side */
  const moment = (guess, side) => {
    const { declination, equation } = sun(guess);
    const noon = midnight + (12 + place.offset - place.longitude / 15 - equation / 15) * HOUR;
    if (side === 0) return noon;
    const cosine =
      (sin(-0.833) - sin(place.latitude) * sin(declination)) /
      (cos(place.latitude) * cos(declination));
    if (Math.abs(cosine) > 1) return undefined;
    return noon + ((side * Math.acos(cosine)) / RADIAN / 15) * HOUR;
  };
  /** @param {-1 | 0 | 1} side */
  const settle = (side) => {
    const first = moment(midnight + (12 + 6 * side) * HOUR, side);
    return first === undefined ? undefined : moment(first, side);
  };
  return { rise: settle(-1), noon: settle(0) ?? midnight + 12 * HOUR, set: settle(1) };
}

/**
 * Every sunrise and sunset, from `from` onwards. It does not end.
 * @param {Place} place
 * @param {number} from
 * @returns {Generator<Happening, never, undefined>}
 */
export function* sunHappenings(place, from) {
  for (let { midnight } = local(from, place); ; midnight += DAY) {
    const { rise, set } = daylight(midnight, place);
    if (rise !== undefined && rise >= from) yield { time: rise, kind: "sunrise" };
    if (set !== undefined && set >= from) yield { time: set, kind: "sunset" };
  }
}

/**
 * Every new moon, quarter and full moon, from `from` onwards. It does not end.
 * @param {number} from
 * @returns {Generator<Happening, never, undefined>}
 */
export function* moonHappenings(from) {
  /** the moon gains this many degrees on the sun per day, on average */
  const pace = 12.1907;
  let quarter = Math.ceil(moon(from).elongation / 90);
  let time = from;
  while (true) {
    for (let step = 0; step < 6; step++) {
      time += (lean(quarter * 90 - moon(time).elongation) / pace) * DAY;
    }
    if (time >= from) yield { time, kind: phases[quarter % 4] ?? "new moon" };
    quarter += 1;
    time += (90 / pace) * DAY;
  }
}

/**
 * Every high and low water, from `from` onwards. It does not end.
 * @param {Place} place
 * @param {number} from
 * @returns {Generator<Happening & { height: number }, never, undefined>}
 */
export function* seaHappenings(place, from) {
  const step = 10 * MINUTE;
  let [before, here] = [sea(from - step, place), sea(from, place)];
  for (let time = from; ; time += step) {
    const after = sea(time + step, place);
    const high = here >= before && here > after;
    const low = here <= before && here < after;
    if (high || low) {
      // a parabola through three points finds the turn between them
      const shift = (0.5 * (before - after)) / (before - 2 * here + after);
      const turned = time + shift * step;
      if (turned >= from) {
        yield { time: turned, kind: high ? "high water" : "low water", height: sea(turned, place) };
      }
    }
    [before, here] = [here, after];
  }
}

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * A moment as the place's own calendar and clock would show it,
 * in its standard time all year round: the sea does not save daylight.
 * @param {number} time
 * @param {Place} place
 */
export function local(time, place) {
  const shifted = new Date(time + place.offset * HOUR + MINUTE / 2);
  const iso = shifted.toISOString();
  const weekday = weekdays[shifted.getUTCDay()] ?? "";
  const month = months[shifted.getUTCMonth()] ?? "";
  return {
    /** as `YYYY-MM-DD` */
    date: iso.slice(0, 10),
    /** as `HH:MM` */
    clock: iso.slice(11, 16),
    weekday,
    /** as `Thursday 1 January 1970` */
    long: `${weekday} ${shifted.getUTCDate()} ${month} ${shifted.getUTCFullYear()}`,
    /** when that day started */
    midnight: Math.floor((time + place.offset * HOUR) / DAY) * DAY - place.offset * HOUR,
  };
}
