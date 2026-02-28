import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user.html',
  styleUrl: './user.css'
})
export class UserComponent {
  user = {
    fullName:  'Sergio Bravo',
    username:  'sergio_bravo',
    email:     'sergio@miapp.com',
    phone:     '50312345678',
    birthDate: '15 de junio de 1995',
    address:   'Calle Ejemplo 123, Ciudad',
  };

  fields: { label: string; key: keyof typeof UserComponent.prototype.user; icon: string }[] = [
    { label: 'Nombre completo', key: 'fullName',  icon: 'pi-user'      },
    { label: 'Usuario',         key: 'username',  icon: 'pi-at'        },
    { label: 'Correo',          key: 'email',     icon: 'pi-envelope'  },
    { label: 'Teléfono',        key: 'phone',     icon: 'pi-phone'     },
    { label: 'Fecha de nac.',   key: 'birthDate', icon: 'pi-calendar'  },
    { label: 'Dirección',       key: 'address',   icon: 'pi-map-marker'},
  ];
}