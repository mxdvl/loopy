/**
 * Interleave several async iterables, yielding each value as soon as
 * its source produces it. Ends when every source has ended.
 *
 * Each source always has exactly one `next()` in flight.
 * Whichever settles first wins the race, is yielded, then re-armed.
 *
 * @template T
 * @param {...AsyncIterable<T>} sources
 * @returns {AsyncGenerator<T, void, undefined>}
 */
export async function* merge(...sources) {
  /** the sources that have not ended */
  const iterators = new Map(
    sources.map((source, index) => [index, source[Symbol.asyncIterator]()]),
  );
  /** the one `next()` in flight for each of them */
  const pending = new Map(
    Array.from(iterators, ([index, iterator]) => [index, advance(iterator, index)]),
  );

  try {
    while (pending.size > 0) {
      const { index, iterator, result } = await Promise.race(pending.values());
      if (result.done) {
        pending.delete(index);
        iterators.delete(index);
        continue;
      }
      pending.set(index, advance(iterator, index));
      yield result.value;
    }
  } finally {
    // Reached on exhaustion, on `break` in the consumer and on errors.
    // Sources that are still open are told to clean up. This waits for
    // them: a source stuck on a promise that never settles would hold
    // the consumer up.
    for (const promise of pending.values()) promise.catch(() => {});
    await Promise.allSettled(Array.from(iterators.values(), (iterator) => iterator.return?.()));
  }
}

/**
 * @template T
 * @param {AsyncIterator<T>} iterator
 * @param {number} index
 */
function advance(iterator, index) {
  return iterator.next().then((result) => ({ index, iterator, result }));
}

/**
 * Advance several async iterables in lockstep, yielding one tuple per
 * round. Ends as soon as any source ends, so the slowest source sets
 * the pace and the shortest sets the length.
 *
 * @template T
 * @param {...AsyncIterable<T>} sources
 * @returns {AsyncGenerator<T[], void, undefined>}
 */
export async function* zip(...sources) {
  const iterators = sources.map((source) => source[Symbol.asyncIterator]());
  try {
    while (true) {
      const results = await Promise.all(
        iterators.map((iterator) => iterator.next()),
      );
      if (results.some((result) => result.done)) return;
      yield results.map((result) => result.value);
    }
  } finally {
    await Promise.allSettled(iterators.map((iterator) => iterator.return?.()));
  }
}
