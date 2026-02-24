import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';

// Contraseña: mínimo 10 caracteres, al menos 1 mayúscula, 1 número y 1 símbolo especial (!@#$%^&*)
function strongPasswordValidator(control: AbstractControl): ValidationErrors | null {
  const value: string = control.value || '';
  const hasMinLength  = value.length >= 10;
  const hasUppercase  = /[A-Z]/.test(value);
  const hasNumber     = /[0-9]/.test(value);
  const hasSymbol     = /[!@#$%^&*]/.test(value);

  if (!hasMinLength || !hasUppercase || !hasNumber || !hasSymbol) {
    return {
      weakPassword: {
        minLength:  !hasMinLength,
        uppercase:  !hasUppercase,
        number:     !hasNumber,
        symbol:     !hasSymbol,
      }
    };
  }
  return null;
}

// Las contraseñas deben coincidir
function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirm  = control.get('confirmPassword');
  if (password && confirm && password.value !== confirm.value) {
    return { passwordMismatch: true };
  }
  return null;
}

// Debe ser mayor de edad (>= 18 años)
function adultValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const birthDate = new Date(control.value);
  const today     = new Date();
  const age       = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const isAdult   = age > 18 || (age === 18 && monthDiff >= 0 && today.getDate() >= birthDate.getDate());
  return isAdult ? null : { notAdult: true };
}

// Solo números y longitud entre 8 y 15 dígitos
function phoneValidator(control: AbstractControl): ValidationErrors | null {
  const value: string = control.value || '';
  if (!/^\d{8,15}$/.test(value)) return { invalidPhone: true };
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    MessageModule,
  ],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {
  loading        = signal(false);
  successMessage = signal('');
  errorMessage   = signal('');

  form: any;

  constructor(private fb: FormBuilder, private router: Router) {
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

  isInvalid(field: string) {
    const ctrl = this.form.get(field);
    return ctrl?.invalid && ctrl?.touched;
  }

  get passwordMismatch() {
    return this.form.errors?.['passwordMismatch'] && this.form.get('confirmPassword')?.touched;
  }

  // Mensajes de error detallados para la contraseña
  get passwordErrors(): string[] {
    const errors = this.form.get('password')?.errors?.['weakPassword'];
    if (!errors) return [];
    const msgs: string[] = [];
    if (errors.minLength)  msgs.push('Mínimo 10 caracteres');
    if (errors.uppercase)  msgs.push('Al menos una mayúscula');
    if (errors.number)     msgs.push('Al menos un número');
    if (errors.symbol)     msgs.push('Al menos un símbolo (!@#$%^&*)');
    return msgs;
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');
    await new Promise(r => setTimeout(r, 1200));
    this.loading.set(false);
    this.successMessage.set('¡Cuenta creada exitosamente! Ya puedes iniciar sesión.');
    console.log('Register:', this.form.value);
  }
}