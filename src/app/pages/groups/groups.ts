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
import { GroupService }       from '../../Services/Group.service';
import { PermissionsService } from '../../Services/Permissions.service';
import {
  AppGroup, GroupMember, Permission, ALL_PERMISSIONS, PERM_LABELS, PERM_CATEGORIES,
} from '../../models/Auth.model';

interface ManagedGroup extends AppGroup {
  members: GroupMember[];
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

  groups   = signal<ManagedGroup[]>([]);
  selected = signal<ManagedGroup | null>(null);
  loading  = signal(false);

  showCreateGroup   = signal(false);
  showEditGroup     = signal(false);
  showDeleteConfirm = signal(false);
  showAddMember     = signal(false);
  showRemoveConfirm = signal(false);
  memberToRemove    = signal<GroupMember | null>(null);

  showUserPermsModal = signal(false);
  permsUser          = signal<GroupMember | null>(null);

  permsForm: Partial<Record<Permission, boolean>> = {};

  permCategories = PERM_CATEGORIES;
  permLabels     = PERM_LABELS;

  groupForm      = { nombre: '', descripcion: '', nivel: '', color: '#1e1b4b', model: '' };
  addMemberEmail = '';
  addMemberError = '';

  nivelOptions  = ['Básico', 'Intermedio', 'Avanzado', 'Experto'];
  modelOptions  = ['GPT-4o', 'Claude Sonnet', 'Gemini Pro', 'Llama 3', 'Mistral'];
  colorOptions  = ['#1e1b4b','#0f2d1f','#2d1b0f','#1b2d2d','#2d1b2d','#1b1b2d'];

  constructor(
    public  authSvc:   AuthService,
    public  permsSvc:  PermissionsService,
    private groupSvc:  GroupService,
    private router:    Router,
    private msgSvc:    MessageService,
  ) {}

  ngOnInit() {
    this.loadGroups();
  }

  loadGroups() {
    this.loading.set(true);
    this.groupSvc.loadUserGroups().subscribe({
      next: groups => {
        const loads = groups.map(g =>
          new Promise<ManagedGroup>(resolve => {
            this.groupSvc.loadGroupMembers(g.id).subscribe({
              next:  members => resolve({ ...g, members }),
              error: ()      => resolve({ ...g, members: [] }),
            });
          })
        );
        Promise.all(loads).then(managed => {
          this.groups.set(managed);
          this.loading.set(false);
          // Auto-select the active group
          const active = this.authSvc.getGroup();
          if (active) {
            const mg = managed.find(g => g.id === active.id);
            if (mg) this.selected.set(mg);
          } else if (managed.length) {
            this.selected.set(managed[0]);
          }
        });
      },
      error: () => this.loading.set(false),
    });
  }

  private reloadSelected() {
    const g = this.selected();
    if (!g) return;
    this.groupSvc.loadGroupMembers(g.id).subscribe({
      next: members => {
        const updated: ManagedGroup = { ...g, members };
        this.groups.update(list => list.map(x => x.id === g.id ? updated : x));
        this.selected.set(updated);
      },
      error: () => {},
    });
  }

  selectGroup(g: ManagedGroup) { this.selected.set(g); }

  can(p: string) { return this.permsSvc.hasPermission(p as Permission); }

  // ── Crear grupo ───────────────────────────────────────────────────
  openCreate() {
    this.groupForm = { nombre:'', descripcion:'', nivel:'Básico', color:'#1e1b4b', model:'' };
    this.showCreateGroup.set(true);
  }

  saveCreate() {
    if (!this.groupForm.nombre.trim()) return;
    this.groupSvc.createGroup({
      nombre:      this.groupForm.nombre.trim(),
      descripcion: this.groupForm.descripcion.trim(),
      nivel:       this.groupForm.nivel || 'Básico',
      color:       this.groupForm.color,
      model:       this.groupForm.model || 'GPT-4o',
    }).subscribe({
      next: g => {
        const mg: ManagedGroup = { ...g, members: [] };
        this.groups.update(list => [...list, mg]);
        this.selected.set(mg);
        this.showCreateGroup.set(false);
        this.toast('success', 'Grupo creado', `"${g.nombre}" creado correctamente.`);
      },
      error: (err) => this.toast('error', 'Error', err?.error?.message ?? 'No se pudo crear.'),
    });
  }

  // ── Editar grupo ──────────────────────────────────────────────────
  openEdit(g: ManagedGroup) {
    this.groupForm = {
      nombre:      g.nombre,
      descripcion: g.descripcion ?? '',
      nivel:       g.nivel       ?? '',
      color:       g.color,
      model:       g.model       ?? '',
    };
    this.selected.set(g);
    this.showEditGroup.set(true);
  }

  saveEdit() {
    const g = this.selected();
    if (!g || !this.groupForm.nombre.trim()) return;
    this.groupSvc.updateGroup(g.id, {
      nombre:      this.groupForm.nombre.trim(),
      descripcion: this.groupForm.descripcion.trim(),
      nivel:       this.groupForm.nivel,
      color:       this.groupForm.color,
      model:       this.groupForm.model,
    }).subscribe({
      next: updated => {
        const mg: ManagedGroup = { ...updated, members: g.members };
        this.groups.update(list => list.map(x => x.id === g.id ? mg : x));
        this.selected.set(mg);
        this.showEditGroup.set(false);
        this.toast('success', 'Guardado', 'Configuración del grupo actualizada.');
      },
      error: (err) => this.toast('error', 'Error', err?.error?.message ?? 'No se pudo actualizar.'),
    });
  }

  // ── Eliminar grupo ────────────────────────────────────────────────
  confirmDelete(g: ManagedGroup) {
    this.selected.set(g);
    this.showDeleteConfirm.set(true);
  }

  executeDelete() {
    const g = this.selected();
    if (!g) return;
    this.groupSvc.deleteGroup(g.id).subscribe({
      next: () => {
        this.groups.update(list => list.filter(x => x.id !== g.id));
        this.selected.set(this.groups()[0] ?? null);
        this.showDeleteConfirm.set(false);
        this.toast('warn', 'Eliminado', `Grupo "${g.nombre}" eliminado.`);
      },
      error: (err) => {
        this.showDeleteConfirm.set(false);
        this.toast('error', 'Error', err?.error?.message ?? 'No se pudo eliminar.');
      },
    });
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
    if (!email) { this.addMemberError = 'Ingresa un correo electrónico.'; return; }

    this.groupSvc.addMember(g.id, email).subscribe({
      next: () => {
        this.showAddMember.set(false);
        this.reloadSelected();
        this.toast('success', 'Miembro añadido', `${email} se unió a "${g.nombre}".`);
      },
      error: (err) => {
        this.addMemberError = err?.error?.message ?? 'No se encontró el usuario o ya es miembro.';
      },
    });
  }

  // ── Eliminar miembro ──────────────────────────────────────────────
  confirmRemove(member: GroupMember) {
    this.memberToRemove.set(member);
    this.showRemoveConfirm.set(true);
  }

  executeRemove() {
    const g      = this.selected();
    const member = this.memberToRemove();
    if (!g || !member) return;
    this.groupSvc.removeMember(g.id, member.id).subscribe({
      next: () => {
        this.reloadSelected();
        this.memberToRemove.set(null);
        this.showRemoveConfirm.set(false);
        this.toast('warn', 'Miembro eliminado', `${member.fullName} fue removido del grupo.`);
      },
      error: (err) => {
        this.showRemoveConfirm.set(false);
        this.toast('error', 'Error', err?.error?.message ?? 'No se pudo eliminar al miembro.');
      },
    });
  }

  // ── Permisos por usuario en grupo ─────────────────────────────────
  getEffectivePerms(u: GroupMember): Permission[] {
    return u.effectivePermissions;
  }

  hasGroupOverride(u: GroupMember | null): boolean {
    return u?.hasOverride ?? false;
  }

  getEffectivePermCount(u: GroupMember): number {
    return u.effectivePermissions.length;
  }

  openUserPerms(u: GroupMember) {
    this.permsUser.set(u);
    this.permsForm = {};
    ALL_PERMISSIONS.forEach(p => { this.permsForm[p] = u.effectivePermissions.includes(p); });
    this.showUserPermsModal.set(true);
  }

  saveUserPerms() {
    const u = this.permsUser();
    const g = this.selected();
    if (!u || !g) return;
    const active = ALL_PERMISSIONS.filter(p => this.permsForm[p]);
    this.groupSvc.updateUserGroupPermissions(g.id, u.id, active).subscribe({
      next: () => {
        this.reloadSelected();
        this.showUserPermsModal.set(false);
        this.toast('success', 'Permisos actualizados',
          `Permisos de ${u.fullName} en "${g.nombre}" guardados.`);
      },
      error: (err) => this.toast('error', 'Error', err?.error?.message ?? 'No se pudo actualizar.'),
    });
  }

  resetToGlobal() {
    const u = this.permsUser();
    const g = this.selected();
    if (!u || !g) return;
    this.groupSvc.resetUserGroupPermissions(g.id, u.id).subscribe({
      next: () => {
        this.reloadSelected();
        this.showUserPermsModal.set(false);
        this.toast('info', 'Override eliminado',
          `${u.fullName} usará sus permisos globales en "${g.nombre}".`);
      },
      error: (err) => this.toast('error', 'Error', err?.error?.message ?? 'No se pudo restablecer.'),
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────
  openProfile(userId: string) { this.router.navigate(['/home/profile', userId]); }

  userColor(id: string): string {
    const n = [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
    return ['#7c6af7','#38bdf8','#4ade80','#f59e0b','#f87171'][n % 5];
  }

  ticketCount(groupId: string): number {
    return this.groups().find(g => g.id === groupId)?.ticketCount ?? 0;
  }

  private toast(severity: string, summary: string, detail: string) {
    this.msgSvc.add({ severity, summary, detail, life: 2800 });
  }
}
