import { Component, computed, signal } from '@angular/core';
// import { form } from '@angular/forms/signals';
import { signalForm } from '@angular/forms/signals';

@Component({
  selector: 'app-signal-form',
  imports: [],
  templateUrl: './signal-form.html',
  styleUrl: './signal-form.scss',
})
export class SignalForm {
  // writable signal model owns the form values
  registrationModel = signal({
    name: '',
    email: '',
  });

  registrationForm = signalForm(this.registrationModel);
  characterCount = signal<0>;

  ngOnInit() {
    const data = this.registrationModel();

    this.registrationModel.update((value) => ({
      ...value,
      name: 'Sagar',
    }));

    this.characterCount = computed(() => {
      return this.registrationForm.name().length;
    });
  }
}
