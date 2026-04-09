import { Injectable, signal } from '@angular/core';
import {
  Ticket, TicketStatus, TICKETS,
  TicketComment, TicketHistory, HistoryAction,
  TICKET_COMMENTS, TICKET_HISTORY
} from '../models/Auth.model';
import { PermissionsService } from './Permissions.service';

@Injectable({ providedIn: 'root' })
export class TicketService {
  private tickets  = signal<Ticket[]>([...TICKETS]);
  private comments = signal<TicketComment[]>([...TICKET_COMMENTS]);
  private history  = signal<TicketHistory[]>([...TICKET_HISTORY]);

  private nextCommentId = TICKET_COMMENTS.length + 1;
  private nextHistoryId = TICKET_HISTORY.length  + 1;

  constructor(private permsSvc: PermissionsService) {}

  // ── Tickets ──────────────────────────────────────────────────────────────
  getByGroup(groupId: number): Ticket[] {
    return this.tickets().filter(t => t.groupId === groupId);
  }

  getByGroupAndUser(groupId: number, userId: number): Ticket[] {
    return this.tickets().filter(t => t.groupId === groupId && t.assignedToId === userId);
  }

  /**
   * Método centralizado de acceso a tickets con control de visibilidad:
   * - Con 'tickets_view': ve todos los tickets del grupo
   * - Sin 'tickets_view' (solo 'ticket_view'): ve únicamente los asignados a él
   */
  getForUser(groupId: number, userId: number): Ticket[] {
    if (this.permsSvc.hasPermission('tickets_view')) {
      return this.getByGroup(groupId);
    }
    return this.getByGroupAndUser(groupId, userId);
  }

  getById(id: number): Ticket | undefined {
    return this.tickets().find(t => t.id === id);
  }

  countByStatus(tickets: Ticket[]): Record<TicketStatus, number> {
    return {
      pendiente:   tickets.filter(t => t.status === 'pendiente').length,
      en_progreso: tickets.filter(t => t.status === 'en_progreso').length,
      hecho:       tickets.filter(t => t.status === 'hecho').length,
      bloqueado:   tickets.filter(t => t.status === 'bloqueado').length,
    };
  }

  add(ticket: Omit<Ticket, 'id' | 'createdAt'>, byUserId?: number): Ticket {
    const newTicket: Ticket = {
      ...ticket,
      id:        Math.max(0, ...this.tickets().map(t => t.id)) + 1,
      createdAt: new Date().toISOString().split('T')[0],
    };
    this.tickets.update(list => [...list, newTicket]);
    if (byUserId) {
      this.addHistory(newTicket.id, byUserId, 'created', undefined, newTicket.status);
    }
    return newTicket;
  }

  update(id: number, changes: Partial<Ticket>, byUserId?: number) {
    const old = this.getById(id);
    this.tickets.update(list => list.map(t => t.id === id ? { ...t, ...changes } : t));

    if (!old || !byUserId) return;
    if (changes.status      && changes.status      !== old.status)
      this.addHistory(id, byUserId, 'status_changed',      old.status,       changes.status);
    if (changes.priority    && changes.priority    !== old.priority)
      this.addHistory(id, byUserId, 'priority_changed',    old.priority,     changes.priority);
    if (changes.assignedToId !== undefined && changes.assignedToId !== old.assignedToId)
      this.addHistory(id, byUserId, 'assigned',            String(old.assignedToId), String(changes.assignedToId));
    if (changes.titulo      && changes.titulo      !== old.titulo)
      this.addHistory(id, byUserId, 'title_changed',       old.titulo,       changes.titulo);
    if (changes.descripcion !== undefined && changes.descripcion !== old.descripcion)
      this.addHistory(id, byUserId, 'description_changed', undefined,        undefined, 'Descripción actualizada');
    if (changes.dueDate     !== undefined && changes.dueDate     !== old.dueDate)
      this.addHistory(id, byUserId, 'duedate_changed',     old.dueDate ?? '—', changes.dueDate ?? '—');
  }

  delete(id: number) {
    this.tickets.update(list => list.filter(t => t.id !== id));
    this.comments.update(list => list.filter(c => c.ticketId !== id));
    this.history.update(list => list.filter(h => h.ticketId !== id));
  }

  changeStatus(id: number, status: TicketStatus, byUserId?: number) {
    this.update(id, { status }, byUserId);
  }

  // ── Comments ─────────────────────────────────────────────────────────────
  getComments(ticketId: number): TicketComment[] {
    return this.comments()
      .filter(c => c.ticketId === ticketId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  addComment(ticketId: number, userId: number, text: string): TicketComment {
    const c: TicketComment = {
      id:        this.nextCommentId++,
      ticketId, userId, text,
      createdAt: new Date().toISOString(),
    };
    this.comments.update(list => [...list, c]);
    this.addHistory(ticketId, userId, 'comment_added', undefined, undefined, text.slice(0, 60));
    return c;
  }

  // ── History ───────────────────────────────────────────────────────────────
  getHistory(ticketId: number): TicketHistory[] {
    return this.history()
      .filter(h => h.ticketId === ticketId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private addHistory(
    ticketId: number, userId: number, action: HistoryAction,
    from?: string, to?: string, note?: string
  ) {
    const h: TicketHistory = {
      id: this.nextHistoryId++,
      ticketId, userId, action, from, to, note,
      createdAt: new Date().toISOString(),
    };
    this.history.update(list => [...list, h]);
  }
}