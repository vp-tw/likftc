import { nanoid } from "nanoid";

export interface DemoItem {
  readonly id: string;
  readonly label: string;
}

export interface DemoFrameDefinition {
  readonly description: string;
  readonly items: readonly DemoItem[];
}

export interface DemoRetainedExit {
  readonly expiresAt: number;
  readonly item: DemoItem;
  readonly key: number;
  readonly slot: number;
}

export interface DemoFrameState {
  readonly enteringIds: readonly string[];
  readonly items: readonly DemoItem[];
  readonly retainedExits: readonly DemoRetainedExit[];
}

export type DemoRowKind = "collision" | "current" | "entering" | "exiting";

export interface DemoRenderedRow {
  readonly item: DemoItem;
  readonly key: number | string;
  readonly keyText: string;
  readonly kind: DemoRowKind;
  readonly slot: number;
}

export interface DemoExitingItem {
  readonly item: DemoItem;
  readonly slot: number;
}

export interface DemoFrameDelta {
  readonly enteringIds: readonly string[];
  readonly exitingItems: readonly DemoExitingItem[];
}

const demoKeyByTransitionKey = new Map<number, string>();
const transitionKeyByDemoKey = new Map<string, number>();

function createDemoKey(): string {
  let key: string;
  do key = nanoid(8);
  while (transitionKeyByDemoKey.has(key));
  return key;
}

function toDemoKey(transitionKey: number): string {
  const existing = demoKeyByTransitionKey.get(transitionKey);
  if (existing !== undefined) return existing;
  const key = createDemoKey();
  demoKeyByTransitionKey.set(transitionKey, key);
  transitionKeyByDemoKey.set(key, transitionKey);
  return key;
}

export function readDemoTransitionKey(keyText: string | undefined): number {
  if (!keyText?.startsWith("k:")) throw new Error(`Invalid demo transition key: ${keyText}`);
  const transitionKey = transitionKeyByDemoKey.get(keyText.slice(2));
  if (transitionKey === undefined) throw new Error(`Unknown demo transition key: ${keyText}`);
  return transitionKey;
}

const itemA = { id: "a", label: "Aurora" } as const;
const itemB = { id: "b", label: "Brass" } as const;
const itemC = { id: "c", label: "Cinder" } as const;
const itemD = { id: "d", label: "Drift" } as const;

export const demoFrames = [
  {
    description: "A, B, C",
    items: [itemA, itemB, itemC],
  },
  {
    description: "D enters; A and B move down",
    items: [itemD, itemA, itemB],
  },
  {
    description: "C returns while its exit is still running",
    items: [itemC, itemD, itemA],
  },
  {
    description: "B returns while its exit is still running",
    items: [itemB, itemC, itemD],
  },
] as const satisfies readonly [DemoFrameDefinition, ...DemoFrameDefinition[]];

export function createFrameState(
  definition: DemoFrameDefinition,
  retainedExits: readonly DemoRetainedExit[] = [],
  enteringIds: readonly string[] = [],
): DemoFrameState {
  return { enteringIds, items: definition.items, retainedExits };
}

export function findFrameDelta(
  previous: DemoFrameDefinition,
  current: DemoFrameDefinition,
): DemoFrameDelta {
  const currentIds = new Set(current.items.map((item) => item.id));
  const previousIds = new Set(previous.items.map((item) => item.id));
  return {
    enteringIds: current.items.filter((item) => !previousIds.has(item.id)).map((item) => item.id),
    exitingItems: previous.items.flatMap((item, slot) =>
      currentIds.has(item.id) ? [] : [{ item, slot }],
    ),
  };
}

export function createBeforeRows(state: DemoFrameState): readonly DemoRenderedRow[] {
  const currentIds = new Set(state.items.map((item) => item.id));
  const enteringIds = new Set(state.enteringIds);
  const latestExitById = new Map<string, DemoRetainedExit>();
  for (const exit of state.retainedExits) latestExitById.set(exit.item.id, exit);
  const retained = Array.from(latestExitById.values()).flatMap((exit) =>
    currentIds.has(exit.item.id)
      ? []
      : [
          {
            item: exit.item,
            key: `id:${exit.item.id}`,
            keyText: `id:${exit.item.id}`,
            kind: "exiting" as const,
            slot: exit.slot,
          },
        ],
  );
  return [
    ...retained,
    ...state.items.map((item, slot) => {
      const isEntering = enteringIds.has(item.id);
      return {
        item,
        key: `id:${item.id}`,
        keyText: `id:${item.id}`,
        kind:
          isEntering && latestExitById.has(item.id)
            ? ("collision" as const)
            : isEntering
              ? ("entering" as const)
              : ("current" as const),
        slot,
      };
    }),
  ];
}

export function createAfterRows(
  state: DemoFrameState,
  entries: readonly { readonly item: DemoItem; readonly key: number }[],
): readonly DemoRenderedRow[] {
  const enteringIds = new Set(state.enteringIds);
  const retained = state.retainedExits.map((exit) => {
    const key = toDemoKey(exit.key);
    return {
      item: exit.item,
      key,
      keyText: `k:${key}`,
      kind: "exiting" as const,
      slot: exit.slot,
    };
  });
  return [
    ...retained,
    ...entries.map((entry, slot) => {
      const key = toDemoKey(entry.key);
      return {
        item: entry.item,
        key,
        keyText: `k:${key}`,
        kind: enteringIds.has(entry.item.id) ? ("entering" as const) : ("current" as const),
        slot,
      };
    }),
  ];
}

export function describeRow(kind: DemoRowKind): string {
  switch (kind) {
    case "collision":
      return "exit DOM reused · jumps here";
    case "entering":
      return "new DOM · old exit stays";
    case "exiting":
      return "exit animation in progress";
    case "current":
      return "stable presence";
    default:
      kind satisfies never;
      throw new Error(`Unhandled row kind: ${String(kind)}`);
  }
}
