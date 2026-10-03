import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const expectedNode = manifest.engines.node;
const expectedPnpm = manifest.engines.pnpm;
const dependencies = manifest.devDependencies;

assert.equal(process.versions.node, expectedNode, `Expected Node ${expectedNode}`);
assert.equal(
  manifest.packageManager,
  `pnpm@${expectedPnpm}`,
  "packageManager must pin pnpm exactly",
);

const result = spawnSync("vp", ["toolchain", "--json"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
assert.equal(result.status, 0, result.stderr || "Unable to inspect Vite+");
const report = JSON.parse(result.stdout);
assert.equal(report.schemaVersion, 1, "Unsupported Vite+ toolchain report schema");
assert.equal(report.source.scope, "local", "Vite+ must resolve the local project toolchain");
assert.equal(report.source.vitePlusVersion, dependencies["vite-plus"]);
const components = new Map(report.nodes.map((node) => [node.id, node.version]));
const coreVersion = components.get("vite-plus-core");
const vitestVersion = components.get("vitest");
assert(coreVersion && vitestVersion, "Vite+ must report its Vite core and Vitest versions");
const bundledDependencies = require("vite-plus/package.json").dependencies;
assert.equal(
  bundledDependencies.vitest,
  vitestVersion,
  "Installed runner must match Vite+ declared bundle",
);
assert.equal(
  bundledDependencies.vite,
  dependencies.vite,
  "Vite alias must match Vite+ declared bundle",
);
assert.equal(dependencies.vite, `npm:@voidzero-dev/vite-plus-core@${coreVersion}`);
for (const name of ["vitest", "@vitest/browser-playwright", "@vitest/coverage-v8"]) {
  assert.equal(dependencies[name], vitestVersion, `${name} must match the Vite+ Vitest version`);
  assert.equal(require(`${name}/package.json`).version, vitestVersion, `${name} installed version`);
}
assert.equal(require("vite/package.json").version, coreVersion, "Installed Vite alias version");
console.log(
  `Verified Node ${expectedNode}, pnpm ${expectedPnpm}, Vite+ ${dependencies["vite-plus"]}, bundled Vite ${components.get("vite")}, and Vitest/providers ${vitestVersion}.`,
);
