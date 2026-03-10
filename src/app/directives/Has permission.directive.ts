import { Directive, Input, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { Permission } from '../models/Auth.model';
import { PermissionsService } from '../Services/Permissions.service';

@Directive({
  selector: '[ifHasPermission]',
  standalone: true,
})
export class HasPermissionDirective implements OnInit {
  @Input('ifHasPermission') permission!: Permission | Permission[];

  constructor(
    private permsSvc:     PermissionsService,
    private templateRef:  TemplateRef<unknown>,
    private viewContainer: ViewContainerRef,
  ) {}

  ngOnInit() {
    const perms = Array.isArray(this.permission) ? this.permission : [this.permission];
    const allowed = this.permsSvc.hasAnyPermission(perms);

    this.viewContainer.clear();
    if (allowed) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}