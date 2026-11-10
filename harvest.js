import { pcg32 } from "./prng.js";
import { HOUR, daylight, halfMoonBay, local, moon, season, seaHappenings } from "./sky.js";

/**
 * Something to bring home, and when the shore gives it up.
 * @typedef {object} Crop
 * @property {string} name
 * @property {string[]} seasons when it is ready
 * @property {number} below how low the sea must fall to reach it, in metres
 * @property {string} found what there is to see
 */

/** @type {Crop[]} */
const crops = [
  {
    name: "mussels",
    seasons: ["winter"],
    below: 0.6,
    found: "Mussels crowd the bare rocks.",
  },
  {
    name: "clams",
    seasons: ["spring", "summer", "autumn", "winter"],
    below: 0,
    found: "The far sandbar is dry, and full of clams.",
  },
  {
    name: "seaweed",
    seasons: ["spring"],
    below: 0.3,
    found: "Young seaweed shines on the low rocks.",
  },
  {
    name: "blackberries",
    seasons: ["summer"],
    below: Infinity,
    found: "On the bluff, the blackberries are ripe.",
  },
  {
    name: "pumpkins",
    seasons: ["autumn"],
    below: Infinity,
    found: "In the field behind the bluff, the pumpkins are ready.",
  },
];

/** @typedef {import("./sky.js").Happening & { height: number }} Tide */

/**
 * @typedef {object} Context
 * @property {import("./sky.js").Place} place
 * @property {Generator<Tide, void, undefined>} lows every low water in daylight, forever
 * @property {Tide} low the one happening now
 * @property {number} tides how many of them have gone by
 * @property {Map<string, number>} basket
 * @property {Generator<bigint>} dice
 * @property {(ms: number) => Promise<void>} pause
 */

/**
 * A room asks questions with `yield` and reads the answers it is sent.
 * It returns the next room, or a string when the game is over.
 * @typedef {(context: Context) => AsyncGenerator<string, Room | string, string>} Room
 */

/**
 * Every low water that falls between sunrise and sunset. It does not end.
 * @param {import("./sky.js").Place} place
 * @param {number} from
 * @returns {Generator<Tide, void, undefined>}
 */
export function* daylightLows(place, from) {
  for (const tide of seaHappenings(place, from)) {
    if (tide.kind !== "low water") continue;
    const { rise, set } = daylight(local(tide.time, place).midnight, place);
    if (rise === undefined || set === undefined) continue;
    if (tide.time < rise || tide.time > set) continue;
    // to the nearest 10 cm, which is as much as anyone on the shore can tell
    yield { ...tide, height: Math.round(tide.height * 10) / 10 + 0 };
  }
}

/**
 * A year of gathering on a tidal shore, as one generator.
 *
 * - `yield` hands a prompt out and receives the player's answer back
 * - `yield*` moves into a room and evaluates to whatever that room returns
 * - `return` ends the game, once the basket holds one of everything
 *
 * There is no `state` variable: the current state is the line where the
 * generator is paused. Time only moves when the player lets a tide go,
 * and the tides are the real ones for the place, give or take.
 *
 * @param {object} [options]
 * @param {number} [options.from] when the game starts, by default when JavaScript's clocks do
 * @param {import("./sky.js").Place} [options.place]
 * @param {bigint} [options.seed] decides how much each gathering brings
 * @param {(ms: number) => Promise<void>} [options.pause] dramatic timing, instant by default
 * @returns {AsyncGenerator<string, string, string>}
 */
export async function* harvest({
  place = halfMoonBay,
  from = -place.offset * HOUR,
  seed = 42n,
  pause = () => Promise.resolve(),
} = {}) {
  const lows = daylightLows(place, from);
  /** @type {Context} */
  const context = {
    place,
    lows,
    low: following(lows),
    tides: 0,
    basket: new Map(),
    dice: pcg32(seed),
    pause,
  };

  /** @type {Room | string} */
  let room = hut;
  while (typeof room === "function") {
    room = yield* room(context);
  }
  return room;
}

/**
 * @param {Generator<Tide, void, undefined>} lows
 * @returns {Tide}
 */
function following(lows) {
  const { value } = lows.next();
  if (!value) throw new Error("The sea has stopped.");
  return value;
}

/**
 * Let the sea come in and go out again, until a tide worth going down for.
 * Nobody knows in advance how many tides that takes.
 * @param {Context} context
 * @param {(tide: Tide) => boolean} [worth]
 */
function wait(context, worth = () => true) {
  do {
    context.low = following(context.lows);
    context.tides += 1;
  } while (!worth(context.low));
}

/** @type {Room} */
async function* hut(context) {
  const { place, low, basket } = context;
  const { long, clock } = local(low.time, place);
  const holds = basket.size === 0 ? "nothing" : Array.from(basket.keys()).join(", ");
  let prompt = [
    `${moon(low.time).glyph} ${long}, ${season(low.time, place)}.`,
    `Low water at ${clock}: ${low.height.toFixed(1)} m.`,
    `The basket holds ${holds}.`,
  ].join(" ");

  while (true) {
    const answer = yield `${prompt} (go down / next tide / next minus tide / next season)`;
    if (answer === "go down") return shore;
    if (answer === "next tide") {
      wait(context);
      return hut;
    }
    if (answer === "next minus tide") {
      wait(context, (tide) => tide.height < 0);
      return hut;
    }
    if (answer === "next season") {
      const current = season(low.time, place);
      wait(context, (tide) => season(tide.time, place) !== current);
      return hut;
    }
    prompt = "The gulls did not catch that.";
  }
}

/** @type {Room} */
async function* shore(context) {
  const { place, low, basket, dice, pause } = context;
  const now = season(low.time, place);
  const ready = crops.filter((crop) => crop.seasons.includes(now) && low.height < crop.below);

  if (ready.length === 0) {
    yield "The sea has not gone far enough, and nothing on the bluff is ripe. (back)";
    wait(context);
    return hut;
  }

  let prompt = ready.map((crop) => crop.found).join(" ");
  while (true) {
    const answer = yield `${prompt} (${ready.map((crop) => crop.name).join(" / ")} / back)`;
    const crop = ready.find(({ name }) => name === answer);
    if (crop) {
      const amount = 3 + Number((dice.next().value ?? 0n) % 10n);
      basket.set(crop.name, (basket.get(crop.name) ?? 0) + amount);
      await pause(400);
      if (basket.size === crops.length) {
        const { long } = local(low.time, place);
        return `The table is laid on ${long}, ${context.tides} tides after the first. The sea comes back in, as it was always going to.`;
      }
      yield `You carry ${amount} handfuls of ${crop.name} up the path while the water returns. (ok)`;
    } else if (answer !== "back") {
      prompt = "The gulls did not catch that.";
      continue;
    }
    wait(context);
    return hut;
  }
}

/**
 * Drive a two-way generator to its end.
 * `respond` can be a person at a keyboard, a script or a bot.
 *
 * @template Question, Answer, Outcome
 * @param {AsyncGenerator<Question, Outcome, Answer>} game
 * @param {(question: Question) => Answer | Promise<Answer>} respond
 * @returns {Promise<Outcome>}
 */
export async function play(game, respond) {
  // The first `next()` takes no value: the generator has not reached
  // a `yield` yet, so nothing is waiting to receive one.
  let step = await game.next();
  while (!step.done) {
    step = await game.next(await respond(step.value));
  }
  return step.value;
}
