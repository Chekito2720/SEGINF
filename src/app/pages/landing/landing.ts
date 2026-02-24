import { Component, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule],
  templateUrl: './landing.html',
  styleUrl: './landing.css'
})
export class LandingComponent {
  scrolled = signal(false);

  features: Feature[] = [
    {
      icon: 'pi-lock',
      title: 'Seguro',
      description: 'Tus datos siempre protegidos con encriptación de extremo a extremo.',
    },
    {
      icon: 'pi-bolt',
      title: 'Rápido',
      description: 'Interfaz ágil y responsive que funciona en cualquier dispositivo.',
    },
    {
      icon: 'pi-users',
      title: 'Fácil de usar',
      description: 'Diseñado para que cualquier persona pueda usarlo sin complicaciones.',
    },
  ];

  @HostListener('window:scroll')
  onScroll() {
    this.scrolled.set(window.scrollY > 20);
  }
}