import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const packageNames = ["likftc"];
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
  name: "likftc-minimum-compatibility-fixture",
  private: true,
  type: "module",
  packageManager: "pnpm@11.12.0",
  dependencies: {
    ...localPackages,
    "@angular/common": "20.0.0",
    "@angular/compiler": "20.0.0",
    "@angular/core": "20.0.0",
    "@angular/platform-browser": "20.0.0",
    "@types/react": "18.3.31",
    "@types/react-dom": "18.3.7",
    preact: "10.29.0",
    react: "18.3.1",
    "react-dom": "18.3.1",
    rxjs: "7.8.2",
    "solid-js": "1.9.0",
    svelte: "5.0.0",
    tslib: "2.8.1",
    vue: "3.4.0",
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
runLocal("vite", ["build"], fixtureDirectory);

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
      `Minimum fixture did not report a result.\nPage errors:\n${pageErrors.join("\n")}\nConsole errors:\n${consoleErrors.join("\n")}\n${String(error)}`,
    );
  }
  const result = await page.evaluate(() => window.__LIKFTC_COMPATIBILITY__);

  assert.deepEqual(pageErrors, [], `Minimum compatibility page errors:\n${pageErrors.join("\n")}`);
  assert(result?.ok, result?.error ?? "Minimum compatibility fixture failed without an error.");
  assert.equal(result.adapters.length, 8, "Not every stable compatibility target ran.");
  console.log(`Minimum compatibility passed: ${result.adapters.join(", ")}.`);
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
  assert.equal(result.status, 0, `${binary} ${arguments_.join(" ")} failed`);
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
