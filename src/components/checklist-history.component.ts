import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../services/app-state.service';
import { ToastService } from '../services/toast.service';

@Component({
   selector: 'app-checklist-history',
   standalone: true,
   imports: [CommonModule],
   template: `
    <div class="space-y-6 max-w-7xl mx-auto p-4 animate-fade-in relative pb-20">
        
        <!-- Custom Delete Confirmation Modal -->
        @if (recordToDelete()) {
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
           <!-- Backdrop -->
           <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" (click)="cancelDelete()"></div>
           
           <!-- Modal Content -->
           <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-slide-up transform transition-all border border-slate-200">
              <div class="p-8 text-center">
                 <div class="w-16 h-16 rounded-full bg-red-50 text-red-500 mx-auto flex items-center justify-center mb-4 text-2xl border border-red-100">
                    <i class="fa-solid fa-trash-can"></i>
                 </div>
                 <h3 class="text-xl font-bold text-slate-800 mb-2">Elimina Registrazione?</h3>
                 <p class="text-slate-500 text-sm mb-8 leading-relaxed">Questa azione è irreversibile. La registrazione verrà rimossa permanentemente.</p>
                 
                 <div class="grid grid-cols-2 gap-3">
                    <button (click)="cancelDelete()" class="w-full py-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-100 transition-colors">
                       Annulla
                    </button>
                    <button (click)="executeDelete()" class="w-full py-3 rounded-lg bg-red-600 text-white font-bold text-sm hover:bg-red-700 shadow-sm transition-all">
                       ELIMINA
                    </button>
                 </div>
              </div>
           </div>
        </div>
        }

        <!-- Share Menu Modal -->
        @if (recordToShare()) {
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
           <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" (click)="recordToShare.set(null)"></div>
           
           <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-slide-up border border-slate-200">
              <!-- Header -->
              <div class="bg-indigo-50 border-b border-indigo-100 p-6 text-center relative flex flex-col items-center">
                 <button (click)="recordToShare.set(null)" class="absolute right-4 top-4 w-8 h-8 rounded-full bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-slate-200 flex items-center justify-center transition-colors">
                    <i class="fa-solid fa-times text-xs"></i>
                 </button>
                 <div class="w-14 h-14 rounded-xl bg-indigo-100 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto mb-3 text-2xl">
                    <i class="fa-solid fa-share-nodes"></i>
                 </div>
                 <h3 class="text-lg font-bold text-slate-800 mb-1">Condividi Checklist</h3>
                 <p class="text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                    {{ getModuleName(recordToShare().moduleId) }} - {{ recordToShare().timestamp | date:'dd/MM/yyyy' }}
                 </p>
              </div>

              <!-- Options Grid -->
              <div class="p-6 grid grid-cols-2 gap-3">
                 <button (click)="shareAction('whatsapp')" class="flex gap-3 items-center p-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left">
                    <div class="w-8 h-8 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                       <i class="fa-brands fa-whatsapp"></i>
                    </div>
                    <span class="text-xs font-bold text-slate-700">WhatsApp</span>
                 </button>

                 <button (click)="shareAction('email')" class="flex gap-3 items-center p-3 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left">
                    <div class="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                       <i class="fa-solid fa-envelope"></i>
                    </div>
                    <span class="text-xs font-bold text-slate-700">Email</span>
                 </button>

                 <button (click)="shareAction('chat')" class="flex gap-3 items-center p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left">
                    <div class="w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                       <i class="fa-solid fa-comments"></i>
                    </div>
                    <span class="text-xs font-bold text-slate-700">Chat</span>
                 </button>

                 <button (click)="shareAction('print')" class="flex gap-3 items-center p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all text-left">
                    <div class="w-8 h-8 rounded bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                       <i class="fa-solid fa-print"></i>
                    </div>
                    <span class="text-xs font-bold text-slate-700">Stampa PDF</span>
                 </button>
              </div>
           </div>
        </div>
        }
              <!-- Premium Header Banner -->
       <div class="bg-gradient-to-r from-indigo-700 via-blue-700 to-cyan-700 p-8 rounded-3xl shadow-xl border border-indigo-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden mb-6">
         <div class="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <i class="fa-solid fa-clock-rotate-left text-9xl text-white"></i>
         </div>
         
         <div class="relative z-10">
            <h2 class="text-3xl font-black text-white flex items-center tracking-tight">
               <span class="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mr-4 shadow-lg border border-white/30">
                  <i class="fa-solid fa-clock-rotate-left"></i>
               </span>
               Archivio Storico
            </h2>
            <div class="flex items-center gap-4 mt-2">
               <p class="text-indigo-100 text-sm font-medium ml-1">Cronologia e registro attività svolte</p>
            </div>
         </div>
 
         <!-- Filter Module Glassmorphism -->
         <div class="relative group z-10 w-full md:w-auto">
            <div class="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 flex flex-col justify-center min-w-[220px] shadow-lg">
               <label class="text-[9px] text-indigo-100 font-black uppercase tracking-widest mb-0.5 leading-none">Tipo Lista</label>
               <div class="relative">
                  <div class="absolute inset-y-0 left-0 flex items-center pointer-events-none text-white/50">
                    <i class="fa-solid fa-filter text-[10px]"></i>
                  </div>
                  <select [value]="filterModule()" (change)="filterModule.set($any($event.target).value)" 
                          class="bg-transparent text-white font-bold text-sm focus:outline-none cursor-pointer border-none p-0 pl-5 w-full appearance-none">
                     <option value="all" class="text-slate-800">Tutte le Liste</option>
                     <option value="pre-op-checklist" class="text-slate-800">Fase Pre-operativa</option>
                     <option value="operative-checklist" class="text-slate-800">Fase Operativa</option>
                     <option value="post-op-checklist" class="text-slate-800">Fase Post-operativa</option>
                     <option value="non-compliance" class="text-slate-800">Non Conformità (Chiuse)</option>
                  </select>
               </div>
            </div>
         </div>
       </div>

       <!-- Table Container -->
       <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="overflow-x-auto">
             <table class="w-full text-left text-sm whitespace-nowrap">
                <thead>
                   <tr class="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] tracking-wider font-bold">
                      <th class="py-4 pl-6 font-bold">Data & Ora</th>
                      <th class="py-4 font-bold">Tipo Lista</th>
                      <th class="py-4 font-bold">Esito</th>
                      <th class="py-4 text-right pr-6 font-bold">Azioni</th>
                   </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                   @for (record of filteredHistory(); track record.id) {
                      <tr class="group hover:bg-slate-50 transition-colors">
                         <!-- Date -->
                         <td class="py-3 pl-6 font-medium text-slate-700">
                            <div class="flex flex-col">
                               <span class="text-slate-800 font-bold text-sm">{{ record.timestamp | date:'dd/MM/yyyy' }}</span>
                               <span class="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{{ record.timestamp | date:'HH:mm' }}</span>
                            </div>
                         </td>
                         
                         <!-- Type -->
                         <td class="py-3">
                             <span [class]="'px-2.5 py-1 rounded font-bold text-[10px] uppercase tracking-wider border ' + 
                                (record.moduleId === 'non-compliance' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-slate-100 text-slate-600 border-slate-200')">
                                {{ getModuleName(record.moduleId) }}
                             </span>
                         </td>

                          <!-- Status -->
                          <td class="py-3">
                             <div class="flex flex-col gap-1">
                                <span class="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 w-fit border"
                                      [class.bg-emerald-50]="getRecordStatus(record) === 'Conforme'"
                                      [class.text-emerald-700]="getRecordStatus(record) === 'Conforme'"
                                      [class.border-emerald-200]="getRecordStatus(record) === 'Conforme'"
                                      
                                      [class.bg-red-50]="getRecordStatus(record) === 'Non Conforme'"
                                      [class.text-red-700]="getRecordStatus(record) === 'Non Conforme'"
                                      [class.border-red-200]="getRecordStatus(record) === 'Non Conforme'"
                                      
                                      [class.bg-slate-50]="getRecordStatus(record) === 'Completata' || getRecordStatus(record) === 'Chiusa'"
                                      [class.text-slate-600]="getRecordStatus(record) === 'Completata' || getRecordStatus(record) === 'Chiusa'"
                                      [class.border-slate-200]="getRecordStatus(record) === 'Completata' || getRecordStatus(record) === 'Chiusa'">
                                   <i class="fa-solid" 
                                      [class.fa-check]="getRecordStatus(record) === 'Conforme'" 
                                      [class.fa-triangle-exclamation]="getRecordStatus(record) === 'Non Conforme'"
                                      [class.fa-check-circle]="getRecordStatus(record) === 'Completata' || getRecordStatus(record) === 'Chiusa'"></i>
                                   {{ getRecordStatus(record) }}
                                </span>
                             </div>
                          </td>

                         <!-- Actions -->
                         <td class="py-3 text-right pr-6">
                            <div class="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button (click)="editRecord(record)" class="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 flex items-center justify-center transition-all shadow-sm" title="Vedi / Modifica">
                                  <i class="fa-solid fa-pen text-xs"></i>
                               </button>
                               <button (click)="openShareMenu(record)" class="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 flex items-center justify-center transition-all shadow-sm" title="Condividi">
                                  <i class="fa-solid fa-share-nodes text-xs"></i>
                               </button>
                               <button (click)="deleteRecord(record.id)" class="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 flex items-center justify-center transition-all shadow-sm ml-1" title="Elimina">
                                  <i class="fa-solid fa-trash-can text-xs"></i>
                               </button>
                            </div>
                         </td>
                      </tr>
                   }
                   @if (filteredHistory().length === 0) {
                      <tr>
                         <td colspan="4" class="py-16 text-center">
                            <div class="flex flex-col items-center gap-3">
                               <div class="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                                  <i class="fa-solid fa-folder-open text-2xl"></i>
                               </div>
                               <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Nessuna registrazione in archivio</p>
                            </div>
                         </td>
                      </tr>
                   }
                </tbody>
             </table>
          </div>
       </div>

    </div>
  `,
   styles: [`
  `]
})
export class ChecklistHistoryComponent {
   state = inject(AppStateService);
   filterModule = signal('all');

   filteredHistory = computed(() => {
      const checklists = this.state.filteredChecklistRecords().map(r => ({ ...r, type: 'checklist' }));
      const closedNCs = this.state.filteredNonConformities()
        .filter(nc => nc.status === 'CLOSED')
        .map(nc => ({
          id: nc.id,
          moduleId: 'non-compliance',
          clientId: nc.clientId,
          timestamp: nc.createdAt || nc.date,
          data: nc,
          type: 'non-compliance'
        }));
      
      let allRecords = [...checklists, ...closedNCs];
      
      const filter = this.filterModule();
      if (filter !== 'all') {
         if (filter === 'pre-op-checklist') {
            allRecords = allRecords.filter(r => r.moduleId === 'pre-op-checklist' || r.moduleId === 'pre-operative');
         } else {
            allRecords = allRecords.filter(r => r.moduleId === filter);
         }
      }
      return allRecords.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
   });

   getModuleName(id: string) {
      switch (id) {
         case 'pre-op-checklist': return 'Fase Pre-operativa';
         case 'pre-operative': return 'Fase Pre-operativa';
         case 'operative-checklist': return 'Fase Operativa';
         case 'operative': return 'Fase Operativa';
         case 'post-op-checklist': return 'Fase Post-operativa';
         case 'post-operative': return 'Fase Post-operativa';
         case 'non-compliance': return 'Non Conformità';
         default: return id;
      }
   }

   getRecordStatus(record: any): string {
      if (record.type === 'non-compliance') return 'Chiusa';
      const data = record.data;
      if (!data) return 'N.D.';

      // Extract items array if it exists (either directly array or inside items prop)
      let items: any[] = [];
      if (Array.isArray(data)) {
         items = data;
      } else if (data.items && Array.isArray(data.items)) {
         items = data.items;
      }

      // If we found items, calculate based on user logic
      if (items.length > 0) {
         const hasNonConformity = items.some(item => {
            // Check for common non-conformity patterns:
            // 1. checked === false (for simple checklists)
            // 2. status === 'issue' or status === 'pending' (for advanced checklists)
            if (Object.prototype.hasOwnProperty.call(item, 'checked')) {
               return !item.checked;
            }
            if (Object.prototype.hasOwnProperty.call(item, 'status')) {
               return item.status !== 'ok';
            }
            return false;
         });

         return hasNonConformity ? 'Non Conforme' : 'Conforme';
      }

      // Fallback: use explicit status if available
      if (data.status) return data.status;

      return 'Completata';
   }

   toast = inject(ToastService);
   recordToDelete = signal<string | null>(null);
   recordToShare = signal<any | null>(null);

   editRecord(record: any) {
      // Fix legacy moduleId for routing compatibility
      const targetRecord = { ...record };
      if (targetRecord.moduleId === 'pre-operative') {
         targetRecord.moduleId = 'pre-op-checklist';
      }
      this.state.startEditingRecord(targetRecord);
   }

   deleteRecord(id: string) {
      this.confirmDelete(id);
   }

   confirmDelete(id: string) {
      this.recordToDelete.set(id);
   }

   executeDelete() {
      const id = this.recordToDelete();
      if (id) {
         const record = this.filteredHistory().find(r => r.id === id);
         if (record && record.type === 'non-compliance') {
            this.state.deleteNonConformity(id);
         } else {
            this.state.deleteChecklist(id);
         }
         this.toast.success('Eliminato', 'Registrazione rimossa con successo.');
         this.recordToDelete.set(null);
      }
   }

   cancelDelete() {
      this.recordToDelete.set(null);
   }

   openShareMenu(record: any) {
      this.recordToShare.set(record);
   }

   shareAction(type: string) {
      const record = this.recordToShare();
      if (!record) return;

      const moduleName = this.getModuleName(record.moduleId);
      const dateStr = new Date(record.timestamp).toLocaleDateString('it-IT');

      switch (type) {
         case 'whatsapp':
            this.toast.info('Condivisione WhatsApp', 'Apertura WhatsApp in corso...');
            break;
         case 'email':
            this.toast.info('Invio Email', 'Preparazione report email...');
            break;
         case 'chat':
            this.toast.success('Inviato', 'Checklist condivisa nella chat aziendale.');
            break;
         case 'print':
            this.editRecord(record);
            setTimeout(() => {
               window.print();
            }, 500);
            break;
      }
      this.recordToShare.set(null);
   }
}
