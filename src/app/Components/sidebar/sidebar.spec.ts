import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SidebarComponent } from './sidebar';
import { RouterTestingModule } from '@angular/router/testing';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start expanded', () => {
    expect(component.collapsed()).toBeFalsy();
  });

  it('should collapse when toggle is called', () => {
    component.toggle();
    expect(component.collapsed()).toBe(true);
  });

  it('should expand again after two toggles', () => {
    component.toggle();
    component.toggle();
    expect(component.collapsed()).toBeFalsy();
  });

  it('should have 5 nav items', () => {
    expect(component.navItems.length).toBe(5);
  });
});