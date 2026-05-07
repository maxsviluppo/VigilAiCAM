import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none print:hidden">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="pointer-events-auto animate-slide-in-right bg-white rounded-xl shadow-2xl border-l-4 overflow-hidden max-w-sm"
             [class.border-l-emerald-500]="toast.type === 'success'"
             [class.border-l-red-500]="toast.type === 'error'"
             [class.border-l-orange-500]="toast.type === 'warning'"
             [class.border-l-blue-500]="toast.type === 'info'">
          
          <div class="p-4 flex items-start gap-3">
            <!-- Icon -->
            <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                 [class.bg-emerald-100]="toast.type === 'success'"
                 [class.text-emerald-600]="toast.type === 'success'"
                 [class.bg-red-100]="toast.type === 'error'"
                 [class.text-red-600]="toast.type === 'error'"
                 [class.bg-orange-100]="toast.type === 'warning'"
                 [class.text-orange-600]="toast.type === 'warning'"
                 [class.bg-blue-100]="toast.type === 'info'"
                 [class.text-blue-600]="toast.type === 'info'">
              @switch (toast.type) {
                @case ('success') { <i class="fa-solid fa-check text-lg"></i> }
                @case ('error') { <i class="fa-solid fa-circle-xmark text-lg"></i> }
                @case ('warning') { <i class="fa-solid fa-triangle-exclamation text-lg"></i> }
                @case ('info') { <i class="fa-solid fa-circle-info text-lg"></i> }
              }
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <h4 class="font-bold text-slate-800 text-sm">{{ toast.title }}</h4>
              <p class="text-xs text-slate-600 mt-0.5">{{ toast.message }}</p>
            </div>

            <!-- Close Button -->
            <button (click)="toastService.remove(toast.id)" 
                    class="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Progress Bar -->
          <div class="h-1 bg-slate-100">
            <div class="h-full transition-all ease-linear animate-shrink"
                 [class.bg-emerald-500]="toast.type === 'success'"
                 [class.bg-red-500]="toast.type === 'error'"
                 [class.bg-orange-500]="toast.type === 'warning'"
                 [class.bg-blue-500]="toast.type === 'info'"
                 [style.animation-duration.ms]="toast.duration"></div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slideInRight {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes shrink {
      from { width: 100%; }
      to { width: 0%; }
    }
    .animate-slide-in-right {
      animation: slideInRight 0.3s ease-out;
    }
    .animate-shrink {
      animation: shrink linear;
    }
  `]
})
export class ToastContainerComponent {
  toastService = inject(ToastService);
}
