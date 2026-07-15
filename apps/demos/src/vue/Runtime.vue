<script setup lang="ts">
import { useLikftc } from "@vp-tw/likftc/vue";
import { computed, type ShallowRef } from "vue";

import { createAfterRows, createBeforeRows, type DemoFrameState } from "../shared/demo.js";
import Row from "./Row.vue";

const props = defineProps<{ readonly frame: ShallowRef<DemoFrameState> }>();
const entries = useLikftc(() => props.frame.value.items, { getId: (item) => item.id });
const beforeRows = computed(() => createBeforeRows(props.frame.value));
const afterRows = computed(() => createAfterRows(props.frame.value, entries.value));
</script>

<template>
  <div class="runtime-grid">
    <article class="runtime-panel">
      <small>WITHOUT</small>
      <h3>Logical ID key</h3>
      <ol data-list="before">
        <Row v-for="row in beforeRows" :key="row.key" :row />
      </ol>
    </article>
    <article class="runtime-panel">
      <small>WITH @LIKFTC/VUE</small>
      <h3>Presence identity</h3>
      <ol data-list="after">
        <Row v-for="row in afterRows" :key="row.key" :row />
      </ol>
    </article>
  </div>
</template>
