import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const emailLikeValidator = (): ValidatorFn => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) {
      return null;
    }
    return emailRegex.test(value) ? null : { emailLike: true };
  };
};

export const minTrimmedLengthValidator = (minLength: number): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) {
      return null;
    }
    return value.length >= minLength ? null : { minTrimmedLength: { minLength } };
  };
};
