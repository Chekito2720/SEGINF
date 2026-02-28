import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeModule } from 'primeng/badge';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [CommonModule, BadgeModule, CardModule],
  templateUrl: './groups.html',
  styleUrl: './groups.css'
})
export class GroupsComponent {
  total = 8;
}