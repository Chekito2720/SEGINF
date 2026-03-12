import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminComponent }      from './admin';
import { AuthService }         from '../../Services/Auth.service';
import { PermissionsService }  from '../../Services/Permissions.service';
import { JwtService }          from '../../Services/Jwt.service';
import { Router }              from '@angular/router';
import {
  USERS, GROUPS, PERMISSION_SETS,
} from '../../models/Auth.model';
import { MessageService }       from 'primeng/api';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

// ═══════════════════════════════════════════════════════════════════
// Test doubles
// ═══════════════════════════════════════════════════════════════════
const TOKEN_KEY = 'miapp_token';

// spy-less mock: usamos una función que registra llamadas manualmente
// para evitar que jasmine.createSpy sea llamado fuera de describe/it
interface RefreshSpy { calls: number[]; (id: number): void; }

function makeSpy(): RefreshSpy {
  const spy = function(id: number) { spy.calls.push(id); } as RefreshSpy;
  spy.calls = [] as number[];
  return spy;
}

function buildAuthMock(userId: 1 | 2 | 3) {
  const user   = USERS.find(u => u.id === userId)!;
  const jwtSvc = new JwtService();
  const token  = jwtSvc.generate({
    sub:         user.id,
    username:    user.username,
    email:       user.email,
    fullName:    user.fullName,
    groupIds:    user.groupIds,
    permissions: user.permissions,
  });
  localStorage.setItem(TOKEN_KEY, token);
  const refreshToken = makeSpy();
  return {
    getUser:      () => user,
    getGroup:     () => GROUPS[0],
    isLoggedIn:   () => true,
    getPayload:   () => jwtSvc.verify(token),
    refreshToken,
    logout:       () => {},
  };
}

// ═══════════════════════════════════════════════════════════════════
// Suite
// ═══════════════════════════════════════════════════════════════════
describe('AdminComponent', () => {
  let component: AdminComponent;
  let fixture:   ComponentFixture<AdminComponent>;
  let router:    { navigate: (...args: any[]) => any };
  let authMock:  ReturnType<typeof buildAuthMock>;
  let navigateCalls: any[][];

  const origUsersLen = USERS.length;

  async function setup(userId: 1 | 2 | 3 = 1) {
    authMock = buildAuthMock(userId);
    navigateCalls = [];
    router   = { navigate: (...args: any[]) => { navigateCalls.push(args); } };

    await TestBed.configureTestingModule({
      imports: [AdminComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthService,        useValue: authMock },
        { provide: PermissionsService, useValue: new PermissionsService() },
        { provide: Router,             useValue: router },
        JwtService,
        MessageService,
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    localStorage.clear();
    while (USERS.length > origUsersLen) USERS.pop();
    // Restore mutated names
    USERS[0].fullName = 'Super Admin';
  });

  // ── Acceso ───────────────────────────────────────────────────────
  describe('Access control', () => {
    it('superadmin (id=1) gains access', async () => {
      await setup(1);
      expect(component.isSuperAdmin()).toBe(true);
    });

    it('non-superadmin (id=3) is redirected to /home', async () => {
      await setup(3);
      expect(component.isSuperAdmin()).toBe(false);
      expect(navigateCalls.some(a => JSON.stringify(a[0]) === JSON.stringify(['/home']))).toBe(true);
    });

    it('mid-level user (id=2) is also redirected', async () => {
      await setup(2);
      expect(component.isSuperAdmin()).toBe(false);
      expect(navigateCalls.some(a => JSON.stringify(a[0]) === JSON.stringify(['/home']))).toBe(true);
    });
  });

  // ── Inicialización ───────────────────────────────────────────────
  describe('Initialization', () => {
    beforeEach(async () => setup());

    it('should create', () => expect(component).toBeTruthy());

    it('loads all users on init', () => {
      expect(component.users().length).toBe(USERS.length);
    });

    it('no user is selected at start', () => {
      expect(component.selected()).toBeNull();
    });

    it('search signal starts empty', () => {
      expect(component.search()).toBe('');
    });

    it('permGroups has exactly 3 categories', () => {
      expect(component.permGroups.length).toBe(3);
    });

    it('allSets includes superadmin, avanzado, basico', () => {
      expect(component.allSets).toContain('superadmin');
      expect(component.allSets).toContain('avanzado');
      expect(component.allSets).toContain('basico');
    });

    it('setNames maps superadmin to "Superadmin"', () => {
      expect(component.setNames['superadmin']).toBe('Superadmin');
    });
  });

  // ── Búsqueda / filtro ────────────────────────────────────────────
  describe('filteredUsers()', () => {
    beforeEach(async () => setup());

    it('returns all users when search is empty', () => {
      expect(component.filteredUsers().length).toBe(USERS.length);
    });

    it('filters by fullName (case-insensitive)', () => {
      component.search.set('super');
      const results = component.filteredUsers();
      expect(results.length).toBeGreaterThan(0);
      results.forEach(u => expect(u.fullName.toLowerCase()).toContain('super'));
    });

    it('filters by email', () => {
      component.search.set('ana@');
      expect(component.filteredUsers().some(u => u.email.includes('ana@'))).toBe(true);
    });

    it('filters by username', () => {
      component.search.set('carlos_');
      expect(component.filteredUsers().some(u => u.username.includes('carlos_'))).toBe(true);
    });

    it('returns empty array for no match', () => {
      component.search.set('zzz_nonexistent_zzz');
      expect(component.filteredUsers().length).toBe(0);
    });
  });

  // ── selectUser ───────────────────────────────────────────────────
  describe('selectUser()', () => {
    beforeEach(async () => setup());

    it('sets selected signal', () => {
      component.selectUser(USERS[0]);
      expect(component.selected()?.id).toBe(USERS[0].id);
    });

    it('populates draftPerms from user permissions', () => {
      component.selectUser(USERS[0]);
      USERS[0].permissions.forEach(p =>
        expect(component.draftPerms().has(p)).toBe(true)
      );
    });

    it('switching users resets draftPerms', () => {
      component.selectUser(USERS[0]);
      component.selectUser(USERS[2]);
      expect(component.draftPerms().size).toBe(USERS[2].permissions.length);
    });
  });

  // ── Permisos — toggle ────────────────────────────────────────────
  describe('togglePerm()', () => {
    beforeEach(async () => { await setup(); component.selectUser(USERS[2]); });

    it('adds a permission not yet present', () => {
      component.draftPerms.set(new Set());
      component.togglePerm('ticket_edit');
      expect(component.hasPerm('ticket_edit')).toBe(true);
    });

    it('removes a permission already present', () => {
      component.draftPerms.set(new Set(['ticket_view'] as any));
      component.togglePerm('ticket_view');
      expect(component.hasPerm('ticket_view')).toBe(false);
    });

    it('does not affect other permissions when toggling', () => {
      component.draftPerms.set(new Set(['ticket_view', 'user_view'] as any));
      component.togglePerm('ticket_view');
      expect(component.hasPerm('user_view')).toBe(true);
    });
  });

  // ── Permisos — applySet ──────────────────────────────────────────
  describe('applySet()', () => {
    beforeEach(async () => { await setup(); component.selectUser(USERS[2]); });

    it('applies superadmin set', () => {
      component.applySet('superadmin');
      PERMISSION_SETS['superadmin'].forEach(p =>
        expect(component.hasPerm(p)).toBe(true)
      );
    });

    it('applies basico set', () => {
      component.applySet('basico');
      expect(component.draftCount).toBe(PERMISSION_SETS['basico'].length);
    });

    it('applies avanzado set', () => {
      component.applySet('avanzado');
      expect(component.draftCount).toBe(PERMISSION_SETS['avanzado'].length);
    });

    it('ignores unknown set keys', () => {
      const before = component.draftCount;
      component.applySet('nonexistent_set');
      expect(component.draftCount).toBe(before);
    });
  });

  // ── Permisos — draftCount / permsDirty ──────────────────────────
  describe('draftCount / permsDirty', () => {
    beforeEach(async () => { await setup(); component.selectUser(USERS[2]); });

    it('draftCount equals size of draftPerms set', () => {
      component.draftPerms.set(new Set(['ticket_view', 'user_view'] as any));
      expect(component.draftCount).toBe(2);
    });

    it('permsDirty is false when draft matches selected user', () => {
      const u = component.selected()!;
      component.draftPerms.set(new Set(u.permissions));
      expect(component.permsDirty).toBe(false);
    });

    it('permsDirty is true when draft differs from selected user', () => {
      component.draftPerms.set(new Set());
      expect(component.permsDirty).toBe(true);
    });

    it('permsDirty is false after savePermissions', () => {
      component.draftPerms.set(new Set(['ticket_view'] as any));
      component.savePermissions();
      expect(component.permsDirty).toBe(false);
    });
  });

  // ── savePermissions ──────────────────────────────────────────────
  describe('savePermissions()', () => {
    beforeEach(async () => { await setup(); component.selectUser(USERS[2]); });

    it('writes draftPerms into USERS[idx].permissions', () => {
      component.draftPerms.set(new Set(['ticket_view', 'ticket_edit'] as any));
      component.savePermissions();
      expect(USERS[2].permissions).toContain('ticket_edit' as any);
    });

    it('calls authSvc.refreshToken with the user id', () => {
      component.savePermissions();
      expect(authMock.refreshToken.calls).toContain(USERS[2].id);
    });

    it('syncs selected() with updated USERS data', () => {
      component.draftPerms.set(new Set(['ticket_view'] as any));
      component.savePermissions();
      expect(component.selected()!.permissions).toContain('ticket_view' as any);
    });

    it('does nothing when no user is selected', () => {
      component.selected.set(null);
      expect(() => component.savePermissions()).not.toThrow();
    });

    afterEach(() => {
      // Restore Carlos permissions
      USERS[2].permissions = PERMISSION_SETS['basico'] as any;
    });
  });

  // ── Create user ──────────────────────────────────────────────────
  describe('openCreate / saveCreate', () => {
    beforeEach(async () => setup());

    it('openCreate opens dialog and resets form fields', () => {
      component.openCreate();
      expect(component.showCreate()).toBe(true);
      expect(component.userForm.fullName).toBe('');
      expect(component.userForm.email).toBe('');
      expect(component.userForm.password).toBe('');
    });

    it('openCreate pre-loads basico permissions', () => {
      component.openCreate();
      expect(component.draftCount).toBe(PERMISSION_SETS['basico'].length);
    });

    it('saveCreate adds a new user to USERS', () => {
      const before = USERS.length;
      component.openCreate();
      component.userForm = {
        fullName: 'Test User', username: 'test_u',
        email: 'test@new.com', password: 'Pass@1234',
        phone: '', birthDate: '', address: '',
      };
      component.saveCreate();
      expect(USERS.length).toBe(before + 1);
    });

    it('saveCreate closes dialog on success', () => {
      component.openCreate();
      component.userForm = {
        fullName: 'Test User', username: 'tu',
        email: 'test2@new.com', password: 'Pass@1234',
        phone: '', birthDate: '', address: '',
      };
      component.saveCreate();
      expect(component.showCreate()).toBe(false);
    });

    it('saveCreate selects the newly created user', () => {
      component.openCreate();
      component.userForm = {
        fullName: 'New Person', username: 'np',
        email: 'newperson@new.com', password: 'Pass@1234',
        phone: '', birthDate: '', address: '',
      };
      component.saveCreate();
      expect(component.selected()?.email).toBe('newperson@new.com');
    });

    it('saveCreate sets formError when fullName is blank', () => {
      component.openCreate();
      component.userForm.fullName = '   ';
      component.saveCreate();
      expect(component.formError).toBeTruthy();
      expect(component.showCreate()).toBe(true);
    });

    it('saveCreate sets formError when email is blank', () => {
      component.openCreate();
      component.userForm.fullName = 'Test';
      component.userForm.email    = '';
      component.saveCreate();
      expect(component.formError).toBeTruthy();
    });

    it('saveCreate sets formError when password is blank', () => {
      component.openCreate();
      component.userForm.fullName = 'Test';
      component.userForm.email    = 'unique@test.com';
      component.userForm.password = '';
      component.saveCreate();
      expect(component.formError).toBeTruthy();
    });

    it('saveCreate sets formError for duplicate email', () => {
      component.openCreate();
      component.userForm = {
        fullName: 'Dup', username: 'dup',
        email: USERS[0].email, password: 'x',
        phone: '', birthDate: '', address: '',
      };
      component.saveCreate();
      expect(component.formError).toBeTruthy();
    });

    it('saveCreate uses email prefix as username when username is blank', () => {
      component.openCreate();
      component.userForm = {
        fullName: 'No Username', username: '',
        email: 'nouser@test.com', password: 'Pass@1234',
        phone: '', birthDate: '', address: '',
      };
      component.saveCreate();
      const created = USERS.find(u => u.email === 'nouser@test.com');
      expect(created?.username).toBe('nouser');
    });
  });

  // ── Edit user ────────────────────────────────────────────────────
  describe('openEdit / saveEdit', () => {
    beforeEach(async () => { await setup(); component.selectUser(USERS[0]); });

    it('openEdit opens dialog with user data', () => {
      component.openEdit(USERS[0]);
      expect(component.showEdit()).toBe(true);
      expect(component.userForm.fullName).toBe(USERS[0].fullName);
      expect(component.userForm.email).toBe(USERS[0].email);
    });

    it('saveEdit updates fullName in USERS', () => {
      component.openEdit(USERS[0]);
      component.userForm.fullName = 'Updated Admin';
      component.saveEdit();
      expect(USERS[0].fullName).toBe('Updated Admin');
    });

    it('saveEdit closes dialog on success', () => {
      component.openEdit(USERS[0]);
      component.userForm.fullName = 'Updated Admin 2';
      component.saveEdit();
      expect(component.showEdit()).toBe(false);
    });

    it('saveEdit syncs selected() with new data', () => {
      component.openEdit(USERS[0]);
      component.userForm.fullName = 'Updated Admin 3';
      component.saveEdit();
      expect(component.selected()?.fullName).toBe('Updated Admin 3');
    });

    it('saveEdit sets formError when fullName is blank', () => {
      component.openEdit(USERS[0]);
      component.userForm.fullName = '';
      component.saveEdit();
      expect(component.formError).toBeTruthy();
      expect(component.showEdit()).toBe(true);
    });

    it('saveEdit sets formError when email is blank', () => {
      component.openEdit(USERS[0]);
      component.userForm.email = '';
      component.saveEdit();
      expect(component.formError).toBeTruthy();
    });

    it('saveEdit preserves old password when new password is blank', () => {
      const original = USERS[0].password;
      component.openEdit(USERS[0]);
      component.userForm.password = '';
      component.saveEdit();
      expect(USERS[0].password).toBe(original);
    });

    it('saveEdit does nothing when no user selected', () => {
      component.selected.set(null);
      expect(() => component.saveEdit()).not.toThrow();
    });
  });

  // ── Delete user ──────────────────────────────────────────────────
  describe('confirmDelete / executeDelete', () => {
    beforeEach(async () => setup());

    it('confirmDelete opens confirm dialog', () => {
      component.confirmDelete(USERS[2]);
      expect(component.showDeleteConfirm()).toBe(true);
    });

    it('confirmDelete sets the target user', () => {
      component.confirmDelete(USERS[2]);
      expect(component.selected()?.id).toBe(USERS[2].id);
    });

    it('executeDelete removes the user from USERS', () => {
      USERS.push({
        id: 999, fullName: 'Temp', username: 'tmp',
        email: 'tmp@del.com', password: 'x',
        phone: '', birthDate: '', address: '',
        permissions: [], groupIds: [],
      });
      component.loadUsers();
      const target = component.users().find(u => u.id === 999)!;
      component.confirmDelete(target);
      component.executeDelete();
      expect(USERS.find(u => u.id === 999)).toBeUndefined();
    });

    it('executeDelete closes the confirm dialog', () => {
      USERS.push({
        id: 998, fullName: 'T2', username: 't2',
        email: 't2@del.com', password: 'x',
        phone: '', birthDate: '', address: '',
        permissions: [], groupIds: [],
      });
      component.loadUsers();
      const target = component.users().find(u => u.id === 998)!;
      component.confirmDelete(target);
      component.executeDelete();
      expect(component.showDeleteConfirm()).toBe(false);
    });

    it('executeDelete refuses to delete own account (superadmin)', () => {
      component.confirmDelete(USERS[0]);
      component.executeDelete();
      expect(USERS.find(u => u.id === USERS[0].id)).toBeTruthy();
      expect(component.showDeleteConfirm()).toBe(false);
    });

    it('executeDelete does nothing when no user selected', () => {
      component.selected.set(null);
      expect(() => component.executeDelete()).not.toThrow();
    });
  });

  // ── Helpers ──────────────────────────────────────────────────────
  describe('Helpers', () => {
    beforeEach(async () => setup());

    it('userColor(id) returns a hex string', () => {
      expect(component.userColor(1)).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('userColor cycles predictably for different ids', () => {
      const colors = [0,1,2,3,4,5].map(i => component.userColor(i));
      // After 5 values they should repeat
      expect(colors[0]).toBe(colors[5]);
    });

    it('groupName(id) returns the group nombre', () => {
      expect(component.groupName(1)).toBe('Equipo Dev');
      expect(component.groupName(2)).toBe('Soporte');
    });

    it('groupName returns "—" for unknown id', () => {
      expect(component.groupName(999)).toBe('—');
    });

    it('profileLabel returns "Superadmin" for user with all perms', () => {
      expect(component.profileLabel(USERS[0])).toBe('Superadmin');
    });

    it('profileLabel returns "Básico" for group_member', () => {
      expect(component.profileLabel(USERS[2])).toBe('Básico');
    });

    it('profileColor returns #7c6af7 for superadmin', () => {
      expect(component.profileColor(USERS[0])).toBe('#7c6af7');
    });

    it('profileColor returns #4ade80 for basico user', () => {
      expect(component.profileColor(USERS[2])).toBe('#4ade80');
    });
  });
});