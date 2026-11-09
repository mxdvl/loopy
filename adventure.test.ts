import { assertEquals, assertMatch } from "jsr:@std/assert";
import { adventure, play } from "./adventure.js";

/** Answer from a list, and keep a record of what was asked. */
function script(...answers: string[]) {
  const prompts: string[] = [];
  const respond = (prompt: string) => {
    prompts.push(prompt);
    return answers.shift() ?? "leave";
  };
  return { prompts, respond };
}

Deno.test({
  name: "adventure",
  async fn(t) {
    await t.step({
      name: "the first prompt comes from the hall",
      async fn() {
        const game = adventure();
        const { value, done } = await game.next();

        assertEquals(done, false);
        assertMatch(String(value), /^A cold hall/);
        await game.return("abandoned");
      },
    });

    await t.step({
      name: "leaving ends the game",
      async fn() {
        const { respond, prompts } = script("leave");

        assertEquals(
          await play(adventure(), respond),
          "You walk away, none the richer.",
        );
        assertEquals(prompts.length, 1);
      },
    });

    await t.step({
      name: "unknown answers stay in the same room",
      async fn() {
        const { respond, prompts } = script("dance", "leave");
        await play(adventure(), respond);

        assertMatch(prompts[1], /^You hesitate/);
      },
    });

    await t.step({
      name: "the vault opens with the right code",
      async fn() {
        const { respond, prompts } = script("down", "50", "75", "62", "71");

        assertEquals(
          await play(adventure({ seed: 42n }), respond),
          "The vault opens on try 4. You are rich!",
        );
        assertMatch(prompts[2], /higher/);
        assertMatch(prompts[3], /lower/);
        assertMatch(prompts[4], /higher/);
      },
    });

    await t.step({
      name: "the book gives a hint, but costs a try",
      async fn() {
        const { respond, prompts } = script("north", "read", "ok", "down");
        await play(adventure({ seed: 42n }), respond);

        assertMatch(prompts[2], /above/);
        assertMatch(prompts[4], /allows 6 tries/);
      },
    });

    await t.step({
      name: "the vault seizes up after seven wrong tries",
      async fn() {
        const { respond } = script("down", "1", "2", "3", "x", "5", "6", "7");

        assertEquals(
          await play(adventure({ seed: 42n }), respond),
          "The dial seizes up. The code was 71.",
        );
      },
    });

    await t.step({
      name: "a bot can always open the vault with a binary search",
      async fn() {
        for (const seed of [1n, 2n, 42n, 120n, 987654321n]) {
          let [low, high] = [1, 100];
          let guess = 0;
          const bot = (prompt: string) => {
            if (prompt.startsWith("A cold hall")) return "down";
            if (prompt.includes("higher")) low = guess + 1;
            if (prompt.includes("lower")) high = guess - 1;
            guess = Math.floor((low + high) / 2);
            return String(guess);
          };

          assertMatch(await play(adventure({ seed }), bot), /You are rich!$/);
        }
      },
    });
  },
});
