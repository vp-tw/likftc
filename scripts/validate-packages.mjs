import assert from "node:assert/strict";
import { mkdir, readFile, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const packageNames = ["likftc"];
const optimizerOnlyExports = new Set(["./qwik"]);
const executableExtension = process.platform === "win32" ? ".cmd" : "";
const budgets = { likftc: 16_000 };
const tarballDirectory = join(root, ".artifacts", "packages");

function run(binary, arguments_) {
  const executable = join(root, "node_modules", ".bin", `${binary}${executableExtension}`);
  const result = spawnSync(executable, arguments_, {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit",
  });
  assert.equal(result.status, 0, `${binary} ${arguments_.join(" ")} failed`);
}

function pack(packageDirectory) {
  const result = spawnSync("pnpm", ["pack", "--pack-destination", tarballDirectory, "--json"], {
    cwd: packageDirectory,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || `pnpm pack failed for ${packageDirectory}`);
  return JSON.parse(result.stdout);
}

await mkdir(tarballDirectory, { recursive: true });

for (const packageName of packageNames) {
  const packageDirectory = join(root, "packages", packageName);
  const manifest = JSON.parse(await readFile(join(packageDirectory, "package.json"), "utf8"));

  assert.equal(manifest.type, "module", `${manifest.name} must remain ESM-only`);
  run("publint", [packageDirectory, "--strict"]);
  run("attw", ["--pack", packageDirectory, "--profile", "esm-only"]);

  if (Object.hasOwn(manifest.exports, "./qwik")) {
    assert.match(
      manifest.peerDependencies?.["@qwik.dev/core"] ?? "",
      /^2\.0\.0-beta\.\d+$/,
      `${manifest.name} must pin an exact Qwik 2 beta peer`,
    );
    assert.equal(
      manifest.peerDependenciesMeta?.["@qwik.dev/core"]?.optional,
      true,
      `${manifest.name} must keep the Qwik peer optional`,
    );
  }

  for (const [exportName, conditions] of Object.entries(manifest.exports)) {
    if (exportName === "./package.json") continue;
    if (optimizerOnlyExports.has(exportName)) {
      console.log(
        `Skipping direct Node import for optimizer-only ${manifest.name}${exportName.slice(1)}.`,
      );
      continue;
    }
    const importPath = typeof conditions === "string" ? conditions : conditions.import;
    assert.equal(
      typeof importPath,
      "string",
      `${manifest.name} ${exportName} needs an import path`,
    );
    await import(pathToFileURL(join(packageDirectory, importPath)).href);
  }

  const packed = pack(packageDirectory);
  const packedBytes = (await stat(packed.filename)).size;
  const budget = budgets[packageName];
  assert.ok(
    packedBytes <= budget,
    `${manifest.name} packed tarball is ${packedBytes} bytes; budget is ${budget}`,
  );
  console.log(`Validated ${manifest.name}: ${packedBytes}/${budget} packed bytes.`);
}
