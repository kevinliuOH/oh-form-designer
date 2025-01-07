import { EventEmitter, Injectable } from '@angular/core';

export type ToastType = 'success' | 'warning' | 'info' | 'danger';

export interface Toast {
  message: string;
  type: ToastType;
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToasterService {
  toasted = new EventEmitter<Toast>();
  showMessage(message: string, type: ToastType = 'success', duration: number = 3000): void {
    this.toasted.emit({ message, type, duration });
  }
}
