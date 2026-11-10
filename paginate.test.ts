import { deepEqual as assertEquals } from "node:assert/strict";
import { test } from "node:test";
import { take } from "./helpers.js";
import { paginate } from "./paginate.js";

/** Whole numbers, three to a page, and a record of what was asked for. */
function numbers(pages = Infinity) {
  const requests: number[] = [];
  const fetchPage = async (page = 0) => {
    requests.push(page);
    const items = page < pages ? [0, 1, 2].map((index) => page * 3 + index) : [];
    return { items, next: page + 1 < pages ? page + 1 : null };
  };
  return { fetchPage, requests };
}

test("paginate", async (t) => {
  await t.test("yields every item, across all pages", async () => {
    const { fetchPage, requests } = numbers(3);

    assertEquals(await Array.fromAsync(paginate(fetchPage)), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
    assertEquals(requests, [0, 1, 2]);
  });

  await t.test("only requests the pages that are consumed", async () => {
    const { fetchPage, requests } = numbers();

    assertEquals(await Array.fromAsync(take(paginate(fetchPage), 7)), [0, 1, 2, 3, 4, 5, 6]);
    assertEquals(requests, [0, 1, 2]);
  });

  await t.test("can start from a cursor", async () => {
    const { fetchPage, requests } = numbers(3);

    assertEquals(await Array.fromAsync(paginate(fetchPage, 2)), [6, 7, 8]);
    assertEquals(requests, [2]);
  });

  await t.test("handles an empty source", async () => {
    const { fetchPage, requests } = numbers(0);

    assertEquals(await Array.fromAsync(paginate(fetchPage)), []);
    assertEquals(requests, [0]);
  });
});
