import { Injectable, signal } from '@angular/core';
import { Permission } from '../models/Auth.model';

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private userPermissions = signal<Permission[]>([]);

  setPermissions(perms: Permission[]) {
    this.userPermissions.set(perms);
  }

  clearPermissions() {
    this.userPermissions.set([]);
  }

  // ¿Tiene un permiso exacto?
  hasPermission(permiso: Permission): boolean {
    return this.userPermissions().includes(permiso);
  }

  // ¿Tiene al menos uno de estos permisos?
  hasAnyPermission(perms: Permission[]): boolean {
    return perms.some(p => this.hasPermission(p));
  }

  // ¿Tiene TODOS estos permisos?
  hasAllPermissions(perms: Permission[]): boolean {
    return perms.every(p => this.hasPermission(p));
  }

  getPermissions(): Permission[] {
    return this.userPermissions();
  }
}