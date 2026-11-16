// node examples/almanac.js
import { almanac, BACKWARDS, DAY, FORWARDS, WIDELY_AVAILABLE } from "../almanac.js";

/** @param {import("../almanac.js").Entry} entry */
function describe({ date, weekday, moon }) {
  return `${date}  ${weekday}, ${moon}`;
}

/** @param {import("../almanac.js").Entry} entry */
function isThe13th({ date }) {
  return date.endsWith("-13");
}

/** @param {import("../almanac.js").Entry} entry */
function isFridayThe13thUnderAFullMoon(entry) {
  return entry.weekday === "Friday" && isThe13th(entry) && entry.moon === "full moon";
}

// 1. An almanac needs to know where to begin, how far to step and which
//    way to go. It has no end, so the reader decides how much to take.

console.log("The first week of the almanac:");
for (const entry of almanac(WIDELY_AVAILABLE, DAY, FORWARDS).take(7)) console.log(describe(entry));

// 2. Nobody knows in advance how many days a search will read.
//    The almanac works out each one only when it is asked for.

console.log("\nThe first Friday the 13th under a full moon:");
const eerie = almanac(WIDELY_AVAILABLE, DAY, FORWARDS).find(isFridayThe13thUnderAFullMoon);
console.log(eerie ? describe(eerie) : "There is none before the dates run out.");

// 3. The epoch is a Friday, so a step of a week only ever lands on
//    Fridays. Going backwards finds the Friday the 13th before it.

console.log("\nThe last Friday the 13th before the almanac begins:");
const earlier = almanac(WIDELY_AVAILABLE, 7 * DAY, BACKWARDS).find(isThe13th);
console.log(earlier ? describe(earlier) : "There is none before the dates run out.");
