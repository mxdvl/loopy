// node examples/almanac.js
import process from "node:process";
import { fetchWeek } from "../almanac.js";
import { paginate } from "../paginate.js";

/** @param {import("../almanac.js").Day} day */
function describe({ date, weekday, moon }) {
  return `${date}  ${weekday}, ${moon}`;
}

/** @param {import("../almanac.js").Day} day */
function isFridayThe13thUnderAFullMoon({ date, weekday, moon }) {
  return weekday === "Friday" && date.endsWith("-13") && moon === "full moon";
}

/**
 * The same request, leaving a dot behind each time it is made.
 * @param {number} cursor
 */
function fetchWeekVisibly(cursor) {
  process.stdout.write(".");
  return fetchWeek(cursor);
}

// 1. One request gives one page, and says where the next one starts.

const page = await fetchWeek(0);
console.log("Page 0 of the almanac:");
for (const day of page.items) console.log(describe(day));
console.log(`The next page is page ${page.next}.\n`);

// 2. `paginate()` turns the pages into one list of days. Nobody knows
//    how long the list is: each page is requested only when the loop
//    gets to it, and leaving the loop is what ends the requests.

console.log("Looking for a Friday the 13th under a full moon, one dot per request:");
for await (const day of paginate(fetchWeekVisibly, 0)) {
  if (!isFridayThe13thUnderAFullMoon(day)) continue;
  console.log(`\n${describe(day)}`);
  break;
}
console.log("The loop has stopped, and so have the requests.");
