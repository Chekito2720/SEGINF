import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonModule } from 'primeng/button';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, ButtonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent {
  collapsed = signal(false);

  navItems: NavItem[] = [
    { label: 'Inicio',    icon: 'pi-home',       route: '/home'        },
    { label: 'Perfil',    icon: 'pi-user',        route: '/home/user'   },
    { label: 'Grupos',    icon: 'pi-users',       route: '/home/groups' },
    { label: 'Reportes',  icon: 'pi-chart-bar',   route: '/home/reports'},
    { label: 'Mensajes',  icon: 'pi-envelope',    route: '/home/messages'},
  ];

  toggle() {
    this.collapsed.set(!this.collapsed());
  }
}