import { assertEquals, assertMatch, assertRejects } from "jsr:@std/assert";
import { adventure, play } from "./adventure.js";

/** Answer from a list, and keep a record of what was asked. */
function script(...answers: string[]) {
  const prompts: string[] = [];
  const respond = (prompt: string) => {
    prompts.push(prompt);
    const answer = answers.shift();
    // Monday never ends on its own, so a script must not run dry.
    if (answer === undefined) throw new Error("out of answers");
    return answer;
  };
  return { prompts, respond };
}

Deno.test({
  name: "adventure",
  async fn(t) {
    await t.step({
      name: "the first prompt is the first Monday",
      async fn() {
        const game = adventure();
        const { value, done } = await game.next();

        assertEquals(done, false);
        assertMatch(String(value), /^Day 1\. It is Monday, 6:00\. \(/);
        await game.return("abandoned");
      },
    });

    await t.step({
      name: "unknown answers stay in the same room",
      async fn() {
        const { respond, prompts } = script("dance");

        await assertRejects(
          () => play(adventure(), respond),
          Error,
          "out of answers",
        );
        assertMatch(prompts[1], /^The alarm keeps ringing/);
      },
    });

    await t.step({
      name: "the door opens with the right code",
      async fn() {
        const { respond, prompts } = script("get up", "tower", "50", "71");

        assertEquals(
          await play(adventure({ seed: 42n }), respond),
          "The door opens on day 1. Behind it: Tuesday.",
        );
        assertMatch(prompts[2], /time for 3 tries/);
        assertMatch(prompts[3], /higher/);
      },
    });

    await t.step({
      name: "midnight leads back to the morning, with what was learnt",
      async fn() {
        const { respond, prompts } = script(
          ...["get up", "tower", "50", "75", "62", "ok"],
          ...["get up", "tower", "71"],
        );

        assertEquals(
          await play(adventure({ seed: 42n }), respond),
          "The door opens on day 2. Behind it: Tuesday.",
        );
        assertMatch(prompts[5], /^Midnight strikes/);
        assertMatch(prompts[6], /^Day 2\. It is Monday, 6:00\. Again\./);
        assertMatch(prompts[7], /the code is from 63 to 74/);
      },
    });

    await t.step({
      name: "the café gives a hint, but costs a try",
      async fn() {
        const { respond, prompts } = script("get up", "cafe", "ok", "71");
        await play(adventure({ seed: 42n }), respond);

        assertMatch(prompts[2], /"above fifty"/);
        assertMatch(prompts[3], /time for 2 tries/);
      },
    });

    await t.step({
      name: "sleeping in costs a day",
      async fn() {
        const { respond, prompts } = script(
          ...["sleep in", "ok", "sleep in", "ok"],
          ...["get up", "tower", "71"],
        );

        assertEquals(
          await play(adventure({ seed: 42n }), respond),
          "The door opens on day 3. Behind it: Tuesday.",
        );
        assertMatch(prompts[4], /yielded before/);
      },
    });

    await t.step({
      name: "the only other way out is to close the generator",
      async fn() {
        const game = adventure();
        await game.next();

        assertEquals(await game.return("walked away"), {
          done: true,
          value: "walked away",
        });
        assertEquals(await game.next("get up"), {
          done: true,
          value: undefined,
        });
      },
    });

    await t.step({
      name: "a bot always reaches Tuesday, by spiralling in on the code",
      async fn() {
        for (const seed of [1n, 2n, 42n, 120n, 987654321n]) {
          let [low, high] = [1, 100];
          let guess = 0;
          const bot = (prompt: string) => {
            if (prompt.includes("(get up")) return "get up";
            if (prompt.includes("(tower")) return "tower";
            if (prompt.includes("(ok)")) return "ok";
            if (prompt.includes("higher")) low = guess + 1;
            if (prompt.includes("lower")) high = guess - 1;
            guess = Math.floor((low + high) / 2);
            return String(guess);
          };

          assertMatch(
            await play(adventure({ seed }), bot),
            /^The door opens on day [123]\. Behind it: Tuesday\.$/,
          );
        }
      },
    });
  },
});
