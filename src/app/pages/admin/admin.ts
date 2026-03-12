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
import { AuthService }        from '../../Services/Auth.service';
import { PermissionsService } from '../../Services/Permissions.service';
import {
  AppUser, Permission, USERS, GROUPS, PERMISSION_SETS,
} from '../../models/Auth.model';

// ── Agrupación visual de permisos ──────────────────────────────────────────
export interface PermGroup {
  label: string;
  icon:  string;
  color: string;
  perms: Permission[];
}

export const PERM_GROUPS: PermGroup[] = [
  {
    label: 'Grupos',
    icon:  'pi-users',
    color: '#7c6af7',
    perms: ['groups_view','group_view','groups_edit','group_edit','groups_delete','group_delete','groups_add','group_add'],
  },
  {
    label: 'Usuarios',
    icon:  'pi-id-card',
    color: '#38bdf8',
    perms: ['users_view','user_view','users_edit','user_edit','user_delete','user_add'],
  },
  {
    label: 'Tickets',
    icon:  'pi-ticket',
    color: '#4ade80',
    perms: ['tickets_view','ticket_view','tickets_edit','ticket_edit','ticket_delete','tickets_add','ticket_add'],
  },
];

export const ALL_PERMISSIONS: Permission[] = PERM_GROUPS.flatMap(g => g.perms);

// ── Form para crear/editar usuario ─────────────────────────────────────────
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

  // ── Guard: solo superadmin ─────────────────────────────────────────
  isSuperAdmin = signal(false);

  // ── Lista reactiva de usuarios ─────────────────────────────────────
  users = signal<AppUser[]>([]);

  // ── Usuario seleccionado (panel derecho) ───────────────────────────
  selected = signal<AppUser | null>(null);

  // ── Búsqueda ───────────────────────────────────────────────────────
  search = signal('');

  filteredUsers = computed(() => {
    const q = this.search().toLowerCase().trim();
    return this.users().filter(u =>
      !q ||
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)    ||
      u.username.toLowerCase().includes(q)
    );
  });

  // ── Modals ─────────────────────────────────────────────────────────
  showCreate       = signal(false);
  showEdit         = signal(false);
  showDeleteConfirm = signal(false);

  // ── Forms ──────────────────────────────────────────────────────────
  emptyForm(): UserForm {
    return { fullName:'', username:'', email:'', password:'', phone:'', birthDate:'', address:'' };
  }
  userForm: UserForm = this.emptyForm();
  formError = '';

  // ── Permisos en edición ────────────────────────────────────────────
  draftPerms = signal<Set<Permission>>(new Set());

  // ── Constantes para template ───────────────────────────────────────
  permGroups    = PERM_GROUPS;
  allSets = Object.keys(PERMISSION_SETS);
  setNames: Record<string, string> = {
    superadmin: 'Superadmin',
    avanzado:   'Avanzado',
    basico:     'Básico',
  };

  constructor(
    private authSvc:  AuthService,
    private permsSvc: PermissionsService,
    private router:   Router,
    private msgSvc:   MessageService,
  ) {}

  ngOnInit() {
    const payload = this.authSvc.getPayload();
    const superPerms = PERMISSION_SETS['superadmin'];
    const isSuper = !!payload &&
      superPerms.every(p => payload.permissions.includes(p));
    this.isSuperAdmin.set(isSuper);

    if (!isSuper) {
      this.router.navigate(['/home']);
      return;
    }
    this.loadUsers();
  }

  loadUsers() {
    this.users.set([...USERS]);
  }

  selectUser(u: AppUser) {
    this.selected.set(u);
    this.draftPerms.set(new Set(u.permissions));
  }

  // ── Perfil rápido ─────────────────────────────────────────────────
  applySet(setKey: string) {
    const perms = PERMISSION_SETS[setKey];
    if (perms) this.draftPerms.set(new Set(perms));
  }

  // ── Toggle individual permission ──────────────────────────────────
  togglePerm(p: Permission) {
    const s = new Set(this.draftPerms());
    s.has(p) ? s.delete(p) : s.add(p);
    this.draftPerms.set(s);
  }

  hasPerm(p: Permission): boolean { return this.draftPerms().has(p); }

  // ── Save permissions ──────────────────────────────────────────────
  savePermissions() {
    const u = this.selected();
    if (!u) return;
    const idx = USERS.findIndex(x => x.id === u.id);
    if (idx === -1) return;
    USERS[idx].permissions = [...this.draftPerms()] as Permission[];
    this.authSvc.refreshToken(u.id);   // re-emite JWT con permisos nuevos
    this.loadUsers();
    const updated = USERS[idx];
    this.selected.set({ ...updated });
    this.draftPerms.set(new Set(updated.permissions));
    this.toast('success', 'Permisos guardados', `Permisos de ${u.fullName} actualizados.`);
  }

  discardPermissions() {
    const u = this.selected();
    if (!u) return;
    this.draftPerms.set(new Set(u.permissions));
  }

  // ── Create user ───────────────────────────────────────────────────
  openCreate() {
    this.userForm  = this.emptyForm();
    this.formError = '';
    this.draftPerms.set(new Set(PERMISSION_SETS['basico']));
    this.showCreate.set(true);
  }

  saveCreate() {
    this.formError = '';
    if (!this.userForm.fullName.trim()) { this.formError = 'El nombre es obligatorio.'; return; }
    if (!this.userForm.email.trim())    { this.formError = 'El correo es obligatorio.';  return; }
    if (!this.userForm.password.trim()) { this.formError = 'La contraseña es obligatoria.'; return; }
    if (USERS.find(u => u.email === this.userForm.email.trim())) {
      this.formError = 'Ya existe un usuario con ese correo.'; return;
    }

    const newId = Math.max(...USERS.map(u => u.id)) + 1;
    const newUser: AppUser = {
      id:          newId,
      fullName:    this.userForm.fullName.trim(),
      username:    this.userForm.username.trim() || this.userForm.email.split('@')[0],
      email:       this.userForm.email.trim(),
      password:    this.userForm.password,
      phone:       this.userForm.phone.trim(),
      birthDate:   this.userForm.birthDate,
      address:     this.userForm.address.trim(),
      permissions: [...this.draftPerms()] as Permission[],
      groupIds:    [],
    };
    USERS.push(newUser);
    this.loadUsers();
    this.showCreate.set(false);
    this.selectUser(newUser);
    this.toast('success', 'Usuario creado', `${newUser.fullName} ha sido creado.`);
  }

  // ── Edit user ─────────────────────────────────────────────────────
  openEdit(u: AppUser) {
    this.userForm = {
      fullName:  u.fullName,
      username:  u.username,
      email:     u.email,
      password:  u.password,
      phone:     u.phone,
      birthDate: u.birthDate,
      address:   u.address,
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

    const idx = USERS.findIndex(x => x.id === u.id);
    if (idx === -1) return;
    const updated: AppUser = {
      ...USERS[idx],
      fullName:  this.userForm.fullName.trim(),
      username:  this.userForm.username.trim(),
      email:     this.userForm.email.trim(),
      password:  this.userForm.password || USERS[idx].password,
      phone:     this.userForm.phone.trim(),
      birthDate: this.userForm.birthDate,
      address:   this.userForm.address.trim(),
    };
    USERS[idx] = updated;
    this.loadUsers();
    this.selected.set({ ...updated });
    this.showEdit.set(false);
    this.toast('success', 'Usuario actualizado', `${updated.fullName} ha sido actualizado.`);
  }

  // ── Delete user ───────────────────────────────────────────────────
  confirmDelete(u: AppUser) {
    this.selected.set(u);
    this.showDeleteConfirm.set(true);
  }

  executeDelete() {
    const u = this.selected();
    if (!u) return;
    const me = this.authSvc.getUser();
    if (u.id === me?.id) {
      this.toast('warn', 'Operación no permitida', 'No puedes eliminar tu propia cuenta.');
      this.showDeleteConfirm.set(false);
      return;
    }
    const idx = USERS.findIndex(x => x.id === u.id);
    if (idx !== -1) USERS.splice(idx, 1);
    this.loadUsers();
    this.selected.set(this.users()[0] ?? null);
    this.showDeleteConfirm.set(false);
    this.toast('warn', 'Usuario eliminado', `${u.fullName} fue eliminado.`);
  }

  // ── Helpers ───────────────────────────────────────────────────────
  userColor(id: number): string {
    return ['#7c6af7','#38bdf8','#4ade80','#f59e0b','#f87171'][id % 5];
  }

  groupName(gid: number): string {
    return GROUPS.find(g => g.id === gid)?.nombre ?? '—';
  }

  profileLabel(u: AppUser): string {
    if (PERMISSION_SETS['superadmin'].every(p => u.permissions.includes(p))) return 'Superadmin';
    if (u.permissions.length > PERMISSION_SETS['basico'].length) return 'Avanzado';
    return 'Básico';
  }

  profileColor(u: AppUser): string {
    if (PERMISSION_SETS['superadmin'].every(p => u.permissions.includes(p))) return '#7c6af7';
    if (u.permissions.length > PERMISSION_SETS['basico'].length) return '#38bdf8';
    return '#4ade80';
  }

  permLabel(p: Permission): string { return p; }

  groupForPerm(p: Permission): PermGroup | undefined {
    return PERM_GROUPS.find(g => g.perms.includes(p));
  }

  get draftCount(): number { return this.draftPerms().size; }

  get permsDirty(): boolean {
    const u = this.selected();
    if (!u) return false;
    const orig = new Set(u.permissions);
    const draft = this.draftPerms();
    if (orig.size !== draft.size) return true;
    for (const p of draft) { if (!orig.has(p)) return true; }
    return false;
  }

  private toast(severity: string, summary: string, detail: string) {
    this.msgSvc.add({ severity, summary, detail, life: 3000 });
  }
}