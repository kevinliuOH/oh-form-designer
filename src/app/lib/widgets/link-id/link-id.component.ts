import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild
} from '@angular/core';
import { SharedObjectService } from "../../../services/shared-object.service";
import { pairwise, Subscription } from "rxjs";
import fhir, { QuestionnaireItem } from "fhir/r4";
import { Util } from "../../util";
import { StringComponent } from "../string/string.component";
import { MessageDlgComponent, MessageType } from "../message-dlg/message-dlg.component";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";

const CODE_UNIQUENESS = 'UNIQUENESS';

@Component({
  selector: 'lfb-link-id',
  templateUrl: '../string/string.component.html',
  styles: [`
    label {
      margin-bottom: 0;
    }
  `]
})
export class LinkIdComponent extends StringComponent implements OnInit, AfterViewInit, OnDestroy {
  private subs: Subscription[] = [];
  private questionnaire: fhir.Questionnaire;
  @ViewChild('inputElement') inputElement!: ElementRef;
  previousValue: string | null = null;

  ngOnInit() {
    super.ngOnInit();
  }

  constructor(private modelService: SharedObjectService,
              private renderer: Renderer2,
              private modalService: NgbModal,
              private cdr: ChangeDetectorRef) {
    super();
    this.subs.push(this.modelService.questionnaire$.subscribe((questionnaire) => {
      this.questionnaire = questionnaire;
    }));
  }
  ngAfterViewInit() {
    super.ngAfterViewInit();
    this.formProperty.valueChanges.pipe(pairwise()).subscribe(([prev, val]) => {
      this.previousValue = null;
      setTimeout(() => {
        const errors = Util.validateLinkIdUniqueness(this.questionnaire, val, this.formProperty);
        if (errors) {
          this.previousValue = prev;
          this.formProperty.errorsChanges.next(errors);
          this.cdr.markForCheck();
        } else {
          Util.updateReferredLinkIdItems(this.questionnaire, prev, val);
        }
      });
    });
    this.renderer.listen(this.inputElement.nativeElement, 'blur', () => {
      this.onBlur();
    });
  }

  onBlur() {
    let message = null;
    if (this.previousValue) {
      this.formProperty.setValue(this.previousValue, false);
      message = `Link Id has to be unique, revert it back to ${this.formProperty.value}`;
    }
    if ((!this.formProperty.value || !this.formProperty.value.trim()) && this.formProperty.value !== '0') {
      const linkId = Math.floor(100000000000 + Math.random() * 900000000000).toString();
      setTimeout(() => this.formProperty.setValue(linkId, false));
      message = `Link Id is required, set to ${linkId}`
    }
    if (message) {
      const modalRef = this.modalService.open(MessageDlgComponent);
      modalRef.componentInstance.title = 'Warning';
      modalRef.componentInstance.message = message;
      modalRef.componentInstance.type = MessageType.WARNING;
    }
  }

  ngOnDestroy() {
    this.subs.forEach(sub => sub.unsubscribe());
  }
}
