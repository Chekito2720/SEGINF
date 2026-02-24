import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterComponent } from './register';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent, RouterTestingModule, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('form should be invalid when empty', () => {
    expect(component.form.invalid).toBe(true);
  });

  it('should detect password mismatch', () => {
    component.form.setValue({
      fullName: 'Sergio Bravo',
      username: 'sergio_bravo',
      email: 'sergio@email.com',
      address: 'Calle Ejemplo 123',
      password: 'password123',
      confirmPassword: 'diferente',
    });
    expect(component.form.errors?.['passwordMismatch']).toBe(true);
  });

  it('should be valid with matching passwords and all fields', () => {
    component.form.setValue({
      fullName: 'Sergio Bravo',
      username: 'sergio_bravo',
      email: 'sergio@email.com',
      address: 'Calle Ejemplo 123',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(component.form.valid).toBe(true);
  });
});