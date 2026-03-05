import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

export interface UserData {
  fullName:  string;
  username:  string;
  email:     string;
  phone:     string;
  birthDate: string;
  address:   string;
}

@Component({
  selector: 'app-rud',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    DialogModule,
    InputTextModule,
    CardModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './rud.html',
  styleUrl: './rud.css'
})
export class RudComponent {
  user = signal<UserData>({
    fullName:  'Sergio Bravo',
    username:  'sergio_bravo',
    email:     'sergio@miapp.com',
    phone:     '50312345678',
    birthDate: '1995-06-15',
    address:   'Calle Ejemplo 123, Ciudad',
  });

  showEditModal   = signal(false);
  showDeleteModal = signal(false);
  deleted         = signal(false);

  editForm: UserData = { ...this.user() };

  fields: { label: string; key: keyof UserData; icon: string; type: string }[] = [
    { label: 'Nombre completo', key: 'fullName',  icon: 'pi-user',       type: 'text'  },
    { label: 'Usuario',         key: 'username',  icon: 'pi-at',         type: 'text'  },
    { label: 'Correo',          key: 'email',     icon: 'pi-envelope',   type: 'email' },
    { label: 'Teléfono',        key: 'phone',     icon: 'pi-phone',      type: 'tel'   },
    { label: 'Fecha de nac.',   key: 'birthDate', icon: 'pi-calendar',   type: 'date'  },
    { label: 'Dirección',       key: 'address',   icon: 'pi-map-marker', type: 'text'  },
  ];

  constructor(private messageService: MessageService) {}

  openEdit() {
    this.editForm = { ...this.user() };
    this.showEditModal.set(true);
  }

  saveEdit() {
    this.user.set({ ...this.editForm });
    this.showEditModal.set(false);
    this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Datos guardados correctamente.' });
  }

  confirmDelete() {
    this.showDeleteModal.set(true);
  }

  deleteUser() {
    this.deleted.set(true);
    this.showDeleteModal.set(false);
  }

  onlyNumbers(event: KeyboardEvent): boolean {
    return /[0-9]/.test(event.key);
  }
}