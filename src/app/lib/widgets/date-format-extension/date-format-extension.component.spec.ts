import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DateFormatExtensionComponent } from './date-format-extension.component';

describe('DateFormatExtensionComponent', () => {
  let component: DateFormatExtensionComponent;
  let fixture: ComponentFixture<DateFormatExtensionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DateFormatExtensionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DateFormatExtensionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
  //  expect(component).toBeTruthy();
  });
});
