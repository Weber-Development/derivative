import { dirname, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { buildFeed, CONFIG_FILE, type DerivativeConfig, loadConfig, writeOutputs } from "./node";

const HELP = `derivative build [options]

Builds changelog.json (and optionally an Atom feed and an HTML page) from
CHANGELOG.md files or conventional commits.

Options:
  --config <file>       Config file (default: ${CONFIG_FILE} if present)
  --source <kind>       changelog | git
  --changelog <file>    CHANGELOG.md path, repeat for monorepos
  --tag-pattern <re>    git: only tags matching this start a release
  --commit-url <url>    git: commit link template, {hash} is replaced
  --unreleased          include unreleased changes
  --title <text>        feed title
  --link <url>          public URL of the full changelog
  --limit <n>           keep the newest n releases
  --out <file>          changelog.json path (default: public/changelog.json)
  --atom <file>         also write an Atom feed
  --html <file>         also write a standalone HTML page
  --lang <tag>          language of labels and dates (en, de, fr, it)
  -h, --help            show this help
`;

export async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  if (!command || command === "-h" || command === "--help") {
    process.stdout.write(HELP);
    return 0;
  }
  if (command !== "build") {
    process.stderr.write(`Unknown command "${command}".\n\n${HELP}`);
    return 2;
  }

  const { values } = parseArgs({
    args: rest,
    options: {
      config: { type: "string" },
      source: { type: "string" },
      changelog: { type: "string", multiple: true },
      "tag-pattern": { type: "string" },
      "commit-url": { type: "string" },
      unreleased: { type: "boolean" },
      title: { type: "string" },
      link: { type: "string" },
      limit: { type: "string" },
      out: { type: "string" },
      atom: { type: "string" },
      html: { type: "string" },
      lang: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    process.stdout.write(HELP);
    return 0;
  }
  if (values.source && values.source !== "git" && values.source !== "changelog") {
    process.stderr.write(`--source must be "git" or "changelog".\n`);
    return 2;
  }

  const configPath = resolve(values.config ?? CONFIG_FILE);
  const fileConfig = await loadConfig(configPath);
  if (values.config && !fileConfig) {
    process.stderr.write(`Config file not found: ${values.config}\n`);
    return 2;
  }
  const cwd = fileConfig ? dirname(configPath) : process.cwd();
  const config: DerivativeConfig = { ...fileConfig };
  if (values.source) config.source = values.source as DerivativeConfig["source"];
  if (values.changelog) config.changelog = values.changelog;
  if (values["tag-pattern"]) config.tagPattern = values["tag-pattern"];
  if (values["commit-url"]) config.commitUrl = values["commit-url"];
  if (values.unreleased) config.includeUnreleased = true;
  if (values.title) config.title = values.title;
  if (values.link) config.link = values.link;
  if (values.limit) config.limit = Number.parseInt(values.limit, 10);
  if (values.lang) config.lang = values.lang;
  if (values.out || values.atom || values.html) {
    config.out = {
      json: values.out ?? config.out?.json ?? "public/changelog.json",
      atom: values.atom ?? config.out?.atom,
      html: values.html ?? config.out?.html,
    };
  }

  const feed = await buildFeed(config, cwd);
  const written = await writeOutputs(feed, config, cwd);
  const entries = feed.releases.reduce((sum, r) => sum + r.entries.length, 0);
  process.stdout.write(
    `derivative: ${feed.releases.length} releases, ${entries} entries\n${written
      .map((file) => `  wrote ${relative(process.cwd(), file)}`)
      .join("\n")}\n`,
  );
  if (feed.releases.length === 0) {
    process.stderr.write(
      "No releases found. For git, tag your releases (v1.2.0) and use conventional commits (feat:, fix:).\n",
    );
  }
  return 0;
}
