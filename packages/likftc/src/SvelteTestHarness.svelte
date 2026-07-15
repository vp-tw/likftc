<script lang="ts">
  import { writable } from "svelte/store";

  import { createLikftc } from "./svelte.js";

  interface ExitingItem {
    readonly id: string;
    readonly key: number;
  }

  interface VisibleItem extends ExitingItem {
    readonly phase: "current" | "exiting";
  }

  const items = writable<readonly string[]>(["a"]);
  const entries = createLikftc(items, { getId: (item) => item });
  let exiting = $state<readonly ExitingItem[]>([]);
  let visible = $derived<readonly VisibleItem[]>([
    ...exiting.map((entry) => ({ ...entry, phase: "exiting" as const })),
    ...$entries.map((entry) => ({
      id: entry.id,
      key: entry.key,
      phase: "current" as const,
    })),
  ]);

  export function setFrame(
    nextItems: readonly string[],
    nextExiting: readonly ExitingItem[] = exiting,
  ): void {
    exiting = nextExiting;
    items.set(nextItems);
  }
</script>

<ul>
  {#each visible as entry (entry.key)}
    <li
      data-id={entry.id}
      data-identity-key={entry.key}
      data-phase={entry.phase}
    >
      {entry.id}
    </li>
  {/each}
</ul>
