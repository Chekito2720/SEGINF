// ═══════════════════════════════════════════════════════════════════
// AuthService  —  autenticación HTTP via API Gateway
//
// Flujo:
//   login()       → POST /auth/login → guarda token en cookie, carga permisos
//   selectGroup() → guarda grupo en cookie, refresca permisos del grupo
//   logout()      → POST /auth/logout, borra cookies y limpia estado
//   restore()     → rehidrata sesión desde cookie al iniciar la app
// ═══════════════════════════════════════════════════════════════════
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap, catchError, of } from 'rxjs';
import {
  AppUser, AppGroup, LoginResponse, ApiResponse, Permission,
} from '../models/Auth.model';
import { JwtService } from './Jwt.service';
import { PermissionsService } from './Permissions.service';
import { GroupService } from './Group.service';
import { mapUser } from './User.service';
import { environment } from '../../environments/environment';

const GW          = environment.apiGatewayUrl;
const TOKEN_COOKIE = 'miapp_token';
const GROUP_COOKIE = 'miapp_group';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private _currentUser  = signal<AppUser  | null>(null);
  private _currentGroup = signal<AppGroup | null>(null);
  private _userGroups   = signal<AppGroup[]>([]);

  constructor(
    private http:      HttpClient,
    private jwtSvc:    JwtService,
    private permsSvc:  PermissionsService,
    private groupSvc:  GroupService,
  ) {
    this.restore();
  }

  // ── LOGIN ─────────────────────────────────────────────────────────
  login(email: string, password: string): Observable<{ user: AppUser; groups: AppGroup[] }> {
    return this.http.post<ApiResponse<LoginResponse>>(`${GW}/auth/login`, { email, password }).pipe(
      map(r => (r.data as unknown as LoginResponse[])[0] ?? (r.data as unknown as LoginResponse)),
      tap(data => {
        this._storeToken(data.token);
        const user = mapUser(data.user as unknown as Record<string, unknown>);
        this._currentUser.set(user);
        this._userGroups.set(data.groups ?? []);
        this.permsSvc.loadFromToken(data.token, this.jwtSvc);
      }),
      map(data => ({
        user:   mapUser(data.user as unknown as Record<string, unknown>),
        groups: data.groups ?? [],
      })),
    );
  }

  // ── REGISTER ──────────────────────────────────────────────────────
  register(dto: {
    fullName: string; username: string; email: string; password: string;
    phone?: string; birthDate?: string; address?: string; confirmPassword?: string;
  }): Observable<AppUser> {
    const body = {
      fullName:        dto.fullName,
      username:        dto.username,
      email:           dto.email,
      password:        dto.password,
      confirmPassword: dto.confirmPassword,
      phone:           dto.phone,
      birthDate:       dto.birthDate,
      address:         dto.address,
    };
    return this.http.post<ApiResponse<AppUser>>(`${GW}/auth/register`, body).pipe(
      map(r => mapUser(r.data as unknown as Record<string, unknown>)),
    );
  }

  // ── LOGOUT ────────────────────────────────────────────────────────
  logout(): void {
    // Notificar al servidor (best-effort)
    this.http.post(`${GW}/auth/logout`, {}).pipe(catchError(() => of(null))).subscribe();
    this._clearSession();
  }

  // ── SELECCIONAR GRUPO ─────────────────────────────────────────────
  selectGroup(groupId: string): void {
    const group = this._userGroups().find(g => g.id === groupId) ?? null;
    this._currentGroup.set(group);
    if (group) {
      this._saveCookie(GROUP_COOKIE, groupId);
      this.permsSvc.refreshPermissionsForGroup(groupId, this._currentUser()?.id ?? '');
      this.groupSvc.loadGroupMembers(groupId).subscribe();
    } else {
      this._deleteCookie(GROUP_COOKIE);
    }
  }

  // ── REFRESH PERMISSIONS (p.ej. tras editar permisos en admin) ─────
  refreshPermissions(): void {
    const g = this._currentGroup();
    if (g) this.permsSvc.refreshPermissionsForGroup(g.id, this._currentUser()?.id ?? '');
  }

  // ── RESTAURAR SESIÓN ──────────────────────────────────────────────
  restore(): void {
    const token = this._getToken();
    if (!token || this.jwtSvc.isExpired(token)) {
      this._clearSession();
      return;
    }

    const payload = this.jwtSvc.decode(token);
    if (!payload) { this._clearSession(); return; }

    // Rehidratar usuario y permisos desde el token
    const user: AppUser = {
      id:       payload.sub,
      fullName: payload.nombre_completo ?? payload.fullName ?? payload.username ?? '',
      username: payload.username,
      email:    payload.email,
    };
    this._currentUser.set(user);
    this.permsSvc.loadFromToken(token, this.jwtSvc);

    // Restaurar grupos del usuario
    this.groupSvc.loadUserGroups().subscribe({
      next: groups => {
        this._userGroups.set(groups);
        const savedGroupId = this._getCookie(GROUP_COOKIE);
        if (savedGroupId) {
          const group = groups.find(g => g.id === savedGroupId) ?? null;
          if (group) {
            this._currentGroup.set(group);
            this.permsSvc.refreshPermissionsForGroup(group.id, user.id);
            this.groupSvc.loadGroupMembers(group.id).subscribe();
          }
        }
      },
      error: () => {},
    });
  }

  // ── GETTERS ───────────────────────────────────────────────────────
  getUser():    AppUser  | null { return this._currentUser();  }
  getGroup():   AppGroup | null { return this._currentGroup(); }
  isLoggedIn(): boolean         { return !!this._currentUser(); }
  getToken():   string  | null  { return this._getToken(); }

  getPayload() {
    const t = this._getToken();
    return t ? this.jwtSvc.decode(t) : null;
  }

  getUserGroups(): AppGroup[] {
    return this._userGroups();
  }

  // ── Cookie helpers ────────────────────────────────────────────────
  private _storeToken(token: string): void {
    this._saveCookie(TOKEN_COOKIE, token, 1);
  }

  private _getToken(): string | null {
    return this._getCookie(TOKEN_COOKIE);
  }

  private _saveCookie(name: string, value: string, days = 7): void {
    const expires = new Date();
    expires.setDate(expires.getDate() + days);
    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
  }

  private _getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  private _deleteCookie(name: string): void {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }

  private _clearSession(): void {
    this._deleteCookie(TOKEN_COOKIE);
    this._deleteCookie(GROUP_COOKIE);
    this._currentUser.set(null);
    this._currentGroup.set(null);
    this._userGroups.set([]);
    this.permsSvc.clearPermissions();
  }
}
