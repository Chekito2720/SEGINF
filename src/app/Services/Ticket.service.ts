import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ApiResponse, Ticket, TicketStatus, TicketComment, TicketHistory, HistoryAction,
} from '../models/Auth.model';
import { PermissionsService } from './Permissions.service';

const GW = environment.apiGatewayUrl;

export interface CreateTicketDto {
  titulo:        string;
  descripcion?:  string;
  status:        TicketStatus;
  priority:      string;
  groupId:       string;
  assignedToId?: string;
  dueDate?:      string;
}

export type UpdateTicketDto = Partial<{
  titulo:       string;
  descripcion:  string;
  priority:     string;
  assignedToId: string;
  dueDate:      string;
}>;

@Injectable({ providedIn: 'root' })
export class TicketService {

  private _tickets  = signal<Ticket[]>([]);
  private _comments = signal<TicketComment[]>([]);
  private _history  = signal<TicketHistory[]>([]);

  constructor(
    private http:     HttpClient,
    private permsSvc: PermissionsService,
  ) {}

  // ── Estado reactivo (lectura síncrona) ────────────────────────────
  getTickets(): Ticket[] { return this._tickets(); }

  getByGroup(groupId: string): Ticket[] {
    return this._tickets().filter(t => t.groupId === groupId);
  }

  getByGroupAndUser(groupId: string, userId: string): Ticket[] {
    return this._tickets().filter(t => t.groupId === groupId && t.assignedToId === userId);
  }

  /**
   * Acceso a tickets con control de visibilidad:
   * - Con 'tickets_view': ve todos los tickets del grupo
   * - Sin 'tickets_view' (solo 'ticket_view'): solo los asignados al usuario
   */
  getForUser(groupId: string, userId: string): Ticket[] {
    if (this.permsSvc.hasPermission('tickets_view')) {
      return this.getByGroup(groupId);
    }
    return this.getByGroupAndUser(groupId, userId);
  }

  getById(id: string): Ticket | undefined {
    return this._tickets().find(t => t.id === id);
  }

  countByStatus(tickets: Ticket[]): Record<TicketStatus, number> {
    return {
      pendiente:   tickets.filter(t => t.status === 'pendiente').length,
      en_progreso: tickets.filter(t => t.status === 'en_progreso').length,
      hecho:       tickets.filter(t => t.status === 'hecho').length,
      bloqueado:   tickets.filter(t => t.status === 'bloqueado').length,
    };
  }

  // ── Tickets HTTP ──────────────────────────────────────────────────
loadForGroup(groupId: string): Observable<Ticket[]> {
  return this.http.get<any>(`${GW}/tickets?grupoId=${groupId}`).pipe(
    map(r => {
      const arr = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      return arr.map(mapTicket);
    }),
    tap(tickets => {
      this._tickets.update(current => [
        ...current.filter(t => t.groupId !== groupId),
        ...tickets,
      ]);
    }),
  );
}

  fetchById(id: string): Observable<Ticket> {
    return this.http.get<ApiResponse<unknown[]>>(`${GW}/tickets/${id}`).pipe(
      map(r => mapTicket((r.data as unknown[])[0])),
    );
  }

  add(dto: CreateTicketDto): Observable<Ticket> {
    const body = toApiBody(dto as unknown as Record<string, unknown>);
    return this.http.post<ApiResponse<unknown[]>>(`${GW}/tickets`, body).pipe(
      map(r => mapTicket((r.data as unknown[])[0])),
      tap(t => this._tickets.update(list => [...list, t])),
    );
  }

  update(id: string, changes: UpdateTicketDto): Observable<Ticket> {
    const body = toApiBody(changes as Record<string, unknown>);
    return this.http.patch<ApiResponse<unknown[]>>(`${GW}/tickets/${id}`, body).pipe(
      map(r => mapTicket((r.data as unknown[])[0])),
      tap(updated => this._tickets.update(list =>
        list.map(t => t.id === id ? updated : t)
      )),
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${GW}/tickets/${id}`).pipe(
      map(() => void 0),
      tap(() => this._tickets.update(list => list.filter(t => t.id !== id))),
    );
  }

  changeStatus(id: string, status: TicketStatus): Observable<Ticket> {
    return this.http.patch<ApiResponse<unknown[]>>(`${GW}/tickets/${id}/state`, { estado: status }).pipe(
      map(r => mapTicket((r.data as unknown[])[0])),
      tap(updated => this._tickets.update(list =>
        list.map(t => t.id === id ? updated : t)
      )),
    );
  }

  // ── Comentarios HTTP ──────────────────────────────────────────────
  getComments(ticketId: string): TicketComment[] {
    return this._comments().filter(c => c.ticketId === ticketId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

 loadComments(ticketId: string): Observable<TicketComment[]> {
  return this.http.get<any>(`${GW}/tickets/${ticketId}/comentarios`).pipe(
    map(r => {
      const arr = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      return arr.map(mapComment);
    }),
    tap(comments => {
      const others = this._comments().filter(c => c.ticketId !== ticketId);
      this._comments.set([...others, ...comments]);
    }),
  );
}

  addComment(ticketId: string, text: string): Observable<TicketComment> {
    return this.http.post<ApiResponse<unknown[]>>(`${GW}/tickets/${ticketId}/comentarios`, { contenido: text }).pipe(
      map(r => mapComment((r.data as unknown[])[0])),
      tap(c => this._comments.update(list => [...list, c])),
    );
  }

  // ── Historial HTTP ────────────────────────────────────────────────
  getHistory(ticketId: string): TicketHistory[] {
    return this._history().filter(h => h.ticketId === ticketId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  loadHistory(ticketId: string): Observable<TicketHistory[]> {
  return this.http.get<any>(`${GW}/tickets/${ticketId}/historial`).pipe(
    map(r => {
      const arr = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      return arr.map(mapHistory);
    }),
    tap(history => {
      const others = this._history().filter(h => h.ticketId !== ticketId);
      this._history.set([...others, ...history]);
    }),
  );
}
}

// ── Mappers (respuesta backend → modelo frontend) ─────────────────
function mapTicket(raw: unknown): Ticket {
  const r = raw as Record<string, unknown>;
  return {
    id:           String(r['id']           ?? ''),
    titulo:       String(r['titulo']       ?? ''),
    descripcion:  String(r['descripcion']  ?? ''),
    status:       (r['estado']   ?? r['status']   ?? 'pendiente') as TicketStatus,
    priority:     (r['prioridad'] ?? r['priority'] ?? 'media')    as Ticket['priority'],
    groupId:      String(r['grupoId']      ?? r['grupo_id']      ?? ''),
    assignedToId: String(r['asignadoId']   ?? r['asignado_id']   ?? ''),
    createdById:  String(r['autorId']      ?? r['autor_id']      ?? ''),
    createdAt:    String(r['creadoEn']     ?? r['creado_en']     ?? ''),
    dueDate:      r['fechaFinal']  != null ? String(r['fechaFinal'])
                : r['fecha_final'] != null ? String(r['fecha_final']) : undefined,
  };
}

function mapComment(raw: unknown): TicketComment {
  const r = raw as Record<string, unknown>;
  return {
    id:        String(r['id']        ?? ''),
    ticketId:  String(r['ticketId']  ?? r['ticket_id']  ?? ''),
    userId:    String(r['autorId']   ?? r['autor_id']   ?? ''),
    text:      String(r['contenido'] ?? r['text']       ?? ''),
    createdAt: String(r['creadoEn']  ?? r['creado_en']  ?? ''),
    userName:  r['autorNombre']  != null ? String(r['autorNombre'])
             : r['autor_nombre'] != null ? String(r['autor_nombre']) : undefined,
  };
}

function mapHistory(raw: unknown): TicketHistory {
  const r = raw as Record<string, unknown>;
  return {
    id:        String(r['id']        ?? ''),
    ticketId:  String(r['ticketId']  ?? r['ticket_id']  ?? ''),
    userId:    String(r['usuarioId'] ?? r['usuario_id'] ?? ''),
    action:    (r['accion'] ?? r['action'] ?? 'created') as HistoryAction,
    from:      r['valorAnterior']  != null ? String(r['valorAnterior'])
             : r['valor_anterior'] != null ? String(r['valor_anterior']) : undefined,
    to:        r['valorNuevo']   != null ? String(r['valorNuevo'])
             : r['valor_nuevo']  != null ? String(r['valor_nuevo']) : undefined,
    note:      r['nota'] != null ? String(r['nota']) : undefined,
    createdAt: String(r['creadoEn'] ?? r['creado_en'] ?? ''),
    userName:  r['usuarioNombre'] != null ? String(r['usuarioNombre']) : undefined,
  };
}

// ── Mapper (modelo frontend → body del backend) ───────────────────
// El backend usa camelCase en los cuerpos de petición
function toApiBody(dto: Record<string, unknown>): Record<string, unknown> {
  const fieldMap: Record<string, string> = {
    groupId:      'grupoId',
    assignedToId: 'asignadoId',
    createdById:  'autorId',
    dueDate:      'fechaFinal',
    status:       'estado',
    priority:     'prioridad',
  };
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(dto)) {
    if (v !== undefined && v !== null && v !== '') result[fieldMap[k] ?? k] = v;
  }
  return result;
}
