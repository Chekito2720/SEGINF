import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KanbanComponent } from './kanban';
import { AuthService }        from '../../Services/Auth.service';
import { TicketService }      from '../../Services/Ticket.service';
import { PermissionsService } from '../../Services/Permissions.service';
import { GROUPS, TICKETS, PERMISSION_PROFILES, TicketStatus } from '../../models/Auth.model';
import { MessageService } from 'primeng/api';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockGroup = GROUPS[0]; // Equipo Dev id:1

const mockUser = {
  id: 1, fullName: 'Super Admin', username: 'superadmin',
  email: 'admin@miapp.com', password: 'Admin@12345',
  phone: '', birthDate: '', address: '',
  permissions: PERMISSION_PROFILES['superadmin'],
  groupIds: [1, 2, 3],
};

const authMock = {
  getGroup:   () => mockGroup,
  getUser:    () => mockUser,
  isLoggedIn: () => true,
};

const permsMock = {
  hasPermission:    (_p: string) => true,
  hasAnyPermission: (_ps: string[]) => true,
  getPermissions:   () => PERMISSION_PROFILES['superadmin'],
};

// ── Suite ──────────────────────────────────────────────────────────────────
describe('KanbanComponent', () => {
  let component: KanbanComponent;
  let fixture:   ComponentFixture<KanbanComponent>;
  let ticketSvc: TicketService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KanbanComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthService,        useValue: authMock  },
        { provide: PermissionsService, useValue: permsMock },
        TicketService,
        MessageService,
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(KanbanComponent);
    component = fixture.componentInstance;
    ticketSvc = TestBed.inject(TicketService);
    fixture.detectChanges();
  });

  // ── Creación ───────────────────────────────────────────────────────────
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Grupo ──────────────────────────────────────────────────────────────
  it('should load the active group on init', () => {
    expect(component.group()).toEqual(mockGroup);
  });

  // ── Columnas ───────────────────────────────────────────────────────────
  it('should have exactly 4 kanban columns', () => {
    expect(component.columns.length).toBe(4);
  });

  it('each column should have required properties', () => {
    component.columns.forEach(col => {
      expect(col.status).toBeTruthy();
      expect(col.label).toBeTruthy();
      expect(col.accent).toMatch(/^#|^rgba/);
      expect(col.glow).toMatch(/^rgba/);
      expect(col.icon).toBeTruthy();
      expect(col.isDragOver).toBe(false);
    });
  });

  it('columns should cover all 4 statuses', () => {
    const statuses = component.columns.map(c => c.status);
    (['pendiente', 'en_progreso', 'hecho', 'bloqueado'] as TicketStatus[])
      .forEach(s => expect(statuses).toContain(s));
  });

  // ── Tickets ────────────────────────────────────────────────────────────
  it('should load only tickets from the active group', () => {
    component.tickets().forEach(t => expect(t.groupId).toBe(mockGroup.id));
  });

  it('colTickets() should return only tickets matching that status', () => {
    component.colTickets('pendiente').forEach(t =>
      expect(t.status).toBe('pendiente')
    );
  });

  it('counts() should sum up to total tickets', () => {
    const c   = component.counts();
    const sum = c.pendiente + c.en_progreso + c.hecho + c.bloqueado;
    expect(sum).toBe(component.tickets().length);
  });

  // ── Drag & Drop ─────────────────────────────────────────────────────────
  it('draggingId should default to null', () => {
    expect(component.draggingId()).toBeNull();
  });

  it('onDragStart() should set draggingId to the ticket id', () => {
    const ticket = component.tickets()[0];
    const event  = new DragEvent('dragstart', { dataTransfer: new DataTransfer() });
    component.onDragStart(event, ticket);
    expect(component.draggingId()).toBe(ticket.id);
  });

  it('onDragEnd() should reset draggingId to null', () => {
    component.draggingId.set(99);
    component.onDragEnd();
    expect(component.draggingId()).toBeNull();
  });

  it('onDragEnd() should clear isDragOver on all columns', () => {
    component.columns.forEach(c => c.isDragOver = true);
    component.onDragEnd();
    component.columns.forEach(c => expect(c.isDragOver).toBe(false));
  });

  it('onDragOver() should set isDragOver on the target column', () => {
    const col   = component.columns[0];
    const event = new DragEvent('dragover', { dataTransfer: new DataTransfer() });
    component.onDragOver(event, col);
    expect(col.isDragOver).toBe(true);
  });

  it('onDragLeave() should clear isDragOver on the column', () => {
    const col = component.columns[0];
    col.isDragOver = true;
    component.onDragLeave(col);
    expect(col.isDragOver).toBe(false);
  });

  it('onDrop() should change ticket status and reset draggingId', () => {
    const ticket = component.tickets().find(t => t.status === 'pendiente')!;
    component.draggingId.set(ticket.id);
    const col   = component.columns.find(c => c.status === 'en_progreso')!;
    const event = new DragEvent('drop', { dataTransfer: new DataTransfer() });
    component.onDrop(event, 'en_progreso', col);
    expect(component.draggingId()).toBeNull();
    const updated = component.tickets().find(t => t.id === ticket.id);
    expect(updated?.status).toBe('en_progreso');
  });

  it('onDrop() with null draggingId should do nothing', () => {
    component.draggingId.set(null);
    const before = component.tickets().length;
    const col    = component.columns[1];
    const event  = new DragEvent('drop', { dataTransfer: new DataTransfer() });
    component.onDrop(event, 'hecho', col);
    expect(component.tickets().length).toBe(before);
  });

  // ── Detail modal ───────────────────────────────────────────────────────
  it('openDetail() should open modal and set selected ticket', () => {
    const ticket = component.tickets()[0];
    component.openDetail(ticket);
    expect(component.showDetail()).toBe(true);
    expect(component.selected()?.id).toBe(ticket.id);
    expect(component.editMode()).toBe(false);
  });

  it('enterEditMode() should populate editForm with selected ticket data', () => {
    const ticket = component.tickets()[0];
    component.openDetail(ticket);
    component.enterEditMode();
    expect(component.editMode()).toBe(true);
    expect(component.editForm.titulo).toBe(ticket.titulo);
    expect(component.editForm.status).toBe(ticket.status);
    expect(component.editForm.priority).toBe(ticket.priority);
    expect(component.editForm.assignedToId).toBe(ticket.assignedToId);
  });

  it('saveEdit() should update the ticket and exit edit mode', () => {
    const ticket = component.tickets()[0];
    component.openDetail(ticket);
    component.enterEditMode();
    component.editForm.titulo = 'Título editado test';
    component.saveEdit();
    expect(component.editMode()).toBe(false);
    const updated = component.tickets().find(t => t.id === ticket.id);
    expect(updated?.titulo).toBe('Título editado test');
  });

  it('saveEdit() should not proceed if titulo is empty', () => {
    const ticket = component.tickets()[0];
    const originalTitulo = ticket.titulo;
    component.openDetail(ticket);
    component.enterEditMode();
    component.editForm.titulo = '   ';
    component.saveEdit();
    expect(component.editMode()).toBe(true); // stays in edit mode
    const unchanged = component.tickets().find(t => t.id === ticket.id);
    expect(unchanged?.titulo).toBe(originalTitulo);
  });

  it('deleteSelected() should remove the ticket and close modal', () => {
    const ticket = component.tickets()[0];
    const before = component.tickets().length;
    component.openDetail(ticket);
    component.deleteSelected();
    expect(component.showDetail()).toBe(false);
    expect(component.tickets().length).toBe(before - 1);
    expect(component.tickets().find(t => t.id === ticket.id)).toBeUndefined();
  });

  // ── Create modal ───────────────────────────────────────────────────────
  it('openCreate() should open create modal with empty form', () => {
    component.openCreate();
    expect(component.showCreate()).toBe(true);
    expect(component.editForm.titulo).toBe('');
    expect(component.editForm.status).toBe('pendiente');
    expect(component.editForm.groupId).toBe(mockGroup.id);
  });

  it('saveCreate() should add a new ticket and close modal', () => {
    component.openCreate();
    const before = component.tickets().length;
    component.editForm.titulo = 'Nuevo ticket spec';
    component.saveCreate();
    expect(component.showCreate()).toBe(false);
    expect(component.tickets().length).toBe(before + 1);
    const created = component.tickets().find(t => t.titulo === 'Nuevo ticket spec');
    expect(created).toBeTruthy();
    expect(created?.groupId).toBe(mockGroup.id);
  });

  it('saveCreate() should not proceed if titulo is empty', () => {
    component.openCreate();
    const before = component.tickets().length;
    component.editForm.titulo = '';
    component.saveCreate();
    expect(component.tickets().length).toBe(before);
    expect(component.showCreate()).toBe(true);
  });

  // ── formInvalid ────────────────────────────────────────────────────────
  it('formInvalid should be true when titulo is blank', () => {
    component.editForm.titulo = '';
    expect(component.formInvalid).toBe(true);
  });

  it('formInvalid should be false when titulo has content', () => {
    component.editForm.titulo = 'Algo';
    expect(component.formInvalid).toBe(false);
  });

  // ── Helpers ────────────────────────────────────────────────────────────
  it('col() should return the column matching the status', () => {
    const col = component.col('hecho');
    expect(col.status).toBe('hecho');
  });

  it('assigneeName() should return full name for a valid id', () => {
    expect(component.assigneeName(1)).toBe('Super Admin');
  });

  it('assigneeName() should return "—" for unknown id', () => {
    expect(component.assigneeName(9999)).toBe('—');
  });

  it('assigneeInitial() should return first letter of full name', () => {
    expect(component.assigneeInitial(1)).toBe('S');
  });

  it('priorityMeta() should return color and bg for each priority', () => {
    (['baja', 'media', 'alta', 'critica'] as const).forEach(p => {
      const meta = component.priorityMeta(p);
      expect(meta.color).toMatch(/^#/);
      expect(meta.bg).toMatch(/^rgba/);
    });
  });

  it('isOverdue() should return false for undefined dueDate', () => {
    expect(component.isOverdue(undefined)).toBe(false);
  });

  it('isOverdue() should return true for a past date', () => {
    expect(component.isOverdue('2000-01-01')).toBe(true);
  });

  it('isOverdue() should return false for a future date', () => {
    expect(component.isOverdue('2099-12-31')).toBe(false);
  });
});