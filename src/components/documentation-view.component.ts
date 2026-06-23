import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { AppStateService, AppDocument } from '../services/app-state.service';
import { ToastService } from '../services/toast.service';

@Component({
    selector: 'app-documentation-view',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="animate-fade-in px-2 relative space-y-6 pb-24">
        <!-- Sleek Professional Dashboard Header -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
            <div class="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none"></div>
            
            <div class="flex items-center gap-5 relative z-10">
                <div class="h-14 w-14 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-md">
                    <i class="fa-solid fa-folder-tree text-2xl"></i>
                </div>
                <div>
                    <h2 class="text-2xl font-bold text-slate-800 tracking-tight">Archivio Documentale</h2>
                    <p class="text-sm font-medium text-slate-500 mt-1">Gestione Cloud della conformità e SCIA aziendale</p>
                </div>
            </div>

            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4 relative z-10">
                <div class="bg-slate-50 px-5 py-3 rounded-xl border border-slate-100 flex items-center gap-4">
                    <div class="text-right flex flex-col justify-center">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 leading-none">Documenti Totali</p>
                        <p class="text-sm font-bold text-slate-700 leading-none">{{ state.filteredDocuments().length }} file archiviati</p>
                    </div>
                    <div class="h-10 w-10 flex items-center justify-center bg-white rounded-full border border-slate-200 text-blue-600 shadow-sm shrink-0">
                        <i class="fa-solid fa-box-archive"></i>
                    </div>
                </div>
                
                <div class="hidden lg:flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
                    <i class="fa-solid fa-building text-blue-500"></i>
                    <span>{{ getTargetUnitName() }}</span>
                </div>
            </div>
        </div>

        <!-- Subtle Access Info Banner -->
        <div class="bg-slate-50 rounded-xl p-4 text-slate-600 flex items-center gap-4 border border-slate-200 shadow-sm relative overflow-hidden group">
            <div class="absolute right-0 top-0 h-full w-32 bg-white -skew-x-12 translate-x-16 group-hover:translate-x-8 transition-transform opacity-50"></div>
            <div class="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-sm">
                <i class="fa-solid fa-circle-info text-lg"></i>
            </div>
            <div class="min-w-0 relative z-10">
                <p class="text-[10px] font-black uppercase tracking-widest text-slate-800 leading-tight">Archivio Aziendale Condiviso</p>
                <p class="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">Tutti i documenti caricati sono visibili e modificabili sia dall'amministrazione che dagli operatori di tutte le sedi della stessa azienda.</p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <!-- Sidebar: Categories -->
            <div class="lg:col-span-1 space-y-4">
                <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm sticky top-6">
                    <h3 class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">Categorie Documenti</h3>
                    <div class="space-y-1">
                        <!-- All Documents View -->
                        <button (click)="selectedDocType.set('all')"
                                class="w-full flex items-center justify-between p-3 rounded-lg transition-all group text-left border mb-2"
                                [class.bg-blue-50]="selectedDocType() === 'all'"
                                [class.border-blue-200]="selectedDocType() === 'all'"
                                [class.text-blue-700]="selectedDocType() === 'all'"
                                [class.bg-white]="selectedDocType() !== 'all'"
                                [class.border-slate-100]="selectedDocType() !== 'all'"
                                [class.hover:bg-slate-50]="selectedDocType() !== 'all'">
                             <div class="flex items-center gap-3">
                                 <div class="w-8 h-8 rounded-md flex items-center justify-center transition-all bg-white shadow-sm border border-slate-100"
                                      [class.text-blue-600]="selectedDocType() === 'all'"
                                      [class.text-slate-500]="selectedDocType() !== 'all'">
                                     <i class="fa-solid fa-layer-group text-xs"></i>
                                 </div>
                                 <span class="text-[11px] font-black uppercase tracking-widest">Tutti i Documenti</span>
                             </div>
                             <div class="w-6 h-6 rounded flex items-center justify-center text-[9px] font-black shadow-sm"
                                  [class.bg-blue-600]="selectedDocType() === 'all'"
                                  [class.text-white]="selectedDocType() === 'all'"
                                  [class.bg-slate-100]="selectedDocType() !== 'all'"
                                  [class.text-slate-600]="selectedDocType() !== 'all'">
                                 {{ state.filteredDocuments().length }}
                             </div>
                        </button>

                        <div class="h-px bg-slate-100 mx-2 mb-2"></div>

                        <div class="h-px bg-slate-100 mx-2 mb-2"></div>

                        @for (def of docDefinitions; track def.id) {
                            @if (def.type === 'divider') {
                                <div class="py-4 px-3">
                                    <div class="flex items-center gap-3 mb-2">
                                        <div class="h-px flex-1 bg-slate-100"></div>
                                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">{{ def.label }}</span>
                                        <div class="h-px flex-1 bg-slate-100"></div>
                                    </div>
                                </div>
                            } @else {
                                <button (click)="selectedDocType.set(def.id)"
                                        class="w-full flex items-center justify-between p-2.5 rounded-lg transition-all group text-left border border-transparent shadow-sm mb-1"
                                        [class.bg-emerald-600]="selectedDocType() === def.id && def.isTraining"
                                        [class.text-white]="selectedDocType() === def.id && def.isTraining"
                                        [class]="selectedDocType() === def.id && !def.isTraining ? 'bg-' + def.color + '-600 text-white translate-x-1' : 'bg-white hover:bg-slate-50 hover:border-slate-200 text-slate-700'"
                                        [style.backgroundColor]="selectedDocType() === def.id ? '' : 'white'">
                                     <div class="flex items-center gap-3">
                                         <div class="w-7 h-7 rounded flex items-center justify-center transition-all shadow-sm"
                                              [class]="selectedDocType() === def.id ? 'bg-white/20 text-white' : 'bg-white border border-' + (def.isTraining ? 'emerald' : def.color) + '-100 text-' + (def.isTraining ? 'emerald' : def.color) + '-600'">
                                             <i [class]="'fa-solid ' + def.icon + ' text-[10px]'"></i>
                                         </div>
                                         <span class="text-[10px] font-black uppercase tracking-widest flex-1 leading-tight" [title]="def.label">{{ def.label }}</span>
                                     </div>
                                     @if (getDocsByType(def.id).length > 0) {
                                         <div class="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black shadow-sm"
                                              [class]="selectedDocType() === def.id ? 'bg-white text-' + (def.isTraining ? 'emerald' : def.color) + '-600' : 'bg-slate-100 text-slate-600'">
                                             {{ getDocsByType(def.id).length }}
                                         </div>
                                     }
                                </button>
                            }
                        }
                    </div>
                </div>
            </div>

            <!-- Main Content: Document Details & Upload -->
            <div class="lg:col-span-3 space-y-6">
                @if (selectedDocType()) {
                    @if (!isTargetUnitSelected()) {
                         <div class="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden p-8 text-center flex flex-col items-center justify-center h-full min-h-[300px]">
                            <div class="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-500 text-2xl border border-amber-100">
                                <i class="fa-solid fa-user-gear"></i>
                            </div>
                            <h3 class="text-base font-bold text-slate-800 mb-2">Selezione Unità Richiesta</h3>
                            <p class="text-sm text-slate-500 max-w-sm mx-auto mb-6">Per gestire l'archivio documentale come amministratore, seleziona un'unità o l'azienda in alto. I documenti saranno condivisi tra tutte le unità della stessa azienda.</p>
                            <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase tracking-widest border border-slate-200">
                                <i class="fa-solid fa-arrow-up animate-bounce"></i> Seleziona Azienda
                            </div>
                         </div>
                    } @else {
                        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-slide-up">
                        <div class="p-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 rounded-lg bg-white border border-slate-200 text-blue-600 flex items-center justify-center shadow-sm text-xl shrink-0">
                                    <i [class]="'fa-solid ' + getSelectedDef()?.icon"></i>
                                </div>
                                <div>
                                    <h3 class="text-lg font-bold text-slate-800 leading-none mb-1">{{ getSelectedDef()?.label }}</h3>
                                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ getSelectedDef()?.isTraining ? 'FORMAZIONE E QUALIFICA LAVORO' : 'Gestione Documentazione Compliance' }}</p>
                                </div>
                            </div>
                            
                            <div class="flex items-center gap-3 w-full sm:w-auto">
                                @if (getSelectedDef()?.isTraining) {
                                    <div class="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-100 text-[10px] font-bold text-emerald-600 uppercase tracking-tight">
                                        <i class="fa-solid fa-graduation-cap"></i> Highlight Formazione
                                    </div>
                                }
                                <label class="cursor-pointer group/btn flex-1 sm:flex-initial">
                                    <input type="file" class="hidden" (change)="handleFileSelect($event, selectedDocType() || '')" multiple>
                                    <div class="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-sm flex items-center justify-center gap-2 w-full"
                                         [class.bg-emerald-600]="getSelectedDef()?.isTraining"
                                         [class.hover:bg-emerald-700]="getSelectedDef()?.isTraining">
                                        <i class="fa-solid fa-cloud-arrow-up text-xs"></i>
                                        Carica Documento
                                    </div>
                                </label>
                            </div>
                        </div>

                        <!-- Training Highlight Description -->
                        @if (getSelectedDef()?.isTraining) {
                            <div class="px-6 py-4 bg-emerald-50/30 border-b border-emerald-100/50">
                                <div class="flex items-start gap-4">
                                    <div class="w-10 h-10 rounded-full bg-white border border-emerald-100 text-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
                                        <i class="fa-solid fa-circle-info text-lg"></i>
                                    </div>
                                    <div>
                                        <p class="text-xs text-slate-600 font-medium leading-relaxed italic">
                                            {{ getTrainingDescription(selectedDocType() || '') }}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        }

                        <div class="p-6">
                            @if (getSelectedDef()?.hasExpiry) {
                                <div class="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-100 flex items-center justify-between gap-4">
                                    <div class="flex items-center gap-4 flex-1">
                                        <div class="w-10 h-10 rounded-md bg-white border border-amber-200 text-amber-500 flex items-center justify-center shrink-0 shadow-sm">
                                            <i class="fa-solid fa-calendar-days text-sm"></i>
                                        </div>
                                        <div class="flex-1">
                                            <label class="block text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Scadenza Certificazione</label>
                                            <input type="date" 
                                                   [value]="getExpiryDate(selectedDocType() || '')"
                                                   (change)="updateExpiryDate(selectedDocType() || '', $event)"
                                                   class="bg-white border text-xs border-amber-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 shadow-sm text-amber-800 w-full max-w-[180px]">
                                        </div>
                                    </div>
                                    <div class="text-right hidden sm:block shrink-0">
                                        <span class="text-[9px] font-black text-amber-400 uppercase tracking-widest block mb-0.5">Stato</span>
                                        <span class="text-[10px] font-bold text-amber-600 px-2 py-0.5 bg-amber-100 rounded border border-amber-200">Rinnovo periodico</span>
                                    </div>
                                </div>
                            }

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                @for (doc of getDocsByType(selectedDocType() || ''); track doc.id) {
                                    <div class="flex items-center justify-between bg-white p-4 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors shadow-sm relative group">
                                        <div class="flex items-center gap-4 overflow-hidden pr-2">
                                            <div [class]="'w-12 h-12 rounded-md flex items-center justify-center shrink-0 border overflow-hidden shadow-sm bg-' + getDocColor(doc.type) + '-50 border-' + getDocColor(doc.type) + '-100 text-' + getDocColor(doc.type) + '-600'">
                                                @if (isImage(doc.fileType)) {
                                                    <img [src]="doc.fileData" class="w-full h-full object-cover">
                                                } @else {
                                                    <i [class]="'fa-solid ' + getDocIcon(doc.type) + ' text-xl'"></i>
                                                }
                                            </div>
                                            <div class="min-w-0">
                                                <span class="text-sm font-bold text-slate-700 block truncate mb-0.5" [title]="doc.fileName">{{ doc.fileName }}</span>
                                                <div class="flex items-center gap-2 text-[10px] text-slate-500">
                                                    <span>{{ doc.uploadDate | date:'dd/MM/yy' }}</span>
                                                    <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                                                    <span class="leading-tight">{{ getDocTypeLabel(doc.type) }}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white pl-2 absolute right-4 top-1/2 -translate-y-1/2">
                                            <button (click)="previewFile(doc)" class="w-8 h-8 rounded shrink-0 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors tooltip" title="Anteprima">
                                                <i class="fa-solid fa-eye text-xs"></i>
                                            </button>
                                            <button (click)="downloadDoc(doc)" class="w-8 h-8 rounded shrink-0 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors tooltip" title="Scarica">
                                                <i class="fa-solid fa-download text-xs"></i>
                                            </button>
                                            <div class="w-px h-4 bg-slate-200 mx-1"></div>
                                            <button (click)="askDeleteDoc(doc)" class="w-8 h-8 rounded shrink-0 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors tooltip" title="Elimina">
                                                <i class="fa-solid fa-trash-can text-xs"></i>
                                            </button>
                                        </div>
                                    </div>
                                }

                                <!-- State for empty or low-population archive -->
                                @if (getDocsByType(selectedDocType() || '').length < 6) {
                                    @for (def of docDefinitions; track def.id) {
                                        @if (getDocsByType(def.id).length === 0 && (selectedDocType() === 'all' || selectedDocType() === def.id)) {
                                            <div class="flex items-center justify-between bg-slate-50/40 p-4 rounded-lg border border-dashed border-slate-200 grayscale opacity-50 hover:opacity-80 transition-opacity cursor-pointer group/placeholder"
                                                 (click)="selectedDocType.set(def.id)">
                                                <div class="flex items-center gap-4 overflow-hidden pr-2">
                                                    <div [class]="'w-10 h-10 rounded-md bg-white border border-slate-100 flex items-center justify-center shrink-0 group-hover/placeholder:text-' + def.color + '-400 transition-colors text-slate-300'">
                                                        <i [class]="'fa-solid ' + def.icon + ' text-sm'"></i>
                                                    </div>
                                                    <div class="min-w-0">
                                                        <span class="text-xs font-bold text-slate-400 block mb-0.5 italic group-hover/placeholder:text-slate-500 leading-tight">{{ def.label }}</span>
                                                        <div [class]="'flex items-center gap-2 text-[9px] font-black uppercase tracking-widest group-hover/placeholder:text-' + def.color + '-400 text-slate-300'">
                                                            <span>Disponibile al Caricamento</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <i [class]="'fa-solid fa-arrow-up-from-bracket text-slate-200 mr-2 group-hover/placeholder:text-' + def.color + '-300'"></i>
                                            </div>
                                        }
                                    }
                                }
                            </div>
                        </div>
                    </div>
                }
            } @else {
                    <div class="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm text-center px-6 h-full min-h-[400px]">
                        <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100 text-slate-300 text-2xl">
                            <i class="fa-solid fa-folder-open"></i>
                        </div>
                        <h3 class="text-base font-bold text-slate-700 mb-1">Seleziona categoria</h3>
                        <p class="text-xs text-slate-500 max-w-[250px]">Scegli una tipologia dalla barra laterale per visualizzare o caricare documenti.</p>
                    </div>
                }
            </div>
        </div>
    </div>

    <!-- PREVIEW OVERLAY -->
    @if (previewDoc()) {
        <div class="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" (click)="previewDoc.set(null)"></div>
            <div class="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-slide-up flex flex-col h-[85vh]">
                <div class="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                    <div class="flex items-center gap-3">
                        <div [class]="'w-10 h-10 rounded-lg flex items-center justify-center border shadow-sm shrink-0 bg-' + getDocColor(previewDoc()?.type || '') + '-50 text-' + getDocColor(previewDoc()?.type || '') + '-600 border-' + getDocColor(previewDoc()?.type || '') + '-100'">
                            <i [class]="'fa-solid ' + getDocIcon(previewDoc()?.type || '') + ' text-lg'"></i>
                        </div>
                        <div class="min-w-0 pr-4">
                            <h4 class="font-bold text-slate-800 text-sm truncate" [title]="previewDoc()?.fileName">{{ previewDoc()?.fileName }}</h4>
                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{{ getDocTypeLabel(previewDoc()?.type || '') }} • {{ previewDoc()?.uploadDate | date:'dd/MM/yy HH:mm' }}</p>
                        </div>
                    </div>
                    <button (click)="previewDoc.set(null)" class="w-8 h-8 rounded shrink-0 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center border border-slate-200 shadow-sm">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                
                <div class="flex-1 bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden">
                    @if (isImage(previewDoc()?.fileType || '')) {
                        <div class="w-full h-full flex items-center justify-center p-4">
                            <img [src]="previewDoc()?.fileData" class="max-w-full max-h-full object-contain rounded shadow-lg border border-slate-200">
                        </div>
                    } @else if (isPdf(previewDoc()?.fileType || '')) {
                        <iframe [src]="getSafeUrl(previewDoc()?.fileData || '')" class="w-full h-full border-none shadow-inner bg-white"></iframe>
                    } @else if (isText(previewDoc()?.fileType || '')) {
                        <div class="w-full h-full p-8 overflow-y-auto">
                            <pre class="w-full p-6 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl shadow-2xl border border-slate-800 leading-relaxed overflow-x-auto whitespace-pre-wrap">
{{ previewDoc()?.fileData }}
                            </pre>
                        </div>
                    } @else {
                        <div class="text-center max-w-sm mx-auto">
                            <div [class]="'w-24 h-24 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-200 text-4xl group text-' + getDocColor(previewDoc()?.type || '') + '-500'">
                                 <i [class]="'fa-solid ' + getDocIcon(previewDoc()?.type || '')"></i>
                            </div>
                            <h3 class="text-xl font-bold text-slate-800 mb-2">Anteprima Documento</h3>
                            <p class="text-xs text-slate-500 mb-8 leading-relaxed">Il formato del file non supporta l'anteprima diretta. Scarica il file per visualizzarlo.</p>
                        </div>
                    }
                </div>
                
                <div class="p-3 bg-white border-t border-slate-100 flex items-center justify-between text-[10px]">
                    <div class="flex items-center gap-1.5 text-emerald-600 font-bold uppercase tracking-widest">
                        <i class="fa-solid fa-shield-check"></i> Archiviazione Sicura
                    </div>
                    <span class="text-slate-400 font-medium">HACCP Pro</span>
                </div>
            </div>
        </div>
    }

    <!-- DELETE CONFIRMATION -->
    @if (isDeleteModalOpen()) {
        <div class="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" (click)="isDeleteModalOpen.set(false)"></div>
            <div class="relative bg-white w-full max-w-sm rounded-2xl shadow-xl p-6 text-center animate-slide-up border border-slate-200">
                <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 text-2xl">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>
                <h3 class="text-lg font-bold text-slate-800 mb-1">Elimina Documento</h3>
                <p class="text-xs text-slate-500 mb-6 px-4">Sei sicuro di voler eliminare <span class="font-bold text-slate-700">"{{ docToDelete()?.fileName }}"</span>? L'azione non può essere annullata.</p>
                
                <div class="flex gap-3">
                    <button (click)="isDeleteModalOpen.set(false)" class="flex-1 py-2 px-4 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors">Annulla</button>
                    <button (click)="confirmDelete()" class="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-colors shadow-sm">Elimina</button>
                </div>
            </div>
        </div>
    }
    
    `
})
export class DocumentationViewComponent implements OnInit {
    state = inject(AppStateService);
    toast = inject(ToastService);
    sanitizer = inject(DomSanitizer);

    ngOnInit() {
        // Background sync on navigation to ensure consistency between users
        this.state.refreshAllData();
    }

    selectedDocType = signal<string | 'all'>('all');
    previewDoc = signal<AppDocument | null>(null);
    isDeleteModalOpen = signal(false);
    docToDelete = signal<any>(null);

    docDefinitions = [
        { id: 'scia', label: 'Scia e planimetria', icon: 'fa-map-location-dot', color: 'indigo' },
        { id: 'camerale', label: 'Camerale', icon: 'fa-building-columns', color: 'amber' },
        { id: 'haccp_plan', label: 'Piano autocontrollo sistema HACCP', icon: 'fa-file-shield', color: 'emerald' },
        { id: 'osa', label: 'Attestato OSA', icon: 'fa-user-graduate', color: 'blue' },
        { id: 'pec', label: 'PEC (Posta Elettronica Certificata)', icon: 'fa-envelope-circle-check', hasExpiry: true, color: 'violet' },
        { id: 'firma_digitale', label: 'Firma digitale', icon: 'fa-signature', color: 'rose' },
        { id: 'registro_personale', label: 'Registro del personale', icon: 'fa-users-rectangle', color: 'cyan' },
        { id: 'inps_inail', label: 'Iscrizione INPS / INAIL', icon: 'fa-stamp', color: 'orange' },
        { id: 'messa_terra', label: 'DM 37/08 messa a terra DPR 462/01', icon: 'fa-bolt', color: 'yellow' },
        { id: 'dvr', label: 'DVR (Documento Valutazione Rischi)', icon: 'fa-triangle-exclamation', color: 'red' },
        { id: 'locazione', label: 'Contratto locazione o titolo proprietà', icon: 'fa-house-chimney', color: 'teal' },
        
        { id: 'training_divider', type: 'divider', label: 'Formazione Lavoro' },
        
        { id: 'haccp_cert', label: 'Attestato HACCP / Sicurezza', icon: 'fa-graduation-cap', color: 'emerald', isTraining: true },
        { id: 'haccp_update', label: 'Aggiornamenti Sicurezza', icon: 'fa-arrows-rotate', color: 'emerald', isTraining: true },
        { id: 'haccp_procedures', label: 'Procedure Operative Standard', icon: 'fa-book-open-reader', color: 'emerald', isTraining: true },
        { id: 'manuali', label: 'Manuali', icon: 'fa-book', color: 'emerald', isTraining: true },
        { id: 'multe_verbali', label: 'Multe e Verbali', icon: 'fa-gavel', color: 'red' }
    ];

    getTrainingDescription(id: string): string {
        switch (id) {
            case 'haccp_cert': return 'Archiviazione degli attestati di formazione obbligatoria HACCP e Sicurezza sul Lavoro per tutto il personale operativo.';
            case 'haccp_update': return 'Documentazione relativa ai corsi di aggiornamento periodico e refresh formativi in ambito sicurezza alimentare.';
            case 'haccp_procedures': return 'Raccolta delle istruzioni di lavoro specifiche (SOP) e procedure operative approvate per le attività quotidiane.';
            case 'manuali': return 'Manuali tecnici, guide operative e documentazione di supporto per attrezzature e processi aziendali.';
            default: return '';
        }
    }

    getDocColor(type: string): string {
        const def = this.docDefinitions.find(d => d.id === type);
        return def?.color || 'slate';
    }

    getDocIcon(type: string): string {
        const def = this.docDefinitions.find(d => d.id === type);
        return def?.icon || 'fa-file';
    }

    getSelectedDef() {
        if (this.selectedDocType() === 'all') {
            return { id: 'all', label: 'Archivio Completo', icon: 'fa-layer-group', hasExpiry: false };
        }
        return this.docDefinitions.find(d => d.id === this.selectedDocType());
    }

    getDocTypeLabel(type: string): string {
        if (type === 'generale') return 'Generico';
        const def = this.docDefinitions.find(d => d.id === type);
        return def ? def.label : type.toUpperCase();
    }

    getTargetUnitName(): string {
        const targetClientId = this.state.activeTargetClientId();
        const allClients = this.state.clients();
        const target = allClients.find(c => c.id === targetClientId);
        
        if (target) {
            // Se Admin, mostra il nome dell'azienda o del brand
            return target.name;
        }
        return 'Tutte le Aziende';
    }

    isTargetUnitSelected(): boolean {
        if (!this.state.isAdmin()) return true;
        return !!this.state.filterClientId();
    }

    getDocsByType(type: string) {
        if (type === 'all') return this.state.filteredDocuments();
        return this.state.filteredDocuments().filter(d => d.type === type);
    }

    handleFileSelect(event: any, type: string) {
        if (!this.isTargetUnitSelected()) {
            this.toast.error('Errore', 'Seleziona un\'azienda prima di caricare documenti.');
            return;
        }
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const uploadType = type === 'all' ? 'generale' : type;

        const maxSize = 10 * 1024 * 1024; // Uniform 10MB limit as requested

        Array.from(files).forEach((file: any) => {
            if (file.size > maxSize) {
                this.toast.error('File troppo grande', `Il file "${file.name}" supera il limite di 10MB.`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.state.saveDocument({
                    clientId: '', // Managed by state.saveDocument
                    category: 'regolarita-documentazione',
                    type: uploadType,
                    fileName: file.name,
                    fileType: file.type,
                    fileData: e.target.result,
                    uploadDate: new Date()
                });
            };
            reader.readAsDataURL(file);
        });
        
        this.toast.success('Documenti Caricati', `${files.length} file sono stati aggiunti all'archivio.`);
        if (type === 'all') {
            this.selectedDocType.set('all');
        } else {
            this.selectedDocType.set(type);
        }
    }

    getExpiryDate(type: string) {
        const docs = this.getDocsByType(type);
        return docs.length > 0 ? docs[0].expiryDate : '';
    }

    updateExpiryDate(type: string, event: any) {
        const expiryDate = event.target.value;
        const targetClientId = this.state.activeTargetClientId();
        
        if (!targetClientId) {
            this.toast.error('Errore', 'Impossibile determinare l\'azienda di riferimento.');
            return;
        }

        this.state.updateDocumentExpiry(type, targetClientId, expiryDate);
    }

    previewFile(doc: AppDocument) {
        this.previewDoc.set(doc);
    }

    isImage(type: string): boolean {
        return type.startsWith('image/');
    }

    isPdf(type: string): boolean {
        return type === 'application/pdf';
    }

    isText(type: string): boolean {
        return type.startsWith('text/') || type === 'application/json';
    }

    getSafeUrl(base64: string) {
        return this.sanitizer.bypassSecurityTrustResourceUrl(base64);
    }

    downloadDoc(doc: any | null) {
        if (!doc) return;
        const link = document.createElement('a');
        link.href = doc.fileData;
        link.download = doc.fileName;
        link.click();
    }

    askDeleteDoc(doc: any) {
        this.docToDelete.set(doc);
        this.isDeleteModalOpen.set(true);
    }

    confirmDelete() {
        if (this.docToDelete()) {
            this.state.deleteDocument(this.docToDelete().id);
            this.isDeleteModalOpen.set(false);
            this.docToDelete.set(null);
            this.toast.success('Eliminato', 'Documento rimosso permanentemente.');
        }
    }
}
