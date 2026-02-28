import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface StatCard {
  label: string;
  value: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent {
  userName = 'Usuario';

  stats: StatCard[] = [
    { label: 'Usuarios activos', value: '128',  icon: 'pi-users',      color: '#7c6af7' },
    { label: 'Reportes',         value: '34',   icon: 'pi-chart-bar',  color: '#38bdf8' },
    { label: 'Mensajes',         value: '12',   icon: 'pi-envelope',   color: '#4ade80' },
    { label: 'Alertas',          value: '3',    icon: 'pi-bell',       color: '#f87171' },
  ];

  recentActivity = [
    { user: 'Sergio Bravo',    action: 'inició sesión',       time: 'Hace 5 min',  icon: 'pi-sign-in' },
    { user: 'Carlos Morales',  action: 'actualizó su perfil', time: 'Hace 20 min', icon: 'pi-user-edit' },
    { user: 'Karol Ramirez',   action: 'envió un mensaje',    time: 'Hace 1 hora', icon: 'pi-envelope' },
    { user: 'Karol Goretty', action: 'generó un reporte',   time: 'Hace 2 horas',icon: 'pi-file' },
  ];
}