
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppStateService, Preparation } from '../services/app-state.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-preparations-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <!-- Header -->
      <div class="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div class="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none"></div>
        <div class="flex items-center gap-6 relative z-10">
          <div class="h-16 w-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
            <i class="fa-solid fa-mortar-pestle text-3xl"></i>
          </div>
          <div>
            <h2 class="text-3xl font-black text-slate-800 tracking-tight">Anagrafica Preparazioni</h2>
            <p class="text-slate-500 font-medium mt-1">Gestione dei prodotti preparati in cucina e relativa scadenza.</p>
          </div>
        </div>
        <button (click)="openCreateForm()" 
                class="relative z-10 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md flex items-center gap-2 group">
          <i class="fa-solid fa-plus group-hover:rotate-90 transition-transform"></i>
          Nuova Preparazione
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Sidebar Filters -->
        <div class="space-y-6">
          <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Filtra per Categoria</h3>
            <div class="flex flex-col gap-2">
              <button (click)="selectedCategory.set('ALL')"
                      [class]="'px-4 py-2 rounded-lg text-sm font-bold text-left transition-all ' + (selectedCategory() === 'ALL' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm' : 'text-slate-500 hover:bg-slate-50')">
                Tutte le categorie
              </button>
              
              @for (cat of allAvailableCategories(); track cat) {
                <div class="group/cat relative flex items-center">
                    <button (click)="selectedCategory.set(cat)"
                            [class]="'flex-1 px-4 py-2 rounded-lg text-sm font-bold text-left transition-all ' + (selectedCategory() === cat ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm pr-16' : 'text-slate-500 hover:bg-slate-50 pr-16')">
                        {{ cat }}
                    </button>
                    
                    @if (!isBaseCategory(cat)) {
                      <div class="absolute right-2 opacity-0 group-hover/cat:opacity-100 flex items-center gap-1 transition-all">
                        <button (click)="askRenameCategory(cat)" 
                                class="w-7 h-7 flex items-center justify-center rounded-md bg-white text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-slate-100 shadow-sm"
                                title="Rinomina Categoria">
                          <i class="fa-solid fa-pen text-[10px]"></i>
                        </button>
                        <button (click)="askDeleteCategory(cat)" 
                                class="w-7 h-7 flex items-center justify-center rounded-md bg-white text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all border border-slate-100 shadow-sm"
                                title="Elimina Categoria">
                          <i class="fa-solid fa-trash-can text-[10px]"></i>
                        </button>
                      </div>
                    }
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Main List -->
        <div class="lg:col-span-2 space-y-4">
          <div class="flex items-center justify-between px-2">
            <h3 class="text-sm font-black text-slate-500 uppercase tracking-widest">
              Elenco Preparazioni ({{ filteredPreps().length }})
            </h3>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            @for (prep of filteredPreps(); track prep.id) {
              <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col justify-between">
                <div class="absolute right-0 top-0 p-3 flex gap-2">
                  <button (click)="editPrep(prep)" class="w-8 h-8 rounded-lg bg-white text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors border border-slate-200 shadow-sm">
                    <i class="fa-solid fa-pen-to-square"></i>
                  </button>
                  <button (click)="askConfirmDelete(prep)" class="w-8 h-8 rounded-lg bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-slate-200 shadow-sm">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </div>

                <div class="flex items-start gap-4 mb-6">
                  <div class="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shrink-0">
                    <i class="fa-solid fa-bowl-food text-2xl"></i>
                  </div>
                  <div class="pr-12">
                    <h4 class="font-black text-slate-800 text-xl leading-tight mb-1">{{ prep.name }}</h4>
                    <span class="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-widest">{{ prep.category }}</span>
                  </div>
                </div>

                <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                      <i class="fa-solid fa-calendar-day text-xs"></i>
                    </div>
                    <div>
                      <div class="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none">Scadenza Impostata</div>
                      <div class="text-sm font-black text-slate-800 uppercase tracking-tight">{{ prep.expiryDays }} Giorni</div>
                    </div>
                  </div>
                  <div class="px-3 py-1 bg-teal-50 text-teal-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-teal-100">
                    Attivo
                  </div>
                </div>
              </div>
            } @empty {
              <div class="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                  <i class="fa-solid fa-folder-open text-4xl"></i>
                </div>
                <h4 class="text-slate-800 font-black text-xl">Nessuna preparazione trovata</h4>
                <p class="text-slate-500 font-medium">Inizia creando il tuo primo prodotto preparato.</p>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- NEW/EDIT MODAL -->
      @if (isFormOpen()) {
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" (click)="closeForm()"></div>
          <div class="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-slide-up border border-slate-200 flex flex-col">
            <div class="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div class="flex items-center gap-3">
                 <div class="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                    <i class="fa-solid fa-mortar-pestle"></i>
                 </div>
                 <h3 class="text-lg font-black text-slate-800 uppercase tracking-widest">
                    {{ editingId() ? 'Modifica Preparazione' : 'Nuova Preparazione' }}
                 </h3>
              </div>
              <button (click)="closeForm()" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors">
                <i class="fa-solid fa-xmark text-slate-500"></i>
              </button>
            </div>

            <div class="p-8 space-y-6">
              <div class="space-y-4">
                <div>
                  <label class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Nome Prodotto / Preparato</label>
                  <input [(ngModel)]="formPrep.name" 
                         type="text" 
                         placeholder="Es. Sugo alla Genovese"
                         class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none">
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Categoria</label>
                    
                    <div class="flex gap-2">
                        @if (!isAddingNewCategory()) {
                          <div class="relative flex-1">
                            <select [(ngModel)]="formPrep.category"
                                    class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none appearance-none pr-10">
                              <option value="">Seleziona...</option>
                              @for (cat of categories(); track cat) {
                                <option [value]="cat">{{ cat }}</option>
                              }
                            </select>
                            <i class="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
                          </div>
                          <button (click)="isAddingNewCategory.set(true)" 
                                  title="Aggiungi Nuova Categoria"
                                  class="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                            <i class="fa-solid fa-plus"></i>
                          </button>
                        } @else {
                          <div class="relative flex-1 animate-slide-up">
                            <input [(ngModel)]="newCategoryName" type="text" placeholder="Nuova Categoria..."
                                   class="w-full bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-indigo-700 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10">
                            <button (click)="isAddingNewCategory.set(false)" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500">
                              <i class="fa-solid fa-circle-xmark text-lg"></i>
                            </button>
                          </div>
                        }
                    </div>
                  </div>
                  <div>
                    <label class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Gg Scadenza</label>
                    <div class="relative">
                      <input [(ngModel)]="formPrep.expiryDays" 
                             type="number" 
                             min="1"
                             class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none">
                      <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">Giorni</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex gap-4 pt-4">
                <button (click)="closeForm()" 
                        class="flex-1 py-4 bg-slate-50 border border-slate-200 text-slate-600 font-black uppercase tracking-widest rounded-xl text-xs hover:bg-slate-100 transition-all active:scale-95">
                  Annulla
                </button>
                <button (click)="save()" 
                        [disabled]="!formPrep.name || (!formPrep.category && !newCategoryName) || formPrep.expiryDays! <= 0"
                        class="flex-[2] py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-xl text-xs shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none">
                  Salva Preparazione
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- RENAME CATEGORY MODAL -->
      @if (showRenameCategoryModal()) {
        <div class="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/70 backdrop-blur-md" (click)="showRenameCategoryModal.set(false)"></div>
          <div class="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden animate-slide-up border border-slate-200 p-10 text-center">
            <div class="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-8 border border-indigo-100 shadow-inner">
              <i class="fa-solid fa-pen-nib text-3xl"></i>
            </div>
            <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight mb-6">Rinomina Categoria</h3>
            
            <div class="text-left mb-8">
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Nuovo Nome per "{{ categoryToRename() }}"</label>
              <input [(ngModel)]="newCategoryLabel" type="text" 
                     class="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-black text-slate-700 shadow-inner outline-none">
            </div>

            <div class="flex flex-col gap-3">
              <button (click)="doRenameCategory()" 
                      [disabled]="!newCategoryLabel.trim() || newCategoryLabel === categoryToRename()"
                      class="w-full py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50">
                Salva Modifiche
              </button>
              <button (click)="showRenameCategoryModal.set(false)" 
                      class="w-full py-4 bg-white border border-slate-200 text-slate-400 font-black uppercase tracking-widest rounded-2xl text-xs hover:bg-slate-50 transition-all">
                Annulla
              </button>
            </div>
          </div>
        </div>
      }

      <!-- DELETE CATEGORY CONFIRMATION MODAL -->
      @if (showDeleteCategoryModal()) {
        <div class="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/70 backdrop-blur-md" (click)="showDeleteCategoryModal.set(false)"></div>
          <div class="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden animate-slide-up border border-slate-200 text-center p-10">
            <div class="w-24 h-24 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl border border-rose-100 shadow-inner">
              <i class="fa-solid fa-folder-minus"></i>
            </div>
            <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight mb-3">Elimina Categoria?</h3>
            <p class="text-slate-500 font-medium mb-10 leading-relaxed">
                Stai per eliminare la categoria <span class="text-slate-900 font-black">"{{ categoryToDelete() }}"</span>.<br>
                <span class="text-rose-600 font-bold">Attenzione:</span> Verranno eliminate anche tutte le preparazioni associate a questa categoria.
            </p>
            <div class="flex flex-col gap-3">
              <button (click)="doDeleteCategory()" 
                      class="w-full py-4 bg-rose-600 text-white font-black uppercase tracking-widest rounded-2xl text-xs shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95">
                Sì, Elimina Tutto
              </button>
              <button (click)="showDeleteCategoryModal.set(false)" 
                      class="w-full py-4 bg-white border border-slate-200 text-slate-400 font-black uppercase tracking-widest rounded-2xl text-xs hover:bg-slate-50 transition-all">
                Annulla
              </button>
            </div>
          </div>
        </div>
      }

      <!-- DELETE PREP CONFIRMATION MODAL -->
      @if (showDeleteModal()) {
        <div class="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/70 backdrop-blur-md" (click)="showDeleteModal.set(false)"></div>
          <div class="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden animate-slide-up border border-slate-200 text-center p-10">
            <div class="w-24 h-24 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl border border-rose-100 shadow-inner">
              <i class="fa-solid fa-trash-can"></i>
            </div>
            <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight mb-3">Conferma?</h3>
            <p class="text-slate-500 font-medium mb-10 leading-relaxed">
              Vuoi davvero eliminare <br><span class="text-slate-900 font-black">"{{ prepToDelete()?.name }}"</span>?
            </p>
            <div class="flex flex-col gap-3">
              <button (click)="doDelete()" 
                      class="w-full py-4 bg-rose-600 text-white font-black uppercase tracking-widest rounded-2xl text-xs shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95">
                Sì, Elimina per sempre
              </button>
              <button (click)="showDeleteModal.set(false)" 
                      class="w-full py-4 bg-white border border-slate-200 text-slate-400 font-black uppercase tracking-widest rounded-2xl text-xs hover:bg-slate-50 transition-all">
                Annulla
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.5s ease-out; }
    .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `]
})
export class PreparationsViewComponent {
  state = inject(AppStateService);
  toast = inject(ToastService);

  isFormOpen = signal(false);
  editingId = signal<string | null>(null);
  selectedCategory = signal('ALL');
  
  isAddingNewCategory = signal(false);
  newCategoryName = '';

  showDeleteModal = signal(false);
  prepToDelete = signal<Preparation | null>(null);

  showDeleteCategoryModal = signal(false);
  categoryToDelete = signal<string | null>(null);

  showRenameCategoryModal = signal(false);
  categoryToRename = signal<string | null>(null);
  newCategoryLabel = '';

  baseCategories = [
    'Primi piatti',
    'Secondi piatti',
    'Sughi',
    'Salse e Condimenti',
    'Verdure e Contorni',
    'Preparazioni Base',
    'Dolci e Pasticceria'
  ];

  isBaseCategory(cat: string): boolean {
    return this.baseCategories.includes(cat);
  }

  // Dynamically compute all categories from existing preparations + base ones
  allAvailableCategories = computed(() => {
    const fromPreps = this.state.preparations().map(p => p.category);
    const unique = [...new Set([...this.baseCategories, ...fromPreps])];
    return unique.sort((a, b) => a.localeCompare(b));
  });

  categories = computed(() => this.allAvailableCategories());

  formPrep: Partial<Preparation> = {
    name: '',
    category: '',
    expiryDays: 2
  };

  filteredPreps = computed(() => {
    const all = this.state.preparations();
    const cat = this.selectedCategory();
    if (cat === 'ALL') return all;
    return all.filter(p => p.category === cat);
  });

  openCreateForm() {
    this.editingId.set(null);
    this.formPrep = { name: '', category: '', expiryDays: 2 };
    this.isAddingNewCategory.set(false);
    this.newCategoryName = '';
    this.isFormOpen.set(true);
  }

  closeForm() {
    this.isFormOpen.set(false);
    this.editingId.set(null);
    this.isAddingNewCategory.set(false);
  }

  editPrep(prep: Preparation) {
    this.editingId.set(prep.id);
    this.formPrep = { ...prep };
    this.isAddingNewCategory.set(false);
    this.isFormOpen.set(true);
  }

  async save() {
    if (this.isAddingNewCategory() && this.newCategoryName.trim()) {
      this.formPrep.category = this.newCategoryName.trim();
    }

    try {
        await this.state.savePreparation(this.formPrep);
        this.closeForm();
    } catch (err) {
        console.error('Save failed:', err);
    }
  }

  askConfirmDelete(prep: Preparation) {
    this.prepToDelete.set(prep);
    this.showDeleteModal.set(true);
  }

  async doDelete() {
    const prep = this.prepToDelete();
    if (prep) {
      await this.state.deletePreparation(prep.id);
    }
    this.showDeleteModal.set(false);
    this.prepToDelete.set(null);
  }

  askDeleteCategory(cat: string) {
    this.categoryToDelete.set(cat);
    this.showDeleteCategoryModal.set(true);
  }

  async doDeleteCategory() {
    const cat = this.categoryToDelete();
    if (cat) {
        const toDelete = this.state.preparations().filter(p => p.category === cat);
        for (const p of toDelete) {
            await this.state.deletePreparation(p.id);
        }
        if (this.selectedCategory() === cat) {
            this.selectedCategory.set('ALL');
        }
        this.toast.success('Categoria Eliminata', `Rimosse ${toDelete.length} preparazioni.`);
    }
    this.showDeleteCategoryModal.set(false);
    this.categoryToDelete.set(null);
  }

  askRenameCategory(cat: string) {
    this.categoryToRename.set(cat);
    this.newCategoryLabel = cat;
    this.showRenameCategoryModal.set(true);
  }

  async doRenameCategory() {
    const oldName = this.categoryToRename();
    const newName = this.newCategoryLabel.trim();
    
    if (oldName && newName && oldName !== newName) {
        const toUpdate = this.state.preparations().filter(p => p.category === oldName);
        for (const p of toUpdate) {
            await this.state.savePreparation({ ...p, category: newName });
        }
        if (this.selectedCategory() === oldName) {
            this.selectedCategory.set(newName);
        }
        this.toast.success('Categoria Rinominata', `Aggiornate ${toUpdate.length} preparazioni.`);
    }
    this.showRenameCategoryModal.set(false);
    this.categoryToRename.set(null);
  }
}
