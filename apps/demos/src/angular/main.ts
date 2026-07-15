import "@angular/compiler";

import { createLikftc } from "@vp-tw/likftc/angular";
import {
  Component,
  computed,
  createComponent,
  provideZonelessChangeDetection,
  signal,
} from "@angular/core";
import { createApplication } from "@angular/platform-browser";

import {
  createAfterRows,
  createBeforeRows,
  describeRow,
  mountFrameworkDemo,
  type DemoFrameState,
  type DemoRuntime,
} from "../shared/demo.js";

@Component({
  selector: "likftc-angular-demo",
  standalone: true,
  template: `
    <div class="runtime-grid">
      <article class="runtime-panel">
        <small>WITHOUT</small>
        <h3>Logical ID key</h3>
        <ol data-list="before">
          @for (row of beforeRows(); track row.key) {
            <li
              class="runtime-row"
              [attr.data-collision]="row.kind === 'collision'"
              [attr.data-id]="row.item.id"
              [attr.data-key]="row.keyText"
              [attr.data-kind]="row.kind"
              [attr.data-phase]="row.kind === 'exiting' ? 'exiting' : 'current'"
              [attr.data-slot]="row.slot"
            >
              <b>{{ row.item.id.toUpperCase() }}</b>
              <span>{{ row.item.label }}</span>
              <code>{{ row.keyText }}</code>
              <em>{{ describeRow(row.kind) }}</em>
            </li>
          }
        </ol>
      </article>
      <article class="runtime-panel">
        <small>WITH @LIKFTC/ANGULAR</small>
        <h3>Presence identity</h3>
        <ol data-list="after">
          @for (row of afterRows(); track row.key) {
            <li
              class="runtime-row"
              [attr.data-collision]="row.kind === 'collision'"
              [attr.data-id]="row.item.id"
              [attr.data-key]="row.keyText"
              [attr.data-kind]="row.kind"
              [attr.data-phase]="row.kind === 'exiting' ? 'exiting' : 'current'"
              [attr.data-slot]="row.slot"
            >
              <b>{{ row.item.id.toUpperCase() }}</b>
              <span>{{ row.item.label }}</span>
              <code>{{ row.keyText }}</code>
              <em>{{ describeRow(row.kind) }}</em>
            </li>
          }
        </ol>
      </article>
    </div>
  `,
})
class DemoRoot {
  readonly describeRow = describeRow;
  readonly frame = signal<DemoFrameState>({ enteringIds: [], items: [], retainedExits: [] });
  readonly items = computed(() => this.frame().items);
  readonly entries = createLikftc(this.items, { getId: (item) => item.id });
  readonly beforeRows = computed(() => createBeforeRows(this.frame()));
  readonly afterRows = computed(() => createAfterRows(this.frame(), this.entries()));

  setFrame(nextFrame: DemoFrameState): void {
    this.frame.set(nextFrame);
  }
}

await mountFrameworkDemo("Angular", async (target, initialState): Promise<DemoRuntime> => {
  const application = await createApplication({ providers: [provideZonelessChangeDetection()] });
  const host = document.createElement("likftc-angular-demo");
  target.append(host);
  const component = createComponent(DemoRoot, {
    environmentInjector: application.injector,
    hostElement: host,
  });
  application.attachView(component.hostView);
  const update = (state: DemoFrameState): void => {
    component.instance.setFrame(state);
    component.changeDetectorRef.detectChanges();
  };
  update(initialState);
  return {
    destroy: () => {
      application.detachView(component.hostView);
      component.destroy();
      application.destroy();
      host.remove();
    },
    update,
  };
});
