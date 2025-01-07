import { Injectable } from '@angular/core';
import fhir from "fhir/r4";
import { FormService } from "./form.service";
import { Util } from "../lib/util";
import moment from 'moment-timezone';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { environment } from "../../environments/environment";
import { FormModalComponent } from "../modals/form-modal/form-modal.component";
import { MessageType } from "../lib/widgets/message-dlg/message-dlg.component";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { StatusEnum } from "../form-list/form-list.component";
import { ToasterService } from "./toaster.service";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, of } from "rxjs";
import { map } from "rxjs/operators";

export enum FormStatus {
  Draft = 'Draft',
  Active = 'Active'
}
export interface FormItem {
  name?: string;
  status?: string;
  dateTime?: string;
  version?: number;
  questionnaire?: fhir.Questionnaire
}

const regex = /^(?<filename>.+?)\.(?<version>[^.]+)\.(?<status>[^.]+)\.(?<datetime>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\.json$/;
const regex_no_ver = /^(?<filename>.+)\.(?<status>[^.]+)\.(?<datetime>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\.json$/;
const reg_status = /^.+\.(?<status>[^.]+)\.(?<datetime>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\.json$/;

const DATE_TIME_FORMAT = 'yyyy-MM-DD HH:mm:ss';
const DATE_TIME_FULL_FORMAT = 'yyyy-MM-DDTHH:mm:ss.SSSZ';
const DATE_FORMAT = 'yyyy-MM-DD';

interface SASToken {
  token: string;
  expirationTime: Date;
}
@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private containerClient: ContainerClient;
  private sasToken?: SASToken;

  constructor(private formService: FormService,
              private toasterService: ToasterService,
              private http: HttpClient,
              private modalService: NgbModal) {
    this.refreshContainerClient();
  }

  private parseSASTokenExpiry(sasToken: string): Date | null {
    const params = new URLSearchParams(sasToken.split('?')[1]);
    const expiry = params.get('se');
    return expiry ? new Date(expiry) : null;
  }

  private isTokenExpired(): boolean {
    if (!this.sasToken?.expirationTime) {
      return true;
    }
    const currentTime = new Date();
    return currentTime >= this.sasToken?.expirationTime;
  }

  private refreshContainerClient(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.sasToken?.token && !this.isTokenExpired()) {
        resolve();
      }

      const params = new HttpParams()
        .set('env', environment.env); // Include function key if needed

      this.http.get(environment.formBlobTokenUrl, { params, responseType: 'text' }).pipe(
        map((response: any) => {
          this.sasToken = {
            token: response,
            expirationTime: this.parseSASTokenExpiry(response)
          };
          return this.sasToken;
        })
      ).subscribe((sasToken: SASToken) => {
        const blobServiceClient = new BlobServiceClient(`${environment.formBlobUrl}?${sasToken.token}`);
        this.containerClient = blobServiceClient.getContainerClient(environment.formBlobContainerName);
        resolve();
      });
    });

  }

  async listFiles(prefix: string = ''): Promise<string[]> {
    try {
      const fileNames: string[] = [];
      await this.refreshContainerClient();
      let blobs = this.containerClient.listBlobsFlat({prefix});
      for await (const blob of blobs) {
        fileNames.push(blob.name);
      }
      console.debug('List of blobs in storage:', fileNames);
      return fileNames;
    } catch (err) {
      console.error('List files failed: ', err);
      throw err;
    }
  }

  async list(): Promise<FormItem[]> {
    return this.listFiles().then(files => files.map(filename => {
      const match = this.parseBlobName(filename);
      return match ? {
        name: match.groups.filename,
        status: match.groups.status,
        dateTime: match.groups.datetime,
        version: match.groups.version ? Number(match.groups.version) : null
      } : null;
    }).filter(f => !!f));
  }
  async deleteForm(form: FormItem): Promise<boolean> {
    try {
      // Get a client for the blob you want to delete
      await this.refreshContainerClient();
      const blobClient = this.containerClient.getBlobClient(this.getBlobName(form));

      // Delete the blob
      await blobClient.delete();
      return true;

    } catch (error) {
      console.error('Error deleting the Form:', error.message);
      this.toasterService.showMessage('Unable to delete the form, please try again later', 'danger');
      return false;
    }
  }
  async updateBlob(data: FormItem) {
    try {
      await this.refreshContainerClient();
      const listFiles = await this.listFiles(`${data.name}.`);
      for (const filename of listFiles) {
        const match = this.parseBlobName(filename);
        if (data.name === match.groups.filename
          && (!data.version && !match.groups.version || String(data.version) === match.groups.version)
          && data.status === match.groups.status) {

          const blobClient = this.containerClient.getBlobClient(filename);
          await blobClient.deleteIfExists();
        }
      }
      const blockBlobClient = this.containerClient.getBlockBlobClient(this.getBlobName(data));

      // Convert the data to a Blob if necessary
      const dataBlob = new Blob([JSON.stringify(data.questionnaire)], {type: 'text/plain'});

      console.debug('BLOB data: ', dataBlob);
      // Upload data to the blob (this will create the blob if it doesn't exist)
      const blobUpdated = await blockBlobClient.uploadData(dataBlob, {
        blobHTTPHeaders: {blobContentType: 'text/plain'}
      });
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
  async save(data: FormItem) {
    if (data.status === StatusEnum.Active && await this.blobWithDraftStatusExists(data.questionnaire.title)) {
      const modalRef = this.modalService.open(FormModalComponent);
      modalRef.componentInstance.title = 'Confirmation';
      modalRef.componentInstance.message = 'You are creating a draft version from active version, but a draft version already exists, are you sure you want to overwrite it?';
      modalRef.componentInstance.type = MessageType.WARNING;
      modalRef.componentInstance.confirmed = true;
      return new Promise((resolve, reject) => {
        const res = modalRef.result;
        res.then(
          async (result) => {
              await this.saveBlob(data);
              resolve(data);
          }
        );
        res.catch(() => reject('ignore'));
      });
    } else {
      await this.saveBlob(data);
    }
  }

  async saveBlob(data: FormItem) {
    const dateTime = this.getCurrentDateTime();
    data.questionnaire.status = 'draft';
    data.questionnaire.date = this.getDateTime(dateTime, DATE_TIME_FULL_FORMAT);
    data.questionnaire.version = null;
    data.questionnaire.approvalDate = null;
    const form = Util.convertToQuestionnaireJSON(this.formService.convertFromR4(data.questionnaire, 'R4'));
    data.name = form.title;
    data.questionnaire = form;
    data.dateTime = this.getDateTime(dateTime, DATE_TIME_FORMAT);
    data.status = FormStatus.Draft;
    data.version = null;

    await this.updateBlob(data);
    this.toasterService.showMessage(`${data.questionnaire.title} has been saved`);
  }
  async publish(data: FormItem) {
    const dateTime = this.getCurrentDateTime();
    const form = Util.convertToQuestionnaireJSON(this.formService.convertFromR4(data.questionnaire, 'R4'));
    data.name = form.title;
    data.questionnaire = form;
    data.status = FormStatus.Active;
    data.dateTime = this.getDateTime(dateTime, DATE_TIME_FORMAT);
    data.version = await this.getNextVersion(data.name);
    data.questionnaire.status = 'active';
    data.questionnaire.approvalDate = this.getDateTime(dateTime, DATE_FORMAT);
    data.questionnaire.date = this.getDateTime(dateTime.utc(), DATE_TIME_FULL_FORMAT);
    data.questionnaire.version = data.version.toFixed(1);

    await this.updateBlob(data);
  }

  async download(formItem: FormItem): Promise<fhir.Questionnaire> {
    try {
      await this.refreshContainerClient();
      const blobClient = this.containerClient.getBlobClient(this.getBlobName(formItem));
      const downloadResponse = await blobClient.download();

      const downloadedBlob = await downloadResponse.blobBody;
      const form = await downloadedBlob.text();
      return JSON.parse(form);
    } catch (err) {
      console.error('Download the blob failed: ', err);
      this.toasterService.showMessage('Unable to download the form, please try again later', 'danger');
      throw err;
    }
  }
  private getBlobName(formItem: FormItem) {
    const blobName = `${formItem.name}.${formItem.version ? formItem.version + '.' : ''}${formItem.status}.${formItem.dateTime}.json`;
    console.log('Blob name: ', blobName);
    return blobName;
  }
  private getCurrentDateTime() {
    return moment().tz('America/Toronto');
  }
  private getDateTime(dateTime: moment.Moment, format: string) {
    return dateTime.format(format);
  }

  private parseBlobName(filename: string) {
    const matchStatus = filename.match(reg_status);
    return matchStatus.groups.status === StatusEnum.Active ? filename.match(regex) : filename.match(regex_no_ver);
  }

  private async getNextVersion(name: string) {
    const files = await this.listFiles(name);
    const versions = files.map(filename => {
        const match = this.parseBlobName(filename);
        if (!match || isNaN(Number(match.groups.version))) {
          return null;
        }
        return Number(match.groups.version);
      }
    ).filter(f => !!f);

    return versions.length === 0 ? 1 : Math.max(...versions) + 1;
  }

  private async blobWithDraftStatusExists(prefix: string) {
    const fileNames: string[] = [];
    let blobs = this.containerClient.listBlobsFlat({ prefix });
    for await (const blob of blobs) {
      if (blob.name.startsWith(`${prefix}.Draft`)) {
        return true;
      }
    }
    return false;
  }
}
