import {
  runIdentityConformance,
  type ExitingIdentity,
  type IdentityHarness,
} from "../../../test/browser-conformance.js";
import { createLikftc } from "./web.js";

Object.assign(globalThis, {
  litIssuedWarnings: new Set(["dev-mode"]),
});

const { html, LitElement } = await import("lit");
const { repeat } = await import("lit/directives/repeat.js");

interface VisibleIdentity extends ExitingIdentity {
  readonly phase: "current" | "exiting";
}

class LikftcLitHarness extends LitElement {
  static override properties = {
    exiting: { attribute: false },
    items: { attribute: false },
  };

  declare exiting: readonly ExitingIdentity[];
  declare items: readonly string[];

  readonly #controller = createLikftc<string, string>({ getId: (item) => item });

  constructor() {
    super();
    this.exiting = [];
    this.items = [];
  }

  protected override render() {
    const current: readonly VisibleIdentity[] = this.#controller
      .update(this.items)
      .entries.map((entry) => ({ id: entry.id, key: entry.key, phase: "current" as const }));
    const visible: readonly VisibleIdentity[] = [
      ...this.exiting.map((entry) => ({ ...entry, phase: "exiting" as const })),
      ...current,
    ];

    return html`<ul>
      ${repeat(
        visible,
        (entry) => entry.key,
        (entry) => html`
          <li data-id=${entry.id} data-identity-key=${entry.key} data-phase=${entry.phase}>
            ${entry.id}
          </li>
        `,
      )}
    </ul>`;
  }
}

const tagName = "likftc-lit-test-harness";
if (!customElements.get(tagName)) {
  customElements.define(tagName, LikftcLitHarness);
}

async function createWebHarness(initialItems: readonly string[]): Promise<IdentityHarness> {
  const element = document.createElement(tagName) as LikftcLitHarness;
  element.items = initialItems;
  document.body.append(element);
  await element.updateComplete;
  const shadowRoot = element.shadowRoot;
  if (shadowRoot === null) {
    throw new Error("Expected the Lit harness to have a shadow root.");
  }

  return {
    root: shadowRoot,
    dispose: () => element.remove(),
    update: async (items, exiting = []) => {
      element.exiting = exiting;
      element.items = items;
      await element.updateComplete;
    },
  };
}

runIdentityConformance("Web Components", createWebHarness);
