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
                                <div (click)="hasAreaIssues(area.id) ? openProcedureModal(area) : toggleArea(area.id)"
                                     class="p-5 flex flex-col gap-4 transition-all cursor-pointer select-none border-b border-slate-100 group"
                                     [class.bg-slate-50]="area.expanded" 
                                     [class.bg-red-50/50]="hasAreaIssues(area.id)"
                                     [class.border-red-200]="hasAreaIssues(area.id)">
                                    
                                    <!-- Row 1: Info & Title -->
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-3">
                                            <div class="h-12 w-12 rounded-2xl flex items-center justify-center text-xl transition-all border shadow-sm"
                                                 [class.bg-red-500]="hasAreaIssues(area.id)" [class.text-white]="hasAreaIssues(area.id)" [class.border-red-600]="hasAreaIssues(area.id)"
                                                 [class.bg-purple-600]="isAreaComplete(area.id) && !hasAreaIssues(area.id)" [class.text-white]="isAreaComplete(area.id) && !hasAreaIssues(area.id)" [class.border-purple-700]="isAreaComplete(area.id) && !hasAreaIssues(area.id)"
                                                 [class.bg-white]="!isAreaComplete(area.id)" [class.text-slate-400]="!isAreaComplete(area.id)" [class.border-slate-200]="!isAreaComplete(area.id)">
                                                <i [class]="'fa-solid ' + (hasAreaIssues(area.id) ? 'fa-triangle-exclamation' : area.icon)"></i>
                                            </div>
                                            <div>
                                                <h3 class="font-black text-slate-800 text-lg leading-tight uppercase tracking-tight"
                                                    [class.text-red-800]="hasAreaIssues(area.id)">{{ area.label }}</h3>
                                                <div class="flex items-center gap-2 mt-1">
                                                    <span class="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                                                          [class.bg-emerald-100]="isAreaComplete(area.id) && !hasAreaIssues(area.id)" [class.text-emerald-700]="isAreaComplete(area.id) && !hasAreaIssues(area.id)"
                                                          [class.bg-red-100]="hasAreaIssues(area.id)" [class.text-red-700]="hasAreaIssues(area.id)"
                                                          [class.bg-slate-100]="!isAreaComplete(area.id)" [class.text-slate-500]="!isAreaComplete(area.id)">
                                                        {{ getAreaStatusLabel(area.id) }}
                                                    </span>
                                                    @if (!hasAreaIssues(area.id)) {
                                                        <span class="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">
                                                            {{ area.expanded ? 'Chiudi' : 'Dettagli' }} <i class="fa-solid" [class.fa-chevron-up]="area.expanded" [class.fa-chevron-down]="!area.expanded"></i>
                                                        </span>
                                                    }
                                                </div>
                                            </div>
                                        </div>

                                        @if (hasAreaIssues(area.id)) {
                                            <div class="h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center animate-pulse border border-red-200">
                                                <i class="fa-solid fa-hand-pointer"></i>
                                            </div>
                                        }
                                    </div>

                                    <!-- Row 2: Large Touch-Friendly Buttons -->
                                    <div class="flex items-center gap-3 w-full">
                                        <!-- OK BUTTON -->
                                        <button (click)="setAllStepsInArea(area.id, 'ok'); $event.stopPropagation()" 
                                                [disabled]="isSubmitted() || !state.isContextEditable()"
                                                class="flex-1 h-16 rounded-2xl border-2 transition-all flex items-center justify-center gap-3 shadow-md active:scale-95 disabled:opacity-30"
                                                [class.border-emerald-500]="isAreaComplete(area.id) && !hasAreaIssues(area.id)"
                                                [class.bg-emerald-500]="isAreaComplete(area.id) && !hasAreaIssues(area.id)"
                                                [class.text-white]="isAreaComplete(area.id) && !hasAreaIssues(area.id)"
                                                [class.border-slate-200]="!isAreaComplete(area.id) || hasAreaIssues(area.id)"
                                                [class.bg-white]="!isAreaComplete(area.id) || hasAreaIssues(area.id)"
                                                [class.text-slate-400]="!isAreaComplete(area.id) || hasAreaIssues(area.id)">
                                            <i class="fa-solid fa-circle-check text-2xl"></i>
                                            <span class="text-xs font-black uppercase tracking-widest">CONFORME</span>
                                        </button>

                                        <!-- NO BUTTON -->
                                        <button (click)="setAreaIssue(area.id); $event.stopPropagation()" 
                                                [disabled]="isSubmitted() || !state.isContextEditable()"
                                                class="flex-1 h-16 rounded-2xl border-2 transition-all flex items-center justify-center gap-3 shadow-md active:scale-95 disabled:opacity-30"
                                                [class.border-red-500]="hasAreaIssues(area.id)"
                                                [class.bg-red-500]="hasAreaIssues(area.id)"
                                                [class.text-white]="hasAreaIssues(area.id)"
                                                [class.border-slate-200]="!hasAreaIssues(area.id)"
                                                [class.bg-white]="!hasAreaIssues(area.id)"
                                                [class.text-slate-400]="!hasAreaIssues(area.id)">
                                            <i class="fa-solid fa-circle-exclamation text-2xl"></i>
                                            <span class="text-xs font-black uppercase tracking-widest">ANOMALIA</span>
                                        </button>
                                    </div>

                                    <!-- NON-CONFORMITY SUMMARY (Only if issues) -->
                                    @if (hasAreaIssues(area.id)) {
                                        <div class="p-4 bg-white/60 rounded-xl border border-red-100 space-y-1">
                                            @for (step of getIssueSteps(area.id); track step.id) {
                                                <p class="text-[11px] font-bold text-red-600 flex items-center gap-2">
                                                    <i class="fa-solid fa-circle text-[4px]"></i>
                                                    {{ step.label }}
                                                </p>
                                            }
                                            <p class="text-[10px] font-black text-red-400 mt-2 uppercase tracking-tight italic">
                                                <i class="fa-solid fa-circle-info mr-1"></i> Clicca il banner per i dettagli
                                            </p>
                                        </div>
                                    }
                                </div>
                    <!-- Steps Content (Expanded) -->
                    @if (area.expanded) {
                        <div class="bg-slate-50 border-t border-slate-200/60 px-4 py-2 divide-y divide-slate-200/50 select-none animate-slide-down shadow-inner">
                            @for (step of area.steps; track step.id; let i = $index) {
                                <div class="py-2.5 px-3 flex items-center justify-between gap-3 group/step cursor-pointer hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100"
                                     (click)="step.status === 'issue' ? openProcedureModal(area) : toggleStepStatus(area.id, step.id)">
                                    <div class="flex items-center gap-3 flex-1">
                                        <span class="text-[11px] font-black text-slate-400 w-5 h-5 rounded bg-white flex items-center justify-center border border-slate-200 shrink-0 leading-none group-hover/step:border-purple-200 group-hover/step:text-purple-400 transition-colors">
                                            {{ i + 1 }}
                                        </span>
                                        <span class="text-sm font-bold text-slate-600 leading-tight transition-colors"
                                              [class.text-emerald-600]="step.status === 'ok'"
                                              [class.text-red-600]="step.status === 'issue'">
                                            {{ step.label }}
                                        </span>
                                    </div>
                                    <div class="flex gap-2 shrink-0">
                                        <div class="flex items-center gap-2">
                                            <span class="text-[10px] font-black uppercase tracking-widest px-1"
                                                  [class.text-emerald-500]="step.status === 'ok'"
                                                  [class.text-red-500]="step.status === 'issue'"
                                                  [class.text-slate-300]="step.status === 'pending'">
                                                {{ step.status === 'ok' ? 'Conforme' : (step.status === 'issue' ? 'Anomalia' : 'In attesa') }}
                                            </span>
                                        </div>
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
        <!-- Bottom Utility Actions (Discrete) -->
        <div class="mt-8 mb-20 px-6 flex flex-col items-center gap-6">
            <div class="h-px w-24 bg-slate-200"></div>
            
            <div class="flex items-center gap-4 w-full max-w-xs">
                <button (click)="printReport()" 
                        class="flex-1 h-12 rounded-2xl text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-2 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm">
                    <i class="fa-solid fa-print text-sm"></i> Stampa
                </button>
                <button (click)="isResetModalOpen.set(true)" 
                        class="flex-1 h-12 rounded-2xl text-rose-500 bg-white border border-rose-100 hover:bg-rose-50 flex items-center justify-center gap-2 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm">
                    <i class="fa-solid fa-rotate-left text-sm"></i> Reset
                </button>
            </div>
            
            <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">
                <i class="fa-solid fa-cloud-check text-emerald-400 mr-1"></i> Salvataggio Automatico Attivo
            </p>
        </div>

        <!-- RESET CONFIRMATION MODAL -->
        @if (isResetModalOpen()) {
           <div class="fixed inset-0 z-[150] flex items-center justify-center p-4">
              <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" (click)="isResetModalOpen.set(false)"></div>
              <div class="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden animate-slide-up border border-slate-200">
                 <div class="p-8 text-center">
                    <div class="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4 border border-rose-100 shadow-sm">
                       <i class="fa-solid fa-triangle-exclamation text-3xl"></i>
                    </div>
                    <h3 class="text-xl font-black text-slate-800 mb-2">Reset Post-Op?</h3>
                    <p class="text-xs font-bold text-slate-500 leading-relaxed mb-8">
                       Questa azione cancellerà tutti i dati inseriti nella fase post-operativa attuale. L'operazione non è reversibile.
                    </p>
                    
                    <div class="flex flex-col gap-3">
                       <button (click)="confirmReset()" 
                               class="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-200 active:scale-95 transition-all">
                          SÌ, RESETTA TUTTO
                       </button>
                       <button (click)="isResetModalOpen.set(false)" 
                               class="w-full py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all">
                          ANNULLA
                       </button>
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
                                      [value]="anomalySubject"
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

        <!-- PROCEDURE MODAL (Procedimento Correttivo) -->
        @if (isProcedureModalOpen()) {
            <div class="fixed inset-0 z-[130] flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" (click)="closeProcedureModal()"></div>
                <div class="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-slide-up border border-slate-200 flex flex-col">
                    
                    <!-- Header -->
                    <div class="p-8 bg-gradient-to-br from-red-600 to-rose-700 text-white flex-shrink-0">
                        <div class="flex items-center gap-5">
                            <div class="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-lg border border-white/30">
                                <i class="fa-solid fa-hand-holding-medical"></i>
                            </div>
                            <div>
                                <h3 class="text-2xl font-black tracking-tight">Procedimento Correttivo</h3>
                                <p class="text-rose-100 text-[10px] font-black uppercase tracking-widest opacity-80">Azione richiesta per ripristinare la conformità</p>
                            </div>
                        </div>
                    </div>

                    <div class="p-8 space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
                        <div class="p-5 bg-red-50 rounded-3xl border border-red-100">
                            <h4 class="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <i class="fa-solid fa-triangle-exclamation"></i> Area Interessata
                            </h4>
                            <p class="text-xl font-bold text-slate-800 leading-tight">
                                {{ selectedProcedureArea()?.label }}
                            </p>
                            <div class="mt-3 flex flex-wrap gap-2">
                                @for (step of getIssueSteps(selectedProcedureArea()?.id || ''); track step.id) {
                                    <span class="px-2 py-1 bg-white border border-red-200 text-red-700 text-[10px] font-bold rounded-lg uppercase shadow-xs">
                                        {{ step.label }}
                                    </span>
                                }
                            </div>
                        </div>

                        <div class="space-y-4">
                            <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Protocollo di Intervanto</h4>
                            
                            <div class="space-y-3">
                                @for (step of getAreaProcedures(selectedProcedureArea()?.id || ''); track $index) {
                                    <div class="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:bg-white hover:border-red-200 group">
                                        <div class="h-8 w-8 rounded-xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center shrink-0 font-black text-xs shadow-sm group-hover:bg-red-600 group-hover:text-white group-hover:border-red-600 transition-all">
                                            {{ $index + 1 }}
                                        </div>
                                        <p class="text-sm font-bold text-slate-600 leading-relaxed group-hover:text-slate-800 transition-colors">
                                            {{ step }}
                                        </p>
                                    </div>
                                } @empty {
                                    <div class="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Procedura standard non definita</p>
                                        <p class="text-[10px] text-slate-400 mt-1 italic">Contattare il responsabile HACCP per indicazioni specifiche.</p>
                                    </div>
                                }
                            </div>
                        </div>

                        <div class="p-5 bg-blue-50 rounded-3xl border border-blue-100">
                            <div class="flex gap-3">
                                <i class="fa-solid fa-circle-info text-blue-500 mt-0.5"></i>
                                <p class="text-xs text-blue-800 leading-relaxed">
                                    <b>Nota:</b> Dopo aver eseguito le azioni sopra indicate, è obbligatorio verificare nuovamente l'area e, se conforme, aggiornare lo stato del registro.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div class="p-8 pt-0 flex gap-4">
                        <button (click)="closeProcedureModal()"
                                class="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-200">
                            Chiudi
                        </button>
                        <button (click)="resolveAreaIssues(selectedProcedureArea()?.id || '')"
                                class="flex-[1.5] py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 active:scale-95">
                            Risolto e Conforme
                        </button>
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

    isResetModalOpen = signal(false);
    isSubmitted = signal(false);
    currentRecordId = signal<string | null>(null);

    // Anomaly Modal State
    isAnomalyModalOpen = signal(false);
    currentAnomalyStep = signal<{areaId: string, id: string, label: string} | null>(null);
    selectedAreaForIssue = signal<string | null>(null);
    anomalySubject = '';

    // Procedure Modal State
    isProcedureModalOpen = signal(false);
    selectedProcedureArea = signal<AreaChecklist | null>(null);

    private readonly AREA_PROCEDURES: Record<string, string[]> = {
        'cucina-sala': [
            'Rimuovere i rifiuti e i residui alimentari.',
            'Procedere con la detersione profonda di tutte le superfici.',
            'Sanificare con prodotto a base di cloro lasciando agire per 5 minuti.',
            'Asciugare con carta a perdere.'
        ],
        'area-lavaggio': [
            'Disincrostare i lavelli e le rubinetterie.',
            'Pulire i filtri delle macchine lavastoviglie.',
            'Sanificare le zone circostanti e i piani di scarico.'
        ],
        'pavimenti': [
            'Eseguire spazzamento ad umido o aspirazione.',
            'Lavare con detergente sgrassante ed igienizzante.',
            'Verificare l\'assenza di ristagni d\'acqua.'
        ],
        'bagno-personale': [
            'Pulire e sanificare i sanitari.',
            'Ripristinare sapone e asciugamani monouso.',
            'Sanificare maniglie e interruttori.'
        ]
    };

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
            this.state.filterDate();
            this.state.filterCollaboratorId(); // Reload when selected collaborator changes
            this.state.selectedEquipment(); // Re-run when equipment changes
            this.state.initialSyncDone(); // Depend on initial sync done status
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


    setAreaIssue(areaId: string) {

        const area = this.areas().find(a => a.id === areaId);
        if (!area) return;

        this.selectedAreaForIssue.set(areaId);
        this.anomalySubject = `Anomalia riscontrata in: ${area.label}`;
        this.isAnomalyModalOpen.set(true);
    }

    private autoSaveTimeout: any;
    private autoSave() {
        if (this.autoSaveTimeout) clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => {
            this.state.saveRecord('post-op-checklist', {
                areas: this.areas(),
                totalSteps: this.totalStepsCount(),
                completedSteps: this.completedStepsCount(),
                status: this.isSubmitted() ? (this.hasIssues() ? 'Non Conforme' : 'Conforme') : undefined
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
            completedSteps: this.completedStepsCount(),
            status: this.isSubmitted() ? (this.hasIssues() ? 'Non Conforme' : 'Conforme') : undefined
        });

        // Show feedback
        const area = this.areas().find(a => a.id === areaId);
        const statusLabel = status === 'ok' ? 'Conforme' : 'Non Conforme';
        this.toast.success('Area Aggiornata', `Tutti i controlli di "${area?.label}" sono stati segnati come ${statusLabel}.`);
    }

    toggleStepStatus(areaId: string, stepId: string) {
        if (this.isSubmitted() || !this.state.isContextEditable()) return;
        
        const area = this.areas().find(a => a.id === areaId);
        const step = area?.steps.find(s => s.id === stepId);
        
        if (!step) return;

        if (step.status === 'ok') {
            this.setStepStatus(areaId, stepId, 'issue');
        } else {
            this.setStepStatus(areaId, stepId, 'ok');
        }
    }

    setStepStatus(areaId: string, stepId: string, status: 'pending' | 'ok' | 'issue') {
        const area = this.areas().find(a => a.id === areaId);
        const step = area?.steps.find(s => s.id === stepId);
        
        if (status === 'issue' && step) {
            this.currentAnomalyStep.set({ areaId, id: stepId, label: step.label });
            this.selectedAreaForIssue.set(null);
            this.anomalySubject = `Anomalia riscontrata in: ${step.label}`;
            this.isAnomalyModalOpen.set(true);
            return;
        }

        this.areas.update(areas => areas.map(a => {
            if (a.id === areaId) {
                return { ...a, steps: a.steps.map(s => s.id === stepId ? { ...s, status } : s) };
            }
            return a;
        }));

        this.state.saveRecord('post-op-checklist', {
            areas: this.areas(),
            totalSteps: this.totalStepsCount(),
            completedSteps: this.completedStepsCount(),
            status: this.isSubmitted() ? (this.hasIssues() ? 'Non Conforme' : 'Conforme') : undefined
        });
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

    getIssueSteps(areaId: string) {
        const area = this.areas().find(a => a.id === areaId);
        return area?.steps.filter(s => s.status === 'issue') || [];
    }

    getAreaProcedures(areaId: string): string[] {
        if (areaId.startsWith('eq-')) {
            return [
                'Pulire le superfici esterne ed interne dell\'attrezzatura.',
                'Sanificare le guarnizioni e le maniglie.',
                'Verificare il corretto svuotamento di eventuali vaschette di condensa.',
                'Segnalare eventuali anomalie meccaniche.'
            ];
        }
        return this.AREA_PROCEDURES[areaId] || [
            'Eseguire una pulizia straordinaria dell\'elemento non conforme.',
            'Applicare il protocollo di sanificazione specifico.',
            'Verificare visivamente il risultato.',
            'Documentare l\'azione nel registro di monitoraggio.'
        ];
    }

    openProcedureModal(area: AreaChecklist) {
        this.selectedProcedureArea.set(area);
        this.isProcedureModalOpen.set(true);
    }

    closeProcedureModal() {
        this.isProcedureModalOpen.set(false);
        this.selectedProcedureArea.set(null);
    }

    resolveAreaIssues(areaId: string) {
        this.setAllStepsInArea(areaId, 'ok');
        this.closeProcedureModal();
        this.toast.success('Problemi Risolti', 'L\'area è stata ripristinata e segnata come conforme.');
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

    confirmReset() {
        this.resetForm();
        this.isResetModalOpen.set(false);
        this.toast.info('Scheda Resettata', 'I dati post-operativi sono stati azzerati.');
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
        this.selectedAreaForIssue.set(null);
    }

    confirmAnomaly(note: string) {
        const anomaly = this.currentAnomalyStep();
        const areaId = this.selectedAreaForIssue();
        
        if (areaId) {
            // Whole area issue
            this.areas.update(areas => areas.map(a => {
                if (a.id === areaId) {
                    return {
                        ...a,
                        steps: a.steps.map(s => ({ ...s, status: 'issue', note: note || 'Anomalia area' }))
                    };
                }
                return a;
            }));
        } else if (anomaly) {
            // Single step issue
            this.areas.update(areas => areas.map(a => {
                if (a.id === anomaly.areaId) {
                    return {
                        ...a,
                        steps: a.steps.map(s => s.id === anomaly.id ? { ...s, status: 'issue', note } : s)
                    };
                }
                return a;
            }));
        } else return;

        this.state.saveRecord('post-op-checklist', {
            areas: this.areas(),
            totalSteps: this.totalStepsCount(),
            completedSteps: this.completedStepsCount(),
            status: this.isSubmitted() ? (this.hasIssues() ? 'Non Conforme' : 'Conforme') : undefined
        });

        // Persistent record
        const area = this.areas().find(a => a.id === (areaId || anomaly?.areaId));
        const areaName = area ? area.label : 'Generale';
        const itemName = areaId ? areaName : (anomaly?.label || areaName);
        const operatorName = this.state.currentUser()?.name || 'Operatore';
        const currentDate = new Date().toLocaleDateString();

        // Persistent non-conformity record
        this.state.saveNonConformity({
            id: Math.random().toString(36).substring(2, 9),
            moduleId: 'post-op-checklist',
            date: this.state.filterDate(),
            description: `[POST-OP] ${areaName}${anomaly ? ' -> ' + anomaly.label : ''}: ${note || 'Anomalia rilevata'}`,
            itemName: itemName
        });

        // Notifica chat all'amministrazione con dettagli strutturati
        this.state.sendMessage(
            `🚨 ANOMALIA POST-OPERATIVA: ${itemName}`,
            `⚠ SEGNALAZIONE NON CONFORMITÀ ⚠\n\nFASE: Post-operativa (Fine Servizio)\nAREA: ${areaName}\nELEMENTO: ${itemName}\nOPERATORE: ${operatorName}\nDATA: ${currentDate}\n\nNOTE OPERATORE:\n${note || 'Nessuna specifica'}`,
            'SINGLE',
            'ADMIN_OFFICE'
        );

        this.closeAnomalyModal();
    }

    startNewChecklist() {
        this.resetForm();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}
