// deno run examples/adventure.js
import { createInterface } from "node:readline";
import process from "node:process";
import { adventure } from "../adventure.js";
import { sleep } from "../helpers.js";

// The keyboard is an async iterator too: one line per `next()`.
const lines = createInterface({ input: process.stdin })[Symbol.asyncIterator]();
const game = adventure({ seed: BigInt(Date.now()), pause: sleep });

let step = await game.next();
while (!step.done) {
  console.log(`${step.value}\n>`);
  const line = await lines.next();
  step = line.done
    // Monday has no exit, so closing the keyboard closes the generator.
    ? await game.return("You leave Monday running, and walk away.")
    : await game.next(line.value.trim());
}

console.log(step.value);
await lines.return?.();
