import { Component, inject, signal, computed, OnInit } from '@angular/core';
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
    <div class="animate-fade-in px-2 relative space-y-6 pb-24">
        <!-- Premium Laboratory Header -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
            <div class="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-violet-50 to-transparent pointer-events-none"></div>
            
            <div class="flex items-center gap-5 relative z-10">
                <div class="h-14 w-14 bg-violet-600 text-white rounded-xl flex items-center justify-center shadow-md">
                    <i class="fa-solid fa-vial-virus text-2xl"></i>
                </div>
                <div>
                    <h2 class="text-2xl font-bold text-slate-800 tracking-tight">Analisi Microbiologiche</h2>
                    <p class="text-sm font-medium text-slate-500 mt-1">Registro storico dei rapporti di laboratorio e tamponi</p>
                </div>
            </div>

            <div class="flex flex-col sm:flex-row items-center gap-4 relative z-10">
                <button (click)="openUploadModal()" class="px-6 py-3 bg-violet-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-violet-700 transition-all shadow-lg flex items-center gap-2 active:scale-95">
                    <i class="fa-solid fa-cloud-arrow-up"></i> NUOVO CARICAMENTO
                </button>
            </div>
        </div>
        <!-- Search & Control Bar -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
            <div class="relative w-full md:max-w-md">
                <i class="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                <input type="text" 
                       [(ngModel)]="searchQuery"
                       placeholder="Cerca per nome file o data..." 
                       class="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm font-medium shadow-inner bg-slate-50/50">
            </div>
        </div>

        <!-- Tabular List of Uploads -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="bg-slate-50 border-b border-slate-200">
                        <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Data Caricamento</th>
                        <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Documento / Nome Rapporto</th>
                        <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Tipo File</th>
                        <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Azioni</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm">
                    @if (state.isAdmin() && !state.filterClientId()) {
                        <tr>
                            <td colspan="4" class="p-8">
                                <div class="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden p-8 text-center flex flex-col items-center justify-center min-h-[250px]">
                                    <div class="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-500 text-2xl border border-amber-100">
                                        <i class="fa-solid fa-user-gear"></i>
                                    </div>
                                    <h3 class="text-base font-bold text-slate-800 mb-2">Selezione Azienda Richiesta</h3>
                                    <p class="text-sm text-slate-500 max-w-sm mx-auto mb-6">Per visualizzare i rapporti microbiologici sincronizzati dagli operatori, seleziona prima un'azienda dal filtro globale in alto.</p>
                                    <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase tracking-widest border border-slate-200">
                                        <i class="fa-solid fa-arrow-up animate-bounce"></i> Seleziona Azienda
                                    </div>
                                </div>
                            </td>
                        </tr>
                    } @else {
                        @for (doc of filteredDocs(); track doc.id) {
                        <tr class="hover:bg-violet-50/30 transition-colors group">
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="flex flex-col">
                                    <span class="font-bold text-slate-700">{{ doc.uploadDate | date:'dd/MM/yyyy' }}</span>
                                    <span class="text-[10px] text-slate-400">{{ doc.uploadDate | date:'HH:mm' }}</span>
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                <div class="flex items-center gap-3">
                                    <div [class]="'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm border ' + (isImage(doc.fileType) ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-rose-50 border-rose-100 text-rose-600')">
                                        @if (isImage(doc.fileType)) {
                                            <img [src]="doc.fileData" class="w-full h-full object-cover rounded-md">
                                        } @else {
                                            <i class="fa-solid" [class.fa-file-pdf]="isPdf(doc.fileType)" [class.fa-file-lines]="!isPdf(doc.fileType)"></i>
                                        }
                                    </div>
                                    <div class="min-w-0 pr-4">
                                        <p class="font-bold text-slate-800 truncate leading-tight mb-0.5">{{ doc.fileName }}</p>
                                        <p class="text-[10px] text-slate-500">Rapporto di prova microbiologica</p>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                <span class="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase tracking-widest border border-slate-200">
                                    {{ doc.fileType.split('/')[1]?.toUpperCase() || 'FILE' }}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-right">
                                 <div class="flex items-center justify-end gap-1 transition-all">
                                    <button (click)="previewFile(doc)" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-violet-100 transition-all tooltip" title="Anteprima">
                                        <i class="fa-solid fa-eye text-xs"></i>
                                    </button>
                                    <button (click)="printSingleDoc(doc)" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all tooltip" title="Stampa">
                                        <i class="fa-solid fa-print text-xs"></i>
                                    </button>
                                    <button (click)="renameFile(doc)" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-100 transition-all tooltip" title="Rinomina">
                                        <i class="fa-solid fa-pen text-xs"></i>
                                    </button>
                                    <button (click)="downloadDoc(doc)" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-100 transition-all tooltip" title="Scarica">
                                        <i class="fa-solid fa-download text-xs"></i>
                                    </button>
                                    <div class="w-px h-4 bg-slate-200 mx-1"></div>
                                    <button (click)="askDeleteDoc(doc)" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-100 transition-all tooltip" title="Elimina">
                                        <i class="fa-solid fa-trash-can text-xs"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    }
                    @if (filteredDocs().length === 0 && (!state.isAdmin() || state.filterClientId())) {
                        <tr>
                            <td colspan="4" class="py-20 text-center">
                                <div class="flex flex-col items-center justify-center text-slate-400">
                                    <div class="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                                        <i class="fa-solid fa-database text-2xl text-slate-200"></i>
                                    </div>
                                    <p class="font-bold text-slate-600">Nessuna analisi corrispondente</p>
                                    <p class="text-xs">Prova a caricare un nuovo rapporto o cambia filtro di ricerca.</p>
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
            <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" (click)="previewDoc.set(null)"></div>
            <div class="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-slide-up flex flex-col h-[85vh]">
                <div class="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg flex items-center justify-center border shadow-sm shrink-0 bg-violet-50 text-violet-600 border-violet-100">
                            <i class="fa-solid fa-flask-vial text-lg"></i>
                        </div>
                        <div class="min-w-0 pr-4">
                            <h4 class="font-bold text-slate-800 text-sm truncate" [title]="previewDoc()?.fileName">{{ previewDoc()?.fileName }}</h4>
                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Analisi Microbiologica • {{ previewDoc()?.uploadDate | date:'dd/MM/yy HH:mm' }}</p>
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
                    } @else {
                        <div class="text-center">
                            <i class="fa-solid fa-file-circle-exclamation text-4xl text-slate-300 mb-4"></i>
                            <p class="text-sm font-medium text-slate-500">Formato non supportato per l'anteprima</p>
                        </div>
                    }
                </div>
                
                <div class="p-3 bg-white border-t border-slate-100 flex items-center justify-between text-[10px]">
                    <div class="flex items-center gap-1.5 text-emerald-600 font-bold uppercase tracking-widest">
                        <i class="fa-solid fa-shield-check"></i> Rapporto Verificato
                    </div>
                    <button (click)="downloadDoc(previewDoc()!)" class="text-blue-600 font-bold hover:underline">Scarica Rapporto Originale</button>
                </div>
            </div>
        </div>
    }

    <!-- RENAME MODAL -->
    @if (renamingDoc()) {
        <div class="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" (click)="renamingDoc.set(null)"></div>
            <div class="relative bg-white w-full max-w-sm rounded-2xl shadow-xl p-6 animate-slide-up border border-slate-200">
                <h3 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <i class="fa-solid fa-pen text-amber-500 text-sm"></i> Rinomina Rapporto
                </h3>
                <div class="mb-6">
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome File</label>
                    <input type="text" 
                           [(ngModel)]="newFileName"
                           class="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-slate-700 shadow-inner bg-slate-50">
                </div>
                <div class="flex gap-3">
                    <button (click)="renamingDoc.set(null)" class="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">Annulla</button>
                    <button (click)="confirmRename()" class="flex-1 py-2.5 bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-colors shadow-md">Salva Cambiamenti</button>
                </div>
            </div>
        </div>
    }

    <!-- UPLOAD MODAL (Parallel to documentation/archive style) -->
    @if (isUploadModalOpen()) {
        <div class="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" (click)="isUploadModalOpen.set(false)"></div>
            <div class="relative bg-white w-full max-w-lg rounded-2xl shadow-xl p-8 animate-slide-up border border-slate-200">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <i class="fa-solid fa-cloud-arrow-up text-violet-600"></i> Carica Nuova Analisi
                    </h3>
                    <button (click)="isUploadModalOpen.set(false)" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark text-lg"></i></button>
                </div>

                <div class="space-y-6">
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data del Rapporto</label>
                        <input type="date" [(ngModel)]="uploadDate" 
                               class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 outline-none font-bold text-slate-700">
                    </div>

                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Documento / Rapporto</label>
                        <div class="relative">
                            <input type="file" (change)="onFileSelected($event)" id="micro-file-up" class="hidden">
                            <label for="micro-file-up" 
                                   class="w-full flex items-center justify-center gap-4 border-2 border-dashed border-slate-200 rounded-2xl p-8 hover:border-violet-300 hover:bg-violet-50 transition-all cursor-pointer group">
                                <div class="text-center">
                                    <i class="fa-solid fa-file-pdf text-3xl mb-3" [class.text-violet-500]="selectedFile" [class.text-slate-300]="!selectedFile"></i>
                                    <p class="text-sm font-bold" [class.text-violet-700]="selectedFile" [class.text-slate-500]="!selectedFile">
                                        {{ selectedFile ?'File Pronto: ' + selectedFile.name : 'Seleziona PDF o Immagine' }}
                                    </p>
                                    <p class="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">Trascina qui o clicca per sfogliare</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    @if (selectedFile) {
                        <div class="animate-fade-in space-y-4">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Anteprima File Selezionato</label>
                                <div class="w-full h-40 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative group flex items-center justify-center">
                                    @if (isUploadImagePreview) {
                                        <img [src]="uploadFilePreview" class="w-full h-full object-contain">
                                    } @else {
                                        <div class="text-center">
                                            <i class="fa-solid " [class.fa-file-pdf]="isUploadPdfPreview" [class.fa-file]="!isUploadPdfPreview" class="text-4xl text-slate-300 mb-2"></i>
                                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Anteprima non disponibile per PDF</p>
                                        </div>
                                    }
                                </div>
                            </div>
                            
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome Rapporto nel Registro</label>
                                <input type="text" [(ngModel)]="customFileName" 
                                       class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 outline-none font-bold text-slate-700">
                            </div>
                        </div>
                    }

                    <div class="flex gap-4 pt-4">
                        <button (click)="isUploadModalOpen.set(false)" 
                                class="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">Annulla</button>
                        <button (click)="confirmUpload()" 
                                [disabled]="!selectedFile || isSaving()"
                                [class.opacity-50]="!selectedFile || isSaving()"
                                class="flex-1 py-4 bg-violet-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-violet-700 transition-colors shadow-lg active:scale-95 disabled:pointer-events-none flex items-center justify-center gap-2">
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
            <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" (click)="isDeleteModalOpen.set(false)"></div>
            <div class="relative bg-white w-full max-w-sm rounded-2xl shadow-xl p-6 text-center animate-slide-up border border-slate-200">
                <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 text-2xl">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>
                <h3 class="text-lg font-bold text-slate-800 mb-1">Elimina Analisi</h3>
                <p class="text-xs text-slate-500 mb-6 px-4">Sei sicuro di voler eliminare questo rapporto? L'azione è irreversibile.</p>
                <div class="flex gap-3">
                    <button (click)="isDeleteModalOpen.set(false)" class="flex-1 py-2 px-4 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-50">Annulla</button>
                    <button (click)="confirmDelete()" class="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-colors">Conferma</button>
                </div>
            </div>
        </div>
    }

    <!-- SELECTION WARNING MODAL -->
    @if (isSelectionWarningModalOpen()) {
        <div class="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" (click)="isSelectionWarningModalOpen.set(false)"></div>
            <div class="relative bg-white w-full max-w-sm rounded-2xl shadow-xl p-8 text-center animate-slide-up border border-slate-200">
                <div class="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100 text-2xl">
                    <i class="fa-solid fa-building-circle-exclamation"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-800 mb-2">Azienda non Selezionata</h3>
                <p class="text-sm text-slate-500 mb-8 leading-relaxed">Per caricare analisi microbiologiche devi prima selezionare un'azienda o unità operativa dal filtro globale in alto.</p>
                <button (click)="isSelectionWarningModalOpen.set(false)" 
                        class="w-full py-3 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200">
                    Ho Capito
                </button>
            </div>
        </div>
    }
    `,
    styles: [`
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes slideUp { from { transform: translateY(10%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    `]
})
export class MicrobioMonitorViewComponent implements OnInit {
    state = inject(AppStateService);
    toast = inject(ToastService);
    sanitizer = inject(DomSanitizer);

    ngOnInit() {
        // Sync data when opening the monitor
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
                this.toast.error('File troppo grande', 'Il file supera il limite di 10MB.');
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
                    clientId: '', // Handled by service
                    category: 'microbio',
                    type: 'microbio-analisi',
                    fileName: this.customFileName || this.selectedFile!.name,
                    fileType: this.selectedFile!.type,
                    fileData: e.target.result,
                    uploadDate: new Date(this.uploadDate),
                    userId: this.state.currentUser()?.id || 'system'
                });
                this.isSaving.set(false);
                this.isUploadModalOpen.set(false);
                this.toast.success('Analisi Salvata', 'Il rapporto è stato archiviato correttamente.');
            };
            reader.readAsDataURL(this.selectedFile);
        } catch (err) {
            console.error('Error in Microbio Upload:', err);
            this.isSaving.set(false);
            this.toast.error('Errore', 'Impossibile completare il caricamento del file.');
        }
    }

    printSingleDoc(doc: AppDocument) {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Rapporto Analisi - ${doc.fileName}</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; color: #333; }
                        .header { border-bottom: 2px solid #5b21b6; padding-bottom: 10px; margin-bottom: 30px; }
                        .title { color: #5b21b6; font-size: 24px; font-weight: bold; }
                        .info { margin-bottom: 20px; font-size: 14px; }
                        .info b { color: #666; }
                        .content { border: 1px solid #eee; padding: 20px; text-align: center; min-height: 400px; display: flex; items-center; justify-content: center; }
                        img { max-width: 100%; max-height: 500px; border: 1px solid #ddd; }
                        .footer { margin-top: 40px; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="title">Rapporto di Prova Microbiologica</div>
                    </div>
                    <div class="info">
                        <p><b>Data Caricamento:</b> ${new Date(doc.uploadDate).toLocaleString('it-IT')}</p>
                        <p><b>Nome File:</b> ${doc.fileName}</p>
                        <p><b>Azienda:</b> ${this.state.companyConfig().name}</p>
                    </div>
                    <div class="content">
                        ${this.isImage(doc.fileType) ? `<img src="${doc.fileData}">` : `<p>Documento PDF allegato (Vedere file originale)</p>`}
                    </div>
                    <div class="footer">
                        Documento generato dal sistema HACCP Pro Cloud. Validità legale subordinata alla firma del laboratorio competente.
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    }

    previewFile(doc: AppDocument) {
        this.previewDoc.set(doc);
    }

    renameFile(doc: AppDocument) {
        this.renamingDoc.set(doc);
        this.newFileName = doc.fileName;
    }

    confirmRename() {
        if (this.renamingDoc() && this.newFileName) {
            this.state.updateDocumentName(this.renamingDoc()!.id, this.newFileName);
            this.renamingDoc.set(null);
        }
    }

    downloadDoc(doc: AppDocument) {
        if (!doc.fileData) return;
        
        // Handle DataURL via Blob for stability
        if (doc.fileData.startsWith('data:')) {
            const parts = doc.fileData.split(';base64,');
            const contentType = parts[0].split(':')[1];
            const raw = window.atob(parts[1]);
            const uInt8Array = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; ++i) uInt8Array[i] = raw.charCodeAt(i);
            const blob = new Blob([uInt8Array], { type: contentType });
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = doc.fileName;
            link.click();
            URL.revokeObjectURL(blobUrl);
        } else {
            const link = document.createElement('a');
            link.href = doc.fileData;
            link.download = doc.fileName;
            link.click();
        }
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

    isImage(type: string): boolean {
        return type.startsWith('image/');
    }

    isPdf(type: string): boolean {
        return type === 'application/pdf';
    }

    getSafeUrl(base64: string) {
        return this.sanitizer.bypassSecurityTrustResourceUrl(base64);
    }
}
