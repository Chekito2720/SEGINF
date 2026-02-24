import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent, RouterTestingModule, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('form should be invalid when empty', () => {
    expect(component.form.invalid).toBe(true);
  });

  it('should be valid with email and password', () => {
    component.form.setValue({ email: 'admin@miapp.com', password: 'Admin@12345' });
    expect(component.form.valid).toBe(true);
  });

  it('should be invalid with bad email format', () => {
    component.form.setValue({ email: 'no-es-un-email', password: 'Admin@12345' });
    expect(component.form.get('email')?.invalid).toBe(true);
  });

  it('errorMessage should start empty', () => {
    expect(component.errorMessage()).toBe('');
  });

  it('loading should start false', () => {
    expect(component.loading()).toBe(false);
  });
});