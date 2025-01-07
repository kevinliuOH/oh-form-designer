import { Component, OnInit } from '@angular/core';
import {NgbDatepickerConfig} from '@ng-bootstrap/ng-bootstrap';
import { MsalBroadcastService, MsalService } from "@azure/msal-angular";
import { EventMessage, EventType } from "@azure/msal-browser";

@Component({
  selector: 'lfb-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'formbuilder-lhcforms';
  loginError: string | null = null;

  constructor(private dateConfig: NgbDatepickerConfig,
              private msalService: MsalService,
              private msalBroadcastService: MsalBroadcastService) {
    const today = new Date();
    dateConfig.minDate = {year: today.getUTCFullYear() - 100, month: today.getUTCMonth()+1, day: today.getUTCDate()};
    dateConfig.maxDate = {year: today.getUTCFullYear() + 100, month: today.getUTCMonth()+1, day: today.getUTCDate()};
  }

  ngOnInit(): void {
    this.msalBroadcastService.msalSubject$.subscribe((message: EventMessage) => {
      if (message.eventType === EventType.LOGIN_FAILURE) {
        this.loginError = 'Login failed. Please try again.';
      }
    });
  }

  logout() {
    this.msalService.logoutRedirect();
  }

  getUserProfile() {
    return this.msalService.instance.getActiveAccount();
  }
}
