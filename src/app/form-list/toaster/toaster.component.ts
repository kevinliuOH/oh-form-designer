import { Component, OnInit } from '@angular/core';
import { Toast, ToasterService } from "../../services/toaster.service";

@Component({
  selector: 'lfb-toaster',
  templateUrl: './toaster.component.html',
  styles: [`
    .toast-container {
      z-index: 1050;
    }
  `]
})
export class ToasterComponent implements OnInit {
  toasts: Toast[] = [];

  constructor(private toasterService: ToasterService) {}

  ngOnInit(): void {
    // Subscribe to the toastAdded event
    this.toasterService.toasted.subscribe((toast: Toast) => {
      if (this.toasts.filter(t => t.message === toast.message).length === 0) {
        this.toasts.push(toast);
      }
      setTimeout(() => this.toasts = this.toasts.filter(t => t !== toast), toast.duration);
    });
  }
}
