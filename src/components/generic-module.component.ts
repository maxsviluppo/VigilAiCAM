
import { Component, inject, computed, input, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AppStateService, MenuItem } from '../services/app-state.service';

interface MockData {
  id: number;
  date: string;
  operator: string;
  operatorId: string;
  detail: string;
  status: 'Conforme' | 'Attenzione' | 'Non Conforme';
  clientId: string;
}

@Component({
  selector: 'app-generic-module',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6 pb-10">
      <!-- Enhanced Generic Header -->
      <div class="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-700 relative overflow-hidden">
        <div class="absolute inset-0 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>
        <div class="relative z-10 font-sans">
          <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <span class="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-slate-300 backdrop-blur-md">
                  {{ moduleInfo()?.category }}
                </span>
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span class="text-xs font-bold text-emerald-400">Modulo Attivo</span>
              </div>
              
              <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center shadow-lg border border-white/10 group-hover:scale-110 transition-transform duration-300">
                  <i [class]="'fa-solid ' + (moduleInfo()?.icon || 'fa-folder') + ' text-white text-2xl'"></i>
                </div>
                <div>
                  <h2 class="text-3xl font-black text-white tracking-tight leading-none mb-1">
                    {{ moduleInfo()?.label }}
                  </h2>
                  <p class="text-slate-400 text-sm font-medium">Gestione operativa e archivio digitale</p>
                </div>
              </div>
            </div>
            
            <div class="flex flex-wrap gap-3">
              <button class="px-5 py-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl font-bold transition-all flex items-center gap-2 backdrop-blur-sm shadow-lg group">
                <i class="fa-solid fa-file-export group-hover:-translate-y-1 transition-transform"></i>
                <span class="hidden sm:inline">Export Dati</span>
              </button>
              
              <button (click)="openModal()" class="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-blue-500/25 flex items-center gap-2 group border border-white/10">
                <i class="fa-solid fa-plus group-hover:rotate-90 transition-transform"></i>
                <span>Nuova Registrazione</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Active Filter Badge -->
      @if (state.isAdmin() && state.filterClientId()) {
         <div class="bg-indigo-50 border border-indigo-100 text-indigo-800 px-4 py-3 rounded-xl flex items-center justify-between animate-fade-in mb-6">
           <div class="flex items-center gap-2">
             <i class="fa-solid fa-building-circle-check"></i>
             <span class="text-sm font-medium">Visualizzazione Sede: <strong>{{ getCompanyName() }}</strong></span>
           </div>
           <button (click)="state.setClientFilter(null)" class="text-xs hover:underline">Cambia Sede</button>
         </div>
      }

      @if (state.filterCollaboratorId()) {
         <div class="bg-blue-50 border border-blue-100 text-blue-800 px-4 py-3 rounded-xl flex items-center justify-between animate-fade-in">
           <div class="flex items-center gap-2">
             <i class="fa-solid fa-id-card"></i>
             <span class="text-sm font-medium">Operatore: <strong>{{ getFilterName() }}</strong></span>
           </div>
           <button (click)="state.setCollaboratorFilter('')" class="text-xs hover:underline">Tutti gli Operatori</button>
         </div>
      }

      <!-- Data Table -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 text-slate-700 uppercase font-semibold text-xs border-b border-slate-200">
              <tr>
                <th class="px-6 py-4">Data & Ora</th>
                <th class="px-6 py-4">Operatore</th>
                <th class="px-6 py-4">Dettagli / Oggetto</th>
                <th class="px-6 py-4">Stato</th>
                <th class="px-6 py-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (item of filteredData(); track item.id) {
                <tr class="hover:bg-slate-50 transition-colors animate-fade-in">
                  <td class="px-6 py-4 whitespace-nowrap font-mono text-xs">{{ item.date }}</td>
                  <td class="px-6 py-4 font-medium text-slate-800">
                    <div class="flex items-center gap-2">
                      <div class="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                        {{ getInitials(item.operator) }}
                      </div>
                      {{ item.operator }}
                    </div>
                  </td>
                  <td class="px-6 py-4">{{ item.detail }}</td>
                  <td class="px-6 py-4">
                    <span [class]="getStatusClass(item.status)">
                      {{ item.status }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <button class="text-slate-400 hover:text-blue-600 mx-1"><i class="fa-solid fa-eye"></i></button>
                    <button class="text-slate-400 hover:text-slate-600 mx-1"><i class="fa-solid fa-pen"></i></button>
                  </td>
                </tr>
              } @empty {
                <tr>
                   <td colspan="5" class="px-6 py-12 text-center text-slate-400">
                      <i class="fa-solid fa-folder-open text-3xl mb-3 opacity-50"></i>
                      <p>Nessun record trovato per questo filtro.</p>
                   </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        
        <!-- Pagination Mock -->
        <div class="px-6 py-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
          <span>Visualizzazione {{ filteredData().length }} di {{ items().length }} record</span>
          <div class="flex gap-2">
            <button class="p-1 px-2 rounded hover:bg-slate-100 disabled:opacity-50"><i class="fa-solid fa-chevron-left"></i></button>
             <button class="p-1 px-2 rounded hover:bg-slate-100"><i class="fa-solid fa-chevron-right"></i></button>
          </div>
        </div>
      </div>

      <!-- New Record Modal -->
      @if (isModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" (click)="closeModal()"></div>
          
          <!-- Modal Content -->
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 class="text-lg font-bold text-slate-800">
                Nuova Registrazione
              </h3>
              <button (click)="closeModal()" class="text-slate-400 hover:text-slate-600 transition-colors">
                <i class="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            <form [formGroup]="recordForm" (ngSubmit)="saveRecord()" class="p-6 space-y-4">
              
              <div class="space-y-1">
                 <label class="text-sm font-medium text-slate-700">Data e Ora</label>
                 <input type="datetime-local" formControlName="date" class="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>

              <div class="space-y-1">
                 <label class="text-sm font-medium text-slate-700">Dettaglio / Note Operative</label>
                 <textarea formControlName="detail" rows="3" class="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Descrivi l'attività svolta..."></textarea>
              </div>

              <div class="space-y-1">
                 <label class="text-sm font-medium text-slate-700">Esito Verifica</label>
                 <select formControlName="status" class="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                    <option value="Conforme">Conforme</option>
                    <option value="Attenzione">Attenzione / Monitorare</option>
                    <option value="Non Conforme">Non Conforme</option>
                 </select>
              </div>

              <div class="bg-blue-50 p-3 rounded-lg flex items-start gap-3 mt-2">
                 <i class="fa-solid fa-user-tag text-blue-500 mt-1"></i>
                 <div class="text-sm">
                   <p class="font-bold text-blue-900">Operatore Registrato</p>
                   <p class="text-blue-700">{{ state.currentUser()?.name }}</p>
                 </div>
              </div>

              <div class="pt-4 flex justify-end gap-3">
                <button type="button" (click)="closeModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium">
                  Annulla
                </button>
                <button type="submit" [disabled]="recordForm.invalid" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed">
                  Salva Registrazione
                </button>
              </div>

            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
  `]
})
export class GenericModuleComponent {
  state = inject(AppStateService);
  fb = inject(FormBuilder);
  moduleId = input.required<string>();

  // Writable signal for data instead of computed, to allow updates
  items = signal<MockData[]>([]);
  isModalOpen = signal(false);

  recordForm: FormGroup;

  moduleInfo = computed(() =>
    this.state.menuItems.find(m => m.id === this.moduleId())
  );

  constructor() {
    this.recordForm = this.fb.group({
      date: ['', Validators.required],
      detail: ['', Validators.required],
      status: ['Conforme', Validators.required]
    });

    // React to moduleId changes to reload data
    effect(() => {
      const id = this.moduleId();
      // Per garantire che le nuove aziende partano con un archivio vuoto,
      // non generiamo più dati mock in automatico.
      this.items.set([]);
    }, { allowSignalWrites: true });
  }

  // Generate mock data (moved from computed)
  private generateMockData(moduleId: string): MockData[] {
    const users = this.state.systemUsers();

    // Generate ~45 mock items
    const data: MockData[] = Array.from({ length: 45 }, (_, i) => {
      const user = users[Math.floor(Math.random() * users.length)];

      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      date.setHours(7 + Math.floor(Math.random() * 14), Math.floor(Math.random() * 60));

      // Pad to keep ISO string format compatible with sorting
      const dateStr = date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0') + ' ' +
        String(date.getHours()).padStart(2, '0') + ':' +
        String(date.getMinutes()).padStart(2, '0');

      let detail = 'Registrazione generica';
      let status: MockData['status'] = 'Conforme';

      // -- Logic for content generation
      if (moduleId.includes('temp') || moduleId.includes('chiller') || moduleId.includes('machine')) {
        const units = ['Cella Frigo #1', 'Cella Frigo #2', 'Freezer Pozzetto', 'Vetrina Bibite', 'Abbattitore Master'];
        const unit = units[Math.floor(Math.random() * units.length)];
        const temp = moduleId.includes('chiller') ? -(Math.random() * 30 + 10).toFixed(1) : (Math.random() * 6 + 1).toFixed(1);
        detail = `${unit}: ${temp}°C`;
        if (Math.abs(Number(temp)) < 2 || Math.abs(Number(temp)) > 25) status = Math.random() > 0.5 ? 'Attenzione' : 'Conforme';

      } else if (moduleId.includes('clean') || moduleId.includes('hygiene')) {
        const tasks = ['Sanificazione Piani', 'Pulizia Pavimenti', 'Lavaggio Attrezzature', 'Igiene Mani', 'Sanificazione WC', 'Pulizia Cappa'];
        detail = tasks[Math.floor(Math.random() * tasks.length)];

      } else if (moduleId.includes('goods')) {
        const suppliers = ['Global Foods Srl', 'Ortofrutta Express', 'Panificio Città', 'Carni Scelte SpA'];
        const items = ['Farina 00', 'Pomodori Pelati', 'Mozzarella', 'Manzo Tagli', 'Verdure Miste'];
        detail = `Arrivo: ${items[Math.floor(Math.random() * items.length)]} da ${suppliers[Math.floor(Math.random() * suppliers.length)]}`;

      } else if (moduleId.includes('pest')) {
        detail = `Controllo trappola #${Math.floor(Math.random() * 10) + 1}`;
        if (Math.random() > 0.9) status = 'Attenzione';

      } else if (moduleId.includes('training')) {
        const courses = ['HACCP Base', 'Aggiornamento Allergeni', 'Sicurezza 81/08', 'Antincendio'];
        detail = `Corso: ${courses[Math.floor(Math.random() * courses.length)]}`;
      } else if (moduleId.includes('suppliers')) {
        const suppliers = ['Global Foods Srl', 'Ortofrutta Express', 'Panificio Città', 'Carni Scelte SpA', 'Bevande & Co.', 'Carta e Igiene Srl'];
        detail = `Anagrafica: ${suppliers[i % suppliers.length] || 'Nuovo Fornitore'}`;
      } else if (moduleId.includes('compliance')) {
        detail = `Segnalazione #${1000 + i}`;
        status = 'Non Conforme';
      }

      if (status === 'Conforme' && Math.random() > 0.9) {
        status = 'Attenzione';
      }

      return {
        id: i + 1,
        date: dateStr,
        operator: user?.name || 'Sconosciuto',
        operatorId: user?.id || 'demo',
        detail,
        status,
        clientId: user?.clientId || 'demo'
      };
    });

    return data.sort((a, b) => b.date.localeCompare(a.date));
  }

  // Filtered Data Logic
  filteredData = computed(() => {
    const allData = this.items();
    const activeClientId = this.state.activeTargetClientId();
    const filterUserId = this.state.filterCollaboratorId();

    // 1. If we have a collaborator filter, that is most specific.
    if (filterUserId) {
      return allData.filter(item => item.operatorId === filterUserId);
    }

    // 2. Otherwise filter by active client (calculated from firm filter in Admin mode or user's client in Operator mode)
    if (activeClientId) {
       return allData.filter(item => item.clientId === activeClientId);
    }

    return allData;
  });

  getFilterName() {
    const id = this.state.filterCollaboratorId();
    return this.state.systemUsers().find(u => u.id === id)?.name || 'Sconosciuto';
  }

  getCompanyName() {
    const id = this.state.activeTargetClientId();
    return this.state.clients().find(c => c.id === id)?.name || 'Azienda';
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  getStatusClass(status: string): string {
    if (status === 'Conforme') return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800';
    if (status === 'Attenzione') return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800';
    if (status === 'Non Conforme') return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800';
    return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800';
  }

  // Modal Actions
  openModal() {
    // Set default date to now (local ISO string logic)
    const now = new Date();
    const nowStr = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + 'T' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0');

    this.recordForm.reset({
      date: nowStr,
      detail: '',
      status: 'Conforme'
    });
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  saveRecord() {
    if (this.recordForm.valid) {
      const formVal = this.recordForm.value;
      const currentUser = this.state.currentUser();

      const newRecord: MockData = {
        id: Date.now(), // simple unique id
        date: formVal.date.replace('T', ' '),
        operator: currentUser?.name || 'Sconosciuto',
        operatorId: currentUser?.id || 'demo',
        detail: formVal.detail,
        status: formVal.status,
        clientId: this.state.activeTargetClientId() || 'demo'
      };

      // Add to list (prepend)
      this.items.update(current => [newRecord, ...current]);

      this.closeModal();
    }
  }
}
