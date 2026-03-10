import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './Services/Auth.service';

// Guard simple: requiere estar logueado y tener grupo seleccionado
const authGuard = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn() && auth.getGroup()) return true;
  return router.createUrlTree(['/auth/login']);
};

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/landing/landing').then(m => m.LandingComponent)
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./pages/auth/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./pages/auth/register/register').then(m => m.RegisterComponent)
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () => import('./Layout/main-layout/main-layout').then(m => m.MainLayoutComponent),
    children: [
      { path: '',           loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent) },
      { path: 'rud',        loadComponent: () => import('./pages/rud/rud').then(m => m.RudComponent)        },
      { path: 'crud',       loadComponent: () => import('./pages/crud/crud').then(m => m.CrudComponent)     },
      { path: 'groups',     loadComponent: () => import('./pages/groups/groups').then(m => m.GroupsComponent) },
      { path: 'user',       loadComponent: () => import('./pages/user/user').then(m => m.UserComponent)     },
    ]
  },
  { path: '**', redirectTo: '' }
];