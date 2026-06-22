
import { Component, inject, signal, computed, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { AppStateService, AppDocument } from '../services/app-state.service';
import { ToastService } from '../services/toast.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-microbio-monitor-view',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="animate-fade-in px-2 relative space-y-6 pb-24 max-w-7xl mx-auto">
        <!-- Premium Laboratory Header -->
        <div class="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div class="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-violet-50 to-transparent pointer-events-none"></div>
            
            <div class="flex items-center gap-6 relative z-10 w-full md:w-auto">
                <div class="h-16 w-16 bg-violet-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                    <i class="fa-solid fa-vial-virus text-2xl"></i>
                </div>
                <div>
                    <h2 class="text-2xl md:text-3xl font-black text-slate-800 tracking-tight leading-none mb-2">Analisi Biologiche</h2>
                    <p class="text-xs font-bold text-slate-500 uppercase tracking-widest">Rapporti e Tamponi Lab</p>
                </div>
            </div>

            <button (click)="openUploadModal()" class="relative z-10 w-full md:w-auto px-8 py-4 bg-violet-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-violet-700 transition-all shadow-xl shadow-violet-100 flex items-center justify-center gap-3 active:scale-95">
                <i class="fa-solid fa-cloud-arrow-up text-base"></i> NUOVO CARICAMENTO
            </button>
        </div>

        <!-- Search Bar -->
        <div class="bg-white p-4 md:p-6 rounded-[1.5rem] border border-slate-200 shadow-sm">
            <div class="relative w-full">
                <i class="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input type="text" 
                       [(ngModel)]="searchQuery"
                       placeholder="Cerca per nome file o data..." 
                       class="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-100 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm font-bold shadow-inner bg-slate-50/50">
            </div>
        </div>

        <!-- MOBILE CARDS (Hidden on Desktop) -->
        <div class="md:hidden space-y-4">
            @if (state.isAdmin() && !state.filterClientId()) {
                <div class="bg-white rounded-[2rem] p-8 text-center border border-amber-100 shadow-sm">
                    <div class="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-500 border border-amber-100">
                        <i class="fa-solid fa-user-gear text-2xl"></i>
                    </div>
                    <h3 class="text-lg font-black text-slate-800 mb-2 uppercase">Azienda non selezionata</h3>
                    <p class="text-xs text-slate-500 mb-6">Seleziona un'azienda dal menu in alto per visualizzare i rapporti.</p>
                </div>
            } @else {
                @for (doc of filteredDocs(); track doc.id) {
                    <div class="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm animate-slide-up group">
                        <div class="flex items-start gap-4 mb-6">
                            <div [class]="'w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border ' + (isImage(doc.fileType) ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-rose-50 border-rose-100 text-rose-600')">
                                @if (isImage(doc.fileType) && doc.fileData) {
                                    <img [src]="getSafeFileData(doc)" class="w-full h-full object-cover rounded-xl">
                                } @else {
                                    <i class="fa-solid text-2xl" [class.fa-file-pdf]="isPdf(doc.fileType)" [class.fa-file-lines]="!isPdf(doc.fileType)"></i>
                                }
                            </div>
                            <div class="min-w-0 flex-1">
                                <p class="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{{ doc.uploadDate | date:'dd/MM/yyyy' }}</p>
                                <h4 class="text-base font-black text-slate-800 leading-tight mb-2 truncate" [title]="getDisplayFileName(doc.fileName)">{{ getDisplayFileName(doc.fileName) }}</h4>
                                <span class="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[8px] font-black uppercase tracking-widest border border-slate-200">
                                    {{ doc.fileType.split('/')[1]?.toUpperCase() || 'FILE' }} • {{ getFileSize(doc.fileName) }}
                                </span>
                            </div>
                        </div>

                        <!-- MOBILE ACTIONS -->
                        <div class="grid grid-cols-4 gap-2 pt-4 border-t border-slate-50">
                            <button (click)="previewFile(doc)" class="flex flex-col items-center justify-center py-3 bg-violet-50 text-violet-600 rounded-2xl transition-all active:scale-95">
                                <i class="fa-solid fa-eye text-lg"></i>
                                <span class="text-[8px] font-black uppercase mt-1">Vedi</span>
                            </button>
                            <button (click)="downloadDoc(doc)" class="flex flex-col items-center justify-center py-3 bg-blue-50 text-blue-600 rounded-2xl transition-all active:scale-95">
                                <i class="fa-solid fa-download text-lg"></i>
                                <span class="text-[8px] font-black uppercase mt-1">Salva</span>
                            </button>
                            <button (click)="renameFile(doc)" class="flex flex-col items-center justify-center py-3 bg-amber-50 text-amber-600 rounded-2xl transition-all active:scale-95">
                                <i class="fa-solid fa-pen text-lg"></i>
                                <span class="text-[8px] font-black uppercase mt-1">Rinomina</span>
                            </button>
                            <button (click)="askDeleteDoc(doc)" class="flex flex-col items-center justify-center py-3 bg-rose-50 text-rose-600 rounded-2xl transition-all active:scale-95">
                                <i class="fa-solid fa-trash-can text-lg"></i>
                                <span class="text-[8px] font-black uppercase mt-1">Elimina</span>
                            </button>
                        </div>
                    </div>
                } @empty {
                    <div class="py-12 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                        <i class="fa-solid fa-database text-slate-200 text-4xl mb-4"></i>
                        <p class="text-sm font-black text-slate-400 uppercase tracking-widest">Nessun rapporto trovato</p>
                    </div>
                }
            }
        </div>

        <!-- DESKTOP TABLE (Hidden on Mobile) -->
        <div class="hidden md:block bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="bg-slate-50 border-b border-slate-200">
                        <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Data Caricamento</th>
                        <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Documento / Nome Rapporto</th>
                        <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tipo File</th>
                        <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Azioni</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm">
                    @if (state.isAdmin() && !state.filterClientId()) {
                        <tr>
                            <td colspan="4" class="p-12 text-center">
                                <div class="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500 text-3xl border border-amber-100">
                                    <i class="fa-solid fa-user-gear"></i>
                                </div>
                                <h3 class="text-xl font-black text-slate-800 mb-2 uppercase">Azienda non selezionata</h3>
                                <p class="text-sm text-slate-500 max-w-sm mx-auto mb-8">Seleziona un'azienda dal menu in alto per visualizzare i rapporti.</p>
                            </td>
                        </tr>
                    } @else {
                        @for (doc of filteredDocs(); track doc.id) {
                        <tr class="hover:bg-slate-50/50 transition-colors group">
                            <td class="px-8 py-5">
                                <div class="flex flex-col">
                                    <span class="font-black text-slate-800 uppercase text-xs">{{ doc.uploadDate | date:'dd MMM yyyy' }}</span>
                                    <span class="text-[10px] font-bold text-slate-400">{{ doc.uploadDate | date:'HH:mm' }}</span>
                                </div>
                            </td>
                            <td class="px-8 py-5">
                                <div class="flex items-center gap-4">
                                    <div [class]="'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm border ' + (isImage(doc.fileType) ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-rose-50 border-rose-100 text-rose-600')">
                                        @if (isImage(doc.fileType) && doc.fileData) {
                                            <img [src]="getSafeFileData(doc)" class="w-full h-full object-cover rounded-lg">
                                        } @else {
                                            <i class="fa-solid text-xl" [class.fa-file-pdf]="isPdf(doc.fileType)" [class.fa-file-lines]="!isPdf(doc.fileType)"></i>
                                        }
                                    </div>
                                    <div class="min-w-0 pr-4">
                                        <p class="font-black text-slate-800 truncate leading-tight mb-1 uppercase tracking-tight" [title]="getDisplayFileName(doc.fileName)">{{ getDisplayFileName(doc.fileName) }}</p>
                                        <div class="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            <span>Rapporto di prova</span>
                                            @if (getFileSize(doc.fileName)) {
                                                <span class="w-1 h-1 rounded-full bg-slate-200"></span>
                                                <span>{{ getFileSize(doc.fileName) }}</span>
                                            }
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td class="px-8 py-5">
                                <span class="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200">
                                    {{ doc.fileType.split('/')[1]?.toUpperCase() || 'FILE' }}
                                </span>
                            </td>
                            <td class="px-8 py-5 text-right">
                                 <div class="flex items-center justify-end gap-2">
                                    <button (click)="previewFile(doc)" class="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-all border border-transparent hover:border-violet-100 shadow-sm hover:shadow-md" title="Anteprima">
                                        <i class="fa-solid fa-eye text-xs"></i>
                                    </button>
                                    <button (click)="renameFile(doc)" class="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all border border-transparent hover:border-amber-100 shadow-sm hover:shadow-md" title="Rinomina">
                                        <i class="fa-solid fa-pen text-xs"></i>
                                    </button>
                                    <button (click)="downloadDoc(doc)" class="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100 shadow-sm hover:shadow-md" title="Scarica">
                                        <i class="fa-solid fa-download text-xs"></i>
                                    </button>
                                    <div class="w-px h-5 bg-slate-100 mx-1"></div>
                                    <button (click)="askDeleteDoc(doc)" class="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100 shadow-sm hover:shadow-md" title="Elimina">
                                        <i class="fa-solid fa-trash-can text-xs"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                        }
                    }
                </tbody>
            </table>
        </div>
    </div>

    <!-- PREVIEW OVERLAY -->
    @if (previewDoc()) {
        <div class="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" (click)="previewDoc.set(null)"></div>
            <div class="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 animate-slide-up flex flex-col h-[85vh]">
                <div class="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm shrink-0 bg-violet-50 text-violet-600 border-violet-100">
                            <i class="fa-solid fa-vial-virus text-xl"></i>
                        </div>
                        <div class="min-w-0 pr-4">
                            <h4 class="font-black text-slate-800 text-sm truncate uppercase tracking-tight">{{ getDisplayFileName(previewDoc()?.fileName || '') }}</h4>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{{ previewDoc()?.uploadDate | date:'dd MMMM yyyy HH:mm' }}</p>
                        </div>
                    </div>
                    <button (click)="previewDoc.set(null)" class="w-10 h-10 rounded-full bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center border border-slate-200 shadow-sm">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                
                <div class="flex-1 bg-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
                    @if (isImage(previewDoc()?.fileType || '')) {
                        <div class="w-full h-full flex items-center justify-center p-6">
                            <img [src]="getSafeFileData(previewDoc())" class="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/50">
                        </div>
                    } @else if (isPdf(previewDoc()?.fileType || '')) {
                        <iframe [src]="getSafeUrl(getSafeFileData(previewDoc()))" class="w-full h-full border-none shadow-inner bg-white"></iframe>
                    } @else {
                        <div class="text-center p-12">
                            <div class="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl border border-slate-200 text-4xl text-slate-300">
                                 <i class="fa-solid fa-file-circle-exclamation"></i>
                            </div>
                            <h3 class="text-2xl font-black text-slate-800 mb-4 tracking-tight">Anteprima non disponibile</h3>
                            <button (click)="downloadDoc(previewDoc()!)" class="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">Scarica Documento</button>
                        </div>
                    }
                </div>
            </div>
        </div>
    }

    <!-- RENAME MODAL -->
    @if (renamingDoc()) {
        <div class="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md" (click)="renamingDoc.set(null)"></div>
            <div class="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-10 text-center animate-slide-up border border-slate-200">
                <div class="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-8 border border-amber-100 text-3xl shadow-inner">
                    <i class="fa-solid fa-pen-nib"></i>
                </div>
                <h3 class="text-2xl font-black text-slate-800 mb-6 uppercase tracking-tight">Rinomina File</h3>
                
                <div class="mb-8 text-left">
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Nuovo Nome Rapporto</label>
                    <input type="text" 
                           [(ngModel)]="newFileName"
                           class="w-full px-6 py-4 rounded-2xl border border-slate-100 focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 font-black text-slate-700 shadow-inner bg-slate-50">
                </div>
                
                <div class="flex flex-col gap-3">
                    <button (click)="confirmRename()" class="w-full py-4 bg-amber-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-xl shadow-amber-100">Salva Modifiche</button>
                    <button (click)="renamingDoc.set(null)" class="w-full py-4 bg-white border border-slate-200 text-slate-400 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Annulla</button>
                </div>
            </div>
        </div>
    }

    <!-- UPLOAD MODAL -->
    @if (isUploadModalOpen()) {
        <div class="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md" (click)="isUploadModalOpen.set(false)"></div>
            <div class="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up border border-slate-200 flex flex-col">
                <div class="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-lg">
                            <i class="fa-solid fa-cloud-arrow-up text-xl"></i>
                        </div>
                        <div>
                            <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Carica Analisi</h3>
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Nuovo rapporto laboratorio</p>
                        </div>
                    </div>
                    <button (click)="isUploadModalOpen.set(false)" class="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm"><i class="fa-solid fa-xmark"></i></button>
                </div>

                <div class="p-8 space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Data Analisi</label>
                            <input type="date" [(ngModel)]="uploadDate" 
                                   class="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-violet-500/10 outline-none font-black text-slate-700">
                        </div>
                        <div>
                             <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Seleziona File</label>
                             <input type="file" (change)="onFileSelected($event)" id="micro-file-up" class="hidden">
                             <label for="micro-file-up" 
                                    class="w-full py-3 bg-violet-50 text-violet-600 rounded-xl font-black text-[10px] uppercase tracking-widest text-center border border-violet-100 cursor-pointer hover:bg-violet-100 transition-all block">
                                Sfoglia File...
                             </label>
                        </div>
                    </div>

                    @if (selectedFile) {
                        <div class="p-5 bg-violet-50/50 rounded-2xl border border-violet-100 animate-fade-in">
                            <div class="flex items-center gap-4 mb-4">
                                <div class="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-violet-600 shadow-sm border border-violet-100">
                                    <i [class]="isUploadImagePreview ? 'fa-solid fa-image' : 'fa-solid fa-file-pdf'"></i>
                                </div>
                                <div class="min-w-0 flex-1">
                                    <p class="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-0.5">File Selezionato</p>
                                    <p class="text-xs font-black text-slate-800 truncate uppercase">{{ selectedFile.name }}</p>
                                </div>
                            </div>
                            
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Personalizza Nome Rapporto</label>
                            <input type="text" [(ngModel)]="customFileName" 
                                   class="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-violet-500/10 outline-none font-black text-slate-700 shadow-sm">
                        </div>
                    }

                    <div class="flex gap-4 pt-4">
                        <button (click)="isUploadModalOpen.set(false)" 
                                class="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors">Annulla</button>
                        <button (click)="confirmUpload()" 
                                [disabled]="!selectedFile || isSaving()"
                                class="flex-[2] py-4 bg-violet-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-violet-700 transition-all shadow-xl shadow-violet-100 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                            @if (isSaving()) {
                                <i class="fa-solid fa-spinner fa-spin"></i> SALVATAGGIO...
                            } @else {
                                Salva nel Registro
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    }

    <!-- DELETE CONFIRMATION -->
    @if (isDeleteModalOpen()) {
        <div class="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md" (click)="isDeleteModalOpen.set(false)"></div>
            <div class="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-10 text-center animate-slide-up border border-slate-200">
                <div class="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-8 border border-rose-100 text-3xl shadow-inner">
                    <i class="fa-solid fa-trash-can"></i>
                </div>
                <h3 class="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">Elimina Rapporto?</h3>
                <p class="text-xs text-slate-500 mb-8 px-4 font-medium leading-relaxed italic">L'azione è irreversibile e il file verrà rimosso dal cloud.</p>
                
                <div class="flex flex-col gap-3">
                    <button (click)="confirmDelete()" class="w-full py-4 bg-rose-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-100">Sì, Elimina</button>
                    <button (click)="isDeleteModalOpen.set(false)" class="w-full py-4 bg-white border border-slate-200 text-slate-400 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Annulla</button>
                </div>
            </div>
        </div>
    }

    <!-- SELECTION WARNING MODAL -->
    @if (isSelectionWarningModalOpen()) {
        <div class="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md" (click)="isSelectionWarningModalOpen.set(false)"></div>
            <div class="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-10 text-center animate-slide-up border border-slate-200">
                <div class="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-8 border border-amber-100 text-3xl shadow-inner">
                    <i class="fa-solid fa-building-circle-exclamation"></i>
                </div>
                <h3 class="text-2xl font-black text-slate-800 mb-4 uppercase tracking-tight leading-tight">Azienda non Selezionata</h3>
                <p class="text-sm text-slate-500 mb-10 leading-relaxed font-medium">Per caricare le analisi devi prima selezionare un'azienda dal filtro globale in alto.</p>
                <button (click)="isSelectionWarningModalOpen.set(false)" 
                        class="w-full py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl">
                    Ho Capito
                </button>
            </div>
        </div>
    }
    `,
    styles: [`
    .animate-fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-slide-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes slideUp { from { transform: translateY(15%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    `]
})
export class MicrobioMonitorViewComponent implements OnInit {
    state = inject(AppStateService);
    toast = inject(ToastService);
    sanitizer = inject(DomSanitizer);

    ngOnInit() {
        this.state.refreshAllData();
    }

    searchQuery = '';
    previewDoc = signal<AppDocument | null>(null);
    renamingDoc = signal<AppDocument | null>(null);
    newFileName = '';
    isDeleteModalOpen = signal(false);
    docToDelete = signal<AppDocument | null>(null);

    microBioDocs = computed(() => {
        return [...this.state.microbioDocuments()].sort((a, b) => 
            new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
        );
    });

    filteredDocs = computed(() => {
        const query = (this.searchQuery || '').toLowerCase();
        if (!query) return this.microBioDocs();
        
        return this.microBioDocs().filter(d => {
            const dateStr = new Date(d.uploadDate).toLocaleDateString('it-IT');
            return d.fileName.toLowerCase().includes(query) || dateStr.includes(query);
        });
    });

    isSelectionWarningModalOpen = signal(false);
    isSaving = signal(false);
    isUploadModalOpen = signal(false);
    uploadDate = new Date().toISOString().split('T')[0];
    selectedFile: File | null = null;
    customFileName = '';
    uploadFilePreview = '';
    isUploadImagePreview = false;
    isUploadPdfPreview = false;

    openUploadModal() {
        if (this.state.isAdmin() && !this.state.filterClientId()) {
            this.isSelectionWarningModalOpen.set(true);
            return;
        }
        this.isUploadModalOpen.set(true);
        this.selectedFile = null;
        this.customFileName = '';
        this.uploadFilePreview = '';
        this.uploadDate = new Date().toISOString().split('T')[0];
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                this.toast.error('File troppo grande', 'Il file supera 10MB.');
                return;
            }
            this.selectedFile = file;
            this.customFileName = file.name;
            this.isUploadImagePreview = file.type.startsWith('image/');
            this.isUploadPdfPreview = file.type === 'application/pdf';

            if (this.isUploadImagePreview) {
                const reader = new FileReader();
                reader.onload = (e: any) => this.uploadFilePreview = e.target.result;
                reader.readAsDataURL(file);
            }
        }
    }

    async confirmUpload() {
        if (!this.selectedFile) return;
        this.isSaving.set(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e: any) => {
                await this.state.saveDocument({
                    clientId: '', 
                    category: 'microbio',
                    type: 'microbio-analisi',
                    fileName: `${this.customFileName || this.selectedFile!.name}|${this.selectedFile!.size}`,
                    fileType: this.selectedFile!.type,
                    fileData: e.target.result,
                    uploadDate: new Date(this.uploadDate),
                    userId: this.state.currentUser()?.id || 'system'
                });
                this.isSaving.set(false);
                this.isUploadModalOpen.set(false);
                this.toast.success('Salvato', 'Rapporto archiviato.');
            };
            reader.readAsDataURL(this.selectedFile);
        } catch (err) {
            this.isSaving.set(false);
            this.toast.error('Errore', 'Caricamento fallito.');
        }
    }

    constructor() {
        effect(() => {
            const docs = this.state.microbioDocuments();
            this.autoLoadImagePreviews(docs);
        }, { allowSignalWrites: true });
    }

    private autoLoadImagePreviews(docs: AppDocument[]) {
        const imagesToLoad = docs.filter(d => this.isImage(d.fileType) && !d.fileData && this.getFileSizeRaw(d.fileName) < 1024 * 1024);
        if (imagesToLoad.length > 0) this.processImageQueue(imagesToLoad);
    }

    private async processImageQueue(docs: AppDocument[]) {
        for (const doc of docs) {
            if (!doc.fileData) await this.state.fetchDocumentData(doc.id);
        }
    }

    private getFileSizeRaw(name: string): number {
        if (!name || !name.includes('|')) return 0;
        return parseInt(name.split('|')[1], 10) || 0;
    }

    getSafeFileData(doc: AppDocument | null): string {
        if (!doc || !doc.fileData) return '';
        if (doc.fileData.startsWith('data:')) return doc.fileData;
        return `data:${doc.fileType};base64,${doc.fileData}`;
    }

    async previewFile(doc: AppDocument) {
        if (!doc.fileData) {
            this.toast.info('Caricamento...', 'Download dal cloud.');
            const data = await this.state.fetchDocumentData(doc.id);
            if (data) {
                const finalData = data.startsWith('data:') ? data : `data:${doc.fileType};base64,${data}`;
                this.previewDoc.set({ ...doc, fileData: finalData });
            }
        } else {
            const finalData = doc.fileData.startsWith('data:') ? doc.fileData : `data:${doc.fileType};base64,${doc.fileData}`;
            this.previewDoc.set({ ...doc, fileData: finalData });
        }
    }

    renameFile(doc: AppDocument) {
        this.renamingDoc.set(doc);
        this.newFileName = this.getDisplayFileName(doc.fileName);
    }

    confirmRename() {
        if (this.renamingDoc() && this.newFileName) {
            this.state.updateDocumentName(this.renamingDoc()!.id, this.newFileName);
            this.renamingDoc.set(null);
        }
    }

    async downloadDoc(doc: AppDocument | null) {
        if (!doc) return;
        let fileData = doc.fileData;
        if (!fileData) {
            const data = await this.state.fetchDocumentData(doc.id);
            if (data) {
                fileData = data;
                doc.fileData = data; // Cache locale
            }
        }
        if (!fileData) return;
        const finalData = fileData.startsWith('data:') ? fileData : `data:${doc.fileType};base64,${fileData}`;
        const link = document.createElement('a');
        link.href = finalData;
        link.download = this.getDisplayFileName(doc.fileName);
        link.click();
    }

    askDeleteDoc(doc: AppDocument) {
        this.docToDelete.set(doc);
        this.isDeleteModalOpen.set(true);
    }

    confirmDelete() {
        if (this.docToDelete()) {
            this.state.deleteDocument(this.docToDelete()!.id);
            this.isDeleteModalOpen.set(false);
            this.docToDelete.set(null);
        }
    }

    isImage(type: string): boolean { return type.startsWith('image/'); }
    isPdf(type: string): boolean { return type === 'application/pdf'; }
    getSafeUrl(base64: string) { return this.sanitizer.bypassSecurityTrustResourceUrl(base64); }
    getDisplayFileName(name: string): string { return name ? name.split('|')[0] : ''; }
    getFileSize(name: string): string {
        if (!name || !name.includes('|')) return '';
        const bytes = parseInt(name.split('|')[1], 10);
        if (isNaN(bytes)) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
}
