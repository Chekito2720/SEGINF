import {
  Component, signal,
} from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By }                   from '@angular/platform-browser';
import { HasPermissionDirective } from './has-permission.directive';
import { PermissionsService }     from '../Services/Permissions.service';
import { Permission }             from '../models/Auth.model';

// ── Host components ───────────────────────────────────────────────
@Component({
  standalone: true,
  imports: [HasPermissionDirective],
  template: `<span *ifHasPermission="'ticket_edit'">VISIBLE</span>`,
})
class SinglePermHost {}

@Component({
  standalone: true,
  imports: [HasPermissionDirective],
  template: `<span *ifHasPermission="perms">VISIBLE</span>`,
})
class ArrayPermHost {
  perms: Permission[] = ['ticket_edit', 'tickets_edit'];
}

// ── Fake PermissionsService ───────────────────────────────────────
function makePermsSvc(initial: Permission[] = []) {
  const _perms = signal<Permission[]>(initial);
  return {
    _perms,
    hasPermission:    (p: Permission) => _perms().includes(p),
    hasAnyPermission: (ps: Permission[]) => ps.some(p => _perms().includes(p)),
    hasAllPermissions:(ps: Permission[]) => ps.every(p => _perms().includes(p)),
    getPermissions:   () => _perms(),
    loadFromToken:    () => {},
    clearPermissions: () => { _perms.set([]); },
    setPermissions:   (p: Permission[]) => { _perms.set(p); },
  };
}

// ══ Suite ═════════════════════════════════════════════════════════
describe('HasPermissionDirective', () => {
  let permsSvc: ReturnType<typeof makePermsSvc>;

  // ── Single permission string ──────────────────────────────────
  describe('single permission input', () => {
    let fixture: ComponentFixture<SinglePermHost>;

    function setup(initial: Permission[] = []) {
      permsSvc = makePermsSvc(initial);
      TestBed.configureTestingModule({
        imports: [SinglePermHost],
        providers: [{ provide: PermissionsService, useValue: permsSvc }],
      });
      fixture = TestBed.createComponent(SinglePermHost);
      fixture.detectChanges();
    }

    it('hides element when permission is absent', () => {
      setup([]);
      const el = fixture.debugElement.query(By.css('span'));
      expect(el).toBeNull();
    });

    it('shows element when permission is present', () => {
      setup(['ticket_edit']);
      const el = fixture.debugElement.query(By.css('span'));
      expect(el).not.toBeNull();
      expect(el.nativeElement.textContent.trim()).toBe('VISIBLE');
    });

    it('shows element reactively when permission is added after init', fakeAsync(() => {
      setup([]);
      expect(fixture.debugElement.query(By.css('span'))).toBeNull();

      // Simulate JWT refresh adding the permission
      permsSvc._perms.set(['ticket_edit']);
      tick();
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('span'))).not.toBeNull();
    }));

    it('hides element reactively when permission is removed after init', fakeAsync(() => {
      setup(['ticket_edit']);
      expect(fixture.debugElement.query(By.css('span'))).not.toBeNull();

      // Simulate JWT refresh removing the permission
      permsSvc._perms.set([]);
      tick();
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('span'))).toBeNull();
    }));

    it('does not add duplicate DOM nodes when permission stays the same', fakeAsync(() => {
      setup(['ticket_edit']);
      permsSvc._perms.set(['ticket_edit', 'user_view']);
      tick();
      fixture.detectChanges();

      const spans = fixture.debugElement.queryAll(By.css('span'));
      expect(spans.length).toBe(1);
    }));
  });

  // ── Array of permissions (OR logic) ───────────────────────────
  describe('array permission input (OR logic)', () => {
    let fixture: ComponentFixture<ArrayPermHost>;

    function setup(initial: Permission[] = []) {
      permsSvc = makePermsSvc(initial);
      TestBed.configureTestingModule({
        imports: [ArrayPermHost],
        providers: [{ provide: PermissionsService, useValue: permsSvc }],
      });
      fixture = TestBed.createComponent(ArrayPermHost);
      fixture.detectChanges();
    }

    it('hides when user has none of the permissions', () => {
      setup([]);
      expect(fixture.debugElement.query(By.css('span'))).toBeNull();
    });

    it('shows when user has the first permission in the list', () => {
      setup(['ticket_edit']);
      expect(fixture.debugElement.query(By.css('span'))).not.toBeNull();
    });

    it('shows when user has the second permission in the list', () => {
      setup(['tickets_edit']);
      expect(fixture.debugElement.query(By.css('span'))).not.toBeNull();
    });

    it('shows when user has both permissions', () => {
      setup(['ticket_edit', 'tickets_edit']);
      expect(fixture.debugElement.query(By.css('span'))).not.toBeNull();
    });

    it('reacts when a matching permission is added later', fakeAsync(() => {
      setup([]);
      permsSvc._perms.set(['tickets_edit']);
      tick();
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('span'))).not.toBeNull();
    }));
  });

  // ── Edge cases ─────────────────────────────────────────────────
  describe('edge cases', () => {
    it('shows nothing when permission list is empty array', () => {
      @Component({
        standalone: true,
        imports: [HasPermissionDirective],
        template: `<span *ifHasPermission="[]">VISIBLE</span>`,
      })
      class EmptyArrayHost {}

      permsSvc = makePermsSvc(['ticket_edit']);
      TestBed.configureTestingModule({
        imports: [EmptyArrayHost],
        providers: [{ provide: PermissionsService, useValue: permsSvc }],
      });
      const f = TestBed.createComponent(EmptyArrayHost);
      f.detectChanges();
      expect(f.debugElement.query(By.css('span'))).toBeNull();
    });

    it('clears view on clearPermissions()', fakeAsync(() => {
      @Component({
        standalone: true,
        imports: [HasPermissionDirective],
        template: `<span *ifHasPermission="'ticket_view'">VISIBLE</span>`,
      })
      class ClearHost {}

      const svc = makePermsSvc(['ticket_view']);
      TestBed.configureTestingModule({
        imports: [ClearHost],
        providers: [{ provide: PermissionsService, useValue: svc }],
      });
      const f = TestBed.createComponent(ClearHost);
      f.detectChanges();
      expect(f.debugElement.query(By.css('span'))).not.toBeNull();

      svc._perms.set([]);   // simulates clearPermissions
      tick();
      f.detectChanges();
      expect(f.debugElement.query(By.css('span'))).toBeNull();
    }));
  });
});
