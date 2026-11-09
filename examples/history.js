// This repository, reading its own history one page at a time.
// It is the only loop here that knows where it ends: at the beginning.
//
// deno run --allow-net=api.github.com examples/history.js
import { paginate } from "../paginate.js";

const perPage = 5;

/** @param {number} [page] */
async function fetchPage(page = 1) {
  const url = new URL("https://api.github.com/repos/mxdvl/loopy/commits");
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("page", String(page));

  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  /** @type {{ sha: string, commit: { message: string, author: { date: string } } }[]} */
  const commits = await response.json();

  return {
    items: commits.map(({ sha, commit }) => ({
      sha: sha.slice(0, 7),
      date: commit.author.date.slice(0, 10),
      message: commit.message.split("\n")[0],
    })),
    next: commits.length === perPage ? page + 1 : null,
  };
}

for await (const { sha, date, message } of paginate(fetchPage)) {
  console.log(date, sha, message);
}

console.log("…and before that, nothing.");
