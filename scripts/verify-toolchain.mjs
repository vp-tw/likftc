import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const expectedNode = manifest.engines.node;
const expectedPnpm = manifest.engines.pnpm;
const expectedVitePlus = manifest.devDependencies["vite-plus"];

assert.equal(process.versions.node, expectedNode, `Expected Node ${expectedNode}`);
assert.equal(
  manifest.packageManager,
  `pnpm@${expectedPnpm}`,
  "packageManager must pin pnpm exactly",
);

const result = spawnSync("vp", ["--version"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

assert.equal(result.status, 0, result.stderr || "Unable to inspect Vite+");

const report = `${result.stdout}\n${result.stderr}`;

assert.match(
  report,
  new RegExp(`Local vite-plus:\\s+vite-plus\\s+v${expectedVitePlus.replaceAll(".", "\\.")}`),
);

console.log(
  `Verified Node ${expectedNode}, the pnpm ${expectedPnpm} project pin, and Vite+ ${expectedVitePlus}.`,
);
