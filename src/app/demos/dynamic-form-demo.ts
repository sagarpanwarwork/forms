import { HttpClient } from '@angular/common/http';
import { JsonPipe } from '@angular/common';
import { Component, inject, Injector, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
	applyWhen,
	form,
	FormField,
	FormRoot,
	hidden,
	max,
	maxLength,
	min,
	minLength,
	required,
} from '@angular/forms/signals';
import type { Field, FieldTree, SchemaFn, SchemaPath } from '@angular/forms/signals';

interface DynamicWhenCondition {
	field: string;
	equals: string | number;
}

interface DynamicFieldBase {
	name: string;
	label: string;
	required?: boolean;
	when?: DynamicWhenCondition;
}

export type DynamicFieldConfig =
	| (DynamicFieldBase & {
		kind: 'text' | 'textarea';
		placeholder?: string;
		minLength?: number;
		maxLength?: number;
	})
	| (DynamicFieldBase & {
		kind: 'number';
		min?: number;
		max?: number;
	})
	| (DynamicFieldBase & {
		kind: 'select';
		placeholder?: string;
		optionsSource: 'dummyjson-product-categories';
	});

export type DynamicProductModel = Record<string, string | number | null>;

interface ProductCategory {
	slug: string;
	name: string;
	url: string;
}

interface CreatedProduct {
	id: number;
	title: string;
	description: string;
	price: number;
	category: string;
	brand?: string;
	stock?: number;
	warrantyMonths?: number;
}


function isDynamicFieldConfig(value: unknown): value is DynamicFieldConfig {
	if (typeof value !== 'object' || value === null) return false;

	const field = value as Record<string, unknown>;
	const validName = typeof field['name'] === 'string' && /^[A-Za-z][A-Za-z0-9_]*$/.test(field['name']);
	const validLabel = typeof field['label'] === 'string' && field['label'].trim().length > 0;
	const validRequired = field['required'] === undefined || typeof field['required'] === 'boolean';
	const when = field['when'];
	const validWhen = when === undefined || (
		typeof when === 'object' && when !== null &&
		typeof (when as Record<string, unknown>)['field'] === 'string' &&
		(typeof (when as Record<string, unknown>)['equals'] === 'string' ||
			typeof (when as Record<string, unknown>)['equals'] === 'number')
	);

	if (!validName || !validLabel || !validRequired || !validWhen || (field['label'] as string).length > 100) return false;

	switch (field['kind']) {
		case 'text':
		case 'textarea':
			const validMinLength = field['minLength'] === undefined ||
				(typeof field['minLength'] === 'number' && Number.isInteger(field['minLength']) && field['minLength'] >= 0);
			const validMaxLength = field['maxLength'] === undefined ||
				(typeof field['maxLength'] === 'number' && Number.isInteger(field['maxLength']) && field['maxLength'] >= 0);
			const validLengthRange = !(
				typeof field['minLength'] === 'number' &&
				typeof field['maxLength'] === 'number' &&
				field['minLength'] > field['maxLength']
			);
			return (
				(field['placeholder'] === undefined || typeof field['placeholder'] === 'string') &&
				validMinLength && validMaxLength && validLengthRange
			);
		case 'number': {
			const validMin = field['min'] === undefined || typeof field['min'] === 'number';
			const validMax = field['max'] === undefined || typeof field['max'] === 'number';
			const validRange = !(
				typeof field['min'] === 'number' &&
				typeof field['max'] === 'number' &&
				field['min'] > field['max']
			);
			return validMin && validMax && validRange;
		}
		case 'select':
			return (
				field['optionsSource'] === 'dummyjson-product-categories' &&
				(field['placeholder'] === undefined || typeof field['placeholder'] === 'string')
			);
		default:
			return false;
	}
}

function isValidDynamicConfig(value: unknown): value is DynamicFieldConfig[] {
	if (!Array.isArray(value) || value.length === 0 || value.length > 40) return false;

	const names = new Set<string>();
	for (const field of value) {
		if (!isDynamicFieldConfig(field) || names.has(field.name)) return false;
		if (['constructor', 'prototype', 'toString', 'valueOf', 'hasOwnProperty'].includes(field.name)) return false;
		names.add(field.name);
	}

	for (const field of value) {
		if (!isDynamicFieldConfig(field) || !field.when) continue;
		if (field.when.field === field.name || !names.has(field.when.field)) return false;

		const dependency = value.find(
			(candidate): candidate is DynamicFieldConfig =>
				isDynamicFieldConfig(candidate) && candidate.name === field.when?.field,
		);
		if (!dependency) return false;

		const expectedType = dependency.kind === 'number' ? 'number' : 'string';
		if (typeof field.when.equals !== expectedType) return false;
	}

	return true;
}

function createModel(config: DynamicFieldConfig[]): DynamicProductModel {
	const initial: DynamicProductModel = {};

	for (const field of config) {
		initial[field.name] = field.kind === 'number' ? null : '';
	}

	return initial;
}

// The schema is defined once when form() is created. applyWhen()/hidden() add
// reactive rules whose conditions are re-evaluated when their dependency changes.
function createSchema(
	config: DynamicFieldConfig[],
): SchemaFn<DynamicProductModel> {
	return (rootPath) => {
		for (const field of config) {
			const applyFieldRules = (path: typeof rootPath): void => {
				const fieldPath = path[field.name];

				if (field.required) {
					required(fieldPath, { message: `${field.label} is required.` });
				}

				if (field.kind === 'number') {
					const numberPath = fieldPath as unknown as SchemaPath<number | null>;

					if (field.min !== undefined) {
						min(numberPath, field.min, {
							message: `${field.label} must be at least ${field.min}.`,
						});
					}

					if (field.max !== undefined) {
						max(numberPath, field.max, {
							message: `${field.label} must not exceed ${field.max}.`,
						});
					}
				}

				if (field.kind === 'text' || field.kind === 'textarea') {
					const textPath = fieldPath as unknown as SchemaPath<string>;

					if (field.minLength !== undefined) {
						minLength(textPath, field.minLength, {
							message: `${field.label} must contain at least ${field.minLength} characters.`,
						});
					}

					if (field.maxLength !== undefined) {
						maxLength(textPath, field.maxLength, {
							message: `${field.label} must contain no more than ${field.maxLength} characters.`,
						});
					}
				}
			};

			if (field.when) {
				const condition = field.when;
				// Apply hidden() as a conditional schema. This avoids the deprecated
				// direct-LogicFn overload for dynamically indexed child field paths.
				applyWhen(
					rootPath,
					({ valueOf }) => valueOf(rootPath[condition.field]) !== condition.equals,
					(conditionalPath) => hidden(conditionalPath[field.name], () => true),
				);
				applyWhen(
					rootPath,
					({ valueOf }) => valueOf(rootPath[condition.field]) === condition.equals,
					applyFieldRules,
				);
			} else {
				applyFieldRules(rootPath);
			}
		}
	};
}

@Component({
	selector: 'app-dynamic-form-demo',
	standalone: true,
	imports: [JsonPipe, FormField, FormRoot],
	template: `
    <section class="demo-header">
      <p class="eyebrow">Example 04</p>
      <h2>JSON-driven dynamic form</h2>
      <p>
        The field structure and validation rules come from a JSON asset. The category
        options and create request use DummyJSON public endpoints. Choose the
        <strong>smartphones</strong> category to reveal the conditional warranty field.
      </p>
    </section>

    @if (loadingConfig()) {
      <section class="panel loading-panel">Loading form configuration...</section>
    } @else if (loadError()) {
      <section class="panel error-panel">
        <h3>Could not load the form configuration</h3>
        <p>{{ loadError() }}</p>
      </section>
    } @else if (productForm(); as dynamicForm) {
      <div class="demo-layout">
        <section class="panel">
          <div class="panel-title-row">
            <div>
              <h3>New product</h3>
              <p class="muted-copy">Rendered from <code>public/forms/product-intake.json</code>.</p>
            </div>
            @if (categoriesLoading()) {
              <span class="status-pill">Loading categories</span>
            }
          </div>

          @if (categoryWarning()) {
            <div class="notice notice-warning"><p>{{ categoryWarning() }}</p></div>
          }

          <form [formRoot]="dynamicForm" class="form-grid">
            @for (field of fields(); track field.name) {
              @let currentFieldState = fieldState(field.name)();
              @if (!currentFieldState.hidden()) {
              <div class="field-group full-width">
                <label [for]="field.name">
                  {{ field.label }}
                  @if (field.required) { <span class="required-mark">*</span> }
                </label>

                @switch (field.kind) {
                  @case ('textarea') {
                    <textarea
                      [id]="field.name"
                      rows="4"
                      [placeholder]="field.placeholder ?? ''"
                      [formField]="asTextField(field.name)"
                    ></textarea>
                  }
                  @case ('number') {
                    <input
                      [id]="field.name"
                      type="number"
                      [formField]="asNumberField(field.name)"
                    />
                  }
                  @case ('select') {
                    <select [id]="field.name" [formField]="asTextField(field.name)">
                      <option value="">{{ field.placeholder ?? 'Select an option' }}</option>
                      @for (category of categories(); track category.slug) {
                        <option [value]="category.slug">{{ category.name }}</option>
                      }
                    </select>
                  }
                  @default {
                    <input
                      [id]="field.name"
                      type="text"
                      [placeholder]="field.placeholder ?? ''"
                      [formField]="asTextField(field.name)"
                    />
                  }
                }

                @if (currentFieldState.touched() && currentFieldState.invalid()) {
                  @for (error of currentFieldState.errors(); track $index) {
                    <small class="field-error">{{ error.message }}</small>
                  }
                }
              </div>
              }
            }

            <div class="form-actions full-width">
              <button class="primary-button" type="submit" [disabled]="dynamicForm().submitting() || categoriesLoading()">
                @if (dynamicForm().submitting()) { Sending to DummyJSON... } @else { Create demo product }
              </button>
              <button class="secondary-button" type="button" (click)="reset(dynamicForm)">Reset</button>
            </div>
          </form>

          @if (apiError()) {
            <div class="notice notice-warning"><p>{{ apiError() }}</p></div>
          }

          @if (dynamicForm().errors().length > 0) {
            <div class="notice notice-warning">
              @for (error of dynamicForm().errors(); track $index) {
                <p>{{ error.message }}</p>
              }
            </div>
          }
        </section>

        <aside class="side-column">
          <section class="panel compact-panel">
            <h3>Live form model</h3>
            <pre class="json-preview">{{ productModel() | json }}</pre>
          </section>

          <section class="panel compact-panel">
            <h3>Where the data comes from</h3>
            <p><strong>Form configuration</strong><br /><code>GET /forms/product-intake.json</code></p>
            <p><strong>Category options</strong><br /><code>GET https://dummyjson.com/products/categories</code></p>
            <p><strong>Submission demo</strong><br /><code>POST https://dummyjson.com/products/add</code></p>
            <p class="muted-copy">The warranty field is shown only for smartphones. Hidden field values remain in the model, so the submit action explicitly removes it for other categories.</p>
          </section>

          @if (createdProduct(); as product) {
            <section class="panel success-panel">
              <h3>API response</h3>
              <p>DummyJSON returned a simulated product record (ID {{ product.id }}).</p>
              <pre class="json-preview">{{ product | json }}</pre>
            </section>
          }
        </aside>
      </div>
    }

    <aside class="notice notice-info api-disclaimer">
      <strong>Public API behaviour</strong>
      <p>
        DummyJSON is a test API. Its add-product endpoint simulates a POST response;
        it does not permanently save the product. Do not use this endpoint for real data.
      </p>
    </aside>
  `,
})
export class DynamicFormDemo implements OnInit {
	private readonly http = inject(HttpClient);
	private readonly injector = inject(Injector);

	readonly loadingConfig = signal(true);
	readonly loadError = signal<string | null>(null);
	readonly fields = signal<DynamicFieldConfig[]>([]);
	readonly productModel = signal<DynamicProductModel>({});
	readonly productForm = signal<FieldTree<DynamicProductModel> | null>(null);

	readonly categories = signal<ProductCategory[]>([]);
	readonly categoriesLoading = signal(true);
	readonly categoryWarning = signal<string | null>(null);
	readonly createdProduct = signal<CreatedProduct | null>(null);
	readonly apiError = signal<string | null>(null);

	ngOnInit(): void {
		void this.initialize();
		void this.loadCategories();
	}

	private async initialize(): Promise<void> {
		try {
			const config = await firstValueFrom(
				this.http.get<DynamicFieldConfig[]>('/forms/product-intake.json'),
			);

			if (!isValidDynamicConfig(config)) {
				throw new Error('The form configuration is empty, contains duplicate names, or has an unsupported field definition.');
			}

			this.fields.set(config);
			this.productModel.set(createModel(config));

			const tree = form(
				this.productModel,
				createSchema(config),
				{
					injector: this.injector,
					submission: {
						action: async (field) => {
							this.apiError.set(null);
							this.createdProduct.set(null);

							try {
								const payload = { ...field().value() };
								// Hidden fields keep their model value. Exclude warranty data when it
								// is not relevant to the selected product category.
								if (payload['category'] !== 'smartphones') {
									delete payload['warrantyMonths'];
								}

								const response = await firstValueFrom(
									this.http.post<CreatedProduct>(
										'https://dummyjson.com/products/add',
										payload,
									),
								);
								this.createdProduct.set(response);
								return;
							} catch (error) {
								console.error('DummyJSON product submission failed:', error);
								this.apiError.set('The demo API request failed. Check your network and try again.');
								return {
									kind: 'apiSubmissionFailed',
									message: 'The demo product could not be submitted.',
								};
							}
						},
					},
				},
			);

			this.productForm.set(tree);
		} catch (error) {
			console.error('Dynamic form initialization failed:', error);
			this.loadError.set('The JSON form configuration could not be loaded.');
		} finally {
			this.loadingConfig.set(false);
		}
	}

	private async loadCategories(): Promise<void> {
		try {
			const result = await firstValueFrom(
				this.http.get<ProductCategory[]>('https://dummyjson.com/products/categories'),
			);
			this.categories.set(result);
		} catch (error) {
			console.error('Could not load product categories:', error);
			this.categories.set([
				{ slug: 'beauty', name: 'Beauty', url: '' },
				{ slug: 'furniture', name: 'Furniture', url: '' },
				{ slug: 'groceries', name: 'Groceries', url: '' },
				{ slug: 'laptops', name: 'Laptops', url: '' },
				{ slug: 'smartphones', name: 'Smartphones', url: '' },
			]);
			this.categoryWarning.set('The category API is unavailable. A small local fallback list is being used.');
		} finally {
			this.categoriesLoading.set(false);
		}
	}

	private requireForm(): FieldTree<DynamicProductModel> {
		const tree = this.productForm();
		if (!tree) {
			throw new Error('The dynamic form has not been initialized.');
		}
		return tree;
	}

	asTextField(name: string): Field<string> {
		return this.requireForm()[name] as unknown as Field<string>;
	}

	asNumberField(name: string): Field<number | null> {
		return this.requireForm()[name] as unknown as Field<number | null>;
	}

	fieldState(name: string): Field<string | number | null> {
		return this.requireForm()[name] as unknown as Field<string | number | null>;
	}

	reset(tree: FieldTree<DynamicProductModel>): void {
		tree().reset(createModel(this.fields()));
		this.createdProduct.set(null);
		this.apiError.set(null);
		// Keep the parameter so the template action remains explicit about which form is reset.
		void tree;
	}
}
