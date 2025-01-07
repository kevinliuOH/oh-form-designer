import { Component } from '@angular/core';

@Component({
  selector: 'lfb-help-info',
  templateUrl: './help-info.component.html',
  styleUrl: './help-info.component.css'
})
export class HelpInfoComponent {

  expandedAll = false;

  toggleAllPanels(){
    this.expandedAll = !this.expandedAll;
  }
}
