// ─────────────────────────────────────────────────────────────────
// quick-filter.model.ts  — tipos compartidos por kanban y ticket-list
// ─────────────────────────────────────────────────────────────────

export type QuickFilterId =
  | 'mis_tickets'
  | 'sin_asignar'
  | 'prioridad_alta'
  | 'vencidos'
  | 'bloqueados'
  | 'none';

export interface QuickFilter {
  id:    QuickFilterId;
  label: string;
  icon:  string;          // pi-* class
  color: string;          // accent color
}

export const QUICK_FILTERS: QuickFilter[] = [
  { id: 'mis_tickets',    label: 'Mis tickets',       icon: 'pi-user',               color: '#7c6af7' },
  { id: 'sin_asignar',    label: 'Sin asignar',        icon: 'pi-user-minus',          color: '#f59e0b' },
  { id: 'prioridad_alta', label: 'Prioridad alta',     icon: 'pi-angle-double-up',     color: '#f87171' },
  { id: 'vencidos',       label: 'Vencidos',           icon: 'pi-clock',               color: '#fb923c' },
  { id: 'bloqueados',     label: 'Bloqueados',         icon: 'pi-ban',                 color: '#f87171' },
];