import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule }    from '@angular/common';
import { FormsModule }     from '@angular/forms';
import { Router }          from '@angular/router';
import { ButtonModule }    from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule }    from 'primeng/dialog';
import { ToastModule }     from 'primeng/toast';
import { TooltipModule }   from 'primeng/tooltip';
import { DividerModule }   from 'primeng/divider';
import { MessageService }  from 'primeng/api';
import { AuthService }  from '../../Services/Auth.service';
import { UserService }  from '../../Services/User.service';
import { GroupService } from '../../Services/Group.service';
import { AppUser, Permission, PERMISSION_SETS } from '../../models/Auth.model';

export interface PermGroup {
  label: string;
  icon:  string;
  color: string;
  perms: Permission[];
}

export const PERM_GROUPS: PermGroup[] = [
  {
    label: 'Grupos',   icon: 'pi-users',   color: '#7c6af7',
    perms: ['groups_view','group_view','groups_edit','group_edit','groups_delete','group_delete','groups_add','group_add'],
  },
  {
    label: 'Usuarios', icon: 'pi-id-card', color: '#38bdf8',
    perms: ['users_view','user_view','users_edit','user_edit','user_delete','user_add'],
  },
  {
    label: 'Tickets',  icon: 'pi-ticket',  color: '#4ade80',
    perms: ['tickets_view','ticket_view','tickets_edit','ticket_edit','ticket_delete','tickets_add','ticket_add','ticket_state'],
  },
];

export interface UserForm {
  fullName:  string;
  username:  string;
  email:     string;
  password:  string;
  phone:     string;
  birthDate: string;
  address:   string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule, DialogModule,
    ToastModule, TooltipModule, DividerModule,
  ],
  providers: [MessageService],
  templateUrl: './admin.html',
  styleUrl:    './admin.css',
})
export class AdminComponent implements OnInit {

  isSuperAdmin = signal(false);
  users        = signal<AppUser[]>([]);
  selected     = signal<AppUser | null>(null);
  search       = signal('');
  loading      = signal(false);

  filteredUsers = computed(() => {
    const q = this.search().toLowerCase().trim();
    return this.users().filter(u =>
      !q ||
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)    ||
      u.username.toLowerCase().includes(q)
    );
  });

  showEdit          = signal(false);
  showDeleteConfirm = signal(false);

  userForm: UserForm = { fullName:'', username:'', email:'', password:'', phone:'', birthDate:'', address:'' };
  formError = '';

  draftPerms = signal<Set<Permission>>(new Set());

  permGroups = PERM_GROUPS;
  allSets    = Object.keys(PERMISSION_SETS);
  setNames: Record<string, string> = { superadmin:'Superadmin', avanzado:'Avanzado', basico:'Básico' };

  constructor(
    private authSvc:  AuthService,
    private userSvc:  UserService,
    private groupSvc: GroupService,
    private router:   Router,
    private msgSvc:   MessageService,
  ) {}

  ngOnInit() {
    const payload    = this.authSvc.getPayload();
    const superPerms = PERMISSION_SETS['superadmin'];
    const isSuper    = !!payload && Array.isArray(payload.permisos) && superPerms.every(p => payload.permisos.includes(p));
    this.isSuperAdmin.set(isSuper);

    if (!isSuper) { this.router.navigate(['/home']); return; }
    this.loadUsers();
  }

  loadUsers() {
    this.loading.set(true);
    this.userSvc.loadUsers().subscribe({
      next: users => {
        this.users.set(users);
        this.loading.set(false);
        const currentId = this.authSvc.getUser()?.id;
        const me = currentId ? users.find(u => u.id === currentId) : null;
        if (me) this.selectUser(me);
      },
      error: () => this.loading.set(false),
    });
  }

  selectUser(u: AppUser) {
    this.selected.set(u);
    this.draftPerms.set(new Set(u.permissions ?? []));
    if (!u.permissions) {
      this.userSvc.getUserPermissions(u.id).subscribe({
        next: perms => {
          const updated = { ...u, permissions: perms };
          this.selected.set(updated);
          this.draftPerms.set(new Set(perms));
        },
        error: () => {},
      });
    }
  }

  applySet(setKey: string) {
    const perms = PERMISSION_SETS[setKey];
    if (perms) this.draftPerms.set(new Set(perms));
  }

  togglePerm(p: Permission) {
    const s = new Set(this.draftPerms());
    s.has(p) ? s.delete(p) : s.add(p);
    this.draftPerms.set(s);
  }

  hasPerm(p: Permission): boolean { return this.draftPerms().has(p); }

  savePermissions() {
    const u = this.selected();
    if (!u) return;
    const perms = [...this.draftPerms()] as Permission[];
    this.userSvc.updateUserPermissions(u.id, perms).subscribe({
      next: () => {
        const updated = { ...u, permissions: perms };
        this.users.update(list => list.map(x => x.id === u.id ? updated : x));
        this.selected.set(updated);
        this.draftPerms.set(new Set(perms));
        if (u.id === this.authSvc.getUser()?.id) this.authSvc.refreshPermissions();
        this.toast('success', 'Permisos guardados', `Permisos de ${u.fullName} actualizados.`);
      },
      error: (err) => this.toast('error', 'Error', err?.error?.message ?? 'No se pudo actualizar.'),
    });
  }

  discardPermissions() {
    const u = this.selected();
    if (u) this.draftPerms.set(new Set(u.permissions ?? []));
  }

  // ── Editar usuario ────────────────────────────────────────────────
  openEdit(u: AppUser) {
    this.userForm = {
      fullName:  u.fullName,
      username:  u.username,
      email:     u.email,
      password:  '',
      phone:     u.phone     ?? '',
      birthDate: u.birthDate ?? '',
      address:   u.address   ?? '',
    };
    this.formError = '';
    this.selected.set(u);
    this.showEdit.set(true);
  }

  saveEdit() {
    this.formError = '';
    const u = this.selected();
    if (!u) return;
    if (!this.userForm.fullName.trim()) { this.formError = 'El nombre es obligatorio.'; return; }
    if (!this.userForm.email.trim())    { this.formError = 'El correo es obligatorio.';  return; }

    const dto: Record<string, string | undefined> = {
      fullName:  this.userForm.fullName.trim(),
      username:  this.userForm.username.trim(),
      email:     this.userForm.email.trim(),
      phone:     this.userForm.phone.trim()    || undefined,
      birthDate: this.userForm.birthDate       || undefined,
      address:   this.userForm.address.trim()  || undefined,
    };
    if (this.userForm.password.trim()) dto['password'] = this.userForm.password;

    this.userSvc.updateUser(u.id, dto).subscribe({
      next: updated => {
        const withPerms = { ...updated, permissions: u.permissions };
        this.users.update(list => list.map(x => x.id === u.id ? withPerms : x));
        this.selected.set(withPerms);
        this.showEdit.set(false);
        this.toast('success', 'Usuario actualizado', `${updated.fullName} ha sido actualizado.`);
      },
      error: (err) => { this.formError = err?.error?.message ?? 'Error al actualizar.'; },
    });
  }

  // ── Eliminar usuario ──────────────────────────────────────────────
  confirmDelete(u: AppUser) {
    this.selected.set(u);
    this.showDeleteConfirm.set(true);
  }

  executeDelete() {
    const u  = this.selected();
    if (!u) return;
    if (u.id === this.authSvc.getUser()?.id) {
      this.toast('warn', 'No permitido', 'No puedes eliminar tu propia cuenta.');
      this.showDeleteConfirm.set(false);
      return;
    }
    this.userSvc.deleteUser(u.id).subscribe({
      next: () => {
        this.users.update(list => list.filter(x => x.id !== u.id));
        this.selected.set(this.users()[0] ?? null);
        this.showDeleteConfirm.set(false);
        this.toast('warn', 'Usuario eliminado', `${u.fullName} fue eliminado.`);
      },
      error: (err) => {
        this.showDeleteConfirm.set(false);
        this.toast('error', 'Error', err?.error?.message ?? 'No se pudo eliminar.');
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────
  userColor(id: string): string {
    const n = [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
    return ['#7c6af7','#38bdf8','#4ade80','#f59e0b','#f87171'][n % 5];
  }

  groupName(gid: string): string {
    return this.groupSvc.getGroupById(gid)?.nombre ?? '—';
  }

  profileLabel(u: AppUser): string {
    const perms = u.permissions ?? [];
    if (PERMISSION_SETS['superadmin'].every(p => perms.includes(p))) return 'Superadmin';
    if (perms.length > PERMISSION_SETS['basico'].length)             return 'Avanzado';
    return 'Básico';
  }

  profileColor(u: AppUser): string {
    const perms = u.permissions ?? [];
    if (PERMISSION_SETS['superadmin'].every(p => perms.includes(p))) return '#7c6af7';
    if (perms.length > PERMISSION_SETS['basico'].length)             return '#38bdf8';
    return '#4ade80';
  }

  groupForPerm(p: Permission): PermGroup | undefined {
    return PERM_GROUPS.find(g => g.perms.includes(p));
  }

  get draftCount(): number  { return this.draftPerms().size; }
  get permsDirty(): boolean {
    const u = this.selected();
    if (!u) return false;
    const orig  = new Set(u.permissions ?? []);
    const draft = this.draftPerms();
    if (orig.size !== draft.size) return true;
    for (const p of draft) { if (!orig.has(p)) return true; }
    return false;
  }

  private toast(severity: string, summary: string, detail: string) {
    this.msgSvc.add({ severity, summary, detail, life: 3000 });
  }
}
