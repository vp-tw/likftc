import type { IdentityEntry } from "./index.js";
import { ref, type ComputedRef } from "vue";

import { useLikftc, type UseLikftcOptions } from "./vue.js";

interface Item {
  readonly id: string;
  readonly label: string;
}

const items = ref<readonly Item[]>([]);
const options = { getId: (item: Item) => item.id } satisfies UseLikftcOptions<Item, string>;
useLikftc(items, options) satisfies ComputedRef<readonly IdentityEntry<Item, string>[]>;

// @ts-expect-error Vue options must return a supported logical ID.
useLikftc(items, { getId: () => true });
