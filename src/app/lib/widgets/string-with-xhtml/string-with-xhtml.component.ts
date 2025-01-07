import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import {StringComponent} from '../string/string.component';
import {FormProperty} from '@lhncbc/ngx-schema-form';
import fhir from 'fhir/r4';
import {Util} from '../../util';
import { MatDialog } from "@angular/material/dialog";
import { HtmlEditorComponent } from "./html-editor.compontent";
import { take } from "rxjs";

@Component({
  selector: 'lfb-string-with-xhtml',
  templateUrl: './string-with-xhtml.component.html'
})
export class StringWithXHTMLComponent extends StringComponent implements OnInit {

  @ViewChild('editorDlg') editorDlg: ElementRef;
  static RENDERING_XHTML_EXT_URL = 'http://hl7.org/fhir/StructureDefinition/rendering-xhtml';
  xhtmlValue: string;
  // name: string;
  elementTypeFieldFormProperty: FormProperty;
  elementTypeFieldValue; any;

  extensionTmpl: fhir.Extension = {
    url: StringWithXHTMLComponent.RENDERING_XHTML_EXT_URL
  };


  constructor(private matDlg: MatDialog,) {
    super();
  }


  /**
   * Initialize member variables.
   */
  ngOnInit() {
    super.ngOnInit();
    this.name = this.formProperty.canonicalPathNotation;
    this.elementTypeFieldFormProperty = this.getCorrespondingFieldElementProperty();
    this.elementTypeFieldValue = this.elementTypeFieldFormProperty?.value;
    const ext = Util.findExtensionByUrl(this.elementTypeFieldValue?.extension,
      StringWithXHTMLComponent.RENDERING_XHTML_EXT_URL);
    this.xhtmlValue = ext?.valueString || '';
  }


  /**
   * Handle change of css input
   * @param htmlString - new CSS input
   */
  htmlChanged(htmlString) {
    const ind = Util.findExtensionIndexByUrl(
      this.elementTypeFieldValue.extension, StringWithXHTMLComponent.RENDERING_XHTML_EXT_URL);
    let ext;
    this.xhtmlValue = htmlString ? htmlString.trim() : '';
    if (this.xhtmlValue) {
      this.xhtmlValue = `${this.xhtmlValue.replace(/<u>(.*?)<\/u>/g, '<span style="text-decoration: underline">$1</span>')
        .replace(/<s>(.*?)<\/s>/g, '<span style="text-decoration: line-through">$1</span>')}`;
    }
    if(this.xhtmlValue) {
      if(ind < 0) {
        ext = Object.assign({}, this.extensionTmpl);
      }
      else {
        ext = this.elementTypeFieldValue.extension[ind];
      }

      ext.valueString = this.xhtmlValue;
      if(!this.elementTypeFieldValue.extension) {
        this.elementTypeFieldValue.extension = [];
      }
      if(this.elementTypeFieldValue.extension.length === 0) {
        this.elementTypeFieldValue.extension.push(ext);
      }
    }
    else if(ind >= 0) { // Empty value, remove any existing extension.
      this.elementTypeFieldValue.extension.splice(ind, 1);
    }

    this.elementTypeFieldFormProperty.reset(this.elementTypeFieldValue, false);
  }


  /**
   * Get sibling FHIR element type field of this field. Ex: _text for text, _prefix for prefix.
   */
  getCorrespondingFieldElementProperty() {
    let elName = this.formProperty?.canonicalPathNotation?.replace(/^.*\./, '');
    elName = elName ? '_' + elName : null;
    return this.formProperty.parent.getProperty(elName);
  }

  /**
   * Create button label based on css content
   */
  xhtmlButtonLabel() {
    const labelPrefix = (this.xhtmlValue && this.xhtmlValue.trim().length > 0) ? 'Edit' : 'Add';
    return labelPrefix + ' HTML';
  }

  openEditor() {
    const dlg = this.matDlg.open(HtmlEditorComponent,
      {
        data: {
          xhtmlValue: this.xhtmlValue
        },
        width: '80vw',
        height: '80vh'
      }
    );
    dlg.afterClosed().pipe(take(1)).subscribe((result) => {
      if (typeof(result) === 'string') {
        this.xhtmlValue = result;
      }
    });
  }
}
