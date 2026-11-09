import { Component, signal } from '@angular/core';
import { RegistrationDemo } from './demos/registration-demo';
import { AsyncValidationDemo } from './demos/async-validation-demo';
import { CustomControlsDemo } from './demos/custom-controls-demo';
import { DynamicFormDemo } from './demos/dynamic-form-demo';

type DemoId = 'overview' | 'registration' | 'async' | 'custom' | 'dynamic';

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [
		RegistrationDemo,
		AsyncValidationDemo,
		CustomControlsDemo,
		DynamicFormDemo,
	],
	templateUrl: './app.html',
	styleUrl: './app.scss',
})
export class App {
	readonly activeDemo = signal<DemoId>('overview');

	readonly demos: { id: DemoId; label: string; description: string }[] = [
		{ id: 'overview', label: 'Overview', description: 'Concepts and learning path' },
		{ id: 'registration', label: 'Static form', description: 'Model, schema, validation and submission' },
		{ id: 'async', label: 'Async validation', description: 'HTTP validation and debounce' },
		{ id: 'custom', label: 'Custom controls', description: 'Text, toggle and file picker' },
		{ id: 'dynamic', label: 'Dynamic form', description: 'JSON config and public API integration' },
	];

	selectDemo(id: DemoId): void {
		this.activeDemo.set(id);
	}
}
