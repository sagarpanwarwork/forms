import { Component, signal } from '@angular/core';
import {
  debounce,
  email,
  form,
  FormField,
  FormRoot,
  minLength,
  required,
  validateHttp,
} from '@angular/forms/signals';

interface UserSearchResponse {
  users: Array<{ username: string }>;
  total: number;
  skip: number;
  limit: number;
}

interface UsernameModel {
  username: string;
  email: string;
}

@Component({
  selector: 'app-async-validation-demo',
  standalone: true,
  imports: [FormField, FormRoot],
  template: `
    <section class="demo-header">
      <p class="eyebrow">Example 02</p>
      <h2>Asynchronous validation</h2>
      <p>Check a username against a public API. Synchronous rules run first; the HTTP validator is debounced.</p>
    </section>

    <div class="demo-layout">
      <section class="panel">
        <form [formRoot]="usernameForm" class="form-grid">
          <div class="field-group full-width">
            <label for="username">Username <span class="required-mark">*</span></label>
            <input id="username" type="text" autocomplete="username" [formField]="usernameForm.username" placeholder="Try emilys or choose your own" />
            <small class="help-text">The check searches the sample users in DummyJSON. It is a learning example, not a real account registry.</small>

            @if (usernameForm.username().pending()) {
              <small class="pending-message">Checking username availability...</small>
            }

            @if (usernameForm.username().touched() && usernameForm.username().invalid()) {
              @for (error of usernameForm.username().errors(); track $index) {
                <small class="field-error">{{ error.message }}</small>
              }
            }
          </div>

          <div class="field-group full-width">
            <label for="asyncEmail">Email <span class="required-mark">*</span></label>
            <input id="asyncEmail" type="email" autocomplete="email" [formField]="usernameForm.email" placeholder="you@example.com" />
            @if (usernameForm.email().touched() && usernameForm.email().invalid()) {
              @for (error of usernameForm.email().errors(); track $index) {
                <small class="field-error">{{ error.message }}</small>
              }
            }
          </div>

          <div class="form-actions full-width">
            <button class="primary-button" type="submit" [disabled]="usernameForm().submitting() || usernameForm.username().pending()">
              @if (usernameForm().submitting()) { Checking... } @else { Validate and continue }
            </button>
          </div>
        </form>
      </section>

      <aside class="side-column">
        <section class="panel compact-panel">
          <h3>What happens?</h3>
          <ol class="steps-list">
            <li>Required and minimum-length checks run locally.</li>
            <li>After 400 ms without typing, Angular sends a GET request.</li>
            <li>The result is mapped to a field validation error.</li>
            <li>Changing the value cancels an obsolete pending validation.</li>
          </ol>
          <p class="muted-copy">Submission uses <code>ignoreValidators: 'none'</code>, so pending async validation blocks the action.</p>
        </section>

        @if (lastValidated()) {
          <section class="panel success-panel">
            <h3>Validation passed</h3>
            <p><strong>{{ lastValidated() }}</strong> passed the demo availability check.</p>
          </section>
        }
      </aside>
    </div>
  `,
})
export class AsyncValidationDemo {
  readonly usernameModel = signal<UsernameModel>({ username: '', email: '' });
  readonly lastValidated = signal<string | null>(null);

  readonly usernameForm = form(
    this.usernameModel,
    (path) => {
      required(path.username, { message: 'Username is required.' });
      minLength(path.username, 3, { message: 'Enter at least 3 characters.' });
      required(path.email, { message: 'Email is required.' });
      email(path.email, { message: 'Enter a valid email address.' });

      // Debounce model commits so the remote validator runs after the user pauses typing.
      debounce(path.username, 400);

      validateHttp(path.username, {
        request: ({ value }) => {
          const username = value().trim();
          if (username.length < 3) return undefined;
          return `https://dummyjson.com/users/search?q=${encodeURIComponent(username)}&limit=50&select=username`;
        },
        onSuccess: (
          response: UserSearchResponse,
          { value },
        ) => {
          const current = value().trim().toLowerCase();
          const exists = response.users.some(
            (user) => user.username.toLowerCase() === current,
          );
          return exists
            ? { kind: 'usernameTaken', message: 'This username exists in the DummyJSON sample data.' }
            : null;
        },
        onError: () => ({
          kind: 'availabilityCheckFailed',
          message: 'The availability API could not be reached. Check your connection and try again.',
        }),
      });
    },
    {
      submission: {
        ignoreValidators: 'none',
        action: async (field) => {
          this.lastValidated.set(field().value().username);
        },
      },
    },
  );
}
