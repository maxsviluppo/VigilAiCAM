import { Component, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../services/app-state.service';

interface CheckItem {
    id: string;
    label: string;
    checked: boolean;
}

@Component({
    selector: 'app-non-compliance-view',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="space-y-8 pb-10">
        <!-- Premium Header Banner -->
        <div class="bg-gradient-to-r from-rose-600 via-pink-600 to-fuchsia-600 p-8 rounded-3xl shadow-xl border border-rose-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
            <div class="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <i class="fa-solid fa-triangle-exclamation text-9xl text-white"></i>
            </div>
            
            <div class="relative z-10">
                <h2 class="text-3xl font-black text-white flex items-center tracking-tight">
                    <span class="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mr-4 shadow-lg border border-white/30">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                    </span>
                    Non Conformità
                </h2>
                <div class="flex items-center gap-4 mt-2">
                    <p class="text-rose-100 text-sm font-medium ml-1">Gestione anomalie, richiami e azioni correttoive</p>
                    <button (click)="showStandardInfo.set(true)" 
                            class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white text-white hover:text-rose-700 transition-all text-[10px] font-black border border-white/30 shadow-md group">
                        <i class="fa-solid fa-circle-info text-sm group-hover:scale-110 transition-transform"></i>
                        <span>INFO PROTOCOLLO</span>
                    </button>
                </div>
            </div>
            
            <div class="relative z-10 flex flex-col gap-2">
                <div class="text-xs text-rose-100 font-medium flex items-center justify-end gap-2">
                    <i class="fa-regular fa-calendar"></i> {{ state.filterDate() | date:'dd/MM/yyyy' }}
                    @if (getDisplayName()) {
                        <span class="mx-1">•</span>
                        <i class="fa-regular fa-user"></i>
                        {{ getDisplayName() }}
                    }
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            @for (check of checks(); track check.id) {
                <div class="bg-white p-8 rounded-[32px] shadow-sm border-2 transition-all duration-300 group flex flex-col justify-between h-full"
                     [class.border-rose-100]="!check.checked" [class.border-rose-500]="check.checked"
                     [class.bg-rose-50/30]="check.checked" [class.shadow-xl]="check.checked" [class.shadow-rose-100]="check.checked">
                    
                    <div class="flex items-start gap-5 mb-8">
                        <div class="w-16 h-16 rounded-2xl flex items-center justify-center transition-all border shadow-sm group-hover:scale-105 shrink-0"
                             [class.bg-rose-500]="check.checked" [class.border-rose-400]="check.checked" [class.text-white]="check.checked"
                             [class.bg-slate-50]="!check.checked" [class.border-slate-100]="!check.checked" [class.text-slate-300]="!check.checked">
                            <i class="fa-solid text-2xl" [class.fa-file-circle-check]="check.checked" [class.fa-file-circle-plus]="!check.checked"></i>
                        </div>
                        <div class="min-w-0">
                            <h4 class="font-black text-slate-800 text-lg leading-tight uppercase tracking-tight mb-1">{{ check.label }}</h4>
                            <p class="text-[10px] font-black text-rose-500/60 uppercase tracking-widest">Procedura Operativa Standard</p>
                        </div>
                    </div>

                    <div class="flex flex-col gap-3">
                        <a href="assets/mod_RICHIAMO.pdf" target="_blank"
                           class="w-full py-5 px-8 bg-rose-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3 shadow-lg hover:bg-rose-700 active:scale-95 group shadow-rose-200">
                             <i class="fa-solid fa-eye text-base group-hover:scale-110 transition-transform"></i>
                             <span>ANTEPRIMA MODULO PDF</span>
                        </a>
                    </div>
                </div>
            }

            <!-- Supporto Qualità SAI -->
            <div class="bg-slate-900 p-8 rounded-[32px] text-white flex flex-col justify-between border border-white/10 relative overflow-hidden group shadow-2xl">
                <div class="absolute -top-10 -right-10 w-40 h-40 bg-rose-500/10 blur-[60px] rounded-full group-hover:bg-rose-500/20 transition-all duration-700"></div>
                
                <div class="relative z-10">
                    <div class="flex items-center gap-4 mb-6">
                        <div class="w-12 h-12 rounded-xl bg-white p-2 shadow-lg border border-white/20 shrink-0">
                            <img [src]="state.adminCompany().logo" class="w-full h-full object-contain">
                        </div>
                        <div>
                            <h4 class="text-xl font-black italic tracking-tight leading-none">Supporto Qualità</h4>
                            <p class="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-1.5">{{ state.adminCompany().name }}</p>
                        </div>
                    </div>
                    
                    <p class="text-slate-400 text-xs font-medium leading-relaxed mb-6">
                        Per anomalie non previste dai modelli standard, contattare il Responsabile Qualità per l'apertura di un fascicolo dedicato.
                    </p>
                </div>

                <div class="relative z-10 space-y-3">
                    <div class="flex items-center gap-4 py-3 px-5 bg-white/5 rounded-2xl border border-white/10 group-hover:bg-white/10 transition-colors">
                        <i class="fa-solid fa-phone-volume text-rose-500 animate-pulse text-sm"></i>
                        <div class="flex flex-col">
                            <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Help-line diretta</span>
                            <div class="flex flex-col">
                                <span class="text-xs font-black font-mono tracking-widest text-white">{{ state.adminCompany().cellphone }}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-4 py-3 px-5 bg-white/5 rounded-2xl border border-white/10 group-hover:bg-white/10 transition-colors">
                        <i class="fa-solid fa-envelope-open-text text-blue-400 text-sm"></i>
                        <div class="flex flex-col">
                            <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Supporto Tecnico</span>
                            <span class="text-[10px] font-bold text-slate-200">{{ state.adminCompany().email }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Recent Anomalies List for Operator -->
        <div class="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
            <div class="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div class="flex items-center gap-3">
                    <div class="h-10 w-10 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-rose-500">
                        <i class="fa-solid fa-list-check"></i>
                    </div>
                    <div>
                        <h3 class="text-base font-bold text-slate-800 tracking-tight">Ultime Segnalazioni</h3>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Storico anomalie inviate</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-wider">
                        {{ userAnomalies().length }} Totali
                    </span>
                </div>
            </div>

            <div class="divide-y divide-slate-100">
                @if (userAnomalies().length === 0) {
                    <div class="p-12 text-center">
                        <div class="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                            <i class="fa-solid fa-clipboard-check text-3xl"></i>
                        </div>
                        <p class="text-sm font-bold text-slate-500">Nessuna segnalazione registrata</p>
                        <p class="text-xs text-slate-400 mt-1">Le tue non conformità appariranno qui per la stampa.</p>
                    </div>
                } @else {
                    @for (nc of userAnomalies(); track nc.id) {
                        <div class="p-5 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div class="flex items-start gap-4 flex-1 min-w-0">
                                <div [class]="'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ' + 
                                    (nc.status === 'OPEN' ? 'bg-red-50 border-red-100 text-red-500' : 
                                     nc.status === 'IN_PROGRESS' ? 'bg-amber-50 border-amber-100 text-amber-600' : 
                                     'bg-emerald-50 border-emerald-100 text-emerald-600')">
                                    <i [class]="'fa-solid ' + (nc.status === 'OPEN' ? 'fa-exclamation' : nc.status === 'IN_PROGRESS' ? 'fa-spinner' : 'fa-check')"></i>
                                </div>
                                <div class="min-w-0">
                                    <div class="flex items-center gap-2 mb-1">
                                        <h4 class="text-sm font-black text-slate-800 truncate">{{ nc.itemName || 'Anomalia Generica' }}</h4>
                                        <span [class]="'text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ' + 
                                            (nc.status === 'OPEN' ? 'bg-red-50 border-red-200 text-red-600' : 
                                             nc.status === 'IN_PROGRESS' ? 'bg-amber-50 border-amber-200 text-amber-700' : 
                                             'bg-emerald-50 border-emerald-200 text-emerald-700')">
                                            {{ nc.status === 'OPEN' ? 'Aperta' : nc.status === 'IN_PROGRESS' ? 'In lavorazione' : 'Chiusa' }}
                                        </span>
                                    </div>
                                    <p class="text-[11px] text-slate-500 line-clamp-1 mb-2">{{ nc.description }}</p>
                                    <div class="flex items-center gap-3 text-[9px] font-bold text-slate-400">
                                        <span><i class="fa-solid fa-calendar mr-1"></i>{{ nc.date | date:'dd/MM/yyyy' }}</span>
                                        @if (nc.createdAt) {
                                            <span><i class="fa-solid fa-clock mr-1"></i>{{ formatTime(nc.createdAt) }}</span>
                                        }
                                    </div>
                                </div>
                            </div>
                            
                            <button (click)="printAnomaly(nc)" 
                                    class="shrink-0 h-10 px-5 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95">
                                <i class="fa-solid fa-print"></i> Stampa Verbale
                            </button>
                        </div>
                    }
                }
            </div>
        </div>

        @if (!canEdit()) {
            <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
                <i class="fa-solid fa-lock text-yellow-600 mt-0.5"></i>
                <p class="text-sm text-yellow-800 font-medium">Modalità di sola lettura. Seleziona un'unità operativa per modificare i dati.</p>
            </div>
        }

        <!-- Informational Modal -->
        @if (showStandardInfo()) {
            <div class="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" (click)="showStandardInfo.set(false)"></div>
                <div class="relative bg-white w-full max-w-md max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden animate-slide-up border border-slate-100 flex flex-col">
                    <div class="p-8 bg-gradient-to-br from-rose-700 to-pink-900 text-white relative flex-shrink-0">
                        <div class="absolute top-0 right-0 p-6 opacity-10 pointer-events-none -rotate-12 translate-x-2">
                            <i class="fa-solid fa-triangle-exclamation text-8xl"></i>
                        </div>
                        <div class="relative z-10">
                            <h3 class="text-2xl font-black mb-1">Non Conformità</h3>
                            <p class="text-rose-200 text-[10px] font-black uppercase tracking-[0.2em]">Protocollo Sicurezza</p>
                        </div>
                    </div>
                    
                    <div class="p-8 pt-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                        <div class="space-y-3">
                            <h4 class="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2">
                                <i class="fa-solid fa-search text-xs"></i> 01. Identificazione
                            </h4>
                            <div class="bg-rose-50/50 p-5 rounded-2xl border border-rose-100 text-xs text-slate-700 font-medium leading-relaxed">
                                Qualsiasi deviazione dai parametri critici o dai limiti di legge deve essere formalizzata.
                            </div>
                        </div>
                        <div class="space-y-3">
                            <h4 class="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2">
                                <i class="fa-solid fa-bolt text-xs"></i> 02. Azione Immediata
                            </h4>
                            <div class="bg-rose-50/50 p-5 rounded-2xl border border-rose-100 text-xs text-slate-700 font-medium leading-relaxed">
                                In caso di pericolo imminente, isolare il lotto interessato e bloccare la vendita/produzione.
                            </div>
                        </div>

                        <div class="space-y-3">
                            <h4 class="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2">
                                <i class="fa-solid fa-pen-nib text-xs"></i> 03. Tracciabilità
                            </h4>
                            <div class="bg-rose-50/50 p-5 rounded-2xl border border-rose-100 text-[10px] font-bold text-slate-500 italic">
                                La registrazione cartacea (Stampa Modulo) deve essere sempre firmata e conservata nell'archivio fisico.
                            </div>
                        </div>
                    </div>

                    <div class="p-6 bg-slate-50 border-t border-slate-100">
                        <button (click)="showStandardInfo.set(false)"
                                class="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95">
                            HO PRESO VISIONE
                        </button>
                    </div>
                </div>
            </div>
        }
    </div>
    `,
    styles: [`
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  `]
})
export class NonComplianceViewComponent {
    state = inject(AppStateService);
    moduleId = 'non-compliance';
    showStandardInfo = signal(false);

    checks = signal<CheckItem[]>([
        { id: 'nc_model', label: 'COMPILAZIONE MODELLO NON CONFORMITÀ / RICHIAMO', checked: false }
    ]);

    userAnomalies = computed(() => {
        const user = this.state.currentUser();
        if (!user) return [];
        
        // Filter anomalies for the current user's client
        return this.state.nonConformities()
            .filter(nc => nc.clientId === user.clientId)
            .sort((a,b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    });

    checkedCount = computed<number>(() => {
        return this.checks().filter((c: CheckItem) => c.checked).length;
    });

    constructor() {
        effect(() => {
            this.state.filterDate();
            this.state.filterCollaboratorId();
            this.state.currentUser();
            this.loadData();
        }, { allowSignalWrites: true });
    }

    loadData() {
        const savedData = this.state.getRecord(this.moduleId);
        if (savedData && Array.isArray(savedData)) {
            this.checks.update(current =>
                current.map(item => {
                    const savedItem = savedData.find((s: CheckItem) => s.id === item.id);
                    return savedItem ? { ...item, checked: savedItem.checked } : { ...item, checked: false };
                })
            );
        } else {
            this.checks.update(current => current.map(i => ({ ...i, checked: false })));
        }
    }

    canEdit(): boolean {
        return this.state.isContextEditable();
    }

    getDisplayName() {
        if (this.state.filterCollaboratorId()) {
            return this.state.systemUsers().find(u => u.id === this.state.filterCollaboratorId())?.name;
        }
        return this.state.currentUser()?.name;
    }

    toggleCheck(id: string) {
        if (!this.canEdit()) return;
        this.checks.update(items => items.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
        this.state.saveRecord(this.moduleId, this.checks());
    }

    downloadModule() {
        const link = document.createElement('a');
        link.href = 'assets/mod_RICHIAMO.pdf';
        link.download = 'mod_RICHIAMO.pdf';
        link.target = '_blank';
        link.click();
    }

    formatTime(date: any): string {
        if (!date) return '';
        try {
            return new Date(date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
    }

    printAnomaly(nc: any) {
        const client = this.state.clients().find(c => c.id === nc.clientId);
        if (!client) return;

        const printContent = this.generateAnomalyPrintHTML(nc, client);
        const printWindow = window.open('', '_blank');

        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    }

    private generateAnomalyPrintHTML(nc: any, client: any): string {
        const admin = this.state.adminCompany();
        const dateStr = new Date(nc.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
        const timeStr = nc.createdAt ? new Date(nc.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';
        const moduleLabel = this.getModuleLabel(nc.moduleId);

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Segnalazione Anomalia - ${client.name}</title>
            <style>
                @page { size: A4; margin: 0.8cm; }
                body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 0.4cm 1cm; color: #1e293b; line-height: 1.4; }
                
                .letterhead { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
                .sai-logo { width: 130px; }
                .sai-logo img { width: 100%; height: auto; object-fit: contain; }
                .company-info { text-align: right; font-size: 10px; color: #475569; }
                .company-name { font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 2px; text-transform: uppercase; }

                .report-header { text-align: center; margin-bottom: 20px; }
                .report-title { font-size: 20px; font-weight: 900; color: #be123c; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }
                .report-subtitle { font-size: 11px; color: #64748b; font-weight: 700; margin-top: 3px; }

                .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
                .detail-box { background: #f8fafc; border: 1px solid #f1f5f9; padding: 12px; border-radius: 10px; }
                .detail-label { font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 3px; }
                .detail-value { font-size: 13px; font-weight: 700; color: #0f172a; }

                .anomaly-card { border: 2px solid #ef4444; border-radius: 12px; padding: 20px; position: relative; overflow: hidden; }
                .anomaly-card::before { content: ""; position: absolute; left: 0; top: 0; width: 5px; height: 100%; background: #ef4444; }
                .section-label { font-size: 9px; font-weight: 900; color: #ef4444; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 12px; display: block; }
                
                .content-block { margin-bottom: 15px; }
                .content-label { font-size: 10px; font-weight: 800; color: #64748b; margin-bottom: 6px; }
                .content-text { font-size: 13px; color: #1e293b; background: #fff; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; min-height: 40px; }

                .status-banner { position: absolute; top: 12px; right: 12px; padding: 4px 12px; border-radius: 20px; font-size: 9px; font-weight: 800; text-transform: uppercase; }
                .status-OPEN { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
                .status-IN_PROGRESS { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
                .status-CLOSED { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }

                .signatures { margin-top: 20px; display: flex; justify-content: space-between; gap: 60px; }
                .sign-box { flex: 1; text-align: center; }
                .sign-line { border-top: 1px solid #0f172a; margin-top: 30px; padding-top: 5px; font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; }

                .footer { position: fixed; bottom: 0.8cm; left: 1cm; right: 1cm; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 10px; }
            </style>
        </head>
        <body>
            <div class="letterhead">
                <div class="sai-logo">
                    <img src="${admin.logo}" alt="SAI Logo">
                </div>
                <div class="company-info">
                    <div class="company-name">${client.name}</div>
                    <div>P.IVA: ${client.piva}</div>
                    <div>Indirizzo: ${client.address}</div>
                    <div>Email: ${client.email}</div>
                    <div>Tel: ${client.phone}</div>
                </div>
            </div>

            <div class="report-header">
                <h1 class="report-title">Verbale di Non Conformità</h1>
                <div class="report-subtitle">Sistema Gestione Qualità HACCP PRO Compliance</div>
            </div>

            <div class="details-grid">
                <div class="detail-box">
                    <div class="detail-label">Data Segnalazione</div>
                    <div class="detail-value">${dateStr} ${timeStr ? 'ore ' + timeStr : ''}</div>
                </div>
                <div class="detail-box">
                    <div class="detail-label">Modulo di Origine</div>
                    <div class="detail-value">${moduleLabel}</div>
                </div>
            </div>

            <div class="anomaly-card">
                <span class="status-banner status-${nc.status}">
                    ${nc.status === 'OPEN' ? 'Segnalazione Aperta' : nc.status === 'IN_PROGRESS' ? 'In Lavorazione' : 'Risolto / Chiuso'}
                </span>
                
                <span class="section-label">Dettagli Anomalia</span>

                <div class="content-block">
                    <div class="content-label">Oggetto / Attrezzatura Interrata</div>
                    <div class="content-text" style="font-weight: 700;">${nc.itemName || 'Non specificato'}</div>
                </div>

                <div class="content-block">
                    <div class="content-label">Descrizione dell'Anomalia (Motivazione)</div>
                    <div class="content-text">${nc.description}</div>
                </div>

                <div class="content-block" style="margin-bottom: 0;">
                    <div class="content-label">Azioni Correttive Intraprese / Note</div>
                    <div class="content-text" style="color: #94a3b8; font-style: italic;">
                        ${nc.status === 'CLOSED' ? 'L\'anomalia è stata gestita e risolta secondo protocollo.' : 'Da compilare a cura del responsabile...'}
                    </div>
                </div>
            </div>

            <div class="signatures">
                <div class="sign-box">
                    <div class="sign-line">Firma dell'Operatore Segnalante</div>
                </div>
                <div class="sign-box">
                    <div class="sign-line">FIRMA OPERATORE SETTORE ALIMENTARE (OSA)</div>
                </div>
            </div>

            <div class="footer">
                 Documento generato digitalmente da HACCP PRO Traceability System mod. NC/2024. <br>
                Ai sensi del Reg. CE 852/04 - Autocontrollo dei pericoli igienico-sanitari.
            </div>
        </body>
        </html>
        `;
    }

    private getModuleLabel(moduleId: string): string {
        const moduleNames: Record<string, string> = {
            'operative-checklist': 'Fase Operativa',
            'pre-op-checklist': 'Fase Pre-Operativa',
            'post-op-checklist': 'Fase Post-Operativa',
            'temperatures': 'Temperature',
            'traceability': 'Rintracciabilità',
            'cleaning-maintenance': 'Pulizia/Manutenzione'
        };
        return moduleNames[moduleId] || moduleId;
    }

    printModel(label: string) {
        const client = this.state.clients().find(c => c.id === this.state.currentUser()?.clientId) || { name: 'Azienda' };
        const date = new Date(this.state.filterDate()).toLocaleDateString('it-IT');

        const printContent = `
            <html>
                <head>
                    <title>Stampa Modulo - ${label}</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; }
                        .header { border-bottom: 2px solid #333; margin-bottom: 30px; text-align: center; }
                        .content { border: 1px solid #ccc; padding: 20px; min-height: 500px; }
                        .footer { margin-top: 50px; display: flex; justify-content: space-between; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>${client.name}</h1>
                        <h2>${label}</h2>
                        <p>Data: ${date}</p>
                    </div>
                    <div class="content">
                        <p><strong>Descrizione della Non Conformità:</strong></p>
                        <div style="border-bottom: 1px dotted #000; height: 100px;"></div>
                        <p><strong>Azione Correttiva Intrappresa:</strong></p>
                        <div style="border-bottom: 1px dotted #000; height: 100px;"></div>
                        <p><strong>Esito della Verifica:</strong></p>
                        <div style="border-bottom: 1px dotted #000; height: 50px;"></div>
                    </div>
                    <div class="footer">
                        <p>Firma Operatore: _________________________</p>
                        <p>Firma Responsabile: _________________________</p>
                    </div>
                    <script>window.print();</script>
                </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
        }
    }
}
