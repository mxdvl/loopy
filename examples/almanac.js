// node examples/almanac.js
import { createAlmanac } from "../almanac.js";
import { paginate } from "../paginate.js";

const { fetchPage, requests } = createAlmanac({ latency: 60 });

console.log("St Mary's, Isles of Scilly, from 1 January 1970.");
console.log("Looking for a Friday the 13th under a full moon…");

for await (const day of paginate(fetchPage)) {
  if (day.weekday === "Monday") console.log(`week ${requests.length}…`);
  if (day.weekday !== "Friday" || !day.date.endsWith("-13") || day.moon !== "🌕") continue;

  console.log(`${day.moon} ${day.weekday} ${day.date}, ${day.season}`);
  console.log(`   sunrise ${day.sunrise}, sunset ${day.sunset}`);
  for (const { clock, kind, height } of day.tides) {
    console.log(`   ${clock} ${kind} ${height.toFixed(2)} m`);
  }
  break;
}

console.log(`Found after ${requests.length} weeks. The almanac goes on, but nobody asked for the rest.`);
