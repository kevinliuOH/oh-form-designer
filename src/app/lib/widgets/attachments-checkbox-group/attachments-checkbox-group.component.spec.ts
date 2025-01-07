import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttachmentsCheckboxGroupComponent } from './attachments-checkbox-group.component';

describe('AttachmentsCheckboxGroupComponent', () => {
  let component: AttachmentsCheckboxGroupComponent;
  let fixture: ComponentFixture<AttachmentsCheckboxGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttachmentsCheckboxGroupComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AttachmentsCheckboxGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
