import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const packageNames = ["likftc"];
const workspaceManifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const libraryManifest = JSON.parse(
  await readFile(join(root, "packages", "likftc", "package.json"), "utf8"),
);
const runDirectory = join(
  root,
  ".artifacts",
  "compatibility",
  new Date().toISOString().replaceAll(":", "-"),
);
const fixtureDirectory = join(runDirectory, "fixture");
const tarballDirectory = join(runDirectory, "tarballs");
const executableExtension = process.platform === "win32" ? ".cmd" : "";

await mkdir(tarballDirectory, { recursive: true });
await cp(join(root, "fixtures", "minimum"), fixtureDirectory, { recursive: true });

const localPackages = {};
for (const packageName of packageNames) {
  const packageDirectory = join(root, "packages", packageName);
  runLocal("vp", ["pack"], packageDirectory);
  const packed = runPnpm(
    ["pack", "--pack-destination", tarballDirectory, "--json"],
    packageDirectory,
    {
      capture: true,
    },
  );
  const metadata = JSON.parse(packed.stdout);
  localPackages[metadata.name] = `file:${metadata.filename}`;
}

const manifest = {
  name: "likftc-current-compatibility-fixture",
  private: true,
  type: "module",
  packageManager: "pnpm@11.12.0",
  dependencies: {
    ...localPackages,
    "@angular/common": workspaceManifest.devDependencies["@angular/common"],
    "@angular/compiler": workspaceManifest.devDependencies["@angular/compiler"],
    "@angular/core": workspaceManifest.devDependencies["@angular/core"],
    "@angular/platform-browser": workspaceManifest.devDependencies["@angular/platform-browser"],
    "@types/react": libraryManifest.devDependencies["@types/react"],
    "@types/react-dom": libraryManifest.devDependencies["@types/react-dom"],
    preact: workspaceManifest.devDependencies["preact"],
    react: workspaceManifest.devDependencies["react"],
    "react-dom": workspaceManifest.devDependencies["react-dom"],
    rxjs: workspaceManifest.devDependencies["rxjs"],
    "solid-js": workspaceManifest.devDependencies["solid-js"],
    svelte: workspaceManifest.devDependencies["svelte"],
    tslib: libraryManifest.devDependencies["tslib"],
    vue: workspaceManifest.devDependencies["vue"],
  },
};
await writeFile(join(fixtureDirectory, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(join(fixtureDirectory, "pnpm-workspace.yaml"), 'packages:\n  - "."\n');

runPnpm(
  [
    "install",
    "--ignore-scripts",
    "--no-frozen-lockfile",
    "--config.minimum-release-age=1440",
    "--config.save-exact=true",
    "--config.strict-peer-dependencies=true",
  ],
  fixtureDirectory,
);
runLocal("tsc", ["--noEmit", "-p", join(fixtureDirectory, "tsconfig.json")], fixtureDirectory);
runLocal("vp", ["build"], fixtureDirectory);

const outputDirectory = join(fixtureDirectory, "dist");
const server = createFixtureServer(outputDirectory);
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const address = server.address();
assert(address !== null && typeof address !== "string", "Compatibility server did not bind.");

let browser;
try {
  browser = await chromium.launch(
    process.platform === "darwin" ? { channel: "chrome", headless: true } : { headless: true },
  );
  const page = await browser.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.stack ?? error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto(`http://127.0.0.1:${address.port}/`);
  try {
    await page.waitForFunction(() => window.__LIKFTC_COMPATIBILITY__ !== undefined, undefined, {
      timeout: 15_000,
    });
  } catch (error) {
    assert.fail(
      `Current fixture did not report a result.\nPage errors:\n${pageErrors.join("\n")}\nConsole errors:\n${consoleErrors.join("\n")}\n${String(error)}`,
    );
  }
  const result = await page.evaluate(() => window.__LIKFTC_COMPATIBILITY__);

  assert.deepEqual(pageErrors, [], `Current compatibility page errors:\n${pageErrors.join("\n")}`);
  assert(result?.ok, result?.error ?? "Current compatibility fixture failed without an error.");
  assert.equal(result.adapters.length, 8, "Not every stable compatibility target ran.");
  console.log(`Current compatibility passed: ${result.adapters.join(", ")}.`);
  console.log(`Evidence: ${relative(root, runDirectory)}`);
} finally {
  await browser?.close();
  await new Promise((resolve, reject) =>
    server.close((error) => (error === undefined ? resolve() : reject(error))),
  );
}

function runLocal(binary, arguments_, cwd) {
  const executable = join(root, "node_modules", ".bin", `${binary}${executableExtension}`);
  const result = spawnSync(executable, arguments_, { cwd, encoding: "utf8", stdio: "inherit" });
  const failure = result.error?.stack ?? result.signal ?? "non-zero exit status";
  assert.equal(result.status, 0, `${binary} ${arguments_.join(" ")} failed: ${failure}`);
}

function runPnpm(arguments_, cwd, options = {}) {
  const result = spawnSync("pnpm", arguments_, {
    cwd,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });
  assert.equal(result.status, 0, result.stderr || `pnpm ${arguments_.join(" ")} failed`);
  return result;
}

function createFixtureServer(outputDirectory) {
  return createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
      const requestedFile = pathname === "/" ? "index.html" : pathname.slice(1);
      const file = normalize(join(outputDirectory, requestedFile));
      assert(relative(outputDirectory, file).startsWith("..") === false, "Invalid fixture path.");
      const body = await readFile(file);
      response.writeHead(200, { "content-type": contentType(file) });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });
}

function contentType(file) {
  switch (extname(file)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}
