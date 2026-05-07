import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../services/app-state.service';
import { ToastService } from '../services/toast.service';

@Component({
    selector: 'app-docs-regularity-view',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="pb-24 animate-fade-in px-4 lg:px-8 space-y-8 max-w-7xl mx-auto">
        
        <!-- Sleek Professional Dashboard Header -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
            <div class="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none"></div>
            
            <div class="flex items-center gap-5 relative z-10">
                <div class="h-14 w-14 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-md">
                    <i class="fa-solid fa-folder-tree text-2xl"></i>
                </div>
                <div>
                    <h2 class="text-2xl font-bold text-slate-800 tracking-tight">Regolarità Documentale</h2>
                    <p class="text-sm font-medium text-slate-500 mt-1">Checklist di conformità e SCIA per l'unità: <span class="text-blue-600 font-bold">{{ getCompanyName() }}</span></p>
                </div>
            </div>

            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4 relative z-10">
                <div class="bg-slate-50 px-5 py-3 rounded-xl border border-slate-100 flex items-center gap-6">
                    <div class="text-right">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 leading-none">Status Documenti</p>
                        <p class="text-sm font-bold text-slate-700 leading-none">{{ uploadedCount() }} / {{ docDefinitions.length }} caricati</p>
                    </div>
                    <div class="w-px h-8 bg-slate-200"></div>
                    <div class="flex flex-col items-end">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 leading-none">Conformità</p>
                        <span class="text-[10px] font-black px-2 py-0.5 rounded border" 
                              [class]="uploadedCount() === docDefinitions.length ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'">
                            {{ uploadedCount() === docDefinitions.length ? 'COMPLETA' : 'INCOMPLETA' }}
                        </span>
                    </div>
                </div>
            </div>
        </div>v>

        <!-- Documents Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            @for (def of docDefinitions; track def.id) {
                <div class="group bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 p-8 flex flex-col relative overflow-hidden"
                     [class.opacity-60]="state.disabledDocs()[def.id]"
                     [class.bg-amber-50/10]="state.disabledDocs()[def.id]">
                    
                    @if (state.disabledDocs()[def.id]) {
                        <div class="absolute top-4 right-4 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                            Non Richiesto
                        </div>
                    }

                    <div class="flex items-start justify-between mb-8">
                        <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-transform duration-500 group-hover:scale-110 shadow-lg"
                             [class.bg-indigo-50]="!isDocUploaded(def.id)" [class.text-indigo-600]="!isDocUploaded(def.id)"
                             [class.bg-emerald-50]="isDocUploaded(def.id)" [class.text-emerald-600]="isDocUploaded(def.id)">
                            <i [class]="'fa-solid ' + def.icon"></i>
                        </div>
                        <button (click)="toggleDocExclusion(def.id)" 
                                class="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center border border-slate-100 shadow-inner"
                                [title]="state.disabledDocs()[def.id] ? 'Riabilita' : 'Escludi'">
                            <i [class]="'fa-solid ' + (state.disabledDocs()[def.id] ? 'fa-eye' : 'fa-eye-slash')"></i>
                        </button>
                    </div>

                    <h3 class="text-xl font-black text-slate-800 mb-2 leading-tight">{{ def.label }}</h3>
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Documento Obbligatorio</p>

                    @if (!state.disabledDocs()[def.id]) {
                        <!-- List of files -->
                        <div class="space-y-3 mb-6 flex-1 min-h-[80px]">
                            @for (doc of getDocsByType(def.id); track doc.id) {
                                <div class="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-colors group/file">
                                    <div class="flex items-center gap-3 truncate">
                                        <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                            <i class="fa-solid fa-file-pdf"></i>
                                        </div>
                                        <div class="flex flex-col truncate">
                                            <span class="text-xs font-black text-slate-700 truncate max-w-[120px]">{{ doc.fileName }}</span>
                                            <span class="text-[9px] text-slate-400 font-bold uppercase">{{ doc.uploadDate | date:'dd/MM/yy' }}</span>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-1 opacity-0 group-hover/file:opacity-100 transition-all">
                                        <button (click)="downloadDoc(doc)" class="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center shadow-sm">
                                            <i class="fa-solid fa-download text-[10px]"></i>
                                        </button>
                                        <button (click)="askDeleteDoc(doc)" class="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center shadow-sm">
                                            <i class="fa-solid fa-trash-alt text-[10px]"></i>
                                        </button>
                                    </div>
                                </div>
                            } @empty {
                                <div class="h-24 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-100 bg-slate-50/30 text-slate-300">
                                    <i class="fa-solid fa-cloud-arrow-up text-2xl mb-2 opacity-20"></i>
                                    <span class="text-[9px] font-black uppercase tracking-widest leading-none">In attesa</span>
                                </div>
                            }
                        </div>

                        <!-- Expiry Section -->
                        @if (def.hasExpiry) {
                            <div class="mb-4 px-4 py-3 bg-amber-50/50 rounded-2xl border border-amber-100/50 flex items-center gap-3">
                                <i class="fa-solid fa-calendar-clock text-amber-500 text-sm"></i>
                                <div class="flex-1">
                                    <span class="block text-[8px] font-black text-amber-600/60 uppercase tracking-tighter">Scadenza documentale</span>
                                    <input type="date" [value]="getExpiryDate(def.id)" (change)="updateExpiryDate(def.id, $event)"
                                           class="bg-transparent border-none p-0 text-sm font-black text-amber-900 focus:outline-none w-full">
                                </div>
                            </div>
                        }

                        <!-- Upload Button -->
                        <label class="cursor-pointer group/btn">
                            <input type="file" class="hidden" (change)="handleFileSelect($event, def.id)" accept=".pdf,.jpg,.jpeg,.png">
                            <div class="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95">
                                <i class="fa-solid fa-plus-circle text-sm group-hover/btn:rotate-90 transition-transform"></i>
                                Carica Documento
                            </div>
                        </label>
                    } @else {
                        <div class="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-300">
                            <i class="fa-solid fa-ban text-4xl mb-4 opacity-10"></i>
                            <p class="text-[10px] font-black uppercase tracking-[0.2em]">Verifica Disattivata</p>
                        </div>
                    }
                </div>
            }
        </div>

        <!-- Delete Confirmation Modal -->
        @if (isDeleteModalOpen()) {
            <div class="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" (click)="isDeleteModalOpen.set(false)"></div>
                <div class="relative bg-white w-full max-w-sm rounded-[3rem] shadow-2xl p-10 text-center animate-slide-up border border-slate-100">
                    <div class="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-inner ring-4 ring-white">
                        <i class="fa-solid fa-trash-can"></i>
                    </div>
                    <h3 class="text-2xl font-black text-slate-800 mb-3 uppercase tracking-tight">Elimina File?</h3>
                    <p class="text-sm text-slate-500 font-bold mb-8 italic">"L'azione è irreversibile e il documento verrà eliminato dall'archivio aziendale."</p>
                    <div class="flex flex-col gap-3">
                        <button (click)="confirmDelete()" class="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-200 active:scale-95">
                            ELIMINA DEFINITIVAMENTE
                        </button>
                        <button (click)="isDeleteModalOpen.set(false)" class="w-full py-5 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">
                            ANNULLA
                        </button>
                    </div>
                </div>
            </div>
        }
    </div>
    `,
    styles: [`
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        .animate-slide-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    `]
})
export class DocsRegularityViewComponent {
    state = inject(AppStateService);
    toast = inject(ToastService);

    isDeleteModalOpen = signal(false);
    docToDelete = signal<any>(null);

    docDefinitions = [
        { id: 'scia', label: 'Scia e planimetria', icon: 'fa-map-location-dot' },
        { id: 'camerale', label: 'Camerale', icon: 'fa-building-columns' },
        { id: 'haccp_plan', label: 'Piano autocontrollo sistema HACCP', icon: 'fa-file-shield' },
        { id: 'osa', label: 'Attestato OSA', icon: 'fa-user-graduate' },
        { id: 'pec', label: 'PEC (Posta Elettronica Certificata)', icon: 'fa-envelope-circle-check', hasExpiry: true },
        { id: 'firma_digitale', label: 'Firma digitale', icon: 'fa-signature' },
        { id: 'registro_personale', label: 'Registro del personale', icon: 'fa-users-rectangle' },
        { id: 'inps_inail', label: 'Iscrizione INPS / INAIL', icon: 'fa-stamp' },
        { id: 'messa_terra', label: 'DM 37/08 messa a terra DPR 462/01', icon: 'fa-bolt' },
        { id: 'dvr', label: 'DVR (Documento Valutazione Rischi)', icon: 'fa-triangle-exclamation' },
        { id: 'locazione', label: 'Contratto locazione o titolo proprietà', icon: 'fa-house-chimney' }
    ];

    uploadedCount = signal(0);

    constructor() {
        effect(() => {
            const docs = this.state.filteredDocuments();
            this.uploadedCount.set(this.docDefinitions.filter(def => 
                docs.some(d => d.type === def.id && d.category === 'regolarita-documentazione') || 
                this.state.disabledDocs()[def.id]
            ).length);
        }, { allowSignalWrites: true });
    }

    getDocsByType(type: string) {
        return this.state.filteredDocuments().filter(d => 
            d.category === 'regolarita-documentazione' && d.type === type
        );
    }

    isDocUploaded(type: string) {
        return this.getDocsByType(type).length > 0;
    }

    handleFileSelect(event: any, type: string) {
        const files: FileList = event.target.files;
        if (!files || files.length === 0) return;

        const maxSize = 10 * 1024 * 1024;

        Array.from(files).forEach(file => {
            if (file.size > maxSize) {
                this.toast.error('File troppo grande', `Il file "${file.name}" supera il limite di 10MB.`);
                return;
            }
            this.state.saveDocument({
                clientId: '', // Handled by context
                category: 'regolarita-documentazione',
                type,
                fileName: file.name,
                fileType: file.type,
                fileData: 'BASE64_PLACE_HOLDER'
            });
        });
        this.toast.success('Documento caricato', `Il file è stato aggiunto con successo all'archivio dell'unità.`);
    }

    getExpiryDate(type: string) {
        const docs = this.getDocsByType(type);
        return docs.length > 0 ? docs[0].expiryDate : '';
    }

    updateExpiryDate(type: string, event: any) {
        const expiryDate = event.target.value;
        const targetClientId = this.state.activeTargetClientId();
        
        if (!targetClientId) return;

        this.state.updateDocumentExpiry(type, targetClientId, expiryDate);
    }

    downloadDoc(doc: any) {
        const mockContent = 'Dati del documento ' + doc.fileName;
        const blob = new Blob([mockContent], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.toast.success('Completato', 'Download terminato.');
    }

    askDeleteDoc(doc: any) {
        this.docToDelete.set(doc);
        this.isDeleteModalOpen.set(true);
    }

    toggleDocExclusion(docId: string) {
        this.state.disabledDocs.update(prev => ({
            ...prev,
            [docId]: !prev[docId]
        }));
        const isExcluding = this.state.disabledDocs()[docId];
        this.toast.info(isExcluding ? 'Documento Escluso' : 'Documento Riabilitato',
            isExcluding ? 'L\'elemento non sarà conteggiato nella verifica.' : 'L\'elemento è ora obbligatorio per la conformità.');
    }

    getCompanyName(): string {
        const targetClientId = this.state.activeTargetClientId();
        if (!targetClientId) return 'HACCP Pro';
        const client = this.state.clients().find(c => c.id === targetClientId);
        return client ? client.name : (this.state.isAdmin() ? 'Amministrazione' : 'Mia Unità');
    }
}
