import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppStateService, Recipe, RecipeIngredient } from '../services/app-state.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-ingredients-book-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fade-in p-2 pb-12 max-w-7xl mx-auto">
      
      <!-- Premium Hero Header -->
      <div class="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative overflow-hidden">
        <div class="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-indigo-50/50 to-transparent pointer-events-none"></div>
        <div class="absolute -left-10 -top-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
        
        <div class="flex items-center gap-6 relative z-10">
          <div class="h-16 w-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-slate-200 ring-4 ring-slate-50">
            <i class="fa-solid fa-book-open"></i>
          </div>
          <div>
            <h2 class="text-3xl font-black text-slate-800 tracking-tight leading-none mb-2">Libro degli Ingredienti</h2>
            <div class="flex items-center gap-3">
              <span class="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                <i class="fa-solid fa-utensils"></i> {{ state.filteredRecipes().length }} Ricette Archiviate
              </span>
              <span class="text-xs font-medium text-slate-300">|</span>
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Regolamento UE 1169/2011</span>
            </div>
          </div>
        </div>
        
        <div class="flex items-center gap-3 w-full md:w-auto relative z-10">
          <div class="relative flex-1 md:w-64">
            <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input type="text" [(ngModel)]="searchQuery" placeholder="Cerca piatto o ingrediente..." 
                   class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
          </div>
          <button (click)="printIngredientsBook()" 
                  class="h-11 px-6 bg-white border-2 border-slate-900 text-slate-900 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 shrink-0">
            <i class="fa-solid fa-print text-lg"></i> STAMPA LIBRO
          </button>
          <button (click)="openAddModal()" 
                  class="h-11 px-6 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 shrink-0">
            <i class="fa-solid fa-plus-circle text-lg"></i> NUOVA SCHEDA
          </button>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50/50 border-b border-slate-100">
              <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Piatto / Preparazione</th>
              <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
              <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Allergeni Presenti</th>
              <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Azioni</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @for (recipe of filteredRecipes(); track recipe.id) {
              <tr class="group hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 border border-indigo-100/50 group-hover:scale-110 transition-transform">
                      <i class="fa-solid fa-plate-wheat"></i>
                    </div>
                    <div>
                      <h4 class="font-bold text-slate-700 text-sm tracking-tight leading-tight">{{ recipe.name }}</h4>
                      <p class="text-[10px] text-slate-400 italic truncate max-w-[200px]">{{ recipe.description || 'Nessuna descrizione' }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span class="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">
                    {{ recipe.category || 'Generale' }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="flex flex-wrap gap-1.5">
                    @for (all of getAllergensForRecipe(recipe); track all.id) {
                      <div class="px-2 py-0.5 rounded-md border flex items-center gap-1.5 shadow-sm" [class]="all.bg + ' ' + all.active">
                        <i [class]="'fa-solid ' + all.icon + ' text-[10px]'"></i>
                        <span class="text-[9px] font-black uppercase">{{ all.code }}</span>
                      </div>
                    } @empty {
                       <span class="text-[10px] font-bold text-slate-300 italic uppercase">Nessuno</span>
                    }
                  </div>
                </td>
                <td class="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                  <button (click)="printSingleRecipe(recipe)" class="w-9 h-9 bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 rounded-lg transition-all shadow-sm" title="Stampa singola scheda">
                    <i class="fa-solid fa-print text-sm"></i>
                  </button>
                  <button (click)="openEditModal(recipe)" class="w-9 h-9 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 rounded-lg transition-all shadow-sm">
                    <i class="fa-solid fa-pen-to-square text-sm"></i>
                  </button>
                  <button (click)="deleteRecipe(recipe)" class="w-9 h-9 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 rounded-lg transition-all shadow-sm">
                    <i class="fa-solid fa-trash-can text-sm"></i>
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="px-6 py-20 text-center">
                  <div class="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100 text-slate-200">
                    <i class="fa-solid fa-book-open text-4xl"></i>
                  </div>
                  <h3 class="text-lg font-bold text-slate-400 uppercase tracking-widest">Nessuna ricetta</h3>
                  <p class="text-sm text-slate-400 mt-2">Inizia aggiungendo il primo piatto al libro degli ingredienti.</p>
                  <button (click)="openAddModal()" class="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg active:scale-95">CREA ORA</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Add/Edit Recipe Modal -->
      @if (isModalOpen()) {
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" (click)="closeModal()"></div>
          <div class="relative bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up border border-slate-200 flex flex-col max-h-[90vh]">
            
            <!-- Modal Header -->
            <div class="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div class="flex items-center gap-4">
                <div class="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl shadow-xl shadow-indigo-100">
                  <i class="fa-solid" [class.fa-plus]="!editingRecipe()" [class.fa-pen-to-square]="editingRecipe()"></i>
                </div>
                <div>
                  <h3 class="text-xl font-black text-slate-800 tracking-tight leading-none">{{ editingRecipe() ? 'Modifica Scheda Piatto' : 'Nuova Scheda Piatto' }}</h3>
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Definizione Ingredienti & Allergeni</p>
                </div>
              </div>
              <button (click)="closeModal()" class="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all flex items-center justify-center">
                <i class="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <!-- Modal Content -->
            <div class="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1 bg-white">
              
              <!-- Searchable Select UI (Keyword + Dropdown) -->
              <!-- Searchable Select UI (Keyword + Dropdown) -->
              <div class="p-8 bg-gradient-to-br from-indigo-50 to-slate-50 rounded-[2.5rem] border border-indigo-100/50 mb-8 shadow-inner relative overflow-hidden">
                <div class="absolute -right-10 -bottom-10 w-40 h-40 bg-white rounded-full blur-3xl opacity-60"></div>
                
                <div class="relative z-10 space-y-6">
                  <div class="flex items-center gap-3 mb-2">
                    <div class="h-10 w-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                      <i class="fa-solid fa-magnifying-glass"></i>
                    </div>
                    <div>
                      <h4 class="text-sm font-black text-slate-800 tracking-tight uppercase">Ricerca Rapida Ricettario</h4>
                      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Trova piatti tra oltre 320 preset professionali</p>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Keyword Search -->
                    <div class="space-y-2">
                      <label class="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-1 ml-1 flex items-center gap-1.5">
                        <i class="fa-solid fa-keyboard text-xs"></i> Filtra per parola
                      </label>
                      <input type="text" 
                             [ngModel]="presetSearchQuery()" 
                             (ngModelChange)="presetSearchQuery.set($event)"
                             placeholder="Es: Carbonara, Pizza, Torta..." 
                             class="w-full bg-white border-2 border-indigo-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all shadow-sm placeholder:text-slate-300">
                    </div>

                    <!-- Select Menu -->
                    <div class="space-y-2">
                      <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 ml-1 flex items-center gap-1.5">
                        <i class="fa-solid fa-list-ul text-xs"></i> Seleziona Piatto
                      </label>
                      <div class="relative">
                        <select (change)="loadPreset($any($event.target).value)" 
                                class="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-8 focus:ring-slate-500/5 focus:border-slate-300 outline-none transition-all shadow-sm appearance-none cursor-pointer">
                          <option value="">-- {{ filteredPresetKeys().length }} Piatti Disponibili --</option>
                          
                          <optgroup label="🥂 ANTIPASTI">
                            @for (key of filteredPresetKeys(); track key) {
                              @if (PRESET_RECIPES[key].category === 'Antipasti') {
                                <option [value]="key">{{ key }}</option>
                              }
                            }
                          </optgroup>

                          <optgroup label="🍝 PRIMI PIATTI">
                            @for (key of filteredPresetKeys(); track key) {
                              @if (PRESET_RECIPES[key].category === 'Primi') {
                                <option [value]="key">{{ key }}</option>
                              }
                            }
                          </optgroup>

                          <optgroup label="🍖 SECONDI PIATTI">
                            @for (key of filteredPresetKeys(); track key) {
                              @if (PRESET_RECIPES[key].category === 'Secondi') {
                                <option [value]="key">{{ key }}</option>
                              }
                            }
                          </optgroup>

                          <optgroup label="🍕 PIZZERIA & PUB">
                            @for (key of filteredPresetKeys(); track key) {
                              @if (PRESET_RECIPES[key].category === 'Pizzeria') {
                                <option [value]="key">{{ key }}</option>
                              }
                            }
                          </optgroup>

                          <optgroup label="🥗 CONTORNI">
                            @for (key of filteredPresetKeys(); track key) {
                              @if (PRESET_RECIPES[key].category === 'Contorni') {
                                <option [value]="key">{{ key }}</option>
                              }
                            }
                          </optgroup>

                          <optgroup label="🍰 DESSERT & DOLCI">
                            @for (key of filteredPresetKeys(); track key) {
                              @if (PRESET_RECIPES[key].category === 'Dessert') {
                                <option [value]="key">{{ key }}</option>
                              }
                            }
                          </optgroup>

                          <optgroup label="🥖 PANETTERIA & SNACK">
                            @for (key of filteredPresetKeys(); track key) {
                              @if (PRESET_RECIPES[key].category === 'Panetteria') {
                                <option [value]="key">{{ key }}</option>
                              }
                            }
                          </optgroup>
                        </select>
                        <i class="fa-solid fa-chevron-down absolute right-6 top-1/2 -translate-y-1/2 text-indigo-300 pointer-events-none"></i>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 px-2">
                    <i class="fa-solid fa-circle-info text-indigo-400 text-[10px]"></i>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                      Consiglio: digita una categoria (es. 'Dolci') per vedere solo i piatti correlati.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Basic Info Section -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome del Piatto</label>
                  <div class="relative flex items-center gap-2">
                    <input type="text" [(ngModel)]="currentRecipe.name" placeholder="Es: Risotto ai Funghi Porcini..." 
                           class="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-inner">
                    <button (click)="simulateAIAutocomplete()" 
                            [disabled]="isGenerating || !currentRecipe.name"
                            class="px-6 py-3.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all disabled:opacity-50 flex items-center gap-2 shrink-0 shadow-lg">
                      <i class="fa-solid" [class.fa-wand-magic-sparkles]="!isGenerating" [class.fa-spinner]="isGenerating" [class.animate-spin]="isGenerating"></i>
                      {{ isGenerating ? 'Analisi...' : 'AI Gemini' }}
                    </button>
                  </div>
                </div>

                <div class="space-y-2">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Categoria</label>
                  <select [(ngModel)]="currentRecipe.category" 
                          class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-inner appearance-none cursor-pointer">
                    <option value="Antipasti">Antipasti</option>
                    <option value="Primi">Primi</option>
                    <option value="Secondi">Secondi</option>
                    <option value="Contorni">Contorni</option>
                    <option value="Dessert">Dessert</option>
                    <option value="Pizzeria">Pizzeria</option>
                    <option value="Panetteria">Panetteria</option>
                  </select>
                </div>
              </div>

              <!-- Ingredients Section -->
              <div class="space-y-4">
                <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 class="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                    <i class="fa-solid fa-list-check"></i> Elenco Ingredienti & Allergeni
                  </h4>
                  <button (click)="addIngredientRow()" class="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors border border-indigo-100 flex items-center gap-1.5 shadow-sm">
                    <i class="fa-solid fa-plus-circle"></i> Aggiungi Ingrediente
                  </button>
                </div>

                <div class="space-y-3">
                  @for (ing of currentRecipe.ingredients; track ing; let i = $index) {
                    <div class="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 transition-all hover:bg-white hover:shadow-xl animate-fade-in group">
                      <div class="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
                        <div class="h-8 w-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xs font-black text-slate-400 shrink-0">
                          {{ i + 1 }}
                        </div>
                        <input type="text" [(ngModel)]="ing.name" placeholder="Ingrediente (con percentuale)..." 
                               list="common-ingredients-book"
                               class="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 transition-all">
                        <datalist id="common-ingredients-book">
                          @for (base of state.baseIngredients(); track base) {
                            <option [value]="base"></option>
                          }
                        </datalist>
                        <div class="relative w-28">
                          <input type="number" [(ngModel)]="ing.percentage" (ngModelChange)="sortIngredients()"
                                 placeholder="Q.tà" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 transition-all pr-8">
                          <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300">%</span>
                        </div>
                        <button (click)="removeIngredientRow(i)" class="w-10 h-10 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all shrink-0">
                          <i class="fa-solid fa-trash-alt"></i>
                        </button>
                      </div>

                      <!-- Lit-up Tags Area -->
                      <div class="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                        @for (all of state.ALLERGEN_LIST; track all.id) {
                          <button (click)="toggleAllergen(ing, all.id)"
                                  [class]="'flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all duration-300 ' + 
                                           (ing.allergens.includes(all.id) ? all.active : 'bg-white border-slate-100 text-slate-300 border-dashed hover:border-slate-300 hover:text-slate-400 opacity-60')">
                            <i [class]="'fa-solid ' + all.icon + ' ' + (ing.allergens.includes(all.id) ? 'scale-110' : '')"></i>
                            {{ all.label }}
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>

              <div class="space-y-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Note di Preparazione</label>
                <textarea [(ngModel)]="currentRecipe.description" placeholder="Es: Cottura 12 min, abbattimento rapido..." 
                          class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-medium text-slate-700 focus:bg-white border-indigo-500/20 outline-none transition-all shadow-inner h-24 resize-none"></textarea>
              </div>
            </div>

            <div class="p-8 bg-slate-50 border-t border-slate-100 flex gap-4 shrink-0 shadow-inner">
              <button (click)="closeModal()" class="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-3xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-100 transition-all shadow-sm">Annulla</button>
              <button (click)="saveRecipe()" class="flex-[2] py-4 bg-slate-900 text-white rounded-3xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">CONFERMA E SALVA RICETTA</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.5s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
  `]
})
export class IngredientsBookViewComponent {
  state = inject(AppStateService);
  toast = inject(ToastService);

  searchQuery = '';
  isModalOpen = signal(false);
  editingRecipe = signal(false);
  isGenerating = false;

  // --- PRESET RECIPES DATABASE (40+ PRÌMI + CATEGORIES) ---
  readonly PRESET_RECIPES: Record<string, any> = {
    // --- ANTIPASTI (50) ---
    // TERRA E SALUMI (1-20)
    'Tagliere Salumi Misti': { category: 'Antipasti', ingredients: [{ name: 'Prosciutto, Salame, Coppa, Pancetta', percentage: 90, allergens: [] }, { name: 'Gnocco fritto', percentage: 10, allergens: ['Glutine'] }], desc: 'Selezione salumi.' },
    'Bruschetta al Pomodoro': { category: 'Antipasti', ingredients: [{ name: 'Pane tostato', percentage: 65, allergens: ['Glutine'] }, { name: 'Pomodorini fresca', percentage: 25, allergens: [] }, { name: 'Olio EVO, Aglio, Basilico', percentage: 10, allergens: [] }], desc: 'Antipasto classico.' },
    'Bresaola, Rucola e Grana': { category: 'Antipasti', ingredients: [{ name: 'Bresaola Valtellina', percentage: 55, allergens: [] }, { name: 'Rucola fresca', percentage: 25, allergens: [] }, { name: 'Scaglie Parmigiano', percentage: 15, allergens: ['Latte'] }, { name: 'Olio, Limone', percentage: 5, allergens: [] }], desc: 'Piatto leggero.' },
    'Prosciutto e Melone': { category: 'Antipasti', ingredients: [{ name: 'Melone Retato', percentage: 70, allergens: [] }, { name: 'Prosciutto Crudo', percentage: 30, allergens: [] }], desc: 'Classico estivo.' },
    'Tagliere Formaggi e Miele': { category: 'Antipasti', ingredients: [{ name: 'Mix Formaggi (Pecorino, Zola, Taleggio)', percentage: 70, allergens: ['Latte'] }, { name: 'Miele e Confetture', percentage: 20, allergens: [] }, { name: 'Noci', percentage: 10, allergens: ['Frutta a guscio'] }], desc: 'Degustazione casearia.' },
    'Carpaccio di Manzo': { category: 'Antipasti', ingredients: [{ name: 'Manzo a fette sottili', percentage: 70, allergens: [] }, { name: 'Rucola, Parmigiano', percentage: 20, allergens: ['Latte'] }, { name: 'Olio EVO, Limone', percentage: 10, allergens: [] }], desc: 'Carpaccio fresco.' },
    'Crostoni ai Funghi Porcini': { category: 'Antipasti', ingredients: [{ name: 'Pane casereccio', percentage: 60, allergens: ['Glutine'] }, { name: 'Funghi Porcini', percentage: 30, allergens: [] }, { name: 'Burro, Aglio', percentage: 10, allergens: ['Latte'] }], desc: 'Crostini ricchi.' },
    'Vitello Tonnato (Antipasto)': { category: 'Antipasti', ingredients: [{ name: 'Girello vitello', percentage: 60, allergens: [] }, { name: 'Salsa tonnata (Maionese, Tonno, Capperi)', percentage: 40, allergens: ['Uova', 'Pesce'] }], desc: 'Gusto piemontese.' },
    'Burrata e Pomodori Secchi': { category: 'Antipasti', ingredients: [{ name: 'Burrata Pugliese', percentage: 70, allergens: ['Latte'] }, { name: 'Pomodori secchi', percentage: 20, allergens: ['Solfiti'] }, { name: 'Olio EVO, Basilico', percentage: 10, allergens: [] }], desc: 'Abbinamento saporito.' },
    'Caprese di Bufala': { category: 'Antipasti', ingredients: [{ name: 'Mozzarella Bufala', percentage: 60, allergens: ['Latte'] }, { name: 'Pomodoro ramato', percentage: 35, allergens: [] }, { name: 'Olio EVO, Origano', percentage: 5, allergens: [] }], desc: 'Tricolore fresco.' },
    'Tortino di Verdure': { category: 'Antipasti', ingredients: [{ name: 'Verdure stagione', percentage: 60, allergens: [] }, { name: 'Uova, Parmigiano, Panna', percentage: 35, allergens: ['Uova', 'Latte'] }, { name: 'Pangrattato', percentage: 5, allergens: ['Glutine'] }], desc: 'Sformato saporito.' },
    'Crostini Toscani': { category: 'Antipasti', ingredients: [{ name: 'Pane tostato', percentage: 55, allergens: ['Glutine'] }, { name: 'Fegatini pollo', percentage: 40, allergens: [] }, { name: 'Burro, Cipolla, Capperi', percentage: 5, allergens: ['Latte'] }], desc: 'Gusto rustico.' },
    'Gnocco Fritto e Crudo': { category: 'Antipasti', ingredients: [{ name: 'Gnocco (Farina, Strutto)', percentage: 60, allergens: ['Glutine'] }, { name: 'Prosciutto Crudo', percentage: 40, allergens: [] }], desc: 'Emiliano doc.' },
    'Fiori di Zucca Ripieni': { category: 'Antipasti', ingredients: [{ name: 'Fiori zucca', percentage: 40, allergens: [] }, { name: 'Mozzarella, Acciughe', percentage: 35, allergens: ['Latte', 'Pesce'] }, { name: 'Pastella (Farina/Acqua)', percentage: 25, allergens: ['Glutine'] }], desc: 'Pastellati e fritti.' },
    'Uova Ripiene': { category: 'Antipasti', ingredients: [{ name: 'Uova sode', percentage: 70, allergens: ['Uova'] }, { name: 'Mousse Tonno/Maionese', percentage: 30, allergens: ['Pesce', 'Uova'] }], desc: 'Sfizio classico.' },
    'Salame e Sott\'oli': { category: 'Antipasti', ingredients: [{ name: 'Salame nostrano', percentage: 60, allergens: [] }, { name: 'Sott\'oli (Carciofini, Funghi)', percentage: 40, allergens: ['Solfiti'] }], desc: 'Tradizione.' },
    'Crescentine Emiliane': { category: 'Antipasti', ingredients: [{ name: 'Crescentine (Farina, Lievito)', percentage: 60, allergens: ['Glutine'] }, { name: 'Salumi, Squacquerone', percentage: 40, allergens: ['Latte'] }], desc: 'Bolognese.' },
    'Crostini Lardo e Miele': { category: 'Antipasti', ingredients: [{ name: 'Pane segale', percentage: 55, allergens: ['Glutine'] }, { name: 'Lardo Colonnata', percentage: 35, allergens: [] }, { name: 'Miele acacia', percentage: 10, allergens: [] }], desc: 'Salato e dolce.' },
    'Frittata di Verdure': { category: 'Antipasti', ingredients: [{ name: 'Uova fresche', percentage: 70, allergens: ['Uova'] }, { name: 'Zucchine/Cipolle', percentage: 25, allergens: [] }, { name: 'Parmigiano', percentage: 5, allergens: ['Latte'] }], desc: 'Cubetti frittata.' },
    'Polenta e Zola': { category: 'Antipasti', ingredients: [{ name: 'Polenta (Mais)', percentage: 70, allergens: [] }, { name: 'Gorgonzola fuso', percentage: 30, allergens: ['Latte'] }], desc: 'Rustico.' },
    // MARE (21-35)
    'Insalata di Mare': { category: 'Antipasti', ingredients: [{ name: 'Molluschi (Seppie, Calamari, Polpo)', percentage: 80, allergens: ['Molluschi'] }, { name: 'Gamberetti', percentage: 10, allergens: ['Crostacei'] }, { name: 'Olio, Limone, Prezzemolo', percentage: 10, allergens: [] }], desc: 'Mare fresco.' },
    'Sautè di Cozze e Vongole': { category: 'Antipasti', ingredients: [{ name: 'Cozze, Vongole', percentage: 90, allergens: ['Molluschi'] }, { name: 'Vino bianco, Olio, Aglio', percentage: 10, allergens: ['Solfiti'] }], desc: 'Frutti mare.' },
    'Impepata di Cozze': { category: 'Antipasti', ingredients: [{ name: 'Cozze fresche', percentage: 95, allergens: ['Molluschi'] }, { name: 'Pepe nero, Prezzemolo, Limone', percentage: 5, allergens: [] }], desc: 'Classico sud.' },
    'Carpaccio di Polpo': { category: 'Antipasti', ingredients: [{ name: 'Polpo cotto pressato', percentage: 90, allergens: ['Molluschi'] }, { name: 'Olio EVO, Limone, Prezzemolo', percentage: 10, allergens: [] }], desc: 'Polpo sottile.' },
    'Alici Marinate': { category: 'Antipasti', ingredients: [{ name: 'Alici fresche', percentage: 80, allergens: ['Pesce'] }, { name: 'Aceto vino bianco, Limone', percentage: 15, allergens: ['Solfiti'] }, { name: 'Olio, Aglio, Peperoncino', percentage: 5, allergens: [] }], desc: 'Marinate.' },
    'Cocktail di Gamberi': { category: 'Antipasti', ingredients: [{ name: 'Gamberetti boreali', percentage: 60, allergens: ['Crostacei'] }, { name: 'Salsa rosa (Maionese/Ketchup)', percentage: 30, allergens: ['Uova'] }, { name: 'Lattuga iceberg', percentage: 10, allergens: [] }], desc: 'Anni 80 classic.' },
    'Salmone Affumicato': { category: 'Antipasti', ingredients: [{ name: 'Salmone affumicato', percentage: 80, allergens: ['Pesce'] }, { name: 'Crostini pane, Burro', percentage: 20, allergens: ['Glutine', 'Latte'] }], desc: 'Salmone e burro.' },
    'Moscardini affogati': { category: 'Antipasti', ingredients: [{ name: 'Moscardini', percentage: 65, allergens: ['Molluschi'] }, { name: 'Pomodoro, Vino bianco', percentage: 25, allergens: ['Solfiti'] }, { name: 'Aglio, Peperoncino, Crostini', percentage: 10, allergens: ['Glutine'] }], desc: 'Cotti in umido.' },
    'Baccalà Mantecato': { category: 'Antipasti', ingredients: [{ name: 'Baccalà (Stoccafisso)', percentage: 70, allergens: ['Pesce'] }, { name: 'Olio EVO, Latte, Aglio', percentage: 25, allergens: ['Latte'] }, { name: 'Crostini polenta', percentage: 5, allergens: [] }], desc: 'Venezia antipasto.' },
    'Frittura di Paranza (Antipasto)': { category: 'Antipasti', ingredients: [{ name: 'Mix pesciolini paranza', percentage: 85, allergens: ['Pesce'] }, { name: 'Farina, Olio semi', percentage: 15, allergens: ['Glutine'] }], desc: 'Fritto leggero.' },
    'Tartare di Salmone': { category: 'Antipasti', ingredients: [{ name: 'Salmone fresco', percentage: 75, allergens: ['Pesce'] }, { name: 'Avocado', percentage: 20, allergens: [] }, { name: 'Lime, Olio, Erba cipollina', percentage: 5, allergens: [] }], desc: 'Mare e frutta.' },
    'Gamberi alla Catalana (Antipasto)': { category: 'Antipasti', ingredients: [{ name: 'Gamberoni code', percentage: 60, allergens: ['Crostacei'] }, { name: 'Pomodori, Cipolla rossa', percentage: 30, allergens: [] }, { name: 'Olio EVO, Aceto', percentage: 10, allergens: ['Solfiti'] }], desc: 'Sapore fresco.' },
    'Capesante Gratinate': { category: 'Antipasti', ingredients: [{ name: 'Capesante', percentage: 70, allergens: ['Molluschi'] }, { name: 'Pangrattato, Aglio, Prezzemolo', percentage: 20, allergens: ['Glutine'] }, { name: 'Burro, Brandy', percentage: 10, allergens: ['Latte', 'Solfiti'] }], desc: 'Gratinate forno.' },
    'Insalata di Polpo e Patate': { category: 'Antipasti', ingredients: [{ name: 'Polpo', percentage: 50, allergens: ['Molluschi'] }, { name: 'Patate bollite', percentage: 40, allergens: [] }, { name: 'Olio EVO, Prezzemolo, Olive', percentage: 10, allergens: [] }], desc: 'Abbinamento classico.' },
    'Polpette di Pesce': { category: 'Antipasti', ingredients: [{ name: 'Pesce (Merluzzo/Spada)', percentage: 65, allergens: ['Pesce'] }, { name: 'Pane, Uova, Prezzemolo', percentage: 25, allergens: ['Glutine', 'Uova'] }, { name: 'Pangrattato panatura', percentage: 10, allergens: ['Glutine'] }], desc: 'Seconda vita pesce.' },
    // SFIZI DA PIZZERIA E PUB (36-50)
    'Suppli al Telefono': { category: 'Antipasti', ingredients: [{ name: 'Riso carnaroli', percentage: 60, allergens: [] }, { name: 'Pomodoro e Carne macinata', percentage: 20, allergens: [] }, { name: 'Mozzarella fior di latte', percentage: 10, allergens: ['Latte'] }, { name: 'Pangrattato panatura', percentage: 10, allergens: ['Glutine'] }], desc: 'Classico romano.' },
    'Arancini di Riso': { category: 'Antipasti', ingredients: [{ name: 'Riso allo zafferano', percentage: 60, allergens: [] }, { name: 'Ragù di carne e piselli', percentage: 20, allergens: [] }, { name: 'Mozzarella', percentage: 10, allergens: ['Latte'] }, { name: 'Impanatura fritta', percentage: 10, allergens: ['Glutine'] }], desc: 'Specialità siciliana.' },
    'Crocchette di Patate (Antipasto)': { category: 'Antipasti', ingredients: [{ name: 'Patate lesse', percentage: 75, allergens: [] }, { name: 'Parmigiano, Mozzarella', percentage: 15, allergens: ['Latte'] }, { name: 'Uova, Pangrattato', percentage: 10, allergens: ['Uova', 'Glutine'] }], desc: 'Fritti dorati.' },
    'Olive Ascolane (Antipasto)': { category: 'Antipasti', ingredients: [{ name: 'Olive verdi grandi', percentage: 50, allergens: [] }, { name: 'Ripieno carne (Manzo, Maiale)', percentage: 30, allergens: [] }, { name: 'Panatura (Uova, Pangrattato)', percentage: 20, allergens: ['Uova', 'Glutine'] }], desc: 'Marchigiane doc.' },
    'Mozzarelline Fritte': { category: 'Antipasti', ingredients: [{ name: 'Mozzarella ciliegina', percentage: 70, allergens: ['Latte'] }, { name: 'Panatura uovo e pane', percentage: 30, allergens: ['Uova', 'Glutine'] }], desc: 'Sfizio filante.' },
    'Frittatina di Pasta': { category: 'Antipasti', ingredients: [{ name: 'Pasta (Spaghetti/Bucatini)', percentage: 50, allergens: ['Glutine'] }, { name: 'Besciamella', percentage: 30, allergens: ['Latte', 'Glutine'] }, { name: 'Piselli, Prosciutto cotto', percentage: 10, allergens: [] }, { name: 'Pastella frittura', percentage: 10, allergens: ['Glutine'] }], desc: 'Street food napoletano.' },
    'Montanare (Pizzette Fritte)': { category: 'Antipasti', ingredients: [{ name: 'Impasto pizza fritto', percentage: 75, allergens: ['Glutine'] }, { name: 'Pomodoro e Parmigiano', percentage: 20, allergens: ['Latte'] }, { name: 'Basilico fresco', percentage: 5, allergens: [] }], desc: 'Pizzette fritte.' },
    'Nuggets di Pollo (Antipasto)': { category: 'Antipasti', ingredients: [{ name: 'Petto di pollo', percentage: 70, allergens: [] }, { name: 'Panatura croccante', percentage: 25, allergens: ['Glutine', 'Uova'] }, { name: 'Spezie', percentage: 5, allergens: [] }], desc: 'Sfizio pub.' },
    'Alette di Pollo (Wings)': { category: 'Antipasti', ingredients: [{ name: 'Ali di pollo', percentage: 90, allergens: [] }, { name: 'Paprika e salse', percentage: 10, allergens: [] }], desc: 'Piccanti e saporite.' },
    'Nachos Formaggio e Jalapeños': { category: 'Antipasti', ingredients: [{ name: 'Nachos di mais', percentage: 70, allergens: [] }, { name: 'Salsa formaggio fuso', percentage: 20, allergens: ['Latte'] }, { name: 'Jalapeños sott\'aceto', percentage: 10, allergens: ['Solfiti'] }], desc: 'Stile messicano.' },
    'Mozzarella in Carrozza (Antipasto)': { category: 'Antipasti', ingredients: [{ name: 'Pane in cassetta', percentage: 40, allergens: ['Glutine'] }, { name: 'Mozzarella', percentage: 40, allergens: ['Latte'] }, { name: 'Pastella uovo e latte', percentage: 20, allergens: ['Uova', 'Latte'] }], desc: 'Filante e croccante.' },
    'Panelle Siciliane (Antipasto)': { category: 'Antipasti', ingredients: [{ name: 'Farina di ceci', percentage: 70, allergens: [] }, { name: 'Acqua e Prezzemolo', percentage: 25, allergens: [] }, { name: 'Olio frittura', percentage: 5, allergens: [] }], desc: 'Fritto di ceci.' },
    'Bruschetta Cacio e Pepe': { category: 'Antipasti', ingredients: [{ name: 'Pane casereccio', percentage: 70, allergens: ['Glutine'] }, { name: 'Crema Pecorino Romano', percentage: 25, allergens: ['Latte'] }, { name: 'Pepe nero', percentage: 5, allergens: [] }], desc: 'Variante saporita.' },
    'Verdure in Pastella (Antipasto)': { category: 'Antipasti', ingredients: [{ name: 'Mix Verdure (Cavoletti, Zucchine)', percentage: 65, allergens: [] }, { name: 'Pastella (Farina, Acqua frizzante)', percentage: 35, allergens: ['Glutine'] }], desc: 'Frittura mista.' },
    'Patate Dippers e Salse': { category: 'Antipasti', ingredients: [{ name: 'Patate a spicchi', percentage: 90, allergens: [] }, { name: 'Salse (Maionese/Barbecue)', percentage: 10, allergens: ['Uova', 'Solfiti'] }], desc: 'Patate croccanti.' },

    // PRIMI PIATTI - GRUPPO 1
    'Pasta alla Carbonara': { category: 'Primi', ingredients: [{ name: 'Semola di grano duro', percentage: 55, allergens: ['Glutine'] }, { name: 'Guanciale', percentage: 20, allergens: [] }, { name: 'Pecorino Romano', percentage: 10, allergens: ['Latte'] }, { name: 'Tuorli d\'uovo', percentage: 12, allergens: ['Uova'] }, { name: 'Pepe nero', percentage: 3, allergens: [] }], desc: 'Classica Carbonara.' },
    'Lasagna alla Bolognese': { category: 'Primi', ingredients: [{ name: 'Sfoglia uovo', percentage: 25, allergens: ['Glutine', 'Uova'] }, { name: 'Ragù Bovina/Suina', percentage: 35, allergens: [] }, { name: 'Besciamella', percentage: 25, allergens: ['Latte', 'Glutine'] }, { name: 'Parmigiano', percentage: 10, allergens: ['Latte'] }, { name: 'Burro', percentage: 5, allergens: ['Latte'] }], desc: 'Lasagna tradizionale.' },
    'Penne all\'Arrabbiata': { category: 'Primi', ingredients: [{ name: 'Semola di grano duro', percentage: 65, allergens: ['Glutine'] }, { name: 'Pomodoro', percentage: 25, allergens: [] }, { name: 'Olio EVO', percentage: 5, allergens: [] }, { name: 'Aglio, Peperoncino, Prezzemolo', percentage: 5, allergens: [] }], desc: 'Primo piccante.' },
    'Risotto ai Funghi Porcini': { category: 'Primi', ingredients: [{ name: 'Riso Carnaroli', percentage: 50, allergens: [] }, { name: 'Funghi Porcini', percentage: 25, allergens: [] }, { name: 'Burro, Parmigiano', percentage: 15, allergens: ['Latte'] }, { name: 'Brodo Vegetale', percentage: 5, allergens: ['Sedano'] }, { name: 'Cipolla, Vino', percentage: 5, allergens: ['Solfiti'] }], desc: 'Risotto cremoso.' },
    'Spaghetti alle Vongole': { category: 'Primi', ingredients: [{ name: 'Spaghetti', percentage: 55, allergens: ['Glutine'] }, { name: 'Vongole veraci', percentage: 30, allergens: ['Molluschi'] }, { name: 'Olio EVO, Aglio', percentage: 10, allergens: [] }, { name: 'Vino, Prezzemolo, Peperoncino', percentage: 5, allergens: ['Solfiti'] }], desc: 'Primo di mare.' },
    'Trofie al Pesto': { category: 'Primi', ingredients: [{ name: 'Trofie fresche', percentage: 65, allergens: ['Glutine'] }, { name: 'Basilico genovese DOP', percentage: 15, allergens: [] }, { name: 'Parmigiano, Pecorino', percentage: 10, allergens: ['Latte'] }, { name: 'Olio EVO, Pinoli, Aglio', percentage: 10, allergens: ['Frutta a guscio'] }], desc: 'Pesto genovese.' },
    'Amatriciana': { category: 'Primi', ingredients: [{ name: 'Bucatini', percentage: 55, allergens: ['Glutine'] }, { name: 'Pomodoro', percentage: 25, allergens: [] }, { name: 'Guanciale', percentage: 12, allergens: [] }, { name: 'Pecorino Romano', percentage: 5, allergens: ['Latte'] }, { name: 'Vino, Peperoncino', percentage: 3, allergens: ['Solfiti'] }], desc: 'Tradizione romana.' },
    'Gnocchi alla Sorrentina': { category: 'Primi', ingredients: [{ name: 'Gnocchi di patate', percentage: 60, allergens: ['Glutine'] }, { name: 'Pomodoro', percentage: 20, allergens: [] }, { name: 'Mozzarella bufala', percentage: 15, allergens: ['Latte'] }, { name: 'Parmigiano, Basilico', percentage: 5, allergens: ['Latte'] }], desc: 'Gnocchi filanti.' },
    'Tortellini in Brodo': { category: 'Primi', ingredients: [{ name: 'Brodo carne', percentage: 60, allergens: [] }, { name: 'Tortellini (Pasta uovo, Carne, Formaggio)', percentage: 40, allergens: ['Glutine', 'Uova', 'Latte'] }], desc: 'Tradizione emiliana.' },
    'Pasta alla Norma': { category: 'Primi', ingredients: [{ name: 'Rigatoni', percentage: 55, allergens: ['Glutine'] }, { name: 'Pomodoro, Melanzane', percentage: 35, allergens: [] }, { name: 'Ricotta salata', percentage: 8, allergens: ['Latte'] }, { name: 'Aglio, Basilico, Olio', percentage: 2, allergens: [] }], desc: 'Siciliana classica.' },
    'Pappardelle al Cinghiale': { category: 'Primi', ingredients: [{ name: 'Pappardelle uovo', percentage: 45, allergens: ['Glutine', 'Uova'] }, { name: 'Polpa Cinghiale', percentage: 30, allergens: [] }, { name: 'Pomodoro, Vino rosso', percentage: 15, allergens: ['Solfiti'] }, { name: 'Sedano, Carota, Cipolla', percentage: 10, allergens: ['Sedano'] }], desc: 'Gusto selvatico.' },
    'Risotto alla Milanese': { category: 'Primi', ingredients: [{ name: 'Riso', percentage: 55, allergens: [] }, { name: 'Brodo carne', percentage: 25, allergens: [] }, { name: 'Burro, Parmigiano', percentage: 12, allergens: ['Latte'] }, { name: 'Midollo, Zafferano', percentage: 5, allergens: [] }, { name: 'Vino bianco', percentage: 3, allergens: ['Solfiti'] }], desc: 'Risotto allo zafferano.' },
    'Linguine allo Scoglio': { category: 'Primi', ingredients: [{ name: 'Linguine', percentage: 50, allergens: ['Glutine'] }, { name: 'Cozze, Vongole', percentage: 25, allergens: ['Molluschi'] }, { name: 'Calamari, Gamberi', percentage: 20, allergens: ['Molluschi', 'Crostacei'] }, { name: 'Pomodorini, Aglio', percentage: 5, allergens: [] }], desc: 'Ricchezza di mare.' },
    'Orecchiette Cime di Rapa': { category: 'Primi', ingredients: [{ name: 'Orecchiette', percentage: 60, allergens: ['Glutine'] }, { name: 'Cime di rapa', percentage: 25, allergens: [] }, { name: 'Olio EVO, Aglio', percentage: 10, allergens: [] }, { name: 'Acciughe sott\'olio', percentage: 3, allergens: ['Pesce'] }, { name: 'Peperoncino', percentage: 2, allergens: [] }], desc: 'Tradizione pugliese.' },
    'Spaghetti Cacio e Pepe': { category: 'Primi', ingredients: [{ name: 'Spaghetti', percentage: 70, allergens: ['Glutine'] }, { name: 'Pecorino Romano', percentage: 20, allergens: ['Latte'] }, { name: 'Pepe nero, Sale', percentage: 10, allergens: [] }], desc: 'Semplicità romana.' },
    'Pasta e Fagioli': { category: 'Primi', ingredients: [{ name: 'Pasta corta', percentage: 40, allergens: ['Glutine'] }, { name: 'Fagioli borlotti', percentage: 35, allergens: [] }, { name: 'Brodo vegetale', percentage: 15, allergens: ['Sedano'] }, { name: 'Croste Parmigiano', percentage: 5, allergens: ['Latte'] }, { name: 'Pomodoro, Rosmarino', percentage: 5, allergens: [] }], desc: 'Piatto povero.' },
    'Tagliatelle ai Funghi': { category: 'Primi', ingredients: [{ name: 'Tagliatelle uovo', percentage: 55, allergens: ['Glutine', 'Uova'] }, { name: 'Funghi misti', percentage: 25, allergens: [] }, { name: 'Burro, Parmigiano', percentage: 15, allergens: ['Latte'] }, { name: 'Prezzemolo', percentage: 5, allergens: [] }], desc: 'Profumo di bosco.' },
    'Ravioli Burro e Salvia': { category: 'Primi', ingredients: [{ name: 'Ravioli (Ricotta/Spinaci)', percentage: 75, allergens: ['Glutine', 'Latte', 'Uova'] }, { name: 'Burro', percentage: 15, allergens: ['Latte'] }, { name: 'Parmigiano, Salvia', percentage: 10, allergens: ['Latte'] }], desc: 'Gusto delicato.' },
    'Pasta allo Scarpariello': { category: 'Primi', ingredients: [{ name: 'Paccheri', percentage: 55, allergens: ['Glutine'] }, { name: 'Pomodorini freschi', percentage: 30, allergens: [] }, { name: 'Parmigiano, Pecorino', percentage: 10, allergens: ['Latte'] }, { name: 'Olio, Aglio, Peperoncino', percentage: 5, allergens: [] }], desc: 'Napoletana saporita.' },
    'Risotto alla Pescatora': { category: 'Primi', ingredients: [{ name: 'Riso', percentage: 55, allergens: [] }, { name: 'Frutti di mare', percentage: 25, allergens: ['Molluschi', 'Crostacei', 'Pesce'] }, { name: 'Brodo pesce', percentage: 12, allergens: ['Pesce'] }, { name: 'Olio, Vino, Prezzemolo', percentage: 8, allergens: ['Solfiti'] }], desc: 'Risotto di mare.' },
    // PRIMI PIATTI - GRUPPO 2
    'Pizzoccheri della Valtellina': { category: 'Primi', ingredients: [{ name: 'Grano saraceno', percentage: 40, allergens: ['Glutine'] }, { name: 'Patate, Verza', percentage: 30, allergens: [] }, { name: 'Valtellina Casera', percentage: 15, allergens: ['Latte'] }, { name: 'Burro, Parmigiano', percentage: 12, allergens: ['Latte'] }, { name: 'Aglio, Salvia', percentage: 3, allergens: [] }], desc: 'Pizzoccheri DOC.' },
    'Passatelli in Brodo': { category: 'Primi', ingredients: [{ name: 'Brodo carne', percentage: 70, allergens: [] }, { name: 'Passatelli (Pane, Formaggio, Uova)', percentage: 30, allergens: ['Glutine', 'Latte', 'Uova'] }], desc: 'Romagnoli in brodo.' },
    'Spaghetti alla Puttanesca': { category: 'Primi', ingredients: [{ name: 'Spaghetti', percentage: 55, allergens: ['Glutine'] }, { name: 'Pomodoro', percentage: 20, allergens: [] }, { name: 'Olive, Capperi', percentage: 15, allergens: [] }, { name: 'Acciughe', percentage: 7, allergens: ['Pesce'] }, { name: 'Olio, Aglio', percentage: 3, allergens: [] }], desc: 'Sugo deciso.' },
    'Malloreddus alla Campidanese': { category: 'Primi', ingredients: [{ name: 'Malloreddus', percentage: 55, allergens: ['Glutine'] }, { name: 'Pomodoro', percentage: 20, allergens: [] }, { name: 'Salsiccia sarda', percentage: 15, allergens: [] }, { name: 'Pecorino sardo', percentage: 8, allergens: ['Latte'] }, { name: 'Zafferano, Cipolla', percentage: 2, allergens: [] }], desc: 'Gnocchetti campidanesi.' },
    'Culingionis d\'Ogliastra': { category: 'Primi', ingredients: [{ name: 'Pasta fresca', percentage: 50, allergens: ['Glutine'] }, { name: 'Farcitura (Patate, Pecorino)', percentage: 45, allergens: ['Latte'] }, { name: 'Menta, Aglio', percentage: 5, allergens: [] }], desc: 'Ravioli sardi.' },
    'Pansotti alla Ligure': { category: 'Primi', ingredients: [{ name: 'Pasta fresca', percentage: 50, allergens: ['Glutine'] }, { name: 'Erbe e Ricotta', percentage: 35, allergens: ['Latte'] }, { name: 'Salsa di Noci', percentage: 15, allergens: ['Frutta a guscio', 'Latte'] }], desc: 'Pasta e salsa noci.' },
    'Zuppa di Legumi e Cereali': { category: 'Primi', ingredients: [{ name: 'Legumi (Fagioli, Ceci)', percentage: 40, allergens: [] }, { name: 'Cereali (Orzo, Farro)', percentage: 30, allergens: ['Glutine'] }, { name: 'Brodo vegetale', percentage: 20, allergens: ['Sedano'] }, { name: 'Olio, Crostini', percentage: 10, allergens: ['Glutine'] }], desc: 'Zuppa nutriente.' },
    'Tagliolini al Tartufo': { category: 'Primi', ingredients: [{ name: 'Tagliolini uovo', percentage: 70, allergens: ['Glutine', 'Uova'] }, { name: 'Burro, Parmigiano', percentage: 25, allergens: ['Latte'] }, { name: 'Tartufo (Nero/Bianco)', percentage: 5, allergens: [] }], desc: 'Aroma di tartufo.' },
    'Anelletti al Forno': { category: 'Primi', ingredients: [{ name: 'Anelletti', percentage: 40, allergens: ['Glutine'] }, { name: 'Ragù e Piselli', percentage: 30, allergens: [] }, { name: 'Melanzane fritte', percentage: 20, allergens: [] }, { name: 'Caciocavallo, Pane', percentage: 10, allergens: ['Latte', 'Glutine'] }], desc: 'Al forno siciliana.' },
    'Canederli al Burro': { category: 'Primi', ingredients: [{ name: 'Pane raffermo', percentage: 40, allergens: ['Glutine'] }, { name: 'Speck e Latte', percentage: 30, allergens: ['Latte'] }, { name: 'Uova, Farina', percentage: 15, allergens: ['Uova', 'Glutine'] }, { name: 'Burro, Parmigiano', percentage: 15, allergens: ['Latte'] }], desc: 'Canederli tirolesi.' },
    'Pasta alla Gricia': { category: 'Primi', ingredients: [{ name: 'Rigatoni', percentage: 60, allergens: ['Glutine'] }, { name: 'Guanciale', percentage: 25, allergens: [] }, { name: 'Pecorino Romano', percentage: 12, allergens: ['Latte'] }, { name: 'Pepe nero', percentage: 3, allergens: [] }], desc: 'Gricia laziale.' },
    'Spaghetti alla Bottarga': { category: 'Primi', ingredients: [{ name: 'Spaghetti', percentage: 75, allergens: ['Glutine'] }, { name: 'Bottarga muggine', percentage: 15, allergens: ['Pesce'] }, { name: 'Olio, Aglio, Limone', percentage: 10, allergens: [] }], desc: 'Lusso di mare.' },
    'Casarecce alla Trapanese': { category: 'Primi', ingredients: [{ name: 'Casarecce', percentage: 60, allergens: ['Glutine'] }, { name: 'Pomodoro fresco', percentage: 20, allergens: [] }, { name: 'Mandorle e Basilico', percentage: 15, allergens: ['Frutta a guscio'] }, { name: 'Pecorino, Aglio', percentage: 5, allergens: ['Latte'] }], desc: 'Trapanese profumata.' },
    'Gnocchi al Castelmagno': { category: 'Primi', ingredients: [{ name: 'Gnocchi patate', percentage: 65, allergens: ['Glutine'] }, { name: 'Castelmagno', percentage: 20, allergens: ['Latte'] }, { name: 'Latte e Panna', percentage: 10, allergens: ['Latte'] }, { name: 'Noci', percentage: 5, allergens: ['Frutta a guscio'] }], desc: 'Formaggio e noci.' },
    'Bigoli in Salsa': { category: 'Primi', ingredients: [{ name: 'Bigoli', percentage: 65, allergens: ['Glutine'] }, { name: 'Cipolle bianche', percentage: 20, allergens: [] }, { name: 'Acciughe/Sarde minale', percentage: 10, allergens: ['Pesce'] }, { name: 'Olio EVO', percentage: 5, allergens: [] }], desc: 'Veneta classica.' },
    'Orecchiette Salsiccia e Finocchietto': { category: 'Primi', ingredients: [{ name: 'Orecchiette', percentage: 55, allergens: ['Glutine'] }, { name: 'Salsiccia maiale', percentage: 25, allergens: [] }, { name: 'Vino, Pecorino', percentage: 15, allergens: ['Solfiti', 'Latte'] }, { name: 'Finocchietto', percentage: 5, allergens: [] }], desc: 'Sapore pugliese.' },
    'Tortelli di Zucca': { category: 'Primi', ingredients: [{ name: 'Pasta uovo', percentage: 40, allergens: ['Glutine', 'Uova'] }, { name: 'Zucca mantovana', percentage: 35, allergens: [] }, { name: 'Amaretto, Mostarda', percentage: 15, allergens: ['Frutta a guscio'] }, { name: 'Burro, Parmigiano', percentage: 10, allergens: ['Latte'] }], desc: 'Dolce e salato.' },
    'Pasta e Patate con Provola': { category: 'Primi', ingredients: [{ name: 'Pasta mista', percentage: 40, allergens: ['Glutine'] }, { name: 'Patate', percentage: 35, allergens: [] }, { name: 'Provola affumicata', percentage: 15, allergens: ['Latte'] }, { name: 'Sedano, Cipolla, Pomodoro', percentage: 10, allergens: ['Sedano'] }], desc: 'Napoletana ricca.' },
    'Fusilli alla Nerano': { category: 'Primi', ingredients: [{ name: 'Fusilli', percentage: 55, allergens: ['Glutine'] }, { name: 'Zucchine fritte', percentage: 30, allergens: [] }, { name: 'Provolone Monaco, Burro', percentage: 15, allergens: ['Latte'] }], desc: 'Cremosa zucchine.' },
    'Vellutata di Zucca': { category: 'Primi', ingredients: [{ name: 'Zucca', percentage: 65, allergens: [] }, { name: 'Patate, Cipolla', percentage: 20, allergens: [] }, { name: 'Brodo Vegetale', percentage: 10, allergens: ['Sedano'] }, { name: 'Crostini pane', percentage: 5, allergens: ['Glutine'] }], desc: 'Vellutata dolce.' },

    // SECONDI PIATTI DI CARNE (30)
    'Cotoletta alla Milanese': { category: 'Secondi', ingredients: [{ name: 'Vitello con osso', percentage: 75, allergens: [] }, { name: 'Pangrattato', percentage: 15, allergens: ['Glutine'] }, { name: 'Uova', percentage: 5, allergens: ['Uova'] }, { name: 'Burro chiarificato', percentage: 5, allergens: ['Latte'] }], desc: 'Costoletta impanata.' },
    'Tagliata di Manzo': { category: 'Secondi', ingredients: [{ name: 'Controfiletto di manzo', percentage: 80, allergens: [] }, { name: 'Rucola e Parmigiano', percentage: 15, allergens: ['Latte'] }, { name: 'Olio EVO, Sale', percentage: 5, allergens: [] }], desc: 'Tagliata classica.' },
    'Pollo alla Diavola': { category: 'Secondi', ingredients: [{ name: 'Pollo intero', percentage: 90, allergens: [] }, { name: 'Olio EVO, Peperoncino', percentage: 5, allergens: [] }, { name: 'Rosmarino, Aglio', percentage: 5, allergens: [] }], desc: 'Pollo piccante.' },
    'Scaloppine al Limone': { category: 'Secondi', ingredients: [{ name: 'Vitello', percentage: 75, allergens: [] }, { name: 'Burro e Limone', percentage: 15, allergens: ['Latte'] }, { name: 'Farina 00', percentage: 5, allergens: ['Glutine'] }, { name: 'Vino bianco', percentage: 5, allergens: ['Solfiti'] }], desc: 'Scaloppine al limone.' },
    'Saltimbocca alla Romana': { category: 'Secondi', ingredients: [{ name: 'Vitello', percentage: 65, allergens: [] }, { name: 'Prosciutto crudo', percentage: 15, allergens: [] }, { name: 'Burro, Vino, Farina', percentage: 15, allergens: ['Latte', 'Solfiti', 'Glutine'] }, { name: 'Salvia fresca', percentage: 5, allergens: [] }], desc: 'Classico romano.' },
    'Polpette al Sugo': { category: 'Secondi', ingredients: [{ name: 'Carne macinata (Manzo/Maiale)', percentage: 40, allergens: [] }, { name: 'Passata di pomodoro', percentage: 35, allergens: [] }, { name: 'Pane, Uova, Formaggio', percentage: 20, allergens: ['Glutine', 'Uova', 'Latte'] }, { name: 'Prezzemolo', percentage: 5, allergens: [] }], desc: 'Polpette casalinghe.' },
    'Filetto al Pepe Verde': { category: 'Secondi', ingredients: [{ name: 'Filetto di manzo', percentage: 70, allergens: [] }, { name: 'Panna liquida', percentage: 20, allergens: ['Latte'] }, { name: 'Burro, Brandy, Senape', percentage: 5, allergens: ['Latte', 'Senape'] }, { name: 'Pepe verde', percentage: 5, allergens: [] }], desc: 'Filetto cremoso.' },
    'Ossobuco alla Milanese': { category: 'Secondi', ingredients: [{ name: 'Ossobuco di vitello', percentage: 70, allergens: [] }, { name: 'Brodo carne, Vino', percentage: 15, allergens: ['Solfiti'] }, { name: 'Burro, Farina, Cipolla', percentage: 10, allergens: ['Latte', 'Glutine'] }, { name: 'Gremolada (Limone, Prezzemolo)', percentage: 5, allergens: [] }], desc: 'Ossobuco tipico.' },
    'Arrosticini': { category: 'Secondi', ingredients: [{ name: 'Carne di pecora', percentage: 98, allergens: [] }, { name: 'Sale', percentage: 2, allergens: [] }], desc: 'Spiedini abruzzesi.' },
    'Vitello Tonnato': { category: 'Secondi', ingredients: [{ name: 'Magatello di vitello', percentage: 60, allergens: [] }, { name: 'Maionese', percentage: 25, allergens: ['Uova'] }, { name: 'Tonno sott\'olio', percentage: 10, allergens: ['Pesce'] }, { name: 'Capperi, Acciughe', percentage: 5, allergens: ['Pesce'] }], desc: 'Antipasto/Secondo freddo.' },
    'Brasato al Barolo': { category: 'Secondi', ingredients: [{ name: 'Manzo (Cappello prete)', percentage: 60, allergens: [] }, { name: 'Vino Barolo', percentage: 25, allergens: ['Solfiti'] }, { name: 'Cipolle, Carote, Sedano', percentage: 10, allergens: ['Sedano'] }, { name: 'Brodo, Spezie', percentage: 5, allergens: [] }], desc: 'Brasato piemontese.' },
    'Spezzatino con Patate': { category: 'Secondi', ingredients: [{ name: 'Carne di manzo', percentage: 45, allergens: [] }, { name: 'Patate', percentage: 35, allergens: [] }, { name: 'Pomodoro, Vino rosso', percentage: 10, allergens: ['Solfiti'] }, { name: 'Cipolla, Carota, Sedano', percentage: 10, allergens: ['Sedano'] }], desc: 'Spezzatino rustico.' },
    'Coniglio alla Ligure': { category: 'Secondi', ingredients: [{ name: 'Coniglio', percentage: 70, allergens: [] }, { name: 'Olive taggiasche, Pinoli', percentage: 15, allergens: ['Frutta a guscio'] }, { name: 'Vino bianco, Aglio', percentage: 10, allergens: ['Solfiti'] }, { name: 'Brodo, Rosmarino', percentage: 5, allergens: [] }], desc: 'Coniglio e olive.' },
    'Salsiccia e Friarielli': { category: 'Secondi', ingredients: [{ name: 'Salsiccia di maiale', percentage: 60, allergens: [] }, { name: 'Friarielli', percentage: 35, allergens: [] }, { name: 'Aglio, Olio, Peperoncino', percentage: 5, allergens: [] }], desc: 'Accoppiata napoletana.' },
    'Trippa alla Romana': { category: 'Secondi', ingredients: [{ name: 'Trippa di bovino', percentage: 65, allergens: [] }, { name: 'Pomodoro, Pecorino', percentage: 25, allergens: ['Latte'] }, { name: 'Mentuccia, Carota, Sedano', percentage: 10, allergens: ['Sedano'] }], desc: 'Trippa classica.' },
    'Coda alla Vaccinara': { category: 'Secondi', ingredients: [{ name: 'Coda di bue', percentage: 55, allergens: [] }, { name: 'Pomodoro, Sedano', percentage: 30, allergens: ['Sedano'] }, { name: 'Guanciale, Vino, Pinoli, Uvetta', percentage: 15, allergens: ['Solfiti', 'Frutta a guscio'] }], desc: 'Coda alla romana.' },
    'Bistecca alla Fiorentina': { category: 'Secondi', ingredients: [{ name: 'Lombata di manzo', percentage: 95, allergens: [] }, { name: 'Olio EVO, Sale, Pepe', percentage: 5, allergens: [] }], desc: 'Fiorentina DOC.' },
    'Pollo ai Funghi': { category: 'Secondi', ingredients: [{ name: 'Pollo', percentage: 65, allergens: [] }, { name: 'Funghi champignon', percentage: 25, allergens: [] }, { name: 'Burro, Vino, Aglio', percentage: 10, allergens: ['Latte', 'Solfiti'] }], desc: 'Pollo trifolato.' },
    'Abbacchio a Scottadito': { category: 'Secondi', ingredients: [{ name: 'Agnello', percentage: 90, allergens: [] }, { name: 'Olio EVO, Rosmarino', percentage: 10, allergens: [] }], desc: 'Costolette agnello.' },
    'Bombette Pugliesi': { category: 'Secondi', ingredients: [{ name: 'Capocollo maiale', percentage: 70, allergens: [] }, { name: 'Canestrato, Pancetta', percentage: 25, allergens: ['Latte'] }, { name: 'Prezzemolo, Aglio', percentage: 5, allergens: [] }], desc: 'Involtini pugliesi.' },
    'Stinco al Forno': { category: 'Secondi', ingredients: [{ name: 'Stinco maiale', percentage: 65, allergens: [] }, { name: 'Patate', percentage: 25, allergens: [] }, { name: 'Birra, Rosmarino', percentage: 10, allergens: ['Glutine'] }], desc: 'Stinco alla birra.' },
    'Lonza al Latte': { category: 'Secondi', ingredients: [{ name: 'Lonza di maiale', percentage: 65, allergens: [] }, { name: 'Latte intero', percentage: 25, allergens: ['Latte'] }, { name: 'Burro, Farina, Salvia', percentage: 10, allergens: ['Latte', 'Glutine'] }], desc: 'Lonza tenera.' },
    'Fegato alla Veneziana': { category: 'Secondi', ingredients: [{ name: 'Fegato vitello', percentage: 50, allergens: [] }, { name: 'Cipolle bianche', percentage: 40, allergens: [] }, { name: 'Burro, Olio, Aceto', percentage: 10, allergens: ['Latte', 'Solfiti'] }], desc: 'Fegato e cipolla.' },
    'Involtini alla Romana': { category: 'Secondi', ingredients: [{ name: 'Manzo', percentage: 60, allergens: [] }, { name: 'Prosciutto crudo', percentage: 15, allergens: [] }, { name: 'Pomodoro, Sedano, Carota', percentage: 15, allergens: ['Sedano'] }, { name: 'Vino bianco', percentage: 10, allergens: ['Solfiti'] }], desc: 'Involtini al sugo.' },
    'Polpettone al Forno': { category: 'Secondi', ingredients: [{ name: 'Carne macinata', percentage: 50, allergens: [] }, { name: 'Uova e Pane', percentage: 20, allergens: ['Uova', 'Glutine'] }, { name: 'Prosciutto e Provola', percentage: 20, allergens: ['Latte'] }, { name: 'Parmigiano, Sale', percentage: 10, allergens: ['Latte'] }], desc: 'Polpettone ripieno.' },
    'Peposo Impruneta': { category: 'Secondi', ingredients: [{ name: 'Muscolo manzo', percentage: 70, allergens: [] }, { name: 'Vino rosso (Chianti)', percentage: 20, allergens: ['Solfiti'] }, { name: 'Pepe nero, Aglio', percentage: 10, allergens: [] }], desc: 'Stufato toscano.' },
    'Agnello al Forno': { category: 'Secondi', ingredients: [{ name: 'Agnello', percentage: 50, allergens: [] }, { name: 'Patate', percentage: 40, allergens: [] }, { name: 'Olio, Vino, Rosmarino', percentage: 10, allergens: ['Solfiti'] }], desc: 'Agnello e patate.' },
    'Straccetti di Manzo': { category: 'Secondi', ingredients: [{ name: 'Manzo', percentage: 70, allergens: [] }, { name: 'Rucola e Pomodorini', percentage: 20, allergens: [] }, { name: 'Olio EVO, Balsamico', percentage: 10, allergens: ['Solfiti'] }], desc: 'Secondo rapido.' },
    'Arrosto Domenica': { category: 'Secondi', ingredients: [{ name: 'Sottofesa manzo', percentage: 70, allergens: [] }, { name: 'Carote, Cipolle, Sedano', percentage: 20, allergens: ['Sedano'] }, { name: 'Vino bianco, Olio', percentage: 10, allergens: ['Solfiti'] }], desc: 'Arrosto classico.' },
    'Galletto Brace': { category: 'Secondi', ingredients: [{ name: 'Galletto', percentage: 92, allergens: [] }, { name: 'Olio, Erbe, Peperoncino', percentage: 8, allergens: [] }], desc: 'Galletto ruspante.' },

    // SECONDI PIATTI DI PESCE (15)
    'Frittura Mista': { category: 'Secondi', ingredients: [{ name: 'Calamari e Gamberi', percentage: 80, allergens: ['Molluschi', 'Crostacei'] }, { name: 'Semola grano duro', percentage: 15, allergens: ['Glutine'] }, { name: 'Olio frittura', percentage: 5, allergens: [] }], desc: 'Frittura croccante.' },
    'Branzino al Sale': { category: 'Secondi', ingredients: [{ name: 'Branzino intero', percentage: 80, allergens: ['Pesce'] }, { name: 'Sale grosso', percentage: 15, allergens: [] }, { name: 'Albume uovo', percentage: 5, allergens: ['Uova'] }], desc: 'Cottura al sale.' },
    'Orata al Forno': { category: 'Secondi', ingredients: [{ name: 'Orata', percentage: 60, allergens: ['Pesce'] }, { name: 'Patate', percentage: 25, allergens: [] }, { name: 'Pomodorini, Olive, Vino', percentage: 15, allergens: ['Solfiti'] }], desc: 'Orata e patate.' },
    'Seppie con Piselli': { category: 'Secondi', ingredients: [{ name: 'Seppie', percentage: 50, allergens: ['Molluschi'] }, { name: 'Piselli', percentage: 30, allergens: [] }, { name: 'Passata pomodoro', percentage: 15, allergens: [] }, { name: 'Vino bianco, Cipolla', percentage: 5, allergens: ['Solfiti'] }], desc: 'Cottura in umido.' },
    'Calamari Ripieni': { category: 'Secondi', ingredients: [{ name: 'Calamari', percentage: 70, allergens: ['Molluschi'] }, { name: 'Pane, Uova, Formaggio', percentage: 20, allergens: ['Glutine', 'Uova', 'Latte'] }, { name: 'Vino bianco, Prezzemolo', percentage: 10, allergens: ['Solfiti'] }], desc: 'Calamari farciti.' },
    'Pesce Spada Messinese': { category: 'Secondi', ingredients: [{ name: 'Pesce Spada', percentage: 70, allergens: ['Pesce'] }, { name: 'Pomodorini, Olive, Capperi', percentage: 25, allergens: [] }, { name: 'Cipolla, Sedano', percentage: 5, allergens: ['Sedano'] }], desc: 'Sfizio siciliano.' },
    'Baccalà alla Livornese': { category: 'Secondi', ingredients: [{ name: 'Baccalà dissalato', percentage: 65, allergens: ['Pesce'] }, { name: 'Pomodoro pelato', percentage: 20, allergens: [] }, { name: 'Cipolla, Olive, Farina', percentage: 15, allergens: ['Glutine'] }], desc: 'Baccalà al sugo.' },
    'Polpo alla Luciana': { category: 'Secondi', ingredients: [{ name: 'Polpo', percentage: 75, allergens: ['Molluschi'] }, { name: 'Pomodori pelati', percentage: 20, allergens: [] }, { name: 'Olive, Capperi, Aglio', percentage: 5, allergens: [] }], desc: 'Specialità campana.' },
    'Impepata Cozze': { category: 'Secondi', ingredients: [{ name: 'Cozze', percentage: 95, allergens: ['Molluschi'] }, { name: 'Pepe, Aglio, Prezzemolo', percentage: 5, allergens: [] }], desc: 'Solo cozze fresche.' },
    'Salmone in Crosta': { category: 'Secondi', ingredients: [{ name: 'Salmone', percentage: 65, allergens: ['Pesce'] }, { name: 'Pasta Sfoglia', percentage: 20, allergens: ['Glutine'] }, { name: 'Spinaci e Uova', percentage: 15, allergens: ['Uova'] }], desc: 'Salmone elegante.' },
    'Zuppa di Pesce': { category: 'Secondi', ingredients: [{ name: 'Pesce, Molluschi, Crostacei', percentage: 80, allergens: ['Pesce', 'Molluschi', 'Crostacei'] }, { name: 'Pomodoro', percentage: 15, allergens: [] }, { name: 'Crostini pane', percentage: 5, allergens: ['Glutine'] }], desc: 'Zuppa di mare.' },
    'Sogliola Mughaia': { category: 'Secondi', ingredients: [{ name: 'Sogliola', percentage: 75, allergens: ['Pesce'] }, { name: 'Burro, Farina', percentage: 15, allergens: ['Latte', 'Glutine'] }, { name: 'Limone, Prezzemolo', percentage: 10, allergens: [] }], desc: 'Sogliola delicata.' },
    'Sarde Beccafico': { category: 'Secondi', ingredients: [{ name: 'Sarde', percentage: 65, allergens: ['Pesce'] }, { name: 'Pane, Uvetta, Pinoli', percentage: 25, allergens: ['Glutine', 'Frutta a guscio'] }, { name: 'Arancia, Alloro', percentage: 10, allergens: [] }], desc: 'Sarde ripene.' },
    'Tonno Sesamo': { category: 'Secondi', ingredients: [{ name: 'Filetto Tonno', percentage: 85, allergens: ['Pesce'] }, { name: 'Semi di Sesamo', percentage: 10, allergens: ['Sesamo'] }, { name: 'Olio, Soia', percentage: 5, allergens: ['Soia'] }], desc: 'Tataki di tonno.' },
    'Gamberoni Cognac': { category: 'Secondi', ingredients: [{ name: 'Gamberoni', percentage: 85, allergens: ['Crostacei'] }, { name: 'Burro, Cognac', percentage: 10, allergens: ['Latte'] }, { name: 'Prezzemolo', percentage: 5, allergens: [] }], desc: 'Gamberoni flambé.' },

    // SECONDI VEGETARIANI (5)
    'Parmigiana Melanzane': { category: 'Secondi', ingredients: [{ name: 'Melanzane', percentage: 40, allergens: [] }, { name: 'Pomodoro', percentage: 30, allergens: [] }, { name: 'Mozzarella, Parmigiano', percentage: 25, allergens: ['Latte'] }, { name: 'Farina, Olio', percentage: 5, allergens: ['Glutine'] }], desc: 'Parmigiana classica.' },
    'Frittata Cipolle': { category: 'Secondi', ingredients: [{ name: 'Uova', percentage: 70, allergens: ['Uova'] }, { name: 'Cipolle dorate', percentage: 20, allergens: [] }, { name: 'Parmigiano, Olio', percentage: 10, allergens: ['Latte'] }], desc: 'Frittata povera.' },
    'Tomino Piastra': { category: 'Secondi', ingredients: [{ name: 'Tomino', percentage: 85, allergens: ['Latte'] }, { name: 'Speck / Miele / Noci', percentage: 10, allergens: ['Frutta a guscio'] }, { name: 'Rucola', percentage: 5, allergens: [] }], desc: 'Tomino filante.' },
    'Mozzarella in Carrozza': { category: 'Secondi', ingredients: [{ name: 'Mozzarella', percentage: 40, allergens: ['Latte'] }, { name: 'Pane in cassetta', percentage: 30, allergens: ['Glutine'] }, { name: 'Uova, Farina, Latte', percentage: 25, allergens: ['Uova', 'Glutine', 'Latte'] }, { name: 'Olio frittura', percentage: 5, allergens: [] }], desc: 'Fritto sfizioso.' },
    'Uova in Purgatorio': { category: 'Secondi', ingredients: [{ name: 'Uova', percentage: 40, allergens: ['Uova'] }, { name: 'Passata pomodoro', percentage: 50, allergens: [] }, { name: 'Olio, Cipolla, Basilico', percentage: 10, allergens: [] }], desc: 'Uova e pomodoro.' },

    // --- CONTORNI (100) ---
    // PATATE (1-15)
    'Patate al Forno': { category: 'Contorni', ingredients: [{ name: 'Patate', percentage: 90, allergens: [] }, { name: 'Olio EVO, Rosmarino, Aglio', percentage: 10, allergens: [] }], desc: 'Classiche al forno.' },
    'Patatine Fritte': { category: 'Contorni', ingredients: [{ name: 'Patate', percentage: 95, allergens: [] }, { name: 'Olio di semi, Sale', percentage: 5, allergens: [] }], desc: 'Fritte croccanti.' },
    'Purè di Patate': { category: 'Contorni', ingredients: [{ name: 'Patate', percentage: 70, allergens: [] }, { name: 'Latte intero', percentage: 15, allergens: ['Latte'] }, { name: 'Burro, Parmigiano', percentage: 10, allergens: ['Latte'] }, { name: 'Noce moscata', percentage: 5, allergens: [] }], desc: 'Purè cremoso.' },
    'Patate Sabbiose': { category: 'Contorni', ingredients: [{ name: 'Patate', percentage: 80, allergens: [] }, { name: 'Pangrattato', percentage: 10, allergens: ['Glutine'] }, { name: 'Olio EVO, Parmigiano', percentage: 8, allergens: ['Latte'] }, { name: 'Erbe', percentage: 2, allergens: [] }], desc: 'Patate gratinate.' },
    'Insalata Patate e Polpo': { category: 'Contorni', ingredients: [{ name: 'Patate', percentage: 60, allergens: [] }, { name: 'Polpo', percentage: 30, allergens: ['Molluschi'] }, { name: 'Olio EVO, Prezzemolo, Limone', percentage: 10, allergens: [] }], desc: 'Insalata di mare.' },
    'Patate alla Lionese': { category: 'Contorni', ingredients: [{ name: 'Patate', percentage: 70, allergens: [] }, { name: 'Cipolle bianche', percentage: 20, allergens: [] }, { name: 'Burro, Prezzemolo', percentage: 10, allergens: ['Latte'] }], desc: 'Patate e cipolle.' },
    'Patate e Peperoni': { category: 'Contorni', ingredients: [{ name: 'Patate', percentage: 50, allergens: [] }, { name: 'Peperoni', percentage: 40, allergens: [] }, { name: 'Olio EVO, Origano', percentage: 10, allergens: [] }], desc: 'Tipico calabrese.' },
    'Patate in Tecia': { category: 'Contorni', ingredients: [{ name: 'Patate', percentage: 75, allergens: [] }, { name: 'Cipolla, Pancetta', percentage: 15, allergens: [] }, { name: 'Brodo, Burro', percentage: 10, allergens: ['Latte'] }], desc: 'Triestina.' },
    'Patate e Fagiolini': { category: 'Contorni', ingredients: [{ name: 'Patate', percentage: 50, allergens: [] }, { name: 'Fagiolini', percentage: 45, allergens: [] }, { name: 'Olio EVO, Aglio, Mentuccia', percentage: 5, allergens: [] }], desc: 'Contorno leggero.' },
    'Patate in Padella': { category: 'Contorni', ingredients: [{ name: 'Patate', percentage: 85, allergens: [] }, { name: 'Burro, Aglio, Salvia', percentage: 15, allergens: ['Latte'] }], desc: 'Patate saltate.' },
    'Chips di Patate': { category: 'Contorni', ingredients: [{ name: 'Patate', percentage: 95, allergens: [] }, { name: 'Olio di semi, Sale', percentage: 5, allergens: [] }], desc: 'Chips sottili.' },
    'Patate Duchessa': { category: 'Contorni', ingredients: [{ name: 'Patate', percentage: 80, allergens: [] }, { name: 'Tuorli d\'uovo', percentage: 10, allergens: ['Uova'] }, { name: 'Burro, Parmigiano', percentage: 10, allergens: ['Latte'] }], desc: 'Patate al forno eleganti.' },
    'Patate al Cartoccio': { category: 'Contorni', ingredients: [{ name: 'Patate intere', percentage: 85, allergens: [] }, { name: 'Panna acida', percentage: 10, allergens: ['Latte'] }, { name: 'Erba cipollina', percentage: 5, allergens: [] }], desc: 'Cartoccio e panna.' },
    'Gattò di Patate': { category: 'Contorni', ingredients: [{ name: 'Patate', percentage: 70, allergens: [] }, { name: 'Latte, Uova', percentage: 15, allergens: ['Latte', 'Uova'] }, { name: 'Prosciutto, Mozzarella', percentage: 15, allergens: ['Latte'] }], desc: 'Versione contorno.' },
    'Patate Novelle al Sale': { category: 'Contorni', ingredients: [{ name: 'Patate novelle', percentage: 90, allergens: [] }, { name: 'Sale grosso, Rosmarino', percentage: 10, allergens: [] }], desc: 'Novelle saporite.' },

    // CAMPAGNA E FOGLIA (16-40)
    'Cicoria Ripassata': { category: 'Contorni', ingredients: [{ name: 'Cicoria', percentage: 90, allergens: [] }, { name: 'Olio EVO, Aglio, Peperoncino', percentage: 10, allergens: [] }], desc: 'Ripassata in padella.' },
    'Spinaci al Burro': { category: 'Contorni', ingredients: [{ name: 'Spinaci', percentage: 85, allergens: [] }, { name: 'Burro, Parmigiano', percentage: 15, allergens: ['Latte'] }], desc: 'Spinaci nutrienti.' },
    'Spinaci al Limone': { category: 'Contorni', ingredients: [{ name: 'Spinaci', percentage: 90, allergens: [] }, { name: 'Olio EVO, Limone', percentage: 10, allergens: [] }], desc: 'Spinaci leggeri.' },
    'Friarielli Saltati': { category: 'Contorni', ingredients: [{ name: 'Friarielli', percentage: 90, allergens: [] }, { name: 'Olio, Aglio, Peperoncino', percentage: 10, allergens: [] }], desc: 'Cime di rapa napoletane.' },
    'Bieta all\'Agro': { category: 'Contorni', ingredients: [{ name: 'Bietole', percentage: 90, allergens: [] }, { name: 'Olio EVO, Limone', percentage: 10, allergens: [] }], desc: 'Bietole bollite.' },
    'Bieta Saltata': { category: 'Contorni', ingredients: [{ name: 'Bietole', percentage: 90, allergens: [] }, { name: 'Olio EVO, Aglio, Peperoncino', percentage: 10, allergens: [] }], desc: 'Bietole in padella.' },
    'Scarola Affogata': { category: 'Contorni', ingredients: [{ name: 'Scarola', percentage: 75, allergens: [] }, { name: 'Olive, Capperi', percentage: 15, allergens: ['Solfiti'] }, { name: 'Uvetta, Pinoli', percentage: 10, allergens: ['Frutta a guscio'] }], desc: 'Scarola ricca.' },
    'Catalogna Padella': { category: 'Contorni', ingredients: [{ name: 'Catalogna', percentage: 90, allergens: [] }, { name: 'Olio EVO, Aglio, Acciughe', percentage: 10, allergens: ['Pesce'] }], desc: 'Gusto amarognolo.' },
    'Puntarelle alla Romana': { category: 'Contorni', ingredients: [{ name: 'Puntarelle', percentage: 85, allergens: [] }, { name: 'Olio, Acciughe, Aglio', percentage: 10, allergens: ['Pesce'] }, { name: 'Aceto', percentage: 5, allergens: ['Solfiti'] }], desc: 'Insalata laziale.' },
    'Cime di Rapa Stufate': { category: 'Contorni', ingredients: [{ name: 'Cime di rapa', percentage: 90, allergens: [] }, { name: 'Olio, Aglio, Peperoncino', percentage: 10, allergens: [] }], desc: 'Stufate saporite.' },
    'Verza Stufata': { category: 'Contorni', ingredients: [{ name: 'Verza', percentage: 80, allergens: [] }, { name: 'Cipolla, Olio, Pancetta', percentage: 15, allergens: [] }, { name: 'Aceto di vino', percentage: 5, allergens: ['Solfiti'] }], desc: 'Verza morbida.' },
    'Cavolo Nero Padella': { category: 'Contorni', ingredients: [{ name: 'Cavolo nero', percentage: 90, allergens: [] }, { name: 'Olio, Aglio, Peperoncino', percentage: 10, allergens: [] }], desc: 'Toscano in padella.' },
    'Misticanza di Campo': { category: 'Contorni', ingredients: [{ name: 'Erbe selvatiche', percentage: 95, allergens: [] }, { name: 'Olio, Aceto, Sale', percentage: 5, allergens: ['Solfiti'] }], desc: 'Insalata di campo.' },
    'Indivia Grigliata': { category: 'Contorni', ingredients: [{ name: 'Indivia belga', percentage: 90, allergens: [] }, { name: 'Olio, Sale, Pepe', percentage: 10, allergens: [] }], desc: 'Belga ai ferri.' },
    'Rucola e Pomodorini': { category: 'Contorni', ingredients: [{ name: 'Rucola, Pomodorini', percentage: 85, allergens: [] }, { name: 'Parmigiano scaglie', percentage: 10, allergens: ['Latte'] }, { name: 'Olio EVO', percentage: 5, allergens: [] }], desc: 'Classica insalata.' },
    'Insalata Valeriana': { category: 'Contorni', ingredients: [{ name: 'Valeriana', percentage: 85, allergens: [] }, { name: 'Noci', percentage: 10, allergens: ['Frutta a guscio'] }, { name: 'Olio, Aceto', percentage: 5, allergens: ['Solfiti'] }], desc: 'Insalata e noci.' },
    'Radicchio ai Ferri': { category: 'Contorni', ingredients: [{ name: 'Radicchio Trevigiano', percentage: 95, allergens: [] }, { name: 'Olio EVO, Sale', percentage: 5, allergens: [] }], desc: 'Radicchio grigliato.' },
    'Radicchio al Forno': { category: 'Contorni', ingredients: [{ name: 'Radicchio', percentage: 85, allergens: [] }, { name: 'Olio, Pangrattato', percentage: 10, allergens: ['Glutine'] }, { name: 'Aceto balsamico', percentage: 5, allergens: ['Solfiti'] }], desc: 'Radicchio gratinato.' },
    'Insalata Caprese': { category: 'Contorni', ingredients: [{ name: 'Pomodoro', percentage: 50, allergens: [] }, { name: 'Mozzarella bufala', percentage: 40, allergens: ['Latte'] }, { name: 'Olio, Basilico', percentage: 10, allergens: [] }], desc: 'Pomodoro e bufala.' },
    'Insalata Greca': { category: 'Contorni', ingredients: [{ name: 'Pomodoro, Cetriolo', percentage: 60, allergens: [] }, { name: 'Feta, Olive', percentage: 30, allergens: ['Latte', 'Solfiti'] }, { name: 'Cipolla rossa', percentage: 10, allergens: [] }], desc: 'Variante Greca.' },
    'Insalata Cavolo': { category: 'Contorni', ingredients: [{ name: 'Cavolo, Carote', percentage: 75, allergens: [] }, { name: 'Maionese, Aceto', percentage: 25, allergens: ['Uova', 'Solfiti'] }], desc: 'Coleslaw style.' },
    'Coste al Pomodoro': { category: 'Contorni', ingredients: [{ name: 'Bietole (Coste)', percentage: 75, allergens: [] }, { name: 'Pomodoro, Cipolla', percentage: 25, allergens: [] }], desc: 'Coste in umido.' },
    'Cavolfiore Affogato': { category: 'Contorni', ingredients: [{ name: 'Cavolfiore', percentage: 75, allergens: [] }, { name: 'Vino rosso, Olive', percentage: 20, allergens: ['Solfiti'] }, { name: 'Cipolla', percentage: 5, allergens: [] }], desc: 'Siciliana.' },
    'Cavolfiore Gratinato': { category: 'Contorni', ingredients: [{ name: 'Cavolfiore', percentage: 70, allergens: [] }, { name: 'Besciamella', percentage: 20, allergens: ['Latte', 'Glutine'] }, { name: 'Parmigiano, Pane', percentage: 10, allergens: ['Latte', 'Glutine'] }], desc: 'Cavolfiore al forno.' },
    'Broccoli al Vapore': { category: 'Contorni', ingredients: [{ name: 'Broccoli', percentage: 90, allergens: [] }, { name: 'Olio EVO, Limone', percentage: 10, allergens: [] }], desc: 'Broccoli leggeri.' },

    // ORTAGGI E FRITTI (41-70)
    'Zucchine Grigliate': { category: 'Contorni', ingredients: [{ name: 'Zucchine', percentage: 95, allergens: [] }, { name: 'Olio, Aglio, Menta', percentage: 5, allergens: [] }], desc: 'Zucchine ai ferri.' },
    'Melanzane Grigliate': { category: 'Contorni', ingredients: [{ name: 'Melanzane', percentage: 95, allergens: [] }, { name: 'Olio, Aglio, Prezzemolo', percentage: 5, allergens: [] }], desc: 'Melanzane ai ferri.' },
    'Peperoni Grigliati': { category: 'Contorni', ingredients: [{ name: 'Peperoni', percentage: 90, allergens: [] }, { name: 'Olio, Aglio, Capperi', percentage: 10, allergens: ['Solfiti'] }], desc: 'Peperoni ai ferri.' },
    'Verdure Miste Grigliate': { category: 'Contorni', ingredients: [{ name: 'Zucchine, Melanzane, Peperoni', percentage: 95, allergens: [] }, { name: 'Olio EVO', percentage: 5, allergens: [] }], desc: 'Tris griglia.' },
    'Zucchine alla Scapece': { category: 'Contorni', ingredients: [{ name: 'Zucchine fritte', percentage: 85, allergens: [] }, { name: 'Aceto, Mentuccia', percentage: 15, allergens: ['Solfiti'] }], desc: 'Zucchine in aceto.' },
    'Melanzane a Funghetto': { category: 'Contorni', ingredients: [{ name: 'Melanzane', percentage: 70, allergens: [] }, { name: 'Pomodorini, Aglio', percentage: 30, allergens: [] }], desc: 'Melanzane napoletane.' },
    'Peperonata Classica': { category: 'Contorni', ingredients: [{ name: 'Peperoni', percentage: 65, allergens: [] }, { name: 'Cipolla, Pomodoro', percentage: 30, allergens: [] }, { name: 'Olio EVO', percentage: 5, allergens: [] }], desc: 'Peperonata mista.' },
    'Caponata Siciliana': { category: 'Contorni', ingredients: [{ name: 'Melanzane', percentage: 50, allergens: [] }, { name: 'Sedano, Olive', percentage: 30, allergens: ['Sedano', 'Solfiti'] }, { name: 'Capperi, Aceto, Zucchero', percentage: 20, allergens: ['Solfiti'] }], desc: 'Caponata agrodolce.' },
    'Zucca al Forno': { category: 'Contorni', ingredients: [{ name: 'Zucca', percentage: 95, allergens: [] }, { name: 'Olio EVO, Rosmarino', percentage: 5, allergens: [] }], desc: 'Zucca saporita.' },
    'Zucca in Agrodolce': { category: 'Contorni', ingredients: [{ name: 'Zucca fritta', percentage: 85, allergens: [] }, { name: 'Aceto, Zucchero, Mentuccia', percentage: 15, allergens: ['Solfiti'] }], desc: 'Zucca siciliana.' },
    'Fagiolini Pomodoro': { category: 'Contorni', ingredients: [{ name: 'Fagiolini', percentage: 70, allergens: [] }, { name: 'Pomodoro', percentage: 25, allergens: [] }, { name: 'Cipolla, Olio', percentage: 5, allergens: [] }], desc: 'Fagiolini in umido.' },
    'Fagiolini al Burro': { category: 'Contorni', ingredients: [{ name: 'Fagiolini', percentage: 85, allergens: [] }, { name: 'Burro, Parmigiano', percentage: 15, allergens: ['Latte'] }], desc: 'Fagiolini ricchi.' },
    'Carciofi alla Romana': { category: 'Contorni', ingredients: [{ name: 'Carciofi', percentage: 85, allergens: [] }, { name: 'Olio, Aglio, Mentuccia', percentage: 15, allergens: [] }], desc: 'Carciofi stufati.' },
    'Carciofi alla Giudia': { category: 'Contorni', ingredients: [{ name: 'Carciofi mammole', percentage: 90, allergens: [] }, { name: 'Olio frittura', percentage: 10, allergens: [] }], desc: 'Carciofi fritti interi.' },
    'Carciofi Trifolati': { category: 'Contorni', ingredients: [{ name: 'Carciofi', percentage: 90, allergens: [] }, { name: 'Aglio, Prezzemolo, Olio', percentage: 10, allergens: [] }], desc: 'Carciofi saltati.' },
    'Finocchi Gratinati': { category: 'Contorni', ingredients: [{ name: 'Finocchi', percentage: 75, allergens: [] }, { name: 'Besciamella', percentage: 15, allergens: ['Latte', 'Glutine'] }, { name: 'Parmigiano, Burro', percentage: 10, allergens: ['Latte'] }], desc: 'Finocchi al forno.' },
    'Insalata Finocchi Arance': { category: 'Contorni', ingredients: [{ name: 'Finocchi, Arance', percentage: 90, allergens: [] }, { name: 'Olive nere, Olio', percentage: 10, allergens: ['Solfiti'] }], desc: 'Insalata siciliana.' },
    'Asparagi al Burro': { category: 'Contorni', ingredients: [{ name: 'Asparagi', percentage: 85, allergens: [] }, { name: 'Burro, Parmigiano', percentage: 15, allergens: ['Latte'] }], desc: 'Asparagi ripassati.' },
    'Asparagi alla Bismarck': { category: 'Contorni', ingredients: [{ name: 'Asparagi', percentage: 75, allergens: [] }, { name: 'Uova (al tegamino)', percentage: 15, allergens: ['Uova'] }, { name: 'Burro, Parmigiano', percentage: 10, allergens: ['Latte'] }], desc: 'Asparagi e uova.' },
    'Funghi Trifolati': { category: 'Contorni', ingredients: [{ name: 'Funghi (misti/champignon)', percentage: 90, allergens: [] }, { name: 'Aglio, Prezzemolo, Olio', percentage: 10, allergens: [] }], desc: 'Funghi in padella.' },
    'Porcini Fritti': { category: 'Contorni', ingredients: [{ name: 'Funghi Porcini', percentage: 85, allergens: [] }, { name: 'Farina, Olio semi', percentage: 15, allergens: ['Glutine'] }], desc: 'Porcini croccanti.' },
    'Champignon Ripieni': { category: 'Contorni', ingredients: [{ name: 'Funghi', percentage: 70, allergens: [] }, { name: 'Pane, Aglio, Parmigiano', percentage: 30, allergens: ['Glutine', 'Latte'] }], desc: 'Funghi farciti.' },
    'Pomodori Gratinati': { category: 'Contorni', ingredients: [{ name: 'Pomodori', percentage: 80, allergens: [] }, { name: 'Pangrattato, Aglio, Origano', percentage: 20, allergens: ['Glutine'] }], desc: 'Pomodori al forno.' },
    'Pomodori Provenzale': { category: 'Contorni', ingredients: [{ name: 'Pomodori', percentage: 90, allergens: [] }, { name: 'Erbe, Aglio, Olio', percentage: 10, allergens: [] }], desc: 'Pomodori profumati.' },
    'Cipolline Agrodolce': { category: 'Contorni', ingredients: [{ name: 'Cipolline Borretane', percentage: 80, allergens: [] }, { name: 'Aceto Balsamico, Zucchero', percentage: 15, allergens: ['Solfiti'] }, { name: 'Burro', percentage: 5, allergens: ['Latte'] }], desc: 'Cipolline saporite.' },
    'Cipolle Rosse al Forno': { category: 'Contorni', ingredients: [{ name: 'Cipolle rosse', percentage: 95, allergens: [] }, { name: 'Olio, Sale, Pepe', percentage: 5, allergens: [] }], desc: 'Cipolle dolci.' },
    'Anelli Cipolla Fritti': { category: 'Contorni', ingredients: [{ name: 'Cipolle', percentage: 70, allergens: [] }, { name: 'Pastella frittura', percentage: 25, allergens: ['Glutine'] }, { name: 'Olio semi', percentage: 5, allergens: [] }], desc: 'Onion rings.' },
    'Frittura Zucchine': { category: 'Contorni', ingredients: [{ name: 'Zucchine', percentage: 80, allergens: [] }, { name: 'Farina, Olio semi', percentage: 20, allergens: ['Glutine'] }], desc: 'Zucchine a listarelle.' },
    'Verdure in Pastella': { category: 'Contorni', ingredients: [{ name: 'Verdure miste', percentage: 70, allergens: [] }, { name: 'Pastella (Farina, Acqua)', percentage: 30, allergens: ['Glutine'] }], desc: 'Misto fritto verdura.' },
    'Tempura Verdure': { category: 'Contorni', ingredients: [{ name: 'Verdure miste', percentage: 70, allergens: [] }, { name: 'Farina riso, Acqua frizzante', percentage: 30, allergens: [] }], desc: 'Fritto leggero riso.' },

    // LEGUMI E ALTRO (71-100)
    'Fagioli all\'Uccelletto': { category: 'Contorni', ingredients: [{ name: 'Fagioli Cannellini', percentage: 70, allergens: [] }, { name: 'Pomodoro, Salvia', percentage: 25, allergens: [] }, { name: 'Aglio, Olio', percentage: 5, allergens: [] }], desc: 'Fagioli toscani.' },
    'Fagioli e Cipolla': { category: 'Contorni', ingredients: [{ name: 'Fagioli Borlotti', percentage: 75, allergens: [] }, { name: 'Cipolla rossa', percentage: 20, allergens: [] }, { name: 'Olio EVO', percentage: 5, allergens: [] }], desc: 'Contorno rustico.' },
    'Lenticchie Umido': { category: 'Contorni', ingredients: [{ name: 'Lenticchie', percentage: 70, allergens: [] }, { name: 'Pomodoro, Verdure', percentage: 25, allergens: ['Sedano'] }, { name: 'Olio', percentage: 5, allergens: [] }], desc: 'Lenticchie stufate.' },
    'Ceci all\'Olio': { category: 'Contorni', ingredients: [{ name: 'Ceci', percentage: 90, allergens: [] }, { name: 'Olio EVO, Rosmarino', percentage: 10, allergens: [] }], desc: 'Ceci semplici.' },
    'Insalata Ceci e Tonno': { category: 'Contorni', ingredients: [{ name: 'Ceci', percentage: 60, allergens: [] }, { name: 'Tonno sott\'olio', percentage: 25, allergens: ['Pesce'] }, { name: 'Cipolla', percentage: 15, allergens: [] }], desc: 'Ceci e mare.' },
    'Piselli al Prosciutto': { category: 'Contorni', ingredients: [{ name: 'Piselli', percentage: 75, allergens: [] }, { name: 'Prosciutto cotto', percentage: 15, allergens: [] }, { name: 'Cipolla, Burro', percentage: 10, allergens: ['Latte'] }], desc: 'Piselli saporiti.' },
    'Piselli alla Francese': { category: 'Contorni', ingredients: [{ name: 'Piselli', percentage: 70, allergens: [] }, { name: 'Lattuga, Cipollotti', percentage: 20, allergens: [] }, { name: 'Burro', percentage: 10, allergens: ['Latte'] }], desc: 'Piselli brasati.' },
    'Fave e Pecorino': { category: 'Contorni', ingredients: [{ name: 'Fave fresche', percentage: 70, allergens: [] }, { name: 'Pecorino Romano', percentage: 20, allergens: ['Latte'] }, { name: 'Olio EVO', percentage: 10, allergens: [] }], desc: 'Abbinamento laziale.' },
    'Edamame': { category: 'Contorni', ingredients: [{ name: 'Soia edamame', percentage: 98, allergens: ['Soia'] }, { name: 'Sale grosso', percentage: 2, allergens: [] }], desc: 'Soia orientale.' },
    'Hummus di Ceci': { category: 'Contorni', ingredients: [{ name: 'Ceci', percentage: 70, allergens: [] }, { name: 'Tahina', percentage: 15, allergens: ['Sesamo'] }, { name: 'Limone, Olio, Aglio', percentage: 15, allergens: [] }], desc: 'Crema di ceci.' },
    'Giardiniera Verdure': { category: 'Contorni', ingredients: [{ name: 'Verdure miste (Carote, Sedano)', percentage: 80, allergens: ['Sedano'] }, { name: 'Aceto, Olio', percentage: 20, allergens: ['Solfiti'] }], desc: 'Verdure sottaceto.' },
    'Olive Ascolane': { category: 'Contorni', ingredients: [{ name: 'Olive farcite (Carne)', percentage: 70, allergens: [] }, { name: 'Pangrattato, Uova', percentage: 30, allergens: ['Glutine', 'Uova'] }], desc: 'Olive fritte farcite.' },
    'Polenta Grigliata': { category: 'Contorni', ingredients: [{ name: 'Polenta (Farina mais)', percentage: 95, allergens: [] }, { name: 'Olio EVO / Lardo', percentage: 5, allergens: [] }], desc: 'Bastoncini polenta.' },
    'Insalata Rinforzo': { category: 'Contorni', ingredients: [{ name: 'Cavolfiore', percentage: 60, allergens: [] }, { name: 'Olive, Sottaceti', percentage: 40, allergens: ['Solfiti'] }], desc: 'Partenopea Natale.' },
    'Peperoni Imbottiti': { category: 'Contorni', ingredients: [{ name: 'Peperoni', percentage: 60, allergens: [] }, { name: 'Pangrattato, Capperi, Olive', percentage: 40, allergens: ['Glutine', 'Solfiti'] }], desc: 'Peperoni al forno.' },
    'Broccolo Romano Forno': { category: 'Contorni', ingredients: [{ name: 'Broccolo Romano', percentage: 85, allergens: [] }, { name: 'Parmigiano, Aglio', percentage: 15, allergens: ['Latte'] }], desc: 'Broccolo gratinato.' },
    'Porri Stufati': { category: 'Contorni', ingredients: [{ name: 'Porri', percentage: 80, allergens: [] }, { name: 'Brodo Vegetale, Burro', percentage: 20, allergens: ['Sedano', 'Latte'] }], desc: 'Porri teneri.' },
    'Bruxelles Bacon': { category: 'Contorni', ingredients: [{ name: 'Cavoletti Bruxelles', percentage: 75, allergens: [] }, { name: 'Pancetta affumicata', percentage: 15, allergens: [] }, { name: 'Burro', percentage: 10, allergens: ['Latte'] }], desc: 'Cavoletti e bacon.' },
    'Bruxelles al Forno': { category: 'Contorni', ingredients: [{ name: 'Cavoletti Bruxelles', percentage: 90, allergens: [] }, { name: 'Olio, Sciroppo d\'acero', percentage: 10, allergens: [] }], desc: 'Cavoletti arrostiti.' },
    'Taccole al Burro': { category: 'Contorni', ingredients: [{ name: 'Taccole', percentage: 90, allergens: [] }, { name: 'Burro, Sale', percentage: 10, allergens: ['Latte'] }], desc: 'Taccole saltate.' },

    // --- PIZZERIA (30) ---
    'Pizza Margherita': { category: 'Pizzeria', ingredients: [{ name: 'Impasto (Farina, Acqua, Lievito)', percentage: 65, allergens: ['Glutine'] }, { name: 'Pomodoro', percentage: 15, allergens: [] }, { name: 'Mozzarella fior di latte', percentage: 15, allergens: ['Latte'] }, { name: 'Olio EVO, Basilico', percentage: 5, allergens: [] }], desc: 'Classica napoletana.' },
    'Pizza Marinara': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 75, allergens: ['Glutine'] }, { name: 'Pomodoro', percentage: 20, allergens: [] }, { name: 'Aglio, Origano, Olio', percentage: 5, allergens: [] }], desc: 'Vera tradizione.' },
    'Pizza Napoli': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 65, allergens: ['Glutine'] }, { name: 'Pomodoro, Mozzarella', percentage: 25, allergens: ['Latte'] }, { name: 'Acciughe', percentage: 7, allergens: ['Pesce'] }, { name: 'Origano, Olio', percentage: 3, allergens: [] }], desc: 'Saporita acciughe.' },
    'Pizza Diavola': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 65, allergens: ['Glutine'] }, { name: 'Pomodoro, Mozzarella', percentage: 25, allergens: ['Latte'] }, { name: 'Salame piccante', percentage: 10, allergens: [] }], desc: 'Piccante classica.' },
    'Pizza Quattro Formaggi': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 65, allergens: ['Glutine'] }, { name: 'Mix Formaggi (Gorgonzola, Fontina, Parmigiano)', percentage: 20, allergens: ['Latte'] }, { name: 'Mozzarella', percentage: 15, allergens: ['Latte'] }], desc: 'Delizia casearia.' },
    'Pizza Capricciosa': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 60, allergens: ['Glutine'] }, { name: 'Pomodoro, Mozzarella', percentage: 20, allergens: ['Latte'] }, { name: 'Prosciutto, Funghi, Carciofini, Olive', percentage: 20, allergens: ['Solfiti'] }], desc: 'Molto ricca.' },
    'Pizza Quattro Stagioni': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 60, allergens: ['Glutine'] }, { name: 'Pomodoro, Mozzarella', percentage: 20, allergens: ['Latte'] }, { name: 'Farcitura quattro quadranti', percentage: 20, allergens: ['Solfiti'] }], desc: 'Quattro gusti.' },
    'Pizza Bufalina': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 65, allergens: ['Glutine'] }, { name: 'Pomodoro', percentage: 15, allergens: [] }, { name: 'Mozzarella di Bufala DOP', percentage: 15, allergens: ['Latte'] }, { name: 'Olio, Basilico', percentage: 5, allergens: [] }], desc: 'Bufala campana.' },
    'Pizza Prosciutto e Funghi': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 65, allergens: ['Glutine'] }, { name: 'Pomodoro, Mozzarella', percentage: 20, allergens: ['Latte'] }, { name: 'Prosciutto cotto, Funghi', percentage: 15, allergens: [] }], desc: 'Gusto delicato.' },
    'Pizza Vegetariana': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 65, allergens: ['Glutine'] }, { name: 'Mozzarella, Pomodoro', percentage: 20, allergens: ['Latte'] }, { name: 'Verdure grigliate', percentage: 15, allergens: [] }], desc: 'Ortolana ricca.' },
    'Pizza Tonno e Cipolla': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 65, allergens: ['Glutine'] }, { name: 'Pomodoro, Mozzarella', percentage: 20, allergens: ['Latte'] }, { name: 'Tonno sott\'olio, Cipolla', percentage: 15, allergens: ['Pesce'] }], desc: 'Gusto deciso.' },
    'Pizza Salsiccia e Friarielli': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 65, allergens: ['Glutine'] }, { name: 'Mozzarella', percentage: 15, allergens: ['Latte'] }, { name: 'Salsiccia, Friarielli', percentage: 15, allergens: [] }, { name: 'Olio, Peperoncino', percentage: 5, allergens: [] }], desc: 'Tipica campana.' },
    'Pizza Boscaiola': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 65, allergens: ['Glutine'] }, { name: 'Mozzarella, Salsiccia, Funghi', percentage: 25, allergens: ['Latte'] }, { name: 'Panna (opzionale)', percentage: 10, allergens: ['Latte'] }], desc: 'Pizza di bosco.' },
    'Pizza Speck e Brie': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 65, allergens: ['Glutine'] }, { name: 'Mozzarella, Brie', percentage: 20, allergens: ['Latte'] }, { name: 'Speck', percentage: 15, allergens: [] }], desc: 'Gusto tirolese.' },
    'Pizza Parmigiana': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 65, allergens: ['Glutine'] }, { name: 'Pomodoro, Mozzarella', percentage: 15, allergens: ['Latte'] }, { name: 'Melanzane fritte', percentage: 15, allergens: [] }, { name: 'Parmigiano, Basilico', percentage: 5, allergens: ['Latte'] }], desc: 'Gusto melanzana.' },
    'Pizza Wurstel e Patatine': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 65, allergens: ['Glutine'] }, { name: 'Mozzarella, Pomodoro', percentage: 15, allergens: ['Latte'] }, { name: 'Wurstel, Patatine', percentage: 20, allergens: [] }], desc: 'Amata dai bambini.' },
    'Pizza Tirolese': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 65, allergens: ['Glutine'] }, { name: 'Mozzarella, Gorgonzola', percentage: 20, allergens: ['Latte'] }, { name: 'Speck', percentage: 15, allergens: [] }], desc: 'Speck e zola.' },
    'Pizza Carbonara': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 60, allergens: ['Glutine'] }, { name: 'Mozzarella, Guanciale', percentage: 20, allergens: ['Latte'] }, { name: 'Tuorlo uovo, Pecorino', percentage: 15, allergens: ['Uova', 'Latte'] }, { name: 'Pepe nero', percentage: 5, allergens: [] }], desc: 'Interessante variante.' },
    'Pizza Calabrese': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 65, allergens: ['Glutine'] }, { name: 'Pomodoro, Mozzarella', percentage: 15, allergens: ['Latte'] }, { name: 'Nduja, Salame piccante', percentage: 15, allergens: ['Solfiti'] }, { name: 'Cipolla', percentage: 5, allergens: [] }], desc: 'Molto piccante.' },
    'Pizza Crudo, Rucola e Grana': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 60, allergens: ['Glutine'] }, { name: 'Mozzarella, Pomodoro', percentage: 15, allergens: ['Latte'] }, { name: 'Prosciutto crudo, Rucola', percentage: 20, allergens: [] }, { name: 'Scaglie di Grana', percentage: 5, allergens: ['Latte'] }], desc: 'Fresca e saporita.' },
    'Pizza Americana': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 65, allergens: ['Glutine'] }, { name: 'Mozzarella, Wurstel', percentage: 20, allergens: ['Latte'] }, { name: 'Bacon, Uovo', percentage: 15, allergens: ['Uova'] }], desc: 'Gusto USA.' },
    'Pizza Pistacchio e Mortadella': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 60, allergens: ['Glutine'] }, { name: 'Mozzarella, Mortadella', percentage: 25, allergens: ['Latte'] }, { name: 'Pistacchio (Pesto/Granella)', percentage: 10, allergens: ['Frutta a guscio'] }, { name: 'Burrata', percentage: 5, allergens: ['Latte'] }], desc: 'Pizza gourmet.' },
    'Pizza ai Quattro Salumi': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 60, allergens: ['Glutine'] }, { name: 'Pomodoro, Mozzarella', percentage: 15, allergens: ['Latte'] }, { name: 'Salumi (Cotto, Salame, Salsiccia, Pancetta)', percentage: 25, allergens: [] }], desc: 'Carica di carne.' },
    'Pizza Mediterranea': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 65, allergens: ['Glutine'] }, { name: 'Bufala, Pomodorini', percentage: 20, allergens: ['Latte'] }, { name: 'Capperi, Olive, Origano', percentage: 15, allergens: ['Solfiti'] }], desc: 'Freschezza mediterranea.' },
    'Pizza Radicchio e Gorgonzola': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 65, allergens: ['Glutine'] }, { name: 'Mozzarella, Gorgonzola', percentage: 20, allergens: ['Latte'] }, { name: 'Radicchio, Noci', percentage: 15, allergens: ['Frutta a guscio'] }], desc: 'Gusto deciso.' },
    'Pizza Porcini e Taleggio': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 65, allergens: ['Glutine'] }, { name: 'Mozzarella, Taleggio', percentage: 20, allergens: ['Latte'] }, { name: 'Porcini, Prezzemolo', percentage: 15, allergens: [] }], desc: 'Pizza ricca.' },
    'Pizza Tartufata': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 65, allergens: ['Glutine'] }, { name: 'Crema Tartufo, Funghi', percentage: 15, allergens: ['Solfiti'] }, { name: 'Mozzarella, Parmigiano', percentage: 20, allergens: ['Latte'] }], desc: 'Aroma di tartufo.' },
    'Pizza Messicana': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 60, allergens: ['Glutine'] }, { name: 'Pomodoro, Mozzarella, Salsiccia', percentage: 25, allergens: ['Latte'] }, { name: 'Fagioli, Cipolla, Peperoncino', percentage: 15, allergens: [] }], desc: 'Stile messicano.' },
    'Pizza Hawaii': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 65, allergens: ['Glutine'] }, { name: 'Pomodoro, Mozzarella', percentage: 15, allergens: ['Latte'] }, { name: 'Prosciutto cotto, Ananas', percentage: 20, allergens: [] }], desc: 'Controversa ma richiesta.' },
    'Calzone Classico': { category: 'Pizzeria', ingredients: [{ name: 'Impasto', percentage: 60, allergens: ['Glutine'] }, { name: 'Mozzarella, Ricotta', percentage: 25, allergens: ['Latte'] }, { name: 'Prosciutto cotto, Pomodoro', percentage: 15, allergens: [] }], desc: 'Ripieno classico.' },

    // --- DESSERT (100) ---
    // AL CUCCHIAIO (1-25)
    'Tiramisù Classico': { category: 'Dessert', ingredients: [{ name: 'Mascarpone', percentage: 35, allergens: ['Latte'] }, { name: 'Savoiardi', percentage: 25, allergens: ['Glutine'] }, { name: 'Caffè espresso', percentage: 15, allergens: [] }, { name: 'Zucchero, Uova fresche', percentage: 20, allergens: ['Uova'] }, { name: 'Cacao amaro', percentage: 5, allergens: [] }], desc: 'Il dolce più amato.' },
    'Panna Cotta Vaniglia': { category: 'Dessert', ingredients: [{ name: 'Panna fresca', percentage: 70, allergens: ['Latte'] }, { name: 'Zucchero', percentage: 20, allergens: [] }, { name: 'Gelatina', percentage: 5, allergens: [] }, { name: 'Vaniglia, Frutti bosco', percentage: 5, allergens: [] }], desc: 'Panna cotta fluida.' },
    'Crema Catalana': { category: 'Dessert', ingredients: [{ name: 'Latte intero', percentage: 65, allergens: ['Latte'] }, { name: 'Zucchero, Tuorli d\'uovo', percentage: 25, allergens: ['Uova'] }, { name: 'Amido mais, Cannella', percentage: 10, allergens: [] }], desc: 'Croccante sopra.' },
    'Zuppa Inglese': { category: 'Dessert', ingredients: [{ name: 'Savoiardi', percentage: 30, allergens: ['Glutine'] }, { name: 'Crema (Latte, Uova)', percentage: 40, allergens: ['Latte', 'Uova'] }, { name: 'Alchermes', percentage: 15, allergens: ['Solfiti'] }, { name: 'Zucchero, Cioccolato', percentage: 15, allergens: ['Latte', 'Soia'] }], desc: 'Torta al cucchiaio.' },
    'Mousse al Cioccolato': { category: 'Dessert', ingredients: [{ name: 'Cioccolato fondente', percentage: 40, allergens: ['Latte', 'Soia'] }, { name: 'Panna fresca', percentage: 35, allergens: ['Latte'] }, { name: 'Uova, Zucchero', percentage: 20, allergens: ['Uova'] }, { name: 'Burro', percentage: 5, allergens: ['Latte'] }], desc: 'Cremosa e intensa.' },
    'Budino al Cioccolato': { category: 'Dessert', ingredients: [{ name: 'Latte intero', percentage: 70, allergens: ['Latte'] }, { name: 'Zucchero, Cacao', percentage: 20, allergens: [] }, { name: 'Amido, Burro', percentage: 10, allergens: ['Latte'] }], desc: 'Classico budino.' },
    'Bonet Piemontese': { category: 'Dessert', ingredients: [{ name: 'Latte, Uova', percentage: 60, allergens: ['Latte', 'Uova'] }, { name: 'Amaretti', percentage: 15, allergens: ['Glutine', 'Uova'] }, { name: 'Cacao, Zucchero', percentage: 15, allergens: [] }, { name: 'Rum', percentage: 10, allergens: ['Solfiti'] }], desc: 'Budino torinese.' },
    'Creme Caramel': { category: 'Dessert', ingredients: [{ name: 'Latte', percentage: 60, allergens: ['Latte'] }, { name: 'Uova', percentage: 20, allergens: ['Uova'] }, { name: 'Zucchero', percentage: 20, allergens: [] }], desc: 'Gusto vaniglia.' },
    'Semifreddo Torroncino': { category: 'Dessert', ingredients: [{ name: 'Panna fresca', percentage: 55, allergens: ['Latte'] }, { name: 'Torrone mandorle', percentage: 25, allergens: ['Uova', 'Frutta a guscio'] }, { name: 'Uova, Zucchero', percentage: 20, allergens: ['Uova'] }], desc: 'Gusto torrone.' },
    'Zabaione caldo': { category: 'Dessert', ingredients: [{ name: 'Tuorli uovo', percentage: 50, allergens: ['Uova'] }, { name: 'Zucchero', percentage: 30, allergens: [] }, { name: 'Vino Marsala', percentage: 20, allergens: ['Solfiti'] }], desc: 'Cremoso al vino.' },
    'Biancomangiare': { category: 'Dessert', ingredients: [{ name: 'Latte di mandorla', percentage: 65, allergens: ['Frutta a guscio'] }, { name: 'Zucchero', percentage: 20, allergens: [] }, { name: 'Amido mais, Cannella', percentage: 10, allergens: [] }, { name: 'Granella pistacchio', percentage: 5, allergens: ['Frutta a guscio'] }], desc: 'Dolce siciliano.' },
    'Profiteroles Cioccolato': { category: 'Dessert', ingredients: [{ name: 'Bignè (Farina, Uova)', percentage: 30, allergens: ['Glutine', 'Uova'] }, { name: 'Panna montata', percentage: 35, allergens: ['Latte'] }, { name: 'Copertura Cioccolato', percentage: 35, allergens: ['Latte', 'Soia'] }], desc: 'Bignè farciti.' },
    'Macedonia': { category: 'Dessert', ingredients: [{ name: 'Frutta stagione', percentage: 90, allergens: [] }, { name: 'Succo limone, Zucchero', percentage: 7, allergens: [] }, { name: 'Maraschino', percentage: 3, allergens: ['Solfiti'] }], desc: 'Frutta fresca.' },
    'Affogato Caffè': { category: 'Dessert', ingredients: [{ name: 'Gelato vaniglia', percentage: 75, allergens: ['Latte', 'Uova'] }, { name: 'Caffè espresso', percentage: 25, allergens: [] }], desc: 'Gusto contrasto.' },
    'Gelato Crema': { category: 'Dessert', ingredients: [{ name: 'Latte, Panna', percentage: 70, allergens: ['Latte'] }, { name: 'Tuorli, Zucchero', percentage: 30, allergens: ['Uova'] }], desc: 'Mantecato crema.' },
    'Gelato Cioccolato': { category: 'Dessert', ingredients: [{ name: 'Latte, Zucchero', percentage: 65, allergens: ['Latte'] }, { name: 'Cacao, Cioccolato', percentage: 25, allergens: ['Soia'] }, { name: 'Panna', percentage: 10, allergens: ['Latte'] }], desc: 'Mantecato cacao.' },
    'Sorbetto Limone': { category: 'Dessert', ingredients: [{ name: 'Acqua, Zucchero', percentage: 65, allergens: [] }, { name: 'Succo limone', percentage: 30, allergens: [] }, { name: 'Albume uovo', percentage: 5, allergens: ['Uova'] }], desc: 'Digestivo.' },
    'Tartufo Pizzo': { category: 'Dessert', ingredients: [{ name: 'Gelato (Nocciola/Cioccolato)', percentage: 80, allergens: ['Latte', 'Frutta a guscio'] }, { name: 'Cuore cioccolato', percentage: 15, allergens: ['Soia'] }, { name: 'Cacao polvere', percentage: 5, allergens: [] }], desc: 'Calabrese DOC.' },
    'Crema Mascarpone': { category: 'Dessert', ingredients: [{ name: 'Mascarpone', percentage: 55, allergens: ['Latte'] }, { name: 'Uova, Zucchero', percentage: 35, allergens: ['Uova'] }, { name: 'Scaglie cioccolato', percentage: 10, allergens: ['Latte', 'Soia'] }], desc: 'Base tiramisù.' },
    'Mousse Pistacchio': { category: 'Dessert', ingredients: [{ name: 'Panna fresca', percentage: 60, allergens: ['Latte'] }, { name: 'Pasta Pistacchio', percentage: 20, allergens: ['Frutta a guscio'] }, { name: 'Cioccolato bianco', percentage: 15, allergens: ['Latte', 'Soia'] }, { name: 'Zucchero', percentage: 5, allergens: [] }], desc: 'Pistacchio cremosa.' },
    'Bavarese Fragole': { category: 'Dessert', ingredients: [{ name: 'Fragole fresh', percentage: 50, allergens: [] }, { name: 'Panna, Zucchero', percentage: 40, allergens: ['Latte'] }, { name: 'Gelatina, Limone', percentage: 10, allergens: [] }], desc: 'Fragola fresca.' },
    'Chia Pudding': { category: 'Dessert', ingredients: [{ name: 'Latte cocco', percentage: 75, allergens: [] }, { name: 'Semi chia', percentage: 15, allergens: [] }, { name: 'Sciroppo acero', percentage: 10, allergens: [] }], desc: 'Benessere moderno.' },
    'Cheesecake Freddo': { category: 'Dessert', ingredients: [{ name: 'Formaggio spalmabile', percentage: 45, allergens: ['Latte'] }, { name: 'Biscotti digestive', percentage: 25, allergens: ['Glutine'] }, { name: 'Panna, Burro', percentage: 25, allergens: ['Latte'] }, { name: 'Gelatina', percentage: 5, allergens: [] }], desc: 'Base fredda.' },
    'Trifle Frutta': { category: 'Dessert', ingredients: [{ name: 'Crema pasticcera', percentage: 40, allergens: ['Latte', 'Uova'] }, { name: 'Pan spagna', percentage: 25, allergens: ['Glutine', 'Uova'] }, { name: 'Panna, Frutta', percentage: 35, allergens: ['Latte'] }], desc: 'Stratificato frutta.' },
    'Uva sotto spirito': { category: 'Dessert', ingredients: [{ name: 'Uva', percentage: 70, allergens: [] }, { name: 'Grappa/Alcol', percentage: 20, allergens: ['Solfiti'] }, { name: 'Zucchero, Cannella', percentage: 10, allergens: [] }], desc: 'Conservata alcol.' },

    // TORTE DA FORNO (26-55)
    'Torta della Nonna': { category: 'Dessert', ingredients: [{ name: 'Crema pasticcera', percentage: 50, allergens: ['Latte', 'Uova'] }, { name: 'Pasta frolla', percentage: 40, allergens: ['Glutine', 'Latte', 'Uova'] }, { name: 'Pinoli', percentage: 10, allergens: ['Frutta a guscio'] }], desc: 'Pinoli e crema.' },
    'Torta Caprese': { category: 'Dessert', ingredients: [{ name: 'Mandorle tritate', percentage: 35, allergens: ['Frutta a guscio'] }, { name: 'Cioccolato fondente', percentage: 25, allergens: ['Latte', 'Soia'] }, { name: 'Burro, Zucchero', percentage: 20, allergens: ['Latte'] }, { name: 'Uova', percentage: 20, allergens: ['Uova'] }], desc: 'Senza farina.' },
    'Pastiera Napoletana': { category: 'Dessert', ingredients: [{ name: 'Ricotta, Grano cotto', percentage: 45, allergens: ['Latte', 'Glutine'] }, { name: 'Pasta frolla', percentage: 25, allergens: ['Glutine', 'Latte', 'Uova'] }, { name: 'Zucchero, Uova, Canditi', percentage: 25, allergens: ['Uova', 'Solfiti'] }, { name: 'Acqua fiori arancio', percentage: 5, allergens: [] }], desc: 'Pasquale napoletana.' },
    'Torta Mele': { category: 'Dessert', ingredients: [{ name: 'Mele fresh', percentage: 45, allergens: [] }, { name: 'Farina, Zucchero', percentage: 30, allergens: ['Glutine'] }, { name: 'Burro, Uova, Latte', percentage: 20, allergens: ['Latte', 'Uova'] }, { name: 'Lievito', percentage: 5, allergens: [] }], desc: 'Soffice alle mele.' },
    'Crostata Marmellata': { category: 'Dessert', ingredients: [{ name: 'Pasta frolla', percentage: 65, allergens: ['Glutine', 'Latte', 'Uova'] }, { name: 'Confettura Albicocca/Ciliege', percentage: 35, allergens: ['Solfiti'] }], desc: 'Classica confettura.' },
    'Sbriciolata Nutella': { category: 'Dessert', ingredients: [{ name: 'Farina, Zucchero, Burro', percentage: 60, allergens: ['Glutine', 'Latte', 'Uova'] }, { name: 'Nutella', percentage: 40, allergens: ['Latte', 'Frutta a guscio', 'Soia'] }], desc: 'Croccante Nutella.' },
    'Torta Margherita': { category: 'Dessert', ingredients: [{ name: 'Farina, Fecola', percentage: 40, allergens: ['Glutine'] }, { name: 'Zucchero, Uova', percentage: 35, allergens: ['Uova'] }, { name: 'Burro, Limone', percentage: 25, allergens: ['Latte'] }], desc: 'Soffice nuvola.' },
    'Sacher Torta': { category: 'Dessert', ingredients: [{ name: 'Cioccolato Fondente', percentage: 35, allergens: ['Latte', 'Soia'] }, { name: 'Uova, Burro, Farina', percentage: 45, allergens: ['Uova', 'Latte', 'Glutine'] }, { name: 'Confettura Albicocche', percentage: 20, allergens: ['Solfiti'] }], desc: 'Versione italiana.' },
    'Torta Paradiso': { category: 'Dessert', ingredients: [{ name: 'Burro, Zucchero', percentage: 40, allergens: ['Latte'] }, { name: 'Uova', percentage: 25, allergens: ['Uova'] }, { name: 'Farina, Fecola', percentage: 35, allergens: ['Glutine'] }], desc: 'Burrosa e soffice.' },
    'Torta Carote': { category: 'Dessert', ingredients: [{ name: 'Carote fresh', percentage: 35, allergens: [] }, { name: 'Mandorle farina', percentage: 20, allergens: ['Frutta a guscio'] }, { name: 'Farina, Zucchero, Uova', percentage: 35, allergens: ['Glutine', 'Uova'] }, { name: 'Olio semi', percentage: 10, allergens: [] }], desc: 'Carote e mandorle.' },
    'Torta Yogurt': { category: 'Dessert', ingredients: [{ name: 'Yogurt bianco', percentage: 30, allergens: ['Latte'] }, { name: 'Farina, Zucchero', percentage: 40, allergens: ['Glutine'] }, { name: 'Uova, Olio, Lievito', percentage: 30, allergens: ['Uova'] }], desc: 'Yogurt soffice.' },
    'Torta Sbrisolona': { category: 'Dessert', ingredients: [{ name: 'Farine (Mais, 00)', percentage: 45, allergens: ['Glutine'] }, { name: 'Mandorle', percentage: 20, allergens: ['Frutta a guscio'] }, { name: 'Burro, Zucchero, Tuorli', percentage: 35, allergens: ['Latte', 'Uova'] }], desc: 'Dura mantovana.' },
    'Strudel Mele': { category: 'Dessert', ingredients: [{ name: 'Mele, Uvetta, Pinoli', percentage: 65, allergens: ['Frutta a guscio'] }, { name: 'Pasta (Farina, Olio)', percentage: 25, allergens: ['Glutine'] }, { name: 'Pangrattato, Cannella', percentage: 10, allergens: ['Glutine'] }], desc: 'Classico tirolese.' },
    'Torta Mimosa': { category: 'Dessert', ingredients: [{ name: 'Pan Spagna', percentage: 40, allergens: ['Glutine', 'Uova'] }, { name: 'Crema Diplomatica', percentage: 40, allergens: ['Latte', 'Uova'] }, { name: 'Ananas sciroppato', percentage: 20, allergens: ['Solfiti'] }], desc: 'Festa della donna.' },
    'Torta Nocciole': { category: 'Dessert', ingredients: [{ name: 'Nocciole Tonde', percentage: 45, allergens: ['Frutta a guscio'] }, { name: 'Zucchero, Uova', percentage: 35, allergens: ['Uova'] }, { name: 'Burro', percentage: 20, allergens: ['Latte'] }], desc: 'Nocciole piemontesi.' },
    'Torta del Nonno': { category: 'Dessert', ingredients: [{ name: 'Pasta frolla cacao', percentage: 40, allergens: ['Glutine', 'Latte', 'Uova'] }, { name: 'Crema cioccolato', percentage: 50, allergens: ['Latte', 'Soia'] }, { name: 'Mandorle lamelle', percentage: 10, allergens: ['Frutta a guscio'] }], desc: 'Cioccolato e mandorle.' },
    'Amaretti morbidi': { category: 'Dessert', ingredients: [{ name: 'Mandorle', percentage: 65, allergens: ['Frutta a guscio'] }, { name: 'Zucchero', percentage: 25, allergens: [] }, { name: 'Albumi uovo', percentage: 10, allergens: ['Uova'] }], desc: 'Mandorle e albumi.' },
    'Cantucci Toscani': { category: 'Dessert', ingredients: [{ name: 'Farina, Zucchero', percentage: 55, allergens: ['Glutine'] }, { name: 'Mandorle intere', percentage: 25, allergens: ['Frutta a guscio'] }, { name: 'Uova, Burro, Miele', percentage: 20, allergens: ['Uova', 'Latte'] }], desc: 'Biscotti secchi.' },
    'Pere e Cioccolato': { category: 'Dessert', ingredients: [{ name: 'Pere fresche', percentage: 40, allergens: [] }, { name: 'Cioccolato, Burro', percentage: 30, allergens: ['Latte', 'Soia'] }, { name: 'Farina, Uova, Zucchero', percentage: 30, allergens: ['Glutine', 'Uova'] }], desc: 'Pere e cacao.' },
    'Torta Limone': { category: 'Dessert', ingredients: [{ name: 'Farina, Zucchero', percentage: 55, allergens: ['Glutine'] }, { name: 'Burro, Uova', percentage: 30, allergens: ['Latte', 'Uova'] }, { name: 'Succo/Scorsa Limone', percentage: 15, allergens: [] }], desc: 'Agrumata forno.' },
    'Torta Sabbiosa': { category: 'Dessert', ingredients: [{ name: 'Fecola Patate', percentage: 40, allergens: [] }, { name: 'Burro', percentage: 30, allergens: ['Latte'] }, { name: 'Zucchero, Uova', percentage: 30, allergens: ['Uova'] }], desc: 'Scioglievole.' },
    'Torta Diplomatica': { category: 'Dessert', ingredients: [{ name: 'Crema pasticcera, Panna', percentage: 45, allergens: ['Latte', 'Uova'] }, { name: 'Sfogliata, Pan Spagna', percentage: 40, allergens: ['Glutine', 'Latte', 'Uova'] }, { name: 'Alchermes', percentage: 15, allergens: ['Solfiti'] }], desc: 'Molto ricca.' },
    'Schiacciata Fiorentina': { category: 'Dessert', ingredients: [{ name: 'Farina, Zucchero', percentage: 55, allergens: ['Glutine'] }, { name: 'Strutto/Burro, Uova', percentage: 30, allergens: ['Latte', 'Uova'] }, { name: 'Succo arancia', percentage: 15, allergens: [] }], desc: 'Toscana agrumi.' },
    'Torta Santiago': { category: 'Dessert', ingredients: [{ name: 'Mandorle', percentage: 55, allergens: ['Frutta a guscio'] }, { name: 'Zucchero, Uova', percentage: 40, allergens: ['Uova'] }, { name: 'Cannella, Limone', percentage: 5, allergens: [] }], desc: 'Base mandorle.' },
    'Muffin Cioccolato': { category: 'Dessert', ingredients: [{ name: 'Farina, Latte', percentage: 55, allergens: ['Glutine', 'Latte'] }, { name: 'Zucchero, Uova', percentage: 30, allergens: ['Uova'] }, { name: 'Cioccolato gocce', percentage: 15, allergens: ['Soia'] }], desc: 'Mini torta cioccolato.' },
    'Brownies': { category: 'Dessert', ingredients: [{ name: 'Cioccolato, Burro', percentage: 45, allergens: ['Latte', 'Soia'] }, { name: 'Zucchero, Uova', percentage: 30, allergens: ['Uova'] }, { name: 'Farina, Noci', percentage: 25, allergens: ['Glutine', 'Frutta a guscio'] }], desc: 'USA chocolate bar.' },
    'Torta Tenerina': { category: 'Dessert', ingredients: [{ name: 'Cioccolato, Zucchero', percentage: 50, allergens: ['Latte', 'Soia'] }, { name: 'Burro, Uova', percentage: 40, allergens: ['Latte', 'Uova'] }, { name: 'Pochissima farina', percentage: 10, allergens: ['Glutine'] }], desc: 'Cuore morbido.' },
    'Crostata Frutta': { category: 'Dessert', ingredients: [{ name: 'Pasta frolla', percentage: 45, allergens: ['Glutine', 'Latte', 'Uova'] }, { name: 'Crema pasticcera', percentage: 30, allergens: ['Latte', 'Uova'] }, { name: 'Frutta fresca, Gelatina', percentage: 25, allergens: [] }], desc: 'Colorata e fresca.' },
    'Ricotta e Cioccolato': { category: 'Dessert', ingredients: [{ name: 'Ricotta, Zucchero', percentage: 55, allergens: ['Latte'] }, { name: 'Uova, Farina', percentage: 30, allergens: ['Uova', 'Glutine'] }, { name: 'Gocce cioccolato', percentage: 15, allergens: ['Soia'] }], desc: 'Classico ripieno.' },
    'Panettoncino Crema': { category: 'Dessert', ingredients: [{ name: 'Panettone', percentage: 60, allergens: ['Glutine', 'Uova', 'Latte', 'Solfiti'] }, { name: 'Crema Mascarpone/Cioccolato', percentage: 40, allergens: ['Latte', 'Uova', 'Soia'] }], desc: 'Dessert natale.' },

    // REGIONALI E FRITTI (56-80)
    'Cannolo Siciliano': { category: 'Dessert', ingredients: [{ name: 'Ricotta pecora', percentage: 55, allergens: ['Latte'] }, { name: 'Cialda fritta', percentage: 20, allergens: ['Glutine'] }, { name: 'Cioccolato, Pistacchio', percentage: 20, allergens: ['Soia', 'Frutta a guscio'] }, { name: 'Zucchero', percentage: 5, allergens: [] }], desc: 'Icona siciliana.' },
    'Babà al Rum': { category: 'Dessert', ingredients: [{ name: 'Pasta babà (Uova, Farina)', percentage: 50, allergens: ['Glutine', 'Uova'] }, { name: 'Bagna Rum', percentage: 50, allergens: ['Solfiti'] }], desc: 'Napoletano verace.' },
    'Sfogliatella Riccia': { category: 'Dessert', ingredients: [{ name: 'Pasta sfoglia', percentage: 40, allergens: ['Glutine'] }, { name: 'Ricotta, Semolino', percentage: 45, allergens: ['Latte', 'Glutine'] }, { name: 'Zucchero, Canditi', percentage: 15, allergens: ['Solfiti'] }], desc: 'Napoletana sfociata.' },
    'Seadas Sarda': { category: 'Dessert', ingredients: [{ name: 'Semola, Strutto', percentage: 45, allergens: ['Glutine'] }, { name: 'Pecorino fresco', percentage: 40, allergens: ['Latte'] }, { name: 'Miele', percentage: 15, allergens: [] }], desc: 'Dolce al formaggio.' },
    'Cassata Siciliana': { category: 'Dessert', ingredients: [{ name: 'Ricotta, Pasta Reale', percentage: 55, allergens: ['Latte', 'Frutta a guscio'] }, { name: 'Pan Spagna', percentage: 20, allergens: ['Glutine', 'Uova'] }, { name: 'Zucchero, Canditi', percentage: 25, allergens: ['Solfiti'] }], desc: 'Regina siciliana.' },
    'Chiacchiere': { category: 'Dessert', ingredients: [{ name: 'Farina, Uova', percentage: 70, allergens: ['Glutine', 'Uova'] }, { name: 'Zucchero, Burro, Grappa', percentage: 30, allergens: ['Latte', 'Solfiti'] }], desc: 'Carnovale.' },
    'Castagnole': { category: 'Dessert', ingredients: [{ name: 'Farina, Uova', percentage: 70, allergens: ['Glutine', 'Uova'] }, { name: 'Zucchero, Burro, Anice', percentage: 30, allergens: ['Latte', 'Solfiti'] }], desc: 'Mini frittelle.' },
    'Zeppole San Giuseppe': { category: 'Dessert', ingredients: [{ name: 'Pasta Bignè', percentage: 45, allergens: ['Glutine', 'Uova', 'Latte'] }, { name: 'Crema Pasticcera', percentage: 45, allergens: ['Latte', 'Uova'] }, { name: 'Amarena', percentage: 10, allergens: ['Solfiti'] }], desc: 'Padre festeggiato.' },
    'Struffoli': { category: 'Dessert', ingredients: [{ name: 'Farina, Uova', percentage: 65, allergens: ['Glutine', 'Uova'] }, { name: 'Miele, Zucchero', percentage: 25, allergens: [] }, { name: 'Confettini', percentage: 10, allergens: ['Soia'] }], desc: 'Natale napoletano.' },
    'Cartellate Pugliesi': { category: 'Dessert', ingredients: [{ name: 'Sfoglia (Farina, Vino)', percentage: 65, allergens: ['Glutine', 'Solfiti'] }, { name: 'Vincotto o Miele', percentage: 35, allergens: [] }], desc: 'Natale pugliese.' },
    'Bombolone Crema': { category: 'Dessert', ingredients: [{ name: 'Pasta lievitata fritta', percentage: 60, allergens: ['Glutine', 'Uova', 'Latte'] }, { name: 'Crema pasticcera', percentage: 40, allergens: ['Latte', 'Uova'] }], desc: 'Fritto ripieno.' },
    'Castagnaccio': { category: 'Dessert', ingredients: [{ name: 'Farina Castagne', percentage: 70, allergens: [] }, { name: 'Pinoli, Uvetta, Noci', percentage: 20, allergens: ['Frutta a guscio'] }, { name: 'Olio EVO', percentage: 10, allergens: [] }], desc: 'Dolce povero.' },
    'Frittelle Mele': { category: 'Dessert', ingredients: [{ name: 'Mele', percentage: 50, allergens: [] }, { name: 'Pastella (Farina, Latte)', percentage: 40, allergens: ['Glutine', 'Latte', 'Uova'] }, { name: 'Zucchero, Cannella', percentage: 10, allergens: [] }], desc: 'Mele fritte.' },
    'Maritozzo Panna': { category: 'Dessert', ingredients: [{ name: 'Pasticciotto (Farina, Uova)', percentage: 55, allergens: ['Glutine', 'Uova', 'Latte'] }, { name: 'Panna montata', percentage: 45, allergens: ['Latte'] }], desc: 'Colazione romana.' },
    'Gubana': { category: 'Dessert', ingredients: [{ name: 'Pasta lievitata', percentage: 45, allergens: ['Glutine', 'Uova', 'Latte'] }, { name: 'Noci, Uvetta, Pinoli', percentage: 45, allergens: ['Frutta a guscio'] }, { name: 'Grappa', percentage: 10, allergens: ['Solfiti'] }], desc: 'Friulana ricca.' },
    'Baci di Dama': { category: 'Dessert', ingredients: [{ name: 'Farine (Nocciole, 00)', percentage: 60, allergens: ['Frutta a guscio', 'Glutine'] }, { name: 'Burro, Zucchero', percentage: 30, allergens: ['Latte'] }, { name: 'Cioccolato fondente', percentage: 10, allergens: ['Latte', 'Soia'] }], desc: 'Biscotti accoppiati.' },
    'Salame Cioccolato': { category: 'Dessert', ingredients: [{ name: 'Biscotti secchi', percentage: 40, allergens: ['Glutine'] }, { name: 'Cioccolato, Burro', percentage: 40, allergens: ['Latte', 'Soia'] }, { name: 'Zucchero, Uova, Rum', percentage: 20, allergens: ['Uova', 'Solfiti'] }], desc: 'Simil salame.' },
    'Pesche dolci': { category: 'Dessert', ingredients: [{ name: 'Biscotti (Farina, Uova)', percentage: 50, allergens: ['Glutine', 'Uova'] }, { name: 'Crema/Nutella', percentage: 35, allergens: ['Latte', 'Frutta a guscio'] }, { name: 'Alchermes', percentage: 15, allergens: ['Solfiti'] }], desc: 'Due metà creme.' },
    'Pardulas Sarde': { category: 'Dessert', ingredients: [{ name: 'Ricotta, Zafferano', percentage: 65, allergens: ['Latte'] }, { name: 'Sfoglia (Farina, Strutto)', percentage: 25, allergens: ['Glutine'] }, { name: 'Zucchero, Arancia', percentage: 10, allergens: [] }], desc: 'Pasquali sarde.' },
    'Pandolce Genovese': { category: 'Dessert', ingredients: [{ name: 'Farina, Burro', percentage: 50, allergens: ['Glutine', 'Latte'] }, { name: 'Uvetta, Canditi', percentage: 35, allergens: ['Solfiti'] }, { name: 'Pinoli', percentage: 15, allergens: ['Frutta a guscio'] }], desc: 'Natale Genova.' },
    'Buccellato Siciliano': { category: 'Dessert', ingredients: [{ name: 'Farina, Zucchero', percentage: 45, allergens: ['Glutine'] }, { name: 'Fichi secchi, Frutta guscio', percentage: 40, allergens: ['Frutta a guscio'] }, { name: 'Miele, Canditi', percentage: 15, allergens: ['Solfiti'] }], desc: 'Fichi e noci.' },
    'Rocciata Assisi': { category: 'Dessert', ingredients: [{ name: 'Pasta (Farina, Olio)', percentage: 40, allergens: ['Glutine'] }, { name: 'Mele, Noci, Uvetta', percentage: 45, allergens: ['Frutta a guscio'] }, { name: 'Fichi, Cacao', percentage: 15, allergens: [] }], desc: 'Umbria dolce.' },
    'Torrone Morbido': { category: 'Dessert', ingredients: [{ name: 'Mandorle/Nocciole', percentage: 55, allergens: ['Frutta a guscio'] }, { name: 'Miele, Zucchero', percentage: 35, allergens: [] }, { name: 'Albumi, Ostia', percentage: 10, allergens: ['Uova', 'Glutine'] }], desc: 'Natale classico.' },
    'Scacciata Noci': { category: 'Dessert', ingredients: [{ name: 'Noci', percentage: 60, allergens: ['Frutta a guscio'] }, { name: 'Miele, Zucchero', percentage: 30, allergens: [] }, { name: 'Pasta base', percentage: 10, allergens: ['Glutine'] }], desc: 'Molte noci.' },
    'Mustaccioli': { category: 'Dessert', ingredients: [{ name: 'Farina, Zucchero', percentage: 50, allergens: ['Glutine'] }, { name: 'Miele, Cacao', percentage: 20, allergens: [] }, { name: 'Glassa Cioccolato', percentage: 30, allergens: ['Latte', 'Soia'] }], desc: 'Pasquali ricchi.' },

    // PUB, PIZZERIA E MODERNI (81-100)
    'Pizza alla Nutella': { category: 'Dessert', ingredients: [{ name: 'Impasto Pizza', percentage: 70, allergens: ['Glutine'] }, { name: 'Nutella', percentage: 20, allergens: ['Latte', 'Frutta a guscio', 'Soia'] }, { name: 'Nocciole granella', percentage: 10, allergens: ['Frutta a guscio'] }], desc: 'Fine cena pizza.' },
    'Angioletti Fritti': { category: 'Dessert', ingredients: [{ name: 'Impasto pizza fritto', percentage: 80, allergens: ['Glutine'] }, { name: 'Nutella o Zucchero', percentage: 20, allergens: ['Latte', 'Frutta a guscio', 'Soia'] }], desc: 'Straccetti pizza.' },
    'Calzone Nutella': { category: 'Dessert', ingredients: [{ name: 'Impasto Pizza', percentage: 70, allergens: ['Glutine'] }, { name: 'Nutella', percentage: 20, allergens: ['Latte', 'Frutta a guscio', 'Soia'] }, { name: 'Ricotta', percentage: 10, allergens: ['Latte'] }], desc: 'Ripieno Nutella.' },
    'Cheesecake Frutti Bosco': { category: 'Dessert', ingredients: [{ name: 'Formaggio spalmabile', percentage: 40, allergens: ['Latte'] }, { name: 'Biscotti e Burro', percentage: 35, allergens: ['Glutine', 'Latte'] }, { name: 'Frutti di bosco', percentage: 25, allergens: [] }], desc: 'Base formaggio.' },
    'Cheesecake Caramello': { category: 'Dessert', ingredients: [{ name: 'Formaggio spalmabile', percentage: 40, allergens: ['Latte'] }, { name: 'Biscotti e Burro', percentage: 35, allergens: ['Glutine', 'Latte'] }, { name: 'Caramello Salato', percentage: 25, allergens: ['Latte'] }], desc: 'Dolce e sale.' },
    'Tortino Cuore Caldo': { category: 'Dessert', ingredients: [{ name: 'Cioccolato fondente', percentage: 35, allergens: ['Latte', 'Soia'] }, { name: 'Burro, Uova', percentage: 40, allergens: ['Latte', 'Uova'] }, { name: 'Zucchero, Farina', percentage: 25, allergens: ['Glutine'] }], desc: 'Fuso dentro.' },
    'Pancake Sciroppo Acero': { category: 'Dessert', ingredients: [{ name: 'Farina, Latte, Uova', percentage: 80, allergens: ['Glutine', 'Latte', 'Uova'] }, { name: 'Sciroppo acero', percentage: 15, allergens: [] }, { name: 'Burro', percentage: 5, allergens: ['Latte'] }], desc: 'USA breakfast.' },
    'Waffle Gelato': { category: 'Dessert', ingredients: [{ name: 'Waffle (Farina, Latte)', percentage: 65, allergens: ['Glutine', 'Latte', 'Uova'] }, { name: 'Gelato Vaniglia', percentage: 25, allergens: ['Latte', 'Uova'] }, { name: 'Topping Cioccolato', percentage: 10, allergens: ['Soia'] }], desc: 'Waffle e gelato.' },
    'Oreo Cake': { category: 'Dessert', ingredients: [{ name: 'Biscotti Oreo', percentage: 40, allergens: ['Glutine', 'Soia'] }, { name: 'Formaggio spalmabile', percentage: 40, allergens: ['Latte'] }, { name: 'Burro, Zucchero', percentage: 20, allergens: ['Latte'] }], desc: 'Base Oreo.' },
    'Red Velvet Cake': { category: 'Dessert', ingredients: [{ name: 'Farina, Latte, Uova', percentage: 60, allergens: ['Glutine', 'Latte', 'Uova'] }, { name: 'Zucchero, Burro', percentage: 25, allergens: ['Latte'] }, { name: 'Frosting formaggio', percentage: 15, allergens: ['Latte'] }], desc: 'Torta rossa.' },
    'Carrot Cake US': { category: 'Dessert', ingredients: [{ name: 'Carote, Noci', percentage: 45, allergens: ['Frutta a guscio'] }, { name: 'Farina, Zucchero', percentage: 35, allergens: ['Glutine'] }, { name: 'Frosting formaggio', percentage: 20, allergens: ['Latte'] }], desc: 'Carote frosting.' },
    'Cookie gigante': { category: 'Dessert', ingredients: [{ name: 'Impasto Cookies', percentage: 85, allergens: ['Glutine', 'Latte', 'Uova'] }, { name: 'Gocce cioccolato', percentage: 15, allergens: ['Soia'] }], desc: 'Cookie enorme.' },
    'Banoffee Pie': { category: 'Dessert', ingredients: [{ name: 'Biscotti e Burro', percentage: 35, allergens: ['Glutine', 'Latte'] }, { name: 'Banane fresche', percentage: 25, allergens: [] }, { name: 'Toffee e Panna', percentage: 40, allergens: ['Latte'] }], desc: 'Banane e croffee.' },
    'Apple Pie': { category: 'Dessert', ingredients: [{ name: 'Mele fresh', percentage: 60, allergens: [] }, { name: 'Pasta Brisee (Farina, Burro)', percentage: 35, allergens: ['Glutine', 'Latte'] }, { name: 'Zucchero', percentage: 5, allergens: [] }], desc: 'Torta mele chiusa.' },
    'Focaccia Dolce Uva': { category: 'Dessert', ingredients: [{ name: 'Impasto lievitato', percentage: 65, allergens: ['Glutine'] }, { name: 'Uva nera fresh', percentage: 25, allergens: [] }, { name: 'Zucchero', percentage: 10, allergens: [] }], desc: 'Focaccia e uva.' },
    'Mattonella al Caffè': { category: 'Dessert', ingredients: [{ name: 'Biscotti secchi', percentage: 40, allergens: ['Glutine'] }, { name: 'Burro, Zucchero', percentage: 30, allergens: ['Latte'] }, { name: 'Caffè, Uova', percentage: 30, allergens: ['Uova'] }], desc: 'Stratificato caffè.' },
    'Salame di fichi': { category: 'Dessert', ingredients: [{ name: 'Fichi secchi', percentage: 70, allergens: [] }, { name: 'Frutta guscio', percentage: 25, allergens: ['Frutta a guscio'] }, { name: 'Scorza arancia', percentage: 5, allergens: [] }], desc: 'Fichi e noci salame.' },
    'Tartelletta Arachidi': { category: 'Dessert', ingredients: [{ name: 'Pasta frolla', percentage: 40, allergens: ['Glutine', 'Latte', 'Uova'] }, { name: 'Caramello, Arachidi', percentage: 40, allergens: ['Latte', 'Arachidi'] }, { name: 'Cioccolato Ganache', percentage: 20, allergens: ['Latte', 'Soia'] }], desc: 'Dolce e salato.' },
    'Ananas Caramellato': { category: 'Dessert', ingredients: [{ name: 'Ananas fresco', percentage: 80, allergens: [] }, { name: 'Zucchero, Maraschino', percentage: 15, allergens: ['Solfiti'] }, { name: 'Cannella', percentage: 5, allergens: [] }], desc: 'Ananas e alcol.' },
    'Coppa Nonna': { category: 'Dessert', ingredients: [{ name: 'Crema pasticcera', percentage: 60, allergens: ['Latte', 'Uova'] }, { name: 'Panna montata', percentage: 25, allergens: ['Latte'] }, { name: 'Pinoli e Biscotto', percentage: 15, allergens: ['Frutta a guscio', 'Glutine'] }], desc: 'Coppa ricca crema.' },

    // --- PANETTERIA & SNACK (10) ---
    'Pane Bianco (Pagnotta)': { category: 'Panetteria', ingredients: [{ name: 'Farina 0', percentage: 65, allergens: ['Glutine'] }, { name: 'Acqua', percentage: 30, allergens: [] }, { name: 'Lievito, Sale', percentage: 5, allergens: [] }], desc: 'Pane classico.' },
    'Pane ai Cereali': { category: 'Panetteria', ingredients: [{ name: 'Farina Cereali Mix', percentage: 60, allergens: ['Glutine', 'Sesamo'] }, { name: 'Semi (Girasole, Lino)', percentage: 10, allergens: [] }, { name: 'Acqua, Lievito', percentage: 30, allergens: [] }], desc: 'Pane ricco.' },
    'Focaccia al Rosmarino': { category: 'Panetteria', ingredients: [{ name: 'Farina 00', percentage: 60, allergens: ['Glutine'] }, { name: 'Acqua, Olio EVO', percentage: 35, allergens: [] }, { name: 'Rosmarino, Sale', percentage: 5, allergens: [] }], desc: 'Focaccia classica.' },
    'Schiacciata Toscana': { category: 'Panetteria', ingredients: [{ name: 'Farina 00', percentage: 55, allergens: ['Glutine'] }, { name: 'Olio EVO abbondante', percentage: 15, allergens: [] }, { name: 'Acqua, Sale', percentage: 30, allergens: [] }], desc: 'Tipica toscana.' },
    'Piadina Romagnola': { category: 'Panetteria', ingredients: [{ name: 'Farina 00', percentage: 60, allergens: ['Glutine'] }, { name: 'Strutto (o Olio)', percentage: 15, allergens: [] }, { name: 'Acqua, Sale', percentage: 25, allergens: [] }], desc: 'Base piadina.' },
    'Panino Salame e Formaggio': { category: 'Panetteria', ingredients: [{ name: 'Pane tipo Rosetta', percentage: 50, allergens: ['Glutine'] }, { name: 'Salame Milano', percentage: 30, allergens: [] }, { name: 'Formaggio Edam', percentage: 20, allergens: ['Latte'] }], desc: 'Snack rapido.' },
    'Club Sandwich': { category: 'Panetteria', ingredients: [{ name: 'Pane in cassetta', percentage: 30, allergens: ['Glutine'] }, { name: 'Pollo, Bacon', percentage: 30, allergens: [] }, { name: 'Maionese, Uovo', percentage: 20, allergens: ['Uova'] }, { name: 'Lattuga, Pomodoro', percentage: 20, allergens: [] }], desc: 'Sandwich ricco.' },
    'Tramezzino Tonno e Pomodoro': { category: 'Panetteria', ingredients: [{ name: 'Pane bianco senza crosta', percentage: 40, allergens: ['Glutine'] }, { name: 'Tonno, Maionese', percentage: 40, allergens: ['Pesce', 'Uova'] }, { name: 'Pomodoro fresco', percentage: 20, allergens: [] }], desc: 'Tramezzino classico.' },
    'Pizzetta Sfoglia': { category: 'Panetteria', ingredients: [{ name: 'Pasta Sfoglia', percentage: 60, allergens: ['Glutine', 'Latte'] }, { name: 'Pomodoro, Mozzarella', percentage: 40, allergens: ['Latte'] }], desc: 'Snack sfoglia.' },
    'Taralli e Snack Misti': { category: 'Panetteria', ingredients: [{ name: 'Taralli, Grissini', percentage: 90, allergens: ['Glutine', 'Sesamo'] }, { name: 'Olive', percentage: 10, allergens: ['Solfiti'] }], desc: 'Accompagnamento.' }
  };

  readonly presetKeys = computed(() => Object.keys(this.PRESET_RECIPES));
  
  presetSearchQuery = signal<string>('');
  
  filteredPresetKeys = computed(() => {
    const q = this.presetSearchQuery().toLowerCase().trim();
    const all = this.presetKeys();
    if (!q) return all;
    return all.filter(k => k.toLowerCase().includes(q));
  });

  currentRecipe: Partial<Recipe> = {
    name: '',
    category: 'Primi',
    description: '',
    ingredients: []
  };

  filteredRecipes = computed(() => {
    const query = this.searchQuery.toLowerCase();
    const all = this.state.filteredRecipes();
    if (!query) return all;
    return all.filter(r => 
      r.name.toLowerCase().includes(query) || 
      r.category?.toLowerCase().includes(query) ||
      r.ingredients.some(i => i.name.toLowerCase().includes(query))
    );
  });

  openAddModal() {
    this.editingRecipe.set(false);
    this.currentRecipe = {
      id: Math.random().toString(36).substring(2, 9),
      clientId: this.state.activeTargetClientId() || this.state.currentUser()?.clientId || 'demo',
      name: '',
      category: 'Primi',
      description: '',
      ingredients: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.isModalOpen.set(true);
  }

  loadPreset(recipeName: string) {
    const preset = this.PRESET_RECIPES[recipeName];
    if (preset) {
      this.currentRecipe = {
        ...this.currentRecipe,
        name: recipeName,
        category: preset.category,
        description: preset.desc,
        ingredients: JSON.parse(JSON.stringify(preset.ingredients))
      };
      this.toast.success('Ricetta Caricata', `Preset per "${recipeName}" applicato.`);
    }
  }

  openEditModal(recipe: Recipe) {
    this.editingRecipe.set(true);
    this.currentRecipe = JSON.parse(JSON.stringify(recipe));
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.editingRecipe.set(false);
  }

  addIngredientRow() {
    const ings = [...(this.currentRecipe.ingredients || [])];
    ings.push({ name: '', percentage: 0, allergens: [] });
    this.currentRecipe = { ...this.currentRecipe, ingredients: ings };
  }

  removeIngredientRow(index: number) {
    const ings = [...(this.currentRecipe.ingredients || [])];
    ings.splice(index, 1);
    this.currentRecipe = { ...this.currentRecipe, ingredients: ings };
  }

  toggleAllergen(ing: RecipeIngredient, allergenId: string) {
    const allergens = [...ing.allergens];
    if (allergens.includes(allergenId)) {
      ing.allergens = allergens.filter(a => a !== allergenId);
    } else {
      ing.allergens = [...allergens, allergenId];
    }
    this.currentRecipe = { ...this.currentRecipe };
  }

  sortIngredients() {
    const ings = [...(this.currentRecipe.ingredients || [])];
    ings.sort((a, b) => b.percentage - a.percentage);
    this.currentRecipe = { ...this.currentRecipe, ingredients: ings };
  }

  getAllergensForRecipe(recipe: Recipe): any[] {
    const allergenIds = new Set<string>();
    recipe.ingredients.forEach(i => i.allergens.forEach(a => allergenIds.add(a)));
    return this.state.ALLERGEN_LIST.filter(a => allergenIds.has(a.id));
  }

  async simulateAIAutocomplete() {
    this.isGenerating = true;
    const dish = (this.currentRecipe.name || '').toLowerCase();
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Cerca nei Preset prima di usare l'algoritmo
    const presetKey = this.presetKeys().find(k => dish.includes(k.toLowerCase()));
    
    if (presetKey) {
      const preset = this.PRESET_RECIPES[presetKey];
      this.currentRecipe = {
        ...this.currentRecipe,
        ingredients: JSON.parse(JSON.stringify(preset.ingredients)),
        description: preset.desc,
        category: preset.category
      };
      this.toast.success('Piatto Identificato', `Dati caricati da KB per "${presetKey}"`);
    } else {
      // --- SMART FALLBACK ---
      const autoIngs: RecipeIngredient[] = [];
      if (dish.includes('pasta') || dish.includes('spaghetti')) autoIngs.push({ name: 'Base Pasta / Semola', percentage: 55, allergens: ['Glutine'] });
      else if (dish.includes('riso') || dish.includes('risotto')) autoIngs.push({ name: 'Riso Carnaroli / Arborio', percentage: 55, allergens: [] });
      else if (dish.includes('pane') || dish.includes('panino') || dish.includes('focaccia')) autoIngs.push({ name: 'Base Panificato / Farina', percentage: 60, allergens: ['Glutine'] });

      const ingredientKeywords: Record<string, {name: string, allergens: string[]}> = {
        'funghi': { name: 'Funghi misti / Porcini', allergens: [] },
        'zafferano': { name: 'Zafferano in polvere', allergens: [] },
        'zucca': { name: 'Polpa di Zucca', allergens: [] },
        'salmone': { name: 'Salmone fresco', allergens: ['Pesce'] },
        'pistacchi': { name: 'Granella di Pistacchi', allergens: ['Frutta a guscio'] },
        'vongole': { name: 'Vongole veraci', allergens: ['Molluschi'] },
        'uova': { name: 'Uova fresche', allergens: ['Uova'] }
      };

      Object.entries(ingredientKeywords).forEach(([k, data]) => {
        if (dish.includes(k)) autoIngs.push({ ...data, percentage: 20 });
      });

      if (dish.includes('vino')) autoIngs.push({ name: 'Vino bianco / rosso', percentage: 3, allergens: ['Solfiti'] });
      if (autoIngs.length === 0) autoIngs.push({ name: 'Materia prima principale', percentage: 70, allergens: [] });
      autoIngs.push({ name: 'Condimenti (Olio EVO, Sale)', percentage: 5, allergens: [] });

      this.currentRecipe = { ...this.currentRecipe, ingredients: autoIngs, description: `Analisi Gemini Flash per ${dish}.` };
      this.toast.info('Analisi Gemini', `Ricetta generata dinamicamente.`);
    }

    this.isGenerating = false;
    this.sortIngredients();
  }

  saveRecipe() {
    if (!this.currentRecipe.name) {
      this.toast.error('Errore', 'Nome piatto obbligatorio');
      return;
    }
    const recipe = { ...this.currentRecipe, updatedAt: new Date() } as Recipe;
    this.state.syncRecipe(recipe);
    this.closeModal();
  }

  deleteRecipe(recipe: Recipe) {
    if (confirm(`Eliminare "${recipe.name}"?`)) {
      this.state.deleteRecipe(recipe.id);
    }
  }

  printSingleRecipe(recipe: Recipe) {
    const company = this.state.companyConfig();
    const logoUrl = this.state.currentLogo();
    const allergens = this.getAllergensForRecipe(recipe);
    const ingredientsList = recipe.ingredients
        .map(i => `${i.name}${i.percentage > 0 ? ' (' + i.percentage + '%)' : ''}`)
        .join(', ');

    const recipesHtml = `
        <div class="recipe-entry">
          <div class="recipe-header">
            <div class="recipe-name">${recipe.name}</div>
            <div class="recipe-category">${recipe.category || 'Generale'}</div>
          </div>
          
          <div class="recipe-content">
            <div class="section">
              <strong>Ingredienti:</strong>
              <span class="ingredients-text">${ingredientsList || 'Nessun ingrediente specificato.'}</span>
            </div>

            ${allergens.length > 0 ? `
              <div class="section allergens-section">
                <strong>Allergeni presenti:</strong>
                <span class="allergens-list">${allergens.map(a => a.label).join(', ')}</span>
              </div>
            ` : `
              <div class="section">
                <strong>Allergeni:</strong> <span class="no-allergens">Nessun allergene rilevato ai sensi del Reg. UE 1169/2011.</span>
              </div>
            `}

            ${recipe.description ? `
              <div class="section description">
                <strong>Note/Preparazione:</strong>
                <p>${recipe.description}</p>
              </div>
            ` : ''}
          </div>
        </div>
      `;

    const frameId = 'print-frame-ingredients-single';
    let frame = document.getElementById(frameId) as HTMLIFrameElement;
    if (!frame) {
      frame = document.createElement('iframe');
      frame.id = frameId;
      frame.style.display = 'none';
      document.body.appendChild(frame);
    }

    const doc = frame.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <html>
        <head>
          <title> </title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
          <style>
            @page { size: A4; margin: 0; }
            body { font-family: 'Inter', sans-serif; color: #1e293b; margin: 0; padding: 15mm; line-height: 1.5; font-size: 11pt; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 10mm; margin-bottom: 10mm; }
            .logo { max-height: 25mm; max-width: 60mm; object-fit: contain; }
            .company-info { text-align: right; }
            .company-info h1 { margin: 0; font-size: 16pt; font-weight: 900; text-transform: uppercase; color: #0f172a; }
            .company-info p { margin: 2pt 0; font-size: 9pt; color: #64748b; font-weight: 600; }
            .report-title { text-align: center; margin-bottom: 12mm; }
            .report-title h2 { margin: 0; font-size: 20pt; font-weight: 900; text-transform: uppercase; color: #0f172a; }
            .report-title p { margin: 5pt 0; font-size: 10pt; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; }
            .recipe-entry { border: 1px solid #f1f5f9; border-radius: 4mm; overflow: hidden; margin-top: 5mm; }
            .recipe-header { background: #f8fafc; padding: 4mm 6mm; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; }
            .recipe-name { font-size: 13pt; font-weight: 900; text-transform: uppercase; color: #1e293b; }
            .recipe-category { font-size: 8pt; font-weight: 900; text-transform: uppercase; padding: 1mm 3mm; background: #e2e8f0; border-radius: 2mm; color: #475569; }
            .recipe-content { padding: 5mm 6mm; }
            .section { margin-bottom: 3mm; }
            .section strong { display: block; font-size: 8pt; text-transform: uppercase; color: #64748b; margin-bottom: 1mm; letter-spacing: 0.5px; }
            .ingredients-text { font-size: 10pt; text-align: justify; display: block; }
            .allergens-section { background: #fff1f2; border: 1px solid #fecdd3; padding: 2mm 3mm; border-radius: 2mm; }
            .allergens-section strong { color: #be123c; }
            .allergens-list { font-weight: 800; color: #9f1239; font-size: 10pt; text-transform: uppercase; }
            .no-allergens { color: #94a3b8; font-style: italic; font-size: 9pt; }
            .description { font-style: italic; color: #475569; font-size: 9pt; }
            .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 8pt; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 5mm; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logoUrl}" class="logo" onerror="this.style.display='none'">
            <div class="company-info">
              <h1>${company.name}</h1>
              <p>${company.address}</p>
              <p>PIVA: ${company.piva} | Tel: ${company.phone}</p>
              <p>${company.email}</p>
            </div>
          </div>
          <div class="report-title">
            <h2>Scheda Tecnica Prodotto</h2>
            <p>Conforme al Regolamento UE n. 1169/2011</p>
          </div>
          <div class="recipes-container">
            ${recipesHtml}
          </div>
          <div class="footer">
            Documento generato da HACCP PRO Traceability System
          </div>
        </body>
      </html>
    `);
    doc.close();
    setTimeout(() => {
      frame.contentWindow?.print();
    }, 1000);
  }

  printIngredientsBook() {
    const recipes = this.state.filteredRecipes();
    if (recipes.length === 0) {
      this.toast.error('Errore', 'Nessuna ricetta da stampare.');
      return;
    }

    const company = this.state.companyConfig();
    const logoUrl = this.state.currentLogo();

    const recipesHtml = recipes.map(r => {
      const allergens = this.getAllergensForRecipe(r);
      const ingredientsList = r.ingredients
        .map(i => `${i.name}${i.percentage > 0 ? ' (' + i.percentage + '%)' : ''}`)
        .join(', ');

      return `
        <div class="recipe-entry">
          <div class="recipe-header">
            <div class="recipe-name">${r.name}</div>
            <div class="recipe-category">${r.category || 'Generale'}</div>
          </div>
          
          <div class="recipe-content">
            <div class="section">
              <strong>Ingredienti:</strong>
              <span class="ingredients-text">${ingredientsList || 'Nessun ingrediente specificato.'}</span>
            </div>

            ${allergens.length > 0 ? `
              <div class="section allergens-section">
                <strong>Allergeni presenti:</strong>
                <span class="allergens-list">${allergens.map(a => a.label).join(', ')}</span>
              </div>
            ` : `
              <div class="section">
                <strong>Allergeni:</strong> <span class="no-allergens">Nessun allergene rilevato ai sensi del Reg. UE 1169/2011.</span>
              </div>
            `}

            ${r.description ? `
              <div class="section description">
                <strong>Note/Preparazione:</strong>
                <p>${r.description}</p>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    const frameId = 'print-frame-ingredients';
    let frame = document.getElementById(frameId) as HTMLIFrameElement;
    if (!frame) {
      frame = document.createElement('iframe');
      frame.id = frameId;
      frame.style.display = 'none';
      document.body.appendChild(frame);
    }

    const doc = frame.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <html>
        <head>
          <title> </title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
          <style>
            @page { size: A4; margin: 0; }
            body { 
              font-family: 'Inter', sans-serif; 
              color: #1e293b; 
              margin: 0; 
              padding: 15mm; 
              line-height: 1.5;
              font-size: 11pt;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 10mm;
              margin-bottom: 10mm;
            }
            .logo { max-height: 25mm; max-width: 60mm; object-fit: contain; }
            .company-info { text-align: right; }
            .company-info h1 { margin: 0; font-size: 16pt; font-weight: 900; text-transform: uppercase; color: #0f172a; }
            .company-info p { margin: 2pt 0; font-size: 9pt; color: #64748b; font-weight: 600; }
            
            .report-title {
              text-align: center;
              margin-bottom: 12mm;
            }
            .report-title h2 { 
              margin: 0; 
              font-size: 22pt; 
              font-weight: 900; 
              text-transform: uppercase; 
              letter-spacing: 1px;
              color: #0f172a;
            }
            .report-title p { margin: 5pt 0; font-size: 10pt; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; }

            .recipe-entry {
              margin-bottom: 15mm;
              page-break-inside: avoid;
              border: 1px solid #f1f5f9;
              border-radius: 4mm;
              overflow: hidden;
            }
            .recipe-header {
              background: #f8fafc;
              padding: 4mm 6mm;
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1px solid #e2e8f0;
            }
            .recipe-name { font-size: 13pt; font-weight: 900; text-transform: uppercase; color: #1e293b; }
            .recipe-category { 
              font-size: 8pt; 
              font-weight: 900; 
              text-transform: uppercase; 
              padding: 1mm 3mm; 
              background: #e2e8f0; 
              border-radius: 2mm;
              color: #475569;
            }
            .recipe-content { padding: 5mm 6mm; }
            .section { margin-bottom: 3mm; }
            .section strong { display: block; font-size: 8pt; text-transform: uppercase; color: #64748b; margin-bottom: 1mm; letter-spacing: 0.5px; }
            .ingredients-text { font-size: 10pt; text-align: justify; display: block; }
            .allergens-section { 
              background: #fff1f2; 
              border: 1px solid #fecdd3; 
              padding: 2mm 3mm; 
              border-radius: 2mm;
            }
            .allergens-section strong { color: #be123c; }
            .allergens-list { font-weight: 800; color: #9f1239; font-size: 10pt; text-transform: uppercase; }
            .no-allergens { color: #94a3b8; font-style: italic; font-size: 9pt; }
            .description { font-style: italic; color: #475569; font-size: 9pt; }
            
            .footer {
              position: fixed;
              bottom: 0;
              width: 100%;
              text-align: center;
              font-size: 8pt;
              color: #94a3b8;
              border-top: 1px solid #f1f5f9;
              padding-top: 5mm;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logoUrl}" class="logo" onerror="this.style.display='none'">
            <div class="company-info">
              <h1>${company.name}</h1>
              <p>${company.address}</p>
              <p>PIVA: ${company.piva} | Tel: ${company.phone}</p>
              <p>${company.email}</p>
            </div>
          </div>

          <div class="report-title">
            <h2>Libro degli Ingredienti</h2>
            <p>Conforme al Regolamento UE n. 1169/2011</p>
          </div>

          <div class="recipes-container">
            ${recipesHtml}
          </div>

          <div class="footer">
            Documento generato da HACCP PRO Traceability System - Pagina 1
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      frame.contentWindow?.print();
    }, 1000);
  }
}
