import { pcg32 } from "./prng.js";

/**
 * @typedef {object} Context
 * @property {number} code the vault's combination, in [1, 100]
 * @property {Set<string>} notes what the player has learnt so far
 * @property {(ms: number) => Promise<void>} pause
 */

/**
 * A room asks questions with `yield` and reads the answers it is sent.
 * It returns the next room, or a string when the game is over.
 * @typedef {(context: Context) => AsyncGenerator<string, Room | string, string>} Room
 */

/**
 * A small text adventure, as one generator.
 *
 * - `yield` hands a prompt out and receives the player's answer back
 * - `yield*` moves into a room and evaluates to whatever that room returns
 * - `return` ends the game with its outcome
 *
 * There is no `state` variable: the current state is the line where
 * the generator is paused.
 *
 * @param {object} [options]
 * @param {bigint} [options.seed] picks the vault's combination
 * @param {(ms: number) => Promise<void>} [options.pause] dramatic timing, instant by default
 * @returns {AsyncGenerator<string, string, string>}
 */
export async function* adventure(
  { seed = 42n, pause = () => Promise.resolve() } = {},
) {
  /** @type {Context} */
  const context = {
    code: Number(pcg32(seed).next().value % 100n) + 1,
    notes: new Set(),
    pause,
  };

  /** @type {Room | string} */
  let room = hall;
  while (typeof room === "function") {
    room = yield* room(context);
  }
  return room;
}

/** @type {Room} */
async function* hall() {
  let prompt = "A cold hall. A door leads north, stairs lead down.";
  while (true) {
    const answer = yield `${prompt} (north / down / leave)`;
    if (answer === "north") return library;
    if (answer === "down") return vault;
    if (answer === "leave") return "You walk away, none the richer.";
    prompt = "You hesitate in the hall.";
  }
}

/** @type {Room} */
async function* library({ code, notes }) {
  const answer = yield "A library. One book is humming. (read / back)";
  if (answer === "read") {
    notes.add("book");
    yield `The book whispers: "${code > 50 ? "above" : "at most"} fifty". (ok)`;
  }
  return hall;
}

/** @type {Room} */
async function* vault({ code, notes, pause }) {
  const attempts = notes.has("book") ? 6 : 7;
  let prompt = `A vault with a dial from 1 to 100. It allows ${attempts} tries.`;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const guess = Number(yield `${prompt} (a number)`);
    await pause(400);
    if (guess === code) {
      return `The vault opens on try ${attempt}. You are rich!`;
    }
    prompt = Number.isNaN(guess)
      ? "The dial only takes numbers. A try is wasted."
      : `The dial clicks: ${guess < code ? "higher" : "lower"}.`;
  }
  return `The dial seizes up. The code was ${code}.`;
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
