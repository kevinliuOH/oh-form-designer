import { Component, ElementRef, EventEmitter, Input, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import { FormService } from '../services/form.service';
import fhir from 'fhir/r4';
import { BehaviorSubject, from, Observable, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, switchMap, takeUntil } from 'rxjs/operators';
import { MessageDlgComponent, MessageType } from '../lib/widgets/message-dlg/message-dlg.component';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AutoCompleteResult } from '../lib/widgets/auto-complete/auto-complete.component';
import { FetchService } from '../services/fetch.service';
import { FhirService } from '../services/fhir.service';
import { FhirServersDlgComponent } from '../lib/widgets/fhir-servers-dlg/fhir-servers-dlg.component';
import { FhirSearchDlgComponent } from '../lib/widgets/fhir-search-dlg/fhir-search-dlg.component';
import { PreviewDlgComponent } from '../lib/widgets/preview-dlg/preview-dlg.component';
import { AppJsonPipe } from '../lib/pipes/app-json.pipe';
import { GuidingStep, Util } from '../lib/util';
import { MatDialog } from '@angular/material/dialog';
import { FhirExportDlgComponent } from '../lib/widgets/fhir-export-dlg/fhir-export-dlg.component';
import { SharedObjectService } from '../services/shared-object.service';
import { FormItem, FormStatus, StorageService } from "../services/storage.service";
import { StatusEnum } from "../form-list/form-list.component";
import { ToasterService } from "../services/toaster.service";
import { FormModalComponent } from "../modals/form-modal/form-modal.component";
import { ActivatedRoute, ActivatedRouteSnapshot } from "@angular/router";
import { Roles } from "../lib/constants";
import {
  ExpressionCompilerFactory,
  FormProperty,
  FormPropertyFactory, LogService,
  PropertyBindingRegistry,
  SchemaValidatorFactory,
  ValidatorRegistry
} from "@lhncbc/ngx-schema-form";
import { root } from "postcss";
type ExportType = 'CREATE' | 'UPDATE';
export function useFactory(schemaValidatorFactory, validatorRegistry, propertyBindingRegistry, expressionCompilerFactory, logService) {
  return new FormPropertyFactory(schemaValidatorFactory, validatorRegistry, propertyBindingRegistry, expressionCompilerFactory, logService);
}
@Component({
  selector: 'lfb-base-page',
  templateUrl: './base-page.component.html',
  styleUrls: ['./base-page.component.css'],
  providers: [
    NgbActiveModal,
    ValidatorRegistry,
    PropertyBindingRegistry,
    {
      provide: FormPropertyFactory,
      useFactory: useFactory,
      deps: [SchemaValidatorFactory, ValidatorRegistry, PropertyBindingRegistry, ExpressionCompilerFactory, LogService]
    },
  ]
})
export class BasePageComponent implements OnInit {
  protected readonly StatusEnum = StatusEnum;
  private unsubscribe = new Subject<void>();
  @Input()
  guidingStep: GuidingStep = 'home'; // 'choose-start', 'home', 'item-editor'
  startOption = 'scratch';
  importOption = '';
  questionnaire: fhir.Questionnaire = null;
  formFields: fhir.Questionnaire = null;
  formValue: fhir.Questionnaire;
  formSubject = new Subject<fhir.Questionnaire>();
  @Output()
  state = new EventEmitter<string>();
  isHelpInfoDisplay: boolean = false;
  objectUrl: any;
  acResult: AutoCompleteResult = null;
  @ViewChild('fileInput') fileInputEl: ElementRef;
  @ViewChild('loincSearchDlg') loincSearchDlg: TemplateRef<any>;
  @ViewChild('warnFormLoading') warnFormLoadingDlg: TemplateRef<any>;
  @ViewChild('confirmCancel') cancelDlg: TemplateRef<any>;
  acceptedTermsOfUse = false;
  acceptedSnomed = false;
  lformsErrorMessage = null;
  // Accepted terms in localstorage expires in a week.
  weekInMilliseconds = 7 * 24 * 60 * 60 * 1000;
  canceledEvent = false;
  titleAriaLabel;

  formItem?: FormItem;
  spinner$ = new BehaviorSubject<boolean>(false);
  roles?: Roles[];

  get isApprover() {
    return this.roles?.includes(Roles.APPROVER);
  }

  get isBuilder() {
    return this.roles?.includes(Roles.BUILDER);
  }

  constructor(private formService: FormService,
              private modelService: SharedObjectService,
              private modalService: NgbModal,
              private formPropertyFactory: FormPropertyFactory,
              private dataSrv: FetchService,
              public fhirService: FhirService,
              public storageService: StorageService,
              private appJsonPipe: AppJsonPipe,
              private toasterService: ToasterService,
              private matDlg: MatDialog,
              private route: ActivatedRoute
              ) {
    this.acResult = null;
    const isAutoSaved = this.formService.isAutoSaved();
    if(isAutoSaved && !this.isDefaultForm()) {
      this.startOption = 'from_autosave';
    }

    // const localStorageTerms = JSON.parse(localStorage.getItem("acceptedTermsOfUse"));
    // if (localStorageTerms) {
    //   const acceptedTermsExpired = Date.now() - localStorageTerms.timestamp > this.weekInMilliseconds;
    //   if (acceptedTermsExpired) {
    //     localStorage.removeItem("acceptedTermsOfUse");
    //   } else {
    //     this.acceptedTermsOfUse = localStorageTerms.acceptedLoinc;
    //     this.acceptedSnomed = localStorageTerms.acceptedSnomed;
    //   }
    // } else {
    //   this.acceptedTermsOfUse = sessionStorage.acceptedLoinc === 'true';
    //   this.acceptedSnomed = sessionStorage.acceptedSnomed === 'true';
    // }
    this.formService.setSnomedUser(this.acceptedSnomed);

    this.formSubject.asObservable().pipe(
      debounceTime(500),
      switchMap((fhirQ) => {
        this.formService.autoSaveForm(Util.convertToQuestionnaireJSON(fhirQ));
        return of(fhirQ);
      }),
      takeUntil(this.unsubscribe)
    ).subscribe(() => {
      console.log('Saved');
    });

    formService.guidingStep$.subscribe((step: GuidingStep) => {this.guidingStep = step;});
    FormService.lformsLoaded$.subscribe({error: (error) => {
      this.lformsErrorMessage = `Encountered an error which causes the application not to work properly. Root cause is: ${error.message}`;
    }});
  }

  ngOnInit() {
    // @ts-ignore
    if(window.Cypress) {
      // @ts-ignore
      window.basePageComponent = this;
    }
    // if(!this.acceptedTermsOfUse) {
    //   this.modalService.open(
    //     LoincNoticeComponent,{size: 'lg', container: 'body > lfb-root', keyboard: false, backdrop: 'static'}
    //   ).result
    //     .then(
    //       (result) => {
    //         this.acceptedTermsOfUse = result.acceptedLoinc;
    //         if (result.acceptedLoinc && result.acceptedSnomed) {
    //           localStorage.setItem('acceptedTermsOfUse', JSON.stringify({
    //             acceptedLoinc: result.acceptedLoinc,
    //             acceptedSnomed: result.acceptedSnomed,
    //             timestamp: Date.now()
    //           }));
    //         } else {
    //           sessionStorage.acceptedLoinc = result.acceptedLoinc;
    //           sessionStorage.acceptedSnomed = result.acceptedSnomed;
    //         }
    //         this.formService.setSnomedUser(result.acceptedSnomed);
    //       },
    //       (reason) => {
    //         console.error(reason);
    //       });
    // }

    if(window.opener) {
      this.formService.windowOpenerUrl = this.parseOpenerUrl(window.location);
    }
    this.addWindowListeners();
    this.roles = this.route.snapshot.data?.roles;
  }


/**
 * Parse location object for url of window.opener.
 * window.location.href is expected to have url path of the form
 * '/window-open?referrer=[openerUrl], where <code>openerUrl</code> is location.href
 * of the parent window (window.opener). If the referrer parameter is missing,
 * it reads referrer or origin header for the url.
 *
 * @param location - Window location object
 * @returns string - window.opener url.
 */
  private parseOpenerUrl(location: Location): string {
    let ret = null;
    const pathname = location?.pathname.replace(/^\/+/, '').toLowerCase();
    if(pathname === 'window-open') {
      const params = new URLSearchParams(location.search);
      ret = params.get('referrer');
    }
    return ret;
  }

  /**
   * getter for url of the window.opener
   */
  get openerUrl(): string {
    return this.formService.windowOpenerUrl;
  }

  /**
   * Add window listeners, mainly to handle messaging with other browser windows.
   */
  addWindowListeners() {
    if (this.openerUrl) {
      const msgListener = (event) => {
        let message = null;
        try {
          message = JSON.parse(JSON.stringify(event.data)); // Sanitize input.
        } catch (e) {
          console.error(`Unrecognized input from ${event.origin}`);
          return;
        }
        const parentUrl = this.formService.windowOpenerUrl;
        if(!parentUrl.startsWith(event.origin)) {
          return;
        }
        switch (message?.type) {
          case 'initialQuestionnaire':
            try {
              console.log(`Received questionnaire from ${parentUrl}`);
              this.setQuestionnaire(JSON.parse(JSON.stringify(message.questionnaire)));
              this.setStep('fl-editor');
            }
            catch(err) {
              console.error(`Failed to parse questionnaire received from ${parentUrl}: ${err}`);
            }
            break;

          default:
            console.log(`Received a message from ${parentUrl}: type = ${message?.type}`);
            break;
        }
      }
      window.addEventListener('message', msgListener);
      window.addEventListener('beforeunload', (event) => {

        const messageObj: any = {};
        if(this.canceledEvent) {
          messageObj.type = 'canceled';
        } else {
          messageObj.type = 'closed';
          messageObj.questionnaire = Util.convertToQuestionnaireJSON(this.formValue);
        }
        window.opener.postMessage(messageObj, this.openerUrl);
      });

      window.opener.postMessage({type: 'initialized'}, this.openerUrl);
    }
  }

  /**
   * Notify changes to form.
   * @param form - form object, a.k.a. questionnaire
   */
  notifyChange(form) {
    this.formSubject.next(form);
  }


  /**
   * Handle value changes in form-fields component.
   * @param formChanges - questionnaire (Form level copy)
   */
  formFieldsChanged(formChanges) {
    [this.formValue, this.questionnaire, this.formFields].forEach((obj) => {
      const itemsArray = obj.item; // Save item to append it at the bottom.
      for (const key of Object.keys(obj)) {
        delete obj[key];
      }
      Object.assign(obj, formChanges);
      obj.item = itemsArray;
    });
    this.notifyChange(this.formValue);
  }


  /**
   * Handle value changes in item-component.
   * @param itemList - Emits item list. Form level fields should be untouched.
   */
  itemComponentChanged(itemList) {
    this.formValue.item = itemList;
    this.notifyChange(this.formValue);
  }


  /**
   * Set questionnaire.
   * Make
   * @param questionnaire - Input FHIR questionnaire
   */
  setQuestionnaire(questionnaire) {
    this.questionnaire = questionnaire;
    if (!questionnaire.id) {
      this.questionnaire.id = Util.createUUID();
    }
    if (!this.questionnaire.url) {
        this.questionnaire.url = `urn:uuid:${this.questionnaire.id}`;
    }

    this.modelService.questionnaire = this.questionnaire;
    this.formValue = Object.assign({}, questionnaire);
    this.formFields = Object.assign({}, questionnaire);
    delete this.formFields.item;
    this.notifyChange(this.formValue);
  }

  /**
   * Set the fields to questionnaire and invoke change detection on child components.
   * @param fieldsObj - Object with new fields.
   */
  setFieldsAndInvokeChangeDetection(fieldsObj: any) {
    // Set the fields to a shallow copy of the questionnaire to invoke change detection on <sf-form>
    const q = Object.assign({}, this.questionnaire);
    Object.keys(fieldsObj).forEach((f) => {
      q[f] = fieldsObj[f];
    });
    this.setQuestionnaire(q);
  }

  /**
   * Switch guiding step
   * @param step - a
   */
  setStep(step: GuidingStep) {
    this.formService.setGuidingStep(step);
    this.formService.autoSave('state', step);
  }

  /**
   * Check auto save status
   */
  isAutoSaved() {
    return this.formService.isAutoSaved();
  }
  /**
   * Handle continue button.
   */
  onContinue() {
    if(this.startOption === 'from_autosave') {
      let state = this.formService.autoLoad('state');
      state = Util.isGuidingStep(state) ? state : 'fl-editor';
      state = state === 'home' ? 'fl-editor' : state;
      this.formService.setGuidingStep(state);
      this.setQuestionnaire(this.formService.autoLoadForm());
      this.formItem = {
        status: FormStatus.Draft,
        questionnaire: this.questionnaire
      };
    }
    else if (this.startOption === 'scratch') {
      this.setStep('fl-editor');
      this.setQuestionnaire(Util.createDefaultForm());
    }
    else if (this.importOption === 'local') {
      this.fileInputEl.nativeElement.click();
    }
    else if (this.importOption === 'server') {
      this.setStep('list');
    }
  }

  /**
   * Remove subscriptions before removing the component.
   */
  ngOnDestroy() {
    this.unsubscribe.next();
  }

/////////////////////////////////////////

  /**
   * Set guiding to step to switch the page.
   */
  /*
  setGuidingStep(step: string) {
    // this.guidingStep = step;
    this.formService.autoSave('state', step);
  }
*/
  /**
   * Select form from local file system. Copied from current form builder.
   *
   * @param event - Object having selected file from the browser file dialog.
   */
  onFileSelected(event) {
    const loadFromFile = () => {
      const file = event.target.files[0];
      const selectedFile = Util.validateFile(file);

      if(!selectedFile) {
        this.showError(`Invalid file name: ${file?.name}`);
        return;
      }

      event.target.value = null; //
      const fileReader = new FileReader();
      fileReader.onload = () => {
        setTimeout(() => {
          this.setStep('fl-editor');
          try {
            const questionnaire = this.formService.parseQuestionnaire(fileReader.result as string);
            this.loadQuestionnaire({
              name: questionnaire.title,
              status: FormStatus.Draft,
              questionnaire
            });
          }
          catch (e) {
            this.showError(`${e.message}: ${selectedFile.name}`);
          }
        });
      }
      fileReader.onerror = () => {
        this.showError(`Error occurred reading file: ${selectedFile.name}`);
      }

      fileReader.readAsText(selectedFile, 'UTF-8');
    };

    if(this.questionnaire) {
      this.warnFormLoading(() => {
        loadFromFile();
      }, );
    }
    else {
      loadFromFile();
    }
  }

  showError(error: any) {
    this.formService.showMessage('Error', error.message || error, MessageType.DANGER);
  }

  /**
   * View preview of lforms widget and questionnaire json
   */
  showPreviewDlg() {
    // configure lforms template options
    const lformsTemplateOptions = {
      options: {
        displayScoreWithAnswerText: false, // Not show scores
        hideTreeLine: true,
        hideIndentation: true,
        allowHTML: true
      },
      allowHTML: true
    };
    this.formItem = this.formItem || {};
    this.formItem.questionnaire = this.formValue;
    this.matDlg.open(PreviewDlgComponent,
      {
        data: {
          roles: this.roles,
          questionnaire: Util.convertToQuestionnaireJSON(this.formValue),
          lfData: lformsTemplateOptions,
          formItem: this.formItem,
          onPublish: this.publish.bind(this),
          onSave: this.save.bind(this)
        },
        width: '80vw',
        height: '80vh'
      }
    );
  }

  /**
   * Format result item for auto complete.
   * @param acResult - Result item.
   */
  formatter(acResult: any) {
    return acResult.id + ': ' + acResult.title;
  }

  /**
   * Save form to local file, mostly copied from current form builder.
   * @exportVersion - One of the defined version types: 'STU3' || 'R4' || 'R5'
   * 'R4' is assumed if not specified.
   */
  saveToFile(exportVersion = 'R4') {
    const questionnaire = this.formService.convertFromR4(Util.convertToQuestionnaireJSON(this.formValue), exportVersion);
    const content = this.toString(questionnaire);
    const blob = new Blob([content], {type: 'application/json;charset=utf-8'});
    const formName = questionnaire.title;
    const formShortName = questionnaire.name;
    const exportFileName = formShortName ?
      formShortName.replace(/\s/g, '-') :
      (formName ? formName.replace(/\s/g, '-') : 'form');

    // Use hidden anchor to do file download.
    // const downloadLink: HTMLAnchorElement = document.createElement('a');
    const downloadLink = document.getElementById('exportAnchor');
    const urlFactory = (URL || webkitURL);
    if(this.objectUrl != null) {
      // First release any resources on existing object url
      urlFactory.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    this.objectUrl = urlFactory.createObjectURL(blob);
    downloadLink.setAttribute('href', this.objectUrl);
    downloadLink.setAttribute('download', exportFileName + '.'+exportVersion+'.json');
    // Avoid using downloadLink.click(), which will display down content in the browser.
    downloadLink.dispatchEvent(new MouseEvent('click'));
  }


  startSpinner() {
    setTimeout(() => this.spinner$.next(true));
  }

  stopSpinner() {
    setTimeout(() => this.spinner$.next(false));
  }
  /**
   * Call back to auto complete search.
   * @param term$ - Search term
   */
  acSearch = (term$: Observable<string>): Observable<AutoCompleteResult []> => {
    return term$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      switchMap((term) => term.length < 2 ? [] : this.dataSrv.searchLoincForms(term)));
  }

  /**
   * Get LOINC form in questionnaire format using LOINC number.
   * @param LOINCNumber - LOINC number of the form to fetch. If empty, return empty questionnaire.
   */
  getLoincForm(LOINCNumber: string) {
    const func = () => {
      if (!LOINCNumber) {
        this.setQuestionnaire(Util.createDefaultForm());
      } else {
        this.dataSrv.getLoincFormData(LOINCNumber).subscribe((data) => {
          this.setQuestionnaire(data);
          this.acResult = null;
        });
      }
    };

    if(this.questionnaire) {
      this.warnFormLoading((load) => {
        if(load) {
          func();
        }
        this.acResult = null;
      }, () => {
        this.acResult = null;
      });
    }
    else {
      func();
    }
  }

  /**
   * Change button text based on context
   */
  createButtonLabel(): string {
    let ret = 'Create questions';
    if(this.questionnaire && this.questionnaire.item && this.questionnaire.item.length > 0) {
      ret = 'Edit questions'
    }
    return ret;
  }


  /**
   * Close menu handler.
   */
  close(currentStep: string) {
    if(this.openerUrl) {
      this.canceledEvent = false;
      window.close();
    }
    else {
      this.setStep(currentStep === 'list' ? 'home' : 'list');
      if(!this.isDefaultForm()) {
        this.startOption = 'from_autosave';
      }
    }
  }

  /**
   * Cancel event handler.
   *
   * The Cancel button is visible when using window.open() API.
   */
  cancel() {
    if(this.openerUrl) {
      this.modalService.open(this.cancelDlg).result.then((result) => {
        if(result) {
          this.canceledEvent = true;
          window.close();
        }
      });
    }
  }

  /**
   * Import FHIR server menu handler.
   */
  importFromFHIRServer() {
    this.modalService.open(FhirServersDlgComponent, {size: 'lg'}).result.then((result) => {
      if(result) { // Server picked, invoke search dialog.
        this.modalService.open(FhirSearchDlgComponent, {size: 'lg', scrollable: true}).result.then((selected) => {
          if(selected !== false) { // Questionnaire picked, get the item from the server.
            this.warnFormLoading((load: boolean) => {
              if(load) {
                this.fhirService.read(selected).subscribe((resp)=>{
                  this.setQuestionnaire(resp);
                });
              }
            });
          }
        });
      }
    }, (reason) => {
      console.error(reason);
    });
  }

  /**
   * Fetch form from FHIR server invoking dialogs for server selection and search for forms.
   */
  fetchFormFromFHIRServer$(): Observable<any> {
    return from(this.modalService.open(FhirServersDlgComponent, {size: 'lg'}).result)
      .pipe(switchMap((result) => {
        if(result) {
          return from(this.modalService.open(FhirSearchDlgComponent, {size: 'lg', scrollable: true}).result);
        }
        else {
          return of(false);
        }
      }), switchMap((selected) => {
        if(selected !== false) {
          return this.fhirService.read(selected);
        }
        else {
          return of(null);
        }
      }));
  }


  /**
   * Create/Update questionnaire on the FHIR server.
   * @param type - 'CREATE' | 'UPDATE'
   */
  exportToServer(type: ExportType) {
    let observer: Observable<any>;
    if(type === 'CREATE') {
      this.modalService.open(FhirServersDlgComponent, {size: 'lg'}).result.then((result) => {
        if (result) { // Server picked, invoke search dialog.
          observer = this.fhirService.create(Util.convertToQuestionnaireJSON(this.formValue), null);
          this.handleServerResponse(observer);
        }
      }, (reason) => {
        console.error(reason);
      });
    }
    else if(type === 'UPDATE') {
      observer = this.fhirService.update(Util.convertToQuestionnaireJSON(this.formValue), null);
      this.handleServerResponse(observer);
    }
  }


  /**
   * Handle FHIR server response after create/update.
   * @param serverResponse - An observable yielding fhir resource.
   */
  handleServerResponse(serverResponse: Observable<fhir.Resource>) {
    serverResponse.pipe(
      catchError((err) => {
        console.error(err.message);
        return of(err);
      }),
      finalize(() => {
      })
    )
      .subscribe((response) => {
        const modalRef = this.modalService.open(FhirExportDlgComponent, {size: 'lg', scrollable: true});
        if(response instanceof Error) {
          modalRef.componentInstance.error = response;
          modalRef.componentInstance.serverResponse = null;
        }
        else {
          this.setFieldsAndInvokeChangeDetection({id: response.id});
          modalRef.componentInstance.error = null;
          modalRef.componentInstance.serverResponse = response;
        }
      });
  }


  /**
   * Transform questionnaire model to FHIR compliant questionnaire in string format.
   *
   * The questionnaire, although mostly a FHIR questionnaire object, has some internal fields for processing.
   * Get a fully compliant FHIR questionnaire in string format.
   *
   * @param questionnaire - Questionnaire model is in the form builder.
   */
  toString(questionnaire: fhir.Questionnaire): string {
    return this.appJsonPipe.transform(questionnaire);
  }

  /**
   * Show warning dialog when overwriting existing form.
   * @param loadFn - Callback method after user clicks continue button.
   * @param cancelFn - Callback method after user clicks cancel button.
   */
  warnFormLoading(loadFn, cancelFn?) {
    if(Util.isDefaultForm(this.questionnaire)) {
      loadFn(true);
    }
    else {
      this.modalService.open(this.warnFormLoadingDlg, {size: 'lg', scrollable: true}).result.then((result) => {
        loadFn(result);
      }, (reason) => {
        if(cancelFn) {
          cancelFn(reason);
        }
      });
    }
  }

  /**
   * Compare if a stored form is equal to default form.
   */
  isDefaultForm(): boolean {
    const storedQ = this.formService.autoLoadForm();
    if(storedQ) {
      storedQ.item = storedQ.item || [];
    }
    return Util.isDefaultForm(storedQ);
  }
  loadQuestionnaire(form: FormItem) {
    this.setQuestionnaire(form.questionnaire);
    this.formItem = form;
    this.setStep('fl-editor');
  }
  async save() {
    this.startSpinner();
    this.formItem = this.formItem || {};
    this.formItem.questionnaire = this.formValue;
    try {
      await this.storageService.save(this.formItem);
      this.setQuestionnaire(this.formValue);
      this.stopSpinner();
    } catch (err) {
      this.stopSpinner();
      if (err !== 'ignore') {
        this.toasterService.showMessage('Unable to update the form, please try again later', 'danger');
      }
      return;
    }
  }

  private validateCode() {
    if (!this.formValue.code || !this.formValue.code.length) {
      return 'Forms cannot be published without Codes – please include code(s)';
    }
    if (this.formValue.code.some(code => !code.code || !code.system)) {
      return 'Both Code and System fields must be populated';
    }
    return null;
  }

  private validatePublisher() {
    if (!this.formValue.publisher) {
      return 'A value must be entered in for the template’s Publisher';
    }
    return null;
  }
  private validatePublish() {
    const messages: string[] = [];
    messages.push(this.validateCode());
    messages.push(this.validatePublisher());
    const errors = messages.filter(msg => !!msg);
    if (errors.length) {
      const modalRef = this.modalService.open(MessageDlgComponent);
      modalRef.componentInstance.title = 'Error';
      modalRef.componentInstance.messages = errors;
      modalRef.componentInstance.type = MessageType.DANGER;
      this.setStep('fl-editor');
      return false;
    }
    return true;
  }
  publish() {
    if (!this.validatePublish()) {
      return;
    }

    this.formItem = this.formItem || {};
    this.formItem.questionnaire = this.formValue;

    const modalRef = this.modalService.open(FormModalComponent);
    modalRef.componentInstance.title = 'Confirmation';
    modalRef.componentInstance.message = `Are you sure you wish to publish ${this.formItem.questionnaire.title}?`;
    modalRef.componentInstance.type = MessageType.WARNING;
    modalRef.componentInstance.confirmed = true;
    modalRef.result.then(
      async (result) => {
        if (result) {
          try {
            this.startSpinner();
            await this.storageService.publish(this.formItem);
            this.toasterService.showMessage(`${this.formItem.questionnaire.title} has been published`);
            this.stopSpinner();
            this.setQuestionnaire(this.formItem.questionnaire);
          } catch {
            this.stopSpinner();
            this.toasterService.showMessage('Unable to publish the form, please try again later', 'danger');
          }
        }
      });
  }

  //Not used and incomplete, need to find a way to set rootProperty value
  validate() {
    const rootProperty = this.formPropertyFactory.createProperty(this.formService.getItemSchema());
    const validators = {
      '/enableWhen': Util.validateEnableWhenAll.bind(this),
      '/enableWhen/*': Util.validateEnableWhenSingle.bind(this)
    };
    if (validators) {
      for (const validatorId in validators) {
        rootProperty['validatorRegistry'].register(validatorId, validators[validatorId]);
      }
    }
    const errors = [];
    this.validateItem(rootProperty, this.questionnaire.item, errors);
    if (errors.length) {
      const messages: string[] = errors.reduce((msgs, curr) => {
        const details = curr.errors.map(err => err.message);
        details.forEach(err => msgs.push(`${curr.path}: ${err}`));
        return msgs;
      }, []);
      const modalRef = this.modalService.open(MessageDlgComponent);
      modalRef.componentInstance.title = 'Error';
      modalRef.componentInstance.message = `There are errors in items:
          ${messages.join(';')}
        `;
      modalRef.componentInstance.type = MessageType.DANGER;
      this.setStep('fl-editor');
      return false;
    }
    return true;
  }

  validateItem(rootProperty: FormProperty, items: fhir.QuestionnaireItem[], errors: any[]) {
    if (!items) {
      return;
    }
    this.questionnaire.item.forEach(item => {
      rootProperty.reset(item, false);
      if (rootProperty._errors && rootProperty._errors.length) {
        errors.push({
          path: `item: Question Text: ${item.text}, Link Id: ${item.linkId}`,
          errors: rootProperty._errors
        });
      }

      this.validateItem(rootProperty, item.item, errors);
    });
  }

  handleHelpInfo(isHelpInfoDisplay: boolean){

    this.isHelpInfoDisplay = isHelpInfoDisplay;

  }

  /**
   * Returns the title of a questionnaire if it exists; otherwise, provides a default name.
   * @returns - Questionnaire title or "Untitled Form".
   */
  getQuestionnaireTitle(): string {
    this.titleAriaLabel = (this.questionnaire?.title) ?
      `${this.questionnaire.title} button. Click here to go to the Form-level attribute page.` :
      `Untitled Form. The questionnaire title is empty. Click here to return to the Form-level attribute page and enter the title.`;
    return this.questionnaire?.title || "Untitled Form";
  }
}
