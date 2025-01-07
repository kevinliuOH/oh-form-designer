import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { LoginService, UserProfile } from '../services/login.service';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import appVersion from '../../assets/version.json';
import { environment } from '../../environments/environment';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ContactUsComponent } from '../modals/contact-us/contact-us.component';
import { MatTooltipModule } from '@angular/material/tooltip';
@Component({
  selector: 'lfb-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {

  userProfile: UserProfile = {};
  isUserSignedIn = false;
  @Input()
  isFirebaseEnabled = false;
  @Output() isHelpInfoNeed = new EventEmitter<boolean>();
  loginError: any = null;
  appVersion: string;
  env: string = '';
  isProduction: boolean = false;
  constructor(private loginService: LoginService,
              private iconRegistry: MatIconRegistry,
              private sanitizer: DomSanitizer,
              private modal: NgbModal) {
    // Register our icon(s)
    this.iconRegistry.addSvgIcon('home',
      this.sanitizer.bypassSecurityTrustResourceUrl('../../assets/images/OH_Eng_Pos_RGB.svg'));
  }


  /**
   * Initialize login service
   */
  ngOnInit(): void {
    if(appVersion?.version) {
      this.appVersion = appVersion.version;
    }
    this.env= environment.env;  // Assign environment name
    this.isProduction = environment.production;
    this.loginService.service().subscribe((loginEvent) => {
      if (loginEvent.event === 'signedIn') {
        this.userProfile = loginEvent.userProfile;
        this.isUserSignedIn = true;
      } else if (loginEvent.event === 'signedOut') {
        this.userProfile = {};
        this.isUserSignedIn = false;
      }
    });
  }


  /**
   * Logout
   */
  signOut() {
    this.loginService.logOut(this.userProfile);
  }

  showSignInDialog() {

  }

  getHelpInfo(){
    this.isHelpInfoNeed.emit(true);
  }

  getContactUs(){
    const modalRef = this.modal.open(ContactUsComponent);
    const rawHtml = 'For any issues or enquiries, please send an email to <a href="mailto:eformsdesigner@ontariohealth.ca">eformsdesigner&#64;ontariohealth.ca</a>.';
    modalRef.componentInstance.title = 'Contact Us';
    modalRef.componentInstance.message = rawHtml;
    return false;
  }
}
