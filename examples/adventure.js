// deno run examples/adventure.js
import { createInterface } from "node:readline";
import process from "node:process";
import { adventure, play } from "../adventure.js";
import { sleep } from "../helpers.js";

// The keyboard is an async iterator too: one line per `next()`.
const lines = createInterface({ input: process.stdin })[Symbol.asyncIterator]();

const game = adventure({ seed: BigInt(Date.now()), pause: sleep });
const ending = await play(game, async (prompt) => {
  console.log(`${prompt}\n>`);
  const { value, done } = await lines.next();
  return done ? "leave" : value.trim();
});

console.log(ending);
await lines.return?.();
