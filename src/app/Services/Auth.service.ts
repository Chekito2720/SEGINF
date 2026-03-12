// ═══════════════════════════════════════════════════════════════════
// AuthService  —  login / logout / sesión persistida via JWT simulado
//
// Flujo:
//   login()  → busca usuario en USERS, genera JWT (JwtService.generate)
//              guarda token en localStorage, actualiza señales reactivas
//              PermissionsService lee el token, nunca el array del usuario
//
//   restore() → llamado en APP_INITIALIZER; verifica el token guardado
//               y rehidrata la sesión sin pedir credenciales de nuevo
//
//   logout() → borra token de localStorage, limpia señales y permisos
// ═══════════════════════════════════════════════════════════════════
import { Injectable, signal } from '@angular/core';
import { AppUser, AppGroup, USERS, GROUPS } from '../models/Auth.model';
import { JwtService, JwtPayload } from './Jwt.service';
import { PermissionsService }     from './Permissions.service';

const TOKEN_KEY = 'miapp_token';
const GROUP_KEY = 'miapp_group';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private currentUser  = signal<AppUser  | null>(null);
  private currentGroup = signal<AppGroup | null>(null);

  constructor(
    private jwtSvc:   JwtService,
    private permsSvc: PermissionsService,
  ) {
    this.restore();
  }

  // ── LOGIN ─────────────────────────────────────────────────────────
  login(email: string, password: string): AppUser | null {
    const user = USERS.find(u => u.email === email && u.password === password);
    if (!user) return null;

    const token = this.jwtSvc.generate({
      sub:         user.id,
      username:    user.username,
      email:       user.email,
      fullName:    user.fullName,
      groupIds:    user.groupIds,
      permissions: user.permissions,
    });

    localStorage.setItem(TOKEN_KEY, token);
    this._hydrateFromPayload(this.jwtSvc.verify(token)!);
    return user;
  }

  // ── LOGOUT ────────────────────────────────────────────────────────
  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(GROUP_KEY);
    this.currentUser.set(null);
    this.currentGroup.set(null);
    this.permsSvc.clearPermissions();
  }

  // ── RESTAURAR SESIÓN (APP_INITIALIZER / constructor) ─────────────
  restore(): boolean {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;

    const payload = this.jwtSvc.verify(token);
    if (!payload) {
      // Token expirado o inválido → limpiar
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(GROUP_KEY);
      return false;
    }

    this._hydrateFromPayload(payload);
    return true;
  }

  // ── SELECCIONAR GRUPO ─────────────────────────────────────────────
  selectGroup(groupId: number) {
    const group = GROUPS.find(g => g.id === groupId) ?? null;
    this.currentGroup.set(group);
    if (group) localStorage.setItem(GROUP_KEY, String(groupId));
    else        localStorage.removeItem(GROUP_KEY);
  }

  // ── REFRESH TOKEN (re-emitir con permisos actualizados) ───────────
  // Llamado por AdminComponent tras guardar permisos
  refreshToken(userId: number) {
    const user = USERS.find(u => u.id === userId);
    if (!user) return;

    const token = this.jwtSvc.generate({
      sub:         user.id,
      username:    user.username,
      email:       user.email,
      fullName:    user.fullName,
      groupIds:    user.groupIds,
      permissions: user.permissions,
    });

    localStorage.setItem(TOKEN_KEY, token);
    // Si es el usuario activo, rehidratar permisos
    if (this.currentUser()?.id === userId) {
      this.permsSvc.loadFromToken(token, this.jwtSvc);
    }
  }

  // ── GETTERS ───────────────────────────────────────────────────────
  getUser():     AppUser  | null { return this.currentUser();  }
  getGroup():    AppGroup | null { return this.currentGroup(); }
  isLoggedIn():  boolean         { return !!this.currentUser(); }
  getToken():    string  | null  { return localStorage.getItem(TOKEN_KEY); }
  getPayload():  JwtPayload | null {
    const t = this.getToken();
    return t ? this.jwtSvc.verify(t) : null;
  }

  getUserGroups(): AppGroup[] {
    const user = this.currentUser();
    if (!user) return [];
    return GROUPS.filter(g => user.groupIds.includes(g.id));
  }

  // ── PRIVADO ───────────────────────────────────────────────────────
  private _hydrateFromPayload(payload: JwtPayload) {
    // Sincronizar usuario desde USERS (para datos actualizados)
    const user = USERS.find(u => u.id === payload.sub) ?? null;
    this.currentUser.set(user);

    // Permisos SIEMPRE del token, no del objeto usuario
    this.permsSvc.loadFromToken(
      localStorage.getItem(TOKEN_KEY)!,
      this.jwtSvc,
    );

    // Restaurar grupo si estaba guardado
    const savedGroupId = localStorage.getItem(GROUP_KEY);
    if (savedGroupId) {
      const gid   = parseInt(savedGroupId, 10);
      const group = GROUPS.find(g => g.id === gid) ?? null;
      // Solo restaurar si el usuario aún pertenece al grupo
      if (group && user?.groupIds.includes(gid)) {
        this.currentGroup.set(group);
      }
    }
  }
}