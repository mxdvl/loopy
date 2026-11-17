# Async Generators

A quick dive into asynchronous iterators &amp; generators.

## Development

`pnpm install`, then [PNPM](https://pnpm.io) handles everything else: the Node version, development, testing, type checking, linting and formatting.

## Examples

### An almanac

[`almanac.js`](./almanac.js) is a plain generator: one day after another, each with its weekday and the phase of the moon. It can be given an epoch and a step, which is negative to go backwards; left to itself it begins today and goes forwards a day at a time. It runs to the year 6000, so the reader decides how much to take. Nothing in it waits for anything, which is why it is not async.

Its days are [`Temporal.PlainDate`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate)s, which Node 24 only has behind a flag:

```sh
node --harmony-temporal examples/almanac.js
```
