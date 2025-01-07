import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit
} from '@angular/core';
import {LfbControlWidgetComponent} from '../lfb-control-widget/lfb-control-widget.component';
import {ExtensionsService} from '../../../services/extensions.service';
import {FormService} from '../../../services/form.service';
import {Subscription} from 'rxjs';
import fhir from 'fhir/r4';
import {Util} from '../../util';
import { PropertyGroup } from "@lhncbc/ngx-schema-form/lib/model";

@Component({
  selector: 'lfb-expression-extension',
  templateUrl: './expression-extension.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpressionExtensionComponent extends LfbControlWidgetComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input()
  url = '';

  @Input()
  excludeTypes?: string[];

  subscriptions: Subscription [] = [];

  constructor(private extensionsService: ExtensionsService, private formService: FormService, private cdr: ChangeDetectorRef) {
    super();
  }

  ngOnInit() {
    super.ngOnInit();
    const widget = this.formProperty.schema.widget;
    this.url = this.url || widget.url;
    this.excludeTypes = this.excludeTypes || widget.excludeTypes;

    const ext = this.extensionsService.getExtensionsByUrl(this.url);
    if (ext && ext.length) {
      this.formProperty.setValue(ext[0].valueExpression, false);
    }
  }

  getProperty(propertyId: string) {
    return this.formProperty.searchProperty(`${this.formProperty.path}/${propertyId}`);
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();

    this.subscriptions.push(this.formProperty.searchProperty('/type').valueChanges.subscribe((type) => {
      // If type is not choice, cleanup the extension.
      if (this.excludeTypes?.includes(type)) {
        this.extensionsService.removeExtensionsByUrl(this.url);
      }
      this.cdr.markForCheck();
    }));
    this.subscriptions.push(this.formProperty.valueChanges.subscribe((expression) => {
      this.extensionsService.removeExtensionsByUrl(this.url);
      if (expression.language && expression.expression) {
        this.extensionsService.addExtension({
          url: this.url,
          valueExpression: {
            language: expression.language,
            expression: expression.expression
          }
        }, null);
      }
    }));
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => {
      sub.unsubscribe();
    })
  }
}
