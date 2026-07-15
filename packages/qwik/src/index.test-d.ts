import type { IdentityEntry } from "@vp-tw/likftc";

import { useLikftc, type UseLikftcOptions } from "./index.js";

interface Item {
  readonly id: string;
  readonly label: string;
}

const options = { getId: (item: Item) => item.id } satisfies UseLikftcOptions<Item, string>;
useLikftc([] as readonly Item[], options) satisfies readonly IdentityEntry<Item, string>[];

// @ts-expect-error Qwik options must return a supported logical ID.
useLikftc([] as readonly Item[], { getId: () => true });
