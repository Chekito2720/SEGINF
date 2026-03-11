import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
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
  permission?: Permission;
  // rutas que también deben marcar este item como activo
  activeFor?:  string[];
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
    { label: 'Usuarios',  icon: 'pi-id-card',        route: '/home/user',  permission: 'users_view'                              },
  ];

  constructor(
    public authSvc:  AuthService,
    public permsSvc: PermissionsService,
    private router:  Router,
  ) {}

  get visibleItems(): NavItem[] {
    return this.navItems.filter(item =>
      !item.permission || this.permsSvc.hasPermission(item.permission)
    );
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