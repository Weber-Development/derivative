import { dirname, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  buildFeed,
  CONFIG_FILE,
  type DerivativeConfig,
  init,
  loadConfig,
  writeOutputs,
} from "./node";

const HELP = `derivative init [--no-scripts]
derivative build [options]

init writes ${CONFIG_FILE} for this project and runs derivative build before
your build script (--no-scripts leaves package.json alone).

build writes changelog.json (and optionally an Atom feed, a JSON Feed and an
HTML page) from CHANGELOG.md files, conventional commits or GitHub Releases.

Options:
  --config <file>       Config file (default: ${CONFIG_FILE} if present)
  --source <kind>       changelog | git | github
  --repo <owner/name>   github: repository to read releases from
  --prereleases         github: include pre-releases
  --changelog <file>    CHANGELOG.md path, repeat for monorepos
  --tag-pattern <re>    git: only tags matching this start a release
  --commit-url <url>    git: commit link template, {hash} is replaced
  --unreleased          include unreleased changes
  --title <text>        feed title
  --link <url>          public URL of the full changelog
  --limit <n>           keep the newest n releases
  --out <file>          changelog.json path (default: public/changelog.json)
  --atom <file>         also write an Atom feed
  --json-feed <file>    also write a JSON Feed 1.1
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
  if (command === "init") {
    const { values } = parseArgs({ args: rest, options: { "no-scripts": { type: "boolean" } } });
    const result = await init(process.cwd(), { scripts: !values["no-scripts"] });
    const lines = [
      `derivative: source "${result.config.source}", feed at ${result.config.out?.json}`,
      ...result.changed.map((file) => `  wrote ${file}`),
      ...result.notes.map((note) => `  ${note}`),
      'Next: embed <derivative-widget src="/changelog.json"> and run your build.',
    ];
    process.stdout.write(`${lines.join("\n")}\n`);
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
      repo: { type: "string" },
      prereleases: { type: "boolean" },
      changelog: { type: "string", multiple: true },
      "tag-pattern": { type: "string" },
      "commit-url": { type: "string" },
      unreleased: { type: "boolean" },
      title: { type: "string" },
      link: { type: "string" },
      limit: { type: "string" },
      out: { type: "string" },
      atom: { type: "string" },
      "json-feed": { type: "string" },
      html: { type: "string" },
      lang: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    process.stdout.write(HELP);
    return 0;
  }
  if (values.source && !["git", "changelog", "github"].includes(values.source)) {
    process.stderr.write(`--source must be "changelog", "git" or "github".\n`);
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
  if (values.repo) config.repo = values.repo;
  if (values.prereleases) config.includePrereleases = true;
  if (values.changelog) config.changelog = values.changelog;
  if (values["tag-pattern"]) config.tagPattern = values["tag-pattern"];
  if (values["commit-url"]) config.commitUrl = values["commit-url"];
  if (values.unreleased) config.includeUnreleased = true;
  if (values.title) config.title = values.title;
  if (values.link) config.link = values.link;
  if (values.limit) config.limit = Number.parseInt(values.limit, 10);
  if (values.lang) config.lang = values.lang;
  if (values.out || values.atom || values.html || values["json-feed"]) {
    config.out = {
      json: values.out ?? config.out?.json ?? "public/changelog.json",
      atom: values.atom ?? config.out?.atom,
      html: values.html ?? config.out?.html,
      jsonFeed: values["json-feed"] ?? config.out?.jsonFeed,
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
