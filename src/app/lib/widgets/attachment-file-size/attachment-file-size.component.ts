import { Component, OnInit } from '@angular/core';
import { LfbControlWidgetComponent } from '../lfb-control-widget/lfb-control-widget.component';

@Component({
  selector: 'lfb-attachment-file-size',
  templateUrl: './attachment-file-size.component.html',
  styleUrls: ['./attachment-file-size.component.css'],
})
export class AttachmentFileSizeComponent extends LfbControlWidgetComponent implements OnInit {
  currentUnit: string = 'MB'; // Default display unit
  convertedValue: string = '5 MB'; // Default value (5000000 bytes)
  errorMessage: string = ''; // Error message to display
  static MAX_SIZE_URI = 'http://hl7.org/fhir/StructureDefinition/maxSize';

  constructor() {
    super();
  }

  ngOnInit() {
    // Initialize label and control classes
    this.labelClasses = this.schema.widget?.labelClasses || 'col-sm-2 m-0 ps-0 pe-1';
    this.controlClasses = this.schema.widget?.controlClasses;
    this.labelPosition = this.schema.widget?.labelPosition;

    // Initialize the display value from existing extension or default
    const maxSize = this.getMaxSizeFromExtensions();
    this.convertToReadableUnit(maxSize || 5000000); // Default to 5 MB if not set
  }

  // On input change, convert the entered value to KB or MB and update extensions
  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const bytesValue = parseFloat(target.value);

    // if (!isNaN(bytesValue)) {
    //   this.errorMessage = ''; // Clear the error message
    //   this.convertToReadableUnit(bytesValue);
    // } else {
    //   console.error('Invalid input: Please enter a valid number.');
    //   this.errorMessage = 'Please enter a valid number.'; // Set error message
    // }
    if (isNaN(bytesValue) || bytesValue === 0) {
      this.errorMessage = 'Please enter a valid number greater than 0.'; // Set error message
      this.convertedValue = ''; // Clear the converted value
    } else {
      this.errorMessage = ''; // Clear the error message
      this.convertToReadableUnit(bytesValue); // Process valid input
    }
  }

  // Convert bytes to a readable unit (KB or MB)
  convertToReadableUnit(bytes: number): void {
    if (bytes >= 1000000) {
      this.convertedValue = `${(bytes / 1000000).toFixed(1)} MB`;
    } else if (bytes >= 1000) {
      this.convertedValue = `${(bytes / 1000).toFixed(1)} KB`;
    } else {
      this.convertedValue = `${bytes} Bytes`;
    }
    this.updateMaxSize(bytes);
  }

  // Update or add the maxSize extension
  updateMaxSize(maxSize: number): void {
    const extensionProperty = this.formProperty.parent?.getProperty('extension');
    if (!extensionProperty) {
      console.error('Extension property is not defined.');
      return;
    }

    const extensionArray = extensionProperty.value || [];
    const updatedExtensions = extensionArray.filter(
      (ext: any) => ext.url !== AttachmentFileSizeComponent.MAX_SIZE_URI
    );

    // Add the new maxSize extension
    updatedExtensions.push({
      url: AttachmentFileSizeComponent.MAX_SIZE_URI,
      valueInteger: maxSize,
    });

    // Set the updated extensions array
    extensionProperty.setValue(updatedExtensions, false);
    console.log('Updated Extensions:', updatedExtensions);
  }

  // Retrieve the current maxSize from the extensions array
  private getMaxSizeFromExtensions(): number | null {
    const extensionProperty = this.formProperty.parent?.getProperty('extension');
    if (!extensionProperty || !Array.isArray(extensionProperty.value)) {
      return null;
    }

    const maxSizeExtension = extensionProperty.value.find(
      (ext: any) => ext.url === AttachmentFileSizeComponent.MAX_SIZE_URI
    );

    return maxSizeExtension?.valueInteger || null;
  }
}
