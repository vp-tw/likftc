import "@angular/compiler";

import {
  Component,
  computed,
  createComponent,
  provideZonelessChangeDetection,
  signal,
} from "@angular/core";
import { createApplication } from "@angular/platform-browser";

import {
  runIdentityConformance,
  type ExitingIdentity,
  type IdentityHarness,
} from "../../../test/browser-conformance.js";
import { createLikftc } from "./angular.js";

interface VisibleIdentity extends ExitingIdentity {
  readonly phase: "current" | "exiting";
}

class TestHarness {
  readonly exiting = signal<readonly ExitingIdentity[]>([]);
  readonly items = signal<readonly string[]>([]);
  readonly entries = createLikftc(this.items, { getId: (item) => item });
  readonly visible = computed<readonly VisibleIdentity[]>(() => [
    ...this.exiting().map((entry) => ({ ...entry, phase: "exiting" as const })),
    ...this.entries().map((entry) => ({
      id: entry.id,
      key: entry.key,
      phase: "current" as const,
    })),
  ]);
}

Component({
  selector: "likftc-test-harness",
  standalone: true,
  template: `
    <ul>
      @for (entry of visible(); track entry.key) {
        <li
          [attr.data-id]="entry.id"
          [attr.data-identity-key]="entry.key"
          [attr.data-phase]="entry.phase"
        >{{ entry.id }}</li>
      }
    </ul>
  `,
})(TestHarness);

async function createAngularHarness(initialItems: readonly string[]): Promise<IdentityHarness> {
  const container = document.createElement("div");
  document.body.append(container);
  const application = await createApplication({
    providers: [provideZonelessChangeDetection()],
  });
  const component = createComponent(TestHarness, {
    environmentInjector: application.injector,
    hostElement: container,
  });
  application.attachView(component.hostView);

  const detectChanges = (): void => component.changeDetectorRef.detectChanges();
  component.instance.items.set(initialItems);
  detectChanges();

  return {
    root: container,
    dispose: () => {
      application.detachView(component.hostView);
      component.destroy();
      application.destroy();
      container.remove();
    },
    update: (items, exiting = []) => {
      component.instance.exiting.set(exiting);
      component.instance.items.set(items);
      detectChanges();
    },
  };
}

runIdentityConformance("Angular", createAngularHarness);
