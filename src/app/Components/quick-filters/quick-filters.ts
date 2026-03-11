import {
  Component, input, output, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { QUICK_FILTERS, QuickFilter, QuickFilterId } from './quick-filter.model';

@Component({
  selector: 'app-quick-filters',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quick-filters.html',
  styleUrl:    './quick-filters.css',
})
export class QuickFiltersComponent {
  // ── Inputs ────────────────────────────────────────────────────────
  /** Ticket counts per filter — passed by the parent after applying each predicate */
  counts = input<Partial<Record<QuickFilterId, number>>>({});

  // ── State ─────────────────────────────────────────────────────────
  active = signal<QuickFilterId>('none');

  // ── Output ────────────────────────────────────────────────────────
  filterChange = output<QuickFilterId>();

  // ── Data ──────────────────────────────────────────────────────────
  filters: QuickFilter[] = QUICK_FILTERS;

  // ── Actions ───────────────────────────────────────────────────────
  toggle(id: QuickFilterId) {
    const next = this.active() === id ? 'none' : id;
    this.active.set(next);
    this.filterChange.emit(next);
  }

  clear() {
    this.active.set('none');
    this.filterChange.emit('none');
  }

  get hasActive(): boolean { return this.active() !== 'none'; }

  countFor(id: QuickFilterId): number | null {
    const v = this.counts()[id];
    return v !== undefined ? v : null;
  }
}