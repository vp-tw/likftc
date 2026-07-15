import { expect, it } from "vitest";

import { createLikftc } from "./web.js";

it("commits state only after successful reconciliation", () => {
  const controller = createLikftc<string, string>({ getId: (item) => item });
  const initial = controller.update(["a"]);

  expect(() => controller.update(["a", "a"])).toThrow();
  expect(initial[0]?.key).toBe(0);
  expect(controller.update(["a"])[0]?.key).toBe(0);
});
