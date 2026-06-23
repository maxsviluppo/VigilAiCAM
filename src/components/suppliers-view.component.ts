import { Component, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppStateService } from '../services/app-state.service';

interface Supplier {
  id: string;
  ragioneSociale: string;
  responsabile: string;
  piva: string;
  telefono: string;
  email: string;
  indirizzo: string;
  status: 'pending' | 'ok' | 'issue';
  note?: string;
}

@Component({
  selector: 'app-suppliers-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fade-in p-4 pb-12 max-w-7xl mx-auto">
      
      <!-- App-style Header -->
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div class="flex items-center gap-4">
          <div class="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl shadow-sm border border-indigo-100/50">
            <i class="fa-solid fa-truck-field"></i>
          </div>
          <div>
            <h2 class="text-xl font-bold text-slate-800 tracking-tight">Anagrafica Fornitori</h2>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Gestione & Qualifica Aziendale</p>
          </div>
        </div>
        
        <div class="flex items-center gap-4 w-full sm:w-auto">
          <div class="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 flex items-center gap-3 shrink-0">
             <span class="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                <i class="fa-solid fa-users"></i> {{ suppliers().length }} Aziende
             </span>
          </div>
          <button (click)="isAddModalOpen.set(true)" 
                  class="flex-1 sm:flex-none h-10 px-6 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95">
            <i class="fa-solid fa-plus"></i> NUOVO
          </button>
        </div>
      </div>

      <!-- Compact App-style Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (s of suppliers(); track s.id) {
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-all group flex flex-col relative overflow-hidden">
             <!-- Status Accent Bar -->
             <div class="absolute left-0 top-0 bottom-0 w-1"
                  [class.bg-emerald-500]="s.status === 'ok'"
                  [class.bg-rose-500]="s.status === 'issue'"
                  [class.bg-slate-300]="s.status === 'pending'"></div>

             <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                   <div class="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                      <i class="fa-solid fa-building text-lg"></i>
                   </div>
                   <div class="min-w-0">
                      <h3 class="text-sm font-bold text-slate-800 truncate leading-tight">{{ s.ragioneSociale }}</h3>
                      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">P.IVA: {{ s.piva }}</p>
                   </div>
                </div>
                
                <div class="flex gap-1">
                   <button (click)="removeSupplier(s.id)" class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100">
                      <i class="fa-solid fa-trash-can text-[10px]"></i>
                   </button>
                </div>
             </div>

             <div class="bg-slate-50/50 rounded-xl p-3 space-y-2.5 mb-5 border border-slate-100/50">
                <div class="flex items-center justify-between gap-4">
                   <div class="flex items-center gap-2 min-w-0">
                      <i class="fa-solid fa-user-tie text-[10px] text-slate-300"></i>
                      <span class="text-[11px] font-medium text-slate-600 truncate">{{ s.responsabile }}</span>
                   </div>
                   <div class="flex items-center gap-2 shrink-0">
                      <i class="fa-solid fa-phone text-[10px] text-slate-300"></i>
                      <span class="text-[11px] font-medium text-slate-600">{{ s.telefono }}</span>
                   </div>
                </div>
                <div class="flex items-center gap-2">
                   <i class="fa-solid fa-envelope text-[10px] text-slate-300"></i>
                   <span class="text-[11px] font-medium text-slate-600 truncate">{{ s.email }}</span>
                </div>
             </div>

             <div class="mt-auto flex items-center justify-between gap-3 pt-3 border-t border-slate-50">
                <div class="flex gap-1.5">
                   <button (click)="setStatus(s.id, 'ok')" 
                           class="h-8 px-3 rounded-lg flex items-center justify-center gap-2 transition-all border text-[10px] font-bold uppercase tracking-wider shadow-sm"
                           [class.bg-emerald-600]="s.status === 'ok'" [class.text-white]="s.status === 'ok'" [class.border-emerald-600]="s.status === 'ok'"
                           [class.bg-white]="s.status !== 'ok'" [class.text-slate-400]="s.status !== 'ok'" [class.border-slate-200]="s.status !== 'ok'" [class.hover:border-emerald-500]="s.status !== 'ok'" [class.hover:text-emerald-500]="s.status !== 'ok'">
                      <i class="fa-solid fa-check"></i> OK
                   </button>
                   <button (click)="setStatus(s.id, 'issue')" 
                           class="h-8 px-3 rounded-lg flex items-center justify-center gap-2 transition-all border text-[10px] font-bold uppercase tracking-wider shadow-sm"
                           [class.bg-rose-600]="s.status === 'issue'" [class.text-white]="s.status === 'issue'" [class.border-rose-600]="s.status === 'issue'"
                           [class.bg-white]="s.status !== 'issue'" [class.text-slate-400]="s.status !== 'issue'" [class.border-slate-200]="s.status !== 'issue'" [class.hover:border-rose-500]="s.status !== 'issue'" [class.hover:text-rose-500]="s.status !== 'issue'">
                      <i class="fa-solid fa-triangle-exclamation"></i> KO
                   </button>
                </div>
                
                <span class="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md"
                      [class.bg-slate-100]="s.status === 'pending'" [class.text-slate-500]="s.status === 'pending'"
                      [class.bg-emerald-100]="s.status === 'ok'" [class.text-emerald-600]="s.status === 'ok'"
                      [class.bg-rose-100]="s.status === 'issue'" [class.text-rose-600]="s.status === 'issue'">
                   {{ s.status === 'ok' ? 'Approvato' : (s.status === 'issue' ? 'Segnalato' : 'In Attesa') }}
                </span>
             </div>
          </div>
        } @empty {
          <div class="col-span-full bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-12 text-center group cursor-pointer hover:bg-slate-100/50 transition-colors" (click)="isAddModalOpen.set(true)">
            <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100 text-slate-300 group-hover:text-indigo-500 transition-colors">
               <i class="fa-solid fa-truck-ramp-box text-xl"></i>
            </div>
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Nessun fornitore in archivio</p>
            <p class="text-[10px] text-slate-400 mt-1">Clicca per aggiungere la prima azienda</p>
          </div>
        }
      </div>

      <!-- Add Supplier Modal (Modern App Style) -->
      @if (isAddModalOpen()) {
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" (click)="isAddModalOpen.set(false)"></div>
          <div class="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-up border border-slate-200">
            <div class="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div class="flex items-center gap-3">
                 <div class="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-sm shadow-md shadow-indigo-100">
                    <i class="fa-solid fa-plus"></i>
                 </div>
                 <h3 class="font-bold text-slate-800 tracking-tight">Nuovo Fornitore</h3>
              </div>
              <button (click)="isAddModalOpen.set(false)" class="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors border border-slate-100 bg-white">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Ragione Sociale</label>
                <div class="relative">
                   <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300">
                      <i class="fa-solid fa-building text-xs"></i>
                   </div>
                   <input [(ngModel)]="newSupplier.ragioneSociale" type="text" placeholder="Nome Azienda Srl..." 
                          class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-slate-700 focus:bg-white focus:border-indigo-400 outline-none transition-all shadow-inner">
                </div>
              </div>
              
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Partita IVA</label>
                  <input [(ngModel)]="newSupplier.piva" type="text" placeholder="IT..." 
                         class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:bg-white focus:border-indigo-400 outline-none transition-all shadow-inner">
                </div>
                <div class="space-y-1.5">
                  <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Responsabile</label>
                  <input [(ngModel)]="newSupplier.responsabile" type="text" placeholder="Nome Cognome" 
                         class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:bg-white focus:border-indigo-400 outline-none transition-all shadow-inner">
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email</label>
                  <input [(ngModel)]="newSupplier.email" type="email" placeholder="azienda@info.it" 
                         class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:bg-white focus:border-indigo-400 outline-none transition-all shadow-inner">
                </div>
                <div class="space-y-1.5">
                  <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Telefono</label>
                  <input [(ngModel)]="newSupplier.telefono" type="text" placeholder="+39..." 
                         class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:bg-white focus:border-indigo-400 outline-none transition-all shadow-inner">
                </div>
              </div>

              <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Indirizzo Sede Legale</label>
                <div class="relative">
                   <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300">
                      <i class="fa-solid fa-location-dot text-xs"></i>
                   </div>
                   <input [(ngModel)]="newSupplier.indirizzo" type="text" placeholder="Via/Piazza, CAP Città" 
                          class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-slate-700 focus:bg-white focus:border-indigo-400 outline-none transition-all shadow-inner">
                </div>
              </div>
            </div>

            <div class="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
              <button (click)="isAddModalOpen.set(false)" class="flex-1 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all">Annulla</button>
              <button (click)="addSupplier()" class="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100">SALVA ANAGRAFICA</button>
            </div>
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal (Modern & Safe) -->
      @if (supplierToDelete()) {
        <div class="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" (click)="supplierToDelete.set(null)"></div>
          <div class="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-slide-up border border-slate-200">
            <div class="p-8 text-center">
              <div class="h-16 w-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center text-2xl mx-auto mb-4 border border-rose-100 shadow-sm animate-pulse">
                <i class="fa-solid fa-trash-can"></i>
              </div>
              <h3 class="text-lg font-bold text-slate-800 mb-2">Conferma Eliminazione</h3>
              <p class="text-sm text-slate-500 leading-relaxed mb-6">
                Sei sicuro di voler rimuovere <span class="font-bold text-slate-700">{{ supplierToDelete()?.ragioneSociale }}</span>?<br>
                Questa operazione non può essere annullata.
              </p>
              
              <div class="flex gap-3">
                <button (click)="supplierToDelete.set(null)" 
                        class="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">
                  No, Annulla
                </button>
                <button (click)="confirmDelete()" 
                        class="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-md shadow-rose-100">
                  Sì, Elimina
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-slide-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .animate-slide-down { animation: slideDown 0.3s ease-out; }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    .custom-scrollbar::-webkit-scrollbar { width: 5px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
    `]
})
export class SuppliersViewComponent {
  state = inject(AppStateService);
  moduleId = 'suppliers';

  suppliers = signal<Supplier[]>([]);
  isAddModalOpen = signal(false);
  supplierToDelete = signal<Supplier | null>(null);

  newSupplier = {
    ragioneSociale: '',
    responsabile: '',
    piva: '',
    telefono: '',
    email: '',
    indirizzo: ''
  };

  constructor() {
    effect(() => {
      this.state.filterDate();
      this.state.filterCollaboratorId();
      this.state.currentUser();
      this.loadData();
    }, { allowSignalWrites: true });
  }

  loadData() {
    const savedData = this.state.getRecord(this.moduleId);
    if (savedData && Array.isArray(savedData)) {
      this.suppliers.set(savedData);
    } else {
      this.suppliers.set([]);
    }
  }

  addSupplier() {
    if (!this.newSupplier.ragioneSociale) return;

    const supplier: Supplier = {
      id: Date.now().toString(),
      ...this.newSupplier,
      status: 'pending',
      note: ''
    };

    this.suppliers.update(current => [...current, supplier]);
    this.saveData();

    // Reset form
    this.newSupplier = {
      ragioneSociale: '',
      responsabile: '',
      piva: '',
      telefono: '',
      email: '',
      indirizzo: ''
    };
    this.isAddModalOpen.set(false);
  }

  removeSupplier(id: string) {
    const supplier = this.suppliers().find(s => s.id === id);
    if (supplier) {
      this.supplierToDelete.set(supplier);
    }
  }

  confirmDelete() {
    const supplier = this.supplierToDelete();
    if (!supplier) return;

    this.suppliers.update(current => current.filter(s => s.id !== supplier.id));
    this.saveData();
    this.supplierToDelete.set(null);
  }

  setStatus(id: string, status: 'ok' | 'issue') {
    this.suppliers.update(current => current.map(s => {
      if (s.id === id) {
        return { ...s, status: s.status === status ? 'pending' : status };
      }
      return s;
    }));
    this.saveData();
  }

  onNoteUpdate() {
    this.saveData();
  }

  private saveData() {
    this.state.saveRecord(this.moduleId, this.suppliers());
  }
}
