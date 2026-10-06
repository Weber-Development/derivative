import { readFileSync } from "node:fs";

const feed = JSON.parse(readFileSync("out/changelog.json", "utf8"));
if (feed.version !== 1 || feed.releases.length !== 2)
  throw new Error("changelog.json has the wrong shape");
if (!readFileSync("out/atom.xml", "utf8").includes("<feed"))
  throw new Error("atom.xml is not Atom");
if (
  JSON.parse(readFileSync("out/feed.json", "utf8")).version !== "https://jsonfeed.org/version/1.1"
)
  throw new Error("feed.json is not JSON Feed 1.1");
if (!readFileSync("out/index.html", "utf8").includes("<!doctype html>"))
  throw new Error("index.html is broken");
console.log("check-output.mjs ok");
