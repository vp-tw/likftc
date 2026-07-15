import type { IdentityState, ReconcileResult } from "./index.js";

import { createLikftc, type CreateLikftcOptions, type LikftcController } from "./web.js";

interface Item {
  readonly id: string;
  readonly label: string;
}

const options = { getId: (item: Item) => item.id } satisfies CreateLikftcOptions<Item, string>;
const controller = createLikftc(options) satisfies LikftcController<Item, string>;
controller.state() satisfies IdentityState<string>;
controller.update([]) satisfies ReconcileResult<Item, string>;

// @ts-expect-error Web options must return a supported logical ID.
createLikftc<Item, string>({ getId: () => true });
