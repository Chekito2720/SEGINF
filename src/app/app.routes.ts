import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/landing/landing').then(m => m.LandingComponent)
  },
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./pages/auth/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./pages/auth/register/register').then(m => m.RegisterComponent)
  },
  {
 
    path: 'home',
    loadComponent: () =>
      import('./Layout/main-layout/main-layout').then(m => m.MainLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/home/home').then(m => m.HomeComponent)
      },
    ]
  },
  { path: '**', redirectTo: '' }
];