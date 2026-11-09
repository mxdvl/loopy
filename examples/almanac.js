// deno run examples/almanac.js
import { createAlmanac } from "../almanac.js";
import { paginate } from "../paginate.js";

const { fetchPage, requests } = createAlmanac({ latency: 100 });

console.log("Looking for a Friday the 13th under a full moon…");

for await (const day of paginate(fetchPage)) {
  if (day.weekday === "Monday") console.log(`week ${requests.length}…`);
  if (day.weekday === "Friday" && day.date.endsWith("-13") && day.moon === "🌕") {
    console.log(`${day.moon} ${day.weekday} ${day.date}, forecast: ${day.sky}`);
    break;
  }
}

console.log(
  `Found after ${requests.length} weeks.`,
  "The almanac goes on, but nobody asked for the rest.",
);
