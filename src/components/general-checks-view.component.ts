import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppStateService } from '../services/app-state.service';
import { ToastService } from '../services/toast.service';

interface CheckItem {
    id: string;
    label: string;
    moduleId: string;
    completed: boolean;
}

interface CheckCategory {
    id: string;
    name: string;
    icon: string;
    color: string;
    items: CheckItem[];
}

@Component({
    selector: 'app-general-checks-view',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="space-y-6 pb-12 max-w-7xl mx-auto p-4">
      
    <div class="space-y-6 pb-12 max-w-7xl mx-auto p-4">
      
      <!-- Sleek White Header Banner -->
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div class="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none"></div>
        
        <div class="flex items-center gap-5 relative z-10">
          <div class="h-14 w-14 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md">
             <i class="fa-solid fa-list-check text-2xl"></i>
          </div>
          <div>
            <h2 class="text-2xl font-bold text-slate-800 tracking-tight">Controlli Generali</h2>
            <div class="flex items-center gap-3 mt-1">
              <p class="text-sm font-medium text-slate-500">Analisi dettagliata esiti e conformità</p>
              <button (click)="showStandardInfo.set(true)" class="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 transition-all text-[9px] font-black border border-slate-200 group">
                <i class="fa-solid fa-circle-info text-xs group-hover:scale-110 transition-transform"></i>
                <span>INFO PROTOCOLLO</span>
              </button>
            </div>
          </div>
        </div>
        
        <div class="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
          <!-- Company Selector Glassmorphism -->
          <div class="bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200 flex flex-col justify-center min-w-[220px] shadow-sm">
            <label class="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5 leading-none">Azienda Filtro</label>
            <select [ngModel]="selectedCompanyId()" (ngModelChange)="selectedCompanyId.set($event)"
                    class="bg-transparent text-slate-800 font-bold text-sm focus:outline-none cursor-pointer border-none p-0 w-full appearance-none">
              <option value="" class="text-slate-800">Tutte le Aziende</option>
              @for (client of state.clients(); track client.id) {
                <option [value]="client.id" class="text-slate-800">{{ client.name }}</option>
              }
            </select>
          </div>

          <!-- Print Action -->
          <button (click)="printCompleteList()" 
                  [disabled]="!selectedCompanyId()"
                  class="px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale shadow-lg active:scale-95 group">
            <i class="fa-solid fa-print text-lg group-hover:rotate-12 transition-transform"></i>
            <span class="hidden sm:inline">Report</span>
          </button>
        </div>
      </div>

      <!-- Informational Modal -->
      @if (showStandardInfo()) {
            <div class="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" (click)="showStandardInfo.set(false)"></div>
                <div class="relative bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-slide-up border border-slate-100 flex flex-col">
                    <div class="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
                        <div class="h-10 w-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-lg shrink-0">
                            <i class="fa-solid fa-list-check"></i>
                        </div>
                        <div>
                            <h3 class="text-base font-bold text-slate-800">Controlli HACCP</h3>
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Protocollo Standard</p>
                        </div>
                    </div>
                    
                    <div class="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        <div class="space-y-2">
                            <h4 class="text-xs font-bold text-slate-800 flex items-center gap-2">
                                <i class="fa-solid fa-shield-check text-emerald-500"></i> Obiettivo
                            </h4>
                            <p class="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                                Monitorare costantemente l'attuazione delle procedure di autocontrollo previste dal piano HACCP aziendale.
                            </p>
                        </div>

                        <div class="space-y-2">
                            <h4 class="text-xs font-bold text-slate-800 flex items-center gap-2">
                                <i class="fa-solid fa-flask-vial text-blue-500"></i> Protocollo Sanificazione
                            </h4>
                            <p class="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                                "La sanificazione comprende pulizia meccanica/chimica e successiva disinfezione." 
                                Utilizzare prodotti anionici per il lavaggio e cationici per la disinfezione.
                            </p>
                        </div>

                        <div class="space-y-2">
                            <h4 class="text-xs font-bold text-slate-800 flex items-center gap-2">
                                <i class="fa-solid fa-triangle-exclamation text-orange-500"></i> Segnalazione
                            </h4>
                            <p class="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                                Le non conformità rilevate devono essere registrate tempestivamente con le relative azioni correttive intraprese nel registro specifico.
                            </p>
                        </div>
                    </div>

                    <div class="p-4 bg-slate-50 border-t border-slate-100">
                        <button (click)="showStandardInfo.set(false)"
                                class="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:border-slate-300 transition-all shadow-sm">
                            CHIUDI
                        </button>
                    </div>
                </div>
            </div>
        }

      <!-- Summary Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Totale Controlli</p>
          <div class="flex items-end justify-between">
            <p class="text-3xl font-black text-slate-800 leading-none">{{ totalChecks() }}</p>
            <i class="fa-solid fa-clipboard-list text-slate-300 text-xl mb-1"></i>
          </div>
        </div>

        <div class="bg-emerald-50 rounded-xl p-5 border border-emerald-100 shadow-sm transition-all hover:shadow-md">
          <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Completati</p>
          <div class="flex items-end justify-between">
            <p class="text-3xl font-black text-emerald-700 leading-none">{{ completedChecks() }}</p>
            <i class="fa-solid fa-circle-check text-emerald-300 text-xl mb-1"></i>
          </div>
        </div>

        <div class="bg-orange-50 rounded-xl p-5 border border-orange-100 shadow-sm transition-all hover:shadow-md">
          <p class="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1">Da Completare</p>
          <div class="flex items-end justify-between">
            <p class="text-3xl font-black text-orange-700 leading-none">{{ pendingChecks() }}</p>
            <i class="fa-solid fa-clock text-orange-300 text-xl mb-1"></i>
          </div>
        </div>

        <div class="bg-blue-50 rounded-xl p-5 border border-blue-100 shadow-sm transition-all hover:shadow-md">
          <p class="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Completamento</p>
          <div class="flex items-end justify-between">
            <p class="text-3xl font-black text-blue-700 leading-none">{{ completionRate() }}%</p>
            <i class="fa-solid fa-chart-pie text-blue-300 text-xl mb-1"></i>
          </div>
        </div>
      </div>

      <!-- Categories List -->
      <div class="space-y-4">
        @for (category of categories(); track category.id) {
          @let isOpen = isCategoryExpanded(category.id);
          @let categoryCompleted = getCategoryCompletedCount(category);
          @let categoryTotal = category.items.length;
          @let categoryRate = categoryTotal > 0 ? (categoryCompleted / categoryTotal * 100) : 0;

          <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:border-slate-300">
            
            <!-- Category Header -->
            <div class="px-5 py-4 cursor-pointer select-none transition-colors hover:bg-slate-50 border-l-[3px]"
                 [style.border-left-color]="category.color"
                 (click)="toggleCategory(category.id)">
               
               <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                   <div class="flex items-center gap-4 flex-1 w-full relative">
                       <!-- Icon -->
                       <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-slate-100"
                            [style.background]="category.color + '15'"
                            [style.color]="category.color">
                          <i [class]="'fa-solid ' + category.icon + ' text-base'"></i>
                       </div>
                       
                       <div class="flex-1 min-w-0 pr-10 md:pr-0">
                          <div class="flex items-center gap-3 mb-1">
                              <h3 class="font-bold text-base text-slate-800 truncate">{{ category.name }}</h3>
                              <span class="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold tracking-widest border border-slate-200 shrink-0 uppercase">
                                  {{ categoryTotal }} VOCE{{categoryTotal > 1 ? 'I' :'E'}}
                              </span>
                          </div>
                          
                          <!-- Progress Bar -->
                          <div class="flex items-center gap-3 mt-1.5">
                              <div class="flex-1 max-w-[200px]">
                                  <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div class="h-full transition-all duration-700"
                                           [style.background]="category.color"
                                           [style.width.%]="categoryRate"></div>
                                  </div>
                              </div>
                              <span class="text-[10px] font-bold text-slate-500 w-8">
                                  {{ (categoryRate | number:'1.0-0') }}%
                              </span>
                          </div>
                       </div>

                       <!-- Expand Arrow -->
                       <div class="absolute right-0 top-1/2 -translate-y-1/2 md:relative md:top-auto md:translate-y-0 w-8 h-8 flex items-center justify-center text-slate-400 transition-transform duration-300"
                            [class.rotate-180]="isOpen">
                           <i class="fa-solid fa-chevron-down text-sm"></i>
                       </div>
                   </div>
               </div>
            </div>

            <!-- Category Items (Accordion Body) -->
            @if (isOpen) {
                <div class="border-t border-slate-100 bg-slate-50/50 p-4 md:p-6 animate-slide-down">
                   <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                      @for (item of category.items; track item.id) {
                          <div class="bg-white/80 rounded-lg p-4 border transition-all flex flex-col gap-2 shadow-sm"
                               [class.border-emerald-200]="item.status === 'ok'"
                               [class.bg-emerald-50/30]="item.status === 'ok'"
                               [class.border-red-200]="item.status === 'issue'"
                               [class.bg-red-50/30]="item.status === 'issue'"
                               [class.border-slate-200]="item.status === 'pending'"
                               [class.hover:border-slate-300]="item.status === 'pending'">
                              
                              <div class="flex items-start gap-3">
                                  <!-- Status Icon -->
                                  <div class="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border"
                                       [class.bg-emerald-500]="item.status === 'ok'"
                                       [class.border-emerald-600]="item.status === 'ok'"
                                       [class.text-white]="item.status === 'ok'"
                                       [class.bg-red-500]="item.status === 'issue'"
                                       [class.border-red-600]="item.status === 'issue'"
                                       [class.text-white]="item.status === 'issue'"
                                       [class.bg-slate-50]="item.status === 'pending'"
                                       [class.border-slate-200]="item.status === 'pending'"
                                       [class.text-slate-300]="item.status === 'pending'">
                                      @if (item.status === 'ok') {
                                          <i class="fa-solid fa-check text-sm font-black"></i>
                                      } @else if (item.status === 'issue') {
                                          <i class="fa-solid fa-triangle-exclamation text-sm font-black"></i>
                                      } @else {
                                          <i class="fa-solid fa-clock text-sm"></i>
                                      }
                                  </div>

                                  <!-- Label -->
                                  <div class="flex-1 min-w-0">
                                      <p class="text-sm font-bold leading-tight"
                                         [class.text-slate-700]="item.status === 'pending'"
                                         [class.text-emerald-900]="item.status === 'ok'"
                                         [class.text-red-900]="item.status === 'issue'">
                                          {{ item.label }}
                                      </p>
                                      
                                      <div class="flex items-center gap-2 mt-1">
                                          <span class="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border shadow-sm"
                                                [class.bg-emerald-100]="item.status === 'ok'" [class.text-emerald-700]="item.status === 'ok'" [class.border-emerald-200]="item.status === 'ok'"
                                                [class.bg-red-100]="item.status === 'issue'" [class.text-red-700]="item.status === 'issue'" [class.border-red-200]="item.status === 'issue'"
                                                [class.bg-slate-100]="item.status === 'pending'" [class.text-slate-500]="item.status === 'pending'" [class.border-slate-200]="item.status === 'pending'">
                                              {{ item.status === 'ok' ? 'Conforme' : item.status === 'issue' ? 'Anomalia' : 'Pendente' }}
                                          </span>
                                      </div>
                                  </div>
                              </div>

                              <!-- Note area -->
                              @if (item.note) {
                                  <div class="mt-1 p-2 bg-white rounded-md border border-slate-100 text-[11px] text-slate-600 italic flex items-start gap-2">
                                      <i class="fa-solid fa-comment-dots mt-0.5 text-slate-300"></i>
                                      <span>{{ item.note }}</span>
                                  </div>
                              }
                          </div>
                      } @empty {
                          <div class="col-span-full p-8 text-center bg-white/50 rounded-xl border border-dashed border-slate-200">
                              <i class="fa-solid fa-folder-open text-slate-200 text-3xl mb-2"></i>
                              <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Nessuna voce registrata per questa fase</p>
                          </div>
                      }
                   </div>
                </div>
            }

          </div>
        }
      </div>

      <!-- Non Conformità Section -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="h-10 w-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500">
              <i class="fa-solid fa-triangle-exclamation text-lg"></i>
            </div>
            <div>
              <h3 class="font-bold text-base text-slate-800">Non Conformità Segnalate</h3>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Anomalie registrate dagli operatori</p>
            </div>
          </div>
          <div class="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
            <button (click)="ncActiveTab.set('ACTIVE')"
                    [class]="'px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ' + 
                             (ncActiveTab() === 'ACTIVE' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700')">
              Attive ({{ nonConformitiesFiltered().length }})
            </button>
            <button (click)="ncActiveTab.set('CLOSED')"
                    [class]="'px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ' + 
                             (ncActiveTab() === 'CLOSED' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700')">
              Archivio ({{ nonConformitiesClosed().length }})
            </button>
          </div>
        </div>

        @if (ncActiveTab() === 'ACTIVE' ? nonConformitiesFiltered().length === 0 : nonConformitiesClosed().length === 0) {
          <div class="p-10 flex flex-col items-center gap-3 text-center">
            <div [class]="'h-14 w-14 rounded-full flex items-center justify-center text-2xl ' + 
                          (ncActiveTab() === 'ACTIVE' ? 'bg-emerald-50 text-emerald-400' : 'bg-slate-50 text-slate-300')">
              <i [class]="'fa-solid ' + (ncActiveTab() === 'ACTIVE' ? 'fa-circle-check' : 'fa-folder-open')"></i>
            </div>
            <p class="text-sm font-bold text-slate-500">
                {{ ncActiveTab() === 'ACTIVE' ? 'Nessuna non conformità attiva' : 'Archivio vuoto' }}
            </p>
            <p class="text-xs text-slate-400">
                {{ ncActiveTab() === 'ACTIVE' ? 'Tutte le segnalazioni sono state gestite o non ne sono ancora arrivate.' : 'Le segnalazioni chiuse appariranno qui.' }}
            </p>
          </div>
        } @else {
          <div class="divide-y divide-slate-100">
            @for (nc of (ncActiveTab() === 'ACTIVE' ? nonConformitiesFiltered() : nonConformitiesClosed()); track nc.id) {
              <div class="p-4 hover:bg-slate-50 transition-colors flex gap-4">
                <!-- Status icon -->
                <div class="shrink-0 mt-0.5">
                  @if (nc.status === 'OPEN') {
                    <div class="h-8 w-8 rounded-lg bg-red-100 border border-red-200 flex items-center justify-center text-red-500">
                      <i class="fa-solid fa-exclamation text-sm font-black"></i>
                    </div>
                  } @else if (nc.status === 'IN_PROGRESS') {
                    <div class="h-8 w-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600">
                      <i class="fa-solid fa-spinner text-sm"></i>
                    </div>
                  } @else {
                    <div class="h-8 w-8 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600">
                      <i class="fa-solid fa-check text-sm"></i>
                    </div>
                  }
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex flex-wrap items-center gap-2 mb-1">
                    <span class="text-sm font-bold text-slate-800">{{ nc.itemName || 'Anomalia' }}</span>
                    <span class="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border"
                          [class.bg-red-50]="nc.status === 'OPEN'" [class.text-red-600]="nc.status === 'OPEN'" [class.border-red-200]="nc.status === 'OPEN'"
                          [class.bg-amber-50]="nc.status === 'IN_PROGRESS'" [class.text-amber-700]="nc.status === 'IN_PROGRESS'" [class.border-amber-200]="nc.status === 'IN_PROGRESS'"
                          [class.bg-emerald-50]="nc.status === 'CLOSED'" [class.text-emerald-700]="nc.status === 'CLOSED'" [class.border-emerald-200]="nc.status === 'CLOSED'">
                      {{ nc.status === 'OPEN' ? 'APERTA' : nc.status === 'IN_PROGRESS' ? 'IN CORSO' : 'CHIUSA' }}
                    </span>
                    <span class="text-[9px] font-bold uppercase text-slate-400 px-2 py-0.5 rounded bg-slate-50 border border-slate-100 tracking-widest">
                      {{ getModuleLabel(nc.moduleId) }}
                    </span>
                    @if (!selectedCompanyId()) {
                      <span class="text-[9px] font-black px-2 py-0.5 rounded border border-indigo-100 bg-indigo-50 text-indigo-600 uppercase tracking-widest">
                        {{ getClientName(nc.clientId) }}
                      </span>
                    }
                  </div>

                  <p class="text-xs text-slate-600 leading-relaxed mb-2">{{ nc.description }}</p>

                  <div class="flex items-center gap-4 text-[10px] text-slate-400 font-bold">
                    <span><i class="fa-solid fa-calendar-day mr-1"></i>{{ nc.date }}</span>
                    @if (nc.createdAt) {
                      <span><i class="fa-solid fa-clock mr-1"></i>{{ formatTime(nc.createdAt) }}</span>
                    }
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex flex-col gap-1.5 shrink-0">
                  @if (nc.status === 'OPEN') {
                      <button (click)="updateNcStatus(nc.id, 'IN_PROGRESS')"
                              class="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-bold text-[10px] uppercase tracking-widest transition-colors">
                        In Corso
                      </button>
                      <button (click)="updateNcStatus(nc.id, 'CLOSED')"
                              class="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-[10px] uppercase tracking-widest transition-colors">
                        Chiudi
                      </button>
                  } @else if (nc.status === 'IN_PROGRESS') {
                    <button (click)="updateNcStatus(nc.id, 'CLOSED')"
                            class="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-[10px] uppercase tracking-widest transition-colors">
                      <i class="fa-solid fa-check mr-1"></i>Chiudi
                    </button>
                  }
                  
                  <button (click)="printNonConformity(nc)"
                          class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                    <i class="fa-solid fa-print"></i> Stampa
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>

    </div>
  `,
    styles: [`
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  `]
})
export class GeneralChecksViewComponent {
    state = inject(AppStateService);
    toast = inject(ToastService);
    showStandardInfo = signal(false);
    expandedCategoryIds = signal<Set<string>>(new Set());
    
    // Injecting effect to handle global sync
    private _syncEffect = effect(() => {
        const filterId = this.state.filterCollaboratorId();
        if (filterId) {
            const user = this.state.systemUsers().find(u => u.id === filterId);
            if (user && user.clientId) {
                this.selectedCompanyId.set(user.clientId);
            }
        } else {
            this.selectedCompanyId.set('');
        }
    });

    // Local filter state
    selectedCompanyId = signal<string>('');
    ncActiveTab = signal<'ACTIVE' | 'CLOSED'>('ACTIVE');

    // Use global filter instead of local selector
    selectedClient = computed(() => {
        // First check if there's a local selection from the dropdown
        const localId = this.selectedCompanyId();
        if (localId) {
            return this.state.clients().find(c => c.id === localId) || null;
        }

        // Otherwise fallback to global filter
        const filterId = this.state.filterCollaboratorId();
        if (!filterId) return null;
        const user = this.state.systemUsers().find(u => u.id === filterId);
        return user ? this.state.clients().find(c => c.id === user.clientId) : null;
    });

    // Real logic to check if a specific checklist is completed for current selection
    checkIsCompleted(moduleId: string): boolean {
        const client = this.selectedClient();
        const date = this.state.filterDate();
        const collaboratorId = this.state.filterCollaboratorId();
        if (!client) return false;

        return this.state.checklistRecords().some(r => 
            r.moduleId === moduleId && 
            r.clientId === client.id && 
            r.date === date &&
            (!collaboratorId || r.userId === collaboratorId)
        );
    }

    categories = computed((): CheckCategory[] => {
        const client = this.selectedClient();
        const date = this.state.filterDate();
        const records = this.state.checklistRecords();

        const getItems = (moduleId: string) => {
            const collaboratorId = this.state.filterCollaboratorId();
            
            // Find records matching client, date and moduleId
            let relevantRecords = records.filter(r => 
                r.moduleId === moduleId && 
                r.clientId === client?.id && 
                r.date === date
            );

            // If a specific collaborator is selected, further filter by user_id
            if (collaboratorId) {
                relevantRecords = relevantRecords.filter(r => r.userId === collaboratorId);
            }

            // Take the latest record for this module/user combination
            const record = relevantRecords.at(-1);
            if (!record) return [];

            const list: any[] = [];
            if (moduleId === 'operative-checklist') {
                return (record.data?.items || []).map((i: any, idx: number) => ({
                    id: `${moduleId}-${idx}`,
                    label: i.label,
                    status: i.status || 'pending',
                    completed: (i.status || 'pending') !== 'pending',
                    note: i.note || (i.temperature ? `Temperatura: ${i.temperature}°C` : null)
                }));
            } else if (Array.isArray(record.data)) {
                // Handle direct array structure (e.g. cleaning-maintenance)
                return record.data.map((item: any, idx: number) => {
                    const status = item.status || 'pending';
                    return {
                        id: `${moduleId}-${idx}`,
                        label: item.label,
                        status: status,
                        completed: status !== 'pending',
                        note: item.note
                    };
                });
            } else {
                const areas = record.data?.areas || [];
                areas.forEach((area: any) => {
                    area.steps?.forEach((step: any, idx: number) => {
                        const status = step.status || 'pending';
                        list.push({
                            id: `${moduleId}-${area.id}-${idx}`,
                            label: `${area.label}: ${step.label}`,
                            status: status,
                            completed: status !== 'pending',
                            note: step.note
                        });
                    });
                });
                if (moduleId === 'pre-op-checklist') {
                  const globalItems = record.data?.globalItems || [];
                  globalItems.forEach((item: any, idx: number) => {
                      const status = item.status || 'pending';
                      list.push({
                          id: `global-${idx}`,
                          label: `Generale: ${item.label}`,
                          status: status,
                          completed: status !== 'pending',
                          note: item.note
                      });
                  });
                }
                return list;
            }
        };

        return [
            {
                id: 'pre-operative',
                name: 'Fase Pre-operativa',
                icon: 'fa-hourglass-start',
                color: '#3b82f6',
                items: getItems('pre-op-checklist')
            },
            {
                id: 'operative',
                name: 'Fase Operativa',
                icon: 'fa-briefcase',
                color: '#6366f1',
                items: getItems('operative-checklist')
            },
            {
                id: 'post-operative',
                name: 'Fase Post-operativa',
                icon: 'fa-hourglass-end',
                color: '#8b5cf6',
                items: getItems('post-op-checklist')
            }
        ];
    });

    totalChecks = computed(() => {
        return this.categories().reduce((acc, cat) => acc + cat.items.length, 0);
    });

    completedChecks = computed(() => {
        return this.categories().reduce((acc, cat) =>
            acc + cat.items.filter(item => item.completed).length, 0
        );
    });

    pendingChecks = computed(() => {
        return this.totalChecks() - this.completedChecks();
    });

    completionRate = computed(() => {
        const total = this.totalChecks();
        if (total === 0) return 0;
        return Math.round((this.completedChecks() / total) * 100);
    });

    isCategoryExpanded(id: string): boolean {
        return this.expandedCategoryIds().has(id);
    }

    toggleCategory(id: string) {
        this.expandedCategoryIds.update(set => {
            const newSet = new Set(set);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }

    getCategoryCompletedCount(category: CheckCategory): number {
        return category.items.filter(item => item.completed).length;
    }

    getModuleName(moduleId: string): string {
        const moduleNames: Record<string, string> = {
            'operational-checklist': 'Checklist Operativa',
            'operative-checklist': 'Fase Operativa',
            'pre-op-checklist': 'Fase Pre-Operativa',
            'post-op-checklist': 'Fase Post-Operativa',
            'temperatures': 'Temperature',
            'staff-hygiene': 'Igiene Personale',
            'traceability': 'Rintracciabilità',
            'cleaning-maintenance': 'Pulizia/Manutenzione'
        };
        return moduleNames[moduleId] || moduleId;
    }

    getModuleLabel(moduleId: string): string {
        return this.getModuleName(moduleId);
    }

    getClientName(clientId: string): string {
        const client = this.state.clients().find(c => c.id === clientId);
        return client ? client.name : 'Azienda';
    }

    // Non-conformity computed signals
    localNonConformities = computed(() => {
        const client = this.selectedClient();
        const allNc = this.state.nonConformities();
        
        if (!client) {
            // If no company selected, show all anomalies for the admin to oversee everything
            return allNc.sort((a,b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });
        }
        
        return allNc
            .filter(nc => nc.clientId === client.id)
            .sort((a,b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });
    });

    nonConformitiesFiltered = computed(() =>
        this.localNonConformities().filter(nc => nc.status !== 'CLOSED')
    );

    nonConformitiesClosed = computed(() =>
        this.localNonConformities().filter(nc => nc.status === 'CLOSED')
    );

    async updateNcStatus(id: string, status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED') {
        await this.state.updateNonConformityStatus(id, status);
        const label = status === 'CLOSED' ? 'chiusa' : status === 'IN_PROGRESS' ? 'in lavorazione' : 'aperta';
        this.toast.success('Non Conformità Aggiornata', `La segnalazione è stata marcata come ${label}.`);
    }

    formatTime(date: Date | undefined): string {
        if (!date) return '';
        try {
            return new Date(date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
    }

    printNonConformity(nc: any) {
        // Find client either from selection or from the NC itself
        const client = this.selectedClient() || this.state.clients().find(c => c.id === nc.clientId);
        if (!client) {
            this.toast.error('Errore', 'Impossibile trovare i dati dell\'azienda associata.');
            return;
        }

        const printContent = this.generateAnomalyPrintHTML(nc, client);
        const printWindow = window.open('', '_blank');

        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    }

    private generateAnomalyPrintHTML(nc: any, client: any): string {
        const admin = this.state.adminCompany();
        const dateStr = new Date(nc.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
        const timeStr = nc.createdAt ? new Date(nc.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Segnalazione Anomalia - ${client.name}</title>
            <style>
                @page { size: A4; margin: 0.8cm; }
                body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 0.4cm 1cm; color: #1e293b; line-height: 1.4; }
                
                /* Letterhead */
                .letterhead { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
                .sai-logo { width: 130px; }
                .sai-logo img { width: 100%; height: auto; object-fit: contain; }
                .company-info { text-align: right; font-size: 10px; color: #475569; }
                .company-name { font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 2px; text-transform: uppercase; }

                /* Report Title */
                .report-header { text-align: center; margin-bottom: 20px; }
                .report-title { font-size: 20px; font-weight: 900; color: #be123c; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }
                .report-subtitle { font-size: 11px; color: #64748b; font-weight: 700; margin-top: 3px; }

                /* Details Grid */
                .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
                .detail-box { background: #f8fafc; border: 1px solid #f1f5f9; padding: 12px; border-radius: 10px; }
                .detail-label { font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 3px; }
                .detail-value { font-size: 13px; font-weight: 700; color: #0f172a; }

                /* Anomaly Card */
                .anomaly-card { border: 2px solid #ef4444; border-radius: 12px; padding: 20px; position: relative; overflow: hidden; }
                .anomaly-card::before { content: ""; position: absolute; left: 0; top: 0; width: 5px; height: 100%; background: #ef4444; }
                .section-label { font-size: 9px; font-weight: 900; color: #ef4444; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 12px; display: block; }
                
                .content-block { margin-bottom: 15px; }
                .content-label { font-size: 10px; font-weight: 800; color: #64748b; margin-bottom: 6px; }
                .content-text { font-size: 13px; color: #1e293b; background: #fff; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; min-height: 40px; }

                /* Status Banner */
                .status-banner { position: absolute; top: 12px; right: 12px; padding: 4px 12px; border-radius: 20px; font-size: 9px; font-weight: 800; text-transform: uppercase; }
                .status-OPEN { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
                .status-IN_PROGRESS { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
                .status-CLOSED { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }

                /* Signatures */
                .signatures { margin-top: 20px; display: flex; justify-content: space-between; gap: 60px; }
                .sign-box { flex: 1; text-align: center; }
                .sign-line { border-top: 1px solid #0f172a; margin-top: 30px; padding-top: 5px; font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; }

                /* Footer */
                .footer { position: fixed; bottom: 0.8cm; left: 1cm; right: 1cm; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 10px; }
                
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="letterhead">
                <div class="sai-logo">
                    <img src="${admin.logo}" alt="SAI Logo">
                </div>
                <div class="company-info">
                    <div class="company-name">${client.name}</div>
                    <div>P.IVA: ${client.piva}</div>
                    <div>Indirizzo: ${client.address}</div>
                    <div>Email: ${client.email}</div>
                    <div>Tel: ${client.phone}</div>
                </div>
            </div>

            <div class="report-header">
                <h1 class="report-title">Verbale di Non Conformità</h1>
                <div class="report-subtitle">Sistema Gestione Qualità HACCP PRO Compliance</div>
            </div>

            <div class="details-grid">
                <div class="detail-box">
                    <div class="detail-label">Data Segnalazione</div>
                    <div class="detail-value">${dateStr} ${timeStr ? 'ore ' + timeStr : ''}</div>
                </div>
                <div class="detail-box">
                    <div class="detail-label">Modulo di Origine</div>
                    <div class="detail-value">${this.getModuleLabel(nc.moduleId)}</div>
                </div>
            </div>

            <div class="anomaly-card">
                <span class="status-banner status-${nc.status}">
                    ${nc.status === 'OPEN' ? 'Segnalazione Aperta' : nc.status === 'IN_PROGRESS' ? 'In Lavorazione' : 'Risolto / Chiuso'}
                </span>
                
                <span class="section-label">Dettagli Anomalia</span>

                <div class="content-block">
                    <div class="content-label">Oggetto / Attrezzatura Interrata</div>
                    <div class="content-text" style="font-weight: 700;">${nc.itemName || 'Non specificato'}</div>
                </div>

                <div class="content-block">
                    <div class="content-label">Descrizione dell'Anomalia (Motivazione)</div>
                    <div class="content-text">${nc.description}</div>
                </div>

                <div class="content-block" style="margin-bottom: 0;">
                    <div class="content-label">Azioni Correttive Intraprese / Note</div>
                    <div class="content-text" style="color: #94a3b8; font-style: italic;">
                        ${nc.status === 'CLOSED' ? 'L\'anomalia è stata gestita e risolta secondo protocollo.' : 'Da compilare a cura del responsabile...'}
                    </div>
                </div>
            </div>

            <div class="signatures">
                <div class="sign-box">
                    <div class="sign-line">Firma dell'Operatore Segnalante</div>
                </div>
                <div class="sign-box">
                    <div class="sign-line">FIRMA OPERATORE SETTORE ALIMENTARE (OSA)</div>
                </div>
            </div>

            <div class="footer">
                Documento generato digitalmente da HACCP PRO Traceability System mod. NC/2024. <br>
                Ai sensi del Reg. CE 852/04 - Autocontrollo dei pericoli igienico-sanitari.
            </div>
        </body>
        </html>
        `;
    }

    printCompleteList() {
        const company = this.selectedClient();
        if (!company) return;

        const printContent = this.generatePrintHTML(company);
        const printWindow = window.open('', '_blank');

        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.focus();

            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    }

    generatePrintHTML(company: any): string {
        const date = new Date(this.state.filterDate()).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        const categories = this.categories();
        const totalChecks = this.totalChecks();
        const completedChecks = this.completedChecks();
        const completionRate = this.completionRate();

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Lista Controlli Completa - ${company.name}</title>
                <style>
                    @page { size: A4; margin: 2cm; }
                    body { font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6; }
                    .header { border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
                    .logo { font-size: 32px; font-weight: bold; color: #10b981; margin-bottom: 10px; }
                    .company-name { font-size: 24px; font-weight: bold; margin: 20px 0 10px; }
                    .meta { color: #64748b; font-size: 14px; margin-bottom: 5px; }
                    .summary-box { background: #f1f5f9; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0; }
                    .category { margin: 30px 0; page-break-inside: avoid; }
                    .category-header { background: #f8fafc; padding: 12px; border-left: 4px solid; font-weight: bold; font-size: 18px; margin-bottom: 15px; }
                    .check-item { padding: 10px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 10px; }
                    .check-icon { width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-center; font-size: 12px; }
                    .check-icon.done { background: #10b981; color: white; }
                    .check-icon.pending { background: #f59e0b; color: white; }
                    .check-label { flex: 1; }
                    .check-status { font-size: 11px; font-weight: bold; text-transform: uppercase; padding: 3px 8px; border-radius: 4px; }
                    .check-status.done { background: #d1fae5; color: #065f46; }
                    .check-status.pending { background: #fed7aa; color: #92400e; }
                    .signature-area { margin-top: 60px; border-top: 2px solid #e2e8f0; padding-top: 30px; }
                    .signature-line { border-top: 1px solid #000; width: 300px; margin-top: 40px; padding-top: 5px; }
                    .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; page-break-inside: avoid; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">🛡️ HACCP Pro</div>
                    <div style="color: #64748b; font-size: 14px;">Sistema di Gestione Controlli Igienico-Sanitari</div>
                </div>

                <h1 class="company-name">${company.name}</h1>
                <div class="meta">P.IVA: ${company.piva}</div>
                <div class="meta">Indirizzo: ${company.address}</div>
                <div class="meta">Data Report: ${date}</div>

                <div class="summary-box">
                    <strong>Riepilogo Generale:</strong> ${completedChecks} controlli completati su ${totalChecks} totali 
                    (${completionRate}% di completamento)
                </div>

                <h2 style="margin-top: 30px; color: #10b981;">Lista Completa Controlli HACCP</h2>

                ${categories.map(category => {
            const catCompleted = this.getCategoryCompletedCount(category);
            const catTotal = category.items.length;
            const catRate = catTotal > 0 ? Math.round((catCompleted / catTotal) * 100) : 0;

            return `
                        <div class="category">
                            <div class="category-header" style="border-left-color: ${category.color}; color: ${category.color};">
                                ${category.name} (${catCompleted}/${catTotal} - ${catRate}%)
                            </div>
                            ${category.items.map(item => `
                                <div class="check-item">
                                    <div class="check-icon ${item.completed ? 'done' : 'pending'}">
                                        ${item.completed ? '✓' : '−'}
                                    </div>
                                    <div class="check-label">${item.label}</div>
                                    <div class="check-status ${item.completed ? 'done' : 'pending'}">
                                        ${item.completed ? 'Fatto' : 'Da Fare'}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
        }).join('')}

                <div class="signature-area">
                    <p><strong>Firma del Responsabile HACCP:</strong></p>
                    <div class="signature-line">
                        <div style="text-align: center; font-size: 12px; color: #64748b;">Firma e Timbro</div>
                    </div>
                </div>

                <div class="footer">
                    <p>Documento generato automaticamente da HACCP Pro - ${new Date().toLocaleString('it-IT')}</p>
                    <p>Lista completa dei controlli HACCP per ${company.name}</p>
                </div>
            </body>
            </html>
        `;
    }
}

