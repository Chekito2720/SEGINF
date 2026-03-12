import {
  Directive, Input, OnChanges, SimpleChanges,
  TemplateRef, ViewContainerRef,
  inject, effect, EffectRef, Injector, runInInjectionContext,
} from '@angular/core';
import { Permission }         from '../models/Auth.model';
import { PermissionsService } from '../Services/Permissions.service';

@Directive({
  selector: '[ifHasPermission]',
  standalone: true,
})
export class HasPermissionDirective implements OnChanges {

  @Input('ifHasPermission') permission!: Permission | Permission[];

  private readonly permsSvc      = inject(PermissionsService);
  private readonly templateRef   = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly injector      = inject(Injector);

  private effectRef: EffectRef | null = null;
  private shown = false;

  // effect() se crea aquí — dentro del injection context del constructor
  constructor() {
    this.setupEffect();
  }

  // Si el @Input cambia en runtime (array dinámico), recrear el effect
  ngOnChanges(changes: SimpleChanges) {
    if (changes['permission'] && !changes['permission'].firstChange) {
      this.destroyEffect();
      this.setupEffect();
    }
  }

  private setupEffect() {
    // runInInjectionContext garantiza que effect() siempre tenga contexto,
    // incluso si setupEffect() se llama desde ngOnChanges
    this.effectRef = runInInjectionContext(this.injector, () =>
      effect(() => {
        const perms   = Array.isArray(this.permission) ? this.permission : [this.permission];
        const allowed = this.permsSvc.hasAnyPermission(perms);
        this.updateView(allowed);
      })
    );
  }

  private updateView(allowed: boolean) {
    if (allowed && !this.shown) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.shown = true;
    } else if (!allowed && this.shown) {
      this.viewContainer.clear();
      this.shown = false;
    }
  }

  private destroyEffect() {
    this.effectRef?.destroy();
    this.effectRef = null;
  }
}