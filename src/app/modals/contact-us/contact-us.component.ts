import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'lfb-contact-us',
  standalone: true,
  imports: [],
  templateUrl: './contact-us.component.html',
  styles: [` `]
})
export class ContactUsComponent {
  @Input()
  title: string;
  @Input()
  message: string;
  @Input()
  messages: string[];
  @Input()
  options?: any;


  constructor(public activeModal: NgbActiveModal) {}

  openEmail() {
    
    const mailtoLink = `mailto:eformsdesigner@ontariohealth.ca`;
    console.info("Mail to Link: ",mailtoLink); 
    window.location.href = mailtoLink;
    this.activeModal.close(true);
  }
     
}
