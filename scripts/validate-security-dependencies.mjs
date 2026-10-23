import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
// Exercise the installed transitive dependencies through their actual parents.
const root = fileURLToPath(new URL("../", import.meta.url));
function load(name) {
  const parents = {
    "shell-quote": "launch-editor",
    seroval: "solid-js",
    sharp: "astro",
    "smol-toml": "astro",
    "source-map-js": "postcss",
    "postcss-selector-parser": "postcss-nested",
  };
  const parent = parents[name];
  const dirs = readdirSync(resolve(root, "node_modules/.pnpm")).filter((x) =>
    x.startsWith(parent + "@"),
  );
  const resolved = new Map(
    dirs.map((dir) => {
      const req = createRequire(
        resolve(root, "node_modules/.pnpm", dir, "node_modules", parent, "package.json"),
      );
      return [req.resolve(name), dir];
    }),
  );
  if (resolved.size !== 1) throw Error(`${parent}: ambiguous ${name} resolutions through ${dirs}`);
  const dir = resolved.values().next().value;
  const req = createRequire(
    resolve(root, "node_modules/.pnpm", dir, "node_modules", parent, "package.json"),
  );
  return {
    module: req(name),
    version: JSON.parse(
      readFileSync(resolve(root, "node_modules/.pnpm", dir, "node_modules", name, "package.json")),
    ).version,
  };
}
(async () => {
  const result = {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    checks: {},
  };
  const q = load("shell-quote");
  const rejection = [];
  for (const newline of ["\n", "\r", "\u2028", "\u2029"]) {
    try {
      q.module.quote(["echo", "ok", { comment: "probe" }, `a${newline}printf LIKFTC_MARKER;#`]);
      rejection.push(false);
    } catch (e) {
      rejection.push(e instanceof TypeError);
    }
  }
  let command, output;
  try {
    command = q.module.quote(["echo", "ok", { comment: "probe" }, "a\nprintf LIKFTC_MARKER;#"]);
    output = spawnSync("/bin/sh", ["-c", command], { encoding: "utf8", timeout: 1000 }).stdout;
  } catch {}
  result.checks.shellQuote = {
    version: q.version,
    rejection,
    command,
    output,
    pass: rejection.every(Boolean),
  };
  const s = load("seroval");
  let calls = 0,
    error;
  const plugin = {
    tag: "likftc-probe",
    test: () => false,
    parse: {},
    serialize: () => "",
    deserialize: () => ({
      then(resolve) {
        calls++;
        resolve("marker");
      },
    }),
  };
  try {
    s.module.fromJSON(
      { t: { t: 12, i: 0, s: 1, f: { t: 25, i: 1, c: plugin.tag, s: {} } }, m: [], f: 63 },
      { plugins: [plugin] },
    );
  } catch (e) {
    error = e.message;
  }
  await new Promise((resolve) => setImmediate(resolve));
  const valid = s.module.fromJSON(await s.module.toJSONAsync(Promise.resolve({ ok: 1 })));
  const validResult = await valid;
  result.checks.seroval = {
    version: s.version,
    calls,
    error,
    validResult,
    pass: !!error && calls === 0 && validResult.ok === 1,
  };
  const sm = load("source-map-js");
  const base = {
    version: 3,
    sources: ["a.js"],
    sourcesContent: ["a"],
    names: [],
    mappings: "AAAA",
  };
  let rejected = false;
  try {
    new sm.module.SourceMapConsumer({
      version: 3,
      sections: [{ offset: { line: 10000001, column: 0 }, map: base }],
    });
  } catch {
    rejected = true;
  }
  const bounded = sm.module.SourceNode.fromStringWithSourceMap(
    "x;\n",
    new sm.module.SourceMapConsumer({
      version: 3,
      sections: [{ offset: { line: 100000, column: 0 }, map: base }],
    }),
  );
  result.checks.sourceMap = {
    version: sm.version,
    rejected,
    children: bounded.children.length,
    codeLength: bounded.toString().length,
    codeMatches: bounded.toString() === "x;\n",
    pass: rejected && bounded.children.length < 10 && bounded.toString() === "x;\n",
  };
  const toml = load("smol-toml");
  const scans = [];
  for (const n of [1000, 2000]) {
    const doc = Array.from({ length: n }, (_, i) => `k${i} = 1\n`).join("");
    let scanned = 0,
      calls = 0;
    const original = String.prototype.indexOf;
    let count;
    try {
      String.prototype.indexOf = function (search, start = 0) {
        if (search === "." && this.length === doc.length) {
          calls++;
          scanned += this.length - start;
        }
        return original.call(this, search, start);
      };
      count = Object.keys(toml.module.parse(doc)).length;
    } finally {
      String.prototype.indexOf = original;
    }
    scans.push({ n, count, scanned, calls });
  }
  result.checks.toml = {
    version: toml.version,
    scans,
    pass: scans.every((x) => x.count === x.n && x.scanned === 0),
  };
  const selector = load("postcss-selector-parser");
  const costs = [];
  for (const n of [1000, 2000]) {
    let work = 0;
    const original = Array.prototype.indexOf;
    let output;
    try {
      Array.prototype.indexOf = function (item, start = 0) {
        if (this.length >= n) work += this.length;
        return original.call(this, item, start);
      };
      output = selector.module().processSync(".a".repeat(n));
    } finally {
      Array.prototype.indexOf = original;
    }
    costs.push({ n, work, identical: output === ".a".repeat(n) });
  }
  result.checks.selector = {
    version: selector.version,
    costs,
    pass: costs.every((x) => x.identical && x.work === 0),
  };
  const sharp = load("sharp");
  const svg = Buffer.from(
    '<svg width="2" height="2"><rect width="2" height="2" fill="red"/></svg>',
  );
  const image = await sharp.module(svg).png().toBuffer({ resolveWithObject: true });
  result.checks.sharp = {
    version: sharp.version,
    versions: sharp.module.versions,
    info: image.info,
    pass:
      sharp.module.versions.rsvg === "2.63.2" && image.info.width === 2 && image.info.height === 2,
    limit:
      "Native library contract and benign SVG decode; not an RCE reproduction. Advisory RCE requires glibc Linux runtime conditions.",
  };
  console.log(JSON.stringify(result, null, 2));
  if (!Object.values(result.checks).every((x) => x.pass)) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
