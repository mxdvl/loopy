// deno run examples/pages.js
import { createCatalogue } from "../catalogue.js";
import { paginate } from "../paginate.js";

const total = 100_000;
const pageSize = 25;
const { fetchPage, requests } = createCatalogue({
  total,
  pageSize,
  latency: 200,
});

console.log("Looking for a star whose name repeats one syllable three times…");

for await (const star of paginate(fetchPage)) {
  if (star.id % pageSize === 0) console.log(`page ${requests.length}…`);
  if (/^(..)\1\1$/i.test(star.name)) {
    console.log(`#${star.id} ${star.name} (magnitude ${star.magnitude})`);
    break;
  }
}

console.log(
  `Found after ${requests.length} of ${total / pageSize} pages:`,
  "the rest were never requested.",
);
