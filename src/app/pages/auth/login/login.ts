import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { DividerModule } from 'primeng/divider';
import { AuthService } from '../../../Services/Auth.service';
import { AppGroup, AppUser } from '../../../models/Auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, RouterLink,
    ButtonModule, InputTextModule, PasswordModule, CheckboxModule,
    MessageModule, CardModule, TagModule, BadgeModule, DividerModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  // Paso 1 = formulario, Paso 2 = selección de grupo
  step         = signal<1 | 2>(1);
  loading      = signal(false);
  errorMessage = signal('');
  rememberMe   = false;

  loggedUser   = signal<AppUser | null>(null);
  userGroups   = signal<AppGroup[]>([]);

  form: any;

  constructor(
    private fb:       FormBuilder,
    private router:   Router,
    private authSvc:  AuthService,
  ) {
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  get emailInvalid()    { const c = this.form.get('email');    return c?.invalid && c?.touched; }
  get passwordInvalid() { const c = this.form.get('password'); return c?.invalid && c?.touched; }

  // ── Paso 1: autenticar ────────────────────────────────────────────────────
  async onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.loading.set(true);
    this.errorMessage.set('');
    await new Promise(r => setTimeout(r, 900));

    const { email, password } = this.form.value;
    const user = this.authSvc.login(email!, password!);
    this.loading.set(false);

    if (!user) {
      this.errorMessage.set('Correo o contraseña incorrectos.');
      return;
    }

    this.loggedUser.set(user);
    this.userGroups.set(this.authSvc.getUserGroups());
    this.step.set(2);
  }

  // ── Paso 2: elegir grupo ──────────────────────────────────────────────────
  selectGroup(groupId: number) {
    this.authSvc.selectGroup(groupId);
    this.router.navigate(['/home']);
  }

  backToLogin() {
    this.authSvc.logout();
    this.step.set(1);
    this.form.reset();
    this.errorMessage.set('');
  }
}