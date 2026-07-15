import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readlinkSync } from "node:fs";
import { dirname, isAbsolute, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

if (process.env["CI"] !== "true" || process.platform === "win32") {
  console.log("Skipping process audit outside CI or on Windows.");
  process.exit(0);
}

const result = spawnSync("ps", ["-eo", "pid=,ppid=,command="], { encoding: "utf8" });
assert.equal(result.status, 0, result.stderr || "Unable to inspect child processes");
const root = dirname(dirname(fileURLToPath(import.meta.url)));

const suspicious = [
  /oxlint-tsgolint/u,
  /scripts\/validate-docs\.mjs/u,
  /(?:^|\s)(?:\S*\/)?astro\s+(?:dev|preview)(?:\s|$)/u,
  /(?:^|\s)(?:\S*\/)?vite\s+(?:dev|preview)(?:\s|$)/u,
  /playwright.*(?:run-driver|launch)/u,
  /(?:chrome|chromium|firefox|webkit).*--headless/u,
  /(?:^|\s)(?:\S*\/)?(?:ngc|svelte-check|tsc)(?:\s|$)/u,
  /(?:^|\s)(?:\S*\/)?(?:npm|pnpm|vp)\s/u,
];
const currentPid = process.pid;
const processParents = new Map(
  result.stdout.split("\n").flatMap((line) => {
    const match = line.trimStart().match(/^(\d+)\s+(\d+)\s/u);
    return match === null ? [] : [[Number(match[1]), Number(match[2])]];
  }),
);
const ancestorPids = new Set([currentPid]);
let ancestorPid = processParents.get(currentPid);
while (ancestorPid !== undefined && ancestorPid > 0 && !ancestorPids.has(ancestorPid)) {
  ancestorPids.add(ancestorPid);
  ancestorPid = processParents.get(ancestorPid);
}

function isWorkspaceProcess(line) {
  const pid = line.trimStart().match(/^\d+/u)?.[0];
  if (pid === undefined) return false;

  let cwd;
  if (process.platform === "linux") {
    try {
      cwd = readlinkSync(join("/proc", pid, "cwd"));
    } catch {
      return false;
    }
  } else {
    const lsof = spawnSync("lsof", ["-a", "-p", pid, "-d", "cwd", "-Fn"], {
      encoding: "utf8",
    });
    cwd = lsof.stdout
      .split("\n")
      .find((entry) => entry.startsWith("n"))
      ?.slice(1);
    if (cwd === undefined) return false;
  }

  const workspaceRelativePath = relative(root, cwd);
  return (
    workspaceRelativePath === "" ||
    (!isAbsolute(workspaceRelativePath) && !workspaceRelativePath.startsWith(".."))
  );
}

const leftovers = result.stdout
  .split("\n")
  .filter((line) => line.trim() !== "")
  .filter((line) => {
    const pid = Number(line.trimStart().match(/^\d+/u)?.[0]);
    return !ancestorPids.has(pid);
  })
  .filter((line) => suspicious.some((pattern) => pattern.test(line)))
  .filter((line) => process.env["GITHUB_ACTIONS"] === "true" || isWorkspaceProcess(line));

assert.deepEqual(leftovers, [], `CI left child processes running:\n${leftovers.join("\n")}`);
console.log("Process teardown audit passed.");
