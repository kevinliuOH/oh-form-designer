import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from "@angular/core";
import { FormItem, StorageService } from "../services/storage.service";
import { MatSort } from "@angular/material/sort";
import { MatTableDataSource } from "@angular/material/table";
import { GuidingStep } from "../lib/util";
import { FormService } from "../services/form.service";
import { faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { FormModalComponent } from "../modals/form-modal/form-modal.component";
import { MessageType } from "../lib/widgets/message-dlg/message-dlg.component";
import { BehaviorSubject } from "rxjs";
import { ToasterService } from "../services/toaster.service";
import { MatDialog } from "@angular/material/dialog";
import { Roles } from "../lib/constants";

export enum StatusEnum {
  Active = 'Active',
  Draft = 'Draft'
}

@Component({
  selector: 'lfb-form-list',
  templateUrl: './form-list.component.html',
  providers: [],
  styleUrls: ['./form-list.component.css']
})
export class FormListComponent implements AfterViewInit {
  protected readonly StatusEnum = StatusEnum;
  displayedColumns: string[] = ['name', 'version', 'status', 'dateTime'];
  dataSource = new MatTableDataSource<FormItem>();
  @ViewChild(MatSort) sort: MatSort;
  @Input() roles?: Roles[];
  @Output() downloaded = new EventEmitter<FormItem>();
  formDeleteIcon = faTrashCan;
  errorMessage: string | null = null;
  spinner$ = new BehaviorSubject<boolean>(false);
  fullDataSet: FormItem[] = [];
  currentDataSet: FormItem[] = [];
  pageSize = 10;
  currentPage = 1;
  filterValue?: string;
  get isApprover() {
    return this.roles?.includes(Roles.APPROVER);
  }

  get isBuilder() {
    return this.roles?.includes(Roles.BUILDER);
  }
  constructor(private storageService: StorageService,
              private toasterService: ToasterService,
              formService: FormService, private modalService: NgbModal,
              public dialog: MatDialog) {
    formService.guidingStep$.subscribe((step: GuidingStep) => {
      if (step === 'list') {
        this.getExistingForms();
      }
    });
  }

  private getExistingForms() {
    this.startSpinner();
    this.storageService.list().then((data: FormItem[]) => {
        this.fullDataSet = this.currentDataSet = this.dataSource.data = data;
        this.sort.active = 'dateTime';
        this.sort.direction = 'desc';
        this.sort.sortChange.emit();
        this.onPageChange(this.currentPage);
        this.stopSpinner();
      },
      (error) => {
        this.stopSpinner();
        this.toasterService.showMessage('Unable to get the form list, please try again later', 'danger');
      });
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;

    // Custom filter predicate to handle string and numeric fields
    this.dataSource.filterPredicate = (data: FormItem, filter: string) => {
      const filterValue = filter.trim().toLowerCase();
      // Stringify the fields and filter
      const searchData = `${data.name.toLowerCase()}${data.status.toLowerCase()}${data.dateTime}${data.version ? data.version.toFixed(2).toString() : ''}`;
      return searchData.includes(filterValue);
    };

    this.getExistingForms();

  }

  startSpinner() {
    setTimeout(() => this.spinner$.next(true));
  }

  stopSpinner() {
    setTimeout(() => this.spinner$.next(false));
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.applyPagination();
  }

  applyPagination() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.dataSource.data = this.currentDataSet.slice(start, end);
  }

  applyFilter(event: Event) {
    this.currentPage = 1;  // Reset to first page after filter
    this.filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.filter();
    this.applyPagination();
  }

  filter() {
    this.dataSource.data = this.fullDataSet;
    this.dataSource.filter = this.filterValue;
    if (this.dataSource.filter) {
      this.currentDataSet = this.dataSource.filteredData;
    } else {
      this.dataSource.filteredData = this.dataSource.data = this.currentDataSet = this.fullDataSet;
    }
  }
  sortData() {
    this.currentPage = 1;
    this.dataSource.sort = this.sort;
    this.dataSource.data = this.dataSource.sortData(this.fullDataSet, this.dataSource.sort);
    this.filter();
    this.applyPagination();
  }

  async onClick(element: FormItem) {
    try {
      this.startSpinner();
      element.questionnaire = await this.storageService.download(element);
      this.stopSpinner();
      setTimeout(() => this.downloaded.emit(element));
    } catch {
      this.toasterService.showMessage('Unable to open the form, please try again later', 'danger');
      this.stopSpinner();
    }
  }

  confirmFormDelete(formItem: FormItem): Promise<any> {
    const modalRef = this.modalService.open(FormModalComponent);
    modalRef.componentInstance.title = 'Confirm Form deletion';
    modalRef.componentInstance.message = 'Are you sure you want to delete this Form?';
    modalRef.componentInstance.type = MessageType.WARNING;
    return modalRef.result.then(
      (result) => {
        if (result) {
          this.deleteForm(formItem);
        }
      },
      (reason) => {
        console.log('Dismissed:', reason);
      }
    );
  }

  deleteForm(form: FormItem) {
    this.storageService.deleteForm(form).then((successFlag: boolean) => {
      if (successFlag) {
        console.log('Deleted the file successfully!', successFlag);
        this.getExistingForms();
        this.toasterService.showMessage(`${form.name} has been deleted`);
      } else {
        console.log('Failed to delete the file!:', successFlag);
        this.toasterService.showMessage(`Failed to delete the ${form.name}, please try again later`, 'danger');
      }
    },
    (error) => {
      console.error('Error fetching data:', error);
    }
  );

  }

  downloadForm(formItem: FormItem) {
    this.downloadTemplate(formItem)
    .then(() => this.errorMessage = null)
    .catch(error => this.errorMessage = `Error: ${error.message}. Please try again later.`);
  }

  async downloadTemplate(formItem: FormItem): Promise<void> {
    let fullFileName: string = formItem.name + '.' + formItem.status + '.' + formItem.dateTime + '.json';
    const form = await this.storageService.download(formItem);
    formItem.questionnaire = form;
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // JSON download a 10% chance of failure
        if (Math.random() < 0.1) {
          reject(new Error('Network failure'));
        } else {
          // JSON file format and download
          const blob = new Blob([JSON.stringify(formItem.questionnaire, null, 2)], {type: 'application/json'});
          const url = URL.createObjectURL(blob);
          // Create a temporary link element
          const a = document.createElement('a');
          a.href = url;
          a.download = fullFileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          resolve();
        }
      }, 1000);
    });
  }
}
