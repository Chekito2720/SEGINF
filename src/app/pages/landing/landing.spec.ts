import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LandingComponent } from './landing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('LandingComponent', () => {
  let component: LandingComponent;
  let fixture: ComponentFixture<LandingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingComponent, RouterTestingModule, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have 3 features', () => {
    expect(component.features.length).toBe(3);
  });

  it('each feature should have icon, title and description', () => {
    component.features.forEach(f => {
      expect(f.icon).toBeTruthy();
      expect(f.title).toBeTruthy();
      expect(f.description).toBeTruthy();
    });
  });

  it('scrolled signal should start as false', () => {
    expect(component.scrolled()).toBeFalsy();
  });
});