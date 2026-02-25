import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterComponent } from './register';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;

  const validForm = {
    fullName: 'Sergio Bravo',
    username: 'sergio_bravo',
    email: 'sergio@email.com',
    phone: '50312345678',
    birthDate: '1995-06-15',
    address: 'Calle Ejemplo 123',
    password: 'Segura@1234',
    confirmPassword: 'Segura@1234',
  };

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

  it('should be valid with all correct fields', () => {
    component.form.setValue(validForm);
    expect(component.form.valid).toBe(true);
  });

  it('should reject weak password (no symbol)', () => {
    component.form.setValue({ ...validForm, password: 'Segura1234', confirmPassword: 'Segura1234' });
    expect(component.form.get('password')?.invalid).toBe(true);
  });

  it('should reject password shorter than 10 characters', () => {
    component.form.setValue({ ...validForm, password: 'Seg@1', confirmPassword: 'Seg@1' });
    expect(component.form.get('password')?.invalid).toBe(true);
  });

  it('should detect password mismatch', () => {
    component.form.setValue({ ...validForm, confirmPassword: 'Diferente@99' });
    expect(component.form.errors?.['passwordMismatch']).toBe(true);
  });

  it('should reject minor (under 18)', () => {
    const today = new Date();
    const minor = `${today.getFullYear() - 10}-01-01`;
    component.form.setValue({ ...validForm, birthDate: minor });
    expect(component.form.get('birthDate')?.errors?.['notAdult']).toBe(true);
  });

  it('should reject non-numeric phone', () => {
    component.form.setValue({ ...validForm, phone: 'abc123' });
    expect(component.form.get('phone')?.invalid).toBe(true);
  });

  it('should reject phone shorter than 8 digits', () => {
    component.form.setValue({ ...validForm, phone: '1234567' });
    expect(component.form.get('phone')?.invalid).toBe(true);
  });
});