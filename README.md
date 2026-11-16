# Async Generators

A quick dive into asynchronous iterators &amp; generators.

## Development

`pnpm install`, then [PNPM](https://pnpm.io) handles everything else: the Node version, development, testing, type checking, linting and formatting.

## Examples

### An almanac with no last page

`paginate()` in [`paginate.js`](./paginate.js) turns a paginated source into one list. A page is requested only when the loop gets to it, so leaving the loop is what ends the requests.

[`almanac.js`](./almanac.js) is the source: seven days per page, each with its weekday and the phase of the moon, counted from the day async generators became [widely available](https://web-platform-dx.github.io/web-features-explorer/features/async-generators).

```sh
node examples/almanac.js
```
