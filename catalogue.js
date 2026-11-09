import { pcg32 } from "./prng.js";
import { sleep } from "./helpers.js";

/** @typedef {{ id: number, name: string, magnitude: number }} Star */

const syllables = [
  "al", "be", "ca", "de", "el", "fo", "ga", "hy",
  "io", "ka", "lu", "mi", "no", "or", "pi", "ra",
];

/**
 * A star is fully described by one 32-bit integer.
 * @param {number} id
 * @param {bigint} int
 * @returns {Star}
 */
function star(id, int) {
  const bits = Number(int);
  const name = [0, 4, 8]
    .map((shift) => syllables[(bits >>> shift) & 0b1111])
    .join("");
  return {
    id,
    name: name[0].toUpperCase() + name.slice(1),
    /** apparent magnitude in [0, 6.4), lower is brighter */
    magnitude: (bits >>> 26) / 10,
  };
}

/**
 * A pretend paginated API over a star catalogue that is stored nowhere:
 * star number `n` is the `n`th value of a seeded generator,
 * so the same seed always serves the same catalogue.
 *
 * @param {object} [options]
 * @param {bigint} [options.seed]
 * @param {number} [options.total] how many stars exist
 * @param {number} [options.pageSize]
 * @param {number} [options.latency] longest response time, in milliseconds
 */
export function createCatalogue(
  { seed = 42n, total = 95, pageSize = 10, latency = 0 } = {},
) {
  /** every cursor that was requested, in order @type {number[]} */
  const requests = [];
  const jitter = pcg32(seed, 1n);

  /**
   * @param {number} [cursor] index of the first star of the page
   * @returns {Promise<import("./paginate.js").Page<Star, number>>}
   */
  async function fetchPage(cursor = 0) {
    requests.push(cursor);
    if (latency > 0) {
      await sleep(Number(jitter.next().value % BigInt(latency)));
    }
    const items = pcg32(seed)
      .drop(cursor)
      .take(Math.max(0, Math.min(pageSize, total - cursor)))
      .map((int, index) => star(cursor + index, int))
      .toArray();
    const end = cursor + items.length;
    return { items, next: end < total ? end : null };
  }

  return { fetchPage, requests };
}
