// Serve this folder, so that `index.html` can import the modules.
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
]);
const root = import.meta.dirname;
const port = 8000;

createServer(async ({ url = "/" }, response) => {
  const { pathname } = new URL(url, "http://localhost");
  const path = normalize(pathname === "/" ? "/index.html" : pathname);
  const type = types.get(extname(path));
  try {
    if (!type) throw new Error("not a page or a module");
    const body = await readFile(join(root, path));
    response.writeHead(200, { "content-type": type }).end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(port, () => console.log(`http://localhost:${port}`));
