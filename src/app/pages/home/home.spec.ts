import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home';
import { AuthService } from '../../Services/Auth.service';
import { TicketService } from '../../Services/Ticket.service';
import { PermissionsService } from '../../Services/Permissions.service';
import { GROUPS, TICKETS, PERMISSION_PROFILES } from '../../models/Auth.model';
import { MessageService } from 'primeng/api';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockGroup = GROUPS[0]; // Equipo Dev (id: 1)

const mockUser = {
  id: 1, fullName: 'Super Admin', username: 'superadmin',
  email: 'admin@miapp.com', password: 'Admin@12345',
  phone: '', birthDate: '', address: '',
  permissions: PERMISSION_PROFILES['superadmin'],
  groupIds: [1, 2, 3],
};

const authServiceMock = {
  getGroup:     () => mockGroup,
  getUser:      () => mockUser,
  isLoggedIn:   () => true,
};

const permissionsServiceMock = {
  hasPermission:    (p: string) => true,
  hasAnyPermission: (ps: string[]) => true,
  getPermissions:   () => PERMISSION_PROFILES['superadmin'],
};

// ── Suite ──────────────────────────────────────────────────────────────────
describe('HomeComponent (Dashboard)', () => {
  let component: HomeComponent;
  let fixture:   ComponentFixture<HomeComponent>;
  let ticketSvc: TicketService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthService,       useValue: authServiceMock        },
        { provide: PermissionsService, useValue: permissionsServiceMock },
        TicketService,
        MessageService,
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    ticketSvc = TestBed.inject(TicketService);
    fixture.detectChanges();
  });

  // ── Creación básica ──────────────────────────────────────────────────────
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Grupo activo ─────────────────────────────────────────────────────────
  it('should load the active group from AuthService', () => {
    expect(component.group()).toEqual(mockGroup);
  });

  // ── Columnas Kanban ──────────────────────────────────────────────────────
  it('should have exactly 4 kanban columns', () => {
    expect(component.columns.length).toBe(4);
  });

  it('each column should have status, label, accent, glow and icon', () => {
    component.columns.forEach(col => {
      expect(col.status).toBeTruthy();
      expect(col.label).toBeTruthy();
      expect(col.accent).toBeTruthy();
      expect(col.glow).toBeTruthy();
      expect(col.icon).toBeTruthy();
    });
  });

  it('columns should cover all 4 statuses', () => {
    const statuses = component.columns.map(c => c.status);
    expect(statuses).toContain('pendiente');
    expect(statuses).toContain('en_progreso');
    expect(statuses).toContain('hecho');
    expect(statuses).toContain('bloqueado');
  });

  // ── Tickets ───────────────────────────────────────────────────────────────
  it('should load only tickets from the active group', () => {
    const loaded = component.tickets();
    loaded.forEach(t => expect(t.groupId).toBe(mockGroup.id));
  });

  it('counts() should sum to total tickets of the group', () => {
    const total  = component.tickets().length;
    const counts = component.counts();
    const sum    = counts.pendiente + counts.en_progreso + counts.hecho + counts.bloqueado;
    expect(sum).toBe(total);
  });

  it('recentTickets() should return at most 5 tickets', () => {
    expect(component.recentTickets().length).toBeLessThanOrEqual(5);
  });

  it('colTickets() should return only tickets of that status', () => {
    const pending = component.colTickets('pendiente');
    pending.forEach(t => expect(t.status).toBe('pendiente'));
  });

  // ── Filter signal ─────────────────────────────────────────────────────────
  it('filter should default to "all"', () => {
    expect(component.filter()).toBe('all');
  });

  it('setting filter to a status should update the signal', () => {
    component.filter.set('hecho');
    expect(component.filter()).toBe('hecho');
  });

  // ── Modal: crear ticket ──────────────────────────────────────────────────
  it('openCreate() should open modal in create mode', () => {
    component.openCreate();
    expect(component.showModal()).toBe(true);
    expect(component.isEditing()).toBe(false);
    expect(component.editingId()).toBeNull();
  });

  it('openCreate() should reset form titulo to empty', () => {
    component.form.titulo = 'previo';
    component.openCreate();
    expect(component.form.titulo).toBe('');
  });

  // ── Modal: editar ticket ─────────────────────────────────────────────────
  it('openEdit() should open modal in edit mode with ticket data', () => {
    const ticket = component.tickets()[0];
    component.openEdit(ticket);
    expect(component.showModal()).toBe(true);
    expect(component.isEditing()).toBe(true);
    expect(component.editingId()).toBe(ticket.id);
    expect(component.form.titulo).toBe(ticket.titulo);
  });

  // ── formInvalid ───────────────────────────────────────────────────────────
  it('formInvalid should be true when titulo is empty', () => {
    component.form.titulo = '';
    expect(component.formInvalid).toBe(true);
  });

  it('formInvalid should be false when titulo has text', () => {
    component.form.titulo = 'Mi ticket';
    expect(component.formInvalid).toBe(false);
  });

  // ── Crear ticket ──────────────────────────────────────────────────────────
  it('save() should add a ticket and close modal', () => {
    component.openCreate();
    const before = component.tickets().length;
    component.form.titulo = 'Nuevo ticket de prueba';
    component.save();
    expect(component.tickets().length).toBe(before + 1);
    expect(component.showModal()).toBe(false);
  });

  // ── Editar ticket ─────────────────────────────────────────────────────────
  it('save() in edit mode should update the ticket titulo', () => {
    const ticket = component.tickets()[0];
    component.openEdit(ticket);
    component.form.titulo = 'Título modificado';
    component.save();
    const updated = component.tickets().find(t => t.id === ticket.id);
    expect(updated?.titulo).toBe('Título modificado');
  });

  // ── Eliminar ticket ───────────────────────────────────────────────────────
  it('deleteTicket() should remove the ticket from the list', () => {
    const ticket = component.tickets()[0];
    const before = component.tickets().length;
    component.deleteTicket(ticket.id);
    expect(component.tickets().length).toBe(before - 1);
    expect(component.tickets().find(t => t.id === ticket.id)).toBeUndefined();
  });

  // ── Mover estado ──────────────────────────────────────────────────────────
  it('moveStatus() should change the ticket status', () => {
    const ticket = component.tickets().find(t => t.status === 'pendiente')!;
    component.moveStatus(ticket, 'en_progreso');
    const updated = component.tickets().find(t => t.id === ticket.id);
    expect(updated?.status).toBe('en_progreso');
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  it('col() should return the matching column definition', () => {
    const col = component.col('hecho');
    expect(col.status).toBe('hecho');
    expect(col.accent).toBeTruthy();
  });

  it('prevStatus() should return null for the first column', () => {
    expect(component.prevStatus('pendiente')).toBeNull();
  });

  it('nextStatus() should return null for the last column', () => {
    expect(component.nextStatus('bloqueado')).toBeNull();
  });

  it('prevStatus() should return the correct previous column status', () => {
    expect(component.prevStatus('en_progreso')).toBe('pendiente');
  });

  it('nextStatus() should return the correct next column status', () => {
    expect(component.nextStatus('en_progreso')).toBe('hecho');
  });

  it('assigneeName() should return the user full name by id', () => {
    expect(component.assigneeName(1)).toBe('Super Admin');
  });

  it('assigneeName() should return "—" for unknown id', () => {
    expect(component.assigneeName(9999)).toBe('—');
  });

  it('priorityColor() should return a hex color string', () => {
    expect(component.priorityColor('baja')).toMatch(/^#/);
    expect(component.priorityColor('critica')).toMatch(/^#/);
  });
});