import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, AppUser, Permission } from '../models/Auth.model';

const GW = environment.apiGatewayUrl;

export interface CreateUserDto {
  fullName:  string;
  username:  string;
  email:     string;
  password:  string;
  phone?:    string;
  birthDate?: string;
  address?:  string;
}

export interface UpdateUserDto {
  fullName?:  string;
  username?:  string;
  email?:     string;
  password?:  string;
  phone?:     string;
  birthDate?: string;
  address?:   string;
}

@Injectable({ providedIn: 'root' })
export class UserService {

  private _users = signal<AppUser[]>([]);

  constructor(private http: HttpClient) {}

  // ── Estado reactivo ───────────────────────────────────────────────
  getUsers(): AppUser[] { return this._users(); }

  getUserById(id: string): AppUser | undefined {
    return this._users().find(u => u.id === id);
  }

  // ── HTTP ──────────────────────────────────────────────────────────
loadUsers(): Observable<AppUser[]> {
  return this.http.get<any>(`${GW}/usuarios`).pipe(
    map(r => {
      // La respuesta real es: { statusCode, data: { data: [...], total, ... } }
      const inner = r?.data?.data ?? r?.data ?? [];
      const arr = Array.isArray(inner) ? inner : [];
      return arr.map(mapUser);
    }),
    tap(users => this._users.set(users)),
  );
}

  getMe(): Observable<AppUser> {
    return this.http.get<ApiResponse<Record<string, unknown>[]>>(`${GW}/usuarios/me`).pipe(
      map(r => mapUser((r.data as any)[0] ?? r.data)),
    );
  }

  getUser(id: string): Observable<AppUser> {
    return this.http.get<ApiResponse<Record<string, unknown>[]>>(`${GW}/usuarios/${id}`).pipe(
      map(r => mapUser((r.data as any)[0] ?? r.data)),
    );
  }

  updateMe(userId: string, dto: UpdateUserDto): Observable<AppUser> {
    return this.http.patch<ApiResponse<any[]>>(`${GW}/usuarios/${userId}`, dto).pipe(
      map(r => mapUser((r.data as any)[0]?.usuario ?? (r.data as any)[0] ?? r.data)),
    );
  }

  updateUser(id: string, dto: UpdateUserDto): Observable<AppUser> {
    return this.http.patch<ApiResponse<any[]>>(`${GW}/usuarios/${id}`, dto).pipe(
      map(r => mapUser((r.data as any)[0]?.usuario ?? (r.data as any)[0] ?? r.data)),
      tap(updated => this._users.update(list =>
        list.map(u => u.id === id ? updated : u)
      )),
    );
  }

  createUser(dto: CreateUserDto): Observable<AppUser> {
    return this.http.post<ApiResponse<Record<string, unknown>>>(`${GW}/usuarios`, dto).pipe(
      map(r => mapUser(r.data)),
      tap(created => this._users.update(list => [...list, created])),
    );
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${GW}/usuarios/${id}`).pipe(
      map(() => void 0),
      tap(() => this._users.update(list => list.filter(u => u.id !== id))),
    );
  }

  getUserPermissions(id: string): Observable<Permission[]> {
    return this.http.get<ApiResponse<Permission[]>>(`${GW}/usuarios/${id}/permisos`).pipe(
      map(r => r.data),
    );
  }

  updateUserPermissions(id: string, permissions: Permission[]): Observable<void> {
    return this.http.put<ApiResponse<void>>(`${GW}/usuarios/${id}/permisos`, { permisos: permissions }).pipe(
      map(() => void 0),
    );
  }

  /** Convierte el hash de color determinista para un UUID */
  colorFor(id: string): string {
    const n = [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
    return ['#7c6af7','#38bdf8','#4ade80','#f59e0b','#f87171'][n % 5];
  }
}

// ── Mapper API → frontend (snake_case → camelCase) ────────────────
export function mapUser(raw: Record<string, unknown>): AppUser {
  return {
    id:          String(raw['id'] ?? ''),
    fullName:    String(raw['nombre_completo'] ?? raw['fullName'] ?? ''),
    username:    String(raw['username'] ?? ''),
    email:       String(raw['email'] ?? ''),
    phone:       raw['telefono']    != null ? String(raw['telefono'])    : undefined,
    birthDate:   raw['fecha_nacimiento'] != null ? String(raw['fecha_nacimiento']) : undefined,
    address:     raw['direccion']   != null ? String(raw['direccion'])   : undefined,
    lastLogin:   raw['last_login']  != null ? String(raw['last_login'])  : undefined,
    createdAt:   raw['creado_en']   != null ? String(raw['creado_en'])   : undefined,
    permissions: Array.isArray(raw['permisos']) ? raw['permisos'] as Permission[]
              : Array.isArray(raw['permissions']) ? raw['permissions'] as Permission[]
              : undefined,
    groupIds:    Array.isArray(raw['grupo_ids'])  ? raw['grupo_ids']  as string[]
             : Array.isArray(raw['groupIds'])   ? raw['groupIds']   as string[] : undefined,
  };
}
