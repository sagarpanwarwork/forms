import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LegacyForm } from './legacy-form';

describe('LegacyForm', () => {
  let component: LegacyForm;
  let fixture: ComponentFixture<LegacyForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LegacyForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LegacyForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
