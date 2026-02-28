import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserComponent } from './user';

describe('UserComponent', () => {
  let component: UserComponent;
  let fixture: ComponentFixture<UserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have user data defined', () => {
    expect(component.user.fullName).toBeTruthy();
    expect(component.user.email).toBeTruthy();
  });

  it('should have 6 fields', () => {
    expect(component.fields.length).toBe(6);
  });
});