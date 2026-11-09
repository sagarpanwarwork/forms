import { Component, computed, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import {
	applyWhen,
	email,
	form,
	FormField,
	FormRoot,
	hidden,
	minLength,
	required,
	validate,
} from '@angular/forms/signals';

type AccountType = 'personal' | 'business';

interface RegistrationModel {
	fullName: string;
	email: string;
	password: string;
	confirmPassword: string;
	accountType: AccountType;
	companyName: string;
	acceptTerms: boolean;
}

@Component({
	selector: 'app-registration-demo',
	standalone: true,
	imports: [FormField, FormRoot, JsonPipe],
	template: `
    <section class="demo-header">
      <p class="eyebrow">Example 01</p>
      <h2>Registration form</h2>
      <p>Model, schema validation, cross-field validation, conditional fields and FormRoot submission.</p>
    </section>

    <div class="demo-layout">
      <section class="panel">
        <form [formRoot]="registrationForm" class="form-grid">
          <div class="field-group full-width">
            <label for="fullName">Full name <span class="required-mark">*</span></label>
            <input id="fullName" type="text" autocomplete="name" [formField]="registrationForm.fullName" placeholder="e.g. Sagar Panwar" />
            @if (showErrors(registrationForm.fullName())) {
              @for (error of registrationForm.fullName().errors(); track $index) {
                <small class="field-error">{{ error.message }}</small>
              }
            }
          </div>

          <div class="field-group full-width">
            <label for="email">Email address <span class="required-mark">*</span></label>
            <input id="email" type="email" autocomplete="email" [formField]="registrationForm.email" placeholder="you@example.com" />
            @if (showErrors(registrationForm.email())) {
              @for (error of registrationForm.email().errors(); track $index) {
                <small class="field-error">{{ error.message }}</small>
              }
            }
          </div>

          <div class="field-group">
            <label for="password">Password <span class="required-mark">*</span></label>
            <input id="password" type="password" autocomplete="new-password" [formField]="registrationForm.password" placeholder="At least 8 characters" />
            @if (showErrors(registrationForm.password())) {
              @for (error of registrationForm.password().errors(); track $index) {
                <small class="field-error">{{ error.message }}</small>
              }
            }
          </div>

          <div class="field-group">
            <label for="confirmPassword">Confirm password <span class="required-mark">*</span></label>
            <input id="confirmPassword" type="password" autocomplete="new-password" [formField]="registrationForm.confirmPassword" placeholder="Re-enter password" />
            @if (showErrors(registrationForm.confirmPassword())) {
              @for (error of registrationForm.confirmPassword().errors(); track $index) {
                <small class="field-error">{{ error.message }}</small>
              }
            }
          </div>

          <div class="field-group full-width">
            <label for="accountType">Account type</label>
            <select id="accountType" [formField]="registrationForm.accountType">
              <option value="personal">Personal</option>
              <option value="business">Business</option>
            </select>
          </div>

          @if (!registrationForm.companyName().hidden()) {
            <div class="field-group full-width">
              <label for="companyName">Company name <span class="required-mark">*</span></label>
              <input id="companyName" type="text" [formField]="registrationForm.companyName" placeholder="Your company name" />
              @if (showErrors(registrationForm.companyName())) {
                @for (error of registrationForm.companyName().errors(); track $index) {
                  <small class="field-error">{{ error.message }}</small>
                }
              }
            </div>
          }

          <div class="field-group full-width checkbox-row">
            <input id="acceptTerms" type="checkbox" [formField]="registrationForm.acceptTerms" />
            <label for="acceptTerms">I agree to the terms and conditions <span class="required-mark">*</span></label>
            @if (showErrors(registrationForm.acceptTerms())) {
              @for (error of registrationForm.acceptTerms().errors(); track $index) {
                <small class="field-error">{{ error.message }}</small>
              }
            }
          </div>

          <div class="form-actions full-width">
            <button class="primary-button" type="submit" [disabled]="registrationForm().submitting()">
              @if (registrationForm().submitting()) { Submitting... } @else { Create account }
            </button>
            <button class="secondary-button" type="button" (click)="reset()">Reset</button>
          </div>
        </form>
      </section>

      <aside class="side-column">
        <section class="panel compact-panel">
          <h3>Live model</h3>
          <p class="muted-copy">This JSON is the writable signal model. It updates as the fields change.</p>
          <p class="computed-summary">{{ profileSummary() }}</p>
          <pre class="json-preview">{{ registrationModel() | json }}</pre>
        </section>

        @if (submitted()) {
          <section class="panel success-panel">
            <h3>Submission completed</h3>
            <p>The demo action received this model:</p>
            <pre class="json-preview">{{ submitted() | json }}</pre>
          </section>
        }
      </aside>
    </div>
  `,
})
export class RegistrationDemo {
	readonly registrationModel = signal<RegistrationModel>({
		fullName: '',
		email: '',
		password: '',
		confirmPassword: '',
		accountType: 'personal',
		companyName: '',
		acceptTerms: false,
	});

	readonly submitted = signal<RegistrationModel | null>(null);
	readonly profileSummary = computed(() => {
		const model = this.registrationModel();
		const name = model.fullName.trim() || 'New user';
		return `${name} · ${model.accountType} account`;
	});

	readonly registrationForm = form(
		this.registrationModel,
		(path) => {
			required(path.fullName, { message: 'Full name is required.' });
			required(path.email, { message: 'Email is required.' });
			email(path.email, { message: 'Enter a valid email address.' });

			required(path.password, { message: 'Password is required.' });
			minLength(path.password, 8, { message: 'Use at least 8 characters.' });

			required(path.confirmPassword, { message: 'Please confirm your password.' });
			validate(path.confirmPassword, ({ value, valueOf }) => {
				const password = valueOf(path.password);
				if (!value() || !password || value() === password) return null;
				return {
					kind: 'passwordMismatch',
					message: 'The passwords do not match.',
				};
			});

			// Apply hidden() conditionally through applyWhen(). This avoids relying
			// on the deprecated direct-LogicFn overload of hidden() for child paths.
			applyWhen(
				path,
				({ valueOf }) => valueOf(path.accountType) !== 'business',
				(conditionalPath) => hidden(conditionalPath.companyName, () => true),
			);

			required(path.companyName, {
				when: ({ valueOf }) => valueOf(path.accountType) === 'business',
				message: 'Company name is required for a business account.',
			});

			validate(path.acceptTerms, ({ value }) =>
				value()
					? null
					: { kind: 'termsRequired', message: 'You must accept the terms.' },
			);
		},
		{
			submission: {
				action: async (field) => {
					// Replace this delay with your real registration API call.
					await new Promise<void>((resolve) => setTimeout(resolve, 450));
					this.submitted.set(field().value());
				},
			},
		},
	);

	showErrors(field: { touched: () => boolean; invalid: () => boolean }): boolean {
		return field.touched() && field.invalid();
	}

	reset(): void {
		this.registrationForm().reset({
			fullName: '',
			email: '',
			password: '',
			confirmPassword: '',
			accountType: 'personal',
			companyName: '',
			acceptTerms: false,
		});
		this.submitted.set(null);
	}
}
