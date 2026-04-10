import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule }    from '@angular/common';
import { FormsModule }     from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule }    from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule }  from 'primeng/textarea';
import { ToastModule }     from 'primeng/toast';
import { TooltipModule }   from 'primeng/tooltip';
import { DividerModule }   from 'primeng/divider';
import { MessageService }  from 'primeng/api';
import { AuthService }        from '../../Services/Auth.service';
import { TicketService }      from '../../Services/Ticket.service';
import { GroupService }       from '../../Services/Group.service';
import { UserService }        from '../../Services/User.service';
import { PermissionsService } from '../../Services/Permissions.service';
import { AppUser, TicketStatus, Permission, PERMISSION_SETS } from '../../models/Auth.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    ButtonModule, InputTextModule, TextareaModule,
    ToastModule, TooltipModule, DividerModule,
  ],
  providers: [MessageService],
  templateUrl: './profile.html',
  styleUrl:    './profile.css',
})
export class ProfileComponent implements OnInit {

  profileUser = signal<AppUser | null>(null);
  isSelf      = signal(false);
  loading     = signal(false);

  editing   = signal(false);
  draftForm = { fullName:'', username:'', email:'', phone:'', birthDate:'', address:'' };

  ticketFilter = signal<TicketStatus | 'todos'>('todos');

  statusTabs: { label:string; value:TicketStatus|'todos'; icon:string; color:string }[] = [
    { label:'Todos',       value:'todos',       icon:'pi-list',         color:'#7c6af7' },
    { label:'Pendiente',   value:'pendiente',   icon:'pi-clock',        color:'#f59e0b' },
    { label:'En progreso', value:'en_progreso', icon:'pi-refresh',      color:'#38bdf8' },
    { label:'Hecho',       value:'hecho',       icon:'pi-check-circle', color:'#4ade80' },
    { label:'Bloqueado',   value:'bloqueado',   icon:'pi-ban',          color:'#f87171' },
  ];

  constructor(
    private route:     ActivatedRoute,
    private router:    Router,
    public  authSvc:   AuthService,
    public  permsSvc:  PermissionsService,
    private ticketSvc: TicketService,
    private groupSvc:  GroupService,
    private userSvc:   UserService,
    private msgSvc:    MessageService,
  ) {}

  ngOnInit() {
    const paramId = this.route.snapshot.paramMap.get('id');
    const me      = this.authSvc.getUser();

    if (paramId) {
      this.isSelf.set(paramId === me?.id);
      this.loading.set(true);
      this.userSvc.getUser(paramId).subscribe({
        next:  u => { this.profileUser.set(u); this.loading.set(false); },
        error: () => { this.loading.set(false); this.router.navigate(['/home/user']); },
      });
    } else {
      this.isSelf.set(true);
      this.loading.set(true);
      this.userSvc.getMe().subscribe({
        next:  u => { this.profileUser.set(u); this.loading.set(false); },
        error: () => { this.profileUser.set(me ?? null); this.loading.set(false); },
      });
    }
  }

  // ── Tickets del usuario perfilado (del grupo activo) ──────────────
  private allTickets = computed(() => {
    const u = this.profileUser();
    const g = this.authSvc.getGroup();
    if (!u || !g) return [];
    return this.ticketSvc.getByGroupAndUser(g.id, u.id);
  });

  filteredTickets = computed(() => {
    const f = this.ticketFilter();
    if (f === 'todos') return this.allTickets();
    return this.allTickets().filter(t => t.status === f);
  });

  counts = computed(() => {
    const all = this.allTickets();
    return {
      todos:       all.length,
      pendiente:   all.filter(t => t.status === 'pendiente').length,
      en_progreso: all.filter(t => t.status === 'en_progreso').length,
      hecho:       all.filter(t => t.status === 'hecho').length,
      bloqueado:   all.filter(t => t.status === 'bloqueado').length,
    };
  });

  // ── Edición ───────────────────────────────────────────────────────
  get canEdit(): boolean {
    return this.permsSvc.hasPermission('user_edit');
  }

  startEdit() {
    const u = this.profileUser();
    if (!u) return;
    this.draftForm = {
      fullName:  u.fullName,
      username:  u.username,
      email:     u.email,
      phone:     u.phone    ?? '',
      birthDate: u.birthDate ?? '',
      address:   u.address  ?? '',
    };
    this.editing.set(true);
  }

  saveEdit() {
    const u = this.profileUser();
    if (!u || !this.draftForm.fullName.trim()) return;

    const dto = {
      fullName:  this.draftForm.fullName.trim(),
      username:  this.draftForm.username.trim(),
      email:     this.draftForm.email.trim(),
      phone:     this.draftForm.phone,
      birthDate: this.draftForm.birthDate,
      address:   this.draftForm.address.trim(),
    };

    const update$ = this.isSelf()
      ? this.userSvc.updateMe(u.id, dto)
      : this.userSvc.updateUser(u.id, dto);

    update$.subscribe({
      next: updated => {
        this.profileUser.set(updated);
        this.editing.set(false);
        this.msgSvc.add({ severity:'success', summary:'Guardado', detail:'Perfil actualizado.', life:2500 });
      },
      error: (err) => {
        this.msgSvc.add({ severity:'error', summary:'Error', detail: err?.error?.message ?? 'No se pudo actualizar.', life:3000 });
      },
    });
  }

  cancelEdit() { this.editing.set(false); }

  // ── Helpers ───────────────────────────────────────────────────────
  userColor(id: string): string {
    const n = [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
    return ['#7c6af7','#38bdf8','#4ade80','#f59e0b','#f87171'][n % 5];
  }

  userInitial(u: AppUser): string { return u?.fullName?.charAt(0)?.toUpperCase() ?? '?'; }

  groupName(gid: string): string {
    return this.groupSvc.getGroupById(gid)?.nombre ?? '—';
  }

  groupColor(gid: string): string {
    return this.groupSvc.getGroupById(gid)?.color ?? '#1a1d30';
  }

  profileLabel(u: AppUser): string {
    const perms = u.permissions ?? [];
    if (PERMISSION_SETS['superadmin'].every((p: Permission) => perms.includes(p))) return 'Superadmin';
    if (perms.length >= 10) return 'Admin';
    return 'Miembro';
  }

  profileBadgeColor(u: AppUser): string {
    const perms = u.permissions ?? [];
    if (PERMISSION_SETS['superadmin'].every((p: Permission) => perms.includes(p))) return '#7c6af7';
    if (perms.length >= 10) return '#38bdf8';
    return '#4ade80';
  }

  statusMeta(s: TicketStatus) {
    const map = {
      pendiente:   { label:'Pendiente',   color:'#f59e0b', bg:'rgba(245,158,11,.12)',  icon:'pi-clock'        },
      en_progreso: { label:'En progreso', color:'#38bdf8', bg:'rgba(56,189,248,.12)',  icon:'pi-refresh'      },
      hecho:       { label:'Hecho',       color:'#4ade80', bg:'rgba(74,222,128,.12)',  icon:'pi-check-circle' },
      bloqueado:   { label:'Bloqueado',   color:'#f87171', bg:'rgba(248,113,113,.12)', icon:'pi-ban'          },
    };
    return map[s];
  }

  priorityMeta(p: string) {
    const map: Record<string, { color:string; label:string }> = {
      baja:    { color:'#4ade80', label:'Baja'    },
      media:   { color:'#38bdf8', label:'Media'   },
      alta:    { color:'#f59e0b', label:'Alta'    },
      critica: { color:'#f87171', label:'Crítica' },
    };
    return map[p] ?? { color:'#9a9cc0', label: p };
  }

  isOverdue(d?: string, s?: TicketStatus): boolean {
    return !!d && s !== 'hecho' && new Date(d) < new Date();
  }

  formatDate(d?: string): string {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' }); }
    catch { return d; }
  }

  openTicket(id: string) { this.router.navigate(['/home/ticket', id]); }

  goBack() { this.router.navigate(['/home/user']); }
}
