import type { IdentityEntry } from "./index.js";
import { writable, type Readable } from "svelte/store";

import { createLikftc, type CreateLikftcOptions } from "./svelte.js";

interface Item {
  readonly id: string;
  readonly label: string;
}

const items = writable<readonly Item[]>([]);
const options = { getId: (item: Item) => item.id } satisfies CreateLikftcOptions<Item, string>;
createLikftc(items, options) satisfies Readable<readonly IdentityEntry<Item, string>[]>;

// @ts-expect-error Svelte options must return a supported logical ID.
createLikftc(items, { getId: () => true });
