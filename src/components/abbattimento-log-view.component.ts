import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../services/app-state.service';
import { ToastService } from '../services/toast.service';
import { FormsModule } from '@angular/forms';

interface AbbattimentoRecord {
    id: string;
    clientId: string;
    userId: string;
    recordedDate: string;
    
    // Original Product Info (from Pantry)
    productName: string;
    originalLotto: string;
    purchaseDate: string; // Data di Acquisto / Carico
    originalExpiryDate: string; // Data di Scadenza (Prima)
    supplierName: string; // Fornitore
    
    // Process Parameters
    startTime: string;
    endTime: string;
    startTemp: number;
    endTemp: number;
    storageTemp: number;
    
    // Final Info
    postExpiryDate: string;
    notes?: string;
}

@Component({
    selector: 'app-abbattimento-log-view',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="pb-20 animate-fade-in relative px-2 space-y-6">
        
        <!-- Premium Header -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div class="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none"></div>
            
            <div class="flex items-center gap-5 relative z-10 w-full md:w-auto">
                <div class="h-14 w-14 shrink-0 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md">
                    <i class="fa-solid fa-icicles text-2xl"></i>
                </div>
                <div>
                    <h2 class="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">Registro Processo Abbattimento</h2>
                    <p class="text-[10px] sm:text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">Monitoraggio obbligatorio cicli di abbattimento rapido.</p>
                </div>
            </div>

            @if (!state.hasAbbattitore()) {
                <div class="bg-amber-50 border border-amber-100 px-4 py-2 rounded-xl flex items-center gap-3 animate-pulse shadow-sm">
                    <i class="fa-solid fa-triangle-exclamation text-amber-500"></i>
                    <span class="text-[10px] font-black text-amber-700 uppercase tracking-widest leading-tight">
                        Nessun abbattitore censito per questa azienda.<br>
                        <span class="opacity-70 text-[8px]">Abilitazione bloccata.</span>
                    </span>
                </div>
            } @else {
                <div class="hidden md:flex items-center gap-3 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
                    <i class="fa-solid fa-check-circle"></i>
                    <span class="text-[10px] font-black uppercase tracking-widest">Macchina Censita ed Operativa</span>
                </div>
            }
        </div>

        @if (isEditing()) {
            <!-- CREATION/EDITING VIEW -->
            <div class="max-w-4xl mx-auto space-y-6 animate-slide-up">
                <div class="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-8">
                    
                    <!-- Section 1: Product Selection (Pantry Link) -->
                    <div class="space-y-4">
                        <h3 class="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500">1</span>
                            Dispensa Attiva: Selezione Prodotto
                        </h3>
                        
                        <div class="relative">
                            <div class="relative">
                                <i class="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                <input type="text" [(ngModel)]="searchQuery" (ngModelChange)="onSearchChange($event)"
                                       placeholder="Cerca prodotto per nome, lotto o fornitore..."
                                       class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-12 py-4 text-lg font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 outline-none transition-all shadow-inner">
                            </div>

                            @if (pantryMatches().length > 0) {
                                <div class="absolute z-[100] left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-slide-up max-h-64 overflow-y-auto">
                                    <div class="px-4 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">Risultati in Dispensa</div>
                                    @for (match of pantryMatches(); track match.id) {
                                        <button (click)="selectProduct(match)" 
                                                class="w-full px-6 py-4 text-left hover:bg-indigo-50 flex items-center justify-between group transition-colors border-b border-slate-50 last:border-0">
                                            <div class="flex flex-col">
                                                <span class="text-sm font-bold text-slate-800 group-hover:text-indigo-600">{{ match.ingredientName }}</span>
                                                <div class="flex items-center gap-3 mt-1">
                                                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded">{{ match.supplierName }}</span>
                                                    <span class="text-[9px] font-mono font-bold text-indigo-500">Lotto: {{ match.lotto }}</span>
                                                </div>
                                            </div>
                                            <i class="fa-solid fa-plus-circle text-slate-200 group-hover:text-indigo-500 transition-all text-xl"></i>
                                        </button>
                                    }
                                </div>
                            }
                        </div>

                        @if (currentRecord.productName) {
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <div class="space-y-1">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Prodotto</label>
                                    <p class="text-sm font-bold text-slate-800">{{ currentRecord.productName }}</p>
                                </div>
                                <div class="space-y-1">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Fornitore</label>
                                    <p class="text-sm font-bold text-indigo-600 truncate">{{ currentRecord.supplierName || '—' }}</p>
                                </div>
                                <div class="space-y-1">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Lotto Originale</label>
                                    <p class="text-sm font-mono font-bold text-slate-700 truncate">{{ currentRecord.originalLotto || '—' }}</p>
                                </div>
                                <div class="space-y-1">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Scadenza Orig.</label>
                                    <p class="text-sm font-bold text-rose-600">{{ (currentRecord.originalExpiryDate | date:'dd/MM/yyyy') || '—' }}</p>
                                </div>
                            </div>
                        }
                    </div>

                    <!-- Section 2: Process Parameters -->
                    <div class="space-y-4">
                        <h3 class="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500">2</span>
                            Registrazione Parametri Processo
                        </h3>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <!-- Temp Section -->
                            <div class="space-y-6">
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="space-y-1.5">
                                        <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Temp. Inizio Ciclo</label>
                                        <div class="relative">
                                            <input type="number" [(ngModel)]="currentRecord.startTemp"
                                                   class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-lg font-bold text-slate-800 focus:bg-white focus:border-indigo-400 outline-none shadow-sm transition-all">
                                            <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">°C</span>
                                        </div>
                                    </div>
                                    <div class="space-y-1.5">
                                        <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Temp. Fine Ciclo</label>
                                        <div class="relative">
                                            <input type="number" [(ngModel)]="currentRecord.endTemp" (ngModelChange)="checkEndTemp($event)"
                                                   class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-lg font-bold text-slate-800 focus:bg-white outline-none shadow-sm transition-all"
                                                   [class.border-emerald-400]="currentRecord.endTemp! <= 3"
                                                   [class.border-rose-400]="currentRecord.endTemp! > 3">
                                            <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">°C</span>
                                        </div>
                                        @if (currentRecord.endTemp! > 3) {
                                            <div class="mt-2 flex items-center gap-1.5 text-rose-500 animate-pulse">
                                                <i class="fa-solid fa-circle-exclamation text-[10px]"></i>
                                                <span class="text-[9px] font-black uppercase tracking-tight">Limite Critico Superato (> 3°C)</span>
                                            </div>
                                        }
                                    </div>
                                </div>
                                <div class="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-center gap-4">
                                    <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center text-indigo-500 shrink-0 shadow-sm">
                                        <i class="fa-solid fa-temperature-low"></i>
                                    </div>
                                    <p class="text-[11px] font-bold text-indigo-700 leading-tight">
                                        Lo standard HACCP richiede il raggiungimento di una temperatura interna di <span class="font-black underline">+3°C</span> entro 90 minuti.
                                    </p>
                                </div>
                            </div>

                            <!-- Time Section -->
                            <div class="grid grid-cols-2 gap-4">
                                <div class="space-y-1.5">
                                    <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Ora Inizio</label>
                                    <input type="time" [(ngModel)]="currentRecord.startTime"
                                           class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-lg font-bold text-slate-800 focus:bg-white focus:border-indigo-400 outline-none shadow-sm transition-all">
                                </div>
                                <div class="space-y-1.5">
                                    <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Ora Fine</label>
                                    <input type="time" [(ngModel)]="currentRecord.endTime"
                                           class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-lg font-bold text-slate-800 focus:bg-white focus:border-indigo-400 outline-none shadow-sm transition-all">
                                </div>
                                <div class="col-span-2 space-y-1.5">
                                    <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Data Acquisto / Carico (Originale)</label>
                                    <input type="date" [(ngModel)]="currentRecord.purchaseDate"
                                           class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:bg-white outline-none shadow-sm transition-all">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Section 3: Final Disposition -->
                    <div class="space-y-4">
                        <h3 class="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500">3</span>
                            Dati di Conservazione Post-Abbattimento
                        </h3>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="space-y-1.5">
                                <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Temp. di Conservazione Finale</label>
                                <div class="relative">
                                    <input type="number" [(ngModel)]="currentRecord.storageTemp"
                                           class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-lg font-bold text-slate-800 focus:bg-white focus:border-indigo-400 outline-none shadow-sm transition-all">
                                    <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">°C</span>
                                </div>
                            </div>
                            <div class="space-y-1.5">
                                <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nuova Data di Scadenza</label>
                                <input type="date" [(ngModel)]="currentRecord.postExpiryDate"
                                       class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-lg font-bold text-slate-800 focus:bg-white focus:border-indigo-400 outline-none shadow-sm transition-all">
                            </div>
                        </div>
                    </div>

                    <div class="pt-6 border-t border-slate-100 flex gap-4">
                        <button (click)="isEditing.set(false)" 
                                class="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">
                            Annulla
                        </button>
                        <button (click)="saveRecord()" [disabled]="!currentRecord.productName"
                                class="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all disabled:opacity-50 flex items-center justify-center gap-3 px-4">
                            <i class="fa-solid fa-save text-lg hidden md:inline-block"></i>
                            <span class="truncate">Conferma e Archivia Processo</span>
                        </button>
                    </div>
                </div>
            </div>

        } @else {
            <!-- HISTORY VIEW -->
            <div class="space-y-6 animate-fade-in">
                <div class="flex flex-wrap justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm gap-4">
                    <div class="flex items-center gap-4">
                        <div class="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
                            <i class="fa-solid fa-history"></i>
                        </div>
                        <div>
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Archivio Cicli - {{ state.filterDate() | date:'dd/MM/yyyy' }}</p>
                            <h3 class="text-lg font-bold text-slate-800 tracking-tight">{{ filteredRecords().length }} Registrazioni</h3>
                        </div>
                    </div>
                    
                    <button (click)="startNew()" [disabled]="!state.hasAbbattitore()"
                            class="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-3 disabled:opacity-50 active:scale-95">
                        <i class="fa-solid fa-plus-circle text-lg"></i> Nuovo Ciclo Abbattimento
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    @for (rec of filteredRecords(); track rec.id) {
                        <div class="bg-white rounded-3xl p-7 border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col h-full group relative overflow-hidden">
                            @if (rec.endTemp > 3) {
                                <div class="absolute top-0 right-0 px-4 py-2 bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest rounded-bl-2xl shadow-lg flex items-center gap-2">
                                    <i class="fa-solid fa-circle-exclamation animate-pulse"></i> Non Conforme
                                </div>
                            } @else {
                                <div class="absolute top-0 right-0 px-4 py-2 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-bl-2xl shadow-sm">
                                    Conforme
                                </div>
                            }
                            
                            <div class="flex justify-between items-start mb-6">
                                <span class="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold border border-slate-200 uppercase tracking-tight">Lotto: {{ rec.originalLotto }}</span>
                                <span class="text-[10px] text-slate-400 font-bold uppercase">{{ rec.recordedDate | date:'dd/MM/yyyy HH:mm' }}</span>
                            </div>

                            <h3 class="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors leading-tight">{{ rec.productName }}</h3>
                            <p class="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-6">{{ rec.supplierName }}</p>

                            <div class="grid grid-cols-2 gap-4 mb-6">
                                <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                    <p class="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Processo</p>
                                    <p class="text-sm font-bold text-slate-700 flex items-center justify-center gap-1.5">
                                        <i class="fa-regular fa-clock text-[10px] opacity-40"></i> {{ rec.startTime }} - {{ rec.endTime }}
                                    </p>
                                </div>
                                <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                    <p class="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Temperature</p>
                                    <p class="text-sm font-bold" [class.text-rose-600]="rec.endTemp > 3" [class.text-emerald-600]="rec.endTemp <= 3">
                                        {{ rec.startTemp }}° <i class="fa-solid fa-arrow-right text-[8px] opacity-40 mx-0.5"></i> {{ rec.endTemp }}°C
                                    </p>
                                </div>
                            </div>

                            <div class="mt-auto pt-6 border-t border-slate-50 flex justify-between items-center">
                                <div class="flex flex-col">
                                    <span class="text-[9px] font-black text-slate-300 uppercase tracking-widest">Nuova Scadenza</span>
                                    <span class="text-xs font-bold text-slate-600">{{ (rec.postExpiryDate | date:'dd/MM/yyyy') || 'Non definita' }}</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <button (click)="openPrintModal(rec)" class="w-10 h-10 rounded-xl text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center justify-center border border-transparent hover:border-blue-100">
                                        <i class="fa-solid fa-print"></i>
                                    </button>
                                    <button (click)="editRecord(rec)" class="w-10 h-10 rounded-xl text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center justify-center border border-transparent hover:border-indigo-100">
                                        <i class="fa-solid fa-pen"></i>
                                    </button>
                                    <button (click)="showDeleteModal(rec.id)" class="w-10 h-10 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center justify-center border border-transparent hover:border-rose-100">
                                        <i class="fa-solid fa-trash-can"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    } @empty {
                        <div class="col-span-full py-32 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
                            <div class="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
                                <i class="fa-solid fa-icicles text-slate-200 text-4xl"></i>
                            </div>
                            <h3 class="text-slate-500 font-bold uppercase tracking-widest text-sm mb-2">Nessuna registrazione in questa data</h3>
                            <p class="text-slate-400 text-xs font-medium">Usa il calendario in alto per visualizzare altri giorni o registra un nuovo ciclo.</p>
                        </div>
                    }
                </div>
            </div>
        }

        <!-- Delete Confirmation Modal -->
        @if (pendingDeleteId()) {
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" (click)="pendingDeleteId.set(null)"></div>
                <div class="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative z-10 animate-slide-up border border-white/20 p-6 text-center">
                    <div class="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-200 shadow-inner">
                        <i class="fa-solid fa-triangle-exclamation text-2xl animate-pulse"></i>
                    </div>
                    <h3 class="text-xl font-black text-slate-800 tracking-tight mb-2">Conferma Eliminazione</h3>
                    <p class="text-sm text-slate-500 mb-6 leading-relaxed">Sei sicuro di voler eliminare questa registrazione? L'azione non è annullabile.</p>
                    <div class="flex gap-3">
                        <button (click)="pendingDeleteId.set(null)" class="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">Annulla</button>
                        <button (click)="confirmDelete()" class="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all shadow-md shadow-rose-200">Elimina</button>
                    </div>
                </div>
            </div>
        }

        <!-- LABEL PREVIEW MODAL -->
        @if (selectedRecordForPrint()) {
            <div class="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" (click)="selectedRecordForPrint.set(null)"></div>
                
                <div class="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
                    <div class="px-6 py-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <h3 class="text-xs font-black text-slate-800 uppercase tracking-widest">Anteprima Etichetta</h3>
                            <div class="flex bg-white rounded-lg p-0.5 border border-slate-200 shadow-sm">
                                <button (click)="labelFormat.set('62mm')" [class]="'px-3 py-1 text-[9px] font-bold rounded-md transition-all ' + (labelFormat() === '62mm' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50')">62mm</button>
                                <button (click)="labelFormat.set('29x90')" [class]="'px-3 py-1 text-[9px] font-bold rounded-md transition-all ' + (labelFormat() === '29x90' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50')">29x90mm</button>
                            </div>
                        </div>
                        <button (click)="selectedRecordForPrint.set(null)" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div class="p-8 bg-slate-50 flex justify-center items-center overflow-auto min-h-[300px]">
                        @if (labelFormat() === '62mm') {
                            <!-- PREVIEW: 62mm Format -->
                            <div id="print-label-preview-62" class="bg-white border-2 border-slate-300 p-3 font-sans text-black w-[280px] shadow-sm flex flex-col">
                                <div class="text-center border-b-2 border-black pb-2 mb-2">
                                    <h1 class="m-0 text-lg font-black uppercase leading-tight tracking-tight">SAI FAST HACCP</h1>
                                    <p class="m-0 text-[10px] font-bold uppercase tracking-widest">Processo Abbattimento</p>
                                </div>
                                
                                <div class="flex flex-col gap-2 flex-1">
                                    <div>
                                        <div class="text-[9px] font-black uppercase tracking-widest text-slate-500">Prodotto Abbattuto</div>
                                        <div class="text-[16px] font-black leading-tight">{{ selectedRecordForPrint()?.productName }}</div>
                                    </div>
                                    
                                    <div class="flex justify-between border-t border-dashed border-slate-300 pt-2">
                                        <div>
                                            <div class="text-[9px] font-black uppercase tracking-widest text-slate-500">Lotto Orig.</div>
                                            <div class="text-sm font-bold font-mono">{{ selectedRecordForPrint()?.originalLotto || 'N.D.' }}</div>
                                        </div>
                                        <div class="text-right">
                                            <div class="text-[9px] font-black uppercase tracking-widest text-slate-500">Scad. Orig.</div>
                                            <div class="text-sm font-bold">{{ selectedRecordForPrint()?.originalExpiryDate ? (selectedRecordForPrint()?.originalExpiryDate | date:'dd/MM/yy') : 'N.D.' }}</div>
                                        </div>
                                    </div>
                                    
                                    <div class="border-t border-dashed border-slate-300 pt-2">
                                        <div class="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Parametri Ciclo ({{ selectedRecordForPrint()?.recordedDate | date:'dd/MM/yy' }})</div>
                                        <div class="text-[10px] flex justify-between font-bold">
                                            <span>Orario: {{ selectedRecordForPrint()?.startTime }}-{{ selectedRecordForPrint()?.endTime }}</span>
                                            <span>Temp: {{ selectedRecordForPrint()?.startTemp }}° &rarr; {{ selectedRecordForPrint()?.endTemp }}°C</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="mt-3 pt-3 border-t-2 border-black text-center bg-slate-50 rounded-lg pb-1">
                                    <div class="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Nuova Scadenza</div>
                                    <div class="text-xl font-black">{{ selectedRecordForPrint()?.postExpiryDate ? (selectedRecordForPrint()?.postExpiryDate | date:'dd/MM/yyyy') : 'N.D.' }}</div>
                                    <div class="text-[9px] font-bold mt-1 text-slate-600">Conservare a: {{ selectedRecordForPrint()?.storageTemp }}°C</div>
                                </div>
                            </div>
                        } @else {
                            <!-- PREVIEW: 29x90mm Format -->
                            <div id="print-label-preview-29" class="bg-white border-2 border-slate-300 font-sans text-black w-[340px] h-[110px] flex flex-row overflow-hidden p-2 shadow-sm">
                                <!-- LEFT COLUMN -->
                                <div class="flex-[1.4] flex flex-col min-w-0 pr-3 border-r border-black">
                                    <div class="text-[7px] font-black uppercase text-slate-500 mb-0.5">Abbattimento - {{ selectedRecordForPrint()?.recordedDate | date:'dd/MM/yy' }}</div>
                                    <div class="text-[12px] font-black uppercase leading-tight line-clamp-2">{{ selectedRecordForPrint()?.productName }}</div>
                                    
                                    <div class="mt-auto pb-1">
                                        <div class="text-[8px] flex items-baseline gap-1"><span class="font-bold text-slate-500 uppercase">Lotto:</span> <span class="font-mono font-black">{{ selectedRecordForPrint()?.originalLotto || 'N.D.' }}</span></div>
                                        <div class="text-[8px] flex items-baseline gap-1"><span class="font-bold text-slate-500 uppercase">Ciclo:</span> <span class="font-black">{{ selectedRecordForPrint()?.startTime }}-{{ selectedRecordForPrint()?.endTime }} ({{ selectedRecordForPrint()?.endTemp }}°C)</span></div>
                                    </div>
                                </div>

                                <!-- RIGHT COLUMN -->
                                <div class="flex-1 flex flex-col justify-center pl-3 text-center">
                                    <div class="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1">Scadenza</div>
                                    <div class="text-lg font-black leading-none bg-black text-white py-1.5 rounded">{{ selectedRecordForPrint()?.postExpiryDate ? (selectedRecordForPrint()?.postExpiryDate | date:'dd/MM/yy') : 'N.D.' }}</div>
                                    <div class="text-[7px] font-bold mt-2 uppercase text-slate-600">Cons: {{ selectedRecordForPrint()?.storageTemp }}°C</div>
                                </div>
                            </div>
                        }
                    </div>
                    
                    <div class="p-6 bg-white border-t border-slate-100 flex flex-wrap gap-4">
                        <button (click)="selectedRecordForPrint.set(null)" class="flex-1 py-3 bg-slate-50 text-slate-600 rounded-xl font-black text-xs uppercase hover:bg-slate-100">Chiudi</button>
                        <button (click)="printLabel(selectedRecordForPrint()!, labelFormat())" class="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase hover:bg-indigo-700 shadow-lg flex items-center justify-center gap-2">
                            <i class="fa-solid fa-print"></i> Stampa Etichetta
                        </button>
                    </div>
                </div>
            </div>
        }
    </div>
    `,
    styles: [`
        .animate-fade-in { animation: fadeIn 0.6s ease-out; }
        .animate-slide-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
    `]
})
export class AbbattimentoLogViewComponent {
    state = inject(AppStateService);
    toast = inject(ToastService);

    isEditing = signal(false);
    searchQuery = '';
    pantryMatches = signal<any[]>([]);
    
    currentRecord: Partial<AbbattimentoRecord> = {};
    
    pendingDeleteId = signal<string | null>(null);
    selectedRecordForPrint = signal<AbbattimentoRecord | null>(null);
    labelFormat = signal<'62mm' | '29x90'>('62mm');

    filteredRecords = computed(() => {
        const targetClientId = this.state.activeTargetClientId();
        const raw = this.state.getGlobalRecord('abbattimento_log') || [];
        const currentFilterDate = this.state.filterDate(); // Format: YYYY-MM-DD
        
        return (raw as AbbattimentoRecord[]).filter(r => {
            const isTargetClient = !targetClientId || r.clientId === targetClientId;
            const recordDate = r.recordedDate.split('T')[0];
            return isTargetClient && recordDate === currentFilterDate;
        });
    });

    onSearchChange(val: string) {
        if (!val || val.length < 2) {
            this.pantryMatches.set([]);
            return;
        }
        
        const q = val.toLowerCase();
        const pantry = (this.state.getGlobalRecord('ddt_pantry') || []) as any[];
        const clientId = this.state.activeTargetClientId();
        const today = new Date().toISOString().split('T')[0];

        const matches = pantry
            .filter(i => 
                i.ingredientName?.toLowerCase().includes(q) || 
                i.lotto?.toLowerCase().includes(q) || 
                i.supplierName?.toLowerCase().includes(q)
            )
            .filter(i => !clientId || i.clientId === clientId)
            .filter(i => !i.expiryDate || i.expiryDate >= today)
            .slice(0, 6);
        
        this.pantryMatches.set(matches);
    }

    selectProduct(item: any) {
        this.currentRecord.productName = item.ingredientName;
        this.currentRecord.originalLotto = item.lotto || '';
        this.currentRecord.purchaseDate = item.entryDate || item.date || '';
        this.currentRecord.originalExpiryDate = item.expiryDate || '';
        this.currentRecord.supplierName = item.supplierName || '';
        
        this.pantryMatches.set([]);
        this.searchQuery = item.ingredientName;
        
        this.toast.success('Dati Acquisiti', `${item.ingredientName} — Fornitore e Lotto caricati correttamente.`);
    }

    checkEndTemp(val: number) {
        if (val > 3) {
            this.toast.error('HACCP ALLERTA', 'Attenzione: la temperatura finale eccede il limite di +3°C.');
        }
    }

    startNew() {
        if (!this.state.hasAbbattitore()) {
            this.toast.error('Azione Inibita', 'Configurare prima un abbattitore nel censimento attrezzature.');
            return;
        }

        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const mins = now.getMinutes().toString().padStart(2, '0');
        
        this.currentRecord = {
            id: Math.random().toString(36).substring(2, 9),
            clientId: this.state.activeTargetClientId(),
            userId: this.state.currentUser()?.id || 'demo',
            recordedDate: now.toISOString(),
            startTime: `${hours}:${mins}`,
            endTime: `${(now.getHours() + 1).toString().padStart(2, '0')}:${mins}`,
            startTemp: 65,
            endTemp: 3,
            storageTemp: 4,
            purchaseDate: now.toISOString().split('T')[0],
            postExpiryDate: ''
        };
        
        this.searchQuery = '';
        this.pantryMatches.set([]);
        this.isEditing.set(true);
    }

    async saveRecord() {
        if (!this.currentRecord.productName) {
            this.toast.error('Dati mancanti', 'Selezionare un prodotto dalla dispensa.');
            return;
        }

        const currentLog = (this.state.getGlobalRecord('abbattimento_log') || []) as AbbattimentoRecord[];
        
        // Check if editing existing or adding new
        const existingIndex = currentLog.findIndex(r => r.id === this.currentRecord.id);
        
        let updatedLog;
        if (existingIndex >= 0) {
            updatedLog = [...currentLog];
            updatedLog[existingIndex] = this.currentRecord as AbbattimentoRecord;
            this.toast.success('Archiviato', 'Processo di abbattimento modificato con successo.');
        } else {
            updatedLog = [this.currentRecord as AbbattimentoRecord, ...currentLog];
            this.toast.success('Archiviato', 'Nuovo processo di abbattimento registrato con successo.');
        }
        
        // Update pantry expiry date if postExpiryDate is provided
        if (this.currentRecord.postExpiryDate) {
            const pantry = (this.state.getGlobalRecord('ddt_pantry') || []) as any[];
            let pantryUpdated = false;
            
            for (let i = 0; i < pantry.length; i++) {
                if (pantry[i].ingredientName === this.currentRecord.productName && 
                   (!this.currentRecord.originalLotto || pantry[i].lotto === this.currentRecord.originalLotto) &&
                   (!this.currentRecord.supplierName || pantry[i].supplierName === this.currentRecord.supplierName)) {
                    pantry[i].expiryDate = this.currentRecord.postExpiryDate;
                    pantryUpdated = true;
                }
            }
            
            if (pantryUpdated) {
                await this.state.saveGlobalRecord('ddt_pantry', pantry);
            }
        }
        
        await this.state.saveGlobalRecord('abbattimento_log', updatedLog);
        this.isEditing.set(false);
    }

    editRecord(rec: AbbattimentoRecord) {
        this.currentRecord = { ...rec };
        this.searchQuery = rec.productName;
        this.isEditing.set(true);
    }

    showDeleteModal(id: string) {
        this.pendingDeleteId.set(id);
    }

    async confirmDelete() {
        const id = this.pendingDeleteId();
        if (!id) return;
        
        const currentLog = (this.state.getGlobalRecord('abbattimento_log') || []) as AbbattimentoRecord[];
        const updatedLog = currentLog.filter(r => r.id !== id);
        await this.state.saveGlobalRecord('abbattimento_log', updatedLog);
        
        this.toast.info('Eliminato', 'La registrazione è stata rimossa.');
        this.pendingDeleteId.set(null);
    }

    openPrintModal(rec: AbbattimentoRecord) {
        this.selectedRecordForPrint.set(rec);
    }

    printLabel(rec: AbbattimentoRecord, format: '62mm' | '29x90') {
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
                        <div>
                            <div style="font-size: 7pt; font-weight: bold; text-transform: uppercase;">Prodotto Abbattuto</div>
                            <div style="font-size: 14pt; font-weight: 900; line-height: 1.1;">${rec.productName}</div>
                        </div>
                        
                        <div style="display:flex; justify-content: space-between; border-top: 1px dashed #ccc; padding-top: 2mm;">
                            <div>
                                <div style="font-size: 7pt; font-weight: bold; text-transform: uppercase;">Lotto Orig.</div>
                                <div style="font-size: 11pt; font-weight: bold;">${rec.originalLotto || 'N.D.'}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 7pt; font-weight: bold; text-transform: uppercase;">Scad. Orig.</div>
                                <div style="font-size: 11pt; font-weight: bold;">${rec.originalExpiryDate ? new Date(rec.originalExpiryDate).toLocaleDateString('it-IT') : 'N.D.'}</div>
                            </div>
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
            // 90x29mm format: name wrapped, expiry wider on the right
            printContent = `
                <div id="print-label-sticker" style="font-family: Arial, sans-serif; background:white;">
                    <!-- Left side: Info -->
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
                    <!-- Right side: Expiry (Wider) -->
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
            <html>
                <head>
                    <title></title>
                    <style>
                        * { box-sizing: border-box !important; }
                        ${pageCss}
                    </style>
                </head>
                <body>
                    ${printContent}
                    <script>
                        window.onload = function() {
                            setTimeout(() => {
                                window.print();
                                setTimeout(() => window.parent.document.getElementById('print-iframe').remove(), 1000);
                            }, 500);
                        };
                    </script>
                </body>
            </html>
        `);
        doc.close();
    }
}
