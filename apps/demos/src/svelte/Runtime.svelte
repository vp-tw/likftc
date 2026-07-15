<script lang="ts">
  import { createLikftc } from "@vp-tw/likftc/svelte";
  import { untrack } from "svelte";
  import { derived, type Readable } from "svelte/store";

  import {
    createAfterRows,
    createBeforeRows,
    type DemoFrameState,
  } from "../shared/demo.js";
  import Row from "./Row.svelte";

  let { frame }: { frame: Readable<DemoFrameState> } = $props();

  const items = untrack(() => derived(frame, (state) => state.items));
  const entries = untrack(() => createLikftc(items, { getId: (item) => item.id }));
  let beforeRows = $derived(createBeforeRows($frame));
  let afterRows = $derived(createAfterRows($frame, $entries));
</script>

<div class="runtime-grid">
  <article class="runtime-panel">
    <small>WITHOUT</small>
    <h3>Logical ID key</h3>
    <ol data-list="before">
      {#each beforeRows as row (row.key)}
        <Row {row} />
      {/each}
    </ol>
  </article>
  <article class="runtime-panel">
    <small>WITH @LIKFTC/SVELTE</small>
    <h3>Presence identity</h3>
    <ol data-list="after">
      {#each afterRows as row (row.key)}
        <Row {row} />
      {/each}
    </ol>
  </article>
</div>
