import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have 4 stat cards', () => {
    expect(component.stats.length).toBe(4);
  });

  it('should have 4 recent activity items', () => {
    expect(component.recentActivity.length).toBe(4);
  });

  it('each stat should have label, value, icon and color', () => {
    component.stats.forEach(s => {
      expect(s.label).toBeTruthy();
      expect(s.value).toBeTruthy();
      expect(s.icon).toBeTruthy();
      expect(s.color).toBeTruthy();
    });
  });
});