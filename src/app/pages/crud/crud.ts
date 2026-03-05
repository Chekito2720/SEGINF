import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

export interface Group {
  id: number;
  nivel: string;
  autor: string;
  nombre: string;
  integrantes: number;
  tickets: number;
  descripcion: string;
}

@Component({
  selector: 'app-crud',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    TableModule,
    TagModule,
    SelectModule,
    InputNumberModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './crud.html',
  styleUrl: './crud.css'
})
export class CrudComponent {
  groups = signal<Group[]>([
    { id: 1, nivel: 'Básico',     autor: 'Ana García',   nombre: 'Alpha', integrantes: 5, tickets: 12, descripcion: 'Grupo de nivel básico para principiantes.' },
    { id: 2, nivel: 'Intermedio', autor: 'Carlos López', nombre: 'Beta',  integrantes: 8, tickets: 7,  descripcion: 'Grupo intermedio con proyectos activos.' },
    { id: 3, nivel: 'Avanzado',   autor: 'María Pérez',  nombre: 'Gamma', integrantes: 4, tickets: 20, descripcion: 'Grupo avanzado en arquitectura de sistemas.' },
  ]);

  niveles = [
    { label: 'Básico',      value: 'Básico' },
    { label: 'Intermedio',  value: 'Intermedio' },
    { label: 'Avanzado',    value: 'Avanzado' },
  ];

  showModal  = signal(false);
  isEditing  = signal(false);
  editingId  = signal<number | null>(null);

  form: Omit<Group, 'id'> = this.emptyForm();

  constructor(
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  emptyForm(): Omit<Group, 'id'> {
    return { nivel: '', autor: '', nombre: '', integrantes: 0, tickets: 0, descripcion: '' };
  }

  openCreate() {
    this.form = this.emptyForm();
    this.isEditing.set(false);
    this.editingId.set(null);
    this.showModal.set(true);
  }

  openEdit(group: Group) {
    this.form = { ...group };
    this.isEditing.set(true);
    this.editingId.set(group.id);
    this.showModal.set(true);
  }

  saveGroup() {
    if (!this.form.nombre.trim() || !this.form.autor.trim() || !this.form.nivel) return;

    if (this.isEditing()) {
      this.groups.update(list =>
        list.map(g => g.id === this.editingId() ? { ...this.form, id: g.id } : g)
      );
      this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Grupo actualizado correctamente.' });
    } else {
      const newId = Math.max(0, ...this.groups().map(g => g.id)) + 1;
      this.groups.update(list => [...list, { ...this.form, id: newId }]);
      this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Grupo creado correctamente.' });
    }
    this.showModal.set(false);
  }

  confirmDelete(id: number) {
    this.confirmationService.confirm({
      message: '¿Estás seguro de eliminar este grupo?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-trash',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.groups.update(list => list.filter(g => g.id !== id));
        this.messageService.add({ severity: 'warn', summary: 'Eliminado', detail: 'Grupo eliminado.' });
      }
    });
  }

  nivelSeverity(nivel: string): 'success' | 'info' | 'danger' {
    const map: Record<string, 'success' | 'info' | 'danger'> = {
      'Básico':      'success',
      'Intermedio':  'info',
      'Avanzado':    'danger',
    };
    return map[nivel] ?? 'info';
  }

  get formInvalid() {
    return !this.form.nombre.trim() || !this.form.autor.trim() || !this.form.nivel;
  }
}