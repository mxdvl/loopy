import { deepEqual as assertEquals, match, ok, rejects } from "node:assert/strict";
import { test } from "node:test";
import { daylightLows, harvest, play } from "./harvest.js";
import { daylight, scilly, local } from "./sky.js";

/** Answer from a list, and keep a record of what was asked. */
function script(...answers: string[]) {
  const prompts: string[] = [];
  const respond = (prompt: string) => {
    prompts.push(prompt);
    const answer = answers.shift();
    // the tides never run out, so a script must not either
    if (answer === undefined) throw new Error("out of answers");
    return answer;
  };
  return { prompts, respond };
}

test("daylight lows fall between sunrise and sunset", () => {
  for (const { time, kind } of daylightLows(scilly, Date.UTC(2026, 0, 1)).take(400)) {
    const { rise, set } = daylight(local(time, scilly).midnight, scilly);

    assertEquals(kind, "low water");
    ok((rise ?? Infinity) <= time && time <= (set ?? -Infinity));
  }
});

test("harvest", async (t) => {
  await t.test("starts with the first low water in daylight", async () => {
    const game = harvest();
    const { value, done } = await game.next();

    // the lows of the first four days of 1970 fall in the dark
    assertEquals(done, false);
    assertEquals(
      value,
      "🌘 Monday 5 January 1970, winter. Low water at 08:33: 1.5 m. The basket holds nothing. (go down / next tide / next spring tide / next season)",
    );
    await game.return("abandoned");
  });

  await t.test("unknown answers stay in the same room", async () => {
    const { respond, prompts } = script("swim");

    await rejects(() => play(harvest(), respond), /out of answers/);
    match(prompts[1] ?? "", /^The gulls did not catch that\. \(go down/);
  });

  await t.test("going down takes the tide, whatever comes of it", async () => {
    const { respond, prompts } = script("next season", "next season", "go down", "back");

    await rejects(() => play(harvest(), respond), /out of answers/);
    match(prompts[2] ?? "", /Monday 22 June 1970, summer\. Low water at 12:43: 0\.9 m/);
    match(prompts[3] ?? "", /^Along the top of the shore, the samphire is green\. \(samphire \/ back\)$/);
    match(prompts[4] ?? "", /Tuesday 23 June 1970, summer\. Low water at 13:32: 1\.0 m/);
  });

  await t.test("the channel only drains on a big spring tide", async () => {
    const { respond, prompts } = script("go down", "back", "next spring tide", "go down");

    await rejects(() => play(harvest(), respond), /out of answers/);
    match(prompts[1] ?? "", /\(narcissi \/ back\)$/);
    match(prompts[3] ?? "", /Friday 9 January 1970, winter\. Low water at 11:53: 0\.6 m/);
    match(prompts[4] ?? "", /\(narcissi \/ cockles \/ back\)$/);
  });

  await t.test("the table is laid after a turn of the seasons", async () => {
    const { respond, prompts } = script(
      ...["go down", "narcissi", "ok"],
      ...["next spring tide", "go down", "cockles", "ok"],
      ...["next season", "go down", "seaweed", "ok"],
      ...["next season", "go down", "samphire", "ok"],
      ...["next season", "go down", "blackberries"],
    );

    assertEquals(
      await play(harvest(), respond),
      "The table is laid on Wednesday 23 September 1970, 274 tides after the first. The sea comes back in, as it was always going to.",
    );
    match(prompts[2] ?? "", /^You carry 3 handfuls of narcissi up the path/);
    match(prompts.at(-2) ?? "", /The basket holds narcissi, cockles, seaweed, samphire\./);
  });

  await t.test("the only other way out is to close the generator", async () => {
    const game = harvest();
    await game.next();

    assertEquals(await game.return("walked away"), { done: true, value: "walked away" });
    assertEquals(await game.next("go down"), { done: true, value: undefined });
  });

  await t.test("a patient bot lays the table within two years, whenever it starts", async () => {
    const starts = [undefined, Date.UTC(1999, 5, 1), Date.UTC(2026, 10, 10, 20)];
    for (const [index, from] of starts.entries()) {
      const basket = new Set<string>();
      const bot = (prompt: string) => {
        if (prompt.includes("(go down")) return "go down";
        const options = /\(([^)]+)\)$/.exec(prompt)?.[1]?.split(" / ") ?? [];
        const pick = options.find((option) => option !== "back" && !basket.has(option));
        if (pick && pick !== "ok") basket.add(pick);
        return pick ?? "back";
      };
      const game = harvest({ seed: BigInt(index), ...(from === undefined ? {} : { from }) });
      const tides = Number(/, (\d+) tides after/.exec(await play(game, bot))?.[1]);

      ok(tides > 100 && tides < 700);
    }
  });
});
