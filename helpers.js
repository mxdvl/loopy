/**
 * Resolve after `ms` milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The first `limit` items of an async iterable.
 * Stopping early closes the source, so nothing more is requested from it.
 * @template T
 * @param {AsyncIterable<T>} source
 * @param {number} limit
 * @returns {AsyncGenerator<T, void, undefined>}
 */
export async function* take(source, limit) {
  if (limit <= 0) return;
  let count = 0;
  for await (const item of source) {
    yield item;
    if (++count >= limit) return;
  }
}
