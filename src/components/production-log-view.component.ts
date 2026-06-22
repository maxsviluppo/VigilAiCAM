import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService, ProductionRecord, ProductionIngredient } from '../services/app-state.service';
import { ToastService } from '../services/toast.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-production-log-view',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <!-- UI CONTENT (Hidden on print) -->
    <div class="print:hidden pb-20 relative px-2 space-y-6 overflow-x-hidden">
        
        <!-- Sleek Professional Dashboard Header -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div class="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none"></div>
            
            <div class="flex items-center gap-5 relative z-10 w-full md:w-auto">
                <div class="h-14 w-14 shrink-0 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-md">
                    <i class="fa-solid fa-barcode text-2xl"></i>
                </div>
                <div>
                    <h2 class="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">Rintracciabilità Prodotti</h2>
                    <p class="text-[10px] sm:text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">Gestione lotti di produzione e tracciabilità.</p>
                </div>
            </div>

            <!-- Search Filters Header -->
            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto relative z-10">
                <div class="relative w-full sm:w-64">
                    <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                    <input type="text" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" placeholder="Cerca lotto o nome..." 
                           class="w-full pl-8 pr-3 py-2 text-base rounded-xl border border-slate-200 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50 bg-white shadow-sm transition-all">
                </div>
                 
                <div class="flex items-center gap-2 w-full sm:w-auto">
                    <input type="date" [ngModel]="dateFrom()" (ngModelChange)="dateFrom.set($event)" 
                           class="w-full sm:w-auto px-2 py-2 text-base rounded-xl border border-slate-200 focus:outline-none focus:border-teal-400 shadow-sm bg-white text-slate-600">
                    <span class="text-slate-400 text-xs font-bold">-</span>
                    <input type="date" [ngModel]="dateTo()" (ngModelChange)="dateTo.set($event)" 
                           class="w-full sm:w-auto px-2 py-2 text-base rounded-xl border border-slate-200 focus:outline-none focus:border-teal-400 shadow-sm bg-white text-slate-600">
                </div>
            </div>
        </div>

        @if (isEditing()) {
            <!-- EDITING / CREATION VIEW -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Main Product Card -->
                <div class="lg:col-span-1 space-y-4">
                    <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm sticky top-6">
                        <div class="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                            <h3 class="text-lg font-bold text-slate-800">Scheda Prodotto</h3>
                            <div class="px-2 py-0.5 bg-teal-50 border border-teal-100 text-teal-600 rounded text-[10px] font-black uppercase tracking-widest">Master</div>
                        </div>

                        <div class="space-y-5">
                            <div class="space-y-1.5">
                                <label class="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Nome Alimento Principale</label>
                                <div class="relative">
                                    <input type="text" [(ngModel)]="currentRecord.mainProductName" 
                                           (ngModelChange)="onMainProductNameChange($event)"
                                           placeholder="es. Sugo alla Genovese"
                                           class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base font-bold text-slate-800 focus:border-teal-400 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-teal-100 first-letter:uppercase">
                                    
                                    @if (preparationMatches().length > 0 || mainProductMatches().length > 0) {
                                        <div class="mt-1 bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden max-h-64 overflow-y-auto animate-slide-up sticky z-50">
                                            @if (preparationMatches().length > 0) {
                                                <div class="px-3 py-1.5 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between sticky top-0 z-10">
                                                    <span class="text-[9px] font-black uppercase text-indigo-600 tracking-widest">Anagrafica Preparazioni</span>
                                                </div>
                                                @for (prep of preparationMatches(); track prep.id) {
                                                    <button type="button" (click)="selectPreparation(prep)"
                                                            class="w-full px-4 py-2.5 text-left hover:bg-indigo-50 text-sm font-bold text-slate-800 border-b border-slate-50 last:border-0 group">
                                                        <div class="flex justify-between items-center">
                                                            <span><i class="fa-solid fa-mortar-pestle text-indigo-400 mr-2 text-[10px]"></i> {{ prep.name }}</span>
                                                            <span class="text-[9px] font-black text-indigo-500 bg-white px-1.5 py-0.5 rounded border border-indigo-100">+{{ prep.expiryDays }}gg</span>
                                                        </div>
                                                    </button>
                                                }
                                            }
                                            @if (mainProductMatches().length > 0) {
                                                <div class="px-3 py-1.5 bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                                                    <span class="text-[9px] font-black uppercase text-slate-500 tracking-widest">Storico Produzioni</span>
                                                </div>
                                                @for (match of mainProductMatches(); track match) {
                                                    <button type="button" (click)="selectMainProduct(match)"
                                                            class="w-full px-4 py-2.5 text-left hover:bg-slate-50 text-sm font-bold text-slate-800 border-b border-slate-50 last:border-0">
                                                        <i class="fa-solid fa-history text-slate-300 mr-2 text-[10px]"></i> {{ match }}
                                                    </button>
                                                }
                                            }
                                        </div>
                                    }
                                </div>
                            </div>

                            <div class="space-y-4 py-2">
                                <!-- CONFEZIONAMENTO BLOCK -->
                                <div class="bg-slate-50/50 border border-slate-200 rounded-[32px] p-6 flex flex-col items-center text-center space-y-3 shadow-sm">
                                    <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-teal-500 shadow-sm border border-slate-100">
                                        <i class="fa-solid fa-calendar-check text-2xl"></i>
                                    </div>
                                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Data Confezionamento</label>
                                    <input type="date" [(ngModel)]="currentRecord.packagingDate"
                                           class="w-full max-w-[280px] bg-white border-2 border-slate-200 rounded-2xl px-4 py-3 text-base font-bold text-slate-800 text-center focus:border-teal-500 outline-none transition-all shadow-sm">
                                </div>

                                <!-- SCADENZA BLOCK -->
                                <div class="bg-rose-50/30 border border-rose-100 rounded-[32px] p-6 flex flex-col items-center text-center space-y-3 shadow-sm">
                                    <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-rose-400 shadow-sm border border-rose-50">
                                        <i class="fa-solid fa-calendar-xmark text-2xl"></i>
                                    </div>
                                    <label class="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em]">Data di Scadenza</label>
                                    <input type="date" [(ngModel)]="currentRecord.expiryDate"
                                           class="w-full max-w-[280px] bg-white border-2 border-rose-200 rounded-2xl px-4 py-3 text-base font-bold text-slate-800 text-center focus:border-rose-500 outline-none transition-all shadow-sm">
                                </div>
                            </div>

                            <div class="space-y-1.5">
                                <label class="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Numero Lotto (Automatico)</label>
                                <p class="text-[10px] text-slate-400 pl-1 leading-tight italic">Il numero del lotto di ogni preparato corrisponde alla data di produzione.</p>
                                <div class="relative">
                                    <input type="text" [(ngModel)]="currentRecord.lotto"
                                           class="w-[98%] mx-auto block md:w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-10 text-base font-mono font-bold text-teal-700 text-center outline-none focus:border-teal-400 focus:bg-white"
                                           placeholder="Lotto Generato...">
                                    <i class="fa-solid fa-barcode absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                </div>
                            </div>

                            <!-- ALLERGENS REAL-TIME FEEDBACK -->
                            <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                                <div class="flex items-center gap-2 mb-2">
                                    <i class="fa-solid fa-triangle-exclamation text-indigo-500 text-xs"></i>
                                    <span class="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Allergeni Rilevati</span>
                                </div>
                                <div class="flex flex-wrap gap-1">
                                    @let currentAllergens = getUIAllergens();
                                    @if (currentAllergens.length > 0) {
                                        @for (alg of currentAllergens; track alg) {
                                            <span class="px-2 py-0.5 bg-white border border-indigo-200 text-indigo-700 rounded text-[9px] font-bold uppercase">{{ alg }}</span>
                                        }
                                    } @else {
                                        <span class="text-[9px] font-bold text-indigo-300 italic">Nessun allergene rilevato negli ingredienti elencati.</span>
                                    }
                                </div>
                            </div>

                            <div class="pt-5 border-t border-slate-100 flex gap-3">
                                <button (click)="cancelEdit()" class="flex-1 py-3 bg-slate-50 text-slate-500 border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all">Annulla</button>
                                <button (click)="saveRecord()" [disabled]="!currentRecord.mainProductName"
                                        class="flex-[2] py-3 bg-teal-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-teal-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                    <i class="fa-solid fa-cloud-arrow-up"></i> Salva Registro
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Ingredients Section -->
                <div class="lg:col-span-2 space-y-6">
                    <div class="bg-slate-100 rounded-2xl p-6 border border-slate-200 shadow-sm relative">
                        <h4 class="text-sm font-black uppercase tracking-widest mb-5 text-slate-700 flex items-center gap-2">
                            <i class="fa-solid fa-plus-circle text-teal-600"></i> Aggiungi Ingrediente
                        </h4>
                        
                        <div class="grid grid-cols-1 sm:grid-cols-4 gap-6">
                            <div class="sm:col-span-1">
                                <div class="aspect-square rounded-xl bg-white border border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors relative shadow-sm" (click)="photoInput.click()">
                                    @if (tempPhoto) {
                                        <img [src]="tempPhoto" class="w-full h-full object-cover rounded-xl">
                                    } @else {
                                        <i class="fa-solid fa-camera text-2xl text-slate-300 mb-2"></i>
                                        <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Carica Foto</span>
                                    }
                                </div>
                                <input #photoInput type="file" accept="image/*" class="hidden" (change)="handleFile($event)">
                            </div>

                            <div class="sm:col-span-3 space-y-4">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div class="md:col-span-2">
                                        <label class="text-[11px] font-black text-slate-500 uppercase mb-1">Nome Ingrediente *</label>
                                        <div class="relative">
                                            <input type="text" [(ngModel)]="newIngredient.name"
                                                (ngModelChange)="onIngredientNameChange($event)"
                                                placeholder="Cerca in dispensa o database..."
                                                class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-base font-bold text-slate-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all shadow-sm first-letter:uppercase">
                                            
                                            @if (pantryMatches().length > 0 || baseMatches().length > 0) {
                                                <div class="mt-2 bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden max-h-64 overflow-y-auto animate-slide-up">
                                                    @if (pantryMatches().length > 0) {
                                                        <div class="px-3 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between sticky top-0 z-10">
                                                            <span class="text-[9px] font-black uppercase text-indigo-600 tracking-widest">Risultati in Dispensa</span>
                                                        </div>
                                                        @for (match of pantryMatches(); track match.id) {
                                                            <button type="button" (click)="selectFromPantry(match)"
                                                                    class="w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0 group">
                                                                <div class="flex justify-between items-center mb-0.5">
                                                                    <span class="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                                                                        {{ match.ingredientName }}
                                                                        @if (findAbbattimentoRecord(match)) {
                                                                            <i class="fa-solid fa-icicles text-indigo-500" title="Prodotto Abbattuto"></i>
                                                                        }
                                                                    </span>
                                                                    <span class="text-[9px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">Lotto: {{ match.lotto }}</span>
                                                                </div>
                                                                <div class="text-[9px] text-slate-400 font-bold flex items-center gap-2">
                                                                    <i class="fa-solid fa-truck text-slate-300"></i> {{ match.supplierName }}
                                                                </div>
                                                            </button>
                                                        }
                                                    }
                                                    @if (baseMatches().length > 0) {
                                                        <div class="px-3 py-2 bg-slate-50 border-y border-slate-100 sticky top-0 z-10">
                                                            <span class="text-[9px] font-black uppercase text-slate-500 tracking-widest">Database Generale</span>
                                                        </div>
                                                        @for (base of baseMatches(); track base) {
                                                            <button type="button" (click)="selectFromBase(base)" class="w-full px-4 py-3 text-left hover:bg-slate-50 text-sm font-bold text-slate-700 border-b border-slate-50 last:border-0">
                                                                <i class="fa-solid fa-tag text-slate-300 mr-2 text-[10px]"></i> {{ base }}
                                                            </button>
                                                        }
                                                    }
                                                </div>
                                            }
                                        </div>
                                    </div>

                                    <div class="md:col-span-2">
                                        <label class="text-[11px] font-black text-slate-500 uppercase mb-1">Lotto e Scadenza</label>
                                        <div class="flex flex-col md:flex-row items-center gap-4 py-2">
                                            <div class="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col items-center text-center space-y-3 w-full md:w-1/2">
                                                <div class="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100">
                                                    <i class="fa-solid fa-barcode text-xl"></i>
                                                </div>
                                                <input type="text" [(ngModel)]="newIngredient.lotto" placeholder="Lotto"
                                                       class="w-full max-w-[240px] bg-white border border-slate-200 rounded-xl py-3 text-base font-mono font-bold text-slate-600 text-center focus:border-teal-400 transition-all shadow-sm">
                                            </div>
                                            <div class="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col items-center text-center space-y-3 w-full md:w-1/2">
                                                <div class="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-400 border border-rose-50">
                                                    <i class="fa-solid fa-calendar-day text-xl"></i>
                                                </div>
                                                <input type="date" [(ngModel)]="newIngredient.expiryDate"
                                                       class="w-full max-w-[240px] bg-white border border-rose-200 rounded-xl py-3 text-base font-bold text-slate-800 text-center outline-none focus:border-rose-400 transition-all shadow-sm">
                                            </div>
                                        </div>
                                    </div>

                                    <div class="md:col-span-2">
                                        <label class="text-[11px] font-black text-slate-500 uppercase mb-1">Fornitore / Origine</label>
                                        <input type="text" [(ngModel)]="newIngredient.supplierName" placeholder="es. Global Food Srl o Allevamento Italia"
                                               class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-base font-bold text-slate-800 outline-none focus:border-teal-400 transition-all shadow-sm">
                                    </div>

                                    <div class="md:col-span-2">
                                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Associa Allergeni (Opzionale)</label>
                                        <div class="flex flex-wrap gap-2">
                                            @for (alg of state.ALLERGEN_LIST; track alg.id) {
                                                <button (click)="toggleNewIngredientAllergen(alg.id)"
                                                        [class]="'px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all duration-300 ' + 
                                                                 (newIngredient.allergens?.includes(alg.id) ? alg.active : 'bg-white border-slate-200 text-slate-300 hover:border-slate-300 hover:text-slate-400 opacity-60')">
                                                    <i [class]="'fa-solid ' + alg.icon"></i>
                                                    {{ alg.label }}
                                                </button>
                                            }
                                        </div>
                                    </div>

                                    <div class="md:col-span-2 pt-2">
                                        <button (click)="addIngredient()" [disabled]="!newIngredient.name"
                                                class="w-full py-4 bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-700 transition-all border border-slate-700 disabled:opacity-50 shadow-lg">
                                            <i class="fa-solid fa-plus text-teal-400 mr-2"></i> Aggiungi Ingrediente alla Lista
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Ingredients Table -->
                    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
                        <div class="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h4 class="text-xs font-black text-slate-700 uppercase tracking-widest">Elenco Ingredienti Associati</h4>
                            <span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-black">
                                {{ ingredientsList().length }} INGR.
                            </span>
                        </div>

                        <div class="overflow-y-auto flex-1 h-full h-min-0">
                            <table class="w-full text-left">
                                <thead class="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                                    <tr>
                                        <th class="px-4 py-3 text-[11px] font-black text-slate-400 uppercase">Foto</th>
                                        <th class="px-4 py-3 text-[11px] font-black text-slate-400 uppercase">Prodotto</th>
                                        <th class="px-4 py-3 text-[11px] font-black text-slate-400 uppercase">Fornitore</th>
                                        <th class="px-4 py-3 text-[11px] font-black text-slate-400 uppercase">Lotto</th>
                                        <th class="px-4 py-3 text-[11px] font-black text-slate-400 uppercase text-right">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100">
                                    @for (ing of ingredientsList(); track ing.id) {
                                        <tr class="hover:bg-slate-50">
                                            <td class="px-4 py-3">
                                                <div class="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden cursor-zoom-in group/img relative"
                                                     (click)="ing.photo ? zoomedPhoto.set(ing.photo) : null">
                                                    @if (ing.photo) { 
                                                        <img [src]="ing.photo" class="w-full h-full object-cover transition-transform group-hover/img:scale-110">
                                                        <div class="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all">
                                                            <i class="fa-solid fa-magnifying-glass-plus text-white text-xs"></i>
                                                        </div>
                                                    }
                                                </div>
                                            </td>
                                            <td class="px-4 py-3 font-bold text-slate-800">
                                                @let abbIng = findAbbattimentoRecord(ing);
                                                <span class="flex items-center gap-1.5">
                                                    {{ ing.name }}
                                                    @if (abbIng) {
                                                        <i class="fa-solid fa-icicles text-indigo-400 text-[10px]" title="Abbattuto il {{ abbIng.recordedDate | date:'dd/MM/yy' }}"></i>
                                                    }
                                                </span>
                                                <div class="flex flex-col gap-0.5 mt-0.5">
                                                    @if (ing.supplierName) {
                                                        <p class="text-[9px] text-blue-500 font-black uppercase tracking-tight">{{ ing.supplierName }}</p>
                                                    }
                                                    @if (abbIng) {
                                                        <p class="text-[9px] font-black uppercase flex items-center gap-0.5 text-indigo-500">
                                                            <i class="fa-solid fa-icicles text-[8px]"></i>
                                                            Scad. {{ abbIng.postExpiryDate | date:'dd/MM/yy' }}
                                                        </p>
                                                    } @else if (ing.expiryDate) {
                                                        <p class="text-[9px] text-slate-400 font-bold uppercase">Scad. {{ ing.expiryDate | date:'dd/MM/yy' }}</p>
                                                    }
                                                </div>
                                            </td>
                                            <td class="px-4 py-3">
                                                <span class="text-[10px] font-black text-slate-500 uppercase">{{ ing.supplierName || '—' }}</span>
                                            </td>
                                            <td class="px-4 py-3 font-mono text-xs text-slate-500 font-bold">{{ ing.lotto || '—' }}</td>
                                            <td class="px-4 py-3 text-right whitespace-nowrap">
                                                @let ab = findAbbattimentoRecord(ing);
                                                @if (ab) {
                                                    <button type="button" (click)="openAbbattimentoPrintModal(ab)" class="text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg p-2 mr-2 transition-all shadow-sm" title="Stampa Etichetta Abbattimento ({{ ab.recordedDate | date:'dd/MM' }})">
                                                        <i class="fa-solid fa-icicles"></i>
                                                    </button>
                                                }
                                                <button type="button" (click)="removeIngredient(ing.id)" class="text-rose-500 hover:text-rose-700 p-2">
                                                    <i class="fa-solid fa-trash-can"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

        } @else {
            <!-- HISTORY / LIST VIEW -->
            <div class="space-y-6 animate-fade-in">
                <div class="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div class="text-sm font-bold text-slate-500"><i class="fa-solid fa-database text-teal-600 mr-2"></i> {{ filteredRecords().length }} Registrazioni in Archivio</div>
                    <button (click)="startNew()" class="px-5 py-2.5 bg-teal-600 text-white rounded-xl font-bold text-xs uppercase hover:bg-teal-700 transition-all shadow-sm flex items-center gap-2">
                        <i class="fa-solid fa-plus"></i> Nuovo Registro
                    </button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    @for (rec of filteredRecords(); track rec.id) {
                        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col h-full group">
                            <div class="flex justify-between items-start mb-4">
                                <span class="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-mono font-bold border border-slate-200">{{ rec.lotto }}</span>
                                <div class="flex flex-col items-end gap-1">
                                    <span class="text-[10px] text-slate-400 font-bold uppercase">{{ rec.recordedDate | date:'dd/MM HH:mm' }}</span>
                                    <div class="w-16 h-16 bg-white border border-slate-100 p-1 rounded-xl shadow-md overflow-hidden flex items-center justify-center">
                                        <img [src]="'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + getQRCodeUrl(rec)" 
                                             class="w-full h-full opacity-70 group-hover:opacity-100 transition-opacity"
                                             alt="QR Code">
                                    </div>
                                </div>
                            </div>
                            <h3 class="text-lg font-bold text-slate-800 mb-3 group-hover:text-teal-600 leading-tight line-clamp-2">{{ rec.mainProductName }}</h3>
                            <div class="text-xs text-slate-500 font-bold mb-4 flex flex-col gap-1">
                                <div><i class="fa-solid fa-box-archive mr-2"></i> {{ rec.packagingDate | date:'dd/MM/yy' }}</div>
                                <div class="text-rose-600"><i class="fa-solid fa-calendar-xmark mr-2"></i> {{ rec.expiryDate | date:'dd/MM/yy' }}</div>
                            </div>

                            <!-- ALLERGENS LIST IN CARD -->
                            @let cardAllergens = getRecordAllergens(rec);
                            @if (cardAllergens.length > 0) {
                                <div class="mb-4 pt-3 border-t border-slate-50">
                                    <div class="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">Allergeni:</div>
                                    <div class="flex flex-wrap gap-1">
                                        @for (alg of cardAllergens; track alg) {
                                            <span class="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-bold uppercase border border-indigo-100">{{ alg }}</span>
                                        }
                                    </div>
                                </div>
                            }
                            <div class="mt-auto flex gap-2">
                                <button (click)="openDetail(rec)" class="flex-1 py-2 bg-slate-50 text-slate-600 rounded-lg font-bold text-[10px] uppercase hover:bg-slate-100">Apri</button>
                                @let abbRecForCard = findAbbattimentoRecordByProductRecordIngredients(rec);
                                @if (abbRecForCard) {
                                    <button (click)="openAbbattimentoPrintModal(abbRecForCard)" class="w-10 py-2 bg-indigo-50 text-indigo-500 rounded-lg hover:bg-indigo-500 hover:text-white transition-all" title="Stampa Etichetta Abbattimento">
                                        <i class="fa-solid fa-icicles"></i>
                                    </button>
                                }
                                <button (click)="openLabelPreview(rec)" class="w-10 py-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-600 hover:text-white transition-all" title="Stampa Etichetta Prodotto">
                                    <i class="fa-solid fa-print"></i>
                                </button>
                                <button (click)="deleteRecord(rec.id)" class="w-10 py-2 text-rose-400 hover:text-rose-600"><i class="fa-solid fa-trash-can"></i></button>
                            </div>
                        </div>
                    }
                </div>
            </div>
        }

        <!-- LABEL PREVIEW MODAL -->
        @if (isLabelPreviewOpen() && selectedRecordForLabel()) {
            <div class="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" (click)="isLabelPreviewOpen.set(false)"></div>
                
                <div class="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
                    <div class="px-6 py-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <h3 class="text-xs font-black text-slate-800 uppercase tracking-widest">Anteprima Etichetta</h3>
                            <div class="flex bg-white rounded-lg p-0.5 border border-slate-200 shadow-sm">
                                <button (click)="labelFormat.set('62mm')" [class]="'px-3 py-1 text-[9px] font-bold rounded-md transition-all ' + (labelFormat() === '62mm' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50')">62mm</button>
                                <button (click)="labelFormat.set('29x90')" [class]="'px-3 py-1 text-[9px] font-bold rounded-md transition-all ' + (labelFormat() === '29x90' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50')">29x90mm</button>
                            </div>
                        </div>
                        <button (click)="isLabelPreviewOpen.set(false)"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div class="p-8 bg-slate-50 flex justify-center items-center overflow-auto min-h-[400px]">
                        @if (labelFormat() === '62mm') {
                            <!-- FORMAT 62mm (Continuous Standard - COMPACT) -->
                            <div id="print-label-sticker" class="bg-white border-2 border-slate-300 p-2 font-sans text-black w-[300px] min-h-0 shadow-sm flex flex-col">
                                <div class="text-center border-b border-black pb-1 mb-2">
                                    <h4 class="text-[9px] font-black uppercase leading-tight">{{ state.companyConfig().name }}</h4>
                                    <p class="text-[7.5px] font-bold leading-tight">{{ state.companyConfig().address }}</p>
                                </div>
                                    <div class="flex justify-between items-start gap-2">
                                        <div class="flex-grow">
                                            <p class="text-[7.5px] font-black uppercase text-slate-400 mb-0.5">PRODOTTO</p>
                                            <h2 class="text-lg font-black uppercase italic leading-tight text-teal-900">{{ selectedRecordForLabel()?.mainProductName }}</h2>
                                        </div>
                                        <div class="flex flex-col items-center shrink-0">
                                            <div class="w-10 h-10 bg-white border border-slate-200 p-0.5 mb-0.5">
                                                <img [src]="'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + getQRCodeUrl(selectedRecordForLabel()!)" class="w-full h-full">
                                            </div>
                                            <span class="text-[5px] font-black text-slate-300 uppercase leading-none">Scan Trace</span>
                                        </div>
                                    </div>
                                <div class="grid grid-cols-2 gap-2 mb-2">
                                    <div class="p-1.5 border border-black rounded"><p class="text-[6.5px] font-black uppercase">PROD.</p><p class="text-[10px] font-black">{{ selectedRecordForLabel()?.packagingDate | date:'dd/MM/yy' }}</p></div>
                                    <div class="p-1.5 bg-black text-white rounded"><p class="text-[6.5px] font-black uppercase text-slate-300">SCAD.</p><p class="text-[10px] font-black">{{ selectedRecordForLabel()?.expiryDate | date:'dd/MM/yy' }}</p></div>
                                </div>
                                <div class="border border-black p-1.5 rounded text-center mb-2">
                                    <p class="text-[6.5px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">LOTTO INTERNO</p>
                                    <p class="text-sm font-black font-mono leading-none">{{ selectedRecordForLabel()?.lotto }}</p>
                                </div>
                                 
                                <div class="border-t border-slate-200 pt-2 flex-grow">
                                    <p class="text-[6.5px] font-black uppercase text-slate-400 mb-1.5">INGREDIENTI & TRACCIABILITA</p>
                                    <div class="space-y-0.5">
                                        @for (ing of selectedRecordForLabel()?.ingredients; track ing.id) {
                                            <div class="text-[9px] font-bold border-b border-dotted border-slate-100 pb-0.5 flex justify-between gap-2">
                                                <div class="flex flex-col min-w-0">
                                                    <span class="truncate">• {{ ing.name }}</span>
                                                    @if (ing.supplierName) {
                                                        <span class="text-[7px] text-blue-500 font-black uppercase leading-none mt-0.5 pl-3">{{ ing.supplierName }}</span>
                                                    }
                                                </div>
                                                <span class="font-mono text-[8.5px] opacity-60 shrink-0">L: {{ ing.lotto || 'N/A' }}</span>
                                            </div>
                                        }
                                    </div>
                                </div>

                                <div class="mt-2 pt-2 border-t border-black">
                                    @let labelAllergens = getAllergens();
                                    @if (labelAllergens.length > 0) {
                                        <p class="text-[8px] font-black text-white bg-black px-1 uppercase inline-block mb-1">ATTENZIONE: contiene allergeni</p>
                                        <p class="text-[9px] font-black leading-tight">{{ labelAllergens.join(', ') }}</p>
                                    } @else {
                                        <p class="text-[7px] font-bold italic opacity-40">Assenza allergeni comuni rilevati.</p>
                                    }
                                </div>
                            </div>
                        } @else {
                            <!-- FORMAT 29x90mm (HORIZONTAL Layout - 90mm width x 29mm height) -->
                            <div id="print-label-sticker" class="bg-white border border-black font-sans text-black w-[340px] h-[110px] flex flex-row overflow-hidden p-2 shadow-sm">
                                <!-- LEFT COLUMN: Brand, Product, Ingredients & Allergeni -->
                                <div class="flex-[1.8] flex flex-col min-w-0 pr-2 border-r border-black">
                                    <div class="mb-1">
                                        <h4 class="text-[8px] font-black uppercase leading-tight truncate">{{ state.companyConfig().name }}</h4>
                                    </div>
                                    
                                    <div class="mb-1 flex justify-between items-start gap-1">
                                        <h2 class="text-[11px] font-black uppercase leading-tight italic truncate text-teal-900 flex-grow">{{ selectedRecordForLabel()?.mainProductName }}</h2>
                                        <div class="flex flex-col items-center shrink-0 -mt-1">
                                            <div class="w-7 h-7 bg-white border border-black p-0.5">
                                                <img [src]="'https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=' + getQRCodeUrl(selectedRecordForLabel()!)" class="w-full h-full">
                                            </div>
                                            <span class="text-[4px] font-black uppercase text-slate-300 mt-0.5">QR Link</span>
                                        </div>
                                    </div>

                                    <div class="flex-grow overflow-hidden mb-1">
                                        <p class="text-[6px] font-black uppercase text-slate-400 mb-0.5">Ingredienti:</p>
                                        <div class="flex flex-wrap gap-x-1 gap-y-0.5">
                                            @for (ing of selectedRecordForLabel()?.ingredients; track ing.id; let last = $last) {
                                                <span class="text-[7px] font-bold leading-none capitalize">{{ ing.name }}{{ !last ? ',' : '' }}</span>
                                            }
                                            @if (!selectedRecordForLabel()?.ingredients?.length) {
                                                <span class="text-[7px] italic opacity-40">Nessun ingrediente inserito</span>
                                            }
                                        </div>
                                    </div>

                                    <!-- Allergeni moved here -->
                                    <div class="mb-1">
                                        @let labelAllergens = getAllergens();
                                        @if (labelAllergens.length > 0) {
                                            <div class="bg-red-600 text-white rounded-[2px] px-1 py-0.5">
                                                <p class="text-[6.5px] font-black uppercase leading-none truncate">Allergeni: {{ labelAllergens.join(', ') }}</p>
                                            </div>
                                        } @else {
                                            <p class="text-[6px] font-bold text-slate-300 uppercase italic leading-none">Allergeni: Assenti</p>
                                        }
                                    </div>
                                    
                                    <div class="opacity-50">
                                        <p class="text-[5.5px] font-medium truncate">{{ state.companyConfig().address }}</p>
                                    </div>
                                </div>

                                <!-- RIGHT COLUMN: Dates & Lotto -->
                                <div class="flex-1 flex flex-col justify-center pl-2 text-center">
                                    <div class="space-y-1 mb-2">
                                        <div class="py-1 px-1.5 border border-black rounded bg-slate-50 flex justify-between items-center">
                                            <span class="text-[6px] font-black uppercase">PROD:</span>
                                            <span class="text-[9.5px] font-black">{{ selectedRecordForLabel()?.packagingDate | date:'dd/MM/yy' }}</span>
                                        </div>
                                        <div class="py-1 px-1.5 bg-black text-white rounded flex justify-between items-center border border-black">
                                            <span class="text-[6px] font-black uppercase text-slate-300">SCAD:</span>
                                            <span class="text-[9.5px] font-black">{{ selectedRecordForLabel()?.expiryDate | date:'dd/MM/yy' }}</span>
                                        </div>
                                    </div>

                                    <div class="py-1.5 border-t border-black">
                                        <p class="text-[6px] font-black uppercase text-slate-400 leading-none mb-0.5">LOTTO</p>
                                        <p class="text-[11px] font-black font-mono leading-none tracking-tight">{{ selectedRecordForLabel()?.lotto }}</p>
                                    </div>
                                </div>
                            </div>
                        }
                    </div>
                    
                    <div class="p-6 bg-white border-t border-slate-100 flex flex-wrap gap-4">
                        <button (click)="isLabelPreviewOpen.set(false)" class="flex-1 py-3 bg-slate-50 text-slate-600 rounded-xl font-black text-xs uppercase hover:bg-slate-100">Chiudi</button>
                        <button (click)="openPublicPage(selectedRecordForLabel()!)" class="flex-1 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] uppercase hover:bg-indigo-100 transition-all border border-indigo-100">
                            <i class="fa-solid fa-earth-europe mr-2"></i> Pagina Pubblica
                        </button>
                        <button (click)="printLabel(selectedRecordForLabel()!)" class="flex-[2] py-3 bg-teal-600 text-white rounded-xl font-black text-xs uppercase hover:bg-teal-700 shadow-lg"><i class="fa-solid fa-print mr-2"></i> Stampa</button>
                    </div>
                </div>
            </div>
        }

        <!-- ABBATTIMENTO LABEL PREVIEW MODAL -->
        @if (selectedAbbattimentoForPrint()) {
            <div class="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" (click)="selectedAbbattimentoForPrint.set(null)"></div>
                
                <div class="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
                    <div class="px-6 py-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <h3 class="text-xs font-black text-slate-800 uppercase tracking-widest">Etichetta Abbattimento</h3>
                            <div class="flex bg-white rounded-lg p-0.5 border border-slate-200 shadow-sm">
                                <button (click)="labelFormatAbbattimento.set('62mm')" [class]="'px-3 py-1 text-[9px] font-bold rounded-md transition-all ' + (labelFormatAbbattimento() === '62mm' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50')">62mm</button>
                                <button (click)="labelFormatAbbattimento.set('29x90')" [class]="'px-3 py-1 text-[9px] font-bold rounded-md transition-all ' + (labelFormatAbbattimento() === '29x90' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50')">29x90mm</button>
                            </div>
                        </div>
                        <button (click)="selectedAbbattimentoForPrint.set(null)" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div class="p-8 bg-slate-50 flex justify-center items-center overflow-auto min-h-[300px]">
                        @if (labelFormatAbbattimento() === '62mm') {
                            <!-- PREVIEW: 62mm Format -->
                            <div id="print-label-preview-62-abb" class="bg-white border-2 border-slate-300 p-3 font-sans text-black w-[280px] shadow-sm flex flex-col">
                                <div class="text-center border-b-2 border-black pb-2 mb-2">
                                    <h1 class="m-0 text-lg font-black uppercase leading-tight tracking-tight">SAI FAST HACCP</h1>
                                    <p class="m-0 text-[10px] font-bold uppercase tracking-widest">Processo Abbattimento</p>
                                </div>
                                
                                <div class="flex flex-col gap-2 flex-1">
                                    <div>
                                        <div class="text-[9px] font-black uppercase tracking-widest text-slate-500">Prodotto Abbattuto</div>
                                        <div class="text-[16px] font-black leading-tight">{{ selectedAbbattimentoForPrint()?.productName }}</div>
                                    </div>
                                    
                                    <div class="flex justify-between border-t border-dashed border-slate-300 pt-2">
                                        <div>
                                            <div class="text-[9px] font-black uppercase tracking-widest text-slate-500">Lotto Orig.</div>
                                            <div class="text-sm font-bold font-mono">{{ selectedAbbattimentoForPrint()?.originalLotto || 'N.D.' }}</div>
                                        </div>
                                        <div class="text-right">
                                            <div class="text-[9px] font-black uppercase tracking-widest text-slate-500">Scad. Orig.</div>
                                            <div class="text-sm font-bold">{{ selectedAbbattimentoForPrint()?.originalExpiryDate ? (selectedAbbattimentoForPrint()?.originalExpiryDate | date:'dd/MM/yy') : 'N.D.' }}</div>
                                        </div>
                                    </div>
                                    
                                    <div class="border-t border-dashed border-slate-300 pt-2">
                                        <div class="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Parametri Ciclo ({{ selectedAbbattimentoForPrint()?.recordedDate | date:'dd/MM/yy' }})</div>
                                        <div class="text-[10px] flex justify-between font-bold">
                                            <span>Orario: {{ selectedAbbattimentoForPrint()?.startTime }}-{{ selectedAbbattimentoForPrint()?.endTime }}</span>
                                            <span>Temp: {{ selectedAbbattimentoForPrint()?.startTemp }}° &rarr; {{ selectedAbbattimentoForPrint()?.endTemp }}°C</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="mt-3 pt-3 border-t-2 border-black text-center bg-slate-50 rounded-lg pb-1">
                                    <div class="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Nuova Scadenza</div>
                                    <div class="text-xl font-black">{{ selectedAbbattimentoForPrint()?.postExpiryDate ? (selectedAbbattimentoForPrint()?.postExpiryDate | date:'dd/MM/yyyy') : 'N.D.' }}</div>
                                    <div class="text-[9px] font-bold mt-1 text-slate-600">Conservare a: {{ selectedAbbattimentoForPrint()?.storageTemp }}°C</div>
                                </div>
                            </div>
                        } @else {
                            <!-- PREVIEW: 29x90mm Format -->
                            <div id="print-label-preview-29-abb" class="bg-white border-2 border-slate-300 font-sans text-black w-[340px] h-[110px] flex flex-row overflow-hidden p-2 shadow-sm">
                                <div class="flex-[1.4] flex flex-col min-w-0 pr-3 border-r border-black">
                                    <div class="text-[7px] font-black uppercase text-slate-500 mb-0.5">Abbattimento - {{ selectedAbbattimentoForPrint()?.recordedDate | date:'dd/MM/yy' }}</div>
                                    <div class="text-[12px] font-black uppercase leading-tight line-clamp-2">{{ selectedAbbattimentoForPrint()?.productName }}</div>
                                    
                                    <div class="mt-auto pb-1">
                                        <div class="text-[8px] flex items-baseline gap-1"><span class="font-bold text-slate-500 uppercase">Lotto:</span> <span class="font-mono font-black">{{ selectedAbbattimentoForPrint()?.originalLotto || 'N.D.' }}</span></div>
                                        <div class="text-[8px] flex items-baseline gap-1"><span class="font-bold text-slate-500 uppercase">Ciclo:</span> <span class="font-black">{{ selectedAbbattimentoForPrint()?.startTime }}-{{ selectedAbbattimentoForPrint()?.endTime }} ({{ selectedAbbattimentoForPrint()?.endTemp }}°C)</span></div>
                                    </div>
                                </div>
                                <div class="flex-1 flex flex-col justify-center pl-3 text-center">
                                    <div class="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1">Scadenza</div>
                                    <div class="text-lg font-black leading-none bg-black text-white py-1.5 rounded">{{ selectedAbbattimentoForPrint()?.postExpiryDate ? (selectedAbbattimentoForPrint()?.postExpiryDate | date:'dd/MM/yy') : 'N.D.' }}</div>
                                    <div class="text-[7px] font-bold mt-2 uppercase text-slate-600">Cons: {{ selectedAbbattimentoForPrint()?.storageTemp }}°C</div>
                                </div>
                            </div>
                        }
                    </div>
                    
                    <div class="p-6 bg-white border-t border-slate-100 flex flex-wrap gap-4">
                        <button (click)="selectedAbbattimentoForPrint.set(null)" class="flex-1 py-3 bg-slate-50 text-slate-600 rounded-xl font-black text-xs uppercase hover:bg-slate-100">Chiudi</button>
                        <button (click)="printAbbattimentoLabel(selectedAbbattimentoForPrint()!, labelFormatAbbattimento())" class="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase hover:bg-indigo-700 shadow-lg flex items-center justify-center gap-2">
                            <i class="fa-solid fa-print"></i> Stampa Etichetta
                        </button>
                    </div>
                </div>
            </div>
        }
    </div>

    <!-- PHOTO ZOOM MODAL -->
    @if (zoomedPhoto()) {
        <div class="fixed inset-0 z-[2000] flex items-center justify-center p-4 animate-fade-in">
            <div class="absolute inset-0 bg-slate-900/90 backdrop-blur-md" (click)="zoomedPhoto.set(null)"></div>
            <div class="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center">
                <button (click)="zoomedPhoto.set(null)" class="absolute -top-12 right-0 text-white hover:text-teal-400 transition-colors flex items-center gap-2 font-bold uppercase tracking-widest text-xs">
                    Chiudi <i class="fa-solid fa-xmark text-xl"></i>
                </button>
                <div class="bg-white p-2 rounded-2xl shadow-2xl overflow-hidden animate-slide-up ring-4 ring-white/10">
                    <img [src]="zoomedPhoto()" class="max-w-full max-h-[80vh] object-contain rounded-xl">
                </div>
            </div>
        </div>
    }

    <!-- NO CLIENT SELECTED MODAL (FOR ADMINS) -->
    @if (showNoClientModal()) {
        <div class="fixed inset-0 z-[3000] flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" (click)="showNoClientModal.set(false)"></div>
            <div class="relative bg-white max-w-md w-full rounded-3xl shadow-2xl overflow-hidden animate-slide-up border border-slate-100">
                <div class="p-8 text-center">
                    <div class="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl shadow-inner border border-rose-100">
                        <i class="fa-solid fa-building-circle-exclamation"></i>
                    </div>
                    <h3 class="text-2xl font-black text-slate-900 uppercase tracking-tight mb-4">Azienda non Selezionata</h3>
                    <p class="text-sm text-slate-500 font-medium leading-relaxed mb-8">
                        Sei in modalità <span class="font-black text-slate-900">AMMINISTRATORE</span>. 
                        Per registrare un nuovo prodotto, devi prima selezionare l'azienda cliente dal menu in alto a destra nella Dashboard.
                    </p>
                    <button (click)="showNoClientModal.set(false)" class="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95">
                        Ho capito, vado a selezionare
                    </button>
                </div>
            </div>
        </div>
    }
    `,
    styles: [`
        .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    `]
})
export class ProductionLogViewComponent {
    state = inject(AppStateService);
    toast = inject(ToastService);

    isEditing = signal(false);
    showNoClientModal = signal(false);
    isLabelPreviewOpen = signal(false);
    selectedRecordForLabel = signal<ProductionRecord | null>(null);
    ingredientsList = signal<ProductionIngredient[]>([]);
    tempPhoto: string | null = null;
    zoomedPhoto = signal<string | null>(null);
    labelFormat = signal<'62mm' | '29x90'>('62mm');
    
    searchQuery = signal('');
    dateFrom = signal(new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]);
    dateTo = signal(new Date().toISOString().split('T')[0]);

    mainProductMatches = signal<string[]>([]);
    preparationMatches = signal<any[]>([]);
    pantryMatches = signal<any[]>([]);
    baseMatches = signal<string[]>([]);
    
    selectedAbbattimentoForPrint = signal<any | null>(null);
    labelFormatAbbattimento = signal<'62mm' | '29x90'>('62mm');

    currentRecord: Partial<ProductionRecord> = {};
    newIngredient: Partial<ProductionIngredient> = {};

    filteredRecords = computed(() => {
        const targetClientId = this.state.activeTargetClientId();
        const selectedDate = this.state.filterDate(); // Calendario globale
        
        return this.state.productionRecords()
            .filter(r => (targetClientId ? r.clientId === targetClientId : true))
            .filter(r => !selectedDate || r.recordedDate.startsWith(selectedDate)) // Sincronizzazione calendario
            .filter(r => {
                const search = this.searchQuery().toLowerCase();
                return !search || r.mainProductName.toLowerCase().includes(search) || r.lotto.toLowerCase().includes(search);
            })
            .sort((a, b) => b.recordedDate.localeCompare(a.recordedDate));
    });

    startNew() {
        // Prevent creation if Admin but no company selected
        if (this.state.currentUser()?.role === 'ADMIN' && !this.state.activeTargetClientId()) {
            this.showNoClientModal.set(true);
            return;
        }

        const selDate = this.state.filterDate() || new Date().toISOString().split('T')[0];
        const sameDayCount = this.state.productionRecords().filter(r => r.recordedDate.startsWith(selDate)).length;
        const [y, m, d] = selDate.split('-');
        const lotto = `${d}-${m}-${y}-${String(sameDayCount + 1).padStart(2, '0')}`;

        this.currentRecord = {
            id: Math.random().toString(36).substring(2, 9),
            mainProductName: '',
            packagingDate: selDate,
            expiryDate: '',
            lotto: lotto,
            recordedDate: selDate + 'T' + new Date().toLocaleTimeString('it-IT', { hour12: false }),
            clientId: this.state.activeTargetClientId() || 'demo',
            userId: this.state.currentUser()?.id || 'demo'
        };
        this.ingredientsList.set([]);
        this.isEditing.set(true);
        this.resetIngredientForm();
    }

    openDetail(rec: ProductionRecord) {
        this.currentRecord = JSON.parse(JSON.stringify(rec));
        this.ingredientsList.set(rec.ingredients || []);
        this.isEditing.set(true);
    }

    cancelEdit() {
        this.isEditing.set(false);
    }

    formatName(val: string): string {
        if (!val) return '';
        return val.charAt(0).toUpperCase() + val.slice(1);
    }

    onMainProductNameChange(val: string) {
        this.currentRecord.mainProductName = this.formatName(val);
        if (!val || val.length < 2) {
            this.mainProductMatches.set([]);
            this.preparationMatches.set([]);
            return;
        }
        const q = val.toLowerCase();
        
        // Match from Preparazioni
        const preps = this.state.preparations()
            .filter(p => p.name.toLowerCase().includes(q))
            .slice(0, 5);
        this.preparationMatches.set(preps);

        // Match from previous productions
        const matches = this.state.productionRecords()
            .map(r => r.mainProductName)
            .filter((name, index, self) => self.indexOf(name) === index)
            .filter(name => name.toLowerCase().includes(q) && !preps.some(p => p.name.toLowerCase() === name.toLowerCase()))
            .slice(0, 5);
        this.mainProductMatches.set(matches);
    }

    selectMainProduct(name: string) {
        this.currentRecord.mainProductName = name;
        this.mainProductMatches.set([]);
        this.preparationMatches.set([]);
    }

    selectPreparation(prep: any) {
        this.currentRecord.mainProductName = prep.name;
        this.mainProductMatches.set([]);
        this.preparationMatches.set([]);

        // Auto-calculate expiry date
        if (prep.expiryDays > 0 && this.currentRecord.packagingDate) {
            const pkgDate = new Date(this.currentRecord.packagingDate);
            pkgDate.setDate(pkgDate.getDate() + prep.expiryDays);
            this.currentRecord.expiryDate = pkgDate.toISOString().split('T')[0];
            this.toast.success('Preparazione Selezionata', `${prep.name} - Scadenza automatica impostata (+${prep.expiryDays}gg)`);
        }
    }

    resetIngredientForm() {
        this.tempPhoto = null;
        this.pantryMatches.set([]);
        this.baseMatches.set([]);
        this.newIngredient = {
            name: '',
            packingDate: new Date().toISOString().split('T')[0],
            expiryDate: '',
            lotto: '',
            supplierName: '',
            allergens: []
        };
    }

    onIngredientNameChange(val: string) {
        this.newIngredient.name = this.formatName(val);
        if (!val || val.length < 2) { 
            this.pantryMatches.set([]); 
            this.baseMatches.set([]);
            return; 
        }
        const q = val.toLowerCase();
        const today = new Date().toISOString().split('T')[0];
        
        const local = (this.state.getGlobalRecord('ddt_pantry') || []) as any[];
        const clientId = this.state.activeTargetClientId() || this.state.currentUser()?.clientId;
        
        const matches = local
            .filter((i: any) => i.ingredientName?.toLowerCase().includes(q))
            .filter((i: any) => !clientId || i.clientId === clientId)
            .filter((i: any) => !i.expiryDate || i.expiryDate >= today)
            .slice(0, 5);
            
        this.pantryMatches.set(matches);
        
        const base = this.state.baseIngredients()
            .filter(b => b.toLowerCase().includes(q) && !matches.some((m:any) => m.ingredientName.toLowerCase() === b.toLowerCase()))
            .slice(0, 4);
        this.baseMatches.set(base);
    }

    selectFromBase(item: string) {
        this.newIngredient.name = this.formatName(item);
        this.pantryMatches.set([]);
        this.baseMatches.set([]);
    }

    selectFromPantry(item: any) {
        this.newIngredient.name = item.ingredientName;
        this.newIngredient.lotto = item.lotto || '';
        this.newIngredient.supplierName = item.supplierName || '';
        
        // Check if this product has been blast chilled - if so use the extended expiry date
        const abb = this.findAbbattimentoRecord(item);
        if (abb && abb.postExpiryDate) {
            this.newIngredient.expiryDate = abb.postExpiryDate;
            this.toast.success('Prodotto Abbattuto ❄️', `${item.ingredientName} — Scadenza estesa al ${new Date(abb.postExpiryDate).toLocaleDateString('it-IT')} caricata automaticamente.`);
        } else {
            this.newIngredient.expiryDate = item.expiryDate || '';
            this.toast.success('Dispensa', `${item.ingredientName} — Lotto e scadenza caricati automaticamente.`);
        }
        
        this.pantryMatches.set([]);
        this.baseMatches.set([]);
    }

    daysToExpiry(d: string): number {
        if (!d) return 999;
        return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
    }

    async handleFile(event: any) {
        const file = event.target.files[0];
        if (!file) return;

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            this.toast.error('Foto troppo grande', 'L\'immagine supera il limite di 10MB. Riduci la risoluzione prima di caricarla.');
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => this.tempPhoto = e.target?.result as string;
    }

    addIngredient() {
        if (!this.newIngredient.name) return;

        // --- Expiry Validation ---
        const prepDate = this.currentRecord.packagingDate || '';
        const expiryDate = this.newIngredient.expiryDate || '';
        if (prepDate && expiryDate && expiryDate < prepDate) {
            this.toast.error('GIA SCADUTO', 'La data di scadenza dell\'ingrediente è precedente alla data di preparazione.');
            return; // Block insertion
        }

        const capitalized = this.newIngredient.name.charAt(0).toUpperCase() + this.newIngredient.name.slice(1);
        
        // --- Memorize New Ingredient ---
        this.state.addBaseIngredient(capitalized);

        const ing: ProductionIngredient = {
            id: Math.random().toString(36).substring(2, 9),
            name: capitalized,
            packingDate: this.newIngredient.packingDate || '',
            expiryDate: this.newIngredient.expiryDate || '',
            lotto: this.newIngredient.lotto || '',
            supplierName: this.newIngredient.supplierName || '',
            photo: this.tempPhoto || undefined,
            allergens: this.newIngredient.allergens || []
        };
        this.ingredientsList.update(list => [ing, ...list]);
        this.resetIngredientForm();
    }

    toggleNewIngredientAllergen(allergenId: string) {
        if (!this.newIngredient.allergens) this.newIngredient.allergens = [];
        const idx = this.newIngredient.allergens.indexOf(allergenId);
        if (idx >= 0) {
            this.newIngredient.allergens.splice(idx, 1);
        } else {
            this.newIngredient.allergens.push(allergenId);
        }
    }

    removeIngredient(id: string) {
        this.ingredientsList.update(list => list.filter(i => i.id !== id));
    }

    async saveRecord() {
        if (!this.currentRecord.mainProductName) return;
        
        try {
            this.currentRecord.mainProductName = this.currentRecord.mainProductName.charAt(0).toUpperCase() + this.currentRecord.mainProductName.slice(1);
            
            const finalRecord: ProductionRecord = {
                ...(this.currentRecord as ProductionRecord),
                ingredients: this.ingredientsList()
            };

            // Await the state change for persistence
            await this.state.saveProductionRecord(finalRecord);
            
            this.toast.success('Salvato', `Record tracciabilità archiviato.`);
            
            // Explicitly close the form after successful save
            this.isEditing.set(false);
            
        } catch (err) {
            console.error('Save failed:', err);
            this.toast.error('Errore', 'Impossibile completare il salvataggio del registro.');
        }
    }

    deleteRecord(id: string) {
        this.state.deleteProductionRecord(id);
    }

    openLabelPreview(rec: ProductionRecord) {
        this.selectedRecordForLabel.set(rec);
        this.isLabelPreviewOpen.set(true);
    }

    printLabel(rec: ProductionRecord) {
        const format = this.labelFormat();
        const element = document.getElementById('print-label-sticker');
        if (!element) return;

        const printContent = element.outerHTML;
        
        const oldFrame = document.getElementById('print-iframe');
        if (oldFrame) oldFrame.remove();

        const iframe = document.createElement('iframe');
        iframe.id = 'print-iframe';
        iframe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;border:none;visibility:hidden;';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (!doc) return;
        
        // Ensure QR code is loaded before printing
        const qrcodeImg = element.querySelector('img[src*="qrserver"]');
        if (qrcodeImg) {
            // We'll wait a bit in the iframe anyway, but this helps
        }

        // Strict Printer CSS
        let pageCss = '';
        if (format === '62mm') {
            pageCss = `
                @page { 
                    size: 62mm auto; 
                    margin: 0mm !important; 
                }
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                html, body { 
                    margin: 0 !important; 
                    padding: 0 !important; 
                    width: 62mm !important; 
                    background: white;
                    overflow: visible !important;
                }
                body { 
                    display: flex; 
                    flex-direction: column; 
                    align-items: center; 
                    justify-content: flex-start;
                }
                #print-label-sticker { 
                    width: 62mm !important; 
                    margin: 0 !important;
                    border: none !important; 
                    box-shadow: none !important;
                    padding: 3mm !important;
                    flex-shrink: 0;
                    min-height: 0 !important;
                }
            `;
        } else {
            // 90x29 HORIZONTAL - PERFECT FIT
            pageCss = `
                @page { 
                    size: 90mm 29mm !important; 
                    margin: 0 !important; 
                }
                *, *::before, *::after {
                    box-sizing: border-box !important;
                }
                html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    width: 90mm !important;
                    height: 29mm !important;
                    background: white !important;
                    overflow: hidden !important;
                }
                #print-label-sticker { 
                    width: 90mm !important; 
                    height: 29mm !important;
                    margin: 0 !important;
                    border: none !important; 
                    box-shadow: none !important;
                    padding: 2mm 2mm 2mm 4mm !important;
                    display: flex !important;
                    flex-direction: row !important;
                }
            `;
        }

        doc.open();
        doc.write(`
            <html>
                <head>
                    <title></title>
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box !important; }
                        ${pageCss}
                    </style>
                </head>
                <body>
                    ${printContent}
                    <script>
                        document.title = "";
                        window.onload = function() {
                            setTimeout(() => {
                                window.print();
                                setTimeout(() => window.parent.document.getElementById('print-iframe').remove(), 1000);
                            }, 700);
                        };
                    </script>
                </body>
            </html>
        `);
        doc.close();
    }

    getUIAllergens(): string[] {
        const manual = new Set<string>();
        this.ingredientsList().forEach(i => i.allergens?.forEach(a => manual.add(a)));
        
        const detected = this.detectAllergens(this.ingredientsList().map(i => i.name));
        detected.forEach(d => manual.add(d));
        
        return Array.from(manual);
    }

    getAllergens(): string[] {
        const ingredients = this.selectedRecordForLabel()?.ingredients || [];
        const manual = new Set<string>();
        ingredients.forEach(i => i.allergens?.forEach(a => manual.add(a)));
        
        const detected = this.detectAllergens(ingredients.map(i => i.name));
        detected.forEach(d => manual.add(d));
        
        return Array.from(manual);
    }

    getRecordAllergens(rec: ProductionRecord): string[] {
        const manual = new Set<string>();
        rec.ingredients.forEach(i => i.allergens?.forEach(a => manual.add(a)));
        
        const detected = this.detectAllergens(rec.ingredients.map(i => i.name));
        detected.forEach(d => manual.add(d));
        
        return Array.from(manual);
    }

    private detectAllergens(names: string[]): string[] {
        const found = new Set<string>();
        const map: { [key: string]: string[] } = {
            'Cereali con Glutine': [
                'frumento', 'grano', 'orzo', 'segale', 'avena', 'farro', 'kamut', 'khorasan', 'spelta', 'triticale', 'monococco', 
                'farina', 'amido di frumento', 'pangrattato', 'crusca', 'germe di grano', 'malto', 'estratto di malto', 
                'lievito naturale', 'lievito madre', 'seitan', 'couscous', 'bulgur', 'fregola', 'semola', 'pasta', 'gnocchi', 
                'ostie', 'panatura', 'birra', 'roux', 'pane', 'focaccia', 'pizzetta', 'panino', 'baguette', 'piadina'
            ],
            'Crostacei': [
                'gamberi', 'gamberetti', 'mazzancolle', 'scampi', 'aragosta', 'astice', 'granchio', 'granseola', 
                'canocchie', 'pannocchie', 'crayfish', 'bisque', 'fumetto', 'pasta di gamberi', 'surimi'
            ],
            'Uova': [
                'uova', 'uovo', 'albume', 'tuorlo', 'uovo in polvere', 'uovo liquido', 'uovo pastorizzato', 
                'lecitina di uovo', 'E1105', 'albumina', 'vitellina', 'globulina', 'maionese', "pasta all'uovo", 
                'meringhe', 'zabaione', 'creme pasticcere', 'bignè', 'panatura', 'doratura', 'olandese', 'tartara'
            ],
            'Pesce': [
                'acciughe', 'tonno', 'salmone', 'merluzzo', 'pesce spada', 'colla di pesce', 'olio di pesce', 
                'uova di pesce', 'bottarga', 'caviale', 'surimi', 'worchester', 'salsa di pesce', 'nam pla', 
                'caesar salad', 'dado pesce', 'zuppa pesce'
            ],
            'Arachidi': [
                'arachidi', 'spagnolette', 'noccioline americane', 'olio di arachidi', "burro d'arachidi", 
                'farina di arachidi', 'granella di arachidi', 'satay'
            ],
            'Soia': [
                'soia', 'edamame', 'germogli di soia', 'latte di soia', 'yogurt di soia', 'tofu', 'tempeh', 'miso', 
                'farina di soia', 'olio di soia', 'lecitina di soia', 'E322', 'proteine isolate della soia', 
                'proteine vegetali idrolizzate', 'salsa di soia', 'shoyu', 'tamari', 'teriyaki', 'lecitina'
            ],
            'Latte': [
                'latte', 'panna', 'burro', 'yogurt', 'kefir', 'mozzarella', 'parmigiano', 'gorgonzola', 'pecorino', 
                'ricotta', 'vaccino', 'capra', 'pecora', 'bufala', 'lattosio', 'caseina', 'caseinati', 'sieroproteine', 
                'siero di latte', 'lattoalbumina', 'lattoglobulina', 'besciamella', 'cioccolato al latte', 'margarina',
                'formaggio', 'provola', 'scamorza', 'asiago', 'fontina', 'emmental', 'caciocavallo', 'taleggio', 'mascarpone',
                'stracchino', 'squacquerone', 'robiola', 'philadelphia', 'tilsit', 'feta', 'edam', 'gouda', 'cheddar', 'caciotta'
            ],
            'Frutta a Guscio': [
                'mandorle', 'nocciole', 'noci', 'anacardi', 'pecan', 'brasile', 'pistacchi', 'macadamia', 'queensland', 
                'marzapane', 'farina mandorle', 'latte mandorla', 'olio noci', 'burro noci', 'pesto', 'pinoli', 'torrone', 
                'praline', 'muesli'
            ],
            'Sedano': [
                'sedano', 'costa', 'rapa', 'radice', 'foglie sedano', 'semi sedano', 'sale di sedano', 'dado', 
                'estratto vegetale', 'soffritto'
            ],
            'Senape': [
                'semi senape', 'senape polvere', 'senape crema', 'senape liquida', 'mostarda', 'dressing', 'marinata'
            ],
            'Sesamo': [
                'semi sesamo', 'olio sesamo', 'tahina', 'gomasio', 'bun', 'burger', 'grissini', 'cracker', 'hummus'
            ],
            'Anidride Solforosa e Solfiti': [
                'solfiti', 'anidride solforosa', 'E220', 'E221', 'E222', 'E223', 'E224', 'E226', 'E227', 'E228', 
                'vino', 'aceto', 'birra', 'frutta secca', 'succo limone'
            ],
            'Lupini': [
                'lupini', 'farina lupini', 'proteine lupino'
            ],
            'Molluschi': [
                'cozze', 'vongole', 'ostriche', 'telline', 'lumache', 'chiocciole', 'polpo', 'seppia', 'calamaro', 
                'totano', 'tartufo di mare', 'patelle', 'nero di seppia', 'scoglio', 'pescatore'
            ]
        };

        names.forEach(n => {
            const low = n.toLowerCase();
            Object.entries(map).forEach(([alg, keywords]) => {
                if (keywords.some(k => low.includes(k))) found.add(alg);
            });
        });
        return Array.from(found);
    }

    openPublicPage(rec: ProductionRecord) {
        const url = window.location.origin + '/?info=' + rec.id;
        window.open(url, '_blank');
    }

    getQRCodeUrl(rec: ProductionRecord): string {
        const config = this.state.companyConfig();
        let baseUrl = config.qrBaseUrl;
        
        if (!baseUrl || baseUrl.trim() === '') {
            baseUrl = window.location.origin + window.location.pathname;
        }

        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }
        
        return `${baseUrl}?info=${rec.id}`;
    }

    openAbbattimentoPrintModal(ab: any) {
        this.selectedAbbattimentoForPrint.set(ab);
    }

    printAbbattimentoLabel(rec: any, format: '62mm' | '29x90') {
        const dateFormatted = new Date(rec.recordedDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const expiryFormatted = rec.postExpiryDate ? new Date(rec.postExpiryDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N.D.';
        
        let printContent = '';

        if (format === '62mm') {
            printContent = `
                <div id="print-label-sticker" style="font-family: Arial, sans-serif; display:flex; flex-direction:column; background:white;">
                    <div style="border-bottom: 2px solid black; padding-bottom: 4mm; margin-bottom: 3mm; text-align: center;">
                        <h1 style="margin: 0; font-size: 16pt; font-weight: 900; text-transform: uppercase;">SAI FAST HACCP</h1>
                        <p style="margin: 0; font-size: 9pt; font-weight: bold;">PROCESSO ABBATTIMENTO</p>
                    </div>
                    <div style="flex: 1; display:flex; flex-direction:column; gap: 2mm;">
                        <div><div style="font-size: 7pt; font-weight: bold; text-transform: uppercase;">Prodotto Abbattuto</div><div style="font-size: 14pt; font-weight: 900; line-height: 1.1;">${rec.productName}</div></div>
                        <div style="display:flex; justify-content: space-between; border-top: 1px dashed #ccc; padding-top: 2mm;">
                            <div><div style="font-size: 7pt; font-weight: bold; text-transform: uppercase;">Lotto Orig.</div><div style="font-size: 11pt; font-weight: bold;">${rec.originalLotto || 'N.D.'}</div></div>
                            <div style="text-align: right;"><div style="font-size: 7pt; font-weight: bold; text-transform: uppercase;">Scad. Orig.</div><div style="font-size: 11pt; font-weight: bold;">${rec.originalExpiryDate ? new Date(rec.originalExpiryDate).toLocaleDateString('it-IT') : 'N.D.'}</div></div>
                        </div>
                        <div style="border-top: 1px dashed #ccc; padding-top: 2mm;">
                            <div style="font-size: 7pt; font-weight: bold; text-transform: uppercase;">Parametri Ciclo (${dateFormatted})</div>
                            <div style="font-size: 9pt; display: flex; justify-content: space-between; margin-top: 1mm;">
                                <span><b>Orario:</b> ${rec.startTime} - ${rec.endTime}</span>
                                <span><b>Temp:</b> ${rec.startTemp}°C &rarr; ${rec.endTemp}°C</span>
                            </div>
                        </div>
                    </div>
                    <div style="margin-top: 3mm; padding-top: 3mm; border-top: 2px solid black; text-align: center;">
                        <div style="font-size: 8pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Nuova Scadenza</div>
                        <div style="font-size: 18pt; font-weight: 900;">${expiryFormatted}</div>
                        <div style="font-size: 7pt; margin-top: 1mm;">Conservare a: ${rec.storageTemp}°C</div>
                    </div>
                </div>
            `;
        } else {
            printContent = `
                <div id="print-label-sticker" style="font-family: Arial, sans-serif; background:white;">
                    <div style="flex: 1.4; padding-right: 3mm; border-right: 1px dashed black; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <div style="font-size: 5pt; font-weight: bold; text-transform: uppercase; margin-bottom: 0.5mm;">Abbattimento - ${dateFormatted}</div>
                            <div style="font-size: 10pt; font-weight: 900; line-height: 1.1; max-width: 50mm; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${rec.productName}</div>
                        </div>
                        <div style="margin-top: 1mm;">
                            <div style="font-size: 6pt; margin-bottom: 0.5mm;">Lotto: <b>${rec.originalLotto || 'N.D.'}</b></div>
                            <div style="font-size: 6pt;">Ciclo: <b>${rec.startTime}-${rec.endTime} (${rec.endTemp}°C)</b></div>
                        </div>
                    </div>
                    <div style="flex: 1; padding-left: 3mm; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
                        <div style="font-size: 7pt; font-weight: bold; text-transform: uppercase; margin-bottom: 1mm;">Scadenza</div>
                        <div style="font-size: 14pt; font-weight: 900; background: black; color: white; padding: 1mm 2mm; border-radius: 2mm;">${expiryFormatted}</div>
                        <div style="font-size: 6pt; margin-top: 1.5mm; text-transform: uppercase;">Cons: ${rec.storageTemp}°C</div>
                    </div>
                </div>
            `;
        }

        const oldFrame = document.getElementById('print-iframe');
        if (oldFrame) oldFrame.remove();

        const iframe = document.createElement('iframe');
        iframe.id = 'print-iframe';
        iframe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;border:none;visibility:hidden;';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (!doc) return;

        let pageCss = '';
        if (format === '62mm') {
            pageCss = `
                @page { size: 62mm auto; margin: 0mm !important; }
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                html, body { margin: 0 !important; padding: 0 !important; width: 62mm !important; background: white; overflow: visible !important; }
                body { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; }
                #print-label-sticker { width: 62mm !important; margin: 0 !important; border: none !important; box-shadow: none !important; padding: 3mm !important; flex-shrink: 0; min-height: 0 !important; }
            `;
        } else {
            pageCss = `
                @page { size: 90mm 29mm !important; margin: 0 !important; }
                *, *::before, *::after { box-sizing: border-box !important; }
                html, body { margin: 0 !important; padding: 0 !important; width: 90mm !important; height: 29mm !important; background: white !important; overflow: hidden !important; }
                #print-label-sticker { width: 90mm !important; height: 29mm !important; margin: 0 !important; border: none !important; box-shadow: none !important; padding: 2mm 2mm 2mm 4mm !important; display: flex !important; flex-direction: row !important; }
            `;
        }

        doc.open();
        doc.write(`
            <html><head><style>* { box-sizing: border-box !important; } ${pageCss}</style></head>
            <body>${printContent}
            <script>window.onload = function() { setTimeout(() => { window.print(); setTimeout(() => window.parent.document.getElementById('print-iframe').remove(), 1000); }, 500); };</script>
            </body></html>
        `);
        doc.close();
    }

    /** Match a pantry/ingredient item to an abbattimento log record by name + lotto or supplier. */
    findAbbattimentoRecord(item: { name?: string; ingredientName?: string; lotto?: string; supplierName?: string }): any | null {
        const raw = this.state.getGlobalRecord('abbattimento_log') as any[] || [];
        const name = (item.name || item.ingredientName || '').toLowerCase();
        return raw.find(r =>
            r.productName?.toLowerCase() === name &&
            (
                (item.lotto && r.originalLotto === item.lotto) ||
                (item.supplierName && r.supplierName === item.supplierName)
            ) &&
            !!r.postExpiryDate
        ) || null;
    }

    /** Scan a full ProductionRecord's ingredients and return the first matching abbattimento record. */
    findAbbattimentoRecordByProductRecordIngredients(rec: ProductionRecord): any | null {
        const ingredients = rec.ingredients || [];
        for (const ing of ingredients) {
            const match = this.findAbbattimentoRecord(ing);
            if (match) return match;
        }
        return null;
    }
}
