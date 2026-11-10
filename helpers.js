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

/**
 * A clock that runs faster than the real one, and can be held still.
 * @typedef {object} Clock
 * @property {() => void} run let time pass
 * @property {() => void} hold keep time where it is, until the next `run()`
 * @property {() => void} stop end time: nothing that is waited for will happen
 * @property {(time: number) => Promise<boolean>} until resolves with `true`
 *   when the clock reaches `time`, or with `false` if it is stopped first
 */

/**
 * @param {object} options
 * @param {number} options.from what time the clock starts at
 * @param {number} options.speed how many times faster than real time it runs
 * @returns {Clock}
 */
export function createClock({ from, speed }) {
  /** @typedef {{ time: number, resolve: (reached: boolean) => void, timer?: ReturnType<typeof setTimeout> }} Waiter */
  /** @type {Set<Waiter>} */
  const waiters = new Set();
  let [reading, since, running, stopped] = [from, 0, false, false];

  const now = () => (running ? reading + (Date.now() - since) * speed : reading);

  /** @param {Waiter} waiter */
  const wake = (waiter) => {
    waiter.timer = setTimeout(
      () => {
        waiters.delete(waiter);
        waiter.resolve(true);
      },
      Math.max(0, (waiter.time - now()) / speed),
    );
  };

  return {
    run() {
      if (running || stopped) return;
      [since, running] = [Date.now(), true];
      // the earliest first, so that things overdue still happen in order
      for (const waiter of Array.from(waiters).sort((a, b) => a.time - b.time)) wake(waiter);
    },
    hold() {
      if (!running) return;
      [reading, running] = [now(), false];
      for (const { timer } of waiters) clearTimeout(timer);
    },
    stop() {
      [reading, running, stopped] = [now(), false, true];
      for (const { timer, resolve } of waiters) {
        clearTimeout(timer);
        resolve(false);
      }
      waiters.clear();
    },
    until(time) {
      if (stopped) return Promise.resolve(false);
      return new Promise((resolve) => {
        /** @type {Waiter} */
        const waiter = { time, resolve };
        waiters.add(waiter);
        if (running) wake(waiter);
      });
    },
  };
}

/**
 * Live through a list of timed things by a clock: each one is yielded
 * when its moment comes round. A generator cannot be closed while it
 * waits, so stopping the clock is what lets it go.
 * @template {{ time: number }} T
 * @param {Iterable<T>} things in order of time
 * @param {Clock} clock
 * @returns {AsyncGenerator<T, void, undefined>}
 */
export async function* replay(things, clock) {
  for (const thing of things) {
    if (!(await clock.until(thing.time))) return;
    yield thing;
  }
}
