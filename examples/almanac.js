// node examples/almanac.js
import { almanac, DAY, WIDELY_AVAILABLE } from "../almanac.js";

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

// 1. Left to itself, an almanac begins now and goes forwards a day at
//    a time. It has no end in sight, so the reader decides how much to take.

console.log("Today and the two days after:");
for (const entry of almanac().take(3)) console.log(describe(entry));

// 2. It can be told where to begin. Nobody knows in advance how many
//    days a search will read: each one is worked out only when asked for.

const eerie = almanac({ epoch: WIDELY_AVAILABLE }).find(isFridayThe13thUnderAFullMoon);

console.log("\nThe first Friday the 13th under a full moon since async generators:");
console.log(eerie ? describe(eerie) : "There is none in the almanac.");

// 3. It can also be told how far to step and which way to go. The epoch
//    is a Friday, so a step of a week only ever lands on Fridays.

const earlier = almanac({
  epoch: WIDELY_AVAILABLE,
  step: 7 * DAY,
  direction: "backwards",
}).find(isThe13th);

console.log("\nThe last Friday the 13th before them:");
console.log(earlier ? describe(earlier) : "There is none in the almanac.");
