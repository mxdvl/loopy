# Async Generators

A quick dive into asynchronous iterators &amp; generators.

## Development

`pnpm install`, then [PNPM](https://pnpm.io) handles everything else: the Node version, development, testing, type checking, linting and formatting.

## Examples

### An almanac

[`almanac.js`](./almanac.js) is a plain generator: one moment after another, each with its date, its weekday and the phase of the moon. It can be given an epoch, a step and a direction; left to itself it begins now and goes forwards a day at a time. It runs to the year 6000, so the reader decides how much to take. Nothing in it waits for anything, which is why it is not async.

```sh
node examples/almanac.js
```
