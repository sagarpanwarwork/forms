import { Component, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import {
  form,
  FormField,
  FormRoot,
  minLength,
  required,
} from '@angular/forms/signals';
import { BasicTextControl } from '../shared/basic-text-control';
import { BasicToggleControl } from '../shared/basic-toggle-control';
import { FilePickerControl } from '../shared/file-picker-control';

interface CustomControlsModel {
  displayName: string;
  receiveUpdates: boolean;
  attachments: File[];
}

@Component({
  selector: 'app-custom-controls-demo',
  standalone: true,
  imports: [JsonPipe, FormField, FormRoot, BasicTextControl, BasicToggleControl, FilePickerControl],
  template: `
    <section class="demo-header">
      <p class="eyebrow">Example 03</p>
      <h2>Reusable custom controls</h2>
      <p>
        Signal Forms can connect components that implement FormValueControl or
        FormCheckboxControl. This example includes a text field, toggle and file picker.
      </p>
    </section>

    <div class="demo-layout">
      <section class="panel">
        <form [formRoot]="customForm" class="form-grid">
          <div class="field-group full-width">
            <label for="customName">Display name <span class="required-mark">*</span></label>
            <app-basic-text-control
              [inputId]="'customName'"
              [formField]="customForm.displayName"
              placeholder="Enter your display name"
            />
            @if (customForm.displayName().touched() && customForm.displayName().invalid()) {
              @for (error of customForm.displayName().errors(); track $index) {
                <small class="field-error">{{ error.message }}</small>
              }
            }
          </div>

          <div class="field-group full-width">
            <label for="receiveUpdates">Receive product updates</label>
            <app-basic-toggle-control
              [controlId]="'receiveUpdates'"
              [ariaLabel]="'Receive product updates'"
              [formField]="customForm.receiveUpdates"
            />
          </div>

          <div class="field-group full-width">
            <label for="attachments">Attachments <span class="required-mark">*</span></label>
            <app-file-picker-control [inputId]="'attachments'" [formField]="customForm.attachments" />
            @if (customForm.attachments().touched() && customForm.attachments().invalid()) {
              @for (error of customForm.attachments().errors(); track $index) {
                <small class="field-error">{{ error.message }}</small>
              }
            }
          </div>

          <div class="form-actions full-width">
            <button class="primary-button" type="submit" [disabled]="customForm().submitting()">
              Submit custom controls
            </button>
            <button class="secondary-button" type="button" (click)="reset()">Reset</button>
          </div>
        </form>
      </section>

      <aside class="side-column">
        <section class="panel compact-panel">
          <h3>Control contracts</h3>
          <p><code>FormValueControl&lt;T&gt;</code> exposes a <code>value</code> model signal.</p>
          <p><code>FormCheckboxControl</code> exposes a <code>checked</code> model signal.</p>
          <p class="muted-copy">The FormField directive connects these signals and can also pass optional state such as disabled, readonly and validation errors.</p>
        </section>

        <section class="panel compact-panel">
          <h3>Current model</h3>
          <pre class="json-preview">{{ modelSummary() | json }}</pre>
          <small class="muted-copy">File objects are represented by their names and sizes in this preview.</small>
        </section>

        @if (submitted()) {
          <section class="panel success-panel">
            <h3>Submitted</h3>
            <p>The custom controls were read through the same form model.</p>
          </section>
        }
      </aside>
    </div>
  `,
})
export class CustomControlsDemo {
  readonly model = signal<CustomControlsModel>({
    displayName: '',
    receiveUpdates: false,
    attachments: [],
  });
  readonly submitted = signal(false);

  readonly customForm = form(
    this.model,
    (path) => {
      required(path.displayName, { message: 'Display name is required.' });
      minLength(path.displayName, 2, { message: 'Use at least 2 characters.' });
      minLength(path.attachments, 1, { message: 'Select at least one file.' });
    },
    {
      submission: {
        action: async (field) => {
          const value = field().value();
          console.log('Custom controls submitted:', {
            ...value,
            attachments: value.attachments.map((file) => ({
              name: file.name,
              size: file.size,
              type: file.type,
            })),
          });
          this.submitted.set(true);
        },
      },
    },
  );

  modelSummary() {
    const value = this.model();
    return {
      displayName: value.displayName,
      receiveUpdates: value.receiveUpdates,
      attachments: value.attachments.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      })),
    };
  }

  reset(): void {
    this.customForm().reset({ displayName: '', receiveUpdates: false, attachments: [] });
    this.submitted.set(false);
  }
}
