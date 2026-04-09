import { Component, signal, OnInit } from '@angular/core';
import { CommonModule }    from '@angular/common';
import { FormsModule }     from '@angular/forms';
import { Router }          from '@angular/router';
import { ButtonModule }    from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule }  from 'primeng/textarea';
import { SelectModule }    from 'primeng/select';
import { CheckboxModule }  from 'primeng/checkbox';
import { DialogModule }    from 'primeng/dialog';
import { ToastModule }     from 'primeng/toast';
import { TooltipModule }   from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AuthService }        from '../../Services/Auth.service';
import { TicketService }      from '../../Services/Ticket.service';
import { PermissionsService } from '../../Services/Permissions.service';
import {
  AppGroup, AppUser, USERS, GROUPS,
  Permission, ALL_PERMISSIONS, PERM_LABELS, PERM_CATEGORIES,
} from '../../models/Auth.model';

interface ManagedGroup extends AppGroup {
  members: AppUser[];
}

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule, TextareaModule, SelectModule, CheckboxModule,
    DialogModule, ToastModule, TooltipModule, ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './groups.html',
  styleUrl:    './groups.css',
})
export class GroupsComponent implements OnInit {

  // ── Estado ────────────────────────────────────────────────────────
  groups   = signal<ManagedGroup[]>([]);
  selected = signal<ManagedGroup | null>(null);

  // ── Modals CRUD ───────────────────────────────────────────────────
  showCreateGroup   = signal(false);
  showEditGroup     = signal(false);
  showDeleteConfirm = signal(false);
  showAddMember     = signal(false);
  showRemoveConfirm = signal(false);
  memberToRemove    = signal<AppUser | null>(null);

  // ── Modals de permisos ────────────────────────────────────────────
  showUserPermsModal  = signal(false);
  showGroupPermsModal = signal(false);
  permsUser           = signal<AppUser | null>(null);

  // Formularios de checkboxes: Permission → boolean
  permsForm:      Partial<Record<Permission, boolean>> = {};
  groupPermsForm: Partial<Record<Permission, boolean>> = {};

  // Categorías y etiquetas expuestas al template
  permCategories = PERM_CATEGORIES;
  permLabels     = PERM_LABELS;

  // ── Forms CRUD ────────────────────────────────────────────────────
  groupForm = { nombre: '', descripcion: '', nivel: '', color: '#1e1b4b', model: '' };
  addMemberEmail = '';
  addMemberError = '';

  constructor(
    public  authSvc:   AuthService,
    public  permsSvc:  PermissionsService,
    private ticketSvc: TicketService,
    private router:    Router,
    private msgSvc:    MessageService,
    private confirmSvc: ConfirmationService,
  ) {}

  ngOnInit() {
    this.loadGroups();
    const active = this.authSvc.getGroup();
    if (active) {
      const mg = this.groups().find(g => g.id === active.id);
      if (mg) this.selected.set(mg);
    }
  }

  loadGroups() {
    const user = this.authSvc.getUser();
    const userGroups = GROUPS.filter(g => user?.groupIds.includes(g.id));
    const managed: ManagedGroup[] = userGroups.map(g => ({
      ...g,
      members: USERS.filter(u => u.groupIds.includes(g.id)),
    }));
    this.groups.set(managed);
  }

  selectGroup(g: ManagedGroup) { this.selected.set(g); }

  // ── Permisos globales ─────────────────────────────────────────────
  can(p: string) { return this.permsSvc.hasPermission(p as any); }

  // ── Crear grupo ───────────────────────────────────────────────────
  openCreate() {
    this.groupForm = { nombre: '', descripcion: '', nivel: 'Básico', color: '#1e1b4b', model: '' };
    this.showCreateGroup.set(true);
  }

  saveCreate() {
    if (!this.groupForm.nombre.trim()) return;
    const newId = Math.max(...GROUPS.map(g => g.id)) + 1;
    const newGroup: AppGroup = {
      id:          newId,
      nombre:      this.groupForm.nombre.trim(),
      descripcion: this.groupForm.descripcion.trim(),
      nivel:       this.groupForm.nivel || 'Básico',
      color:       this.groupForm.color,
      model:       this.groupForm.model || 'GPT-4o',
      autor:       this.authSvc.getUser()?.fullName ?? '—',
      integrantes: 1,
      tickets:     0,
      defaultPermissions: ['tickets_view', 'ticket_view'],
    };
    GROUPS.push(newGroup);
    this.loadGroups();
    this.showCreateGroup.set(false);
    this.toast('success', 'Grupo creado', `"${newGroup.nombre}" creado correctamente.`);
  }

  // ── Editar grupo ──────────────────────────────────────────────────
  openEdit(g: ManagedGroup) {
    this.groupForm = {
      nombre:      g.nombre,
      descripcion: g.descripcion,
      nivel:       g.nivel,
      color:       g.color,
      model:       g.model,
    };
    this.selected.set(g);
    this.showEditGroup.set(true);
  }

  saveEdit() {
    const g = this.selected();
    if (!g || !this.groupForm.nombre.trim()) return;
    const idx = GROUPS.findIndex(x => x.id === g.id);
    if (idx === -1) return;
    GROUPS[idx] = {
      ...GROUPS[idx],
      nombre:      this.groupForm.nombre.trim(),
      descripcion: this.groupForm.descripcion.trim(),
      nivel:       this.groupForm.nivel,
      color:       this.groupForm.color,
      model:       this.groupForm.model,
    };
    this.loadGroups();
    const updated = this.groups().find(x => x.id === g.id);
    this.selected.set(updated ?? null);
    this.showEditGroup.set(false);
    this.toast('success', 'Guardado', 'Configuración del grupo actualizada.');
  }

  // ── Eliminar grupo ────────────────────────────────────────────────
  confirmDelete(g: ManagedGroup) {
    this.selected.set(g);
    this.showDeleteConfirm.set(true);
  }

  executeDelete() {
    const g = this.selected();
    if (!g) return;
    const idx = GROUPS.findIndex(x => x.id === g.id);
    if (idx !== -1) GROUPS.splice(idx, 1);
    this.loadGroups();
    this.selected.set(this.groups()[0] ?? null);
    this.showDeleteConfirm.set(false);
    this.toast('warn', 'Eliminado', `Grupo "${g.nombre}" eliminado.`);
  }

  // ── Agregar miembro ───────────────────────────────────────────────
  openAddMember() {
    this.addMemberEmail = '';
    this.addMemberError = '';
    this.showAddMember.set(true);
  }

  saveAddMember() {
    const g = this.selected();
    if (!g) return;
    const email = this.addMemberEmail.trim().toLowerCase();
    const user  = USERS.find(u => u.email.toLowerCase() === email);

    if (!user) {
      this.addMemberError = 'No se encontró ningún usuario con ese correo.';
      return;
    }
    if (user.groupIds.includes(g.id)) {
      this.addMemberError = 'Este usuario ya pertenece al grupo.';
      return;
    }

    user.groupIds.push(g.id);
    // Aplicar permisos por defecto del grupo al nuevo miembro
    if (g.defaultPermissions?.length) {
      if (!user.groupPermissions) user.groupPermissions = {};
      user.groupPermissions[g.id] = [...g.defaultPermissions];
    }
    this.loadGroups();
    const updated = this.groups().find(x => x.id === g.id);
    this.selected.set(updated ?? null);
    this.showAddMember.set(false);
    this.toast('success', 'Miembro añadido', `${user.fullName} se unió a "${g.nombre}".`);
  }

  // ── Eliminar miembro ──────────────────────────────────────────────
  confirmRemove(user: AppUser) {
    this.memberToRemove.set(user);
    this.showRemoveConfirm.set(true);
  }

  executeRemove() {
    const g    = this.selected();
    const user = this.memberToRemove();
    if (!g || !user) return;
    const i = user.groupIds.indexOf(g.id);
    if (i !== -1) user.groupIds.splice(i, 1);
    // Limpiar overrides de permisos del grupo eliminado
    if (user.groupPermissions) delete user.groupPermissions[g.id];
    this.loadGroups();
    const updated = this.groups().find(x => x.id === g.id);
    this.selected.set(updated ?? null);
    this.memberToRemove.set(null);
    this.showRemoveConfirm.set(false);
    this.toast('warn', 'Miembro eliminado', `${user.fullName} fue removido del grupo.`);
  }

  // ── Permisos por usuario en grupo ─────────────────────────────────

  /** Devuelve los permisos efectivos del usuario en el grupo seleccionado */
  getEffectivePerms(u: AppUser): Permission[] {
    const g = this.selected();
    if (!g) return u.permissions;
    return u.groupPermissions?.[g.id] ?? u.permissions;
  }

  /** True si el usuario tiene overrides específicos para el grupo seleccionado */
  hasGroupOverride(u: AppUser): boolean {
    const g = this.selected();
    return !!(g && u.groupPermissions?.[g.id]);
  }

  /** Cuenta de permisos efectivos para mostrar en la fila */
  getEffectivePermCount(u: AppUser): number {
    return this.getEffectivePerms(u).length;
  }

  /** Abre el modal de permisos del usuario en el grupo */
  openUserPerms(u: AppUser) {
    this.permsUser.set(u);
    const effective = this.getEffectivePerms(u);
    this.permsForm = {};
    ALL_PERMISSIONS.forEach(p => { this.permsForm[p] = effective.includes(p); });
    this.showUserPermsModal.set(true);
  }

  /** Guarda los permisos editados como override del grupo para ese usuario */
  saveUserPerms() {
    const u = this.permsUser();
    const g = this.selected();
    if (!u || !g) return;
    const active = ALL_PERMISSIONS.filter(p => this.permsForm[p]);
    if (!u.groupPermissions) u.groupPermissions = {};
    u.groupPermissions[g.id] = active;
    this.loadGroups();
    const updated = this.groups().find(x => x.id === g.id);
    this.selected.set(updated ?? null);
    this.showUserPermsModal.set(false);
    this.toast('success', 'Permisos actualizados',
      `Permisos de ${u.fullName} en "${g.nombre}" guardados.`);
  }

  /** Elimina el override y vuelve a usar los permisos globales del usuario */
  resetToGlobal() {
    const u = this.permsUser();
    const g = this.selected();
    if (!u || !g || !u.groupPermissions) return;
    delete u.groupPermissions[g.id];
    this.loadGroups();
    const updated = this.groups().find(x => x.id === g.id);
    this.selected.set(updated ?? null);
    this.showUserPermsModal.set(false);
    this.toast('info', 'Override eliminado',
      `${u.fullName} usará sus permisos globales en "${g.nombre}".`);
  }

  // ── Permisos por defecto del grupo ────────────────────────────────

  /** Abre el modal de permisos base del grupo */
  openGroupPerms() {
    const g = this.selected();
    if (!g) return;
    const current = g.defaultPermissions ?? [];
    this.groupPermsForm = {};
    ALL_PERMISSIONS.forEach(p => { this.groupPermsForm[p] = current.includes(p); });
    this.showGroupPermsModal.set(true);
  }

  /** Guarda los permisos base del grupo */
  saveGroupPerms() {
    const g = this.selected();
    if (!g) return;
    const active = ALL_PERMISSIONS.filter(p => this.groupPermsForm[p]);
    const idx = GROUPS.findIndex(x => x.id === g.id);
    if (idx !== -1) GROUPS[idx].defaultPermissions = active;
    this.loadGroups();
    const updated = this.groups().find(x => x.id === g.id);
    this.selected.set(updated ?? null);
    this.showGroupPermsModal.set(false);
    this.toast('success', 'Permisos del grupo guardados',
      `Se actualizaron los permisos base de "${g.nombre}".`);
  }

  /** Cuenta de permisos activos en groupPermsForm */
  groupPermsActiveCount(): number {
    return ALL_PERMISSIONS.filter(p => this.groupPermsForm[p]).length;
  }

  // ── Navegación ────────────────────────────────────────────────────
  openProfile(userId: number) { this.router.navigate(['/home/profile', userId]); }

  // ── Helpers ───────────────────────────────────────────────────────
  userColor(id: number) { return ['#7c6af7','#38bdf8','#4ade80','#f59e0b','#f87171'][id % 5]; }

  ticketCount(groupId: number): number {
    return this.ticketSvc.getByGroup(groupId).length;
  }

  nivelOptions = ['Básico', 'Intermedio', 'Avanzado', 'Experto'];
  modelOptions = ['GPT-4o', 'Claude Sonnet', 'Gemini Pro', 'Llama 3', 'Mistral'];
  colorOptions = ['#1e1b4b','#0f2d1f','#2d1b0f','#1b2d2d','#2d1b2d','#1b1b2d'];

  private toast(severity: string, summary: string, detail: string) {
    this.msgSvc.add({ severity, summary, detail, life: 2800 });
  }
}
