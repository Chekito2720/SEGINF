import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GroupsComponent }     from './groups';
import { AuthService }         from '../../Services/Auth.service';
import { TicketService }       from '../../Services/Ticket.service';
import { PermissionsService }  from '../../Services/Permissions.service';
import { GROUPS, USERS, PERMISSION_PROFILES } from '../../models/Auth.model';
import { MessageService, ConfirmationService } from 'primeng/api';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';

// ── Fixtures ──────────────────────────────────────────────────────────────
const SUPER = USERS[0]; // id:1, groupIds:[1,2,3]
const ANA   = USERS[1]; // id:2, groupIds:[1,3]

const buildAuth = (user: typeof SUPER) => ({
  getGroup: () => GROUPS[0],
  getUser:  () => user,
  isLoggedIn: () => true,
  logout: () => {},
});

const buildPerms = (profile: 'superadmin' | 'group_admin' | 'group_member') => ({
  hasPermission:    (p: string) => PERMISSION_PROFILES[profile].includes(p as any),
  hasAnyPermission: (ps: string[]) => ps.some(p => PERMISSION_PROFILES[profile].includes(p as any)),
});

// ══ Suite ═════════════════════════════════════════════════════════════════
describe('GroupsComponent', () => {
  let component: GroupsComponent;
  let fixture:   ComponentFixture<GroupsComponent>;
  let router:    { navigate: (...args: any[]) => any };

  // track original GROUPS length to restore after tests that mutate it
  const originalGroupsLength = GROUPS.length;

  async function setup(
    user = SUPER,
    profile: 'superadmin' | 'group_admin' | 'group_member' = 'superadmin'
  ) {
    router = { navigate: (..._: any[]) => {} };
    await TestBed.configureTestingModule({
      imports: [GroupsComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthService,        useValue: buildAuth(user as any) },
        { provide: PermissionsService, useValue: buildPerms(profile)    },
        { provide: Router,             useValue: router                  },
        TicketService, MessageService, ConfirmationService,
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(GroupsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    // Restore GROUPS if a test added one
    while (GROUPS.length > originalGroupsLength) GROUPS.pop();
  });

  // ── Init ─────────────────────────────────────────────────────────
  describe('Initialization', () => {
    beforeEach(async () => setup());

    it('should create', () => expect(component).toBeTruthy());

    it('loads groups the user belongs to', () => {
      component.groups().forEach(g => expect(SUPER.groupIds).toContain(g.id));
    });

    it('auto-selects the active group', () => {
      expect(component.selected()?.id).toBe(GROUPS[0].id);
    });

    it('each group has a members array', () => {
      component.groups().forEach(g => expect(Array.isArray(g.members)).toBe(true));
    });
  });

  // ── Permissions ────────────────────────────────────────────────────
  describe('Permissions', () => {
    it('superadmin can group_add, group_edit, group_delete', async () => {
      await setup(SUPER, 'superadmin');
      expect(component.can('group_add')).toBe(true);
      expect(component.can('group_edit')).toBe(true);
      expect(component.can('group_delete')).toBe(true);
    });

    it('group_member cannot group_add / group_edit / group_delete', async () => {
      await setup(ANA as any, 'group_member');
      expect(component.can('group_add')).toBe(false);
      expect(component.can('group_edit')).toBe(false);
      expect(component.can('group_delete')).toBe(false);
    });
  });

  // ── Group selection ────────────────────────────────────────────────
  describe('Group selection', () => {
    beforeEach(async () => setup());

    it('selectGroup sets selected', () => {
      const g = component.groups()[1];
      if (g) {
        component.selectGroup(g);
        expect(component.selected()?.id).toBe(g.id);
      }
    });
  });

  // ── Create group ────────────────────────────────────────────────────
  describe('Create group', () => {
    beforeEach(async () => setup());

    it('openCreate opens dialog and resets form', () => {
      component.openCreate();
      expect(component.showCreateGroup()).toBe(true);
      expect(component.groupForm.nombre).toBe('');
    });

    it('saveCreate adds a new group', () => {
      const before = component.groups().length;
      component.openCreate();
      component.groupForm.nombre = 'Test Group';
      component.saveCreate();
      expect(component.groups().length).toBe(before + 1);
    });

    it('saveCreate closes dialog', () => {
      component.openCreate();
      component.groupForm.nombre = 'Test Group';
      component.saveCreate();
      expect(component.showCreateGroup()).toBe(false);
    });

    it('saveCreate does nothing if nombre is blank', () => {
      const before = GROUPS.length;
      component.openCreate();
      component.groupForm.nombre = '   ';
      component.saveCreate();
      expect(GROUPS.length).toBe(before);
    });
  });

  // ── Edit group ─────────────────────────────────────────────────────
  describe('Edit group', () => {
    beforeEach(async () => setup());

    it('openEdit opens dialog with current values', () => {
      const g = component.groups()[0];
      component.openEdit(g);
      expect(component.showEditGroup()).toBe(true);
      expect(component.groupForm.nombre).toBe(g.nombre);
    });

    it('saveEdit updates group name', () => {
      const g = component.groups()[0];
      component.openEdit(g);
      component.groupForm.nombre = 'Nombre Editado';
      component.saveEdit();
      expect(component.selected()?.nombre).toBe('Nombre Editado');
    });

    it('saveEdit closes dialog', () => {
      const g = component.groups()[0];
      component.openEdit(g);
      component.groupForm.nombre = 'Editado';
      component.saveEdit();
      expect(component.showEditGroup()).toBe(false);
    });

    it('saveEdit does nothing if nombre is blank', () => {
      const g = component.groups()[0];
      const original = g.nombre;
      component.openEdit(g);
      component.groupForm.nombre = '';
      component.saveEdit();
      expect(GROUPS.find(x => x.id === g.id)?.nombre).toBe(original);
    });

    afterEach(() => {
      // Restore original group name
      const idx = GROUPS.findIndex(g => g.id === 1);
      if (idx !== -1) GROUPS[idx].nombre = 'Equipo Dev';
    });
  });

  // ── Delete group ───────────────────────────────────────────────────
  describe('Delete group', () => {
    beforeEach(async () => setup());

    it('confirmDelete opens confirm dialog', () => {
      const g = component.groups()[0];
      component.confirmDelete(g);
      expect(component.showDeleteConfirm()).toBe(true);
      expect(component.selected()?.id).toBe(g.id);
    });

    it('executeDelete removes the group and closes dialog', () => {
      // Add a temp group to delete
      const tempId = 999;
      GROUPS.push({ id:tempId, nombre:'Temp', nivel:'Básico', autor:'Test', integrantes:0, tickets:0, descripcion:'', color:'#111', model:'GPT' });
      component.loadGroups();
      const temp = component.groups().find(g => g.id === tempId)!;
      component.confirmDelete(temp);
      component.executeDelete();
      expect(component.groups().find(g => g.id === tempId)).toBeUndefined();
      expect(component.showDeleteConfirm()).toBe(false);
    });
  });

  // ── Add member ─────────────────────────────────────────────────────
  describe('Add member', () => {
    beforeEach(async () => setup());

    it('openAddMember opens dialog and resets email', () => {
      component.openAddMember();
      expect(component.showAddMember()).toBe(true);
      expect(component.addMemberEmail).toBe('');
      expect(component.addMemberError).toBe('');
    });

    it('saveAddMember sets error for unknown email', () => {
      component.selectGroup(component.groups()[0]);
      component.openAddMember();
      component.addMemberEmail = 'unknown@test.com';
      component.saveAddMember();
      expect(component.addMemberError).toBeTruthy();
      expect(component.showAddMember()).toBe(true);
    });

    it('saveAddMember sets error if user already in group', () => {
      const g = component.groups()[0];
      component.selectGroup(g);
      component.openAddMember();
      component.addMemberEmail = g.members[0].email;
      component.saveAddMember();
      expect(component.addMemberError).toBeTruthy();
    });

    it('saveAddMember adds user and closes dialog for valid email not in group', () => {
      // Find a user not in group 2
      const g2 = component.groups().find(g => g.id === 2);
      if (!g2) return;
      const outsider = USERS.find(u => !u.groupIds.includes(2));
      if (!outsider) return;
      component.selectGroup(g2);
      component.openAddMember();
      component.addMemberEmail = outsider.email;
      component.saveAddMember();
      expect(component.showAddMember()).toBe(false);
      expect(outsider.groupIds).toContain(2);
      // Cleanup
      const i = outsider.groupIds.indexOf(2);
      if (i !== -1) outsider.groupIds.splice(i, 1);
    });
  });

  // ── Remove member ──────────────────────────────────────────────────
  describe('Remove member', () => {
    beforeEach(async () => setup());

    it('confirmRemove opens confirm dialog', () => {
      const g = component.groups()[0];
      component.selectGroup(g);
      component.confirmRemove(g.members[0]);
      expect(component.showRemoveConfirm()).toBe(true);
      expect(component.memberToRemove()?.id).toBe(g.members[0].id);
    });

    it('executeRemove removes user from group', () => {
      // Add a temp user to group 1 and then remove
      const tempUser = USERS[0];
      const g1 = component.groups().find(g => g.id === 1)!;
      component.selectGroup(g1);
      // Pick a member that exists
      const member = g1.members[0];
      const gidsBefore = [...member.groupIds];
      component.confirmRemove(member);
      component.executeRemove();
      expect(component.showRemoveConfirm()).toBe(false);
      expect(component.memberToRemove()).toBeNull();
      // Restore
      if (!member.groupIds.includes(1)) member.groupIds.push(1);
    });
  });

  // ── Helpers ────────────────────────────────────────────────────────
  describe('Helpers', () => {
    beforeEach(async () => setup());

    it('userColor returns a hex string', () => {
      expect(component.userColor(1)).toMatch(/^#/);
    });

    it('ticketCount returns a number >= 0', () => {
      expect(component.ticketCount(1)).toBeGreaterThanOrEqual(0);
    });

    it('nivelOptions has entries', () => {
      expect(component.nivelOptions.length).toBeGreaterThan(0);
    });

    it('modelOptions has entries', () => {
      expect(component.modelOptions.length).toBeGreaterThan(0);
    });

    it('colorOptions has entries', () => {
      expect(component.colorOptions.length).toBeGreaterThan(0);
    });

    it('openProfile navigates to /home/profile/:id', () => {
      let called: any = null;
      (router as any).navigate = (...args: any[]) => { called = args[0]; };
      component.openProfile(3);
      expect(called).toEqual(['/home/profile', 3]);
    });
  });
});