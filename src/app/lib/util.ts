/**
 * A utility class
 */
import { ObjectProperty, PropertyGroup } from '@lhncbc/ngx-schema-form/lib/model';
import traverse from 'traverse';
import fhir, { QuestionnaireItem, QuestionnaireItemEnableWhen } from 'fhir/r4';
import {isEqual} from 'lodash-es';
import {ITreeNode} from '@bugsplat/angular-tree-component/lib/defs/api';
import copy from 'fast-copy';
import { ArrayProperty, FormProperty } from '@lhncbc/ngx-schema-form';
import {DateUtil} from './date-util';
import {v4 as uuidv4} from 'uuid';
import {fhirPrimitives} from "../fhir";
declare var LForms: any;

export type GuidingStep = 'home' | 'list' | 'fl-editor' | 'item-editor';
export enum FHIR_VERSIONS {
  R4,
  STU3
}
export type FHIR_VERSION_TYPE = keyof typeof FHIR_VERSIONS;

export class Util {
  static ITEM_CONTROL_EXT_URL = 'http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl';
  static RENDERING_STYLE_EXT_URL = 'http://hl7.org/fhir/StructureDefinition/rendering-style';
  static RENDERING_XHTML_EXT_URL = 'http://hl7.org/fhir/StructureDefinition/rendering-xhtml';
  static HELP_BUTTON_EXTENSION = {
      url: Util.ITEM_CONTROL_EXT_URL,
      valueCodeableConcept: {
        text: 'Help-Button',
        coding: [
          {
            code: 'help',
            display: 'Help-Button',
            system: 'http://hl7.org/fhir/questionnaire-item-control'
          }
        ]
      }
  };

  static helpItemTemplate = {
    text: '',  // Update with value from input box.
    type: 'display',
    linkId: '', // Update at run time.
    extension: [{
      url: Util.ITEM_CONTROL_EXT_URL,
      valueCodeableConcept: {
        text: 'Help-Button',
        coding: [
          {
            code: 'help',
            display: 'Help-Button',
            system: 'http://hl7.org/fhir/questionnaire-item-control'
          }
        ]
      }
    }]
  };

  private static _defaultForm = {
    resourceType: 'Questionnaire',
    title: 'New Form',
    status: 'draft',
    item: []
  };

  private static _answerTypeMap = {
    boolean: 'answerBoolean',
    integer: 'answerInteger',
    decimal: 'answerDecimal',
    date: 'answerDate',
    dateTime: 'answerDateTime',
    time: 'answerTime',
    string: 'answerString',
    text: 'answerString',
    choice: 'answerCoding',
    'open-choice': 'answerCoding',
    quantity: 'answerQuantity',
    reference: 'answerReference'
  };

  /**
   * See if the guiding step is one of the defined type. The flag is store in localStorage/sessionStorage.
   * This function is to help sanitize the stored values.
   * @param step - Potentially a defined guiding step.
   */
  static isGuidingStep(step: GuidingStep): step is GuidingStep {
    return (step === 'home' || step === 'fl-editor' || step === 'item-editor');
  }

  /**
   * Helps to sanitize the file name read from DOM input element.
   * @param file - File object to validate.
   */
  static validateFile(file: File): File {
    return (typeof file?.name === 'string'  && !/^[.~]|[\/\\]/.test(file.name)) ? file : null;
  }

  // Capitalize the camel case strings.
  static capitalize(str): string {
    let ret = '';
    if (str && str.length > 0) {
      ret = str.split(/(?=[A-Z])/).join(' ');
      ret = ret.charAt(0).toUpperCase() + ret.substring(1);
    }
    return ret;
  }


  /**
   * Identify if a particular widget under the group is visible.
   *
   * @param group - Group property of the widget
   * @param propertyId - It is '.' delimited property name of its descendants.
   */
  static isVisible(group: PropertyGroup, propertyId: string) {
    const path = propertyId.split('.');
    let visible = group.visible;
    for (let i = 0; i < path.length && visible; i++) {
      group = group.getProperty(path[i]);
      visible = group.visible;
    }
    return visible;

  }


  /**
   * Identify if an input is empty, typically intended to detect user input.
   * The definition of empty:
   * Anything null, undefined or empty string is empty.
   * Any object or an array containing all empty elements is empty.
   *
   * @param json - Input to test the emptiness.
   * @return boolean - True if empty.
   */
  static isEmpty(json: unknown): boolean {
    let ret = true;
    if (typeof json === 'number') {
      ret = false; // Any number is non-empty
    }
    else if(typeof json === 'boolean') {
      ret = false; // Any boolean is non-empty
    }
    else if(!json) {
      ret = true; // empty string, null and undefined are empty
    }
    else if (json instanceof Date) {
      ret = false; // Date is non-empty
    }
    else if(Array.isArray(json)) { // Iterate through array
      for(let i = 0; ret && i < json.length; i++) {
        ret = Util.isEmpty(json[i]);
      }
    }
    else if (typeof json === 'object') { // Iterate through object properties
      if(Object.keys(json).length === 0) {
        ret = true;
      }
      else {
        for(let i = 0, keys = Object.keys(json); ret && i < keys.length; i++) {
          if(json.hasOwnProperty(keys[i])) {
            ret = Util.isEmpty(json[keys[i]]);
          }
        }
      }
    }
    else {
      ret = false;
    }
    return ret;
  }


  /**
   * Convert lforms answers to FHIR equivalent.
   * @param lformsAnswers - Lforms answers.
   */
  static getFhirAnswerOption(lformsAnswers: any []) {
    if(!lformsAnswers) {
      return null;
    }
    const answerOption: any [] = [];
    lformsAnswers.forEach((answer) => {
      answerOption.push({code: answer.AnswerStringID, system: 'http://loinc.org', display: answer.DisplayText});
    });
    return answerOption;
  }


  /**
   * Convert lforms data type to FHIR data type
   * @param lformsType - Lforms data type.
   */
  static getFhirType(lformsType: string): string {
    let ret = 'string';
    switch (lformsType) {
      case 'INT':
        ret = 'integer';
        break;
      case 'REAL':
        ret = 'decimal';
        break;
      case 'DT':
      case 'DAY':
      case 'MONTH':
      case 'YEAR':
        ret = 'date';
        break;
      case 'DTM':
        ret = 'dateTime';
        break;
      case 'ST':
      case 'EMAIL':
      case 'PHONE':
        ret = 'string';
        break;
      case 'TITLE':
        ret = 'display';
        break;
      case 'TM':
        ret = 'time';
        break;
      case 'SECTION':
      case null: // Null type for panels.
        ret = 'group';
        break;
      case 'URL':
        ret = 'url';
        break;
      case 'QTY':
        ret = 'quantity';
        break;
      case 'CNE':
        ret = 'choice';
        break;
      case 'CWE':
        ret = 'open-choice';
        break;
    }
    return ret;
  }


  /**
   * Convert lforms units to equivalent FHIR extensions. For quantity type, all
   * units are converted, and for decimal or integer, only the first unit is converted.
   *
   * @param units - units in lforms format.
   * @param dataType - 'quantity' || 'decimal' || 'integer'
   */
  static convertUnitsToExtensions(units, dataType: string): any [] {
    if(!units) {
      return null;
    }
    const ret: any [] = [];
    const unitUri = dataType === 'quantity' ?
      'http://hl7.org/fhir/StructureDefinition/questionnaire-unitOption' :
      'http://hl7.org/fhir/StructureDefinition/questionnaire-unit';
    units.some((unit) => {
      const display = LForms.ucumPkg.UcumLhcUtils.getInstance().validateUnitString(unit.unit)?.unit?.name || unit.unit;
      ret.push({
        url: unitUri,
        valueCoding: {
          code: unit.unit,
          system: 'http://unitsofmeasure.org',
          display: display
        }
      });
      // For quantity convert all units. For decimal or integer pick the first one.
      return (dataType !== 'quantity');
    });
    return ret;
  }


  /**
   * Find index of the item containing help text.
   * @param itemsArray - List of items to search for.
   */
  static findItemIndexWithHelpText(itemsArray) {
    if(!itemsArray) {
      return -1;
    }
    return itemsArray.findIndex((item) => {
      let ret = false;
      if (item.type === 'display') {
        ret = item.extension?.some((e) => {
          return e.url === Util.ITEM_CONTROL_EXT_URL &&
            e.valueCodeableConcept?.coding?.some((coding) => coding.code === 'help');
        });
      }
      return ret;
    });
  }

  /**
   * Check for existence of help text values. The values are plain text, and valueStrings from css/xhtml
   * rendering extensions
   *
   * @param node - fhir.QuestionnaireItem.
   */
  static hasHelpText(node): boolean {
    return node?.__$helpText?.text?.trim().length > 0 ||
      node?.__$helpText?._text?.extension?.some((ext: fhir.Extension) => {
        return ext.url === Util.RENDERING_XHTML_EXT_URL && ext.valueString?.trim().length > 0;
      });
  }

  /**
   * Prunes the questionnaire model using the following conditions:
   * . Removes 'empty' values from the object. Emptiness is defined in Util.isEmpty().
   *   The following are considered empty: undefined, null, {}, [], and  ''.
   * . Removes anything with __$* keys.
   * . Removes functions.
   * . Converts __$helpText to appropriate FHIR help text item.
   * . Converts enableWhen[x].question object to linkId.
   *
   * @param fhirQInternal - Questionnaire object used in the form builder.
   */
  static convertToQuestionnaireJSON(fhirQInternal) {
    const value = copy(fhirQInternal); // Deep copy. Leave the internal model untouched.
    traverse(value).forEach(function (node) {
      this.before(function () {
        if(node && Array.isArray(node)) {
          // Remove empty elements, nulls and undefined from the array. Note that empty elements do not trigger callbacks.
          this.update(node.filter((e)=>{return e !== null && e !== undefined}));
        }
        else if (Util.hasHelpText(node)) {
          Util.eliminateEmptyFields(node.__$helpText);
          if(!node.item) {
            node.item = [];
          }
          node.item.push(node.__$helpText);
          delete node.__$helpText;
          this.update(node);
        }
        // Internally the question is target TreeNode. Change that to node's linkId.
        else if (this.key === 'question' && typeof node?.data === 'object') {
          this.update(node.data.linkId);
        }
      });

      this.after(function () {
        // Remove all custom fields starting with __$ excluding any fields defined in excludeCustomFields array and empty fields.
        if(this.key?.startsWith('__$') || typeof node === 'function' || Util.isEmpty(node)) {
          if (this.notRoot) {
            this.remove(); // Splices off any array elements.
          }
        }
      });
    });
    return value;
  }

  /**
   * Remove empty fields from a json object.
   * @param json - JSON object
   */
  static eliminateEmptyFields(json) {
    traverse(json).forEach(function (node) {
      this.before(function () {
        if(node && Array.isArray(node)) {
          // Remove empty elements, nulls and undefined from the array. Note that empty elements do not trigger callbacks.
          this.update(node.filter((e)=>{return e !== null && e !== undefined}));
        }
      });

      this.after(function () {
        // Remove all empty fields.
        if(typeof node === 'function' || Util.isEmpty(node)) {
          if (this.notRoot) {
            this.remove(); // Splices off any array elements.
          }
        }
      });
    });
  }

  /**
   * Remove the content of target and copy (shallow) source to target.
   * More like a clone of source, without changing target reference.
   * @param target - object to be mirrored
   * @param source - source to copy.
   */
  static mirrorObject(target, source): any {
    Object.keys(target).forEach((k) => {
      if(target.hasOwnProperty(k)) {
        delete target[k];
      }
    });

    return Object.assign(target, source);
  }

  static createUUID() {
    return uuidv4();
  }

  /**
   * Create bare minimum form.
   */
  static createDefaultForm(): fhir.Questionnaire {
    const form = Util.cloneDefaultForm();
    form.id = Util.createUUID();
    form.publisher = 'Ontario Health';
    form.url = `urn:uuid:${form.id}`;
    return form;
  }

  /**
   * Clone default form, mainly to create a new form.
   */
  static cloneDefaultForm(): fhir.Questionnaire {
    return JSON.parse(JSON.stringify(Util._defaultForm));
  }

  /**
   * Compare with default form with deep equal.
   * @param q - Questionnaire to compare with default.
   */
  static isDefaultForm(q: fhir.Questionnaire): boolean {
    return isEqual(Util._defaultForm, q);
  }

  /**
   * Find the extension based on a given url from an array.
   * @param extensions - Array of extensions.
   * @param url - The url of the extension to search for.
   */
  static findExtensionByUrl(extensions: fhir.Extension [], url: string) {
    const i = this.findExtensionIndexByUrl(extensions, url);
    return i >= 0 ? extensions[i] : null;
  }


  /**
   * Find the first index of the extension based on a given url.
   * @param extensions - Array of extensions.
   * @param url - The url of the extension to search for.
   */
  static findExtensionIndexByUrl(extensions: fhir.Extension [], url: string) {
    let ret = -1;
    if (extensions?.length) {
      ret = extensions.findIndex((ext) => {
        return ext.url === url;
      });
    }
    return ret;
  }


  /**
   * Utility to identify answer[x] field.
   * @param f - Field name
   */
  static isAnswerField(f): boolean {
    return f && f.startsWith('answer');
  }


  /**
   * Map type to answer[x] field.
   * @param type - question type
   */
  static getAnswerFieldName(type: string): string {
    return Util._answerTypeMap[type];
  }

  /**
   * Compute tree hierarchy sequence numbering.
   * @param node - Target node of computation
   */
  static getIndexPath(node: ITreeNode): number[] {
    const ret: number [] = [];
    if (node) {
      ret.push(node.index + 1);
      while (node?.level > 1) {
        node = node.parent;
        const index = node ? node.index : 0;
        ret.push(index + 1);
      }
    }
    return ret.reverse();
  }


  /**
   * Format Node item for some display cases, for example search results of node items.
   * @param node - Input node to format the display.
   */
  static formatNodeForDisplay(node: ITreeNode) {
    let ret: string;
    if (node && node.data) {
      ret = `${Util.getIndexPath(node).join('.')}: ${node.data.text}`;
    }
    return ret;
  }


  /**
   * Truncate string to display node text on the sidebar.
   * @param text - String to truncate.
   * @param limit - Length to limit the truncation.
   */
  static truncateString(text: string, limit: number = 15): string {
    return text?.length > limit ? (text.substring(0, limit).trim() + '...') : text;
  }

  /**
   * Date type validator. Flags error for invalid dates such as 2023-11-31.
   * @param value - value from formProperty, which is in ISO format.
   * @param formProperty - FormProperty of the field.
   */
  static dateValidator(value: string, formProperty: FormProperty): any [] {
    let errors: any[] = [];
    const dateValidation = DateUtil.validateDate(value);
    if(value?.trim().length > 0 && !dateValidation.validDate && dateValidation.validFormat) {
        const errorCode = 'INVALID_DATE';
        const err: any = {};
        err.code = errorCode;
        err.path = `#${formProperty.canonicalPathNotation}`;
        err.message = 'Invalid date.';
        err.params = [value];
        errors.push(err);
    }
    if(errors.length) {
      formProperty.extendErrors(errors);
    }
    else {
      errors = null;
    }
    return errors;
  }

  /**
   * Validator for datetime type. For now passing through the date validator.
   * @param value - formProperty value in ISO format.
   * @param formProperty - FormProperty of the field.
   */
  static dateTimeValidator(value: string, formProperty: FormProperty): any [] {
    return Util.dateValidator(value, formProperty);
  }

  static endDateValidator(value: string, formProperty: FormProperty): any[] {
    let errors: any[] = [];
    if (value) {
      // Accessing the parent form property (effectivePeriod)
      const effectivePeriod = formProperty.parent; // Assuming effectivePeriod is the parent
      // Retrieve start and end values directly
      const startDate = effectivePeriod && effectivePeriod.properties['start'] ? effectivePeriod.properties['start'].value : null;
      const endDate = value; // The current value being validated
      // Perform validation logic
      if (endDate && startDate) {
        if (new Date(endDate) < new Date(startDate)) {
          const errorCode = 'INVALID_DATE';
          const err: any = {};
          err.code = errorCode;
          err.path = `#${formProperty.canonicalPathNotation}`;
          err.message = 'End Date must be after the Start Date';
          err.params = [value];
          errors.push(err);
          return errors; // Return error if end date is less than start date
        }
      }
    }
    return null; // Return null if validation passes
  }


  /**
   * Traverse up the chain of tree invoking a callback for each node visited. The callback should return false to terminate the traversal.
   * @param sourceNode - The node to start the traversal.
   * @param callback - Callback method with the argument of node visited. The function should return true to continue, and false to
   * terminate the traversal.
   *
   * @return - Returns an array consisting the nodes in the order it visited.
   */
  static traverseAncestors(sourceNode: ITreeNode, callback: (node: ITreeNode) => boolean): any[] {
    const ret = [];
    let n = sourceNode;
    let traverseAncestor = true;
    while (n && traverseAncestor) {
      ret.push(n);
      traverseAncestor = callback(n);
      n = n.parent;
    }
    return ret;
  }

  static getItemsByLinkId(items: QuestionnaireItem[], linkId: string, linkIdItems: QuestionnaireItem[]) {
    if (!items) {
      return;
    }
    items.forEach(item => {
      if (item.linkId === linkId) {
        linkIdItems.push(item);
      }
      this.getItemsByLinkId(item.item, linkId, linkIdItems);
    });
  }

  static getItemsReferredLinkId(items: QuestionnaireItem[], linkId: string, refItems: QuestionnaireItemEnableWhen[]) {
    if (!items) {
      return;
    }
    items.forEach(item => {
      if (item.enableWhen) {
        refItems.push(...item.enableWhen?.filter(condition => condition.question === linkId));
      }
      this.getItemsReferredLinkId(item.item, linkId, refItems);
    });
  }

  static updateReferredLinkIdItems(questionnaire: fhir.Questionnaire, oldLinkId: string, newLinkId: string) {
    const refLinkIdItems: QuestionnaireItemEnableWhen[] = [];
    Util.getItemsReferredLinkId(questionnaire.item, oldLinkId, refLinkIdItems);
    refLinkIdItems?.forEach(item => item.question = newLinkId);
  }

  static validateLinkIdUniqueness(questionnaire: fhir.Questionnaire, value: string, formProperty: FormProperty): any [] {
    const errors: any[] = [];
    const sameLinkIdItems: QuestionnaireItem[] = [];

    Util.getItemsByLinkId(questionnaire.item, value, sameLinkIdItems);

    if (value?.trim().length > 0 && sameLinkIdItems.length > 1) {
      const err = {
        code: 'UNIQUENESS',
        path: `#${formProperty.canonicalPathNotation}`,
        message: 'Link Id is not unique'
      };
      errors.push(err);
      return errors;
    }
    return null;
  }


  /**
   * Custom validator for enableWhen (Array of conditions).
   * @param value -  Value of the field.
   * @param arrayProperty - Array form property of the field.
   * @param rootProperty - Root form property
   */
  static validateEnableWhenAll (value: any, arrayProperty: ArrayProperty, rootProperty: PropertyGroup) {
    let errors = null;
    // iterate all properties
    arrayProperty.forEachChild((property: ObjectProperty) => {
      const error = Util.validateEnableWhenSingle(property.value, property, rootProperty)
      if (error) {
        errors = errors || []
        errors.push(error)
      }
    });
    return errors;
  }

  /**
   * Custom validator for single condition in enableWhen
   * @param value - Value of single enableWhen condition
   * @param formProperty - Object form property of the condition
   * @param rootProperty - Root form property
   */
  static validateEnableWhenSingle (value: any, formProperty: ObjectProperty, rootProperty: PropertyGroup) {
    const aType = formProperty.getProperty('__$answerType').value;
    const q = formProperty.getProperty('question');
    const op = formProperty.getProperty('operator');
    const aField = Util.getAnswerFieldName(aType || 'string');
    const answerX = formProperty.getProperty(aField);
    let errors: any[] = [];
    if((q?.value?.trim().length > 0) && op?.value.length > 0) {
      const aValue = answerX?.value;
      if(answerX && (Util.isEmpty(aValue)) && op?.value !== 'exists') {
        const errorCode = 'ENABLEWHEN_ANSWER_REQUIRED';
        const err: any = {};
        err.code = errorCode;
        err.path = `#${answerX.canonicalPathNotation}`;
        err.message = `Answer field is required when you choose an operator other than 'Not empty' or 'Empty'`;
        const valStr = JSON.stringify(aValue);
        err.params = [q.value, op.value, valStr];
        errors.push(err);
        const i = answerX._errors?.findIndex((e) => e.code === errorCode);
        if(!(i >= 0)) { // Check if the error is already processed.
          answerX.extendErrors(err);
        }
      }
    }
    if(errors.length) {
      formProperty.extendErrors(errors);
    }
    else {
      errors = null;
    }
    return errors;
  }
  /**
   * Generates a unique identifier string using UUID v4 format.
   *
   * This function creates a unique identifier in the format of
   * "xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx", consisting of 36 characters,
   * including four hyphens.
   * @returns - A string that represents a UUID v4.
   */
  static generateUniqueId(): string {
    return uuidv4();
  }

  /**
   * Return base url from input. Input could be base plus /Questionnaire/$validate, in addition to possible
   * search parameters.
   *
   * @param fhirUrl - Input url.
   *
   * @return baseUrl of the fhir server.
   */
  static extractBaseUrl(fhirUrl: fhirPrimitives.url): fhirPrimitives.url {
    let url: URL;
    try {
      url = new URL(fhirUrl);
      if(!/^https?:$/i.test(url.protocol)) {
        return null;
      }
    } catch(e) {
      return null;
    }

    let ret: fhirPrimitives.url; // If the input is baseUrl or url with search params, return as it is.
    const re = /(\/questionnaire\/\$validate)$/i;
    if(url.pathname && re.test(url.pathname)) {
      ret = url.origin + url.pathname.replace(re, '');
    } else if(url.pathname && url.pathname.length > 1) {
      ret = url.origin + url.pathname;
    } else {
      ret = url.origin;
    }

    return ret;
  }


  /**
   * Removes the anchor tags (<a> and </a>) from a given string and replaces them with a specified string.
   * @param str - the input string that potentiallly including anchor tags.
   * @param replaceWith - string to insert either before or after the text inside the removed anchor tags.
   * @param position - defines whether to insert the replace string 'before' or 'after' the replacement string.
   * @returns - a new string with the anchor tags removed and replaced according to the specified position.
   */
  static removeAnchorTagFromString(str: string, replaceWith: string, position: string = 'after'): string {
    const regex = /<a[^>]*>(.*?)<\/a>/g;
    let replacement;

    if (position === 'before') {
      replacement = replaceWith + '$1';
    } else {
      replacement = '$1' + replaceWith;
    }

    return str.replace(regex, replacement);
  }
}
