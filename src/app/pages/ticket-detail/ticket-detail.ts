import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule }    from '@angular/common';
import { FormsModule }     from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule }    from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule }  from 'primeng/textarea';
import { SelectModule }    from 'primeng/select';
import { ToastModule }     from 'primeng/toast';
import { TooltipModule }   from 'primeng/tooltip';
import { DividerModule }   from 'primeng/divider';
import { MessageService }  from 'primeng/api';
import { AuthService }        from '../../Services/Auth.service';
import { TicketService }      from '../../Services/Ticket.service';
import { GroupService }       from '../../Services/Group.service';
import { PermissionsService } from '../../Services/Permissions.service';
import {
  Ticket, TicketStatus, HistoryAction,
  TicketPriorityExtended, PRIORITY_EXTENDED_META, AppGroup,
} from '../../models/Auth.model';

interface ActivityEntry {
  kind:      'comment' | 'history';
  id:        string;
  userId:    string;
  createdAt: string;
  text?:     string;
  action?:   HistoryAction;
  from?:     string;
  to?:       string;
  note?:     string;
}

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    ButtonModule, InputTextModule, TextareaModule,
    SelectModule, ToastModule, TooltipModule, DividerModule,
  ],
  providers: [MessageService],
  templateUrl: './ticket-detail.html',
  styleUrl:    './ticket-detail.css',
})
export class TicketDetailComponent implements OnInit {

  ticket  = signal<Ticket | null>(null);
  group   = signal<AppGroup | null>(null);
  loading = signal(false);

  editTitle  = signal(false);
  editDesc   = signal(false);
  draftTitle = '';
  draftDesc  = '';

  newComment = '';
  submitting = signal(false);

  priorityOptions = Object.entries(PRIORITY_EXTENDED_META)
    .map(([value, meta]) => ({
      label: meta.label,
      icon:  meta.icon,
      value: value as TicketPriorityExtended,
      color: meta.color,
      rank:  meta.rank,
    }))
    .sort((a, b) => a.rank - b.rank);

  statusOptions: { label: string; value: TicketStatus; accent: string }[] = [
    { label:'Pendiente',   value:'pendiente',   accent:'#f59e0b' },
    { label:'En progreso', value:'en_progreso', accent:'#38bdf8' },
    { label:'Hecho',       value:'hecho',       accent:'#4ade80' },
    { label:'Bloqueado',   value:'bloqueado',   accent:'#f87171' },
  ];

  memberOptions = computed(() =>
    this.groupSvc.getGroupMembers().map(m => ({ label: m.fullName, value: m.id }))
  );

  constructor(
    private route:     ActivatedRoute,
    private router:    Router,
    public  authSvc:   AuthService,
    public  permsSvc:  PermissionsService,
    private ticketSvc: TicketService,
    private groupSvc:  GroupService,
    private msgSvc:    MessageService,
  ) {}

  ngOnInit() {
    this.group.set(this.authSvc.getGroup());
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadTicket(id);
  }

  loadTicket(id: string) {
    this.loading.set(true);
    const cached = this.ticketSvc.getById(id);
    if (cached) {
      this.ticket.set(cached);
      this.loading.set(false);
      this._loadActivity(id);
    } else {
      this.ticketSvc.fetchById(id).subscribe({
        next:  t => { this.ticket.set(t); this.loading.set(false); this._loadActivity(id); },
        error: () => { this.loading.set(false); this.router.navigate(['/home']); },
      });
    }
  }

  private _loadActivity(id: string) {
    this.ticketSvc.loadComments(id).subscribe();
    this.ticketSvc.loadHistory(id).subscribe();
  }

  get currentUser()     { return this.authSvc.getUser(); }
  get isCreator()       { return this.ticket()?.createdById  === this.currentUser?.id; }
  get isAssignee()      { return this.ticket()?.assignedToId === this.currentUser?.id; }
  get canEditFields()   { return this.isCreator || this.permsSvc.hasPermission('ticket_edit'); }
  get canChangeStatus() { return this.isAssignee || this.isCreator || this.permsSvc.hasPermission('ticket_edit'); }
  get canComment()      { return this.isCreator || this.isAssignee || this.permsSvc.hasPermission('ticket_view'); }

  activity = computed((): ActivityEntry[] => {
    const t = this.ticket();
    if (!t) return [];
    const comments: ActivityEntry[] = this.ticketSvc.getComments(t.id).map(c => ({
      kind:'comment', id:c.id, userId:c.userId, createdAt:c.createdAt, text:c.text,
    }));
    const history: ActivityEntry[] = this.ticketSvc.getHistory(t.id).map(h => ({
      kind:'history', id:h.id, userId:h.userId, createdAt:h.createdAt,
      action:h.action, from:h.from, to:h.to, note:h.note,
    }));
    return [...comments, ...history].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  startEditTitle() { this.draftTitle = this.ticket()?.titulo ?? ''; this.editTitle.set(true); }

  saveTitle() {
    const t = this.ticket();
    if (!t || !this.draftTitle.trim()) { this.editTitle.set(false); return; }
    this.ticketSvc.update(t.id, { titulo: this.draftTitle.trim() }).subscribe({
      next:  updated => { this.ticket.set(updated); this.editTitle.set(false); this.toast('Título actualizado'); },
      error: () => this.editTitle.set(false),
    });
  }

  startEditDesc() { this.draftDesc = this.ticket()?.descripcion ?? ''; this.editDesc.set(true); }

  saveDesc() {
    const t = this.ticket();
    if (!t) { this.editDesc.set(false); return; }
    this.ticketSvc.update(t.id, { descripcion: this.draftDesc }).subscribe({
      next:  updated => { this.ticket.set(updated); this.editDesc.set(false); this.toast('Descripción actualizada'); },
      error: () => this.editDesc.set(false),
    });
  }

  changeStatus(status: TicketStatus) {
    const t = this.ticket();
    if (!t) return;
    this.ticketSvc.changeStatus(t.id, status).subscribe({
      next: updated => { this.ticket.set(updated); this.toast(`Estado → ${this.statusLabel(status)}`); },
      error: () => {},
    });
  }

  changePriority(pExt: TicketPriorityExtended) {
    const t = this.ticket();
    if (!t) return;
    const rank = PRIORITY_EXTENDED_META[pExt].rank;
    const base = rank <= 2 ? 'baja' : rank <= 3 ? 'media' : rank <= 4 ? 'alta' : 'critica';
    this.ticketSvc.update(t.id, { priority: base }).subscribe({
      next: updated => { this.ticket.set(updated); this.toast(`Prioridad → ${pExt}`); },
      error: () => {},
    });
  }

  reassign(userId: string) {
    const t = this.ticket();
    if (!t) return;
    this.ticketSvc.update(t.id, { assignedToId: userId }).subscribe({
      next: updated => { this.ticket.set(updated); this.toast(`Reasignado a ${this.userName(userId)}`); },
      error: () => {},
    });
  }

  changeDueDate(date: string) {
    const t = this.ticket();
    if (!t) return;
    this.ticketSvc.update(t.id, { dueDate: date }).subscribe({
      next: updated => { this.ticket.set(updated); this.toast('Fecha límite actualizada'); },
      error: () => {},
    });
  }

  addComment() {
    const t = this.ticket();
    if (!t || !this.newComment.trim()) return;
    this.submitting.set(true);
    this.ticketSvc.addComment(t.id, this.newComment.trim()).subscribe({
      next:  () => { this.newComment = ''; this.submitting.set(false); },
      error: () => this.submitting.set(false),
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────
  userName(id: string): string {
    const member = this.groupSvc.getGroupMembers().find(m => m.id === id);
    if (member) return member.fullName;
    if (id === this.authSvc.getUser()?.id) return this.authSvc.getUser()?.fullName ?? '—';
    return '—';
  }

  userInitial(id: string): string { return this.userName(id).charAt(0).toUpperCase(); }

  userColor(id: string): string {
    const n = [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
    return ['#7c6af7','#38bdf8','#4ade80','#f59e0b','#f87171'][n % 5];
  }

  statusLabel(s: TicketStatus): string {
    return this.statusOptions.find(o => o.value === s)?.label ?? s;
  }

  statusAccent(s: TicketStatus): string {
    return this.statusOptions.find(o => o.value === s)?.accent ?? '#9a9cc0';
  }

  priorityMeta(p: string) {
    const map: Record<string, TicketPriorityExtended> = {
      baja:'baja', media:'normal', alta:'alta', critica:'critica',
    };
    return PRIORITY_EXTENDED_META[map[p] ?? 'normal'];
  }

  historyIcon(action: HistoryAction): string {
    const map: Record<HistoryAction, string> = {
      created:'pi-plus-circle',       status_changed:'pi-refresh',
      priority_changed:'pi-flag',     assigned:'pi-user-edit',
      title_changed:'pi-pencil',      description_changed:'pi-align-left',
      duedate_changed:'pi-calendar',  comment_added:'pi-comment',
    };
    return map[action] ?? 'pi-circle';
  }

  historyLabel(e: ActivityEntry): string {
    const who = this.userName(e.userId);
    switch (e.action) {
      case 'created':             return `${who} creó el ticket`;
      case 'status_changed':      return `${who} cambió estado`;
      case 'priority_changed':    return `${who} cambió prioridad`;
      case 'assigned':            return `${who} reasignó el ticket`;
      case 'title_changed':       return `${who} actualizó el título`;
      case 'description_changed': return `${who} actualizó la descripción`;
      case 'duedate_changed':     return `${who} cambió la fecha límite`;
      case 'comment_added':       return `${who} agregó un comentario`;
      default:                    return `${who} realizó una acción`;
    }
  }

  formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleString('es-ES', {
        day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit',
      });
    } catch { return iso; }
  }

  isOverdue(d?: string): boolean { return !!d && new Date(d) < new Date(); }

  goBack() { this.router.navigate(['/home/kanban']); }

  private toast(detail: string) {
    this.msgSvc.add({ severity:'success', summary:'Guardado', detail, life:2000 });
  }
}
