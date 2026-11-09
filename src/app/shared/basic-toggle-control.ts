import { Component, input, model, output } from '@angular/core';
import type { FormCheckboxControl } from '@angular/forms/signals';

@Component({
  selector: 'app-basic-toggle-control',
  standalone: true,
  template: `
    <button
      type="button"
      class="toggle-control"
      [class.is-on]="checked()"
      [disabled]="disabled()"
      [id]="controlId()"
      role="switch"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-checked]="checked()"
      (click)="checked.update(value => !value)"
      (blur)="touch.emit()"
    >
      <span class="toggle-knob"></span>
      <span>{{ checked() ? 'Enabled' : 'Disabled' }}</span>
    </button>
  `,
})
export class BasicToggleControl implements FormCheckboxControl {
  readonly checked = model(false);
  readonly controlId = input('');
  readonly ariaLabel = input('Toggle setting');
  readonly disabled = input(false);
  readonly touch = output<void>();
}
