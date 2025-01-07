import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttachmentFileSizeComponent } from './attachment-file-size.component';

describe('AttachmentFileSizeComponent', () => {
  let component: AttachmentFileSizeComponent;
  let fixture: ComponentFixture<AttachmentFileSizeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttachmentFileSizeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AttachmentFileSizeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
