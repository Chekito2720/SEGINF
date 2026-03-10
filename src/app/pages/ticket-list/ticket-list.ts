import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { Router }       from '@angular/router';
import { ButtonModule }    from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule }    from 'primeng/select';
import { TooltipModule }   from 'primeng/tooltip';
import { ToastModule }     from 'primeng/toast';
import { MessageService }  from 'primeng/api';
import { AuthService }        from '../../Services/Auth.service';
import { TicketService }      from '../../Services/Ticket.service';
import { PermissionsService } from '../../Services/Permissions.service';
import {
  Ticket, TicketStatus, TicketPriority, USERS,
} from '../../models/Auth.model';

export type SortField = 'id' | 'titulo' | 'status' | 'priority' | 'assignedToId' | 'dueDate' | 'createdAt';
export type SortDir   = 'asc' | 'desc';

const PRIORITY_RANK: Record<TicketPriority, number> = {
  baja: 1, media: 2, alta: 3, critica: 4,
};

const STATUS_RANK: Record<TicketStatus, number> = {
  pendiente: 1, en_progreso: 2, bloqueado: 3, hecho: 4,
};

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule, SelectModule, TooltipModule, ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './ticket-list.html',
  styleUrl:    './ticket-list.css',
})
export class TicketListComponent implements OnInit {

  // ── Filtros ────────────────────────────────────────────────────────
  search      = signal('');
  filterStatus   = signal<TicketStatus | ''>('');
  filterPriority = signal<TicketPriority | ''>('');
  filterAssignee = signal<number | 0>(0);

  // ── Ordenamiento ───────────────────────────────────────────────────
  sortField = signal<SortField>('id');
  sortDir   = signal<SortDir>('asc');

  // ── Paginación ─────────────────────────────────────────────────────
  pageSize    = signal(10);
  currentPage = signal(1);

  // ── Opciones de filtro ─────────────────────────────────────────────
  statusOptions = [
    { label: 'Todos los estados', value: '' },
    { label: 'Pendiente',         value: 'pendiente'   },
    { label: 'En progreso',       value: 'en_progreso' },
    { label: 'Hecho',             value: 'hecho'       },
    { label: 'Bloqueado',         value: 'bloqueado'   },
  ];

  priorityOptions = [
    { label: 'Todas las prioridades', value: '' },
    { label: 'Baja',    value: 'baja'    },
    { label: 'Media',   value: 'media'   },
    { label: 'Alta',    value: 'alta'    },
    { label: 'Crítica', value: 'critica' },
  ];

  pageSizeOptions = [
    { label: '5  por página',  value: 5  },
    { label: '10 por página',  value: 10 },
    { label: '20 por página',  value: 20 },
    { label: '50 por página',  value: 50 },
  ];

  memberOptions = computed(() => {
    const group = this.authSvc.getGroup();
    if (!group) return [];
    const members = USERS.filter(u => u.groupIds.includes(group.id));
    return [
      { label: 'Todos los asignados', value: 0 },
      ...members.map(u => ({ label: u.fullName, value: u.id })),
    ];
  });

  constructor(
    public  authSvc:   AuthService,
    public  permsSvc:  PermissionsService,
    private ticketSvc: TicketService,
    private router:    Router,
    private msgSvc:    MessageService,
  ) {}

  ngOnInit() {}

  // ── Pipeline: filtrar + ordenar ────────────────────────────────────
  private rawTickets = computed(() => {
    const group = this.authSvc.getGroup();
    if (!group) return [];
    const user = this.authSvc.getUser();
    // group_member solo ve sus tickets
    if (user && !this.permsSvc.hasPermission('tickets_view') && this.permsSvc.hasPermission('ticket_view')) {
      return this.ticketSvc.getByGroupAndUser(group.id, user.id);
    }
    return this.ticketSvc.getByGroup(group.id);
  });

  filtered = computed(() => {
    const q  = this.search().toLowerCase().trim();
    const st = this.filterStatus();
    const pr = this.filterPriority();
    const as = this.filterAssignee();

    return this.rawTickets().filter(t => {
      if (q  && !t.titulo.toLowerCase().includes(q) && !String(t.id).includes(q)) return false;
      if (st && t.status   !== st) return false;
      if (pr && t.priority !== pr) return false;
      if (as && t.assignedToId !== as) return false;
      return true;
    });
  });

  sorted = computed(() => {
    const field = this.sortField();
    const dir   = this.sortDir() === 'asc' ? 1 : -1;
    return [...this.filtered()].sort((a, b) => {
      let va: any = a[field as keyof Ticket];
      let vb: any = b[field as keyof Ticket];
      if (field === 'priority') { va = PRIORITY_RANK[a.priority]; vb = PRIORITY_RANK[b.priority]; }
      if (field === 'status')   { va = STATUS_RANK[a.status];     vb = STATUS_RANK[b.status];     }
      if (field === 'assignedToId') { va = this.userName(a.assignedToId); vb = this.userName(b.assignedToId); }
      if (va === undefined || va === null) va = '';
      if (vb === undefined || vb === null) vb = '';
      if (va < vb) return -1 * dir;
      if (va > vb) return  1 * dir;
      return 0;
    });
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize())));

  page = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.sorted().slice(start, start + this.pageSize());
  });

  pages = computed(() => {
    const total = this.totalPages();
    const cur   = this.currentPage();
    const delta = 2;
    const range: (number | '…')[] = [];
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= cur - delta && i <= cur + delta)) {
        range.push(i);
      } else if (range[range.length - 1] !== '…') {
        range.push('…');
      }
    }
    return range;
  });

  // ── Sort ───────────────────────────────────────────────────────────
  sort(field: SortField) {
    if (this.sortField() === field) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set('asc');
    }
    this.currentPage.set(1);
  }

  sortIcon(field: SortField): string {
    if (this.sortField() !== field) return 'pi-sort';
    return this.sortDir() === 'asc' ? 'pi-sort-up-fill' : 'pi-sort-down-fill';
  }

  // ── Filtros ────────────────────────────────────────────────────────
  onSearch(value: string)    { this.search.set(value);      this.currentPage.set(1); }
  onStatus(v: string)        { this.filterStatus.set(v as any);   this.currentPage.set(1); }
  onPriority(v: string)      { this.filterPriority.set(v as any); this.currentPage.set(1); }
  onAssignee(v: number)      { this.filterAssignee.set(v);        this.currentPage.set(1); }
  onPageSize(v: number)      { this.pageSize.set(v);              this.currentPage.set(1); }

  clearFilters() {
    this.search.set('');
    this.filterStatus.set('');
    this.filterPriority.set('');
    this.filterAssignee.set(0);
    this.currentPage.set(1);
  }

  get hasActiveFilters(): boolean {
    return !!(this.search() || this.filterStatus() || this.filterPriority() || this.filterAssignee());
  }

  // ── Navegación ─────────────────────────────────────────────────────
  openDetail(ticket: Ticket) {
    this.router.navigate(['/home/ticket', ticket.id]);
  }

  goToPage(p: number | '…') {
    if (typeof p === 'number') this.currentPage.set(p);
  }

  prevPage() { if (this.currentPage() > 1) this.currentPage.update(p => p - 1); }
  nextPage() { if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1); }

  // ── Helpers de display ─────────────────────────────────────────────
  userName(id: number): string {
    return USERS.find(u => u.id === id)?.fullName ?? '—';
  }

  userInitial(id: number): string {
    return this.userName(id).charAt(0).toUpperCase();
  }

  userColor(id: number): string {
    return ['#7c6af7','#38bdf8','#4ade80','#f59e0b','#f87171'][id % 5];
  }

  statusMeta(s: TicketStatus): { label: string; color: string; bg: string; icon: string } {
    const map: Record<TicketStatus, { label: string; color: string; bg: string; icon: string }> = {
      pendiente:   { label:'Pendiente',   color:'#f59e0b', bg:'rgba(245,158,11,.12)',  icon:'pi-clock'        },
      en_progreso: { label:'En progreso', color:'#38bdf8', bg:'rgba(56,189,248,.12)',  icon:'pi-refresh'      },
      hecho:       { label:'Hecho',       color:'#4ade80', bg:'rgba(74,222,128,.12)',  icon:'pi-check-circle' },
      bloqueado:   { label:'Bloqueado',   color:'#f87171', bg:'rgba(248,113,113,.12)', icon:'pi-ban'          },
    };
    return map[s];
  }

  priorityMeta(p: TicketPriority): { label: string; color: string; bg: string; icon: string } {
    const map: Record<TicketPriority, { label: string; color: string; bg: string; icon: string }> = {
      baja:    { label:'Baja',    color:'#4ade80', bg:'rgba(74,222,128,.12)',  icon:'pi-angle-down'        },
      media:   { label:'Media',   color:'#38bdf8', bg:'rgba(56,189,248,.12)',  icon:'pi-minus'             },
      alta:    { label:'Alta',    color:'#f59e0b', bg:'rgba(245,158,11,.12)',  icon:'pi-angle-up'          },
      critica: { label:'Crítica', color:'#f87171', bg:'rgba(248,113,113,.12)', icon:'pi-exclamation-circle'},
    };
    return map[p];
  }

  isOverdue(d?: string, status?: TicketStatus): boolean {
    return !!d && status !== 'hecho' && new Date(d) < new Date();
  }

  formatDate(d?: string): string {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' });
    } catch { return d; }
  }

  get summary(): string {
    const total    = this.filtered().length;
    const showing  = this.page().length;
    const start    = (this.currentPage() - 1) * this.pageSize() + 1;
    const end      = start + showing - 1;
    return total === 0 ? 'Sin resultados' : `${start}–${end} de ${total} tickets`;
  }
}