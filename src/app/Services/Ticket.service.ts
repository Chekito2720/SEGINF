import { Injectable, signal } from '@angular/core';
import { Ticket, TicketStatus, TICKETS } from '../models/Auth.model';

@Injectable({ providedIn: 'root' })
export class TicketService {
  private tickets = signal<Ticket[]>([...TICKETS]);

  // ── Por grupo ─────────────────────────────────────────────────────────────
  getByGroup(groupId: number): Ticket[] {
    return this.tickets().filter(t => t.groupId === groupId);
  }

  // ── Por grupo + usuario (para group_member) ───────────────────────────────
  getByGroupAndUser(groupId: number, userId: number): Ticket[] {
    return this.tickets().filter(t => t.groupId === groupId && t.assignedToId === userId);
  }

  // ── Conteos por estado ────────────────────────────────────────────────────
  countByStatus(tickets: Ticket[]): Record<TicketStatus, number> {
    return {
      pendiente:   tickets.filter(t => t.status === 'pendiente').length,
      en_progreso: tickets.filter(t => t.status === 'en_progreso').length,
      hecho:       tickets.filter(t => t.status === 'hecho').length,
      bloqueado:   tickets.filter(t => t.status === 'bloqueado').length,
    };
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  add(ticket: Omit<Ticket, 'id' | 'createdAt'>): Ticket {
    const newTicket: Ticket = {
      ...ticket,
      id: Math.max(0, ...this.tickets().map(t => t.id)) + 1,
      createdAt: new Date().toISOString().split('T')[0],
    };
    this.tickets.update(list => [...list, newTicket]);
    return newTicket;
  }

  update(id: number, changes: Partial<Ticket>) {
    this.tickets.update(list =>
      list.map(t => t.id === id ? { ...t, ...changes } : t)
    );
  }

  delete(id: number) {
    this.tickets.update(list => list.filter(t => t.id !== id));
  }

  changeStatus(id: number, status: TicketStatus) {
    this.update(id, { status });
  }
}