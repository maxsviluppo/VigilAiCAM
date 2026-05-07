
import { Component, inject, signal, computed, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../services/app-state.service';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../services/gemini.service';
import { ToastService } from '../services/toast.service';

// --- Interfaces ---

interface Ingredient {
  id: string;
  productName: string; // Extracted from AI or manual
  lotNumber: string;   // Extracted from AI or manual
  expiryDate: string;  // Extracted from AI or manual
  supplier?: string;
  quantity?: string;
}

interface ProductionBatch {
  id: string;
  // Dati Manuali (Prodotto Finito)
  productName: string;       // Es. "Sugo alla Genovese"
  preparationDate: string;   // Data produzione
  expiryDate: string;        // Data scadenza interna
  internalLot: string;       // Lotto interno generato/assegnato
  operator: string;
  notes: string;

  // Tracciabilità (Ingredienti)
  ingredients: Ingredient[];
}

@Component({
  selector: 'app-traceability-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Header -->
      <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h2 class="text-2xl font-bold text-slate-800 flex items-center">
            <i class="fa-solid fa-boxes-packing mr-3 text-emerald-600"></i>
            Schede Produzione & Tracciabilità
          </h2>
          <p class="text-slate-500 text-sm mt-1">
            Gestione lotti di produzione e tracciabilità ingredienti (scan AI)
          </p>
        </div>
        
        <div class="flex items-center gap-4">
             @if (viewMode() === 'list') {
                 <button (click)="createNewProduction()" [disabled]="!state.isContextEditable()"
                    class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md transition-all flex items-center disabled:opacity-50">
                    <i class="fa-solid fa-plus mr-2"></i> Nuova Produzione
                 </button>
             } @else {
                 <button (click)="closeProduction()" 
                    class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-all flex items-center">
                    <i class="fa-solid fa-arrow-left mr-2"></i> Torna alla Lista
                 </button>
             }
        </div>
      </div>

      <!-- MAIN VIEW: LIST OF PRODUCTIONS -->
      @if (viewMode() === 'list') {
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
             <div class="p-4 bg-slate-50 border-b border-slate-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                 <div>
                   <h3 class="font-bold text-slate-700">Produzioni Recenti</h3>
                   <div class="text-[10px] text-slate-500 font-bold uppercase tracking-wide mt-0.5">I prodotti restano in memoria per 60 giorni o fino all'eliminazione manuale.</div>
                 </div>
                 
                 <div class="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                    <!-- Search Input -->
                    <div class="relative w-full lg:w-64">
                       <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                       <input type="text" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" placeholder="Cerca nome o lotto..." 
                              class="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white">
                    </div>
                    
                    <!-- Date Range -->
                    <div class="flex items-center gap-2">
                       <input type="date" [ngModel]="dateFrom()" (ngModelChange)="dateFrom.set($event)" 
                              class="w-full sm:w-auto px-2 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 bg-white text-slate-600">
                       <span class="text-slate-400 text-xs font-bold">-</span>
                       <input type="date" [ngModel]="dateTo()" (ngModelChange)="dateTo.set($event)" 
                              class="w-full sm:w-auto px-2 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 bg-white text-slate-600">
                    </div>
                 </div>
             </div>
             
             <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                            <th class="px-4 py-3 font-bold">Data</th>
                            <th class="px-4 py-3 font-bold">Prodotto Finito</th>
                            <th class="px-4 py-3 font-bold">Lotto Interno</th>
                            <th class="px-4 py-3 font-bold text-center">Ingredienti</th>
                            <th class="px-4 py-3 font-bold text-right">Azioni</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        @for (batch of filteredBatches(); track batch.id) {
                            <tr class="hover:bg-slate-50 transition-colors group cursor-pointer" (click)="openProduction(batch)">
                                <td class="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">
                                    {{ batch.preparationDate | date:'dd/MM/yyyy' }}
                                </td>
                                <td class="px-4 py-3">
                                    <div class="font-bold text-slate-800 text-base">{{ batch.productName }}</div>
                                    <div class="text-xs text-slate-400">Scad: {{ batch.expiryDate | date:'dd/MM/yyyy' }}</div>
                                </td>
                                <td class="px-4 py-3">
                                    <span class="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-xs font-mono font-bold border border-emerald-100">
                                        {{ batch.internalLot }}
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-center">
                                    <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                                        {{ batch.ingredients.length }}
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-right" (click)="$event.stopPropagation()">
                                    <button (click)="deleteBatch(batch.id)" [disabled]="!state.isContextEditable()"
                                        class="p-2 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30">
                                        <i class="fa-solid fa-trash-can"></i>
                                    </button>
                                </td>
                            </tr>
                        }
                        @if (filteredBatches().length === 0) {
                            <tr>
                                <td colspan="5" class="p-10 text-center text-slate-400">
                                    <div class="mb-2"><i class="fa-solid fa-clipboard-list text-3xl opacity-20"></i></div>
                                    Nessuna produzione trovata. Crea la prima scheda o adatta i filtri di ricerca.
                                </td>
                            </tr>
                        }
                    </tbody>
                </table>
             </div>
          </div>
      }

      <!-- DETAIL VIEW: PRODUCTION SHEET -->
      @if (viewMode() === 'detail' && currentBatch()) {
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
              
              <!-- LEFT COL: MAIN PRODUCT DATA (MANUAL) -->
              <div class="lg:col-span-1 space-y-6">
                  <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <h3 class="font-bold text-slate-800 mb-4 flex items-center border-b pb-2">
                          <i class="fa-solid fa-file-pen mr-2 text-emerald-600"></i> Dati Prodotto Finito
                      </h3>
                      
                      <div class="space-y-4">
                          <div>
                              <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Preparazione</label>
                              <input type="text" [(ngModel)]="currentBatch()!.productName" placeholder="Es. Ragù Bolognese"
                                     class="w-full p-2 rounded border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none font-bold text-slate-700 capitalize">
                          </div>

                          <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Data Prep.</label>
                                    <input type="date" [(ngModel)]="currentBatch()!.preparationDate" (change)="onDateChange()"
                                           class="w-full p-2 rounded border border-slate-300 focus:border-emerald-500 outline-none text-sm">
                                    <p class="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wider">*In memoria max 60 gg.</p>
                                </div>
                              <div>
                                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Scadenza</label>
                                  <input type="date" [(ngModel)]="currentBatch()!.expiryDate"
                                         class="w-full p-2 rounded border border-slate-300 focus:border-emerald-500 outline-none text-sm">
                              </div>
                          </div>

                              <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase mb-0.5">Lotto Interno (Automatico)</label>
                                <p class="text-[10px] text-slate-400 mb-1 leading-tight italic">Il numero del lotto di ogni preparato corrisponde alla data di produzione.</p>
                                <div class="relative">
                                  <i class="fa-solid fa-barcode absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                  <input type="text" [(ngModel)]="currentBatch()!.internalLot" placeholder="es. 30-04-2026-01"
                                         class="w-full pl-8 p-2 rounded border border-slate-300 focus:border-emerald-500 outline-none font-mono text-sm uppercase shadow-sm">
                                </div>
                              </div>

                          <div>
                              <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Note / Operatore</label>
                              <textarea [(ngModel)]="currentBatch()!.notes" rows="3" class="w-full p-2 rounded border border-slate-300 text-sm resize-none"></textarea>
                          </div>
                      </div>
                      
                      <div class="mt-6 pt-4 border-t border-slate-100">
                          <button (click)="saveBatch()" class="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-sm transition-all flex justify-center items-center">
                              <i class="fa-solid fa-save mr-2"></i> Salva Intera Scheda
                          </button>
                      </div>
                  </div>
              </div>

              <!-- RIGHT COL: INGREDIENTS & AI SCAN -->
              <div class="lg:col-span-2 space-y-6">
                  
                  <!-- ADD INGREDIENT BOX -->
                  <div class="bg-indigo-50/50 border border-indigo-100 rounded-xl p-6 relative overflow-hidden">
                      <div class="absolute top-0 right-0 w-32 h-32 bg-indigo-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                      
                      <div class="relative z-10">
                          <h4 class="font-bold text-indigo-900 mb-4 flex items-center">
                              <i class="fa-solid fa-robot mr-2 text-indigo-500"></i> Aggiungi Ingrediente (AI Scan)
                          </h4>

                          <div class="flex flex-col md:flex-row gap-6">
                              <!-- Image Upload -->
                              <div class="w-full md:w-1/3 shrink-0">
                                  <div class="aspect-square bg-white border-2 border-dashed border-indigo-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 transition-all group relative overflow-hidden"
                                       (click)="fileInput.click()">
                                      
                                      @if (scannedImage()) {
                                          <img [src]="scannedImage()" class="w-full h-full object-contain p-2">
                                          <button (click)="resetScan(); $event.stopPropagation()" class="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600">
                                              <i class="fa-solid fa-times text-xs"></i>
                                          </button>
                                      } @else {
                                          <div class="w-12 h-12 bg-indigo-50 text-indigo-400 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                              <i class="fa-solid fa-camera text-xl"></i>
                                          </div>
                                          <div class="text-xs font-bold text-indigo-800 uppercase">Carica Foto</div>
                                          <div class="text-[10px] text-indigo-400">Etichetta o DDT</div>
                                      }
                                      <input #fileInput type="file" accept="image/*" class="hidden" (change)="onFileSelected($event)">
                                  </div>

                                  <button (click)="analyzeImage()" 
                                      [disabled]="!selectedFile() || isAnalyzing()"
                                      class="w-full mt-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs uppercase shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center">
                                      @if (isAnalyzing()) {
                                          <i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Analisi...
                                      } @else {
                                          <i class="fa-solid fa-wand-magic-sparkles mr-2"></i> Analizza
                                      }
                                  </button>
                              </div>

                              <!-- Ingredient Form -->
                              <div class="flex-1 space-y-4">
                                  <div class="grid grid-cols-2 gap-4">
                                      <div class="col-span-2">
                                          <label class="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Ingrediente Identificato</label>
                                          <input type="text" [(ngModel)]="newIngredient.productName" placeholder="Es. Farina 00"
                                              class="w-full p-2 rounded bg-white border border-indigo-100 focus:border-indigo-400 outline-none text-sm font-bold text-indigo-900 capitalize">
                                      </div>
                                      
                                      <div>
                                          <label class="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Lotto</label>
                                          <input type="text" [(ngModel)]="newIngredient.lotNumber" placeholder="L-..."
                                              class="w-full p-2 rounded bg-white border border-indigo-100 focus:border-indigo-400 outline-none text-sm font-mono capitalize">
                                      </div>

                                      <div>
                                          <label class="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Scadenza</label>
                                          <input type="date" [(ngModel)]="newIngredient.expiryDate"
                                              class="w-full p-2 rounded bg-white border border-indigo-100 focus:border-indigo-400 outline-none text-sm">
                                      </div>
                                  </div>

                                  <div class="flex justify-end pt-2">
                                      <button (click)="addIngredient()" [disabled]="!newIngredient.productName"
                                          class="px-6 py-2 bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 rounded-lg font-bold text-sm transition-all shadow-sm">
                                          <i class="fa-solid fa-plus mr-2"></i> Aggiungi alla Lista
                                      </button>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  <!-- INGREDIENTS LIST -->
                  <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <div class="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                          <h4 class="font-bold text-slate-700 flex items-center">
                              <i class="fa-solid fa-list-ul mr-2 text-slate-400"></i> Ingredienti Associati
                          </h4>
                          <span class="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">{{ currentBatch()?.ingredients?.length || 0 }}</span>
                      </div>

                      <div class="overflow-x-auto">
                        <table class="w-full text-left">
                            <thead class="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-100">
                                <tr>
                                    <th class="px-4 py-2">Ingrediente</th>
                                    <th class="px-4 py-2">Lotto</th>
                                    <th class="px-4 py-2">Scadenza</th>
                                    <th class="px-4 py-2 text-right"></th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-50">
                                @for (ing of currentBatch()?.ingredients; track ing.id) {
                                    <tr class="hover:bg-slate-50">
                                        <td class="px-4 py-2 font-medium text-slate-700">{{ ing.productName }}</td>
                                        <td class="px-4 py-2 font-mono text-xs text-slate-500">{{ ing.lotNumber }}</td>
                                        <td class="px-4 py-2 text-sm text-slate-600" [class.text-red-500]="isExpired(ing.expiryDate)">
                                            {{ ing.expiryDate | date:'dd/MM/yy' }}
                                        </td>
                                        <td class="px-4 py-2 text-right">
                                            <button (click)="removeIngredient(ing.id)" class="text-slate-300 hover:text-red-500 transition-colors">
                                                <i class="fa-solid fa-times-circle"></i>
                                            </button>
                                        </td>
                                    </tr>
                                }
                                @if (!currentBatch()?.ingredients?.length) {
                                    <tr>
                                        <td colspan="4" class="p-6 text-center text-slate-400 text-sm italic">
                                            Nessun ingrediente associato. Usa lo scanner AI sopra.
                                        </td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                      </div>
                  </div>

              </div>
          </div>
      }

      <!-- CUSTOM CONFIRMATION MODAL -->
      @if (confirmationState()) {
          <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" (click)="cancelConfirmation()"></div>
              
              <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative z-10 animate-fade-in-up border border-slate-100">
                  <div class="flex items-start gap-4 mb-4">
                      <div class="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                          <i class="fa-solid fa-triangle-exclamation text-xl"></i>
                      </div>
                      <div>
                          <h3 class="text-lg font-bold text-slate-800">{{ confirmationState()?.title }}</h3>
                          <p class="text-slate-600 text-sm mt-1 leading-relaxed">{{ confirmationState()?.message }}</p>
                      </div>
                  </div>
                  
                  <div class="flex justify-end gap-3 mt-6">
                      <button (click)="cancelConfirmation()" 
                          class="px-4 py-2 rounded-lg text-slate-600 font-bold text-sm hover:bg-slate-100 transition-colors">
                          Annulla
                      </button>
                      <button (click)="confirmAction()" 
                          class="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-sm shadow-md transition-colors flex items-center">
                          <i class="fa-solid fa-check mr-2"></i> Conferma
                      </button>
                  </div>
              </div>
          </div>
      }

    </div>
  `,
  styles: [`
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-fade-in-up {
        animation: fadeInUp 0.3s ease-out forwards;
      }
    `]
})
export class TraceabilityViewComponent implements OnInit {
  state = inject(AppStateService);
  geminiService = inject(GeminiService);
  toastService = inject(ToastService);

  // Confirmation State
  confirmationState = signal<{ title: string; message: string; action: () => void } | null>(null);

  viewMode = signal<'list' | 'detail'>('list');
  allBatches = signal<ProductionBatch[]>([]);
  currentBatch = signal<ProductionBatch | null>(null);

  // Filters
  searchQuery = signal('');
  dateFrom = signal('');
  dateTo = signal('');

  filteredBatches = computed(() => {
    let bs = this.allBatches();

    const search = this.searchQuery().toLowerCase();
    if (search) {
      bs = bs.filter(b => 
        b.productName.toLowerCase().includes(search) || 
        b.internalLot.toLowerCase().includes(search)
      );
    }

    const dFrom = this.dateFrom();
    if (dFrom) {
       bs = bs.filter(b => b.preparationDate >= dFrom);
    }

    const dTo = this.dateTo();
    if (dTo) {
       bs = bs.filter(b => b.preparationDate <= dTo);
    }

    return bs.sort((a, b) => new Date(b.preparationDate).getTime() - new Date(a.preparationDate).getTime());
  });

  // AI & New Ingredient State
  selectedFile = signal<File | null>(null);
  scannedImage = signal<string | null>(null);
  isAnalyzing = signal(false);

  newIngredient: Ingredient = {
    id: '',
    productName: '',
    lotNumber: '',
    expiryDate: ''
  };

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    const stored = localStorage.getItem('haccp_traceability_productions');
    if (stored) {
      try {
        let batches: ProductionBatch[] = JSON.parse(stored);
        
        // Remove batches older than 60 days automatically
        const originalLength = batches.length;
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        
        batches = batches.filter(b => new Date(b.preparationDate) >= sixtyDaysAgo);
        
        this.allBatches.set(batches);

        // If items got purged, immediately persist the state
        if (batches.length !== originalLength) {
           this.saveAll();
        }
      } catch (e) {
        console.error('Error loading productions', e);
      }
    }
  }

  saveAll() {
    localStorage.setItem('haccp_traceability_productions', JSON.stringify(this.allBatches()));
  }

  // --- Production Management ---

  createNewProduction() {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // yyyy-mm-dd for the preparationDate field
    
    // Generate automatic lot: gg-mm-aaaa-xx
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const datePrefix = `${day}-${month}-${year}`;

    // Find how many batches exist for TODAY to get the progressive XX
    const todayBatches = this.allBatches().filter(b => b.preparationDate === dateStr);
    const progressive = String(todayBatches.length + 1).padStart(2, '0');
    const generatedLot = `${datePrefix}-${progressive}`;

    const newBatch: ProductionBatch = {
      id: crypto.randomUUID(),
      productName: '',
      preparationDate: dateStr,
      expiryDate: '',
      internalLot: generatedLot,
      operator: this.state.currentUser()?.name || '',
      notes: '',
      ingredients: []
    };
    this.currentBatch.set(newBatch);
    this.viewMode.set('detail');
    this.resetIngredientForm();
  }

  onDateChange() {
    const batch = this.currentBatch();
    if (!batch || !batch.preparationDate) return;

    // Recalculate lot based on the NEW selected date
    const selectedDate = new Date(batch.preparationDate);
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const year = selectedDate.getFullYear();
    const datePrefix = `${day}-${month}-${year}`;

    const sameDayBatches = this.allBatches().filter(b => b.preparationDate === batch.preparationDate);
    const progressive = String(sameDayBatches.length + 1).padStart(2, '0');
    
    batch.internalLot = `${datePrefix}-${progressive}`;
  }

  openProduction(batch: ProductionBatch) {
    // Clone to avoid direct mutation until save
    this.currentBatch.set(JSON.parse(JSON.stringify(batch)));
    this.viewMode.set('detail');
    this.resetIngredientForm();
  }

  saveBatch() {
    const batch = this.currentBatch();
    if (!batch || !batch.productName) return;

    this.allBatches.update(list => {
      const index = list.findIndex(b => b.id === batch.id);
      if (index >= 0) {
        const updated = [...list];
        updated[index] = batch;
        return updated;
      }
      return [batch, ...list];
    });

    this.saveAll();

    // Add to checklistRecords for reporting
    this.state.saveRecord('traceability', {
      Attività: '🛒 Registrazione Lotto / Produzione',
      Prodotto: batch.productName,
      Lotto: batch.internalLot || 'N/A',
      Scadenza: batch.expiryDate || 'N/A',
      Ingredienti: batch.ingredients.length
    });

    this.toastService.success('Produzione Salvata', 'La scheda di produzione è stata aggiornata correttamente.');
    this.viewMode.set('list');
  }

  closeProduction() {
    this.askConfirmation(
      'Chiudere senza salvare?',
      'Le modifiche non salvate andranno perse. Sei sicuro di voler uscire?',
      () => {
        this.viewMode.set('list');
        this.currentBatch.set(null);
      }
    );
  }

  deleteBatch(id: string) {
    this.askConfirmation(
      'Eliminare Produzione?',
      'Questa azione è irreversibile. La scheda verra rimossa definitivamente.',
      () => {
        this.allBatches.update(l => l.filter(b => b.id !== id));
        this.saveAll();
        this.toastService.success('Eliminato', 'Scheda produzione rimossa con successo.');
      }
    );
  }

  // --- Confirmation Helpers ---
  askConfirmation(title: string, message: string, action: () => void) {
    this.confirmationState.set({ title, message, action });
  }

  confirmAction() {
    const state = this.confirmationState();
    if (state) {
      state.action();
    }
    this.confirmationState.set(null);
  }

  cancelConfirmation() {
    this.confirmationState.set(null);
  }

  // --- Ingredient & AI Logic ---

  resetIngredientForm() {
    this.newIngredient = { id: '', productName: '', lotNumber: '', expiryDate: '' };
    this.resetScan();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
          this.toastService.error('Foto troppo grande', 'L\'immagine supera il limite di 10MB. Riduci la risoluzione prima di caricarla.');
          return;
      }

      this.selectedFile.set(file);

      const reader = new FileReader();
      reader.onload = (e) => this.scannedImage.set(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  resetScan() {
    this.selectedFile.set(null);
    this.scannedImage.set(null);
  }

  async analyzeImage() {
    const file = this.selectedFile();
    if (!file) return;

    this.isAnalyzing.set(true);
    try {
      const data = await this.geminiService.analyzeImage(file);
      if (data) {
        this.newIngredient.productName = data.productName || '';
        this.newIngredient.lotNumber = data.lotNumber || '';
        this.newIngredient.expiryDate = data.expiryDate || '';
      }
    } catch (e: any) {
      if (e.message === 'API_KEY_MISSING') {
        this.toastService.error('Configurazione Mancante', 'Chiave API Gemini non trovata. Imposta GEMINI_API_KEY nel file .env.local');
      } else if (e.message === 'JSON_PARSE_FAILED') {
        this.toastService.warning('Analisi Parziale', 'L\'AI ha risposto ma non è riuscita a formattare i dati. Prova con un\'altra foto.');
      } else {
        console.error('Analysis error details:', e);
        const errorMsg = e.message || 'Errore sconosciuto';
        this.toastService.error('Errore Analisi', `Dettaglio: ${errorMsg}. Verifica la qualità della foto.`);
      }
    } finally {
      this.isAnalyzing.set(false);
    }
  }

  addIngredient() {
    if (!this.newIngredient.productName) return;

    const ingredientToAdd: Ingredient = {
      ...this.newIngredient,
      id: crypto.randomUUID()
    };

    this.currentBatch.update(batch => {
      if (!batch) return null;
      return {
        ...batch,
        ingredients: [...batch.ingredients, ingredientToAdd]
      };
    });

    this.resetIngredientForm();
    this.toastService.success('Ingrediente Aggiunto', `${ingredientToAdd.productName} aggiunto alla lista.`);
  }

  removeIngredient(ingId: string) {
    this.askConfirmation(
      'Rimuovere Ingrediente?',
      'Vuoi rimuovere questo ingrediente dalla lista?',
      () => {
        this.currentBatch.update(batch => {
          if (!batch) return null;
          return {
            ...batch,
            ingredients: batch.ingredients.filter(i => i.id !== ingId)
          };
        });
        this.toastService.info('Rimosso', 'Ingrediente rimosso dalla lista.');
      }
    );
  }

  isExpired(dateStr: string): boolean {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  }
}
