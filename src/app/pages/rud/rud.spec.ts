import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RudComponent } from './rud';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';

describe('RudComponent', () => {
  let component: RudComponent;
  let fixture: ComponentFixture<RudComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RudComponent, NoopAnimationsModule, RouterTestingModule],
    }).compileComponents();
    fixture = TestBed.createComponent(RudComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());

  it('should start not deleted', () => expect(component.deleted()).toBeFalsy());

  it('should update user on saveEdit', () => {
    component.openEdit();
    component.editForm.fullName = 'Nombre Nuevo';
    component.saveEdit();
    expect(component.user().fullName).toBe('Nombre Nuevo');
  });

  it('should mark as deleted on deleteUser', () => {
    component.deleteUser();
    expect(component.deleted()).toBe(true);
  });

  it('should have 6 fields', () => expect(component.fields.length).toBe(6));
});