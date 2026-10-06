import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// The public API is frozen for 1.0: adding, removing or renaming an export fails this test.
// If the change is intended, update the list below in the same commit, add a changeset, and
// document the export in docs/reference/api.md.

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function exportsOf(entry: string): string[] {
  const file = join(root, entry);
  const program = ts.createProgram([file], {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.Preserve,
    skipLibCheck: true,
    noEmit: true,
    types: [],
  });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(file);
  if (!source) throw new Error(`${entry} not found`);
  const symbol = checker.getSymbolAtLocation(source);
  if (!symbol) throw new Error(`${entry} has no exports`);
  return checker
    .getExportsOfModule(symbol)
    .map((s) => s.name)
    .sort();
}

const SURFACE: Record<string, string[]> = {
  "core/src/index.ts": [
    "Commit",
    "CreateFeedOptions",
    "DEFAULT_COMMIT_TYPES",
    "ENTRY_TYPES",
    "Entry",
    "EntryType",
    "Feed",
    "GitHubRelease",
    "GitLabRelease",
    "Highlights",
    "Locale",
    "Messages",
    "ParseChangelogOptions",
    "ParseCommitsOptions",
    "ParseGitHubReleasesOptions",
    "Release",
    "RenderOptions",
    "UnreadOptions",
    "blockMarkdown",
    "compareVersions",
    "createFeed",
    "createStore",
    "escapeHtml",
    "formatDate",
    "getMessages",
    "getUnread",
    "inlineMarkdown",
    "latestKey",
    "messages",
    "parseChangelog",
    "parseCommits",
    "parseFeed",
    "parseGitHubReleases",
    "parseGitLabReleases",
    "releaseKey",
    "renderAtom",
    "renderJsonFeed",
    "renderPage",
    "renderReleases",
    "sortReleases",
    "versionFromTag",
  ],
  "core/src/node.ts": [
    "CONFIG_FILE",
    "DerivativeConfig",
    "InitResult",
    "buildFeed",
    "detectConfig",
    "init",
    "loadConfig",
    "matchesPackage",
    "readGitCommits",
    "readGitHubReleases",
    "readGitLabReleases",
    "readTagDate",
    "writeOutputs",
  ],
  "core/src/widget.ts": ["DerivativeWidget", "defineDerivativeWidget"],
  "react/src/index.ts": [
    "ChangelogList",
    "ChangelogListProps",
    "ChangelogState",
    "EntryType",
    "Feed",
    "Messages",
    "Release",
    "UseChangelogOptions",
    "WhatsNew",
    "WhatsNewProps",
    "useChangelog",
  ],
  "vue/src/index.ts": [
    "ChangelogState",
    "EntryType",
    "Feed",
    "Messages",
    "Release",
    "UseChangelogOptions",
    "WhatsNew",
    "useChangelog",
  ],
};

describe("public API surface", () => {
  for (const [entry, expected] of Object.entries(SURFACE)) {
    it(`${entry} exports exactly the documented names`, () => {
      expect(exportsOf(entry)).toEqual(expected.slice().sort());
    });
  }
});
