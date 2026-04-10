import { Component, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule }    from 'primeng/button';
import { ChartModule }     from 'primeng/chart';
import { DialogModule }    from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule }  from 'primeng/textarea';
import { SelectModule }    from 'primeng/select';
import { TagModule }       from 'primeng/tag';
import { ToastModule }     from 'primeng/toast';
import { TooltipModule }   from 'primeng/tooltip';
import { DividerModule }   from 'primeng/divider';
import { MessageService }  from 'primeng/api';
import { AuthService }         from '../../Services/Auth.service';
import { TicketService, CreateTicketDto } from '../../Services/Ticket.service';
import { GroupService }        from '../../Services/Group.service';
import { PermissionsService }  from '../../Services/Permissions.service';
import { HasPermissionDirective } from '../../directives/has-permission.directive';
import { Ticket, TicketStatus, TicketPriority, AppGroup } from '../../models/Auth.model';

export type KanbanCol = {
  status: TicketStatus;
  label:  string;
  accent: string;
  glow:   string;
  icon:   string;
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    ButtonModule, ChartModule, DialogModule, InputTextModule, TextareaModule,
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
  editingId = signal<string | null>(null);
  loading   = signal(false);

  form: CreateTicketDto = { titulo: '', descripcion: '', status: 'pendiente', priority: 'media', groupId: '', assignedToId: '' };

  emptyForm(): CreateTicketDto {
    return {
      titulo: '', descripcion: '', status: 'pendiente', priority: 'media',
      groupId:      this.group()?.id ?? '',
      assignedToId: this.authSvc.getUser()?.id ?? '',
    };
  }

  columns: KanbanCol[] = [
    { status: 'pendiente',   label: 'Pendiente',   accent: '#f59e0b', glow: 'rgba(245,158,11,0.12)',  icon: 'pi-clock'          },
    { status: 'en_progreso', label: 'En progreso', accent: '#38bdf8', glow: 'rgba(56,189,248,0.12)',  icon: 'pi-spinner pi-spin'},
    { status: 'hecho',       label: 'Hecho',       accent: '#4ade80', glow: 'rgba(74,222,128,0.12)',  icon: 'pi-check-circle'   },
    { status: 'bloqueado',   label: 'Bloqueado',   accent: '#f87171', glow: 'rgba(248,113,113,0.12)', icon: 'pi-ban'            },
  ];

  statusOpts   = this.columns.map(c => ({ label: c.label, value: c.status }));
  priorityOpts: { label: string; value: TicketPriority }[] = [
    { label: 'Baja',    value: 'baja'    },
    { label: 'Media',   value: 'media'   },
    { label: 'Alta',    value: 'alta'    },
    { label: 'Crítica', value: 'critica' },
  ];
  memberOpts = computed(() =>
    this.groupSvc.getGroupMembers().map(m => ({ label: m.fullName, value: m.id }))
  );

  // ── Opciones de Chart.js para el donut ───────────────────────────
  readonly chartOptions = {
    responsive:          true,
    maintainAspectRatio: false,
    cutout:              '72%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#9a9cc0', padding: 16, font: { size: 12 } },
      },
    },
  };

  constructor(
    public  authSvc:   AuthService,
    public  permsSvc:  PermissionsService,
    private ticketSvc: TicketService,
    private groupSvc:  GroupService,
    private msgSvc:    MessageService,
    private router:    Router,
  ) {}

  userGroups = computed(() => this.authSvc.getUserGroups());

  get canSwitchGroup(): boolean { return this.userGroups().length > 1; }

  ngOnInit() {
    const g = this.authSvc.getGroup();
    this.group.set(g);
    if (g) this.groupSvc.loadGroupMembers(g.id).subscribe();
    this.loadTickets();
  }

  switchGroup(g: AppGroup) {
    if (g.id === this.group()?.id) return;
    this.authSvc.selectGroup(g.id);
    this.group.set(g);
    this.groupSvc.loadGroupMembers(g.id).subscribe();
    this.loadTickets();
    this.msgSvc.add({ severity: 'info', summary: 'Grupo cambiado', detail: `Ahora trabajas en ${g.nombre}` });
  }

  groupTicketCount(gId: string): number {
    return this.authSvc.getUserGroups().find(g => g.id === gId)?.ticketCount ?? 0;
  }

  loadTickets() {
    const g    = this.group();
    const user = this.authSvc.getUser();
    if (!g || !user) return;
    this.loading.set(true);
    this.ticketSvc.loadForGroup(g.id).subscribe({
      next: () => {
        this.tickets.set(this.ticketSvc.getForUser(g.id, user.id));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  counts = computed(() => this.ticketSvc.countByStatus(this.tickets()));

  recentTickets = computed(() =>
    [...this.tickets()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)
  );

  /** Datos para el gráfico donut de estados */
  chartData = computed(() => {
    const c = this.counts();
    return {
      labels: ['Pendiente', 'En progreso', 'Hecho', 'Bloqueado'],
      datasets: [{
        data: [c.pendiente, c.en_progreso, c.hecho, c.bloqueado],
        backgroundColor: ['#f59e0b', '#38bdf8', '#4ade80', '#f87171'],
        borderWidth: 0,
      }],
    };
  });

  /** Datos para el gráfico de barras de prioridad */
  priorityChartData = computed(() => {
    const t = this.tickets();
    const counts = { baja: 0, media: 0, alta: 0, critica: 0 };
    t.forEach(ticket => {
      if (ticket.priority in counts) counts[ticket.priority as keyof typeof counts]++;
    });
    return {
      labels: ['Baja', 'Media', 'Alta', 'Crítica'],
      datasets: [{
        label: 'Tickets',
        data: [counts.baja, counts.media, counts.alta, counts.critica],
        backgroundColor: ['#4ade80', '#f59e0b', '#f87171', '#e11d48'],
        borderRadius: 6,
        borderWidth: 0,
      }],
    };
  });

  readonly barOptions = {
    responsive:          true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#9a9cc0' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#9a9cc0', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } },
    },
  };

  colTickets(status: TicketStatus): Ticket[] {
    const f = this.filter();
    if (f !== 'all' && f !== status) return [];
    return this.tickets().filter(t => t.status === status);
  }

  col(status: TicketStatus): KanbanCol {
    return this.columns.find(c => c.status === status)!;
  }

  // ── Modal ─────────────────────────────────────────────────────────
  openCreate() {
    this.form = this.emptyForm();
    this.isEditing.set(false);
    this.editingId.set(null);
    this.showModal.set(true);
  }

  openEdit(t: Ticket) {
    this.router.navigate(['/home/ticket', t.id]);
  }

  save() {
    if (!this.form.titulo.trim()) return;
    if (this.isEditing() && this.editingId()) {
      this.ticketSvc.update(this.editingId()!, this.form).subscribe({
        next: () => {
          this.loadTickets();
          this.showModal.set(false);
          this.msgSvc.add({ severity: 'success', summary: 'Actualizado', detail: 'Ticket guardado.' });
        },
        error: (e) => this.msgSvc.add({ severity: 'error', summary: 'Error', detail: e.userMessage ?? 'No se pudo actualizar.' }),
      });
    } else {
      this.ticketSvc.add(this.form).subscribe({
        next: () => {
          this.loadTickets();
          this.showModal.set(false);
          this.msgSvc.add({ severity: 'success', summary: 'Creado', detail: 'Ticket creado.' });
        },
        error: (e) => this.msgSvc.add({ severity: 'error', summary: 'Error', detail: e.userMessage ?? 'No se pudo crear.' }),
      });
    }
  }

  deleteTicket(id: string) {
    this.ticketSvc.delete(id).subscribe({
      next: () => {
        this.loadTickets();
        this.msgSvc.add({ severity: 'warn', summary: 'Eliminado', detail: 'Ticket eliminado.' });
      },
      error: (e) => this.msgSvc.add({ severity: 'error', summary: 'Error', detail: e.userMessage ?? 'No se pudo eliminar.' }),
    });
  }

  moveStatus(ticket: Ticket, status: TicketStatus) {
    this.ticketSvc.changeStatus(ticket.id, status).subscribe({
      next: () => this.loadTickets(),
      error: (e) => this.msgSvc.add({ severity: 'error', summary: 'Sin permiso', detail: e.userMessage ?? 'No puedes mover este ticket.' }),
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────
  priorityColor(p: TicketPriority): string {
    return ({ baja: '#4ade80', media: '#f59e0b', alta: '#f87171', critica: '#e11d48' } as any)[p] ?? '#9a9cc0';
  }
  prioritySeverity(p: TicketPriority): string {
    return ({ baja: 'success', media: 'warn', alta: 'danger', critica: 'danger' } as any)[p] ?? 'secondary';
  }
  assigneeName(id: string): string {
    return this.groupSvc.getGroupMembers().find(m => m.id === id)?.fullName ?? '—';
  }
  createdByName(id: string): string {
    return this.groupSvc.getGroupMembers().find(m => m.id === id)?.fullName ?? '—';
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
