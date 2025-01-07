import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginatorComponent } from './paginator.component';

describe('PaginatorComponent', () => {
  let component: PaginatorComponent;
  let fixture: ComponentFixture<PaginatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PaginatorComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PaginatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate total pages correctly', () => {
    component.pageSize = 10;
    component.totalEntries = 50;
    component.calculateTotalPages();
    expect(component.totalPages).toBe(5);
  });

  it('should calculate visible pages when totalPages <= 5', () => {
    component.pageSize = 10;
    component.totalEntries = 50;
    component.ngOnInit();
    expect(component.pages.length).toBe(5);
    expect(component.showEllipsis).toBeFalse();
  });

  it('should calculate visible pages and show ellipsis when totalPages > 5', () => {
    component.pageSize = 10;
    component.totalEntries = 100;
    component.ngOnInit();
    expect(component.pages.length).toBeLessThanOrEqual(6);
  });

  it('should update item range correctly', () => {
    component.pageSize = 10;
    component.currentPage = 2;
    component.totalEntries = 100;
    expect(component.startItem).toBe(11);
    expect(component.endItem).toBe(20);
  });

  it('should emit pageChange when nextPage is called', () => {
    spyOn(component.pageChange, 'emit');
    component.currentPage = 1;
    component.totalEntries = 30;
    component.pageSize = 10;
    component.calculateTotalPages();

    component.nextPage();
    expect(component.pageChange.emit).toHaveBeenCalledWith(2);
    expect(component.currentPage).toBe(2);
  });

  it('should not go beyond last page when nextPage is called', () => {
    component.currentPage = 3;
    component.totalEntries = 30;
    component.pageSize = 10;
    component.calculateTotalPages();

    component.nextPage();
    expect(component.currentPage).toBe(3); // No change, as it's the last page
  });

  it('should emit pageChange when previousPage is called', () => {
    spyOn(component.pageChange, 'emit');
    component.currentPage = 2;
    component.totalEntries = 30;
    component.pageSize = 10;
    component.calculateTotalPages();

    component.previousPage();
    expect(component.pageChange.emit).toHaveBeenCalledWith(1);
    expect(component.currentPage).toBe(1);
  });

  it('should not go below first page when previousPage is called', () => {
    component.currentPage = 1;
    component.totalEntries = 30;
    component.pageSize = 10;
    component.calculateTotalPages();

    component.previousPage();
    expect(component.currentPage).toBe(1); // No change, as it's the first page
  });

  it('should go to a specific page when goToPage is called', () => {
    spyOn(component.pageChange, 'emit');
    component.pageSize = 10;
    component.totalEntries = 100;
    component.calculateTotalPages();

    component.goToPage(3);
    expect(component.currentPage).toBe(3);
    expect(component.pageChange.emit).toHaveBeenCalledWith(3);
  });

  it('should not go to an invalid page when goToPage is called', () => {
    spyOn(component.pageChange, 'emit');
    component.pageSize = 10;
    component.totalEntries = 100;
    component.calculateTotalPages();

    component.goToPage(0); // Invalid page number
    expect(component.currentPage).not.toBe(0);
    expect(component.pageChange.emit).not.toHaveBeenCalled();
  });
});
