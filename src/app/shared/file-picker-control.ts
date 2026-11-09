import { Component, ElementRef, effect, input, model, output, viewChild } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

@Component({
  selector: 'app-file-picker-control',
  standalone: true,
  template: `
    <div class="file-picker-control">
      <input
        #fileInput
        type="file"
        [id]="inputId()"
        accept=".pdf,.png,.jpg,.jpeg"
        multiple
        [disabled]="disabled()"
        [attr.aria-invalid]="invalid() ? 'true' : null"
        (change)="selectFiles($event)"
        (blur)="touch.emit()"
      />
      @if (value().length > 0) {
        <ul class="file-list">
          @for (file of value(); track $index) {
            <li>{{ file.name }} <span>({{ formatSize(file.size) }})</span></li>
          }
        </ul>
      } @else {
        <small class="muted-copy">No files selected.</small>
      }
    </div>
  `,
})
export class FilePickerControl implements FormValueControl<File[]> {
  readonly inputId = input('');
  readonly value = model<File[]>([]);
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly touch = output<void>();
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  constructor() {
    effect(() => {
      if (this.value().length === 0) {
        const nativeInput = this.fileInput()?.nativeElement;
        if (nativeInput) nativeInput.value = '';
      }
    });
  }

  selectFiles(event: Event): void {
    const element = event.target as HTMLInputElement;
    this.value.set(Array.from(element.files ?? []));
    this.touch.emit();
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
