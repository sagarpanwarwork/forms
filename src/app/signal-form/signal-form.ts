import { Component, signal } from '@angular/core';
import { email, form, FormField, minLength, required } from '@angular/forms/signals';

interface RegistrationModel {
	fullName: string;
	email: string;
	password: string;
}

@Component({
	selector: 'app-signal-form',
	imports: [FormField],
	templateUrl: './signal-form.html',
	styleUrl: './signal-form.scss',
})
export class SignalForm {
	// THe structure of the form we want to create
	registrationModel = signal<RegistrationModel>({
		fullName: '',
		email: '',
		password: '',
	});

	// Here is the form
	registrationForm = form(this.registrationModel, (path) => {
		required(path.fullName, {
			message: 'Full name is required'
		});

		required(path.email, {
			message: 'Email is required'
		});

		email(path.email, {
			message: 'Enter a valid email'
		});

		required(path.password, {
			message: 'Password is required'
		});

		minLength(path.password, 8, {
			message: 'Password must contain at least 8 characters'
		});
	});
}
