import assert from "node:assert/strict";
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runInNewContext } from "node:vm";

// Exercise normal behavior and nearby errors through the installed consumers.
// Official advisory ranges and the lockfile establish patch coverage separately.
const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(resolve(root, "package.json"));
const docsRequire = createRequire(resolve(root, "apps/docs/package.json"));
const checks = [];
function parentRequire(parent, from = require) {
  return createRequire(from.resolve(parent));
}
function version(from, name) {
  return from(`${name}/package.json`).version;
}

// Solid's SSR resource path invokes seroval's streaming serializer and web plugins.
const { createComponent, createResource, ErrorBoundary, Suspense } = require("solid-js");
const { renderToStringAsync } = require("solid-js/web");
const html = await renderToStringAsync(() => {
  const [data] = createResource(() =>
    Promise.resolve({
      label: "Likftc resource",
      url: new URL("https://example.test/guide"),
      bytes: new Uint8Array([1, 2, 3]),
    }),
  );
  return createComponent(Suspense, {
    get children() {
      return data()?.label;
    },
  });
});
assert.match(html, /^Likftc resource<script>/u);
const registry = {};
const hydration = { _$HY: { r: registry }, URL, atob };
hydration.self = hydration;
// Execute only this test's generated hydration artifact; no browser is needed.
for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/gu)) {
  runInNewContext(match[1], hydration, { timeout: 1_000 });
}
const restored = (await Promise.all(Object.values(registry))).find(
  (value) => value?.label === "Likftc resource",
);
assert(restored, "Solid must emit recoverable resource data");
assert.equal(restored.url.href, "https://example.test/guide");
assert.deepEqual(Array.from(restored.bytes), [1, 2, 3]);
const failedHtml = await renderToStringAsync(() =>
  createComponent(ErrorBoundary, {
    fallback: (error) => `Resource error: ${error.message}`,
    get children() {
      const [data] = createResource(() => Promise.reject(new Error("resource unavailable")));
      return createComponent(Suspense, {
        get children() {
          return data()?.label;
        },
      });
    },
  }),
);
assert.match(failedHtml, /^Resource error: resource unavailable<script>/u);
checks.push({
  consumer: "Solid SSR resource hydration and ErrorBoundary",
  dependency: "seroval",
  version: version(parentRequire("solid-js"), "seroval"),
});

// Both Astro config and Starlight's sitemap integration consume Zod.
const { validateConfig } = await import(pathToFileURL(docsRequire.resolve("astro/config")));
const config = await validateConfig(
  { site: "https://vp-tw.github.io", base: "/likftc" },
  resolve(root, "apps/docs"),
  "build",
);
assert.equal(config.site, "https://vp-tw.github.io");
assert.equal(config.base, "/likftc");
await assert.rejects(
  validateConfig({ site: 42 }, resolve(root, "apps/docs"), "build"),
  (error) => error.name === "ZodError" && error.issues.some((issue) => issue.path[0] === "site"),
);
// Starlight is import-only and does not export its manifest. Anchor resolution
// at its real installed manifest rather than assume a CommonJS export exists.
const starlightRequire = createRequire(
  realpathSync(resolve(root, "apps/docs/node_modules/@astrojs/starlight/package.json")),
);
const sitemapEntry = starlightRequire.resolve("@astrojs/sitemap");
const { validateOptions } = await import(
  pathToFileURL(resolve(dirname(sitemapEntry), "validate-options.js"))
);
const sitemap = validateOptions(config.site, { customPages: ["https://vp-tw.github.io/likftc/"] });
assert.deepEqual(sitemap.customPages, ["https://vp-tw.github.io/likftc/"]);
assert.throws(
  () => validateOptions(config.site, { customPages: ["invalid-url"] }),
  (error) =>
    error.name === "ZodError" && error.issues.some((issue) => issue.path[0] === "customPages"),
);
for (const [consumer, from] of [
  ["Astro config", parentRequire("astro/config", docsRequire)],
  ["Starlight sitemap options", createRequire(sitemapEntry)],
])
  checks.push({ consumer, dependency: "zod", version: version(from, "zod") });

// Astro check -> language server -> YAML service -> Ajv -> fast-uri. Resolving
// a relative schema reference exercises URI handling; an invalid schema must
// still produce the service's diagnostic instead of silently succeeding.
const checkRequire = parentRequire("@astrojs/check", docsRequire);
const languageRequire = parentRequire("@astrojs/language-server", checkRequire);
const volarRequire = parentRequire("volar-service-yaml", languageRequire);
const yamlRequire = createRequire(volarRequire.resolve("yaml-language-server/package.json"));
const { YAMLSchemaService } = yamlRequire(
  "./lib/umd/languageservice/services/yamlSchemaService.js",
);
const schemas = new Map([
  [
    "https://example.test/root.json",
    {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: { name: { $ref: "./names.json#/definitions/name" } },
    },
  ],
  ["https://example.test/names.json", { definitions: { name: { type: "string" } } }],
  [
    "https://example.test/invalid.json",
    {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: 42,
    },
  ],
]);
const requests = [];
const service = new YAMLSchemaService(
  async (uri) => {
    requests.push(uri);
    assert(schemas.has(uri), `Unexpected schema request: ${uri}`);
    return JSON.stringify(schemas.get(uri));
  },
  { resolveRelativePath: (reference, base) => new URL(reference, base).href },
);
for (const uri of ["https://example.test/root.json", "https://example.test/invalid.json"]) {
  service.registerExternalSchema(uri);
}
const resolved = await service.getResolvedSchema("https://example.test/root.json");
assert.deepEqual(resolved.errors, []);
assert.equal(resolved.schema.properties.name.type, "string");
assert(requests.includes("https://example.test/names.json"));
const invalid = await service.getResolvedSchema("https://example.test/invalid.json");
assert(invalid.errors.some((error) => /not valid/u.test(error)));
checks.push({
  consumer: "Astro check YAML schema resolution and invalid-schema diagnostic",
  dependency: "fast-uri",
  version: version(parentRequire("ajv", yamlRequire), "fast-uri"),
});

// Retain bounded ordinary coverage for the previously patched dependencies.
const quote = parentRequire("launch-editor", parentRequire("@changesets/cli"))("shell-quote");
const words = ["echo", "two words", "it's quoted"];
assert.deepEqual(quote.parse(quote.quote(words)), words);
assert.throws(() => quote.parse("${"), /Bad substitution/u);
const sourceMap = parentRequire("postcss", parentRequire("vite"))("source-map-js");
const map = { version: 3, sources: ["a.js"], names: [], mappings: "AAAA" };
const source = sourceMap.SourceNode.fromStringWithSourceMap(
  "x;\n",
  new sourceMap.SourceMapConsumer(map),
);
assert.equal(source.toString(), "x;\n");
assert.throws(() => new sourceMap.SourceMapConsumer({ ...map, version: 4 }), /version/iu);
const astroRequire = parentRequire("astro/config", docsRequire);
const toml = astroRequire("smol-toml");
assert.equal(toml.parse('title = "Likftc"\n[limits]\ncount = 3').limits.count, 3);
assert.throws(
  () => toml.parse('title = "first"\ntitle = "second"'),
  (error) => error instanceof toml.TomlError && error.line === 2,
);
const nestedRequire = createRequire(
  realpathSync(resolve(root, "node_modules/.pnpm/node_modules/postcss-nested/package.json")),
);
const selector = nestedRequire("postcss-selector-parser");
assert.equal(selector().processSync("main > .item:hover"), "main > .item:hover");
assert.throws(() => selector().processSync(".item["));
const sharp = astroRequire("sharp");
const image = await sharp(
  Buffer.from('<svg width="2" height="2"><rect width="2" height="2" fill="red"/></svg>'),
)
  .png()
  .toBuffer({ resolveWithObject: true });
assert.equal(image.info.width, 2);
assert.equal(image.info.height, 2);
assert.equal(sharp.versions.rsvg, "2.63.2");
await assert.rejects(sharp(Buffer.from("invalid image")).png().toBuffer(), /unsupported/iu);
console.log(JSON.stringify({ node: process.version, platform: process.platform, checks }, null, 2));
console.log("Normal parent-consumer and nearby error checks passed; no exploit probes ran.");
