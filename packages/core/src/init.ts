import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DerivativeConfig } from "./node";

const CONFIG_FILE = "derivative.config.json";

export interface InitResult {
  config: DerivativeConfig;
  /** Files written or changed, relative to `cwd`. */
  changed: string[];
  /** Why a step was skipped, for the CLI output. */
  notes: string[];
}

const has = (path: string) =>
  access(path).then(
    () => true,
    () => false,
  );

/** Picks a source and an output folder for the project in `cwd`. */
export async function detectConfig(cwd: string): Promise<DerivativeConfig> {
  const config: DerivativeConfig = {};
  if (await has(join(cwd, "CHANGELOG.md"))) config.source = "changelog";
  else if (await has(join(cwd, ".changeset"))) {
    config.source = "changelog";
    config.changelog = "CHANGELOG.md";
  } else config.source = "git";
  // Vite, Next.js, Astro and most others serve `public/`; SvelteKit serves `static/`.
  const dir =
    (await has(join(cwd, "static"))) && !(await has(join(cwd, "public"))) ? "static" : "public";
  config.out = { json: `${dir}/changelog.json`, atom: `${dir}/changelog.xml` };
  return config;
}

/**
 * Writes `derivative.config.json` and runs `derivative build` before the project's `build`
 * script. Never overwrites an existing config or touches a build script that already runs it.
 */
export async function init(
  cwd = process.cwd(),
  options: { scripts?: boolean } = {},
): Promise<InitResult> {
  const result: InitResult = { config: await detectConfig(cwd), changed: [], notes: [] };
  const configPath = join(cwd, CONFIG_FILE);
  if (await has(configPath)) {
    result.notes.push(`${CONFIG_FILE} already exists, left as is.`);
  } else {
    await writeFile(configPath, `${JSON.stringify(result.config, null, 2)}\n`);
    result.changed.push(CONFIG_FILE);
  }

  if (options.scripts === false) return result;
  const pkgPath = join(cwd, "package.json");
  let raw: string;
  try {
    raw = await readFile(pkgPath, "utf8");
  } catch {
    result.notes.push("No package.json, add `derivative build` to your build yourself.");
    return result;
  }
  const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };
  pkg.scripts ??= {};
  const scripts = pkg.scripts;
  const build = scripts.build;
  if (build?.includes("derivative build")) {
    result.notes.push("The build script already runs derivative build.");
    return result;
  }
  scripts.changelog = "derivative build";
  scripts.build = build ? `derivative build && ${build}` : "derivative build";
  const indent = /^(\s+)"/m.exec(raw)?.[1] ?? "  ";
  await writeFile(pkgPath, `${JSON.stringify(pkg, null, indent)}\n`);
  result.changed.push("package.json");
  return result;
}
