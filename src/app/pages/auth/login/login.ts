import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';

// Credenciales hardcodeadas
const VALID_USERS = [
  { email: 'admin@miapp.com',   password: 'Admin@12345' },
  { email: 'usuario@miapp.com', password: 'Usuario@12345' },
];

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
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  loading      = signal(false);
  errorMessage = signal('');
  rememberMe   = false;

  form: any;

  constructor(private fb: FormBuilder, private router: Router) {
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
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

    // Simular delay de red
    await new Promise(r => setTimeout(r, 1000));

    const { email, password } = this.form.value;
    const user = VALID_USERS.find(u => u.email === email && u.password === password);

    this.loading.set(false);

    if (user) {
      this.router.navigate(['/home']);
    } else {
      this.errorMessage.set('Correo o contraseña incorrectos.');
    }
  }
}