import { expect, it } from "vitest";

import { createLikftc } from "./web.js";

it("commits state only after successful reconciliation", () => {
  const controller = createLikftc<string, string>({ getId: (item) => item });
  const initial = controller.update(["a"]);

  expect(() => controller.update(["a", "a"])).toThrow();
  expect(controller.state()).toBe(initial.state);
  expect(controller.update(["a"]).entries[0]?.key).toBe(0);
});
