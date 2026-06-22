
import { Component, inject, signal, computed, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { AppStateService, AppDocument } from '../services/app-state.service';
import { ToastService } from '../services/toast.service';

@Component({
    selector: 'app-documentation-view',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="animate-fade-in px-2 relative space-y-6 pb-24 max-w-7xl mx-auto">
        
        <!-- HEADER -->
        <div class="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div class="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none"></div>
            
            <div class="flex items-center gap-6 relative z-10 w-full md:w-auto">
                <div class="h-16 w-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
                    <i class="fa-solid fa-folder-tree text-2xl"></i>
                </div>
                <div>
                    <h2 class="text-2xl font-black text-slate-800 tracking-tight leading-none mb-2">Archivio Documentale</h2>
                    <p class="text-xs font-bold text-slate-500 uppercase tracking-widest">{{ getTargetUnitName() }}</p>
                </div>
            </div>

            <div class="flex items-center gap-4 relative z-10 bg-slate-50 px-6 py-4 rounded-[1.5rem] border border-slate-100">
               <div class="h-10 w-10 flex items-center justify-center bg-white rounded-full border border-slate-200 text-indigo-600 shadow-sm shrink-0">
                   <i class="fa-solid fa-box-archive text-lg"></i>
               </div>
               <div class="text-left">
                  <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 leading-none">Totali Archiviati</p>
                  <p class="text-sm font-black text-slate-700 leading-none">{{ state.filteredDocuments().length }} file</p>
               </div>
            </div>
        </div>

        <!-- MOBILE CATEGORY GRID (Visible only on mobile/tablet < LG) -->
        <div class="lg:hidden">
            <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-2">Seleziona Categoria</h3>
            <div class="grid grid-cols-3 gap-3">
                <!-- ALL DOCUMENTS - SQUARE MOBILE -->
                <button (click)="selectedDocType.set('all')"
                        class="aspect-square rounded-3xl p-3 flex flex-col items-center justify-center gap-2 transition-all border shadow-sm"
                        [class.bg-indigo-600]="selectedDocType() === 'all'"
                        [class.border-indigo-700]="selectedDocType() === 'all'"
                        [class.text-white]="selectedDocType() === 'all'"
                        [class.bg-white]="selectedDocType() !== 'all'"
                        [class.border-slate-200]="selectedDocType() !== 'all'"
                        [class.text-slate-600]="selectedDocType() !== 'all'">
                    <i [class]="'fa-solid fa-layer-group text-3xl ' + (selectedDocType() === 'all' ? 'text-white' : 'text-indigo-500')"></i>
                    <span class="text-[9px] font-black uppercase tracking-tight text-center leading-tight">Tutti</span>
                </button>

                @for (def of docDefinitions; track def.id) {
                    @if (def.type === 'divider') {
                        <div class="col-span-3 py-4 flex items-center gap-3">
                            <div class="h-px flex-1 bg-slate-100"></div>
                            <h4 class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">{{ def.label }}</h4>
                            <div class="h-px flex-1 bg-slate-100"></div>
                        </div>
                    } @else {
                        <button (click)="selectedDocType.set(def.id)"
                                class="aspect-square rounded-3xl p-3 flex flex-col items-center justify-center gap-2 transition-all border shadow-sm relative group"
                                [class]="selectedDocType() === def.id ? 'bg-' + (def.isTraining ? 'emerald' : def.color) + '-600 border-' + (def.isTraining ? 'emerald' : def.color) + '-700 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600'"
                                [style.backgroundColor]="selectedDocType() === def.id ? (def.isTraining ? '#10b981' : '') : 'white'">
                            <i [class]="'fa-solid ' + def.icon + ' text-3xl ' + (selectedDocType() === def.id ? 'text-white' : 'text-' + (def.isTraining ? 'emerald' : def.color) + '-500')"></i>
                            <span class="text-[9px] font-black uppercase tracking-tight text-center leading-tight line-clamp-2 px-1">{{ def.label }}</span>
                            
                            @if (getDocsByType(def.id).length > 0) {
                                <div class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-900 text-white text-[9px] font-black flex items-center justify-center border-2 border-white shadow-sm">
                                    {{ getDocsByType(def.id).length }}
                                </div>
                            }
                        </button>
                    }
                }
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <!-- DESKTOP SIDEBAR: CATEGORIES (Hidden on mobile) -->
            <div class="hidden lg:block lg:col-span-1 space-y-4">
                <div class="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm sticky top-6">
                    <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 px-1">Categorie Archivio</h3>
                    <div class="space-y-1">
                        <button (click)="selectedDocType.set('all')"
                                class="w-full flex items-center justify-between p-3.5 rounded-2xl transition-all group text-left border mb-3"
                                [class.bg-indigo-50]="selectedDocType() === 'all'"
                                [class.border-indigo-200]="selectedDocType() === 'all'"
                                [class.text-indigo-700]="selectedDocType() === 'all'"
                                [class.bg-white]="selectedDocType() !== 'all'"
                                [class.border-slate-100]="selectedDocType() !== 'all'"
                                [class.hover:bg-slate-50]="selectedDocType() !== 'all'">
                             <div class="flex items-center gap-3">
                                 <div class="w-9 h-9 rounded-xl flex items-center justify-center transition-all bg-white shadow-sm border border-slate-100"
                                      [class.text-indigo-600]="selectedDocType() === 'all'"
                                      [class.text-slate-500]="selectedDocType() !== 'all'">
                                     <i class="fa-solid fa-layer-group text-sm"></i>
                                 </div>
                                 <span class="text-[11px] font-black uppercase tracking-widest">Tutti i File</span>
                             </div>
                             <div class="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shadow-sm"
                                  [class.bg-indigo-600]="selectedDocType() === 'all'"
                                  [class.text-white]="selectedDocType() === 'all'"
                                  [class.bg-slate-100]="selectedDocType() !== 'all'"
                                  [class.text-slate-600]="selectedDocType() !== 'all'">
                                 {{ state.filteredDocuments().length }}
                             </div>
                        </button>

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
                                        class="w-full flex items-center justify-between p-3 rounded-xl transition-all group text-left border border-transparent mb-1"
                                        [class]="selectedDocType() === def.id ? 'bg-' + (def.isTraining ? 'emerald' : def.color) + '-600 text-white shadow-md' : 'bg-white hover:bg-slate-50 text-slate-600'"
                                        [style.backgroundColor]="selectedDocType() === def.id ? (def.isTraining ? '#10b981' : '') : 'white'">
                                     <div class="flex items-center gap-3">
                                         <div class="w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-sm"
                                              [class]="selectedDocType() === def.id ? 'bg-white/20 text-white' : 'bg-white border border-' + (def.isTraining ? 'emerald' : def.color) + '-100 text-' + (def.isTraining ? 'emerald' : def.color) + '-600'">
                                             <i [class]="'fa-solid ' + def.icon + ' text-xs'"></i>
                                         </div>
                                         <span class="text-[10px] font-black uppercase tracking-widest flex-1 leading-tight">{{ def.label }}</span>
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

            <!-- MAIN CONTENT -->
            <div class="lg:col-span-3 space-y-6">
                @if (selectedDocType()) {
                    <div class="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-slide-up">
                        <div class="p-6 md:p-8 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div class="flex items-center gap-5">
                                <div class="w-14 h-14 rounded-2xl bg-white border border-slate-200 text-indigo-600 flex items-center justify-center shadow-sm text-2xl shrink-0">
                                    <i [class]="'fa-solid ' + getSelectedDef()?.icon"></i>
                                </div>
                                <div>
                                    <h3 class="text-xl font-black text-slate-800 leading-none mb-2 tracking-tight">{{ getSelectedDef()?.label }}</h3>
                                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documenti Archiviati: {{ getDocsByType(selectedDocType() || '').length }}</p>
                                </div>
                            </div>
                            
                            <label class="cursor-pointer group/btn w-full md:w-auto">
                                <input type="file" class="hidden" (change)="handleFileSelect($event, selectedDocType() || '')" multiple>
                                <div class="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3">
                                    <i class="fa-solid fa-cloud-arrow-up text-base"></i>
                                    Carica Documento
                                </div>
                            </label>
                        </div>

                        <div class="p-6 md:p-8">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                @for (doc of getDocsByType(selectedDocType() || ''); track doc.id) {
                                    <div class="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all shadow-sm group relative flex flex-col gap-4">
                                        <div class="flex items-center gap-4 overflow-hidden">
                                            <div [class]="'w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden shadow-sm bg-' + getDocColor(doc.type) + '-50 border-' + getDocColor(doc.type) + '-100 text-' + getDocColor(doc.type) + '-600'">
                                                @if (isImage(doc.fileType) && doc.fileData) {
                                                    <img [src]="getSafeFileData(doc)" class="w-full h-full object-cover">
                                                } @else {
                                                    <i [class]="'fa-solid ' + getDocIcon(doc.type) + ' text-2xl'"></i>
                                                }
                                            </div>
                                            <div class="min-w-0 flex-1">
                                                <span class="text-sm font-black text-slate-800 block truncate mb-1" [title]="getDisplayFileName(doc.fileName)">{{ getDisplayFileName(doc.fileName) }}</span>
                                                <div class="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                    <span>{{ doc.uploadDate | date:'dd/MM/yy' }}</span>
                                                    <span class="w-1 h-1 rounded-full bg-slate-200"></span>
                                                    <span>{{ getFileSize(doc.fileName) }}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- ACTIONS -->
                                        <div class="flex items-center gap-2 pt-4 border-t border-slate-50">
                                            <button (click)="previewFile(doc)" class="flex-1 py-2 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                                                <i class="fa-solid fa-eye"></i> Vedi
                                            </button>
                                            <button (click)="downloadDoc(doc)" class="flex-1 py-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                                                <i class="fa-solid fa-download"></i> Salva
                                            </button>
                                            <button (click)="askDeleteDoc(doc)" class="w-10 py-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all flex items-center justify-center">
                                                <i class="fa-solid fa-trash-can"></i>
                                            </button>
                                        </div>
                                    </div>
                                } @empty {
                                    <div class="col-span-full py-16 text-center">
                                        <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                                            <i class="fa-solid fa-cloud-upload text-4xl"></i>
                                        </div>
                                        <h4 class="text-slate-800 font-black text-lg uppercase tracking-tight">Nessun documento caricato</h4>
                                        <p class="text-slate-400 text-xs font-medium">Usa il pulsante in alto per aggiungere file a questa categoria.</p>
                                    </div>
                                }
                            </div>
                        </div>
                    </div>
                }
            </div>
        </div>
    </div>

    <!-- PREVIEW OVERLAY -->
    @if (previewDoc()) {
        <div class="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" (click)="previewDoc.set(null)"></div>
            <div class="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 animate-slide-up flex flex-col h-[85vh]">
                <div class="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                    <div class="flex items-center gap-4">
                        <div [class]="'w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm shrink-0 bg-' + getDocColor(previewDoc()?.type || '') + '-50 text-' + getDocColor(previewDoc()?.type || '') + '-600 border-' + getDocColor(previewDoc()?.type || '') + '-100'">
                            <i [class]="'fa-solid ' + getDocIcon(previewDoc()?.type || '') + ' text-xl'"></i>
                        </div>
                        <div class="min-w-0 pr-4">
                            <h4 class="font-black text-slate-800 text-sm truncate uppercase tracking-tight">{{ getDisplayFileName(previewDoc()?.fileName || '') }}</h4>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{{ getDocTypeLabel(previewDoc()?.type || '') }}</p>
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
                        <div class="text-center max-w-sm mx-auto p-12">
                            <div class="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl border border-slate-200 text-4xl text-slate-300">
                                 <i class="fa-solid fa-file-circle-exclamation"></i>
                            </div>
                            <h3 class="text-2xl font-black text-slate-800 mb-4 tracking-tight">Formato non supportato</h3>
                            <p class="text-xs text-slate-500 mb-8 leading-relaxed font-medium">L'anteprima diretta non è disponibile per questo tipo di file. Scaricalo per visualizzarlo localmente sul tuo dispositivo.</p>
                            <button (click)="downloadDoc(previewDoc())" class="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">Scarica Ora</button>
                        </div>
                    }
                </div>
            </div>
        </div>
    }

    <!-- DELETE CONFIRMATION -->
    @if (isDeleteModalOpen()) {
        <div class="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md" (click)="isDeleteModalOpen.set(false)"></div>
            <div class="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 text-center animate-slide-up border border-slate-200">
                <div class="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-100 text-3xl shadow-inner">
                    <i class="fa-solid fa-trash-can"></i>
                </div>
                <h3 class="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">Elimina File?</h3>
                <p class="text-xs text-slate-500 mb-8 px-4 font-medium leading-relaxed italic">"{{ docToDelete()?.fileName?.split('|')[0] }}" verrà rimosso permanentemente dal cloud.</p>
                
                <div class="flex flex-col gap-3">
                    <button (click)="confirmDelete()" class="w-full py-4 bg-red-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-100">Sì, Elimina</button>
                    <button (click)="isDeleteModalOpen.set(false)" class="w-full py-4 bg-white border border-slate-200 text-slate-400 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Annulla</button>
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
        this.state.refreshAllData();
    }

    selectedDocType = signal<string | 'all'>('all');
    previewDoc = signal<AppDocument | null>(null);
    isDeleteModalOpen = signal(false);
    docToDelete = signal<any>(null);

    docDefinitions = [
        { id: 'scia', label: 'Scia e planimetria', icon: 'fa-map-location-dot', color: 'sky' },
        { id: 'camerale', label: 'Camerale', icon: 'fa-building-columns', color: 'amber' },
        { id: 'haccp_plan', label: 'Manuale applicazione sistema HACCP', icon: 'fa-file-shield', color: 'indigo' },
        { id: 'osa', label: 'Attestato OSA', icon: 'fa-user-graduate', color: 'blue' },
        { id: 'registro_personale', label: 'Elenco del personale con mansioni', icon: 'fa-users-rectangle', color: 'violet' },
        { id: 'messa_terra', label: 'DM 37/08 messa a terra DPR 462/01', icon: 'fa-bolt', color: 'orange' },
        { id: 'dvr', label: 'DVR (Documento Valutazione Rischi)', icon: 'fa-triangle-exclamation', color: 'red' },
        
        { id: 'training_divider', type: 'divider', label: 'Formazione Lavoro' },
        
        { id: 'haccp_cert', label: 'Attestato HACCP / Sicurezza', icon: 'fa-graduation-cap', color: 'emerald', isTraining: true },
        { id: 'haccp_update', label: 'Aggiornamenti Sicurezza', icon: 'fa-arrows-rotate', color: 'emerald', isTraining: true },
        { id: 'haccp_procedures', label: 'Procedure Operative Standard', icon: 'fa-book-open-reader', color: 'emerald', isTraining: true },
        { id: 'multe_verbali', label: 'Multe e Verbali', icon: 'fa-gavel', color: 'rose' }
    ];

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
            return { id: 'all', label: 'Tutti i Documenti', icon: 'fa-layer-group', hasExpiry: false };
        }
        return this.docDefinitions.find(d => d.id === this.selectedDocType());
    }

    getDocTypeLabel(type: string): string {
        if (type === 'generale') return 'Generico';
        const def = this.docDefinitions.find(d => d.id === type);
        return def ? def.label : type.toUpperCase();
    }

    constructor() {
        effect(() => {
            const docs = this.state.filteredDocuments();
            this.autoLoadImagePreviews(docs);
        }, { allowSignalWrites: true });
    }

    private autoLoadImagePreviews(docs: AppDocument[]) {
        const imagesToLoad = docs.filter(d => 
            this.isImage(d.fileType) && 
            !d.fileData && 
            this.getFileSizeRaw(d.fileName) < 1024 * 1024
        );
        if (imagesToLoad.length > 0) {
            this.processImageQueue(imagesToLoad);
        }
    }

    private async processImageQueue(docs: AppDocument[]) {
        for (const doc of docs) {
            if (!doc.fileData) {
                await this.state.fetchDocumentData(doc.id);
            }
        }
    }

    private getFileSizeRaw(name: string): number {
        if (!name || !name.includes('|')) return 0;
        const sizeStr = name.split('|')[1];
        return parseInt(sizeStr, 10) || 0;
    }

    getTargetUnitName(): string {
        const targetClientId = this.state.activeTargetClientId();
        const allClients = this.state.clients();
        const target = allClients.find(c => c.id === targetClientId);
        return target ? target.name : 'Archivio Aziendale';
    }

    isTargetUnitSelected(): boolean {
        return !!this.state.activeTargetClientId();
    }

    getDocsByType(type: string) {
        if (type === 'all') return this.state.filteredDocuments();
        return this.state.filteredDocuments().filter(d => d.type === type);
    }

    handleFileSelect(event: any, type: string) {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        const uploadType = type === 'all' ? 'generale' : type;
        const maxSize = 10 * 1024 * 1024;

        Array.from(files).forEach((file: any) => {
            if (file.size > maxSize) {
                this.toast.error('File troppo grande', `"${file.name}" supera 10MB.`);
                return;
            }
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.state.saveDocument({
                    clientId: '', 
                    category: 'regolarita-documentazione',
                    type: uploadType,
                    fileName: `${file.name}|${file.size}`,
                    fileType: file.type,
                    fileData: e.target.result,
                    uploadDate: new Date()
                });
            };
            reader.readAsDataURL(file);
        });
        this.toast.success('Caricato', `${files.length} file aggiunti.`);
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

    getDisplayFileName(name: string): string {
        return name ? name.split('|')[0] : '';
    }

    getFileSize(name: string): string {
        if (!name || !name.includes('|')) return '';
        const sizeStr = name.split('|')[1];
        const bytes = parseInt(sizeStr, 10);
        if (isNaN(bytes)) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    isImage(type: string): boolean { return type.startsWith('image/'); }
    isPdf(type: string): boolean { return type.startsWith('application/pdf'); }
    getSafeUrl(base64: string) { return this.sanitizer.bypassSecurityTrustResourceUrl(base64); }

    async downloadDoc(doc: any | null) {
        if (!doc) return;
        let fileData = doc.fileData;
        if (!fileData) {
            const data = await this.state.fetchDocumentData(doc.id);
            if (data) {
                fileData = data;
                doc.fileData = data;
            }
        }
        if (!fileData) return;
        const finalData = fileData.startsWith('data:') ? fileData : `data:${doc.fileType};base64,${fileData}`;
        const link = document.createElement('a');
        link.href = finalData;
        link.download = this.getDisplayFileName(doc.fileName);
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
            this.toast.success('Eliminato', 'Documento rimosso.');
        }
    }
}
