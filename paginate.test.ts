import { deepEqual as assertEquals, rejects } from "node:assert/strict";
import { mock, test } from "node:test";
import { pages, paginate, type Page } from "./paginate.js";

/** A short book: three pages of letters, numbered from 0. */
const BOOK = [["a", "b"], ["c", "d"], ["e"]] as const;

async function fetchLetters(cursor: number): Promise<Page<string, number>> {
  const items = BOOK[cursor];
  if (items === undefined) throw new RangeError(`There is no page ${cursor}.`);
  return { items, next: cursor + 1 < BOOK.length ? cursor + 1 : null };
}

/** A book with no last page: page `n` holds the number `n`. */
async function fetchNumber(cursor: number): Promise<Page<number, number>> {
  return { items: [cursor], next: cursor + 1 };
}

/** The cursors a mocked `fetchPage` was called with, in order. */
function requested(fetchPage: { mock: { calls: { arguments: unknown[] }[] } }) {
  return fetchPage.mock.calls.map((call) => call.arguments[0]);
}

test("pages", async (t) => {
  await t.test("yields each page, up to the one with no next", async () => {
    const fetchPage = mock.fn(fetchLetters);

    assertEquals(await Array.fromAsync(pages(fetchPage, 0)), [
      { items: ["a", "b"], next: 1 },
      { items: ["c", "d"], next: 2 },
      { items: ["e"], next: null },
    ]);
    assertEquals(requested(fetchPage), [0, 1, 2]);
  });

  await t.test("starts where it is told to", async () => {
    const fetchPage = mock.fn(fetchLetters);

    assertEquals(await Array.fromAsync(pages(fetchPage, 2)), [{ items: ["e"], next: null }]);
    assertEquals(requested(fetchPage), [2]);
  });

  await t.test("follows cursors that are not numbers", async () => {
    const fetchPage = async (cursor: string): Promise<Page<string, string>> => ({
      items: [cursor],
      next: cursor === "first" ? "second" : null,
    });

    assertEquals(await Array.fromAsync(paginate(fetchPage, "first")), ["first", "second"]);
  });
});

test("paginate", async (t) => {
  await t.test("yields every item of every page, in order", async () => {
    assertEquals(await Array.fromAsync(paginate(fetchLetters, 0)), ["a", "b", "c", "d", "e"]);
  });

  await t.test("skips over a page with nothing on it", async () => {
    const fetchPage = async (cursor: number): Promise<Page<number, number>> => ({
      items: cursor === 1 ? [] : [cursor],
      next: cursor < 2 ? cursor + 1 : null,
    });

    assertEquals(await Array.fromAsync(paginate(fetchPage, 0)), [0, 2]);
  });

  await t.test("requests nothing until it is asked for an item", async () => {
    const fetchPage = mock.fn(fetchLetters);
    const letters = paginate(fetchPage, 0);

    assertEquals(requested(fetchPage), []);
    assertEquals(await letters.next(), { done: false, value: "a" });
    assertEquals(await letters.next(), { done: false, value: "b" });
    assertEquals(requested(fetchPage), [0]);
    assertEquals(await letters.next(), { done: false, value: "c" });
    assertEquals(requested(fetchPage), [0, 1]);
  });

  await t.test("stops requesting when the consumer leaves the loop", async () => {
    const fetchPage = mock.fn(fetchNumber);

    for await (const number of paginate(fetchPage, 0)) {
      if (number === 3) break;
    }

    assertEquals(requested(fetchPage), [0, 1, 2, 3]);
  });

  await t.test("can go a long way without going any deeper", async () => {
    let last = -1;
    for await (const number of paginate(fetchNumber, 0)) {
      last = number;
      if (number === 100_000) break;
    }

    assertEquals(last, 100_000);
  });

  await t.test("passes on a failed request, after the items before it", async () => {
    const fetchPage = async (cursor: number): Promise<Page<string, number>> => {
      if (cursor === 1) throw new Error("The line went dead.");
      return { items: ["a"], next: cursor + 1 };
    };
    const letters = paginate(fetchPage, 0);

    assertEquals(await letters.next(), { done: false, value: "a" });
    await rejects(letters.next(), new Error("The line went dead."));
    assertEquals(await letters.next(), { done: true, value: undefined });
  });
});
