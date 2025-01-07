import { AfterViewInit, Component, OnInit } from '@angular/core';
import { Util } from '../../util';
import { LfbControlWidgetComponent } from "../lfb-control-widget/lfb-control-widget.component";

@Component({
  selector: 'lfb-date-format-extension',
  templateUrl: './date-format-extension.component.html',
  styleUrl: './date-format-extension.component.css'
})
export class DateFormatExtensionComponent extends LfbControlWidgetComponent implements OnInit, AfterViewInit {

  static DATE_FORMAT_URI = "http://hl7.org/fhir/StructureDefinition/entryFormat";

  options: { label: string; value: string }[] = []; // Dropdown options
  constructor() {
    super();
  }

  private eligibleType(): string {
    const parentTypeControl = this.formProperty.parent?.getProperty('type');
    return parentTypeControl?.value === 'date' || parentTypeControl?.value === 'dateTime' ? parentTypeControl.value : '';
  }
  ngOnInit() {
    //super.ngOnInit();
    if (this.schema && this.schema.enum) {
      this.options = this.schema.enum;  // Use the enum property from the schema for options
    }
    // Set label and control classes from widget configuration
    this.labelClasses = this.schema.widget?.labelClasses || 'col-3 ps-0 pe-1';
    this.controlClasses = this.schema.widget?.controlClasses || 'col-9 p-0';
    this.labelPosition = this.schema.widget?.labelPosition || 'top';
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();
    if (this.eligibleType()) {
      const extension = this.formProperty.parent.getProperty('extension');
      const ext = Util.findExtensionByUrl(extension?.value, DateFormatExtensionComponent.DATE_FORMAT_URI);
      const valueString = ext?.valueString || this.schema.default;
      this.control.setValue(valueString.length > 10 ? valueString.substring(0, 10) : valueString);
    }
    const parentTypeControl = this.formProperty.parent?.getProperty('type');
    if (parentTypeControl) {
      parentTypeControl.valueChanges.subscribe(() => {
        this.onChange(this.control.value);
      });
    }
    this.control.valueChanges.subscribe(this.onChange.bind(this));
  }

  onChange(value: any): void {
    if (!this.formProperty.parent) return;
    const extension = this.formProperty.parent.getProperty('extension');
    if (!extension) {
      this.formProperty.parent.getProperty('extension').setValue([]);
    }
    const extensions = extension.value;
    const ind = Util.findExtensionIndexByUrl(extensions, DateFormatExtensionComponent.DATE_FORMAT_URI);
    if (this.eligibleType()) {
      const entryFormat = value + (this.eligibleType() === 'date' ? '' : ' HH:mm:ss');
      if (ind >= 0) {
        extensions[ind].valueString = entryFormat;
      } else {
        extensions.push({
          "url": DateFormatExtensionComponent.DATE_FORMAT_URI,
          valueString: entryFormat
        });
      }
    } else if (ind >= 0) {
      extensions.splice(ind, 1);
    }
  }
}
