import { AfterViewInit, Component, OnInit } from '@angular/core';
import { LfbControlWidgetComponent } from '../lfb-control-widget/lfb-control-widget.component';
import { PropertyGroup } from '@lhncbc/ngx-schema-form';
import { Subscription } from 'rxjs';

@Component({
  selector: 'lfb-attachments-checkbox-group',
  templateUrl: './attachments-checkbox-group.component.html',
  styleUrls: ['./attachments-checkbox-group.component.css'],
})
export class AttachmentsCheckboxGroupComponent extends LfbControlWidgetComponent implements OnInit, AfterViewInit {
  static MIME_TYPE_URI = 'http://hl7.org/fhir/StructureDefinition/mimeType';
  static DEFAULT_MIME = 'application/pdf';

  validationError: string = ''; // Error message to display
  private typeChangeSubscription: Subscription | null = null;
  // Options for the checkboxes
  options: { label: string; value: string }[] = [];

  ngOnInit() {
    if (this.schema && this.schema.items.enum) {
      this.options = this.schema.items.enum; // Populate options from schema
    }

    this.labelClasses = this.schema.widget?.labelClasses;
    this.controlClasses = this.schema.widget?.controlClasses;
    this.labelPosition = this.schema.widget?.labelPosition;

    this.handleDefaultValues();
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();
    const dataTypeControl = this.formProperty.parent?.getProperty('type');
    this.typeChangeSubscription = dataTypeControl?.valueChanges.subscribe((newDataType) => {
      this.handleTypeChange(newDataType);
    });
  }

  ngOnDestroy() {
    if (this.typeChangeSubscription) {
      this.typeChangeSubscription.unsubscribe();
    }
  }

  handleDefaultValues() {
    const parentTypeControl = this.formProperty.parent?.getProperty('type');
    if (parentTypeControl?.value === 'attachment') {
      if (this.getMatchingCount() === 0) {
        const defaultAttachmentMime = this.schema.default || AttachmentsCheckboxGroupComponent.DEFAULT_MIME;
        this.setExtensionToAttachment(defaultAttachmentMime);
      }
    }
  }

  handleTypeChange(newDataType: any) {
    if (newDataType === 'attachment') {
      this.handleDefaultValues();
    } else {
      this.removeAllAttachmentsExtension();
    }
  }

  removeAllAttachmentsExtension() {
    const extensionProperty = this.formProperty.parent?.getProperty('extension');
    if (extensionProperty) {
      extensionProperty.setValue([], false);
    }
  }

  isSelected(value: string): boolean {
    return this.getSelectedMimeTypes().includes(value);
  }

  onCheckboxChange(event: Event, value: string): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) {
      this.setExtensionToAttachment(value);
    } else {
      this.removeAttachmentExtension(value);
    }
    // Validate checkboxes after every change
    this.validateCheckboxes();
  }

  validateCheckboxes() {
    const selectedCount = this.getMatchingCount();
    if (selectedCount === 0) {
      this.validationError = 'At least one MIME type must be selected.';
    } else {
      this.validationError = null;
    }
    // Optionally, set errors for the parent form property
   // this.formProperty.setErrors(this.validationError ? { required: true } : null);
  }

  removeAttachmentExtension(mimeType: string): void {
    const extensionProperty = this.formProperty.parent?.getProperty('extension');
    if (extensionProperty && Array.isArray(extensionProperty.value)) {
      const updatedExtensions = extensionProperty.value.filter(
        (ext: any) => ext.valueCode !== mimeType
      );
      extensionProperty.setValue(updatedExtensions, false);

      // Handle default if all MIME types are removed
      if (updatedExtensions.length === 0) {
        this.handleDefaultValues();
      }
    }
  }

  getSelectedMimeTypes(): string[] {
    const extensionProperty = this.formProperty.parent?.getProperty('extension');
    if (extensionProperty && Array.isArray(extensionProperty.value)) {
      return extensionProperty.value
        .filter((ext: any) => ext.url === AttachmentsCheckboxGroupComponent.MIME_TYPE_URI)
        .map((ext: any) => ext.valueCode);
    }
    return [];
  }

  setExtensionToAttachment(mimeType: string): void {
    const extensionProperty = this.formProperty.parent?.getProperty('extension');
    if (extensionProperty) {
      const extensionArray = extensionProperty.value || [];
      const existingExtensionIndex = extensionArray.findIndex(
        (ext: any) => ext.url === AttachmentsCheckboxGroupComponent.MIME_TYPE_URI && ext.valueCode === mimeType
      );

      const newExtension = this.createAttachmentExtension(mimeType);

      if (existingExtensionIndex !== -1) {
        extensionArray[existingExtensionIndex] = newExtension;
      } else {
        extensionArray.push(newExtension);
      }

      extensionProperty.setValue([...extensionArray], false); // Ensure a new array reference
    }
  }

  createAttachmentExtension(mimeType: string): any {
    return {
      url: AttachmentsCheckboxGroupComponent.MIME_TYPE_URI,
      valueCode: mimeType,
    };
  }

  getMatchingCount(): number {
    const extensionProperty = this.formProperty.parent?.getProperty('extension');
    if (extensionProperty && Array.isArray(extensionProperty.value)) {
      return extensionProperty.value.filter(
        (ext: any) =>
          ext.url === AttachmentsCheckboxGroupComponent.MIME_TYPE_URI &&
          this.options.some((option) => option.value === ext.valueCode)
      ).length;
    }
    return 0;
  }
}
