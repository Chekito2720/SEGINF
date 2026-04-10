// ═══════════════════════════════════════════════════════════════════
// PermissionsService  —  fuente única de verdad para permisos del usuario
//
// Los permisos se cargan desde:
//   1. El payload del JWT (login inicial, permisos globales)
//   2. La API de grupos (refreshPermissionsForGroup → permisos efectivos en el grupo)
// ═══════════════════════════════════════════════════════════════════
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Permission, ApiResponse } from '../models/Auth.model';
import { JwtService } from './Jwt.service';
import { environment } from '../../environments/environment';

const GW = environment.apiGatewayUrl;

@Injectable({ providedIn: 'root' })
export class PermissionsService {

  private _globalPermissions      = signal<Permission[]>([]);
  private _contextualPermissions  = signal<Permission[]>([]);
  private _permissions            = signal<Permission[]>([]);

  constructor(private http: HttpClient) {}

  private _merge(): void {
    const merged = [...new Set([...this._globalPermissions(), ...this._contextualPermissions()])];
    this._permissions.set(merged as Permission[]);
  }

  // ── Cargar desde token ────────────────────────────────────────────
  loadFromToken(token: string, jwtSvc: JwtService): void {
    const payload = jwtSvc.decode(token);
    if (!payload) { this._globalPermissions.set([]); this._permissions.set([]); return; }
    const perms = (payload as any).permisos ?? payload.permissions ?? [];
    this._globalPermissions.set(perms as Permission[]);
    this._merge();
  }

  // ── Refrescar permisos según grupo seleccionado ───────────────────
  // Combina los permisos globales del JWT con los contextuales del grupo
  refreshPermissionsForGroup(groupId: string, userId: string): void {
    this.http.get<ApiResponse<{ permisosGrupo: Permission[] }[]>>(`${GW}/grupos/${groupId}/miembros/${userId}/permisos`)
      .subscribe({
        next:  r => {
          this._contextualPermissions.set((r.data as any)?.[0]?.permisosGrupo ?? []);
          this._merge();
        },
        error: () => { /* mantener permisos actuales si falla */ },
      });
  }

  // ── Limpiar (logout) ──────────────────────────────────────────────
  clearPermissions(): void {
    this._globalPermissions.set([]);
    this._contextualPermissions.set([]);
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

  /** @deprecated Use loadFromToken. Solo para compatibilidad con tests legacy. */
  setPermissions(perms: Permission[]): void {
    this._permissions.set(perms);
  }
}
