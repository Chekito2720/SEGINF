import { Component, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../Services/Auth.service';
import { TicketService } from '../../Services/Ticket.service';
import { PermissionsService } from '../../Services/Permissions.service';
import { HasPermissionDirective } from '../../directives/Has permission.directive';
import {
  Ticket, TicketStatus, TicketPriority,
  USERS, AppGroup
} from '../../models/Auth.model';

export type KanbanCol = {
  status: TicketStatus;
  label:  string;
  accent: string;     // color del borde/número
  glow:   string;     // rgba para glow sutil
  icon:   string;
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ButtonModule, DialogModule, InputTextModule, TextareaModule,
    SelectModule, TagModule, ToastModule, TooltipModule, DividerModule,
    HasPermissionDirective,
  ],
  providers: [MessageService],
  templateUrl: './home.html',
  styleUrl:    './home.css',
})
export class HomeComponent implements OnInit {

  group   = signal<AppGroup | null>(null);
  tickets = signal<Ticket[]>([]);
  filter  = signal<TicketStatus | 'all'>('all');

  showModal = signal(false);
  isEditing = signal(false);
  editingId = signal<number | null>(null);

  form: Omit<Ticket, 'id' | 'createdAt'> = {
    titulo: '', descripcion: '', status: 'pendiente', priority: 'media',
    groupId: 0, assignedToId: 1, createdById: 1,
  };

  emptyForm(): Omit<Ticket, 'id' | 'createdAt'> {
    return {
      titulo: '', descripcion: '', status: 'pendiente', priority: 'media',
      groupId:      this.group()?.id ?? 0,
      assignedToId: this.authSvc.getUser()?.id ?? 1,
      createdById:  this.authSvc.getUser()?.id ?? 1,
    };
  }

  columns: KanbanCol[] = [
    { status: 'pendiente',   label: 'Pendiente',   accent: '#f59e0b', glow: 'rgba(245,158,11,0.12)',  icon: 'pi-clock'          },
    { status: 'en_progreso', label: 'En progreso',  accent: '#38bdf8', glow: 'rgba(56,189,248,0.12)', icon: 'pi-spinner pi-spin'},
    { status: 'hecho',       label: 'Hecho',        accent: '#4ade80', glow: 'rgba(74,222,128,0.12)', icon: 'pi-check-circle'   },
    { status: 'bloqueado',   label: 'Bloqueado',    accent: '#f87171', glow: 'rgba(248,113,113,0.12)',icon: 'pi-ban'            },
  ];

  statusOpts   = this.columns.map(c => ({ label: c.label, value: c.status }));
  priorityOpts: { label: string; value: TicketPriority }[] = [
    { label: 'Baja',    value: 'baja'    },
    { label: 'Media',   value: 'media'   },
    { label: 'Alta',    value: 'alta'    },
    { label: 'Crítica', value: 'critica' },
  ];
  memberOpts = USERS.map(u => ({ label: u.fullName, value: u.id }));

  constructor(
    public  authSvc:   AuthService,
    public  permsSvc:  PermissionsService,
    private ticketSvc: TicketService,
    private msgSvc:    MessageService,
  ) {}

  ngOnInit() {
    this.group.set(this.authSvc.getGroup());
    this.loadTickets();
  }

  loadTickets() {
    const g    = this.group();
    const user = this.authSvc.getUser();
    if (!g || !user) return;
    const list = this.permsSvc.hasPermission('tickets_view')
      ? this.ticketSvc.getByGroup(g.id)
      : this.ticketSvc.getByGroupAndUser(g.id, user.id);
    this.tickets.set(list);
  }

  // ── Computed ──────────────────────────────────────────────────────────────
  counts = computed(() => this.ticketSvc.countByStatus(this.tickets()));

  recentTickets = computed(() =>
    [...this.tickets()].sort((a, b) => b.id - a.id).slice(0, 5)
  );

  colTickets(status: TicketStatus): Ticket[] {
    return this.tickets().filter(t => t.status === status);
  }

  col(status: TicketStatus): KanbanCol {
    return this.columns.find(c => c.status === status)!;
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  openCreate() {
    this.form = this.emptyForm();
    this.isEditing.set(false);
    this.editingId.set(null);
    this.showModal.set(true);
  }

  openEdit(t: Ticket) {
    this.form = { ...t };
    this.isEditing.set(true);
    this.editingId.set(t.id);
    this.showModal.set(true);
  }

  save() {
    if (!this.form.titulo.trim()) return;
    if (this.isEditing()) {
      this.ticketSvc.update(this.editingId()!, this.form);
      this.msgSvc.add({ severity: 'success', summary: 'Actualizado', detail: 'Ticket guardado.' });
    } else {
      this.ticketSvc.add(this.form);
      this.msgSvc.add({ severity: 'success', summary: 'Creado', detail: 'Ticket creado.' });
    }
    this.loadTickets();
    this.showModal.set(false);
  }

  deleteTicket(id: number) {
    this.ticketSvc.delete(id);
    this.loadTickets();
    this.msgSvc.add({ severity: 'warn', summary: 'Eliminado', detail: 'Ticket eliminado.' });
  }

  moveStatus(ticket: Ticket, status: TicketStatus) {
    this.ticketSvc.changeStatus(ticket.id, status);
    this.loadTickets();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  priorityColor(p: TicketPriority): string {
    return ({ baja: '#4ade80', media: '#f59e0b', alta: '#f87171', critica: '#e11d48' } as any)[p] ?? '#9a9cc0';
  }
  prioritySeverity(p: TicketPriority): string {
    return ({ baja: 'success', media: 'warn', alta: 'danger', critica: 'danger' } as any)[p] ?? 'secondary';
  }
  assigneeName(id: number): string {
    return USERS.find(u => u.id === id)?.fullName ?? '—';
  }
  get formInvalid() { return !this.form.titulo.trim(); }

  colIndex(status: TicketStatus): number {
    return this.columns.findIndex(c => c.status === status);
  }
  prevStatus(status: TicketStatus): TicketStatus | null {
    const i = this.colIndex(status);
    return i > 0 ? this.columns[i - 1].status : null;
  }
  nextStatus(status: TicketStatus): TicketStatus | null {
    const i = this.colIndex(status);
    return i < this.columns.length - 1 ? this.columns[i + 1].status : null;
  }
}