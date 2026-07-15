import "@angular/compiler";

import { signal as angularSignal } from "@angular/core";
import { createLikftc as createAngularLikftc } from "@vp-tw/likftc/angular";
import { createIdentityState, reconcile } from "@vp-tw/likftc";
import { useLikftc as usePreactLikftc } from "@vp-tw/likftc/preact";
import { useLikftc as useReactLikftc } from "@vp-tw/likftc/react";
import { createLikftc as createSolidLikftc } from "@vp-tw/likftc/solid";
import { createLikftc as createSvelteLikftc } from "@vp-tw/likftc/svelte";
import { useLikftc as useVueLikftc } from "@vp-tw/likftc/vue";
import { createLikftc as createWebLikftc } from "@vp-tw/likftc/web";
import { h as preactH, render as renderPreact } from "preact";
import { createElement as reactElement } from "react";
import { createRoot as createReactRoot } from "react-dom/client";
import { createRoot as createSolidRoot, createSignal as createSolidSignal } from "solid-js";
import { writable } from "svelte/store";
import { createApp, defineComponent, h as vueH, nextTick, ref } from "vue";

interface CompatibilityResult {
  readonly adapters: readonly string[];
  readonly error?: string;
  readonly ok: boolean;
}

declare global {
  interface Window {
    __LIKFTC_COMPATIBILITY__?: CompatibilityResult;
  }
}

const passedAdapters: string[] = [];

async function verifyLifecycle(
  name: string,
  readKeys: () => readonly number[],
  update: (items: readonly string[]) => Promise<void> | void,
): Promise<void> {
  await update(["a"]);
  const initialKey = onlyKey(name, readKeys());

  await update(["a"]);
  assert(onlyKey(name, readKeys()) === initialKey, `${name} changed a retained key.`);

  await update([]);
  assert(readKeys().length === 0, `${name} did not remove the absent item.`);

  await update(["a"]);
  assert(onlyKey(name, readKeys()) > initialKey, `${name} reused a retired key.`);
  passedAdapters.push(name);
}

async function verifyReact(): Promise<void> {
  const target = requiredElement("react");
  const root = createReactRoot(target);
  let keys: readonly number[] = [];

  function Harness({ items }: { readonly items: readonly string[] }) {
    const entries = useReactLikftc(items, { getId: (item) => item });
    keys = entries.map((entry) => entry.key);
    return reactElement(
      "ul",
      null,
      ...entries.map((entry) => reactElement("li", { key: entry.key }, entry.id)),
    );
  }

  await verifyLifecycle(
    "React 18.3.1",
    () => keys,
    async (items) => {
      root.render(reactElement(Harness, { items }));
      await settle(() => keys.length === items.length);
    },
  );
  root.unmount();
}

async function verifyPreact(): Promise<void> {
  const target = requiredElement("preact");
  let keys: readonly number[] = [];

  function Harness({ items }: { readonly items: readonly string[] }) {
    const entries = usePreactLikftc(items, { getId: (item) => item });
    keys = entries.map((entry) => entry.key);
    return preactH(
      "ul",
      null,
      entries.map((entry) => preactH("li", { key: entry.key }, entry.id)),
    );
  }

  await verifyLifecycle(
    "Preact 10.29.0",
    () => keys,
    (items) => {
      renderPreact(preactH(Harness, { items }), target);
    },
  );
  renderPreact(null, target);
}

async function verifyVue(): Promise<void> {
  const items = ref<readonly string[]>([]);
  let readKeys = (): readonly number[] => [];
  const app = createApp(
    defineComponent({
      setup() {
        const entries = useVueLikftc(items, { getId: (item) => item });
        readKeys = () => entries.value.map((entry) => entry.key);
        return () =>
          vueH(
            "ul",
            entries.value.map((entry) => vueH("li", { key: entry.key }, entry.id)),
          );
      },
    }),
  );
  app.mount(requiredElement("vue"));

  await verifyLifecycle("Vue 3.4.0", readKeys, async (nextItems) => {
    items.value = nextItems;
    await nextTick();
  });
  app.unmount();
}

async function verifySvelte(): Promise<void> {
  const items = writable<readonly string[]>([]);
  let keys: readonly number[] = [];
  const unsubscribe = createSvelteLikftc(items, { getId: (item) => item }).subscribe((entries) => {
    keys = entries.map((entry) => entry.key);
  });

  await verifyLifecycle(
    "Svelte 5.0.0",
    () => keys,
    (nextItems) => items.set(nextItems),
  );
  unsubscribe();
}

async function verifySolid(): Promise<void> {
  let dispose = (): void => undefined;
  let readKeys = (): readonly number[] => [];
  let update = (_items: readonly string[]): void => undefined;

  createSolidRoot((disposeRoot) => {
    const [items, setItems] = createSolidSignal<readonly string[]>([]);
    const controller = createSolidLikftc(items, { getId: (item) => item });
    dispose = disposeRoot;
    readKeys = controller.keys;
    update = setItems;
  });

  await verifyLifecycle("Solid 1.9.0", readKeys, update);
  dispose();
}

async function verifyAngular(): Promise<void> {
  const items = angularSignal<readonly string[]>([]);
  const entries = createAngularLikftc(items, { getId: (item) => item });

  await verifyLifecycle(
    "Angular 20.0.0",
    () => entries().map((entry) => entry.key),
    (nextItems) => items.set(nextItems),
  );
}

async function verifyWeb(): Promise<void> {
  const controller = createWebLikftc<string, string>({ getId: (item) => item });
  let keys: readonly number[] = [];

  await verifyLifecycle(
    "Web platform",
    () => keys,
    (items) => {
      keys = controller.update(items).map((entry) => entry.key);
    },
  );
}

function verifyCore(): void {
  const first = reconcile(createIdentityState<string>(), ["a"], { getId: (item) => item });
  const absent = reconcile(first.state, [], { getId: (item: string) => item });
  const reentered = reconcile(absent.state, ["a"], { getId: (item) => item });
  assert(reentered.entries[0]?.key === 1, "Core did not retire an absent identity.");
  passedAdapters.push("Core");
}

async function run(): Promise<void> {
  verifyCore();
  await verifyReact();
  await verifyPreact();
  await verifyVue();
  await verifySvelte();
  await verifySolid();
  await verifyAngular();
  await verifyWeb();
}

void run().then(
  () => {
    window.__LIKFTC_COMPATIBILITY__ = { adapters: passedAdapters, ok: true };
  },
  (error: unknown) => {
    window.__LIKFTC_COMPATIBILITY__ = {
      adapters: passedAdapters,
      error: error instanceof Error ? (error.stack ?? error.message) : String(error),
      ok: false,
    };
  },
);

function onlyKey(name: string, keys: readonly number[]): number {
  assert(keys.length === 1, `${name} expected one key, received ${keys.length}.`);
  const key = keys[0];
  assert(key !== undefined, `${name} returned an undefined key.`);
  return key;
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function requiredElement(id: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`#${id}`);
  if (element === null) {
    throw new Error(`Missing fixture element #${id}.`);
  }
  return element;
}

async function settle(condition: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt++) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    if (condition()) return;
  }
  throw new Error("React fixture did not settle within ten animation frames.");
}
