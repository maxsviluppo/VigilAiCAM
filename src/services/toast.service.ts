import { Injectable, signal } from '@angular/core';

export interface Toast {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    duration?: number;
}

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    toasts = signal<Toast[]>([]);

    show(toast: Omit<Toast, 'id'>) {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast: Toast = { ...toast, id, duration: toast.duration || 4000 };

        this.toasts.update(toasts => [...toasts, newToast]);

        // Auto-remove after duration
        setTimeout(() => {
            this.remove(id);
        }, newToast.duration);
    }

    success(title: string, message: string) {
        this.show({ type: 'success', title, message });
    }

    error(title: string, message: string) {
        this.show({ type: 'error', title, message, duration: 6000 });
    }

    warning(title: string, message: string) {
        this.show({ type: 'warning', title, message, duration: 5000 });
    }

    info(title: string, message: string) {
        this.show({ type: 'info', title, message });
    }

    remove(id: string) {
        this.toasts.update(toasts => toasts.filter(t => t.id !== id));
    }
}
