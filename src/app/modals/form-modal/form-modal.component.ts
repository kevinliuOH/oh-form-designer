import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'lfb-form-modal',
  templateUrl: './form-modal.component.html',
  styleUrl: './form-modal.component.css'
})
export class FormModalComponent {
  @Input()
  title: string;
  @Input()
  message: string;

  constructor(public activeModal: NgbActiveModal) {
  }
}
