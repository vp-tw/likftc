import {
  createIdentityState,
  reconcile,
  type IdentityEntry,
  type IdentityState,
  type LifecycleEvent,
  type LogicalId,
} from "./index.js";

const result = reconcile(createIdentityState<string>(), [{ id: "a", value: 1 }], {
  getId: (item) => item.id,
});

result.entries satisfies readonly IdentityEntry<{ id: string; value: number }, string>[];
result.events satisfies readonly LifecycleEvent<string>[];
"a" satisfies LogicalId;
1 satisfies LogicalId;

// @ts-expect-error Identity state is opaque and must come from createIdentityState.
const structuralState: IdentityState<string> = { active: [], nextKey: 0 };
void structuralState;

// @ts-expect-error Boolean logical IDs are outside the supported identity domain.
createIdentityState<boolean>();

// @ts-expect-error getId must return the state's logical ID type.
reconcile(createIdentityState<string>(), [true], { getId: (item) => item });
