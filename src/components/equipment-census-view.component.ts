import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppStateService } from '../services/app-state.service';
import { ToastService } from '../services/toast.service';

@Component({
    selector: 'app-equipment-census-view',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="animate-fade-in space-y-6 max-w-7xl mx-auto p-4 pb-24">

        <!-- Premium Header -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden mb-2">
            <div class="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none"></div>
            <div class="relative z-10 flex items-center gap-5">
                <div class="h-14 w-14 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-sm text-indigo-600 shrink-0">
                    <i class="fa-solid fa-microchip text-2xl"></i>
                </div>
                <div>
                    <h2 class="text-2xl font-bold text-slate-800 tracking-tight">Censimento Attrezzature</h2>
                    <p class="text-xs font-semibold text-slate-500 mt-1">Registro attrezzature per monitoraggio HACCP — <span class="text-indigo-600">{{ state.companyConfig().name }}</span></p>
                </div>
            </div>
            <!-- Stats -->
            <div class="flex items-center gap-3 relative z-10 flex-wrap">
                <div class="px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-center min-w-[80px]">
                    <div class="text-2xl font-black text-indigo-600">{{ state.groupedEquipment().length }}</div>
                    <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Totale</div>
                </div>
                <div class="px-4 py-2 bg-sky-50 rounded-xl border border-sky-100 text-center min-w-[80px]">
                    <div class="text-2xl font-black text-sky-600">{{ coldCount() }}</div>
                    <div class="text-[9px] font-black text-sky-400 uppercase tracking-widest">Freddo</div>
                </div>
                <div class="px-4 py-2 bg-orange-50 rounded-xl border border-orange-100 text-center min-w-[80px]">
                    <div class="text-2xl font-black text-orange-500">{{ hotCount() }}</div>
                    <div class="text-[9px] font-black text-orange-400 uppercase tracking-widest">Caldo</div>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <!-- ===== ADD PANEL ===== -->
            <div class="lg:col-span-1">
                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
                    <div class="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                            <i class="fa-solid fa-plus text-sm"></i>
                        </div>
                        <div>
                            <h3 class="text-sm font-bold text-slate-800">Aggiungi Attrezzatura</h3>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dal selettore rapido o a mano</p>
                        </div>
                    </div>

                    <div class="p-5 space-y-4">
                        @if (state.isAdmin() && !state.filterClientId()) {
                            <div class="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col items-center text-center gap-2 animate-pulse">
                                <i class="fa-solid fa-circle-exclamation text-amber-500 text-2xl"></i>
                                <span class="text-xs font-bold text-amber-800">Seleziona prima un'AZIENDA o SEDE dal menu superiore per poter censire le attrezzature.</span>
                            </div>
                        }


                        <!-- Selettore rapido -->
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Selettore Rapido</label>
                            <div class="relative">
                                <select #equipSelector
                                        (change)="onAddFromSelect(equipSelector.value); equipSelector.value = ''"
                                        [disabled]="state.isAdmin() && !state.filterClientId()"
                                        class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer hover:border-indigo-200 shadow-sm disabled:cursor-not-allowed">
                                    <option value="" disabled selected>Scegli dal catalogo...</option>
                                    @for (group of masterEquipmentList; track group.area) {
                                        <optgroup [label]="group.area">
                                            @for (item of group.items; track item) {
                                                <option [value]="item">{{ item }}</option>
                                            }
                                        </optgroup>
                                    }
                                </select>
                                <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <i class="fa-solid fa-chevron-down text-xs"></i>
                                </div>
                            </div>
                        </div>

                        <div class="flex items-center gap-2">
                            <div class="flex-1 h-px bg-slate-100"></div>
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">oppure</span>
                            <div class="flex-1 h-px bg-slate-100"></div>
                        </div>

                        <!-- Nome personalizzato -->
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nome Personalizzato</label>
                            <div class="flex gap-2">
                                <div class="relative flex-1">
                                    <i class="fa-solid fa-keyboard absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                    <input type="text"
                                           [(ngModel)]="customName"
                                           placeholder="Es. Abbattitore celle A"
                                           (keydown.enter)="onAddCustom()"
                                           [disabled]="state.isAdmin() && !state.filterClientId()"
                                           class="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white transition-all hover:border-indigo-200 shadow-sm placeholder:font-normal disabled:bg-slate-50 disabled:cursor-not-allowed">
                                </div>
                                <button (click)="onAddCustom()"
                                        [disabled]="!customName.trim() || (state.isAdmin() && !state.filterClientId())"
                                        class="px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95">
                                    <i class="fa-solid fa-plus"></i>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <!-- ===== EQUIPMENT LIST ===== -->
            <div class="lg:col-span-2">
                @if (state.groupedEquipment().length === 0) {
                    <div class="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-sm text-center">
                        <div class="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4 text-slate-300 shadow-sm">
                            <i class="fa-solid fa-list-check text-3xl"></i>
                        </div>
                        <h4 class="text-base font-bold text-slate-400 mb-1">Nessuna Attrezzatura</h4>
                        <p class="text-xs text-slate-400 font-medium">Usa il pannello laterale per aggiungere le prime attrezzature.</p>
                    </div>
                } @else {
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        @for (eq of state.groupedEquipment(); track eq.id) {
                            @let eqType = getType(eq);
                            <div class="group bg-white rounded-xl border p-4 shadow-sm flex items-center justify-between transition-all hover:shadow-md animate-slide-up"
                                 [class.border-sky-200]="eqType === 'Freddo'" [class.hover:border-sky-300]="eqType === 'Freddo'"
                                 [class.border-orange-200]="eqType === 'Caldo'" [class.hover:border-orange-300]="eqType === 'Caldo'"
                                 [class.border-slate-200]="eqType === 'Altro'" [class.hover:border-indigo-200]="eqType === 'Altro'">

                                <div class="flex items-center gap-3">
                                    <!-- Icon -->
                                    <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm transition-all group-hover:scale-105"
                                         [class.bg-sky-50]="eqType === 'Freddo'" [class.border-sky-200]="eqType === 'Freddo'" [class.text-sky-500]="eqType === 'Freddo'"
                                         [class.bg-orange-50]="eqType === 'Caldo'" [class.border-orange-200]="eqType === 'Caldo'" [class.text-orange-500]="eqType === 'Caldo'"
                                         [class.bg-slate-50]="eqType === 'Altro'" [class.border-slate-200]="eqType === 'Altro'" [class.text-slate-400]="eqType === 'Altro'">
                                        <i [class]="'fa-solid text-base ' + getIcon(eq, eqType)"></i>
                                    </div>
                                    <!-- Info -->
                                    <div>
                                        <span class="block font-bold text-slate-800 text-sm leading-tight">{{ eq.name }}</span>
                                        <div class="flex items-center gap-1.5 mt-0.5">
                                            <span class="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border"
                                                  [class.bg-sky-50]="eqType === 'Freddo'" [class.border-sky-200]="eqType === 'Freddo'" [class.text-sky-600]="eqType === 'Freddo'"
                                                  [class.bg-orange-50]="eqType === 'Caldo'" [class.border-orange-200]="eqType === 'Caldo'" [class.text-orange-600]="eqType === 'Caldo'"
                                                  [class.bg-slate-50]="eqType === 'Altro'" [class.border-slate-200]="eqType === 'Altro'" [class.text-slate-500]="eqType === 'Altro'">
                                                <i [class]="'fa-solid mr-1 ' + (eqType === 'Freddo' ? 'fa-snowflake' : eqType === 'Caldo' ? 'fa-fire' : 'fa-circle-check')"></i>
                                                {{ eqType === 'Freddo' ? 'Catena Freddo' : eqType === 'Caldo' ? 'Catena Caldo' : 'Semplice' }}
                                            </span>
                                            <span class="text-[9px] text-slate-400 font-bold">{{ eq.area }}</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Delete -->
                                <button (click)="onRemove(eq.id, eq.name)"
                                        class="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 hover:border-red-300 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 active:scale-90">
                                    <i class="fa-solid fa-trash-can text-xs"></i>
                                </button>
                            </div>
                        }
                    </div>
                }
            </div>
        </div>
    </div>

    <!-- ===== PREMIUM CONFIRMATION MODAL ===== -->
    @if (showDeleteModal()) {
        <div class="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <!-- Backdrop -->
            <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" (click)="cancelDelete()"></div>
            
            <!-- Modal Card -->
            <div class="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-slide-up">
                <div class="p-8 text-center">
                    <div class="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-6 shadow-sm border border-red-100">
                        <i class="fa-solid fa-trash-can text-2xl"></i>
                    </div>
                    
                    <h3 class="text-xl font-black text-slate-800 mb-2">Conferma Eliminazione</h3>
                    <p class="text-sm text-slate-500 font-medium px-4">
                        Sei sicuro di voler rimuovere <span class="text-slate-800 font-bold">"{{ itemToDelete()?.name }}"</span>?
                        <span class="block mt-2 text-[10px] text-red-400 font-bold uppercase tracking-wider italic">Questa azione non può essere annullata</span>
                    </p>
                </div>
                
                <div class="flex border-t border-slate-100 h-16">
                    <button (click)="cancelDelete()" 
                            class="flex-1 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors border-r border-slate-100">
                        Annulla
                    </button>
                    <button (click)="confirmDelete()" 
                            class="flex-1 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors active:scale-95">
                        Elimina Ora
                    </button>
                </div>
            </div>
        </div>
    }
    `,
    styles: [`
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    `]
})
export class EquipmentCensusViewComponent {
    state = inject(AppStateService);
    toast = inject(ToastService);

    customName = '';
    
    // Modal State
    showDeleteModal = signal(false);
    itemToDelete = signal<{id: string, name: string} | null>(null);

    coldCount = computed(() => this.state.groupedEquipment().filter((e: any) => e.type === 'Freddo').length);
    hotCount  = computed(() => this.state.groupedEquipment().filter((e: any) => e.type === 'Caldo').length);

    masterEquipmentList = [
        { area: 'Cucina', items: ['Frigo', 'Congelatore', 'Piano cottura', 'Forno', 'Griglie', 'Friggitrice', 'Banchi lavori', 'Forno a legna', 'Affettatrice', 'Taglia verdure', 'Campana sottovuoto', 'Banco frigo', 'Cappa aspirante', 'Abbattitore', 'Macchina del Freddo (-20°C)'] },
        { area: 'Area Lavaggio', items: ['Lavello', 'Lavastoviglie', 'Mobile pensile', 'Tavolo da lavoro'] },
        { area: 'Deposito', items: ['Cella frigorifero', 'Pozzetto congelatore'] },
        { area: 'Sala', items: ['Vetrina espositiva caldo (≥65°C)', 'Vetrina espositiva freddo (+4°C/+8°C)', 'Banco frigo espositivo'] },
        { area: 'Spogliatoi', items: ['Microonde'] }
    ];


    getType(eq: any): string {
        return (eq as any).type || 'Altro';
    }

    getIcon(eq: any, type: string): string {
        const n = eq.name.toLowerCase();
        if (n.includes('congelatore') || n.includes('abbattitore') || n.includes('pozzetto')) return 'fa-icicles';
        if (n.includes('frigo') || n.includes('cella') || type === 'Freddo') return 'fa-snowflake';
        if (n.includes('forno') || n.includes('cottura') || n.includes('griglie') || n.includes('friggitrice') || type === 'Caldo') return 'fa-fire';
        if (n.includes('lavello') || n.includes('lavastoviglie')) return 'fa-sink';
        if (n.includes('cappa')) return 'fa-fan';
        if (n.includes('affettatrice')) return 'fa-circle-notch';
        if (n.includes('bilancia')) return 'fa-weight-hanging';
        return 'fa-microchip';
    }

    onAddFromSelect(name: string) {
        if (!name) return;
        this.addEquipment(name);
    }

    onAddCustom() {
        const name = this.customName.trim();
        if (!name) return;
        this.addEquipment(name);
        this.customName = '';
    }

    private addEquipment(baseName: string) {
        const nameLower = baseName.toLowerCase();
        let inferredType = 'Altro';
        
        if (nameLower.includes('caldo')) {
            inferredType = 'Caldo';
        } else if (nameLower.includes('frigo') || nameLower.includes('cella') || nameLower.includes('congelatore') || 
            nameLower.includes('abbattitore') || nameLower.includes('pozzetto') || nameLower.includes('freddo')) {
            inferredType = 'Freddo';
        } else if (nameLower.includes('forno') || nameLower.includes('cottura') || nameLower.includes('griglie') || 
                   nameLower.includes('friggitrice') || nameLower.includes('fuochi')) {
            inferredType = 'Caldo';
        }

        const existing = this.state.groupedEquipment();
        let finalName = baseName;
        let count = 1;

        // Pattern logic: check if baseName already exists as-is, then append " 2", " 3", etc.
        const matches = existing.filter(eq => 
            eq.name === baseName || 
            eq.name.startsWith(baseName + ' ')
        );

        if (matches.length > 0) {
            count = matches.length + 1;
            finalName = `${baseName} ${count}`;
        }

        this.state.addEquipment('Generale', finalName, inferredType).then(() => {
            this.toast.success('Aggiunto ✓', `${finalName} salvato.`);
        });
    }

    onRemove(id: string, name: string) {
        this.itemToDelete.set({ id, name });
        this.showDeleteModal.set(true);
    }

    cancelDelete() {
        this.showDeleteModal.set(false);
        this.itemToDelete.set(null);
    }

    confirmDelete() {
        const item = this.itemToDelete();
        if (item) {
            this.state.removeEquipment(item.id);
            this.toast.info('Rimosso', `"${item.name}" eliminato dal censimento.`);
            this.cancelDelete();
        }
    }
}
