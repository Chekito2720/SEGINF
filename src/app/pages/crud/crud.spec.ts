import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrudComponent } from './crud';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('CrudComponent', () => {
  let component: CrudComponent;
  let fixture: ComponentFixture<CrudComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrudComponent, NoopAnimationsModule],
    }).compileComponents();
    fixture = TestBed.createComponent(CrudComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());

  it('should start with 3 groups', () => expect(component.groups().length).toBe(3));

  it('should add a group', () => {
    component.form = { nivel: 'Básico', autor: 'Test', nombre: 'Delta', integrantes: 2, tickets: 1, descripcion: '' };
    component.isEditing.set(false);
    component.saveGroup();
    expect(component.groups().length).toBe(4);
  });

  it('should delete a group', () => {
    component.deleteGroup(1);
    expect(component.groups().length).toBe(2);
  });

  it('should edit a group', () => {
    const group = component.groups()[0];
    component.openEdit(group);
    component.form.nombre = 'Editado';
    component.saveGroup();
    expect(component.groups()[0].nombre).toBe('Editado');
  });
});