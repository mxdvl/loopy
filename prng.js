/**
 * Pseudo-random number generator of numbers in range [0, 1).
 * Not for crypto purposes
 * @param {bigint} [seed] defaults to Date.now()
 * @returns {Generator<number>}
 */
export function* PRNG(seed = BigInt(Date.now())) {
  const ceiling = 2 ** 32;
  const signal = AbortSignal.timeout(100);

  for (const int of pcg32(seed)) {
    if (signal.aborted) {
      console.log("aborted!");
      return;
    }
    yield Number(int) / ceiling;
  }
}

/**
 * [Permuted Congruential Generator](https://en.wikipedia.org/wiki/Permuted_congruential_generator) for a 32-bit unsigned integer
 * @param {bigint} [seed] defaults to `42n`.
 * @param {bigint} [sequence] defaults to `0n`.
 * @returns {Generator<bigint>}
 */
export function* pcg32(seed = 42n, sequence = 0n) {
  const multiplier = 6364136223846793005n;
  /** an even number, always */
  const increment = BigInt.asUintN(64, (sequence << 1n) | 1n);
  let state = BigInt.asUintN(64, (increment + seed) * multiplier + increment);
  while (true) {
    /** XOR-shifted */
    const xsh = BigInt.asUintN(32, ((state >> 18n) ^ state) >> 27n);
    const rotation = BigInt.asUintN(32, state >> 59n);
    yield BigInt.asUintN(32, (xsh >> rotation) | (xsh << (-rotation & 31n)));
    state = BigInt.asUintN(64, state * multiplier + increment);
  }
}
