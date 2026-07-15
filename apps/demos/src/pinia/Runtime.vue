<script setup lang="ts">
import { useLikftc } from "@vp-tw/likftc/vue";
import { storeToRefs } from "pinia";
import { computed } from "vue";

import {
  createAfterRows,
  createBeforeRows,
  describeRow,
  type DemoRenderedRow,
} from "../shared/demo.js";
import { useDemoStore } from "../state/stores/pinia.js";

const { frame } = storeToRefs(useDemoStore());
const entries = useLikftc(() => frame.value.items, { getId: (item) => item.id });
const beforeRows = computed(() => createBeforeRows(frame.value));
const afterRows = computed(() => createAfterRows(frame.value, entries.value));

const rowPhase = (row: DemoRenderedRow): "current" | "exiting" =>
  row.kind === "exiting" ? "exiting" : "current";
</script>

<template>
  <div class="runtime-grid">
    <article class="runtime-panel">
      <small>WITHOUT + PINIA</small>
      <h3>Logical ID key</h3>
      <ol data-list="before">
        <li
          v-for="row in beforeRows"
          :key="row.key"
          class="runtime-row"
          :data-collision="String(row.kind === 'collision')"
          :data-id="row.item.id"
          :data-key="row.keyText"
          :data-kind="row.kind"
          :data-phase="rowPhase(row)"
          :data-slot="String(row.slot)"
        >
          <b>{{ row.item.id.toUpperCase() }}</b>
          <span>{{ row.item.label }}</span>
          <code>{{ row.keyText }}</code>
          <em>{{ describeRow(row.kind) }}</em>
        </li>
      </ol>
    </article>
    <article class="runtime-panel">
      <small>WITH LIKFTC + PINIA</small>
      <h3>Presence identity</h3>
      <ol data-list="after">
        <li
          v-for="row in afterRows"
          :key="row.key"
          class="runtime-row"
          :data-collision="String(row.kind === 'collision')"
          :data-id="row.item.id"
          :data-key="row.keyText"
          :data-kind="row.kind"
          :data-phase="rowPhase(row)"
          :data-slot="String(row.slot)"
        >
          <b>{{ row.item.id.toUpperCase() }}</b>
          <span>{{ row.item.label }}</span>
          <code>{{ row.keyText }}</code>
          <em>{{ describeRow(row.kind) }}</em>
        </li>
      </ol>
    </article>
  </div>
</template>
