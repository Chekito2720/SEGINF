import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService }        from '../../Services/Auth.service';
import { TicketService }      from '../../Services/Ticket.service';
import { PermissionsService } from '../../Services/Permissions.service';
import { USERS, TicketStatus } from '../../models/Auth.model';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule, TooltipModule],
  templateUrl: './user.html',
  styleUrl:    './user.css',
})
export class UserComponent {

  constructor(
    public  authSvc:   AuthService,
    public  permsSvc:  PermissionsService,
    private ticketSvc: TicketService,
    private router:    Router,
  ) {}

  // Getters — sin () en el template
  get group()   { return this.authSvc.getGroup(); }

  get members() {
    const g = this.authSvc.getGroup();
    if (!g) return [];
    return USERS.filter(u => u.groupIds.includes(g.id));
  }

  ticketCounts(userId: number): Record<TicketStatus | 'total', number> {
    const g = this.authSvc.getGroup();
    if (!g) return { total:0, pendiente:0, en_progreso:0, hecho:0, bloqueado:0 };
    const tickets = this.ticketSvc.getByGroupAndUser(g.id, userId);
    return {
      total:       tickets.length,
      pendiente:   tickets.filter(t => t.status === 'pendiente').length,
      en_progreso: tickets.filter(t => t.status === 'en_progreso').length,
      hecho:       tickets.filter(t => t.status === 'hecho').length,
      bloqueado:   tickets.filter(t => t.status === 'bloqueado').length,
    };
  }

  profileLabel(u: typeof USERS[0]): string {
    if (u.permissions.length >= 20) return 'Superadmin';
    if (u.permissions.length >= 10) return 'Admin';
    return 'Miembro';
  }

  profileColor(u: typeof USERS[0]): string {
    if (u.permissions.length >= 20) return '#7c6af7';
    if (u.permissions.length >= 10) return '#38bdf8';
    return '#4ade80';
  }

  userColor(id: number): string {
    return ['#7c6af7','#38bdf8','#4ade80','#f59e0b','#f87171'][id % 5];
  }

  openProfile(userId: number) {
    this.router.navigate(['/home/profile', userId]);
  }
}