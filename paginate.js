/**
 * @template Item, Cursor
 * @typedef {{ items: Item[], next?: Cursor | null }} Page
 */

/**
 * Flatten a paginated source into a single stream of items.
 *
 * A page is only requested when the consumer asks for an item beyond
 * the pages already seen, so `break` also means "stop fetching".
 *
 * @template Item, Cursor
 * @param {(cursor?: Cursor) => Promise<Page<Item, Cursor>>} fetchPage
 * @param {Cursor} [first] where to start, defaults to whatever `fetchPage` does without a cursor
 * @returns {AsyncGenerator<Item, void, undefined>}
 */
export async function* paginate(fetchPage, first) {
  let cursor = first;
  do {
    const { items, next } = await fetchPage(cursor);
    yield* items;
    cursor = next ?? undefined;
  } while (cursor !== undefined);
}
