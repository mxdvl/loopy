import { deepEqual as assertEquals, match, ok, rejects } from "node:assert/strict";
import { test } from "node:test";
import { daylightLows, harvest, play } from "./harvest.js";
import { daylight, halfMoonBay, local } from "./sky.js";

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
  for (const { time, kind } of daylightLows(halfMoonBay, Date.UTC(2026, 0, 1)).take(400)) {
    const { rise, set } = daylight(local(time, halfMoonBay).midnight, halfMoonBay);

    assertEquals(kind, "low water");
    ok((rise ?? Infinity) <= time && time <= (set ?? -Infinity));
  }
});

test("harvest", async (t) => {
  await t.test("starts with the first low water in daylight", async () => {
    const game = harvest();
    const { value, done } = await game.next();

    assertEquals(done, false);
    assertEquals(
      value,
      "🌗 Thursday 1 January 1970, winter. Low water at 11:47: 0.4 m. The basket holds nothing. (go down / next tide / next minus tide / next season)",
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
    match(prompts[2] ?? "", /Sunday 21 June 1970, summer\. Low water at 17:25: 0\.8 m/);
    match(prompts[3] ?? "", /^On the bluff, the blackberries are ripe\. \(blackberries \/ back\)$/);
    match(prompts[4] ?? "", /Monday 22 June 1970, summer\. Low water at 06:45: -0\.4 m/);
  });

  await t.test("the sea has to go out far enough", async () => {
    const { respond, prompts } = script("next season", "go down", "back");

    await rejects(() => play(harvest(), respond), /out of answers/);
    match(prompts[0] ?? "", /winter/);
    match(prompts[1] ?? "", /Saturday 21 March 1970, spring\. Low water at 15:45: 0\.1 m/);
    match(prompts[2] ?? "", /^Young seaweed shines/);
  });

  await t.test("a minus tide is one that falls below the tables' zero", async () => {
    const { respond, prompts } = script("next minus tide", "go down");

    await rejects(() => play(harvest(), respond), /out of answers/);
    match(prompts[1] ?? "", /Sunday 4 January 1970, winter\. Low water at 14:25: -0\.2 m/);
    match(prompts[2] ?? "", /\(mussels \/ clams \/ back\)$/);
  });

  await t.test("the table is laid after a turn of the seasons", async () => {
    const { respond, prompts } = script(
      ...["go down", "mussels", "ok"],
      ...["next minus tide", "go down", "clams", "ok"],
      ...["next season", "go down", "seaweed", "ok"],
      ...["next season", "go down", "blackberries", "ok"],
      ...["next season", "go down", "pumpkins"],
    );

    assertEquals(
      await play(harvest(), respond),
      "The table is laid on Wednesday 23 September 1970, 282 tides after the first. The sea comes back in, as it was always going to.",
    );
    match(prompts[2] ?? "", /^You carry 3 handfuls of mussels up the path/);
    match(prompts.at(-2) ?? "", /The basket holds mussels, clams, seaweed, blackberries\./);
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
