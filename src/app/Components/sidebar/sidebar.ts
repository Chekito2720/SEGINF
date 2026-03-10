import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../../Services/Auth.service';
import { PermissionsService } from '../../Services/Permissions.service';
import { Permission } from '../../models/Auth.model';

interface NavItem {
  label:       string;
  icon:        string;
  route:       string;
  permission?: Permission;   // si se define, el item solo aparece si el usuario tiene ese permiso
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, ButtonModule, TooltipModule, DividerModule, TagModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent {
  collapsed = signal(false);

  navItems: NavItem[] = [
    { label: 'Dashboard',  icon: 'pi-objects-column', route: '/home'                                     },
    { label: 'Kanban',     icon: 'pi-table',          route: '/home/kanban', permission: 'tickets_view' },
    { label: 'Mi Cuenta',  icon: 'pi-user',           route: '/home/rud',    permission: 'user_view'    },
    { label: 'Grupos',     icon: 'pi-users',          route: '/home/crud',   permission: 'groups_view'  },
    { label: 'Tickets',    icon: 'pi-ticket',         route: '/home/groups', permission: 'tickets_view' },
    { label: 'Usuarios',   icon: 'pi-id-card',        route: '/home/user',   permission: 'users_view'   },
  ];

  constructor(
    public authSvc:  AuthService,
    public permsSvc: PermissionsService,
  ) {}

  // Filtra los items según permisos del usuario actual
  get visibleItems(): NavItem[] {
    return this.navItems.filter(item =>
      !item.permission || this.permsSvc.hasPermission(item.permission)
    );
  }

  toggle() { this.collapsed.set(!this.collapsed()); }

  logout() { this.authSvc.logout(); }
}