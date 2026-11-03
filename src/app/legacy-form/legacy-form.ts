import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-legacy-form',
  imports: [],
  templateUrl: './legacy-form.html',
  styleUrl: './legacy-form.scss',
})
export class LegacyForm {
  // state lives inside formgroup
  registrationForm = new FormGroup({
    name: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
  });

  // to access data
  data = this.registrationForm.value;

  ngOnInit() {
    // modify the name field
    this.registrationForm.patchValue({
      name: 'Sagar',
    });

    this.registrationForm.controls.name.valueChanges.subscribe((value) => {
      this.characterCount = value?.length ?? 0;
    });
  }

  // Show character count
  characterCount = 0;
}
