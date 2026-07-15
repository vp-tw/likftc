import { signal } from "@angular/core";
import { expect, it } from "vitest";

import { createLikftc } from "./angular.js";

it("preserves identity across Angular signal updates", () => {
  const items = signal<readonly string[]>(["a"]);
  const entries = createLikftc(items, { getId: (item) => item });

  expect(entries()[0]?.key).toBe(0);
  items.set(["a"]);
  expect(entries()[0]?.key).toBe(0);
  items.set([]);
  expect(entries()).toHaveLength(0);
  items.set(["a"]);
  expect(entries()[0]?.key).toBe(1);
});
