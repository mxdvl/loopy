import { pcg32 } from "./prng.js";

/**
 * @typedef {object} Context
 * @property {number} code what opens the clock tower, in [1, 100]
 * @property {number} day how many Mondays so far
 * @property {number} tries how many turns of the dial are left today
 * @property {number} low the lowest the code can still be
 * @property {number} high the highest the code can still be
 * @property {(ms: number) => Promise<void>} pause
 */

/**
 * A room asks questions with `yield` and reads the answers it is sent.
 * It returns the next room, or a string when the game is over.
 * @typedef {(context: Context) => AsyncGenerator<string, Room | string, string>} Room
 */

/**
 * A town where it is always Monday, as one generator.
 *
 * - `yield` hands a prompt out and receives the player's answer back
 * - `yield*` moves into a room and evaluates to whatever that room returns
 * - `return` ends the game, which only happens once the clock tower opens
 *
 * There is no `state` variable: the current state is the line where
 * the generator is paused. Midnight leads back to the morning, so the
 * game has no last day. What the player learnt is all that carries over.
 *
 * @param {object} [options]
 * @param {bigint} [options.seed] picks the clock tower's code
 * @param {(ms: number) => Promise<void>} [options.pause] dramatic timing, instant by default
 * @returns {AsyncGenerator<string, string, string>}
 */
export async function* adventure(
  { seed = 42n, pause = () => Promise.resolve() } = {},
) {
  /** @type {Context} */
  const context = {
    code: Number(pcg32(seed).next().value % 100n) + 1,
    day: 1,
    tries: 3,
    low: 1,
    high: 100,
    pause,
  };

  /** @type {Room | string} */
  let room = morning;
  while (typeof room === "function") {
    room = yield* room(context);
  }
  return room;
}

/** @type {Room} */
async function* morning(context) {
  context.tries = 3;
  let prompt = [
    `Day ${context.day}. It is Monday, 6:00.`,
    context.day > 1 ? " Again." : "",
    context.day === 3 ? " You feel this has all been yielded before." : "",
  ].join("");
  while (true) {
    const answer = yield `${prompt} (get up / sleep in)`;
    if (answer === "get up") return square;
    if (answer === "sleep in") return midnight;
    prompt = "The alarm keeps ringing.";
  }
}

/** @type {Room} */
async function* square({ day, low, high }) {
  let prompt = "The square. The clock tower is locked, the café is open.";
  if (day > 1) prompt += ` You remember: the code is from ${low} to ${high}.`;
  while (true) {
    const answer = yield `${prompt} (tower / café)`;
    if (answer === "tower") return tower;
    if (answer === "café" || answer === "cafe") return café;
    prompt = "The pigeons look at you, as they do every Monday.";
  }
}

/** @type {Room} */
async function* café(context) {
  const above = context.code > 50;
  if (above) context.low = Math.max(context.low, 51);
  else context.high = Math.min(context.high, 50);
  context.tries -= 1;
  yield `The waiter says what he says every Monday: "${above ? "above" : "at most"} fifty". The coffee takes a while. (ok)`;
  return tower;
}

/** @type {Room} */
async function* tower(context) {
  let prompt = `The door has a dial from 1 to 100. There is time for ${context.tries} tries before midnight.`;
  while (context.tries-- > 0) {
    const guess = Number(yield `${prompt} (a number)`);
    await context.pause(400);
    if (guess === context.code) {
      return `The door opens on day ${context.day}. Behind it: Tuesday.`;
    }
    if (Number.isNaN(guess)) {
      prompt = "The dial only takes numbers.";
    } else if (guess < context.code) {
      context.low = Math.max(context.low, guess + 1);
      prompt = "The dial clicks: higher.";
    } else {
      context.high = Math.min(context.high, guess - 1);
      prompt = "The dial clicks: lower.";
    }
  }
  return midnight;
}

/** @type {Room} */
async function* midnight(context) {
  await context.pause(600);
  context.day += 1;
  yield "Midnight strikes. Everything goes dark. (ok)";
  return morning;
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
