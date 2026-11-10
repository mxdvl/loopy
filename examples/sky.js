// node examples/sky.js
import { createClock, replay } from "../helpers.js";
import { merge } from "../merge.js";
import { DAY, halfMoonBay, local, moonHappenings, seaHappenings, sunHappenings } from "../sky.js";

// Three loops of different lengths, none of which ends:
// the sun's day, the sea's half day or so, and the moon's month.
const from = Date.now();
const clock = createClock({ from, speed: DAY / 2000 }); // a day goes by in two seconds

const sky = merge(
  replay(sunHappenings(halfMoonBay, from), clock),
  replay(seaHappenings(halfMoonBay, from), clock),
  replay(moonHappenings(from), clock),
);

console.log("Half Moon Bay, from now on:");
clock.run();
let seen = 0;
for await (const { time, kind, height } of sky) {
  const { weekday, date, clock: hour } = local(time, halfMoonBay);
  const level = height === undefined ? "" : ` ${height.toFixed(1)} m`;
  console.log(`${weekday.slice(0, 3)} ${date} ${hour}  ${kind}${level}`);
  if (++seen < 40) continue;
  // The moon may be days from doing anything, and `break` would wait
  // for it. Stopping the clock lets all three loops go.
  clock.stop();
  break;
}
console.log("…and so on. Nobody asked for the rest.");
