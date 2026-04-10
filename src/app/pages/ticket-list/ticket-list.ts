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
import { GroupService }       from '../../Services/Group.service';
import { PermissionsService } from '../../Services/Permissions.service';
import { Ticket, TicketStatus, TicketPriority } from '../../models/Auth.model';
import { QuickFiltersComponent } from '../../Components/quick-filters/quick-filters';
import { QuickFilterId }         from '../../Components/quick-filters/quick-filter.model';

export type SortField = 'createdAt' | 'titulo' | 'status' | 'priority' | 'assignedToId' | 'dueDate';
export type SortDir   = 'asc' | 'desc';

const PRIORITY_RANK: Record<TicketPriority, number> = { baja:1, media:2, alta:3, critica:4 };
const STATUS_RANK:   Record<TicketStatus,   number> = { pendiente:1, en_progreso:2, bloqueado:3, hecho:4 };

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule, SelectModule, TooltipModule, ToastModule,
    QuickFiltersComponent,
  ],
  providers: [MessageService],
  templateUrl: './ticket-list.html',
  styleUrl:    './ticket-list.css',
})
export class TicketListComponent implements OnInit {

  // ── Filtros ────────────────────────────────────────────────────────
  search         = signal('');
  filterStatus   = signal<TicketStatus | ''>('');
  filterPriority = signal<TicketPriority | ''>('');
  filterAssignee = signal<string>('');
  quickFilter    = signal<QuickFilterId>('none');

  sortField = signal<SortField>('createdAt');
  sortDir   = signal<SortDir>('asc');

  pageSize    = signal(10);
  currentPage = signal(1);

  loading = signal(false);

  statusOptions = [
    { label:'Todos los estados', value:'' },
    { label:'Pendiente',   value:'pendiente'   },
    { label:'En progreso', value:'en_progreso' },
    { label:'Hecho',       value:'hecho'       },
    { label:'Bloqueado',   value:'bloqueado'   },
  ];

  priorityOptions = [
    { label:'Todas las prioridades', value:'' },
    { label:'Baja',    value:'baja'    },
    { label:'Media',   value:'media'   },
    { label:'Alta',    value:'alta'    },
    { label:'Crítica', value:'critica' },
  ];

  pageSizeOptions = [
    { label:'5  por página', value:5  },
    { label:'10 por página', value:10 },
    { label:'20 por página', value:20 },
    { label:'50 por página', value:50 },
  ];

  memberOptions = computed(() => {
    const members = this.groupSvc.getGroupMembers();
    return [
      { label:'Todos los asignados', value:'' },
      ...members.map(m => ({ label: m.fullName, value: m.id })),
    ];
  });

  constructor(
    public  authSvc:   AuthService,
    public  permsSvc:  PermissionsService,
    private ticketSvc: TicketService,
    private groupSvc:  GroupService,
    private router:    Router,
    private msgSvc:    MessageService,
  ) {}

  ngOnInit() {
    const g    = this.authSvc.getGroup();
    const user = this.authSvc.getUser();
    if (!g || !user) return;
    this.loading.set(true);
    this.ticketSvc.loadForGroup(g.id).subscribe({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  // ── Pipeline ──────────────────────────────────────────────────────
  private rawTickets = computed(() => {
    const group = this.authSvc.getGroup();
    const user  = this.authSvc.getUser();
    if (!group || !user) return [];
    return this.ticketSvc.getForUser(group.id, user.id);
  });

  filtered = computed(() => {
    const q  = this.search().toLowerCase().trim();
    const st = this.filterStatus();
    const pr = this.filterPriority();
    const as = this.filterAssignee();
    const me = this.authSvc.getUser();
    const qf = this.quickFilter();

    return this.rawTickets().filter(t => {
      if (q  && !t.titulo.toLowerCase().includes(q) && !t.id.includes(q)) return false;
      if (st && t.status   !== st) return false;
      if (pr && t.priority !== pr) return false;
      if (as && t.assignedToId !== as) return false;
      if (qf === 'mis_tickets'    && t.assignedToId !== me?.id) return false;
      if (qf === 'sin_asignar'    && t.assignedToId)            return false;
      if (qf === 'prioridad_alta' && t.priority !== 'alta' && t.priority !== 'critica') return false;
      if (qf === 'vencidos'  && !(t.dueDate && t.status !== 'hecho' && new Date(t.dueDate) < new Date())) return false;
      if (qf === 'bloqueados' && t.status !== 'bloqueado') return false;
      return true;
    });
  });

  quickFilterCounts(): Partial<Record<QuickFilterId, number>> {
    const all = this.rawTickets();
    const me  = this.authSvc.getUser();
    return {
      mis_tickets:    all.filter(t => t.assignedToId === me?.id).length,
      sin_asignar:    all.filter(t => !t.assignedToId).length,
      prioridad_alta: all.filter(t => t.priority === 'alta' || t.priority === 'critica').length,
      vencidos:       all.filter(t => t.dueDate && t.status !== 'hecho' && new Date(t.dueDate) < new Date()).length,
      bloqueados:     all.filter(t => t.status === 'bloqueado').length,
    };
  }

  onQuickFilter(id: any) { this.quickFilter.set(id as QuickFilterId); this.currentPage.set(1); }

  sorted = computed(() => {
    const field = this.sortField();
    const dir   = this.sortDir() === 'asc' ? 1 : -1;
    return [...this.filtered()].sort((a, b) => {
      let va: any = (a as any)[field];
      let vb: any = (b as any)[field];
      if (field === 'priority')    { va = PRIORITY_RANK[a.priority]; vb = PRIORITY_RANK[b.priority]; }
      if (field === 'status')      { va = STATUS_RANK[a.status];     vb = STATUS_RANK[b.status];     }
      if (field === 'assignedToId'){ va = this.userName(a.assignedToId); vb = this.userName(b.assignedToId); }
      va ??= ''; vb ??= '';
      return va < vb ? -1 * dir : va > vb ? 1 * dir : 0;
    });
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize())));

  page = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.sorted().slice(start, start + this.pageSize());
  });

  pages = computed(() => {
    const total = this.totalPages(), cur = this.currentPage(), delta = 2;
    const range: (number | '…')[] = [];
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= cur - delta && i <= cur + delta)) range.push(i);
      else if (range[range.length - 1] !== '…') range.push('…');
    }
    return range;
  });

  sort(field: SortField) {
    if (this.sortField() === field) this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    else { this.sortField.set(field); this.sortDir.set('asc'); }
    this.currentPage.set(1);
  }

  sortIcon(field: SortField): string {
    if (this.sortField() !== field) return 'pi-sort';
    return this.sortDir() === 'asc' ? 'pi-sort-up-fill' : 'pi-sort-down-fill';
  }

  onSearch(value: string)   { this.search.set(value);          this.currentPage.set(1); }
  onStatus(v: string)       { this.filterStatus.set(v as any); this.currentPage.set(1); }
  onPriority(v: string)     { this.filterPriority.set(v as any); this.currentPage.set(1); }
  onAssignee(v: string)     { this.filterAssignee.set(v);      this.currentPage.set(1); }
  onPageSize(v: number)     { this.pageSize.set(v);            this.currentPage.set(1); }

  clearFilters() {
    this.search.set(''); this.filterStatus.set(''); this.filterPriority.set('');
    this.filterAssignee.set(''); this.quickFilter.set('none'); this.currentPage.set(1);
  }

  get hasActiveFilters(): boolean {
    return !!(this.search() || this.filterStatus() || this.filterPriority() || this.filterAssignee() || this.quickFilter() !== 'none');
  }

  openDetail(ticket: Ticket) { this.router.navigate(['/home/ticket', ticket.id]); }
  goToPage(p: number | '…') { if (typeof p === 'number') this.currentPage.set(p); }
  prevPage() { if (this.currentPage() > 1) this.currentPage.update(p => p - 1); }
  nextPage() { if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1); }

  // ── Helpers ────────────────────────────────────────────────────────
  userName(id: string): string {
    return this.groupSvc.getGroupMembers().find(m => m.id === id)?.fullName ?? '—';
  }
  userInitial(id: string): string { return this.userName(id).charAt(0).toUpperCase(); }
  userColor(id: string): string {
    const n = [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
    return ['#7c6af7','#38bdf8','#4ade80','#f59e0b','#f87171'][n % 5];
  }

  statusMeta(s: TicketStatus) {
    const map: Record<TicketStatus, { label:string; color:string; bg:string; icon:string }> = {
      pendiente:   { label:'Pendiente',   color:'#f59e0b', bg:'rgba(245,158,11,.12)',  icon:'pi-clock'        },
      en_progreso: { label:'En progreso', color:'#38bdf8', bg:'rgba(56,189,248,.12)',  icon:'pi-refresh'      },
      hecho:       { label:'Hecho',       color:'#4ade80', bg:'rgba(74,222,128,.12)',  icon:'pi-check-circle' },
      bloqueado:   { label:'Bloqueado',   color:'#f87171', bg:'rgba(248,113,113,.12)', icon:'pi-ban'          },
    };
    return map[s];
  }

  priorityMeta(p: TicketPriority) {
    const map: Record<TicketPriority, { label:string; color:string; bg:string; icon:string }> = {
      baja:    { label:'Baja',    color:'#4ade80', bg:'rgba(74,222,128,.12)',  icon:'pi-angle-down'         },
      media:   { label:'Media',   color:'#38bdf8', bg:'rgba(56,189,248,.12)',  icon:'pi-minus'              },
      alta:    { label:'Alta',    color:'#f59e0b', bg:'rgba(245,158,11,.12)',  icon:'pi-angle-up'           },
      critica: { label:'Crítica', color:'#f87171', bg:'rgba(248,113,113,.12)', icon:'pi-exclamation-circle' },
    };
    return map[p];
  }

  isOverdue(d?: string, status?: TicketStatus): boolean {
    return !!d && status !== 'hecho' && new Date(d) < new Date();
  }

  formatDate(d?: string): string {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' }); }
    catch { return d; }
  }

  get summary(): string {
    const total = this.filtered().length;
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end   = start + this.page().length - 1;
    return total === 0 ? 'Sin resultados' : `${start}–${end} de ${total} tickets`;
  }
}
