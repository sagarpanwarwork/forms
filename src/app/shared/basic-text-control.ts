import { Component, input, model, output } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

@Component({
  selector: 'app-basic-text-control',
  standalone: true,
  template: `
    <input
      class="custom-control-input"
      [id]="inputId()"
      [type]="type()"
      [value]="value()"
      [placeholder]="placeholder()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      [attr.aria-invalid]="invalid() ? 'true' : null"
      (input)="updateValue($event)"
      (blur)="touch.emit()"
    />
  `,
})
export class BasicTextControl implements FormValueControl<string> {
  readonly value = model('');
  readonly inputId = input('');
  readonly type = input<'text' | 'email' | 'url'>('text');
  readonly placeholder = input('Enter a value');
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly invalid = input(false);
  readonly touch = output<void>();

  updateValue(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.value.set(inputElement.value);
  }
}
