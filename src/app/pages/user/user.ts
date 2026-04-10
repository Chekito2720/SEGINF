import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router }       from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService }        from '../../Services/Auth.service';
import { TicketService }      from '../../Services/Ticket.service';
import { UserService }        from '../../Services/User.service';
import { GroupService }       from '../../Services/Group.service';
import { PermissionsService } from '../../Services/Permissions.service';
import { AppUser, AppGroup, TicketStatus, Permission, PERMISSION_SETS } from '../../models/Auth.model';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule, TooltipModule],
  templateUrl: './user.html',
  styleUrl:    './user.css',
})
export class UserComponent implements OnInit {

  allGroups = signal<AppGroup[]>([]);

  constructor(
    public  authSvc:   AuthService,
    public  permsSvc:  PermissionsService,
    private ticketSvc: TicketService,
    private userSvc:   UserService,
    private groupSvc:  GroupService,
    private router:    Router,
  ) {}

  ngOnInit() {
    this.userSvc.loadUsers().subscribe();
    this.groupSvc.loadAllGroups().subscribe({
      next: groups => {
        this.allGroups.set(groups);
        groups.forEach(g => this.ticketSvc.loadForGroup(g.id).subscribe());
      },
    });
  }

  get members(): AppUser[] { return this.userSvc.getUsers(); }

  userGroups(u: AppUser): AppGroup[] {
    if (!u.groupIds?.length) return [];
    return u.groupIds
      .map(id => this.allGroups().find(g => g.id === id))
      .filter((g): g is AppGroup => !!g);
  }

  ticketCounts(userId: string): Record<TicketStatus | 'total', number> {
    const tickets = this.ticketSvc.getTickets().filter(t => t.assignedToId === userId);
    return {
      total:       tickets.length,
      pendiente:   tickets.filter(t => t.status === 'pendiente').length,
      en_progreso: tickets.filter(t => t.status === 'en_progreso').length,
      hecho:       tickets.filter(t => t.status === 'hecho').length,
      bloqueado:   tickets.filter(t => t.status === 'bloqueado').length,
    };
  }

  profileLabel(u: AppUser): string {
    const perms = u.permissions ?? [];
    if (PERMISSION_SETS['superadmin'].every((p: Permission) => perms.includes(p))) return 'Superadmin';
    if (perms.length >= 10) return 'Admin';
    return 'Miembro';
  }

  profileColor(u: AppUser): string {
    const perms = u.permissions ?? [];
    if (PERMISSION_SETS['superadmin'].every((p: Permission) => perms.includes(p))) return '#7c6af7';
    if (perms.length >= 10) return '#38bdf8';
    return '#4ade80';
  }

  userColor(id: string): string {
    const n = [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
    return ['#7c6af7','#38bdf8','#4ade80','#f59e0b','#f87171'][n % 5];
  }

  openProfile(userId: string) {
    this.router.navigate(['/home/profile', userId]);
  }
}
