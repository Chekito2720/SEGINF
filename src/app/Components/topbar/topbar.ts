import { Component, signal, HostListener } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService }        from '../../Services/Auth.service';
import { PermissionsService } from '../../Services/Permissions.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './topbar.html',
  styleUrl:    './topbar.css',
})
export class TopbarComponent {
  menuOpen = signal(false);

  constructor(
    public  authSvc:  AuthService,
    public  permsSvc: PermissionsService,
    private router:   Router,
  ) {}

  get user()  { return this.authSvc.getUser(); }
  get group() { return this.authSvc.getGroup(); }

  userColor(id: number): string {
    return ['#7c6af7','#38bdf8','#4ade80','#f59e0b','#f87171'][id % 5];
  }

  toggleMenu() { this.menuOpen.update(v => !v); }

  goToProfile() {
    this.menuOpen.set(false);
    this.router.navigate(['/home/profile']);
  }

  logout() {
    this.menuOpen.set(false);
    this.authSvc.logout();
    this.router.navigate(['/auth/login']);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.tb-avatar-wrap')) {
      this.menuOpen.set(false);
    }
  }
}