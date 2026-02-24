import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CheckboxModule,
    MessageModule,
    DividerModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  loading = signal(false);
  errorMessage = signal('');
  rememberMe = false;

  form = new FormBuilder().group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor(private fb: FormBuilder, private router: Router) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  get emailInvalid() {
    const ctrl = this.form.get('email');
    return ctrl?.invalid && ctrl?.touched;
  }

  get passwordInvalid() {
    const ctrl = this.form.get('password');
    return ctrl?.invalid && ctrl?.touched;
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');
    // Simulate API call
    await new Promise(r => setTimeout(r, 1500));
    this.loading.set(false);
    // this.router.navigate(['/dashboard']);
    console.log('Login:', this.form.value);
  }
}