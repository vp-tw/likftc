import type { IdentityEntry } from "./index.js";
import { createSignal, type Accessor } from "solid-js";

import { createLikftc, type CreateLikftcOptions, type LikftcController } from "./solid.js";

interface Item {
  readonly id: string;
  readonly label: string;
}

const [items] = createSignal<readonly Item[]>([]);
const options = { getId: (item: Item) => item.id } satisfies CreateLikftcOptions<Item, string>;
const controller = createLikftc(items, options) satisfies LikftcController<Item, string>;
controller.entries satisfies Accessor<readonly IdentityEntry<Item, string>[]>;
controller.keys satisfies Accessor<readonly number[]>;
controller.entry(0) satisfies Accessor<IdentityEntry<Item, string> | undefined>;

// @ts-expect-error Solid options must return a supported logical ID.
createLikftc(items, { getId: () => true });
