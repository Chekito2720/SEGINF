import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../../Services/Auth.service';
import { PermissionsService } from '../../Services/Permissions.service';
import { Permission, PERMISSION_SETS } from '../../models/Auth.model';

interface NavItem {
  label:          string;
  icon:           string;
  route:          string;
  permission?:    Permission;
  superadminOnly?: boolean;   // solo visible si el usuario tiene todos los permisos superadmin
  activeFor?:     string[];
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
    { label: 'Dashboard', icon: 'pi-objects-column', route: '/home'                                                              },
    { label: 'Kanban',    icon: 'pi-table',          route: '/home/kanban',  permission: 'tickets_view', activeFor: ['/home/ticket'] },
    { label: 'Tickets',   icon: 'pi-list',           route: '/home/tickets', permission: 'tickets_view' },
    { label: 'Mi Cuenta', icon: 'pi-user',           route: '/home/profile', permission: 'user_view', activeFor: ['/home/profile'] },
    { label: 'Grupos',    icon: 'pi-users',          route: '/home/groups', permission: 'groups_view'                            },
    { label: 'Usuarios',  icon: 'pi-id-card',        route: '/home/user',   permission: 'users_view'                              },
    { label: 'Admin',     icon: 'pi-shield',         route: '/home/admin',  superadminOnly: true                                  },
  ];

  constructor(
    public authSvc:  AuthService,
    public permsSvc: PermissionsService,
    private router:  Router,
  ) {}

  get isSuperAdmin(): boolean {
    const payload = this.authSvc.getPayload();
    if (!payload) return false;
    return PERMISSION_SETS['superadmin'].every(p =>
      payload.permissions.includes(p)
    );
  }

  get visibleItems(): NavItem[] {
    return this.navItems.filter(item => {
      if (item.superadminOnly) return this.isSuperAdmin;
      return !item.permission || this.permsSvc.hasPermission(item.permission);
    });
  }

  /** Marca el item activo también cuando la URL empieza por alguna ruta en activeFor */
  isActive(item: NavItem): boolean {
    const url = this.router.url;
    if (url === item.route || url.startsWith(item.route + '/')) return true;
    return item.activeFor?.some(prefix => url.startsWith(prefix)) ?? false;
  }

  toggle() { this.collapsed.set(!this.collapsed()); }
  logout()  { this.authSvc.logout(); }
}