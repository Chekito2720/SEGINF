import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TicketDetailComponent } from './ticket-detail';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService }        from '../../Services/Auth.service';
import { TicketService }      from '../../Services/Ticket.service';
import { PermissionsService } from '../../Services/Permissions.service';
import { GROUPS, TICKETS, PERMISSION_PROFILES } from '../../models/Auth.model';
import { MessageService } from 'primeng/api';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

// ── Fixtures ──────────────────────────────────────────────────────────────
const mockGroup  = GROUPS[0];   // Equipo Dev id:1
const mockTicket = TICKETS[0];  // id:1 createdById:1 assignedToId:2

const CREATOR = {
  id:1, fullName:'Super Admin', username:'superadmin',
  email:'admin@miapp.com', password:'Admin@12345',
  phone:'', birthDate:'', address:'',
  permissions: PERMISSION_PROFILES['superadmin'], groupIds:[1,2,3],
};

const ASSIGNEE = {
  id:2, fullName:'Ana García', username:'ana_garcia',
  email:'ana@miapp.com', password:'Usuario@12345',
  phone:'', birthDate:'', address:'',
  permissions: PERMISSION_PROFILES['group_admin'], groupIds:[1,3],
};

const buildAuth  = (u: typeof CREATOR) => ({
  getGroup: () => mockGroup, getUser: () => u, isLoggedIn: () => true,
  logout: () => {},
});
const permsMock  = {
  hasPermission: () => true, hasAnyPermission: () => true,
  getPermissions: () => PERMISSION_PROFILES['superadmin'],
};
const routeMock  = (id: number) => ({
  snapshot: { paramMap: { get: () => String(id) } }
});

// ══ Suite ═════════════════════════════════════════════════════════════════
describe('TicketDetailComponent', () => {
  let component: TicketDetailComponent;
  let fixture:   ComponentFixture<TicketDetailComponent>;
  let ticketSvc: TicketService;
  let router:    { navigate: (...args: any[]) => any };

  async function setup(user = CREATOR, ticketId = 1) {
    let navigateCalls: any[][] = [];
    const routerSpy = { navigate: (...args: any[]) => { navigateCalls.push(args); } };
    await TestBed.configureTestingModule({
      imports:   [TicketDetailComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthService,        useValue: buildAuth(user) },
        { provide: PermissionsService, useValue: permsMock       },
        { provide: ActivatedRoute,     useValue: routeMock(ticketId) },
        { provide: Router,             useValue: routerSpy       },
        TicketService, MessageService,
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(TicketDetailComponent);
    component = fixture.componentInstance;
    ticketSvc = TestBed.inject(TicketService);
    router    = TestBed.inject(Router) as any;
    fixture.detectChanges();
  }

  // ── Init ───────────────────────────────────────────────────────────
  describe('Initialization', () => {
    beforeEach(async () => setup());

    it('should create',                        () => expect(component).toBeTruthy());
    it('should load ticket by route id',       () => expect(component.ticket()?.id).toBe(1));
    it('should load active group',             () => expect(component.group()).toEqual(mockGroup));

    it('should set ticket to null for unknown id', async () => {
      await setup(CREATOR, 9999);
      expect(component.ticket()).toBeNull();
    });
  });

  // ── Permisos: creador ──────────────────────────────────────────────
  describe('Permissions — creator', () => {
    beforeEach(async () => setup(CREATOR, 1));

    it('isCreator       → true',  () => expect(component.isCreator).toBe(true));
    it('isAssignee      → false', () => expect(component.isAssignee).toBe(false));
    it('canEditFields   → true',  () => expect(component.canEditFields).toBe(true));
    it('canChangeStatus → true',  () => expect(component.canChangeStatus).toBe(true));
    it('canComment      → true',  () => expect(component.canComment).toBe(true));
  });

  // ── Permisos: asignado ─────────────────────────────────────────────
  describe('Permissions — assignee', () => {
    beforeEach(async () => setup(ASSIGNEE, 1));

    it('isAssignee      → true', () => expect(component.isAssignee).toBe(true));
    it('canChangeStatus → true', () => expect(component.canChangeStatus).toBe(true));
    it('canComment      → true', () => expect(component.canComment).toBe(true));
  });

  // ── Edit title ─────────────────────────────────────────────────────
  describe('Inline edit — title', () => {
    beforeEach(async () => setup());

    it('startEditTitle() sets editTitle=true and loads current title', () => {
      component.startEditTitle();
      expect(component.editTitle()).toBe(true);
      expect(component.draftTitle).toBe(mockTicket.titulo);
    });

    it('saveTitle() updates title and closes edit mode', () => {
      component.startEditTitle();
      component.draftTitle = 'Nuevo título';
      component.saveTitle();
      expect(component.editTitle()).toBe(false);
      expect(component.ticket()?.titulo).toBe('Nuevo título');
    });

    it('saveTitle() with blank draft closes without saving', () => {
      const orig = component.ticket()!.titulo;
      component.startEditTitle();
      component.draftTitle = '   ';
      component.saveTitle();
      expect(component.ticket()?.titulo).toBe(orig);
    });
  });

  // ── Edit description ───────────────────────────────────────────────
  describe('Inline edit — description', () => {
    beforeEach(async () => setup());

    it('startEditDesc() sets editDesc=true with current description', () => {
      component.startEditDesc();
      expect(component.editDesc()).toBe(true);
      expect(component.draftDesc).toBe(mockTicket.descripcion);
    });

    it('saveDesc() updates description', () => {
      component.startEditDesc();
      component.draftDesc = 'Descripción nueva';
      component.saveDesc();
      expect(component.editDesc()).toBe(false);
      expect(component.ticket()?.descripcion).toBe('Descripción nueva');
    });
  });

  // ── changeStatus ──────────────────────────────────────────────────
  describe('changeStatus()', () => {
    beforeEach(async () => setup());

    it('updates ticket status', () => {
      component.changeStatus('hecho');
      expect(component.ticket()?.status).toBe('hecho');
    });

    it('adds a history entry', () => {
      const before = ticketSvc.getHistory(1).length;
      component.changeStatus('bloqueado');
      expect(ticketSvc.getHistory(1).length).toBeGreaterThan(before);
    });
  });

  // ── changePriority ─────────────────────────────────────────────────
  describe('changePriority()', () => {
    beforeEach(async () => setup());

    it('bloqueante → critica', () => { component.changePriority('bloqueante'); expect(component.ticket()?.priority).toBe('critica'); });
    it('critica → critica', () => { component.changePriority('critica'); expect(component.ticket()?.priority).toBe('critica'); });
    it('alta → alta',    () => { component.changePriority('alta'); expect(component.ticket()?.priority).toBe('alta');    });
    it('normal → media',   () => { component.changePriority('normal'); expect(component.ticket()?.priority).toBe('media');   });
    it('baja → baja',    () => { component.changePriority('baja'); expect(component.ticket()?.priority).toBe('baja');    });
    it('minima → baja',    () => { component.changePriority('minima'); expect(component.ticket()?.priority).toBe('baja');    });
  });

  // ── reassign ───────────────────────────────────────────────────────
  describe('reassign()', () => {
    beforeEach(async () => setup());

    it('updates assignedToId', () => {
      component.reassign(3);
      expect(component.ticket()?.assignedToId).toBe(3);
    });

    it('adds a history entry', () => {
      const before = ticketSvc.getHistory(1).length;
      component.reassign(3);
      expect(ticketSvc.getHistory(1).length).toBeGreaterThan(before);
    });
  });

  // ── changeDueDate ──────────────────────────────────────────────────
  describe('changeDueDate()', () => {
    beforeEach(async () => setup());

    it('updates dueDate', () => {
      component.changeDueDate('2099-12-31');
      expect(component.ticket()?.dueDate).toBe('2099-12-31');
    });
  });

  // ── addComment ─────────────────────────────────────────────────────
  describe('addComment()', () => {
    beforeEach(async () => setup());

    it('adds comment and clears input', fakeAsync(() => {
      const before = ticketSvc.getComments(1).length;
      component.newComment = 'Comentario spec test';
      component.addComment();
      tick(300);
      expect(component.newComment).toBe('');
      expect(ticketSvc.getComments(1).length).toBe(before + 1);
    }));

    it('does not add comment when input is blank', fakeAsync(() => {
      const before = ticketSvc.getComments(1).length;
      component.newComment = '   ';
      component.addComment();
      tick(300);
      expect(ticketSvc.getComments(1).length).toBe(before);
    }));
  });

  // ── activity feed ──────────────────────────────────────────────────
  describe('activity()', () => {
    beforeEach(async () => setup());

    it('contains both comment and history entries', () => {
      const feed = component.activity();
      expect(feed.some(e => e.kind === 'comment')).toBe(true);
      expect(feed.some(e => e.kind === 'history')).toBe(true);
    });

    it('is sorted descending by createdAt', () => {
      const feed = component.activity();
      for (let i = 0; i < feed.length - 1; i++)
        expect(feed[i].createdAt >= feed[i + 1].createdAt).toBe(true);
    });
  });

  // ── priorityOptions ────────────────────────────────────────────────
  describe('priorityOptions', () => {
    beforeEach(async () => setup());

    it('has exactly 7 options',          () => expect(component.priorityOptions.length).toBe(7));

    it('is sorted by rank ascending', () => {
      const ranks = component.priorityOptions.map(p => p.rank);
      for (let i = 0; i < ranks.length - 1; i++)
        expect(ranks[i]).toBeLessThan(ranks[i + 1]);
    });

    it('each value is a valid Spanish key', () => {
      const valid = ['minima','baja','normal','alta','urgente','critica','bloqueante'];
      component.priorityOptions.forEach(p =>
        expect(valid).toContain(p.value)
      );
    });
  });

  // ── Helpers ────────────────────────────────────────────────────────
  describe('Helpers', () => {
    beforeEach(async () => setup());

    it('userName(1) → "Super Admin"',       () => expect(component.userName(1)).toBe('Super Admin'));
    it('userName(9999) → "—"',              () => expect(component.userName(9999)).toBe('—'));
    it('userInitial(1) → "S"',              () => expect(component.userInitial(1)).toBe('S'));
    it('statusLabel("en_progreso")',         () => expect(component.statusLabel('en_progreso')).toBe('En progreso'));
    it('statusAccent returns hex color',    () => expect(component.statusAccent('hecho')).toMatch(/^#/));
    it('priorityMeta returns full object',  () => {
      const m = component.priorityMeta('alta');
      expect(m.label).toBeTruthy();
      expect(m.color).toMatch(/^#/);
      expect(m.rank).toBeGreaterThan(0);
    });
    it('historyIcon returns pi- class',    () => expect(component.historyIcon('status_changed')).toContain('pi-'));
    it('historyLabel includes user name',  () => {
      const entry = { kind:'history' as const, id:1, userId:1, createdAt:'', action:'created' as const };
      expect(component.historyLabel(entry)).toContain('Super Admin');
    });
    it('isOverdue(undefined) → false',     () => expect(component.isOverdue(undefined)).toBe(false));
    it('isOverdue past date  → true',      () => expect(component.isOverdue('2000-01-01')).toBe(true));
    it('isOverdue future date → false',    () => expect(component.isOverdue('2099-12-31')).toBe(false));
    it('formatDate returns non-empty str', () => expect(component.formatDate('2025-03-01T09:00:00').length).toBeGreaterThan(0));
    it('goBack() navigates to /home/kanban', () => {
      let called: any[] | null = null;
      (router as any).navigate = (...args: any[]) => { called = args; };
      component.goBack();
      expect(called).toEqual([['/home/kanban']]);
    });
  });
});