import { Injectable, signal } from '@angular/core';
import { AppUser, AppGroup, USERS, GROUPS } from '../models/Auth.model';
import { PermissionsService } from './Permissions.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUser  = signal<AppUser | null>(null);
  private currentGroup = signal<AppGroup | null>(null);

  constructor(private permsSvc: PermissionsService) {}

  // ─── Login ────────────────────────────────────────────────────────────────
  login(email: string, password: string): AppUser | null {
    const user = USERS.find(u => u.email === email && u.password === password);
    if (!user) return null;

    this.currentUser.set(user);
    this.permsSvc.setPermissions(user.permissions);
    return user;
  }

  // ─── Logout ───────────────────────────────────────────────────────────────
  logout() {
    this.currentUser.set(null);
    this.currentGroup.set(null);
    this.permsSvc.clearPermissions();
  }

  // ─── Seleccionar grupo ────────────────────────────────────────────────────
  selectGroup(groupId: number) {
    const group = GROUPS.find(g => g.id === groupId) ?? null;
    this.currentGroup.set(group);
  }

  // ─── Getters ──────────────────────────────────────────────────────────────
  getUser():  AppUser  | null { return this.currentUser();  }
  getGroup(): AppGroup | null { return this.currentGroup(); }
  isLoggedIn(): boolean       { return !!this.currentUser(); }

  // Grupos a los que pertenece el usuario logueado
  getUserGroups(): AppGroup[] {
    const user = this.currentUser();
    if (!user) return [];
    return GROUPS.filter(g => user.groupIds.includes(g.id));
  }
}