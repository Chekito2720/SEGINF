import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuickFiltersComponent } from './quick-filters';
import { QuickFilterId }         from './quick-filter.model';
import { NoopAnimationsModule }  from '@angular/platform-browser/animations';

describe('QuickFiltersComponent', () => {
  let component: QuickFiltersComponent;
  let fixture:   ComponentFixture<QuickFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuickFiltersComponent, NoopAnimationsModule],
    }).compileComponents();
    fixture   = TestBed.createComponent(QuickFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Init ──────────────────────────────────────────────────────────
  it('should create', () => expect(component).toBeTruthy());
  it('active starts as "none"', () => expect(component.active()).toBe('none'));
  it('hasActive is false initially', () => expect(component.hasActive).toBe(false));
  it('renders all 5 quick filter chips', () => expect(component.filters.length).toBe(5));

  // ── toggle ────────────────────────────────────────────────────────
  describe('toggle()', () => {
    it('activates a filter on first click', () => {
      component.toggle('mis_tickets');
      expect(component.active()).toBe('mis_tickets');
    });

    it('deactivates filter on second click (toggles off)', () => {
      component.toggle('mis_tickets');
      component.toggle('mis_tickets');
      expect(component.active()).toBe('none');
    });

    it('switches to a different filter', () => {
      component.toggle('mis_tickets');
      component.toggle('sin_asignar');
      expect(component.active()).toBe('sin_asignar');
    });

    it('sets hasActive to true when a filter is active', () => {
      component.toggle('vencidos');
      expect(component.hasActive).toBe(true);
    });

    it('emits filterChange with the new id', () => {
      let emitted: QuickFilterId | null = null;
      component.filterChange.subscribe((v: QuickFilterId) => emitted = v);
      component.toggle('prioridad_alta');
      expect(emitted).toBe('prioridad_alta');
    });

    it('emits "none" when toggling off', () => {
      let emitted: QuickFilterId | null = null;
      component.filterChange.subscribe((v: QuickFilterId) => emitted = v);
      component.toggle('bloqueados');
      component.toggle('bloqueados');
      expect(emitted).toBe('none');
    });
  });

  // ── clear ─────────────────────────────────────────────────────────
  describe('clear()', () => {
    it('resets active to "none"', () => {
      component.toggle('mis_tickets');
      component.clear();
      expect(component.active()).toBe('none');
    });

    it('emits "none" on clear', () => {
      let emitted: QuickFilterId | null = null;
      component.filterChange.subscribe((v: QuickFilterId) => emitted = v);
      component.toggle('vencidos');
      component.clear();
      expect(emitted).toBe('none');
    });

    it('hasActive is false after clear', () => {
      component.toggle('mis_tickets');
      component.clear();
      expect(component.hasActive).toBe(false);
    });
  });

  // ── countFor ─────────────────────────────────────────────────────
  describe('countFor()', () => {
    it('returns null when counts input has no entry', () => {
      expect(component.countFor('mis_tickets')).toBeNull();
    });

    it('returns value when counts input has an entry', () => {
      fixture.componentRef.setInput('counts', { mis_tickets: 3, sin_asignar: 0 });
      fixture.detectChanges();
      expect(component.countFor('mis_tickets')).toBe(3);
    });

    it('returns 0 (not null) when count is explicitly 0', () => {
      fixture.componentRef.setInput('counts', { sin_asignar: 0 });
      fixture.detectChanges();
      expect(component.countFor('sin_asignar')).toBe(0);
    });
  });
});