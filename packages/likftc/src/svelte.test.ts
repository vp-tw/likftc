import { writable } from "svelte/store";
import { expect, it } from "vitest";

import type { IdentityEntry } from "./index.js";

import { createLikftc } from "./svelte.js";

it("preserves identity and commits only successful source emissions", () => {
  const items = writable<readonly string[]>(["a"]);
  const entries = createLikftc(items, { getId: (item) => item });
  let latest: readonly IdentityEntry<string, string>[] | undefined;
  const unsubscribe = entries.subscribe((value) => {
    latest = value;
  });

  expect(latest?.[0]?.key).toBe(0);
  expect(() => items.set(["a", "a"])).toThrow();
  expect(latest).toHaveLength(1);
  items.set(["a"]);
  expect(latest?.[0]?.key).toBe(0);

  unsubscribe();
});
