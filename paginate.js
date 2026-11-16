/**
 * One page of a longer list, and where the next page starts.
 * @template Item, Cursor
 * @typedef {Readonly<{ items: readonly Item[], next: Cursor | null }>} Page
 * `next` is `null` on the last page.
 */

/**
 * Asks for the page that starts at `cursor`.
 * @template Item, Cursor
 * @callback FetchPage
 * @param {Cursor} cursor
 * @returns {Promise<Page<Item, Cursor>>}
 */

/**
 * Every page from `start` onwards, one request at a time.
 *
 * A page is requested only when the consumer asks for it,
 * so a consumer that stops early also stops the requests.
 *
 * @template Item, Cursor
 * @param {FetchPage<Item, Cursor>} fetchPage
 * @param {Cursor} start
 * @returns {AsyncGenerator<Page<Item, Cursor>, void, undefined>}
 */
export async function* pages(fetchPage, start) {
  // A loop and not `yield* pages(fetchPage, page.next)`: recursion would
  // nest one generator per page, and a list with no end would never unwind.
  let cursor = start;
  while (true) {
    const page = await fetchPage(cursor);
    yield page;
    if (page.next === null) return;
    cursor = page.next;
  }
}

/**
 * Every item of every page from `start` onwards, as one stream.
 *
 * @template Item, Cursor
 * @param {FetchPage<Item, Cursor>} fetchPage
 * @param {Cursor} start
 * @returns {AsyncGenerator<Item, void, undefined>}
 */
export async function* paginate(fetchPage, start) {
  for await (const page of pages(fetchPage, start)) {
    yield* page.items;
  }
}
