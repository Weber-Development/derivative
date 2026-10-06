#!/usr/bin/env node
// Release-candidate test: packs the three packages exactly as they would be published, installs
// the tarballs into clean projects and checks them like a user would. Run after `pnpm build`:
//   node scripts/rc-test.mjs [example ...]     (default: smoke vite nextjs sveltekit astro)
import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const work = mkdtempSync(join(tmpdir(), "derivative-rc-"));
const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, stdio: "inherit", env: process.env });

// 1. Pack. pnpm resolves workspace:^ ranges to real versions, like publishing does.
const tarballs = {};
const names = {
  core: "@sweberdev/derivative",
  react: "@sweberdev/derivative-react",
  vue: "@sweberdev/derivative-vue",
};
mkdirSync(join(work, "tarballs"));
for (const [dir, name] of Object.entries(names)) {
  const before = new Set(readdirSync(join(work, "tarballs")));
  run("pnpm", ["pack", "--pack-destination", join(work, "tarballs")], join(root, "packages", dir));
  const file = readdirSync(join(work, "tarballs")).find((f) => !before.has(f));
  if (!file) throw new Error(`No tarball for ${name}`);
  tarballs[name] = join(work, "tarballs", file);
}
const overrides = Object.fromEntries(Object.entries(tarballs).map(([n, f]) => [n, `file:${f}`]));
console.log(`rc-test: packed ${Object.keys(tarballs).length} packages into ${work}`);

// 2. Projects: copy, point the dependencies at the tarballs, install, build.
function project(name, copyFrom) {
  const dir = join(work, name);
  cpSync(copyFrom, dir, {
    recursive: true,
    filter: (s) => !/node_modules|\.next|\.svelte-kit|\.astro|dist$/.test(s),
  });
  const pkgFile = join(dir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgFile, "utf8"));
  for (const section of ["dependencies", "devDependencies"]) {
    for (const n of Object.keys(pkg[section] ?? {}))
      if (overrides[n]) pkg[section][n] = overrides[n];
  }
  pkg.pnpm = { ...pkg.pnpm, overrides };
  writeFileSync(pkgFile, `${JSON.stringify(pkg, null, 2)}\n`);
  return dir;
}

const smoke = join(root, "scripts/rc-smoke");
const wanted = process.argv.slice(2);
const targets = wanted.length ? wanted : ["smoke", "vite", "nextjs", "sveltekit", "astro"];
let failed = false;
for (const target of targets) {
  console.log(`\nrc-test: ${target}`);
  try {
    const dir = project(target, target === "smoke" ? smoke : join(root, "examples", target));
    run("pnpm", ["install", "--ignore-workspace", "--no-frozen-lockfile"], dir);
    run("pnpm", [target === "smoke" ? "test" : "build"], dir);
    console.log(`rc-test: ${target} ok`);
  } catch (error) {
    failed = true;
    console.error(`rc-test: ${target} FAILED: ${error instanceof Error ? error.message : error}`);
  }
}
rmSync(work, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
