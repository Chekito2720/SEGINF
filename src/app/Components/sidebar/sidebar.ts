import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, ButtonModule, TooltipModule, DividerModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent {
  collapsed = signal(false);

  navItems: NavItem[] = [
    { label: 'Inicio',    icon: 'pi-home',      route: '/home'        },
    { label: 'Mi Cuenta', icon: 'pi-user',       route: '/home/rud'    },
    { label: 'Grupos',    icon: 'pi-users',      route: '/home/crud'   },
    { label: 'Reportes',  icon: 'pi-chart-bar',  route: '/home/groups' },
    { label: 'Mensajes',  icon: 'pi-envelope',   route: '/home/user'   },
  ];

  toggle() { this.collapsed.set(!this.collapsed()); }
}