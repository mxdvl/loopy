// node examples/harvest.js
import process from "node:process";
import { createInterface } from "node:readline";
import { harvest } from "../harvest.js";
import { sleep } from "../helpers.js";

// The keyboard is an async iterator too: one line per `next()`.
const lines = createInterface({ input: process.stdin })[Symbol.asyncIterator]();
// The game starts on today's tide.
const game = harvest({ from: Date.now(), seed: BigInt(Date.now()), pause: sleep });

let step = await game.next();
while (!step.done) {
  console.log(`${step.value}\n>`);
  const line = await lines.next();
  step = line.done
    ? // The tides have no last one, so closing the keyboard closes the generator.
      await game.return("You leave the basket by the door. The tide does not wait.")
    : await game.next(line.value.trim());
}

console.log(step.value);
await lines.return?.();
