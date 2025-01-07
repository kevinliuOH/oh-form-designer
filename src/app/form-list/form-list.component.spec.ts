import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSortModule } from '@angular/material/sort';
import { FormListComponent, StatusEnum } from './form-list.component';
import { StorageService } from '../services/storage.service';
import { FormService } from '../services/form.service';
import { of, BehaviorSubject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

describe('FormListComponent', () => {
  let component: FormListComponent;
  let fixture: ComponentFixture<FormListComponent>;
  let storageServiceSpy: any;
  let formServiceSpy: any;
  let dialogSpy: any;
  let modalServiceSpy: any;

  const mockForms: any[] = [
    { name: 'Form 1', version: '1.0', status: StatusEnum.Active, dateTime: '2021-09-01' },
    { name: 'Form 2', version: '1.1', status: StatusEnum.Draft, dateTime: '2021-09-02' },
  ];

  beforeEach(async () => {
    const storageSpy = jasmine.createSpyObj('StorageService', ['list', 'download', 'deleteForm']);
    const formServiceMock = jasmine.createSpyObj('FormService', ['guidingStep$']);
    const dialogMock = jasmine.createSpyObj('MatDialog', ['open']);
    const modalServiceMock = jasmine.createSpyObj('NgbModal', ['open']);

    formServiceMock.guidingStep$ = new BehaviorSubject('list');

    await TestBed.configureTestingModule({
      declarations: [FormListComponent],
      imports: [MatTableModule, MatSortModule, MatDialogModule],
      providers: [
        { provide: StorageService, useValue: storageSpy },
        { provide: FormService, useValue: formServiceMock },
        { provide: MatDialog, useValue: dialogMock },
        { provide: NgbModal, useValue: modalServiceMock }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(FormListComponent);
    component = fixture.componentInstance;
    storageServiceSpy = TestBed.inject(StorageService);
    formServiceSpy = TestBed.inject(FormService);
    dialogSpy = TestBed.inject(MatDialog);
    modalServiceSpy = TestBed.inject(NgbModal);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call getExistingForms on initialization', fakeAsync(() => {
    storageServiceSpy.list.and.returnValue(Promise.resolve(mockForms));
    component.ngAfterViewInit();
    tick();
    expect(storageServiceSpy.list).toHaveBeenCalled();
    expect(component.dataSource.data).toEqual(mockForms);
  }));

  it('should handle pagination correctly', () => {
    // Ensure currentDataSet and fullDataSet are initialized with mockForms data
    component.fullDataSet = mockForms;
    component.currentDataSet = mockForms;  // This is essential for pagination

    // Set the page size to 1 to simulate pagination (each page shows 1 item)
    component.pageSize = 1;

    // Move to the second page
    component.onPageChange(2);

    // Expect the second item in the mockForms to be displayed
    expect(component.dataSource.data.length).toEqual(1);  // Only one item should be on page 2
    expect(component.dataSource.data[0]).toEqual(mockForms[1]);  // The item on page 2 should be 'Form 2'
  });


  it('should handle filter correctly', () => {
    component.fullDataSet = mockForms;
    const filterEvent: any = { target: { value: 'Form 1' } };
    component.applyFilter(filterEvent);
    expect(component.dataSource.filteredData).toEqual([mockForms[0]]);
  });

  it('should show spinner when startSpinner is called', fakeAsync(() => {
    component.startSpinner();
    tick();
    expect(component.spinner$.value).toBeTrue();
  }));

  it('should hide spinner when stopSpinner is called', fakeAsync(() => {
    component.stopSpinner();
    tick();
    expect(component.spinner$.value).toBeFalse();
  }));

  it('should call storageService.deleteForm when deleteForm is called', fakeAsync(() => {
    // Ensure list is mocked properly to prevent the error during initialization
    storageServiceSpy.list.and.returnValue(Promise.resolve(mockForms));

    // Now mock deleteForm to return a resolved promise
    storageServiceSpy.deleteForm.and.returnValue(Promise.resolve(true));

    // Trigger the deleteForm method
    component.deleteForm(mockForms[0]);

    tick();  // Simulate async passage of time

    // Expect deleteForm to have been called on the storage service
    expect(storageServiceSpy.deleteForm).toHaveBeenCalledWith(mockForms[0]);
  }));

  it('should show error message on failed form download', fakeAsync(() => {
    storageServiceSpy.download.and.returnValue(Promise.reject(new Error('Network failure')));
    component.downloadForm(mockForms[0]);
    tick();
    expect(component.errorMessage).toBe('Error: Network failure. Please try again later.');
  }));

  it('should emit the downloaded form item on successful download', fakeAsync(() => {
    const downloadEmitSpy = spyOn(component.downloaded, 'emit');
    storageServiceSpy.download.and.returnValue(Promise.resolve(mockForms[0]));
    component.onClick(mockForms[0]);
    tick();
    expect(downloadEmitSpy).toHaveBeenCalledWith(mockForms[0]);
  }));

  it('should confirm form deletion', fakeAsync(() => {
    // Create a mock for the modalRef with a componentInstance
    const mockModalRef: any = {
      componentInstance: {
        title: '',
        message: '',
        type: ''
      },
      result: Promise.resolve(true)  // Simulate user confirming the deletion
    };

    // Mock the open method of NgbModal to return the mockModalRef
    modalServiceSpy.open.and.returnValue(mockModalRef);

    const deleteFormSpy = spyOn(component, 'deleteForm');

    // Call confirmFormDelete
    component.confirmFormDelete(mockForms[0]);

    tick();  // Simulate async time

    // Check that deleteForm was called after the modal was confirmed
    expect(deleteFormSpy).toHaveBeenCalledWith(mockForms[0]);
  }));

});
