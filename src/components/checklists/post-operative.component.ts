import { Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../../services/app-state.service';
import { ToastService } from '../../services/toast.service';

interface StepStatus {
    id: string; // pulizia, detersione, etc.
    label: string;
    icon: string;
    status: 'pending' | 'ok' | 'issue';
    note?: string;
}

interface AreaChecklist {
    id: string;
    label: string;
    icon: string;
    steps: StepStatus[];
    expanded: boolean;
}

@Component({
    selector: 'app-post-operative-checklist',
    standalone: true,
    imports: [CommonModule],
    template: `
    <!-- PRINT ONLY HEADER & TABLE -->
    <div class="hidden print:block font-sans text-black p-4">
        <div class="border-b-2 border-slate-800 pb-4 mb-6">
            <h1 class="text-2xl font-bold uppercase mb-1">{{ state.adminCompany().name || 'Azienda' }}</h1>
            <h2 class="text-xl font-light text-slate-600">Fase Post-operativa (Pulizia e Disinfezione)</h2>
            <div class="flex justify-between mt-4 text-lg text-slate-500">
                <span><span class="font-bold">Data:</span> {{ getFormattedDate() }}</span>
                <span><span class="font-bold">Operatore:</span> {{ state.currentUser()?.name || 'Operatore' }}</span>
            </div>
        </div>

        <table class="w-full text-left text-lg border-collapse">
            <thead>
                <tr class="border-b border-slate-400">
                    <th class="py-2 font-bold w-1/2">Area / Operazione</th>
                    <th class="py-2 font-bold w-1/4">Esito</th>
                    <th class="py-2 font-bold w-1/4">Note / Verifica</th>
                </tr>
            </thead>
            <tbody>
                @for (area of areas(); track area.id) {
                    <!-- Synthesized Area Row -->
                    <tr class="border-b border-slate-100 bg-slate-50/50">
                        <td class="py-2 pr-2 font-bold uppercase text-sm">{{ area.label }}</td>
                        <td class="py-2">
                            @if(getAreaStatusLabel(area.id) === 'Conforme') { 
                                <span class="font-bold text-emerald-800">CONFORME</span> 
                            } @else if(getAreaStatusLabel(area.id) === 'Rilevate Anomalie') { 
                                <span class="font-bold text-red-800">NON CONFORME</span> 
                            } @else { 
                                <span class="text-slate-400">NON ESEGUITO</span> 
                            }
                        </td>
                        <td class="py-2 italic text-slate-400 text-xs">
                            Verifica Area completata
                        </td>
                    </tr>
                    
                    <!-- Extended rows for NON CONFORME steps only -->
                    @for (step of area.steps; track step.id) {
                        @if(step.status === 'issue') {
                            <tr class="border-b border-slate-100 bg-red-50/30">
                                <td class="py-1 pl-6 pr-2 text-red-800 font-medium text-xs">
                                    <i class="fa-solid fa-triangle-exclamation mr-1 text-[10px]"></i>
                                    Dettaglio: {{ step.label }}
                                </td>
                                <td class="py-1 text-xs font-bold text-red-700">NON CONFORME</td>
                                <td class="py-1 italic text-red-600 text-[11px]">
                                    {{ step.note || 'Azione correttiva richiesta' }}
                                </td>
                            </tr>
                        }
                    }
                }
            </tbody>
        </table>

        <div class="mt-8 pt-4 border-t border-slate-300 flex justify-between text-base text-slate-400">
            <span>Documento generato da HACCP Pro</span>
            <span>Firma: ________________________</span>
        </div>
    </div>

    <!-- UI CONTENT (Hidden on print) -->
    <div class="print:hidden pb-20 animate-fade-in relative px-2 space-y-8">
        
        <!-- Premium Hero Header -->
        <!-- Sleek Professional Dashboard Header -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
            <div class="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none"></div>
            
            <div class="flex items-center gap-5 relative z-10">
                <div class="h-14 w-14 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-md">
                    <i class="fa-solid fa-moon text-2xl"></i>
                </div>
                <div>
                    <h2 class="text-2xl font-bold text-slate-800 tracking-tight">Fase Post-Operativa</h2>
                    <div class="flex items-center gap-3 mt-1">
                        <span class="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-widest leading-none">
                            <i class="fa-solid fa-circle text-[8px]" [class.text-emerald-500]="isSubmitted()" [class.text-amber-500]="!isSubmitted()"></i>
                            {{ isSubmitted() ? 'Registrato' : 'In Compilazione' }}
                        </span>
                        <span class="text-xs font-medium text-slate-400">|</span>
                        <span class="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                            <i class="fa-solid fa-user-check text-[10px]"></i> {{ state.currentUser()?.name || 'Operatore' }}
                        </span>
                    </div>
                </div>
            </div>

            <div class="w-full md:w-auto relative z-10">
                <div class="bg-slate-50 px-5 py-3 rounded-xl border border-slate-100 flex flex-col gap-2 min-w-[200px]">
                    <div class="flex items-center justify-between mb-0.5">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Completamento</p>
                        <span class="text-sm font-black text-slate-700 leading-none">{{ completedStepsCount() }}/{{ totalStepsCount() }}</span>
                    </div>
                    <div class="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div class="h-full bg-slate-900 rounded-full transition-all duration-1000" 
                             [style.width.%]="progressPercentage()"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Date Selector & Quick Actions -->
        <div class="print:hidden bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between relative z-20">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                    <i class="fa-solid fa-calendar-check text-base"></i>
                </div>
                <div>
                   <label class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Data Riferimento</label>
                   <input type="date" [value]="state.filterDate()" (change)="state.filterDate.set($any($event.target).value)" 
                          class="w-full font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer border-none p-0 text-lg leading-none">
                </div>
            </div>
            
            <button (click)="setAllOk()" 
                    [disabled]="isSubmitted() || !state.isContextEditable()"
                    class="px-4 py-2 rounded-lg bg-emerald-50 text-emerald-600 font-bold text-[11px] uppercase tracking-widest hover:bg-emerald-100 transition-colors border border-emerald-100 flex items-center gap-2 disabled:opacity-30"
                    title="Imposta tutto come Conforme">
               <i class="fa-solid fa-check-double text-base"></i><span class="hidden sm:inline">IMPOSTA TUTTI OK</span>
            </button>
        </div>

        <!-- Areas Checklist Expansion Panels -->
        <div class="mb-24">
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest px-2 mb-3">Aree di Ispezione Post-Operativa</h3>
            <div class="grid grid-cols-1 gap-3">
                <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div class="divide-y divide-slate-100">
                        @for (area of areas(); track area.id) {
                            <div class="flex flex-col">
                                <!-- Area Header -->
                                <div class="px-4 py-3 flex items-center justify-between transition-colors cursor-pointer select-none border-b border-transparent"
                                     [class.bg-slate-100]="area.expanded" [class.hover:bg-slate-50]="!area.expanded"
                                     (click)="toggleArea(area.id)">
                                    <div class="flex items-center gap-3 flex-1">
                                        <div class="h-8 w-8 rounded flex items-center justify-center text-base transition-colors border"
                                             [class.bg-purple-50]="isAreaComplete(area.id)" [class.text-purple-600]="isAreaComplete(area.id)" [class.border-purple-200]="isAreaComplete(area.id)"
                                             [class.bg-white]="!isAreaComplete(area.id)" [class.text-slate-400]="!isAreaComplete(area.id)" [class.border-slate-200]="!isAreaComplete(area.id)">
                                            <i [class]="'fa-solid ' + area.icon"></i>
                                        </div>
                                        <div>
                                            <h3 class="font-bold text-slate-700 text-lg leading-tight">{{ area.label }}</h3>
                                            <div class="flex items-center mt-0.5">
                                                <span class="text-[10px] font-black uppercase tracking-widest"
                                                      [class.text-emerald-500]="isAreaComplete(area.id) && !hasAreaIssues(area.id)" 
                                                      [class.text-red-500]="hasAreaIssues(area.id)"
                                                      [class.text-slate-400]="!isAreaComplete(area.id)">
                                                    {{ getAreaStatusLabel(area.id) }}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="flex items-center gap-3 shrink-0">
                                        <button (click)="setAllStepsInArea(area.id, 'ok'); $event.stopPropagation()" 
                                                [disabled]="isSubmitted() || !state.isContextEditable()"
                                                class="h-7 w-7 rounded bg-emerald-50 text-emerald-500 hover:bg-emerald-100 transition-colors flex items-center justify-center border border-emerald-100 disabled:opacity-30" title="Imposta tutti conformi">
                                            <i class="fa-solid fa-check-double text-xs"></i>
                                        </button>
                                        <i class="fa-solid fa-chevron-down text-slate-400 text-base transition-transform duration-300" [class.rotate-180]="area.expanded"></i>
                                    </div>
                                </div>
                    <!-- Steps Content (Expanded) -->
                    @if (area.expanded) {
                        <div class="bg-slate-50 border-t border-slate-200/60 px-4 py-2 divide-y divide-slate-200/50 select-none animate-slide-down shadow-inner">
                            @for (step of area.steps; track step.id; let i = $index) {
                                <div class="py-2.5 flex items-center justify-between gap-3 group/step">
                                    <div class="flex items-center gap-3 flex-1">
                                        <span class="text-[11px] font-black text-slate-400 w-5 h-5 rounded bg-white flex items-center justify-center border border-slate-200 shrink-0 leading-none">
                                            {{ i + 1 }}
                                        </span>
                                        <span class="text-sm font-bold text-slate-600 leading-tight transition-colors"
                                              [class.text-emerald-600]="step.status === 'ok'"
                                              [class.text-red-600]="step.status === 'issue'">
                                            {{ step.label }}
                                        </span>
                                    </div>
                                    <div class="flex gap-2 shrink-0">
                                        @if (step.status === 'pending') {
                                            <button (click)="setStepStatus(area.id, step.id, 'ok')" [disabled]="isSubmitted() || !state.isContextEditable()" class="w-7 h-7 rounded border border-emerald-200 text-emerald-500 hover:bg-emerald-50 transition-colors flex items-center justify-center bg-white disabled:opacity-30"><i class="fa-solid fa-check text-xs"></i></button>
                                            <button (click)="setStepStatus(area.id, step.id, 'issue')" [disabled]="isSubmitted() || !state.isContextEditable()" class="w-7 h-7 rounded border border-red-200 text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center bg-white disabled:opacity-30"><i class="fa-solid fa-triangle-exclamation text-xs"></i></button>
                                        } @else {
                                            <div class="flex items-center gap-2">
                                                <span class="text-[10px] font-black uppercase tracking-widest px-1"
                                                      [class.text-emerald-500]="step.status === 'ok'"
                                                      [class.text-red-500]="step.status === 'issue'">
                                                    {{ step.status === 'ok' ? 'Conforme' : 'Anomalia' }}
                                                </span>
                                                <button (click)="setStepStatus(area.id, step.id, 'pending')" [disabled]="isSubmitted() || !state.isContextEditable()" class="w-7 h-7 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors flex items-center justify-center disabled:opacity-30"><i class="fa-solid fa-rotate-left text-[11px]"></i></button>
                                            </div>
                                        }
                                    </div>
                                </div>
                            }
                        </div>
                    }
                </div>
            }
                        </div>
                    </div>
                </div>
        </div>

        <!-- Footer Actions -->
        <div class="fixed bottom-6 right-6 z-50">
            @if (!isSubmitted()) {
                <button (click)="submitChecklist()" [disabled]="!isAllCompleted() || !state.isContextEditable()"
                        class="h-12 px-6 bg-slate-900 border border-slate-800 text-white rounded-lg font-bold text-xs uppercase tracking-widest transition-all shadow-lg flex items-center gap-3 disabled:opacity-50 hover:bg-slate-800 hover:shadow-xl group">
                    <span>REGISTRA POST-OPERATIVA</span>
                    <div class="w-px h-4 bg-white/20"></div>
                    <i class="fa-solid fa-check-double group-hover:-translate-y-0.5 transition-transform text-pink-400"></i>
                </button>
            } @else {
                <div class="bg-white p-2 rounded-xl shadow-xl flex items-center gap-2 border border-slate-200 animate-slide-up">
                    <div class="px-4 py-2 border rounded-lg flex items-center gap-2"
                         [class.bg-emerald-50]="!hasIssues()" [class.border-emerald-100]="!hasIssues()" [class.text-emerald-600]="!hasIssues()"
                         [class.bg-red-50]="hasIssues()" [class.border-red-100]="hasIssues()" [class.text-red-600]="hasIssues()">
                        <i class="fa-solid" [class.fa-check]="!hasIssues()" [class.fa-triangle-exclamation]="hasIssues()"></i>
                        <span class="font-bold text-xs uppercase tracking-widest">{{ hasIssues() ? 'NON CONFORME' : 'REGISTRATO' }}</span>
                    </div>
                    <div class="flex items-center gap-1.5 px-2">
                        <button (click)="printReport()" class="h-8 w-8 rounded text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:text-pink-600 flex items-center justify-center transition-colors" title="Stampa"><i class="fa-solid fa-print text-base"></i></button>
                        <button *ngIf="state.isContextEditable()" (click)="isSubmitted.set(false)" class="h-8 w-8 rounded text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:text-amber-600 flex items-center justify-center transition-colors" title="Modifica"><i class="fa-solid fa-pen-to-square text-base"></i></button>
                        <button (click)="sendEmail()" class="h-8 w-8 rounded text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:text-pink-600 flex items-center justify-center transition-colors" title="Invia Email"><i class="fa-solid fa-envelope text-base"></i></button>
                        <button (click)="sendInternalMessage()" class="h-8 w-8 rounded text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:text-pink-600 flex items-center justify-center transition-colors" title="Chat Interna"><i class="fa-solid fa-comments text-base"></i></button>
                    </div>
                    <div class="w-px h-6 bg-slate-200"></div>
                    <button (click)="startNewChecklist()" class="h-8 px-4 rounded bg-pink-50 border border-pink-100 text-pink-600 hover:bg-pink-600 hover:text-white flex items-center gap-2 font-bold text-xs uppercase tracking-widest transition-colors">
                        <i class="fa-solid fa-plus text-base"></i> NUOVA
                    </button>
                </div>
            }
        </div>

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
                                <p class="text-rose-100 text-[10px] font-bold uppercase tracking-widest opacity-80">Documentazione Non Conformità</p>
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
        .animate-slide-down { animation: slideDown 0.3s ease-out; }
        @keyframes slideDown { 
            from { transform: translateY(-10px); opacity: 0; max-height: 0; } 
            to { transform: translateY(0); opacity: 1; max-height: 1000px; } 
        }
        .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    `]
})
export class PostOperationalChecklistComponent {
    state = inject(AppStateService);
    toast = inject(ToastService);

    readonly stepDefinitions = [
        { id: 'scopatura', label: 'Scopatura', icon: 'fa-broom' },
        { id: 'detersione', label: 'Detersione', icon: 'fa-soap' },
        { id: 'disinfezione', label: 'Disinfezione', icon: 'fa-virus-slash' }
    ];

    staticAreas: AreaChecklist[] = [

        { id: 'cucina-sala', label: 'Cucina e Sala', icon: 'fa-utensils', steps: [], expanded: false },
        { id: 'area-lavaggio', label: 'Area Lavaggio', icon: 'fa-sink', steps: [], expanded: false },
        { id: 'deposito', label: 'Deposito', icon: 'fa-boxes-stacked', steps: [], expanded: false },
        { id: 'spogliatoio', label: 'Spogliatoio', icon: 'fa-shirt', steps: [], expanded: false },
        { id: 'antibagno-bagno-personale', label: 'Antibagno e Bagno Personale', icon: 'fa-restroom', steps: [], expanded: false },
        { id: 'bagno-clienti', label: 'Bagno Clienti', icon: 'fa-people-arrows', steps: [], expanded: false },
        { id: 'pavimenti', label: 'Pavimenti', icon: 'fa-table-cells', steps: [], expanded: false },
        { id: 'pareti', label: 'Pareti (All\'occorrenza)', icon: 'fa-border-all', steps: [], expanded: false },
        { id: 'soffitto', label: 'Soffitto (All\'occorrenza)', icon: 'fa-cloud', steps: [], expanded: false },
        { id: 'infissi', label: 'Infissi (All\'occorrenza)', icon: 'fa-door-closed', steps: [], expanded: false },
        { id: 'reti-antiintrusione', label: 'Reti Anti-intrusione (All\'occorrenza)', icon: 'fa-shield-cat', steps: [], expanded: false },
    ];

    areas = signal<AreaChecklist[]>([]);

    isSubmitted = signal(false);
    currentRecordId = signal<string | null>(null);

    // Anomaly Modal State
    isAnomalyModalOpen = signal(false);
    currentAnomalyStep = signal<{areaId: string, id: string, label: string} | null>(null);

    getInitialSteps(areaId: string): StepStatus[] {
        const isEquipment = areaId.startsWith('eq-');
        const noScopaturaAreas = ['soffitto', 'infissi', 'reti-antiintrusione', 'pareti'];

        if (isEquipment || noScopaturaAreas.includes(areaId)) {
            return [
                { id: 'detersione', label: 'Detersione', icon: 'fa-soap', status: 'pending' },
                { id: 'disinfezione', label: 'Disinfezione', icon: 'fa-virus-slash', status: 'pending' }
            ];
        }

        return [
            { id: 'scopatura', label: 'Scopatura', icon: 'fa-broom', status: 'pending' },
            { id: 'detersione', label: 'Detersione', icon: 'fa-soap', status: 'pending' },
            { id: 'disinfezione', label: 'Disinfezione', icon: 'fa-virus-slash', status: 'pending' }
        ];
    }

    constructor() {
        effect(() => {
            // Re-load data when global filters change or equipment changes
            this.state.filterDate();
            this.state.selectedEquipment(); // re-run when equipment changes
            untracked(() => this.loadData());
        }, { allowSignalWrites: true });
    }

    loadData() {
        const date = this.state.filterDate() || new Date().toISOString().split('T')[0];

        // 1. First check if we have a submitted record for this date/module in history
        const historyRecord = this.state.checklistRecords().find(r =>
            r.moduleId === 'post-op-checklist' &&
            r.date === date &&
            r.userId === this.state.currentUser()?.id
        );

        // Census equipment to be added as areas
        const census = this.state.groupedEquipment();
        const equipmentAreas: AreaChecklist[] = census.map(eq => {
            const nameLower = eq.name.toLowerCase();
            let icon = 'fa-snowflake';
            if (nameLower.includes('congelatore')) icon = 'fa-icicles';
            else if (nameLower.includes('pozzetto')) icon = 'fa-box-archive';
            else if (nameLower.includes('forno')) icon = 'fa-fire';
            else if (nameLower.includes('frigo')) icon = 'fa-snowflake';
            else if (nameLower.includes('lavello')) icon = 'fa-sink';
            else icon = 'fa-microchip';

            return {
                id: `eq-${eq.id}`,
                label: `${eq.name}`,
                icon: icon,
                steps: [],
                expanded: false
            };
        });

        // Initialize static + equipment areas with correct steps
        const currentAreas = [...this.staticAreas, ...equipmentAreas]
            .filter(a => {
                if (a.id.startsWith('eq-')) return true;
                return this.state.isActivityEnabled('post-op-checklist', a.id);
            })
            .map(a => ({
                ...a,
                steps: this.getInitialSteps(a.id)
            }));

        const savedData = this.state.getRecord('post-op-checklist');

        if (historyRecord) {
            const savedAreas = historyRecord.data.areas || [];
            // Merge: take everything in currentAreas, if it was in savedAreas use saved status
            const merged = currentAreas.map(a => {
                const saved = savedAreas.find((sa: any) => sa.id === a.id);
                if (!saved) return a;

                const currentStepsDef = this.getInitialSteps(a.id);
                const updatedSteps = saved.steps.map((step: any) => {
                    const def = currentStepsDef.find(d => d.id === step.id);
                    return { ...step, label: def?.label || step.label };
                });
                const currentIds = new Set(currentStepsDef.map(d => d.id));
                const filtered = updatedSteps.filter((s: any) => currentIds.has(s.id));
                const existingIds = new Set(filtered.map((s: any) => s.id));
                const missing = currentStepsDef.filter(d => !existingIds.has(d.id));

                return { ...a, steps: [...filtered, ...missing], expanded: saved.expanded };
            });

            this.areas.set(merged);
            this.currentRecordId.set(historyRecord.id);
            this.isSubmitted.set(!!historyRecord.data?.status);
            return;
        }

        if (savedData && savedData.areas) {
            // Merge saved steps with current structure
            const merged = currentAreas.map(a => {
                const saved = savedData.areas.find((sa: any) => sa.id === a.id);
                if (!saved) return a;

                const currentStepsDef = this.getInitialSteps(a.id);
                const updatedSteps = saved.steps.map((step: any) => {
                    const def = currentStepsDef.find(d => d.id === step.id);
                    return { ...step, label: def?.label || step.label };
                });
                const currentIds = new Set(currentStepsDef.map(d => d.id));
                const filtered = updatedSteps.filter((s: any) => currentIds.has(s.id));
                const existingIds = new Set(filtered.map((s: any) => s.id));
                const missing = currentStepsDef.filter(d => !existingIds.has(d.id));

                const existingArea = this.areas().find(ea => ea.id === a.id);
                const isExpanded = existingArea ? existingArea.expanded : (saved ? !!saved.expanded : false);

                return { ...a, steps: [ ...filtered, ...missing ], expanded: isExpanded };
            });
            this.areas.set(merged);
            this.isSubmitted.set(false);
            this.currentRecordId.set(null);
        } else {
            this.areas.set(currentAreas.map(a => {
                const existing = this.areas().find(ea => ea.id === a.id);
                return { ...a, expanded: existing ? existing.expanded : a.expanded };
            }));
            this.isSubmitted.set(false);
            this.currentRecordId.set(null);
        }
    }

    toggleArea(id: string) {
        this.areas.update(areas => areas.map(a => a.id === id ? { ...a, expanded: !a.expanded } : a));
    }

    setStepStatus(areaId: string, stepId: string, status: 'pending' | 'ok' | 'issue') {
        if (!this.state.isContextEditable()) return;

        if (status === 'issue') {
            const area = this.areas().find(a => a.id === areaId);
            const step = area?.steps.find(s => s.id === stepId);
            if (step) {
                this.currentAnomalyStep.set({ areaId, id: stepId, label: step.label });
                this.isAnomalyModalOpen.set(true);
            }
            return;
        }

        this.areas.update(areas => areas.map(a => {
            if (a.id === areaId) {
                return {
                    ...a,
                    steps: a.steps.map(s => s.id === stepId ? { ...s, status, note: undefined } : s)
                };
            }
            return a;
        }));

        this.autoSave();
    }

    private autoSaveTimeout: any;
    private autoSave() {
        if (this.autoSaveTimeout) clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => {
            this.state.saveRecord('post-op-checklist', {
                areas: this.areas(),
                totalSteps: this.totalStepsCount(),
                completedSteps: this.completedStepsCount()
            });
        }, 2000);
    }

    setAllStepsInArea(areaId: string, status: 'ok' | 'issue') {
        if (!this.state.isContextEditable()) return;

        this.areas.update(areas => areas.map(a => {
            if (a.id === areaId) {
                return {
                    ...a,
                    steps: a.steps.map(s => ({ ...s, status })),
                    expanded: true // Auto-expand to show the changes
                };
            }
            return a;
        }));

        // Auto-save the state to the record store
        this.state.saveRecord('post-op-checklist', {
            areas: this.areas(),
            totalSteps: this.totalStepsCount(),
            completedSteps: this.completedStepsCount()
        });

        // Show feedback
        const area = this.areas().find(a => a.id === areaId);
        const statusLabel = status === 'ok' ? 'Conforme' : 'Non Conforme';
        this.toast.success('Area Aggiornata', `Tutti i controlli di "${area?.label}" sono stati segnati come ${statusLabel}.`);
    }

    isAreaComplete(areaId: string): boolean {
        const area = this.areas().find(a => a.id === areaId);
        return area ? area.steps.every(s => s.status !== 'pending') : false;
    }

    isAreaAllOk(areaId: string): boolean {
        const area = this.areas().find(a => a.id === areaId);
        return area ? area.steps.every(s => s.status === 'ok') : false;
    }

    isAreaAllIssue(areaId: string): boolean {
        const area = this.areas().find(a => a.id === areaId);
        return area ? area.steps.every(s => s.status === 'issue') : false;
    }

    hasAreaIssues(areaId: string): boolean {
        const area = this.areas().find(a => a.id === areaId);
        return area ? area.steps.some(s => s.status === 'issue') : false;
    }

    hasAreaOk(areaId: string): boolean {
        const area = this.areas().find(a => a.id === areaId);
        return area ? area.steps.some(s => s.status === 'ok') : false;
    }

    getCompletedStepsInArea(areaId: string): number {
        const area = this.areas().find(a => a.id === areaId);
        return area ? area.steps.filter(s => s.status !== 'pending').length : 0;
    }

    getAreaStatusLabel(areaId: string): string {
        const complete = this.isAreaComplete(areaId);
        if (!complete) return 'In corso';

        const area = this.areas().find(a => a.id === areaId);
        const hasIssue = area?.steps.some(s => s.status === 'issue');
        return hasIssue ? 'Rilevate Anomalie' : 'Conforme';
    }

    totalStepsCount() {
        return this.areas().reduce((acc, area) => acc + area.steps.length, 0);
    }

    completedStepsCount() {
        return this.areas().reduce((acc, area) => {
            return acc + area.steps.filter(s => s.status !== 'pending').length;
        }, 0);
    }

    progressPercentage() {
        const total = this.totalStepsCount();
        return total > 0 ? (this.completedStepsCount() / total) * 100 : 0;
    }

    isAllCompleted() {
        return this.completedStepsCount() === this.totalStepsCount();
    }

    hasIssues() {
        return this.areas().some(area => area.steps.some(s => s.status === 'issue'));
    }

    getFormattedDate() {
        return new Date(this.state.filterDate()).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    submitChecklist() {
        const date = this.state.filterDate() || new Date().toISOString().split('T')[0];

        // Check if we already have a record for this date to avoid duplicates
        const existingRecord = this.state.checklistRecords().find(r =>
            r.moduleId === 'post-op-checklist' &&
            r.date === date &&
            r.userId === this.state.currentUser()?.id
        );

        const recordId = this.currentRecordId() || existingRecord?.id || Math.random().toString(36).substr(2, 9);
        this.currentRecordId.set(recordId);

        // Calculate status like phases 1 and 2
        const hasIssues = this.hasIssues();
        const status = hasIssues ? 'Non Conforme' : 'Conforme';

        this.state.saveChecklist({
            id: recordId,
            moduleId: 'post-op-checklist',
            date: date,
            data: {
                areas: this.areas(),
                totalSteps: this.totalStepsCount(),
                completedSteps: this.completedStepsCount(),
                status: status,
                summary: hasIssues ? `Rilevate anomalie in ${this.areas().filter(a => a.steps.some(s => s.status === 'issue')).length} aree` : 'Tutto Conforme'
            }
        });

        if (existingRecord) {
            this.toast.info('Registrazione Aggiornata', 'La registrazione esistente per oggi è stata sovrascritta con le nuove modifiche.');
        } else {
            this.toast.success('Fase Post-Operativa Registrata', 'Le operazioni sono state salvate correttamente nello storico.');
        }

        this.isSubmitted.set(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    resetForm() {
        this.isSubmitted.set(false);
        this.areas.update(areas => areas.map(a => ({
            ...a,
            steps: this.getInitialSteps(a.id),
            expanded: false
        })));
    }

    setAllOk() {
        this.areas.update(areas => areas.map(area => ({
            ...area,
            steps: area.steps.map(step => ({ ...step, status: 'ok' }))
        })));
        this.toast.info('Tutto Conforme', 'Tutte le operazioni di pulizia sono state impostate come conformi.');
    }

    printReport() {
        window.scrollTo(0, 0); // Scroll to top to ensure print preview starts correctly
        setTimeout(() => {
            window.print();
        }, 100);
    }

    sendEmail() {
        const adminEmail = this.state.adminCompany().email || 'amministrazione@haccp-pro.it';
        this.toast.success('Email Inviata', `Il report PDF è stato inviato a ${adminEmail}`);
    }

    sendInternalMessage() {
        const issuesCount = this.areas().reduce((acc, area) => {
            return acc + area.steps.filter(s => s.status === 'issue').length;
        }, 0);
        const statusText = issuesCount === 0 ? 'Tutto Conforme' : `Rilevate ${issuesCount} Non Conformità`;

        const newMessage = {
            id: Date.now().toString(),
            senderId: this.state.currentUser()?.id || 'unknown',
            senderName: this.state.currentUser()?.name || 'Operatore',
            content: `Report Post-Operativo di oggi completato. Esito: ${statusText}. Vedi allegato.`,
            timestamp: new Date(),
            isRead: false,
            attachments: ['Report_Post_Operativo_' + new Date().toLocaleDateString().replace(/\//g, '-') + '.pdf']
        };

        this.state.addMessage(newMessage);
        this.toast.success('Messaggio Inviato', 'Il report è stato allegato alla messaggistica interna.');
    }

    closeAnomalyModal() {
        this.isAnomalyModalOpen.set(false);
        this.currentAnomalyStep.set(null);
    }

    confirmAnomaly(note: string) {
        const anomaly = this.currentAnomalyStep();
        if (!anomaly) return;

        this.areas.update(areas => areas.map(a => {
            if (a.id === anomaly.areaId) {
                return {
                    ...a,
                    steps: a.steps.map(s => s.id === anomaly.id ? { ...s, status: 'issue', note } : s)
                };
            }
            return a;
        }));

        this.state.saveRecord('post-op-checklist', {
            areas: this.areas(),
            totalSteps: this.totalStepsCount(),
            completedSteps: this.completedStepsCount()
        });

        this.closeAnomalyModal();
    }

    startNewChecklist() {
        this.resetForm();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}
