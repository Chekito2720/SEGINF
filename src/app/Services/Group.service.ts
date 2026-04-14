import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, AppGroup, GroupMember, Permission } from '../models/Auth.model';

const GW = environment.apiGatewayUrl;

export interface CreateGroupDto {
  nombre:       string;
  descripcion?: string;
  nivel?:       string;
  color:        string;
  model?:       string;
}

export interface UpdateGroupDto {
  nombre?:      string;
  descripcion?: string;
  nivel?:       string;
  color?:       string;
  model?:       string;
}

@Injectable({ providedIn: 'root' })
export class GroupService {

  private _groups       = signal<AppGroup[]>([]);
  private _groupMembers = signal<GroupMember[]>([]);

  constructor(private http: HttpClient) {}

  // ── Estado reactivo ───────────────────────────────────────────────
  getGroups(): AppGroup[]            { return this._groups(); }
  getGroupById(id: string): AppGroup | undefined {
    return this._groups().find(g => g.id === id);
  }
  getGroupMembers(): GroupMember[]   { return this._groupMembers(); }

  // ── Grupos ────────────────────────────────────────────────────────
loadUserGroups(): Observable<AppGroup[]> {
  return this.http.get<any>(`${GW}/grupos/mis-grupos`).pipe(
    map(r => {
      const arr = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      return arr.map(mapGroup);
    }),
    tap(groups => this._groups.set(groups)),
  );
}

  loadAllGroups(): Observable<AppGroup[]> {
    return this.http.get<{ data: unknown[] }>(`${GW}/grupos?limit=100`).pipe(
      map(r => (r.data ?? []).map(mapGroup)),
    );
  }

  createGroup(dto: CreateGroupDto): Observable<AppGroup> {
    return this.http.post<ApiResponse<unknown[]>>(`${GW}/grupos`, dto).pipe(
      map(r => mapGroup((r.data as unknown[])[0])),
      tap(g => this._groups.update(list => [...list, g])),
    );
  }

  updateGroup(id: string, dto: UpdateGroupDto): Observable<AppGroup> {
    return this.http.patch<ApiResponse<unknown[]>>(`${GW}/grupos/${id}`, dto).pipe(
      map(r => mapGroup((r.data as unknown[])[0])),
      tap(updated => this._groups.update(list =>
        list.map(g => g.id === id ? updated : g)
      )),
    );
  }

  deleteGroup(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${GW}/grupos/${id}`).pipe(
      map(() => void 0),
      tap(() => this._groups.update(list => list.filter(g => g.id !== id))),
    );
  }

  // ── Miembros ──────────────────────────────────────────────────────
  loadGroupMembers(groupId: string): Observable<GroupMember[]> {
    return this.http.get<ApiResponse<unknown[]>>(`${GW}/grupos/${groupId}/miembros`).pipe(
      map(r => r.data.map(mapMember)),
      tap(members => this._groupMembers.set(members)),
    );
  }

  addMember(groupId: string, usuarioId: string): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${GW}/grupos/${groupId}/miembros`, { usuarioId }).pipe(
      map(() => void 0),
    );
  }

  removeMember(groupId: string, userId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${GW}/grupos/${groupId}/miembros/${userId}`).pipe(
      map(() => void 0),
      tap(() => this._groupMembers.update(list => list.filter(m => m.id !== userId))),
    );
  }

  // ── Permisos de usuario en grupo ──────────────────────────────────
  getUserGroupPermissions(groupId: string, userId: string): Observable<Permission[]> {
    return this.http.get<ApiResponse<unknown[]>>(
      `${GW}/grupos/${groupId}/miembros/${userId}/permisos`
    ).pipe(map(r => ((r.data as any)[0]?.permisosGrupo ?? []) as Permission[]));
  }

  updateUserGroupPermissions(groupId: string, userId: string, permissions: Permission[]): Observable<void> {
    return this.http.put<ApiResponse<void>>(
      `${GW}/grupos/${groupId}/miembros/${userId}/permisos`,
      { permisos: permissions }
    ).pipe(map(() => void 0));
  }

  updateGroupDefaultPermissions(groupId: string, permissions: Permission[]): Observable<void> {
    return this.http.put<ApiResponse<void>>(
      `${GW}/grupos/${groupId}/permisos-default`,
      { permisos: permissions }
    ).pipe(map(() => void 0));
  }

  resetUserGroupPermissions(groupId: string, userId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(
      `${GW}/grupos/${groupId}/miembros/${userId}/permisos`
    ).pipe(map(() => void 0));
  }

  getMyPermissionsInGroup(groupId: string): Observable<Permission[]> {
    return this.http.get<ApiResponse<Permission[]>>(
      `${GW}/grupos/${groupId}/my-permissions`
    ).pipe(map(r => r.data));
  }

  /** Color determinista para un UUID */
  colorFor(id: string): string {
    const n = [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
    return ['#7c6af7','#38bdf8','#4ade80','#f59e0b','#f87171'][n % 5];
  }
}

// ── Mappers ───────────────────────────────────────────────────────
function mapGroup(raw: unknown): AppGroup {
  const r = raw as Record<string, unknown>;
  return {
    id:                 String(r['id']          ?? ''),
    nombre:             String(r['nombre']      ?? ''),
    nivel:              r['nivel']       != null ? String(r['nivel'])       : undefined,
    descripcion:        r['descripcion'] != null ? String(r['descripcion']) : undefined,
    color:              String(r['color']        ?? '#1e1b4b'),
    model:              r['model']       != null ? String(r['model'])       : undefined,
    creatorId:          r['creator_id']  != null ? String(r['creator_id'])  : undefined,
    createdAt:          r['creado_en']   != null ? String(r['creado_en'])   : undefined,
    memberCount:        typeof r['totalMiembros'] === 'number' ? r['totalMiembros']
                      : typeof r['member_count']  === 'number' ? r['member_count'] : undefined,
    ticketCount:        typeof r['totalTickets']  === 'number' ? r['totalTickets']
                      : typeof r['ticket_count']  === 'number' ? r['ticket_count'] : undefined,
    defaultPermissions: Array.isArray(r['permisos_default'])
      ? r['permisos_default'] as Permission[]
      : Array.isArray(r['defaultPermissions'])
      ? r['defaultPermissions'] as Permission[]
      : undefined,
  };
}

function mapMember(raw: unknown): GroupMember {
  const r = raw as Record<string, unknown>;
  return {
    id:                   String(r['usuarioId'] ?? r['id'] ?? ''),
    fullName:             String(r['nombre_completo'] ?? r['fullName'] ?? ''),
    username:             String(r['username']        ?? ''),
    email:                String(r['email']           ?? ''),
    permissions:          Array.isArray(r['permisosGlobales'])     ? r['permisosGlobales'] as Permission[]
                        : Array.isArray(r['permissions'])          ? r['permissions']       as Permission[] : undefined,
    effectivePermissions: Array.isArray(r['permisosGrupo'])        ? r['permisosGrupo'] as Permission[]
                        : Array.isArray(r['group_permissions'])    ? r['group_permissions'] as Permission[]
                        : Array.isArray(r['effectivePermissions']) ? r['effectivePermissions'] as Permission[]
                        : [],
    hasOverride:          Boolean(r['has_override'] ?? r['hasOverride'] ?? false),
  };
}
