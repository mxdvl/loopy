// The same `paginate`, against a real API: https://pokeapi.co
// deno run --allow-net=pokeapi.co examples/pokeapi.js
import { take } from "../helpers.js";
import { paginate } from "../paginate.js";

/** @param {string} [url] */
async function fetchPage(url = "https://pokeapi.co/api/v2/pokemon?limit=20") {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  const { results, next } = await response.json();
  return { items: results, next };
}

for await (const { name } of take(paginate(fetchPage), 50)) {
  console.log(name);
}
