import { signal, type Signal } from "@angular/core";
import type { IdentityEntry } from "./index.js";

import { createLikftc, type CreateLikftcOptions } from "./angular.js";

interface Item {
  readonly id: string;
  readonly label: string;
}

const items = signal<readonly Item[]>([]);
const options = { getId: (item: Item) => item.id } satisfies CreateLikftcOptions<Item, string>;
createLikftc(items, options) satisfies Signal<readonly IdentityEntry<Item, string>[]>;

// @ts-expect-error Angular options must return a supported logical ID.
createLikftc(items, { getId: () => true });
