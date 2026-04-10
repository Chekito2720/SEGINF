import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService }     from './Services/Auth.service';
import { PERMISSION_SETS } from './models/Auth.model';

// Guard: requiere estar logueado
const authGuard = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/auth/login']);
};

// Guard: solo superadmin (tiene todos los permisos del conjunto superadmin)
const superadminGuard = () => {
  const auth    = inject(AuthService);
  const router  = inject(Router);
  const payload = auth.getPayload();
  const perms = payload ? ((payload.permisos ?? payload.permissions) as string[]) : [];
  const isSuper = !!payload && PERMISSION_SETS['superadmin'].every(p => perms.includes(p));
  if (isSuper) return true;
  return router.createUrlTree(['/home']);
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
      { path: '',            loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent) },
      { path: 'kanban',      loadComponent: () => import('./pages/kanban/kanban').then(m => m.KanbanComponent) },
      { path: 'tickets',     loadComponent: () => import('./pages/ticket-list/ticket-list').then(m => m.TicketListComponent) },
      { path: 'ticket/:id',  loadComponent: () => import('./pages/ticket-detail/ticket-detail').then(m => m.TicketDetailComponent) },
      { path: 'profile',     loadComponent: () => import('./pages/profile/profile').then(m => m.ProfileComponent) },
      { path: 'profile/:id', loadComponent: () => import('./pages/profile/profile').then(m => m.ProfileComponent) },
      { path: 'groups',      loadComponent: () => import('./pages/groups/groups').then(m => m.GroupsComponent) },
      { path: 'user',        loadComponent: () => import('./pages/user/user').then(m => m.UserComponent) },
      { path: 'admin',       canActivate: [superadminGuard], loadComponent: () => import('./pages/admin/admin').then(m => m.AdminComponent) },
    ]
  },
  { path: '**', redirectTo: '' }
];
