import { createApp, defineComponent, h, nextTick, ref, type PropType } from "vue";

import {
  runIdentityConformance,
  type ExitingIdentity,
  type IdentityHarness,
} from "../../../test/browser-conformance.js";
import { useLikftc } from "./vue.js";

interface VisibleRow {
  readonly id: string;
  readonly key: number;
  readonly phase: "current" | "exiting";
}

const Row = defineComponent({
  name: "TestRow",
  props: {
    id: { type: String, required: true },
    identityKey: { type: Number, required: true },
    phase: { type: String as PropType<VisibleRow["phase"]>, required: true },
  },
  setup: (props) => () =>
    h(
      "li",
      {
        "data-id": props.id,
        "data-identity-key": props.identityKey,
        "data-phase": props.phase,
      },
      props.id,
    ),
});

async function createVueHarness(initialItems: readonly string[]): Promise<IdentityHarness> {
  const container = document.createElement("div");
  document.body.append(container);
  const items = ref(initialItems);
  const exiting = ref<readonly ExitingIdentity[]>([]);
  const app = createApp(
    defineComponent({
      name: "TestHarness",
      setup() {
        const entries = useLikftc(items, { getId: (item) => item });
        return () => {
          const rows: readonly VisibleRow[] = [
            ...exiting.value.map((entry) => ({ ...entry, phase: "exiting" as const })),
            ...entries.value.map((entry) => ({
              id: entry.id,
              key: entry.key,
              phase: "current" as const,
            })),
          ];
          return h(
            "ul",
            rows.map((row) =>
              h(Row, {
                id: row.id,
                identityKey: row.key,
                key: row.key,
                phase: row.phase,
              }),
            ),
          );
        };
      },
    }),
  );
  app.mount(container);
  await nextTick();

  return {
    root: container,
    dispose: () => {
      app.unmount();
      container.remove();
    },
    update: async (nextItems, nextExiting = []) => {
      exiting.value = nextExiting;
      items.value = nextItems;
      await nextTick();
    },
  };
}

runIdentityConformance("Vue", createVueHarness);
