import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import {StringComponent} from '../string/string.component';
import {FormProperty} from '@lhncbc/ngx-schema-form';
import fhir from 'fhir/r4';
import {Util} from '../../util';
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { FormModalComponent } from "../../../modals/form-modal/form-modal.component";
import { MessageType } from "../message-dlg/message-dlg.component";
import { PreviewData } from "../preview-dlg/preview-dlg.component";

@Component({
  selector: 'lfb-html-editor',
  template: `
    <h2 mat-dialog-title class="bg-primary text-white pe-2 pb-3">
      Edit HTML
      <button mat-icon-button class="close-button mt-2" [mat-dialog-close]="true" style="float: right">
        <mat-icon class="close-icon">close</mat-icon>
      </button>
    </h2>
    <mat-dialog-content class="lfb-mat-tab-content">
      <div class="w-100 p-2">
        <quill-editor [styles]="{height: '300px', width: '100%'}" [(ngModel)]="data.xhtmlValue"></quill-editor>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions class="border-top pe-3 pt-3 parent-container" align="end">
      <button class="btn btn-outline-primary me-2" [mat-dialog-close]="true">Cancel</button>
      <button class="btn btn-primary " (click)="save()">Save</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .ql-editor {
        overflow: visible;
      }
    `
  ]
})
export class HtmlEditorComponent {
  constructor(
    public dialogRef: MatDialogRef<HtmlEditorComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { xhtmlValue: string }) {
  }
  close() {
    this.dialogRef.close();
  }
  save() {
    this.dialogRef.close(this.data.xhtmlValue);
  }
}
