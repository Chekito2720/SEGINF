import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule, ReactiveFormsModule, FormBuilder,
  Validators, AbstractControl, ValidationErrors
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule }    from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule }  from 'primeng/password';
import { MessageModule }   from 'primeng/message';
import { AuthService }     from '../../../Services/Auth.service';

function strongPasswordValidator(control: AbstractControl): ValidationErrors | null {
  const value: string = control.value || '';
  const hasMinLength  = value.length >= 10;
  const hasUppercase  = /[A-Z]/.test(value);
  const hasNumber     = /[0-9]/.test(value);
  const hasSymbol     = /[!@#$%^&*]/.test(value);
  if (!hasMinLength || !hasUppercase || !hasNumber || !hasSymbol) {
    return { weakPassword: { minLength: !hasMinLength, uppercase: !hasUppercase, number: !hasNumber, symbol: !hasSymbol } };
  }
  return null;
}

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirm  = control.get('confirmPassword');
  if (password && confirm && password.value !== confirm.value) return { passwordMismatch: true };
  return null;
}

function adultValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const birthDate = new Date(control.value);
  const today     = new Date();
  const age       = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const isAdult   = age > 18 || (age === 18 && monthDiff >= 0 && today.getDate() >= birthDate.getDate());
  return isAdult ? null : { notAdult: true };
}

function phoneValidator(control: AbstractControl): ValidationErrors | null {
  const value: string = control.value || '';
  if (!/^\d{8,15}$/.test(value)) return { invalidPhone: true };
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, RouterLink,
    ButtonModule, InputTextModule, PasswordModule, MessageModule,
  ],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {
  loading        = signal(false);
  successMessage = signal('');
  errorMessage   = signal('');

  form: any;

  constructor(
    private fb:      FormBuilder,
    private router:  Router,
    private authSvc: AuthService,
  ) {
    this.form = this.fb.group({
      fullName:        ['', [Validators.required, Validators.minLength(3)]],
      username:        ['', [Validators.required, Validators.minLength(3)]],
      email:           ['', [Validators.required, Validators.email]],
      phone:           ['', [Validators.required, phoneValidator]],
      birthDate:       ['', [Validators.required, adultValidator]],
      address:         ['', Validators.required],
      password:        ['', [Validators.required, strongPasswordValidator]],
      confirmPassword: ['', Validators.required],
    }, { validators: passwordMatchValidator });
  }

  onlyNumbers(event: KeyboardEvent): boolean { return /[0-9]/.test(event.key); }

  blockPasteLetters(event: ClipboardEvent): void {
    const pasted = event.clipboardData?.getData('text') || '';
    if (!/^\d+$/.test(pasted)) event.preventDefault();
  }

  isInvalid(field: string) {
    const ctrl = this.form.get(field);
    return ctrl?.invalid && ctrl?.touched;
  }

  get passwordMismatch() {
    return this.form.errors?.['passwordMismatch'] && this.form.get('confirmPassword')?.touched;
  }

  get passwordErrors(): string[] {
    const errors = this.form.get('password')?.errors?.['weakPassword'];
    if (!errors) return [];
    const msgs: string[] = [];
    if (errors.minLength) msgs.push('Mínimo 10 caracteres');
    if (errors.uppercase) msgs.push('Al menos una mayúscula');
    if (errors.number)    msgs.push('Al menos un número');
    if (errors.symbol)    msgs.push('Al menos un símbolo (!@#$%^&*)');
    return msgs;
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.loading.set(true);
    this.errorMessage.set('');

    const { fullName, username, email, password, confirmPassword, phone, birthDate, address } = this.form.value;
    this.authSvc.register({ fullName, username, email, password, confirmPassword, phone, birthDate, address }).subscribe({
      next: () => {
        this.loading.set(false);
        this.successMessage.set('¡Cuenta creada exitosamente! Ya puedes iniciar sesión.');
        setTimeout(() => this.router.navigate(['/auth/login']), 2000);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message ?? 'No se pudo crear la cuenta. Intenta de nuevo.');
      },
    });
  }
}
