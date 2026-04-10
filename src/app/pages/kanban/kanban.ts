import {
  Component, OnInit, signal, computed, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule }    from 'primeng/button';
import { DialogModule }    from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule }  from 'primeng/textarea';
import { SelectModule }    from 'primeng/select';
import { ToastModule }     from 'primeng/toast';
import { TooltipModule }   from 'primeng/tooltip';
import { TagModule }       from 'primeng/tag';
import { MessageService }  from 'primeng/api';
import { AuthService }         from '../../Services/Auth.service';
import { TicketService, CreateTicketDto, UpdateTicketDto } from '../../Services/Ticket.service';
import { GroupService }        from '../../Services/Group.service';
import { PermissionsService }  from '../../Services/Permissions.service';
import { HasPermissionDirective } from '../../directives/has-permission.directive';
import { Ticket, TicketStatus, TicketPriority, AppGroup } from '../../models/Auth.model';
import { QuickFiltersComponent } from '../../Components/quick-filters/quick-filters';
import { QuickFilterId }         from '../../Components/quick-filters/quick-filter.model';

export interface KanbanColumn {
  status: TicketStatus;
  label:  string;
  accent: string;
  glow:   string;
  icon:   string;
  isDragOver: boolean;
}

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ButtonModule, DialogModule, InputTextModule, TextareaModule,
    SelectModule, ToastModule, TooltipModule, TagModule,
    HasPermissionDirective, QuickFiltersComponent,
  ],
  providers: [MessageService],
  templateUrl: './kanban.html',
  styleUrl:    './kanban.css',
})
export class KanbanComponent implements OnInit {

  group       = signal<AppGroup | null>(null);
  tickets     = signal<Ticket[]>([]);
  quickFilter = signal<QuickFilterId>('none');

  draggingId  = signal<string | null>(null);

  showDetail  = signal(false);
  showCreate  = signal(false);
  selected    = signal<Ticket | null>(null);
  editMode    = signal(false);

  editForm: CreateTicketDto & { dueDate: string } = { titulo: '', descripcion: '', status: 'pendiente', priority: 'media', groupId: '', assignedToId: '', dueDate: '' };

  columns: KanbanColumn[] = [
    { status:'pendiente',   label:'Pendiente',   accent:'#f59e0b', glow:'rgba(245,158,11,.14)',  icon:'pi-clock',        isDragOver:false },
    { status:'en_progreso', label:'En progreso', accent:'#38bdf8', glow:'rgba(56,189,248,.14)',  icon:'pi-refresh',      isDragOver:false },
    { status:'hecho',       label:'Hecho',       accent:'#4ade80', glow:'rgba(74,222,128,.14)',  icon:'pi-check-circle', isDragOver:false },
    { status:'bloqueado',   label:'Bloqueado',   accent:'#f87171', glow:'rgba(248,113,113,.14)', icon:'pi-ban',          isDragOver:false },
  ];

  statusOpts   = this.columns.map(c => ({ label: c.label, value: c.status }));
  priorityOpts: { label: string; value: TicketPriority }[] = [
    { label:'Baja',    value:'baja'    },
    { label:'Media',   value:'media'   },
    { label:'Alta',    value:'alta'    },
    { label:'Crítica', value:'critica' },
  ];
  memberOpts = computed(() =>
    this.groupSvc.getGroupMembers().map(m => ({ label: m.fullName, value: m.id }))
  );

  constructor(
    public  authSvc:   AuthService,
    public  permsSvc:  PermissionsService,
    private ticketSvc: TicketService,
    private groupSvc:  GroupService,
    private msgSvc:    MessageService,
    private cdr:       ChangeDetectorRef,
    private router:    Router,
  ) {}

  ngOnInit() {
    const g = this.authSvc.getGroup();
    this.group.set(g);
    if (g) this.groupSvc.loadGroupMembers(g.id).subscribe();
    this.loadTickets();
  }

  loadTickets() {
    const g    = this.group();
    const user = this.authSvc.getUser();
    if (!g || !user) return;
    this.ticketSvc.loadForGroup(g.id).subscribe({
      next: () => this.tickets.set(this.ticketSvc.getForUser(g.id, user.id)),
      error: () => {},
    });
  }

  private emptyForm(): CreateTicketDto & { dueDate: string } {
    return {
      titulo: '', descripcion: '', status: 'pendiente', priority: 'media',
      groupId:      this.group()?.id ?? '',
      assignedToId: this.authSvc.getUser()?.id ?? '',
      dueDate: '',
    };
  }

  colTickets(status: TicketStatus): Ticket[] {
    return this.applyQuickFilter(this.tickets()).filter(t => t.status === status);
  }

  applyQuickFilter(list: Ticket[]): Ticket[] {
    const me = this.authSvc.getUser();
    switch (this.quickFilter()) {
      case 'mis_tickets':    return list.filter(t => t.assignedToId === me?.id);
      case 'sin_asignar':    return list.filter(t => !t.assignedToId);
      case 'prioridad_alta': return list.filter(t => t.priority === 'alta' || t.priority === 'critica');
      case 'vencidos':       return list.filter(t => t.dueDate && t.status !== 'hecho' && new Date(t.dueDate) < new Date());
      case 'bloqueados':     return list.filter(t => t.status === 'bloqueado');
      default:               return list;
    }
  }

  quickFilterCounts(): Partial<Record<QuickFilterId, number>> {
    const all = this.tickets();
    const me  = this.authSvc.getUser();
    return {
      mis_tickets:    all.filter(t => t.assignedToId === me?.id).length,
      sin_asignar:    all.filter(t => !t.assignedToId).length,
      prioridad_alta: all.filter(t => t.priority === 'alta' || t.priority === 'critica').length,
      vencidos:       all.filter(t => t.dueDate && t.status !== 'hecho' && new Date(t.dueDate) < new Date()).length,
      bloqueados:     all.filter(t => t.status === 'bloqueado').length,
    };
  }

  onQuickFilter(id: any) { this.quickFilter.set(id as QuickFilterId); }

  col(status: TicketStatus): KanbanColumn {
    return this.columns.find(c => c.status === status)!;
  }

  counts = computed(() => ({
    pendiente:   this.tickets().filter(x => x.status === 'pendiente').length,
    en_progreso: this.tickets().filter(x => x.status === 'en_progreso').length,
    hecho:       this.tickets().filter(x => x.status === 'hecho').length,
    bloqueado:   this.tickets().filter(x => x.status === 'bloqueado').length,
  }));

  // ── Drag & Drop ────────────────────────────────────────────────────
  onDragStart(event: DragEvent, ticket: Ticket) {
    if (!this.permsSvc.hasPermission('ticket_state')) { event.preventDefault(); return; }
    this.draggingId.set(ticket.id);
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', ticket.id);
  }

  onDragEnd() {
    this.draggingId.set(null);
    this.columns.forEach(c => c.isDragOver = false);
  }

  onDragOver(event: DragEvent, col: KanbanColumn) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    if (!col.isDragOver) { col.isDragOver = true; this.cdr.detectChanges(); }
  }

  onDragLeave(col: KanbanColumn) {
    col.isDragOver = false;
    this.cdr.detectChanges();
  }

  onDrop(event: DragEvent, targetStatus: TicketStatus, col: KanbanColumn) {
    event.preventDefault();
    col.isDragOver = false;
    this.cdr.detectChanges();
    const id = this.draggingId();
    if (!id) return;

    this.ticketSvc.changeStatus(id, targetStatus).subscribe({
      next: () => {
        this.loadTickets();
        this.draggingId.set(null);
        this.msgSvc.add({ severity:'success', summary:'Movido', detail:`Ticket → ${this.col(targetStatus).label}`, life:2000 });
      },
      error: (err) => {
        this.draggingId.set(null);
        const msg = err?.status === 403
          ? 'Solo la persona asignada puede cambiar el estado de este ticket.'
          : (err?.error?.message ?? 'No se pudo cambiar el estado.');
        this.msgSvc.add({ severity: 'warn', summary: 'Sin permiso', detail: msg, life: 4000 });
      },
    });
  }

  openDetail(ticket: Ticket) {
    this.router.navigate(['/home/ticket', ticket.id]);
  }

  enterEditMode() {
    const t = this.selected();
    if (!t) return;
    this.editForm = {
      titulo: t.titulo, descripcion: t.descripcion, status: t.status,
      priority: t.priority, groupId: t.groupId,
      assignedToId: t.assignedToId, dueDate: t.dueDate ?? '',
    };
    this.editMode.set(true);
  }

  saveEdit() {
    const t = this.selected();
    if (!t || !this.editForm.titulo.trim()) return;
    const { dueDate, ...rest } = this.editForm;
    const changes: UpdateTicketDto = { ...rest, ...(dueDate ? { dueDate } : {}) };
    this.ticketSvc.update(t.id, changes).subscribe({
      next: updated => {
        this.loadTickets();
        this.editMode.set(false);
        this.selected.set(updated);
        this.msgSvc.add({ severity:'success', summary:'Guardado', detail:'Ticket actualizado.', life:2500 });
      },
      error: () => this.msgSvc.add({ severity:'error', summary:'Error', detail:'No se pudo actualizar.' }),
    });
  }

  deleteSelected() {
    const t = this.selected();
    if (!t) return;
    this.ticketSvc.delete(t.id).subscribe({
      next: () => {
        this.loadTickets();
        this.showDetail.set(false);
        this.msgSvc.add({ severity:'warn', summary:'Eliminado', detail:'Ticket eliminado.', life:2500 });
      },
      error: () => {},
    });
  }

  openCreate() {
    this.editForm = this.emptyForm();
    this.showCreate.set(true);
  }

  saveCreate() {
    if (!this.editForm.titulo.trim()) return;
    const { dueDate, ...dto } = this.editForm;
    this.ticketSvc.add({ ...dto, ...(dueDate ? { dueDate } : {}) }).subscribe({
      next: () => {
        this.loadTickets();
        this.showCreate.set(false);
        this.msgSvc.add({ severity:'success', summary:'Creado', detail:'Ticket creado.', life:2500 });
      },
      error: () => this.msgSvc.add({ severity:'error', summary:'Error', detail:'No se pudo crear.' }),
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────
  createdByName(id: string): string {
    return this.groupSvc.getGroupMembers().find(m => m.id === id)?.fullName ?? '—';
  }
  assigneeName(id: string): string {
    return this.groupSvc.getGroupMembers().find(m => m.id === id)?.fullName ?? '—';
  }
  assigneeInitial(id: string): string {
    return this.assigneeName(id).charAt(0).toUpperCase();
  }

  priorityMeta(p: TicketPriority): { color: string; bg: string } {
    const map: Record<TicketPriority, { color:string; bg:string }> = {
      baja:    { color:'#4ade80', bg:'rgba(74,222,128,.14)'  },
      media:   { color:'#f59e0b', bg:'rgba(245,158,11,.14)'  },
      alta:    { color:'#f87171', bg:'rgba(248,113,113,.14)' },
      critica: { color:'#e11d48', bg:'rgba(225,29,72,.16)'   },
    };
    return map[p] ?? { color:'#9a9cc0', bg:'rgba(154,156,192,.12)' };
  }

  isOverdue(dueDate?: string): boolean {
    return !!dueDate && new Date(dueDate) < new Date();
  }

  get formInvalid() { return !this.editForm.titulo.trim(); }
}
