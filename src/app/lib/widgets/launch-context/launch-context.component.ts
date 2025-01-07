import {ChangeDetectionStrategy, Component, ElementRef, OnInit} from '@angular/core';
import {TableComponent} from '../table/table.component';
import { ExtensionsService } from "../../../services/extensions.service";

/**
 * Restrictions are based on table component.
 * Combines maxLength field which is part of standard FHIR with SDC extensions.
 */
@Component({
  selector: 'lfb-launch-context',
  templateUrl: '../table/table.component.html',
  styleUrls: ['../table/table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LaunchContextComponent extends TableComponent implements OnInit {
  static LAUNCH_CONTEXT_URI = 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-launchContext';

  constructor(private extensionsService: ExtensionsService,
              elementRef: ElementRef) {
    super(elementRef);
  }


  ngOnInit(): void {
    super.ngOnInit();
    this.subscriptions.push(this.formProperty.valueChanges.subscribe((launchContexts) => {
      if (!this.formProperty.root.getProperty('__$launchContextYesNo').value) {
        this.extensionsService.removeExtensionsByUrl(LaunchContextComponent.LAUNCH_CONTEXT_URI);
        return;
      }
      if (launchContexts.length > 0) {
        this.extensionsService.removeExtensionsByUrl(LaunchContextComponent.LAUNCH_CONTEXT_URI);
        launchContexts.forEach(ctx => {
          const extension = [];
          if (ctx.name && ctx.type) {
            Object.keys(ctx).forEach(att => {
              let valueType: string;
              if (att === 'name') {
                valueType = 'valueCoding';
              } else if (att === 'type') {
                valueType = 'valueCode';
              } else {
                valueType = 'valueString';
              }
              extension.push({
                url: att,
                [valueType]: ctx[att]
              })
            });
          }
          if (extension.length) {
            this.extensionsService.addExtension({
              url: LaunchContextComponent.LAUNCH_CONTEXT_URI,
              extension
            }, null);
          }
        });
      }
    }));
  }
}
