// ESM: every documented export must exist.
import * as core from "@sweberdev/derivative";
import * as node from "@sweberdev/derivative/node";
import * as widget from "@sweberdev/derivative/widget/define";
import * as react from "@sweberdev/derivative-react";
import * as vue from "@sweberdev/derivative-vue";

const need = (label, mod, names) => {
  const missing = names.filter((n) => !(n in mod));
  if (missing.length) throw new Error(`${label} (ESM) is missing: ${missing.join(", ")}`);
};
need("core", core, [
  "parseChangelog",
  "parseCommits",
  "parseGitHubReleases",
  "parseGitLabReleases",
  "createFeed",
  "parseFeed",
  "sortReleases",
  "getUnread",
  "latestKey",
  "releaseKey",
  "createStore",
  "renderReleases",
  "renderPage",
  "renderAtom",
  "renderJsonFeed",
  "inlineMarkdown",
  "blockMarkdown",
  "escapeHtml",
  "getMessages",
  "formatDate",
  "messages",
  "compareVersions",
  "versionFromTag",
  "DEFAULT_COMMIT_TYPES",
  "ENTRY_TYPES",
]);
need("node", node, [
  "buildFeed",
  "writeOutputs",
  "readGitCommits",
  "readTagDate",
  "readGitHubReleases",
  "readGitLabReleases",
  "matchesPackage",
  "loadConfig",
  "init",
  "detectConfig",
  "CONFIG_FILE",
]);
need("widget", widget, ["DerivativeWidget", "defineDerivativeWidget"]);
need("react", react, ["WhatsNew", "useChangelog", "ChangelogList"]);
need("vue", vue, ["WhatsNew", "useChangelog"]);

const feed = core.createFeed(core.parseChangelog("## 1.0.0\n\n### Minor Changes\n\n- Hello\n"), {
  generatedAt: null,
});
if (feed.releases[0]?.entries[0]?.text !== "Hello")
  throw new Error("parseChangelog + createFeed broke");
if (!core.renderAtom(feed, { url: "https://x.example/atom.xml" }).includes("<feed"))
  throw new Error("renderAtom broke");
console.log("smoke.mjs ok");
