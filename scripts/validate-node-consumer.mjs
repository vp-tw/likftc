import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const tarballDirectory = new URL(".artifacts/packages/", root);
const tarballNames = (await readdir(tarballDirectory)).filter((name) =>
  /^vp-tw-likftc-\d.*\.tgz$/u.test(name),
);
assert.equal(tarballNames.length, 1, "Expected one stable Likftc tarball");

const temporaryDirectory = await mkdtemp(join(tmpdir(), "likftc-node-consumer-"));
try {
  const manifest = {
    name: "likftc-node-consumer",
    private: true,
    type: "module",
  };
  await writeFile(
    join(temporaryDirectory, "package.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  const tarballPath = new URL(tarballNames[0], tarballDirectory);
  const install = spawnSync(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--omit=optional",
      fileURLToPath(tarballPath),
    ],
    { cwd: temporaryDirectory, encoding: "utf8", stdio: "inherit" },
  );
  assert.equal(install.status, 0, "npm install failed");

  const smokeSource = `
import assert from "node:assert/strict";
import { createIdentityState, reconcile } from "@vp-tw/likftc";
import { createLikftc } from "@vp-tw/likftc/web";

const first = reconcile(createIdentityState(), [{ id: "a" }], {
  getId: (item) => item.id,
});
const absent = reconcile(first.state, [], { getId: (item) => item.id });
const returned = reconcile(absent.state, [{ id: "a" }], {
  getId: (item) => item.id,
});
assert.equal(returned.entries[0]?.key, 1);

const controller = createLikftc({ getId: (item) => item.id });
assert.equal(controller.update([{ id: "a" }])[0]?.key, 0);
assert.throws(() => controller.update([{ id: "a" }, { id: "a" }]));
assert.equal(controller.update([{ id: "a" }])[0]?.key, 0);
`;
  const smokePath = join(temporaryDirectory, "smoke.mjs");
  await writeFile(smokePath, smokeSource.trimStart());
  const smoke = spawnSync(process.execPath, [smokePath], {
    cwd: temporaryDirectory,
    encoding: "utf8",
    stdio: "inherit",
  });
  assert.equal(smoke.status, 0, "Published-shape Node smoke test failed");

  const installedManifest = JSON.parse(
    await readFile(
      join(temporaryDirectory, "node_modules", "@vp-tw", "likftc", "package.json"),
      "utf8",
    ),
  );
  console.log(
    `Validated ${installedManifest.name}@${installedManifest.version} on ${process.version}.`,
  );
} finally {
  await rm(temporaryDirectory, { force: true, recursive: true });
}
