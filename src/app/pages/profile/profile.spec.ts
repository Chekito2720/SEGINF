import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileComponent }    from './profile';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService }         from '../../Services/Auth.service';
import { TicketService }       from '../../Services/Ticket.service';
import { PermissionsService }  from '../../Services/Permissions.service';
import { GROUPS, USERS, PERMISSION_PROFILES } from '../../models/Auth.model';
import { MessageService } from 'primeng/api';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

// ── Fixtures ──────────────────────────────────────────────────────────────
const SUPER = USERS[0];    // id:1, groupIds:[1,2,3]
const ANA   = USERS[1];    // id:2, groupIds:[1,3]

const buildAuth = (user: typeof SUPER) => ({
  getGroup: () => GROUPS[0],
  getUser:  () => user,
  isLoggedIn: () => true,
  logout: () => {},
});

const permsMock = {
  hasPermission: (p: string) => PERMISSION_PROFILES['superadmin'].includes(p as any),
  hasAnyPermission: () => true,
};

const routeMock = (id?: string) => ({
  snapshot: { paramMap: { get: (_: string) => id ?? null } }
});

// ══ Suite ════════════════════════════════════════════════════════════════
describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture:   ComponentFixture<ProfileComponent>;
  let router:    { navigate: (...args: any[]) => any };

  async function setup(routeId?: string, currentUser = SUPER) {
    router = { navigate: (..._args: any[]) => {} };
    await TestBed.configureTestingModule({
      imports: [ProfileComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthService,        useValue: buildAuth(currentUser) },
        { provide: PermissionsService, useValue: permsMock              },
        { provide: ActivatedRoute,     useValue: routeMock(routeId)     },
        { provide: Router,             useValue: router                  },
        TicketService, MessageService,
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  // ── Carga — propio perfil ─────────────────────────────────────────
  describe('Own profile (no route id)', () => {
    beforeEach(async () => setup());

    it('should create', () => expect(component).toBeTruthy());
    it('isSelf is true when no route id', () => expect(component.isSelf()).toBe(true));
    it('loads current user as profileUser', () => expect(component.profileUser()?.id).toBe(SUPER.id));
    it('editing starts as false', () => expect(component.editing()).toBe(false));
    it('ticketFilter starts as "todos"', () => expect(component.ticketFilter()).toBe('todos'));
  });

  // ── Carga — perfil de otro usuario ───────────────────────────────
  describe('Another user profile (route id = 2)', () => {
    beforeEach(async () => setup('2', SUPER));

    it('loads user by route id', () => expect(component.profileUser()?.id).toBe(2));
    it('isSelf is false for another user', () => expect(component.isSelf()).toBe(false));
  });

  // ── Perfil inexistente ───────────────────────────────────────────
  describe('Unknown user (route id = 9999)', () => {
    beforeEach(async () => setup('9999'));

    it('sets profileUser to null for unknown id', () => expect(component.profileUser()).toBeNull());
  });

  // ── Tickets ───────────────────────────────────────────────────────
  describe('Tickets', () => {
    beforeEach(async () => setup('2', SUPER)); // Ana tiene tickets en grupo 1

    it('counts.todos reflects all assigned tickets', () => {
      expect(component.counts().todos).toBeGreaterThanOrEqual(0);
    });

    it('filteredTickets returns all when filter is "todos"', () => {
      component.ticketFilter.set('todos');
      const all = component.filteredTickets();
      const todos = component.counts().todos;
      expect(all.length).toBe(todos);
    });

    it('filteredTickets filters by status correctly', () => {
      component.ticketFilter.set('pendiente');
      component.filteredTickets().forEach(t => expect(t.status).toBe('pendiente'));
    });

    it('counts sum equals todos', () => {
      const c = component.counts();
      const sum = c.pendiente + c.en_progreso + c.hecho + c.bloqueado;
      expect(sum).toBe(c.todos);
    });

    it('statusTabs has 5 entries', () => expect(component.statusTabs.length).toBe(5));
  });

  // ── Edición ───────────────────────────────────────────────────────
  describe('Edit profile', () => {
    beforeEach(async () => setup());

    it('canEdit is true for own profile', () => expect(component.canEdit).toBe(true));

    it('startEdit() sets editing=true and populates draftForm', () => {
      component.startEdit();
      expect(component.editing()).toBe(true);
      expect(component.draftForm.fullName).toBe(SUPER.fullName);
      expect(component.draftForm.email).toBe(SUPER.email);
    });

    it('saveEdit() updates profileUser and closes editing', () => {
      component.startEdit();
      component.draftForm.fullName = 'Nombre Modificado';
      component.saveEdit();
      expect(component.editing()).toBe(false);
      expect(component.profileUser()?.fullName).toBe('Nombre Modificado');
    });

    it('saveEdit() does nothing if fullName is blank', () => {
      component.startEdit();
      const original = component.profileUser()!.fullName;
      component.draftForm.fullName = '   ';
      component.saveEdit();
      expect(component.profileUser()?.fullName).toBe(original);
    });

    it('cancelEdit() closes editing without saving', () => {
      component.startEdit();
      component.draftForm.fullName = 'No guardar';
      component.cancelEdit();
      expect(component.editing()).toBe(false);
      expect(component.profileUser()?.fullName).toBe(SUPER.fullName);
    });
  });

  // ── Helpers ───────────────────────────────────────────────────────
  describe('Helpers', () => {
    beforeEach(async () => setup());

    it('userColor returns a hex color', () => {
      expect(component.userColor(1)).toMatch(/^#/);
    });

    it('userInitial returns first letter', () => {
      expect(component.userInitial(SUPER)).toBe('S');
    });

    it('groupName returns group name', () => {
      expect(component.groupName(1)).toBe('Equipo Dev');
    });

    it('groupName returns — for unknown', () => {
      expect(component.groupName(999)).toBe('—');
    });

    it('profileLabel returns Superadmin for superadmin user', () => {
      expect(component.profileLabel(SUPER)).toBe('Superadmin');
    });

    it('profileLabel returns Miembro for group_member', () => {
      expect(component.profileLabel(USERS[2])).toBe('Miembro');
    });

    it('statusMeta returns correct metadata', () => {
      const m = component.statusMeta('hecho');
      expect(m.label).toBe('Hecho');
      expect(m.color).toMatch(/^#/);
    });

    it('priorityMeta returns correct label', () => {
      expect(component.priorityMeta('critica').label).toBe('Crítica');
    });

    it('isOverdue false for undefined', () => expect(component.isOverdue(undefined)).toBe(false));
    it('isOverdue false for hecho',    () => expect(component.isOverdue('2000-01-01', 'hecho')).toBe(false));
    it('isOverdue true for past date', () => expect(component.isOverdue('2000-01-01', 'pendiente')).toBe(true));
    it('isOverdue false for future',   () => expect(component.isOverdue('2099-12-31', 'pendiente')).toBe(false));

    it('formatDate returns — for undefined', () => expect(component.formatDate(undefined)).toBe('—'));
    it('formatDate returns string for valid date', () => expect(component.formatDate('2025-03-01').length).toBeGreaterThan(0));

    it('goBack() navigates to /home/user', () => {
      let called: any = null;
      (router as any).navigate = (...args: any[]) => { called = args[0]; };
      component.goBack();
      expect(called).toEqual(['/home/user']);
    });

    it('openTicket() navigates to /home/ticket/:id', () => {
      let called: any = null;
      (router as any).navigate = (...args: any[]) => { called = args[0]; };
      component.openTicket(5);
      expect(called).toEqual(['/home/ticket', 5]);
    });
  });
});