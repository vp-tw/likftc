<script lang="ts">
  import { describeRow, type DemoRenderedRow } from "../shared/demo.js";

  let { row }: { row: DemoRenderedRow } = $props();
</script>

<li
  class="runtime-row"
  data-collision={String(row.kind === "collision")}
  data-id={row.item.id}
  data-key={row.keyText}
  data-kind={row.kind}
  data-phase={row.kind === "exiting" ? "exiting" : "current"}
  data-slot={row.slot}
>
  <b>{row.item.id.toUpperCase()}</b>
  <span>{row.item.label}</span>
  <code>{row.keyText}</code>
  <em>{describeRow(row.kind)}</em>
</li>
