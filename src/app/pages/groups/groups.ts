import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule }    from '@angular/common';
import { FormsModule }     from '@angular/forms';
import { Router }          from '@angular/router';
import { ButtonModule }    from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule }  from 'primeng/textarea';
import { DialogModule }    from 'primeng/dialog';
import { ToastModule }     from 'primeng/toast';
import { TooltipModule }   from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AuthService }        from '../../Services/Auth.service';
import { TicketService }      from '../../Services/Ticket.service';
import { PermissionsService } from '../../Services/Permissions.service';
import { AppGroup, AppUser, USERS, GROUPS } from '../../models/Auth.model';

interface ManagedGroup extends AppGroup {
  members: AppUser[];
}

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule, TextareaModule,
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

  // ── Modals ────────────────────────────────────────────────────────
  showCreateGroup   = signal(false);
  showEditGroup     = signal(false);
  showDeleteConfirm = signal(false);
  showAddMember     = signal(false);
  showRemoveConfirm = signal(false);
  memberToRemove    = signal<AppUser | null>(null);

  // ── Forms ─────────────────────────────────────────────────────────
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
    // Seleccionar automáticamente el grupo activo del usuario
    const active = this.authSvc.getGroup();
    if (active) {
      const mg = this.groups().find(g => g.id === active.id);
      if (mg) this.selected.set(mg);
    }
  }

  loadGroups() {
    const user = this.authSvc.getUser();
    // Solo los grupos a los que pertenece el usuario
    const userGroups = GROUPS.filter(g =>
      user?.groupIds.includes(g.id)
    );
    const managed: ManagedGroup[] = userGroups.map(g => ({
      ...g,
      members: USERS.filter(u => u.groupIds.includes(g.id)),
    }));
    this.groups.set(managed);
  }

  selectGroup(g: ManagedGroup) { this.selected.set(g); }

  // ── Permisos ──────────────────────────────────────────────────────
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
    this.loadGroups();
    const updated = this.groups().find(x => x.id === g.id);
    this.selected.set(updated ?? null);
    this.memberToRemove.set(null);
    this.showRemoveConfirm.set(false);
    this.toast('warn', 'Miembro eliminado', `${user.fullName} fue removido del grupo.`);
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