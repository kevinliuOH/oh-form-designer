import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

@Component({
  selector: 'lfb-paginator',
  templateUrl: './paginator.component.html',
  styles: [`
    /* Remove focus outline (ring) for all pagination buttons */
    .pagination .page-link {
      outline: none; /* Removes the focus outline ring */
      box-shadow: none; /* Removes the box shadow that sometimes appears */
    }

    .pagination .page-link:focus {
      outline: none; /* Ensures the focus outline is removed on focus */
      box-shadow: none; /* Removes any additional shadow effects */
    }
  `]
})
export class PaginatorComponent implements OnInit {

  @Input()
  set totalEntries(val: number) {
    this._totalEntries = val;
    this.ngOnInit();
  }
  get totalEntries() {
    return this._totalEntries;
  }

  @Input() currentPage: number = 1;
  @Input() pageSize: number = 10;
  @Output() pageChange: EventEmitter<number> = new EventEmitter<number>();

  private _totalEntries: number = 0;

  totalPages: number = 0;
  pages: (number | string)[] = [];
  showEllipsis: boolean = false;

  get startItem() {
    return (this.currentPage - 1) * this.pageSize + 1;
  }
  get endItem() {
    return Math.min(this.startItem + this.pageSize - 1, this._totalEntries)
  }
  ngOnInit(): void {
    this.calculateTotalPages();
    this.updateVisiblePages();
  }

  calculateTotalPages(): void {
    this.totalPages = Math.ceil(this._totalEntries / this.pageSize);
  }

  updateVisiblePages(): void {
    this.pages = [];
    if (this.totalPages <= 5) {
      // Show all pages if total pages <= 5
      this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    } else {
      // Show first, last, current, and ellipses if necessary
      if (this.currentPage <= 3) {
        this.pages = [1, 2, 3, 4, 'ellipsis', this.totalPages];
      } else if (this.currentPage >= this.totalPages - 2) {
        this.pages = [1, 'ellipsis', this.totalPages - 3, this.totalPages - 2, this.totalPages - 1, this.totalPages];
      } else {
        this.pages = [1, 'ellipsis', this.currentPage - 1, this.currentPage, this.currentPage + 1, 'ellipsis', this.totalPages];
      }
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.pageChange.emit(this.currentPage);
      this.updateVisiblePages();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.pageChange.emit(this.currentPage);
      this.updateVisiblePages();
    }
  }

  goToPage(page: number = this.currentPage): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.pageChange.emit(this.currentPage);
      this.updateVisiblePages();
    }
  }
}
