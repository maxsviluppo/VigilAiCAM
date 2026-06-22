import { Component, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppStateService } from '../services/app-state.service';
import { ToastService } from '../services/toast.service';

interface CheckItem {
    id: string;
    label: string;
    icon: string;
    status: 'pending' | 'ok' | 'issue';
    note?: string;
}

@Component({
    selector: 'app-cleaning-maintenance-view',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <!-- UI CONTENT (Hidden on print) -->
    <div class="print:hidden pb-20 animate-fade-in relative px-2 space-y-6">
        
        <!-- Minimal Hero Header -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 lg:p-8 flex flex-col md:flex-row justify-between md:items-center gap-6 relative overflow-hidden">
            <!-- Subtle accent -->
            <div class="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

            <div class="relative z-10">
                <div class="flex items-center gap-3 md:gap-4 mb-2 md:mb-1">
                    <div class="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100 shadow-sm shrink-0">
                        <i class="fa-solid fa-screwdriver-wrench text-lg md:text-xl"></i>
                    </div>
                    <div>
                        <h2 class="text-xl md:text-2xl font-bold text-slate-800 tracking-tight leading-tight">Manutenzione & Igiene</h2>
                        <p class="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Vedi manuale d'uso e manutenzione</p>
                        <div class="flex flex-wrap items-center gap-2 mt-2">
                            <span class="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 text-slate-500 rounded border border-slate-200 text-[10px] md:text-xs font-black uppercase tracking-widest leading-none">
                                <i class="fa-solid fa-circle text-[8px] animate-pulse text-violet-500"></i>
                                Registro Attrezzature
                            </span>
                            <button (click)="showStandardInfo.set(true)" 
                                    class="flex items-center gap-1.5 px-2 py-0.5 bg-violet-50 text-violet-600 hover:bg-violet-100 rounded border border-violet-100 text-[10px] md:text-xs font-black uppercase tracking-widest leading-none transition-colors">
                                <i class="fa-solid fa-circle-info"></i> Info Protocollo
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Stats -->
            <div class="w-full md:w-auto relative z-10 flex gap-4 pr-1">
                <div class="flex items-center gap-4 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 w-full justify-between">
                    <div class="min-w-[120px]">
                        <p class="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Avanzamento</p>
                        <div class="flex items-center gap-3">
                            <div class="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden flex-1">
                                <div class="h-full bg-violet-500 rounded-full transition-all duration-1000" [style.width.%]="(completedCount() / checks().length) * 100"></div>
                            </div>
                            <span class="text-sm md:text-base font-bold text-slate-700 leading-none whitespace-nowrap">{{ completedCount() }}/{{ (checks().length || 1) }}</span>
                        </div>
                    </div>
                    <i class="fa-solid fa-check-double text-slate-300 text-lg md:text-xl ml-2"></i>
                </div>
            </div>
        </div>

        <div class="flex items-center gap-2 px-1">
            <h3 class="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <i class="fa-solid fa-clipboard-check text-violet-500"></i>
                Verifiche
            </h3>
        </div>

        <!-- Checklist List Layout -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="divide-y divide-slate-100">
                @for (check of checks(); track check.id; let i = $index) {
                    <div class="flex flex-col hover:bg-slate-50 transition-colors group">
                        <div class="p-5 flex flex-col gap-4 relative overflow-hidden"
                             [class.bg-emerald-50/40]="check.status === 'ok'"
                             [class.bg-rose-50/40]="check.status === 'issue'">
                             
                            <!-- Row 1: Info & Label -->
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3 min-w-0">
                                    <span class="text-[10px] font-black w-6 h-6 rounded-lg bg-white flex items-center justify-center border border-slate-200 shrink-0 text-slate-400 shadow-sm">
                                        {{ i + 1 }}
                                    </span>
                                    
                                    <div class="h-10 w-10 rounded-xl shrink-0 flex items-center justify-center transition-all border shadow-sm"
                                         [class.bg-emerald-500]="check.status === 'ok'" [class.border-emerald-600]="check.status === 'ok'" [class.text-white]="check.status === 'ok'"
                                         [class.bg-rose-500]="check.status === 'issue'" [class.border-rose-600]="check.status === 'issue'" [class.text-white]="check.status === 'issue'"
                                         [class.bg-white]="check.status === 'pending'" [class.border-slate-200]="check.status === 'pending'" [class.text-slate-400]="check.status === 'pending'">
                                        <i [class]="'fa-solid text-lg ' + (check.status === 'ok' ? 'fa-check' : (check.status === 'issue' ? 'fa-triangle-exclamation' : check.icon))"></i>
                                    </div>
                                    
                                    <div class="min-w-0 flex-1">
                                        <h3 class="font-black text-slate-800 text-base leading-tight uppercase tracking-tight">{{ check.label }}</h3>
                                        <div class="flex items-center gap-2 mt-1">
                                            <span class="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                                                  [class.bg-emerald-100]="check.status === 'ok'" [class.text-emerald-700]="check.status === 'ok'"
                                                  [class.bg-red-100]="check.status === 'issue'" [class.text-red-700]="check.status === 'issue'"
                                                  [class.bg-slate-100]="check.status === 'pending'" [class.text-slate-500]="check.status === 'pending'">
                                                {{ check.status === 'ok' ? 'CONFORME' : (check.status === 'issue' ? 'ANOMALIA' : 'IN ATTESA') }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Row 2: Large Touch Buttons -->
                            <div class="flex items-center gap-3 w-full">
                                @if (check.status === 'pending') {
                                    <button (click)="setStatus(check.id, 'ok')" 
                                            [disabled]="!canEdit()"
                                            class="flex-1 h-14 rounded-2xl border-2 border-emerald-500 bg-white text-emerald-600 flex items-center justify-center gap-2 shadow-md active:scale-95 disabled:opacity-50">
                                        <i class="fa-solid fa-circle-check text-xl"></i>
                                        <span class="text-xs font-black uppercase tracking-widest">OK</span>
                                    </button>
                                    <button (click)="setStatus(check.id, 'issue')" 
                                            [disabled]="!canEdit()"
                                            class="flex-1 h-14 rounded-2xl border-2 border-rose-500 bg-white text-rose-600 flex items-center justify-center gap-2 shadow-md active:scale-95 disabled:opacity-50">
                                        <i class="fa-solid fa-circle-exclamation text-xl"></i>
                                        <span class="text-xs font-black uppercase tracking-widest">NO</span>
                                    </button>
                                } @else {
                                    <div class="flex-1 flex gap-3">
                                        <div class="flex-1 h-14 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest"
                                             [class.bg-emerald-500]="check.status === 'ok'" [class.text-white]="check.status === 'ok'"
                                             [class.bg-rose-500]="check.status === 'issue'" [class.text-white]="check.status === 'issue'">
                                            <i class="fa-solid" [class.fa-check-circle]="check.status === 'ok'" [class.fa-triangle-exclamation]="check.status === 'issue'"></i>
                                            {{ check.status === 'ok' ? 'CONFORME' : 'ANOMALIA' }}
                                        </div>
                                        <button (click)="setStatus(check.id, 'pending')" 
                                                [disabled]="!canEdit()"
                                                class="h-14 w-14 rounded-2xl bg-white border-2 border-slate-200 text-slate-400 flex items-center justify-center shadow-md active:scale-95">
                                            <i class="fa-solid fa-rotate-left"></i>
                                        </button>
                                    </div>
                                }
                            </div>
                        </div>

                        </div>
                } @empty {
                    <div class="p-12 text-center opacity-60">
                        <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
                            <i class="fa-solid fa-microchip text-2xl text-slate-300"></i>
                        </div>
                        <p class="font-black uppercase tracking-[0.2em] text-[10px] md:text-xs">Nessun elemento da verificare</p>
                    </div>
                }
            </div>
        </div>

        @if (!canEdit()) {
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 md:p-4 flex items-start gap-3 shadow-sm">
                <i class="fa-solid fa-lock text-amber-500 mt-0.5 text-sm"></i>
                <div class="flex-1">
                    <p class="text-[10px] md:text-xs text-amber-700 font-black uppercase tracking-widest mb-0.5">Visore in Sola Lettura</p>
                    <p class="text-xs md:text-sm text-amber-800/80 font-medium leading-tight">Seleziona un&#39;unità operativa dal menu superiore per poter interagire, oppure sei posizionato su una data passata.</p>
                </div>
            </div>
        }

        <!-- FIXED SUBMIT BUTTON (Right Bottom) -->
        <div class="fixed bottom-6 right-6 z-50">
            @if (completedCount() === checks().length && checks().length > 0 && canEdit()) {
                <button (click)="onFinalSubmit()"
                        class="px-5 py-3 md:px-6 py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-xs md:text-sm uppercase tracking-wider hover:bg-emerald-700 hover:-translate-y-0.5 transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2.5 md:gap-3 active:scale-95 animate-fade-in border border-emerald-500">
                    <i class="fa-solid fa-cloud-arrow-up text-base md:text-lg"></i>
                    <span>Registra Operazioni</span>
                </button>
            } @else if (canEdit()) {
                <div class="px-4 py-2.5 md:px-5 md:py-3 bg-white text-slate-400 rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-wider border border-slate-200 shadow-lg shadow-slate-200/50 flex items-center gap-2 md:gap-3 cursor-not-allowed">
                    <div class="relative flex items-center justify-center">
                        <svg class="animate-spin -ml-1 mr-1.5 md:mr-2 h-4 w-4 md:h-5 md:w-5 text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                    <span>In Completamento...</span>
                </div>
            }
        </div>

        <!-- Informational Modal -->
        @if (showStandardInfo()) {
            <div class="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" (click)="showStandardInfo.set(false)"></div>
                <div class="relative bg-white w-full max-w-md max-h-[90vh] rounded-2xl shadow-xl overflow-hidden flex flex-col animate-slide-up border border-slate-200">
                    <div class="bg-violet-600 px-6 py-5 text-white flex justify-between items-center relative overflow-hidden flex-shrink-0">
                        <div class="absolute inset-0 bg-gradient-to-r from-violet-700/50 to-transparent pointer-events-none"></div>
                        <div class="flex items-center gap-4 relative z-10">
                            <div class="w-10 h-10 rounded-lg bg-violet-500/30 flex items-center justify-center border border-violet-400/30">
                                <i class="fa-solid fa-screwdriver-wrench text-lg text-violet-100"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-bold">Manutenzione</h3>
                                <p class="text-[10px] md:text-xs text-violet-200 uppercase tracking-widest">Protocollo Standard</p>
                            </div>
                        </div>
                        <button (click)="showStandardInfo.set(false)" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors relative z-10 text-white">
                            <i class="fa-solid fa-xmark text-sm"></i>
                        </button>
                    </div>
                    
                    <div class="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 bg-slate-50">
                        <!-- Sezione Integrità -->
                        <div class="space-y-2">
                            <h4 class="text-[10px] md:text-xs font-black text-violet-600 uppercase tracking-widest flex items-center gap-2">
                                <i class="fa-solid fa-gears text-[10px]"></i> 01. Integrità
                            </h4>
                            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <p class="text-[11px] md:text-sm text-slate-600 leading-relaxed font-medium">
                                    Verificare lo stato di usura delle attrezzature, la tenuta delle guarnizioni e il corretto funzionamento dei motori. Segnalare anomalie strutturali come mattonelle o pavimenti danneggiati.
                                </p>
                            </div>
                        </div>

                        <!-- Sezione Detergenti/Lavaggio -->
                        <div class="space-y-2">
                            <h4 class="text-[10px] md:text-xs font-black text-violet-600 uppercase tracking-widest flex items-center gap-2">
                                <i class="fa-solid fa-soap text-[10px]"></i> 02. Azione Detergenti
                            </h4>
                            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <p class="text-[11px] md:text-sm text-slate-600 leading-relaxed italic">
                                    Utilizzare prodotti anionici per rimuovere lo sporco grasso e prodotti cationici per un effetto disinfettante. Non mescolare prodotti diversi e rispettare i tempi di contatto previsti.
                                </p>
                            </div>
                        </div>

                        <!-- Sezione Sicurezza -->
                        <div class="space-y-2">
                            <h4 class="text-[10px] md:text-xs font-black text-violet-600 uppercase tracking-widest flex items-center gap-2">
                                <i class="fa-solid fa-triangle-exclamation text-[10px]"></i> 03. Segnalazione
                            </h4>
                            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <p class="text-[11px] md:text-sm text-slate-600 font-medium italic">
                                    In caso di malfunzionamento grave, apporre cartello "FUORI SERVIZIO" e isolare l'area. Registrare ogni anomalia nel box note per l'intervento tecnico.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        }

        <!-- ANOMALY REPORTING MODAL -->
        @if (isAnomalyModalOpen()) {
            <div class="fixed inset-0 z-[120] flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" (click)="closeAnomalyModal()"></div>
                <div class="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-slide-up border border-slate-200">
                    
                    <!-- Header -->
                    <div class="px-6 py-5 bg-gradient-to-r from-red-600 to-rose-600 text-white flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-xl bg-white/20 border border-white/20 flex items-center justify-center">
                                <i class="fa-solid fa-triangle-exclamation text-xl"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-black uppercase tracking-tight leading-none mb-1">Segnalazione Anomalia</h3>
                                <p class="text-rose-100 text-[10px] font-bold uppercase tracking-widest opacity-80">Piano Sanificazione</p>
                            </div>
                        </div>
                        <button (click)="closeAnomalyModal()" class="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    <div class="p-8 space-y-6 bg-slate-50/50">
                        <div class="p-4 bg-white rounded-2xl border border-red-100 shadow-sm">
                            <h4 class="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                <i class="fa-solid fa-circle-info"></i> Controllo Selezionato
                            </h4>
                            <p class="text-lg font-bold text-slate-700 leading-tight">
                                {{ currentAnomalyStep()?.label }}
                            </p>
                        </div>

                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Dettaglio Anomalia / Azione Correttiva</label>
                            <textarea #anomalyText
                                      placeholder="Descrivi l'anomalia riscontrata e l'eventuale azione correttiva immediata intrapresa..."
                                      class="w-full h-32 px-4 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none text-base font-medium text-slate-700 transition-all shadow-sm bg-white resize-none"></textarea>
                        </div>

                        <div class="flex gap-4 pt-2">
                            <button (click)="closeAnomalyModal()"
                                    class="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">
                                ANNULLA
                            </button>
                            <button (click)="confirmAnomaly(anomalyText.value)"
                                    class="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95">
                                REGISTRA NON CONFORMITÀ
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        }
    </div>
    `,
    styles: [`
    .animate-bounce-in { animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55); }
    @keyframes bounceIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .animate-slide-down { animation: slideDown 0.3s ease-out; }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); opacity: 1; max-height: 1000px; } }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  `]
})
export class CleaningMaintenanceViewComponent {
    state = inject(AppStateService);
    toast = inject(ToastService);
    showStandardInfo = signal(false);
    moduleId = 'cleaning-maintenance';
    checks = signal<CheckItem[]>([]);

    // Anomaly Modal State
    isAnomalyModalOpen = signal(false);
    currentAnomalyStep = signal<{id: string, label: string} | null>(null);

    completedCount = computed<number>(() => {
        return this.checks().filter((c: CheckItem) => c.status !== 'pending').length;
    });

    constructor() {
        effect(() => {
            // React to state changes
            this.state.filterDate();
            this.state.filterCollaboratorId();
            this.state.currentUser();
            // Also react to groupedEquipment changes
            this.state.groupedEquipment();
            this.loadData();
        }, { allowSignalWrites: true });
    }

    loadData() {
        const equipment = this.state.groupedEquipment();
        const savedData = this.state.getRecord(this.moduleId);

        // Static items for Work Environments
        const staticItems: CheckItem[] = [
            { id: 'env-pavimenti', label: 'Pavimenti', icon: 'fa-border-all', status: 'pending', note: '' },
            { id: 'env-mattonelle', label: 'Pareti e Mattonelle', icon: 'fa-grip-lines-vertical', status: 'pending', note: '' },
            { id: 'env-infissi', label: 'Infissi e Zanzariere', icon: 'fa-window-maximize', status: 'pending', note: '' },
            { id: 'env-illuminazione', label: 'Sistemi di Illuminazione', icon: 'fa-lightbulb', status: 'pending', note: '' },
            { id: 'env-deposito', label: 'Deposito / Magazzino', icon: 'fa-warehouse', status: 'pending', note: '' },
            { id: 'env-spogliatoio', label: 'Spogliatoio', icon: 'fa-shirt', status: 'pending', note: '' },
            { id: 'env-ambienti-generico', label: 'Ambienti di Lavoro Generico', icon: 'fa-compass-drafting', status: 'pending', note: '' }
        ];

        const equipmentChecks = equipment.map(eq => {
            const saved = Array.isArray(savedData) ? savedData.find((s: any) => s.id === eq.name) : null;
            return {
                id: eq.name,
                label: eq.name,
                icon: this.state.getEquipmentIcon(eq.name),
                status: saved ? saved.status : 'pending',
                note: saved ? saved.note : ''
            } as CheckItem;
        });

        const environmentChecks = staticItems.map(item => {
            const saved = Array.isArray(savedData) ? savedData.find((s: any) => s.id === item.id) : null;
            return saved ? { ...item, status: saved.status, note: saved.note } : item;
        });

        this.checks.set([...environmentChecks, ...equipmentChecks]);
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

    setStatus(id: string, status: 'ok' | 'issue') {
        if (!this.canEdit()) return;

        if (status === 'issue') {
            const check = this.checks().find(c => c.id === id);
            if (check) {
                this.currentAnomalyStep.set({ id, label: check.label });
                this.isAnomalyModalOpen.set(true);
            }
            return;
        }

        this.checks.update(items => items.map(item => {
            if (item.id === id) {
                const newStatus = item.status === status ? 'pending' : status;
                return { ...item, status: newStatus, note: undefined };
            }
            return item;
        }));

        this.save();
    }

    closeAnomalyModal() {
        this.isAnomalyModalOpen.set(false);
        this.currentAnomalyStep.set(null);
    }

    confirmAnomaly(note: string) {
        const anomaly = this.currentAnomalyStep();
        if (!anomaly) return;

        this.checks.update(items => items.map(item => {
            if (item.id === anomaly.id) {
                return { ...item, status: 'issue', note };
            }
            return item;
        }));

        this.save();
        this.state.saveNonConformity({
            id: Math.random().toString(36).substring(2, 9),
            moduleId: this.moduleId,
            date: this.state.filterDate(),
            description: note || 'Anomalia rilevata durante il controllo sanificazione',
            itemName: anomaly.label
        });

        this.closeAnomalyModal();
    }

    onFinalSubmit() {
        if (!this.canEdit()) return;
        this.save();
        this.toast.success('Successo', 'Registro Manutenzione archiviato con successo');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    private save() {
        this.state.saveRecord(this.moduleId, this.checks());
    }
}

