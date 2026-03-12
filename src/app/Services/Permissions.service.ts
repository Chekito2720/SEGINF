// ═══════════════════════════════════════════════════════════════════
// PermissionsService  —  fuente única de verdad: el JWT
//
// Los permisos NUNCA se leen del objeto AppUser en memoria.
// Se extraen exclusivamente del payload del token verificado.
// Esto garantiza que cualquier cambio de permisos sólo surte efecto
// cuando se emite un nuevo token (refreshToken en AuthService).
// ═══════════════════════════════════════════════════════════════════
import { Injectable, signal } from '@angular/core';
import { Permission }         from '../models/Auth.model';
import { JwtService }         from './Jwt.service';

@Injectable({ providedIn: 'root' })
export class PermissionsService {

  // Signal privada — solo actualizable via loadFromToken
  private _permissions = signal<Permission[]>([]);

  // ── Cargar desde token (llamado por AuthService) ──────────────────
  loadFromToken(token: string, jwtSvc: JwtService): void {
    const payload = jwtSvc.verify(token);
    if (!payload) {
      this._permissions.set([]);
      return;
    }
    this._permissions.set(payload.permissions as Permission[]);
  }

  // ── Limpiar (logout) ──────────────────────────────────────────────
  clearPermissions(): void {
    this._permissions.set([]);
  }

  // ── Consultas ─────────────────────────────────────────────────────
  hasPermission(p: Permission): boolean {
    return this._permissions().includes(p);
  }

  hasAnyPermission(perms: Permission[]): boolean {
    return perms.some(p => this.hasPermission(p));
  }

  hasAllPermissions(perms: Permission[]): boolean {
    return perms.every(p => this.hasPermission(p));
  }

  getPermissions(): Permission[] {
    return this._permissions();
  }

  // ── Deprecated: solo para compatibilidad con tests legacy ─────────
  /** @deprecated Use loadFromToken. Evita llamar directamente. */
  setPermissions(perms: Permission[]): void {
    this._permissions.set(perms);
  }
}