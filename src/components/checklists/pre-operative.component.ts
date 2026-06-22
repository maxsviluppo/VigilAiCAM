import { Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../../services/app-state.service';
import { ToastService } from '../../services/toast.service';

interface AreaChecklist {
    id: string;
    label: string;
    icon: string;
    steps: { id: string; label: string; icon: string; status: 'pending' | 'ok' | 'issue' }[];
    expanded: boolean;
}

@Component({
    selector: 'app-pre-operative-checklist',
    standalone: true,
    imports: [CommonModule],
    template: `
    <!-- PRINT ONLY HEADER & TABLE -->
    <div class="hidden print:block font-sans text-black p-4">
        <div class="border-b-2 border-slate-800 pb-4 mb-6">
            <h1 class="text-2xl font-bold uppercase mb-1">{{ state.adminCompany().name || 'HACCP Pro' }}</h1>
            <h2 class="text-xl font-light text-slate-600">Fase Pre-operativa (Ispezione e Avvio)</h2>
            <div class="flex justify-between mt-4 text-lg text-slate-500">
                <span><span class="font-bold">Data:</span> {{ getFormattedDate() }}</span>
                <span><span class="font-bold">Operatore:</span> {{ state.currentUser()?.name || 'Operatore' }}</span>
            </div>
        </div>

        <div class="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <h3 class="text-lg font-bold uppercase mb-2 border-b border-slate-300 pb-1">Igiene del personale (Promemoria)</h3>
            <ul class="text-xs grid grid-cols-2 gap-x-8 gap-y-1 list-none">
                <li>• Abbigliamento sempre perfettamente pulito</li>
                <li>• Scarpe diverse da quelle che si usano all'esterno</li>
                <li>• Lavare frequentemente le mani con sapone germicida</li>
                <li>• Indossare idoneo copricapo (Addetti lavorazione)</li>
                <li>• Proteggere eventuali ferite in maniera appropriata</li>
                <li>• Evitare di fumare e manipolare correttamente gli alimenti</li>
            </ul>
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
                <!-- Global Checks -->
                @for (item of globalItems(); track item.id) {
                    <tr class="border-b border-slate-100 italic bg-blue-50/20">
                        <td class="py-2 font-bold">{{ item.label }}</td>
                        <td class="py-2 font-bold">{{ item.status === 'ok' ? 'CONFORME' : (item.status === 'issue' ? 'NON CONFORME' : 'NON ESEGUITO') }}</td>
                        <td class="py-2">{{ item.note || '-' }}</td>
                    </tr>
                }

                @for (area of areas(); track area.id) {
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
                        <td class="py-2 italic text-slate-400 text-xs">Verifica Area completata</td>
                    </tr>
                    @for (step of area.steps; track step.id) {
                        @if(step.status === 'issue') {
                            <tr class="border-b border-slate-100 bg-red-50/30">
                                <td class="py-1 pl-6 pr-2 text-red-800 font-medium text-xs">Anomalia: {{ step.label }}</td>
                                <td class="py-1 text-xs font-bold text-red-700">NON CONFORME</td>
                                <td class="py-1 italic text-red-600 text-[11px]">Azione correttiva richiesta</td>
                            </tr>
                        }
                    }
                }
            </tbody>
        </table>
    </div>

    <!-- UI CONTENT (Hidden on print) -->
    <div class="print:hidden pb-20 animate-fade-in relative px-2 space-y-6">
        
        <!-- Sleek Professional Dashboard Header -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
            <div class="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none"></div>
            
            <div class="flex items-center gap-5 relative z-10">
                <div class="h-14 w-14 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-md">
                    <i class="fa-solid fa-eye text-2xl"></i>
                </div>
                <div>
                    <h2 class="text-2xl font-bold text-slate-800 tracking-tight">Fase Pre-Operativa</h2>
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
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Avanzamento</p>
                        <span class="text-sm font-black text-slate-700 leading-none">{{ completedStepsCount() }}/{{ totalStepsCount() }}</span>
                    </div>
                    <div class="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div class="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                             [style.width.%]="progressPercentage()"></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <!-- Left Col: Protocol & Global Items -->
            <div class="xl:col-span-1 space-y-6">
                <!-- Protocol Box - Refined -->
                <div class="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div class="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/5 blur-2xl transition-colors group-hover:bg-blue-500/10"></div>
                    
                    <h3 class="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center justify-between uppercase tracking-tight">
                        <span>Protocollo HACCP</span>
                        <i class="fa-solid fa-shield-halved text-blue-500"></i>
                    </h3>

                    <div class="space-y-4">
                        <div class="flex gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100 transition-colors hover:border-blue-200">
                            <div class="h-10 w-10 shrink-0 bg-white border border-slate-200 rounded-md shadow-sm flex items-center justify-center text-blue-600">
                                <i class="fa-solid fa-broom text-lg"></i>
                            </div>
                            <div>
                                <h4 class="text-xs font-black text-blue-700 uppercase tracking-widest mb-0.5">Sanificazione</h4>
                                <p class="text-base text-slate-500 leading-relaxed">Pulizia meccanica/chimica e disinfezione profonda delle aree.</p>
                            </div>
                        </div>
                        <div class="flex gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100 transition-colors hover:border-indigo-200">
                            <div class="h-10 w-10 shrink-0 bg-white border border-slate-200 rounded-md shadow-sm flex items-center justify-center text-indigo-600">
                                <i class="fa-solid fa-soap text-lg"></i>
                            </div>
                            <div>
                                <h4 class="text-xs font-black text-indigo-700 uppercase tracking-widest mb-0.5">Detergenza</h4>
                                <p class="text-base text-slate-500 leading-relaxed">Uso coordinato di tensioattivi anionici e cationici.</p>
                            </div>
                        </div>
                    </div>
                </div>

                    <!-- Global Checks List Style -->
                    <div class="space-y-2">
                        <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">Controlli Generali Avvio</h3>
                        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div class="divide-y divide-slate-100">
                                @for (item of globalItems(); track item.id) {
                                    <div (click)="item.id === 'g_cleaning_sanit' ? showCleaningInfo.set(true) : showPestInfo.set(true)"
                                         class="p-4 flex items-center gap-4 transition-all hover:bg-blue-50/50 active:bg-blue-100/50 cursor-pointer group bg-white border-b border-slate-100 last:border-0">
                                        
                                        <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100 bg-slate-50 text-slate-400 shadow-sm transition-all group-hover:scale-105 group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-500">
                                            <i [class]="'fa-solid ' + item.icon + ' text-xl'"></i>
                                        </div>
                                        
                                        <div class="min-w-0 flex-1">
                                            <h4 class="font-black text-slate-800 text-sm leading-tight uppercase tracking-tight truncate group-hover:text-blue-700 transition-colors">{{ item.label }}</h4>
                                            <div class="flex items-center gap-2 mt-1">
                                                <span class="text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-1.5 py-0.5 rounded">Standard HACCP</span>
                                                <span class="text-[8px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1">
                                                    Clicca per leggere <i class="fa-solid fa-chevron-right text-[7px]"></i>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                }
                            </div>
                        </div>
                    </div>
            </div>

            <!-- Right Col: Checklists Grid -->
            <div class="xl:col-span-2 space-y-2">
                <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">Aree di Ispezione</h3>
                <div class="grid grid-cols-1 gap-2">
                    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div class="divide-y divide-slate-100">
                            @for (area of areas(); track area.id; let i = $index) {
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
                                                     [class.bg-blue-500]="isAreaComplete(area.id) && !hasAreaIssues(area.id)" [class.text-white]="isAreaComplete(area.id) && !hasAreaIssues(area.id)" [class.border-blue-600]="isAreaComplete(area.id) && !hasAreaIssues(area.id)"
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

                                    <!-- Area Steps (Expanded) -->
                                    @if (area.expanded) {
                                        <div class="bg-slate-50 border-t border-slate-200/60 px-4 py-2 divide-y divide-slate-200/50 shadow-inner">
                                            @for (step of area.steps; track step.id; let j = $index) {
                                                <div class="py-4 px-3 flex items-center justify-between gap-4 group/step cursor-pointer hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100"
                                                     (click)="step.status === 'issue' ? openProcedureModal(area) : toggleStepStatus(area.id, step.id)">
                                                    <div class="flex items-center gap-3 flex-1">
                                                        <span class="text-[11px] font-black text-slate-400 w-5 h-5 rounded-lg bg-white flex items-center justify-center border border-slate-200 shrink-0 leading-none shadow-xs group-hover/step:border-indigo-200 group-hover/step:text-indigo-400 transition-colors">
                                                            {{ j + 1 }}
                                                        </span>
                                                        <span class="text-lg font-bold text-slate-600 leading-tight"
                                                              [class.text-emerald-700]="step.status === 'ok'"
                                                              [class.text-red-700]="step.status === 'issue'">
                                                            {{ step.label }}
                                                        </span>
                                                    </div>
                                                    
                                                    <!-- Simplified status for the new design -->
                                                    <div class="flex items-center gap-2">
                                                        <span class="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-white border border-slate-100 shadow-xs"
                                                              [class.text-emerald-600]="step.status === 'ok'"
                                                              [class.text-red-600]="step.status === 'issue'"
                                                              [class.text-slate-300]="step.status === 'pending'">
                                                            {{ step.status === 'ok' ? 'Conforme' : (step.status === 'issue' ? 'Anomalia' : 'In attesa') }}
                                                        </span>
                                                        @if (step.status !== 'pending') {
                                                            <i class="fa-solid" 
                                                               [class.fa-circle-check]="step.status === 'ok'" [class.text-emerald-500]="step.status === 'ok'"
                                                               [class.fa-circle-exclamation]="step.status === 'issue'" [class.text-red-500]="step.status === 'issue'"></i>
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
        </div>
        @if (isDocModalOpen()) {
            <div class="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" (click)="closeDocModal()"></div>
                <div class="relative bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up border border-slate-200">
                    <!-- Modal Header -->
                    <div class="bg-indigo-600 px-6 py-5 text-white flex justify-between items-center relative overflow-hidden">
                        <div class="absolute inset-0 bg-gradient-to-r from-indigo-700/50 to-transparent pointer-events-none"></div>
                        <div class="flex items-center gap-4 relative z-10">
                            <div class="w-10 h-10 rounded-lg bg-indigo-500/30 flex items-center justify-center border border-indigo-400/30">
                                <i class="fa-solid fa-folder-tree text-lg text-indigo-100"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-bold">{{ selectedDocCategory() === 'g_docs' ? 'Archivio Regolarità Documentale' : 'Censimento Attrezzature Cucina' }}</h3>
                                <p class="text-xs text-indigo-200 uppercase tracking-widest">{{ selectedDocCategory() === 'g_docs' ? 'Consultazione Documenti' : 'Selezione macchinari e area operativa' }}</p>
                            </div>
                        </div>
                        <button (click)="closeDocModal()" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors relative z-10 text-white">
                            <i class="fa-solid fa-xmark text-lg"></i>
                        </button>
                    </div>

                    <!-- Modal Body -->
                    <div class="p-6 overflow-y-auto bg-slate-50 flex-1">
                        @if (selectedDocCategory() === 'g_cleaning_sanit') {
                            <!-- EQUIPMENT SELECTION SYSTEM -->
                            <div class="space-y-6">
                                <div class="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
                                    <h4 class="text-base font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <i class="fa-solid fa-plus text-indigo-500"></i> Aggiungi Attrezzatura Area Cucina
                                    </h4>
                                    
                                    <div class="grid grid-cols-1 gap-3">
                                        <select #equipSelector 
                                                (change)="addEquipment(equipSelector.value); equipSelector.value = ''"
                                                [disabled]="!state.isContextEditable()"
                                                class="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-lg font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none transition-all cursor-pointer disabled:opacity-50">
                                            <option value="" disabled selected>Fai una scelta dal selettore...</option>
                                            @for (group of masterEquipmentList; track group.area) {
                                                <optgroup [label]="group.area">
                                                    @for (item of group.items; track item) {
                                                        <option [value]="group.area + '|' + item">{{ item }}</option>
                                                    }
                                                </optgroup>
                                            }
                                        </select>
                                        <p class="text-xs text-slate-400">L'attrezzatura selezionata verrà aggiunta automaticamente alla lista sottostante.</p>
                                    </div>
                                </div>

                                <div class="space-y-3">
                                    <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Elenco Attrezzature Censite</h4>
                                    @for (eq of state.groupedEquipment(); track eq.id) {
                                        <div class="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between group animate-slide-up">
                                            <div class="flex items-center gap-3">
                                                <div class="w-8 h-8 rounded border border-slate-100 bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                    <i class="fa-solid fa-microchip text-base"></i>
                                                </div>
                                                <div>
                                                    <span class="block font-bold text-slate-700 text-lg leading-none mb-1">{{ eq.name }}</span>
                                                    <span class="text-[11px] font-black text-indigo-500 uppercase tracking-widest">{{ eq.area }}</span>
                                                </div>
                                            </div>
                                            <button (click)="state.removeEquipment(eq.id)"
                                                    [disabled]="!state.isContextEditable()"
                                                    class="w-8 h-8 rounded border border-red-100 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm disabled:opacity-30">
                                                <i class="fa-solid fa-trash-can text-xs"></i>
                                            </button>
                                        </div>
                                    } @empty {
                                        <div class="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                            <div class="w-12 h-12 rounded bg-white border border-slate-200 flex items-center justify-center mb-3 shadow-sm text-slate-300">
                                                <i class="fa-solid fa-list-check text-xl"></i>
                                            </div>
                                            <p class="text-xs font-black text-slate-400 uppercase tracking-widest">Nessuna attrezzatura selezionata</p>
                                        </div>
                                    }
                                </div>
                            </div>
                        }
                    </div>

                    <!-- Modal Footer -->
                    <div class="px-6 py-4 bg-white border-t border-slate-200 flex justify-end">
                        <button (click)="closeDocModal()" class="px-6 py-2 bg-slate-800 text-white rounded-lg font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all border border-slate-900 shadow-sm">
                            <i class="fa-solid fa-check mr-2"></i> CHIUDI ARCHIVIO
                        </button>
                    </div>
                </div>
            </div>
        }

        @if (showCleaningInfo()) {
            <div class="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" (click)="showCleaningInfo.set(false)"></div>
                <div class="relative bg-white w-full max-w-lg max-h-[90vh] rounded-2xl shadow-xl overflow-hidden animate-slide-up border border-slate-200 flex flex-col">
                    <!-- Header -->
                    <div class="px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white relative flex-shrink-0 flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded border border-white/20 bg-white/10 flex items-center justify-center">
                                <i class="fa-solid fa-flask-vial text-lg"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-bold leading-none mb-1">Sanificazione</h3>
                                <p class="text-blue-100 text-xs font-bold uppercase tracking-widest">Dettaglio Procedure</p>
                            </div>
                        </div>
                        <button (click)="showCleaningInfo.set(false)" class="w-8 h-8 rounded hover:bg-white/10 flex items-center justify-center transition-colors">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    
                    <div class="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50">
                        <p class="text-lg text-slate-600 font-medium italic border-l-2 border-blue-400 pl-3">"La sanificazione è un intervento globale che comprende sia la pulizia meccanica/chimica che la successiva disinfezione."</p>
                        
                        <!-- Sezione Pulizia -->
                        <div class="space-y-2">
                            <h4 class="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <i class="fa-solid fa-broom text-blue-500"></i> 01. Azione Scopatura
                            </h4>
                            <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                <p class="text-lg font-medium text-slate-600 leading-relaxed">
                                    Movimenti brevi, partendo dai bordi verso il centro. Usare scopa a setole morbide e panno umido per non sollevare polvere.
                                </p>
                            </div>
                        </div>

                        <!-- Sezione Detergenti -->
                        <div class="space-y-2">
                            <h4 class="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <i class="fa-solid fa-soap text-indigo-500"></i> 02. Azione Detergenti
                            </h4>
                            <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
                                <p class="text-lg text-slate-600 font-medium leading-relaxed">
                                    Sostanze per rimuovere sporco e grasso basati su tensioattivi.
                                </p>
                                <ul class="text-sm text-slate-500 space-y-2 list-none">
                                    <li class="flex items-start gap-2"><i class="fa-solid fa-circle-play text-[10px] mt-1 text-slate-400"></i> <b>Anionici:</b> elevato potere lavante, per rimuovere sporco.</li>
                                    <li class="flex items-start gap-2"><i class="fa-solid fa-circle-play text-[10px] mt-1 text-slate-400"></i> <b>Cationici:</b> per ottenere effetto disinfettante.</li>
                                    <li class="flex items-start gap-2"><i class="fa-solid fa-circle-play text-[10px] mt-1 text-slate-400"></i> <b>Non Ionici:</b> per sgrassare.</li>
                                </ul>
                            </div>
                        </div>

                        <!-- Sezione Disinfettante -->
                        <div class="space-y-2">
                            <h4 class="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <i class="fa-solid fa-virus-slash text-emerald-500"></i> 03. Azione Disinfettante
                            </h4>
                            <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
                                <p class="text-lg text-slate-600 font-medium leading-relaxed">
                                    Riduzione della carica microbica totale (batteri, muffe, virus).
                                </p>
                                <ul class="text-sm text-slate-500 space-y-1 list-disc ml-4">
                                    <li>Denaturazione delle proteine (es. Alcool)</li>
                                    <li>Azione ossidante (es. Cloro / Ipoclorito)</li>
                                    <li>Disattivazione enzimatica</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div class="px-6 py-4 bg-white border-t border-slate-200 flex-shrink-0 flex justify-end">
                        <button (click)="showCleaningInfo.set(false)"
                                class="px-6 py-2 bg-slate-800 text-white rounded-lg font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all shadow-sm">
                            <i class="fa-solid fa-xmark mr-2"></i> CHIUDI
                        </button>
                    </div>
                </div>
            </div>
        }

        @if (showPestInfo()) {
            <div class="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" (click)="showPestInfo.set(false)"></div>
                <div class="relative bg-white w-full max-w-lg max-h-[90vh] rounded-2xl shadow-xl overflow-hidden animate-slide-up border border-slate-200 flex flex-col">
                    <!-- Header -->
                    <div class="px-6 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white relative flex-shrink-0 flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded border border-white/20 bg-white/10 flex items-center justify-center">
                                <i class="fa-solid fa-bug-slash text-lg"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-bold leading-none mb-1">Piano Infestanti</h3>
                                <p class="text-amber-100 text-xs font-bold uppercase tracking-widest">Dettaglio Procedure</p>
                            </div>
                        </div>
                        <button (click)="showPestInfo.set(false)" class="w-8 h-8 rounded hover:bg-white/10 flex items-center justify-center transition-colors">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    
                    <div class="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50">
                        <p class="text-lg text-slate-600 font-medium italic border-l-2 border-amber-400 pl-3">"Il controllo degli infestanti previene la contaminazione biologica degli alimenti mediante monitoraggio costante."</p>
                        
                        <!-- Sezione Monitoraggio -->
                        <div class="space-y-2">
                            <h4 class="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <i class="fa-solid fa-magnifying-glass text-amber-500"></i> 01. Monitoraggio
                            </h4>
                            <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                <p class="text-lg font-medium text-slate-600 leading-relaxed">
                                    Ispezionare visivamente le trappole (collanti, esche). Verificare l'assenza di tracce (escrementi, rosicchiature).
                                </p>
                            </div>
                        </div>

                        <!-- Sezione Prevenzione -->
                        <div class="space-y-2">
                            <h4 class="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <i class="fa-solid fa-shield-halved text-amber-500"></i> 02. Prevenzione
                            </h4>
                            <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                <p class="text-lg text-slate-600 font-medium leading-relaxed">
                                    Mantenere sigillate le soglie. Finestre con zanzariere. Pozzetti protetti. Non lasciare residui di cibo.
                                </p>
                            </div>
                        </div>

                        <!-- Sezione Intervento -->
                        <div class="space-y-2">
                            <h4 class="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <i class="fa-solid fa-phone-flip text-red-500"></i> 03. Segnalazione
                            </h4>
                            <div class="bg-white p-4 rounded-lg border border-red-100 bg-red-50 shadow-sm">
                                <p class="text-lg font-bold text-red-600">
                                    In caso di infestazione sospetta, contattare subito la ditta specializzata e annotare nel registro.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div class="px-6 py-4 bg-white border-t border-slate-200 flex-shrink-0 flex justify-end">
                        <button (click)="showPestInfo.set(false)"
                                class="px-6 py-2 bg-slate-800 text-white rounded-lg font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all shadow-sm">
                            <i class="fa-solid fa-xmark mr-2"></i> CHIUDI
                        </button>
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

        <!-- Footer Actions -->

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
                    <h3 class="text-xl font-black text-slate-800 mb-2">Reset Pre-Op?</h3>
                    <p class="text-xs font-bold text-slate-500 leading-relaxed mb-8">
                       Questa azione cancellerà tutti i dati inseriti nella fase pre-operativa attuale. L'operazione non è reversibile.
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

    </div>
    `,
    styles: [`
    .animate-bounce-short { animation: bounceShort 2s infinite; }
    @keyframes bounceShort { 0%, 20%, 50%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-5px); } 60% { transform: translateY(-3px); } }
    .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    `]
})
export class PreOperationalChecklistComponent {
    state = inject(AppStateService);
    toast = inject(ToastService);

    isResetModalOpen = signal(false);
    isSubmitted = signal(false);
    currentRecordId = signal<string | null>(null);

    // Info modal state
    showCleaningInfo = signal(false);
    showPestInfo = signal(false);

    // Document Management state
    isDocModalOpen = signal(false);
    selectedDocType = signal<string | null>(null);
    expiryDateInput = signal<string>('');
    // disabledDocs removed as it's now global in AppStateService

    // Delete confirmation state
    isDeleteModalOpen = signal(false);
    docToDelete = signal<any>(null);

    // Anomaly Modal State
    isAnomalyModalOpen = signal(false);
    currentAnomalyStep = signal<{areaId: string, id: string, label: string} | null>(null);
    currentAnomalyType = signal<'global' | 'step'>('step');
    anomalySubject = '';

    // Procedure Modal State
    isProcedureModalOpen = signal(false);
    selectedProcedureArea = signal<AreaChecklist | null>(null);

    private readonly AREA_PROCEDURES: Record<string, string[]> = {
        'staff-hygiene': [
            'Allontanare temporaneamente l\'operatore dall\'area di produzione.',
            'Richiedere il cambio immediato del vestiario o l\'uso dei DPI (copricapo).',
            'Effettuare un nuovo lavaggio antisettico delle mani.',
            'Registrare l\'intervento formativo nel registro del personale.'
        ],
        'cucina-sala': [
            'Isolare le superfici o le attrezzature non conformi.',
            'Eseguire una detersione meccanica con sgrassante specifico.',
            'Procedere alla disinfezione con soluzione a base di cloro o alcolica.',
            'Risciacquare accuratamente se previsto dal protocollo chimico.'
        ],
        'area-lavaggio': [
            'Ripristinare immediatamente le scorte di sapone e carta asciugamani.',
            'Verificare la temperatura dell\'acqua calda (deve essere > 45°C).',
            'Pulire e disinfettare il lavello e la rubinetteria.'
        ],
        'deposito': [
            'Isolare i materiali con imballo danneggiato.',
            'Verificare l\'integrità del prodotto interno.',
            'Spostare i prodotti in area protetta o procedere allo smaltimento se contaminati.',
            'Sanificare il ripiano di stoccaggio.'
        ],
        'pavimenti': [
            'Rimuovere i residui grossolani con scopa a panno umido.',
            'Lavare con soluzione detergente ad alta concentrazione.',
            'Asciugare completamente per prevenire rischi di scivolamento e muffe.'
        ]
    };

    masterEquipmentList = [
        { area: 'Area Lavaggio', items: ['Mobile pensile', 'Lavello', 'Tavolo da lavoro'] },
        { area: 'Cucina', items: ['Frigo', 'Congelatore', 'Piano cottura', 'Forno', 'Griglie', 'Banchi lavori', 'Forno a legna', 'Lavello', 'Lavabicchieri', 'Affettatrice', 'Taglia verdure', 'Campana sottovuoto', 'Banco frigo', 'Cappa aspirante'] },
        { area: 'Deposito', items: ['Frigo', 'Cella frigorifero'] },
        { area: 'Spogliatoi', items: ['Armadietto', 'Microonde'] }
    ];

    docDefinitions = [
        { id: 'scia', label: 'Scia e planimetria', icon: 'fa-map-location-dot' },
        { id: 'camerale', label: 'Camerale', icon: 'fa-building-columns' },
        { id: 'haccp_plan', label: 'Manuale applicazione sistema HACCP', icon: 'fa-file-shield' },
        { id: 'osa', label: 'Attestato OSA', icon: 'fa-user-graduate' },
        { id: 'registro_personale', label: 'Elenco del personale con mansioni', icon: 'fa-users-rectangle' },
        { id: 'messa_terra', label: 'DM 37/08 messa a terra DPR 462/01', icon: 'fa-bolt' },
        { id: 'dvr', label: 'DVR (Documento Valutazione Rischi)', icon: 'fa-triangle-exclamation' }
    ];

    globalItems = signal<{ id: string; label: string; icon: string; status: 'pending' | 'ok' | 'issue'; note?: string }[]>([
        { id: 'g_cleaning_sanit', label: 'Prodotti pulizia e sanificazione', icon: 'fa-spray-can-sparkles', status: 'pending' },
        { id: 'g_pest_control', label: 'Controllo Infestanti (Monitoraggio)', icon: 'fa-bug-slash', status: 'pending' }
    ]);

    stepDefinitions = [
        { id: 'ispezione', label: 'Ispezione visiva', icon: 'fa-eye' },
        { id: 'integrita', label: 'Integrità attrezzature', icon: 'fa-screwdriver-wrench' },
        { id: 'pulizia', label: 'Assenza di sporco', icon: 'fa-broom' },
        { id: 'materiali', label: 'Disponibilità prodotti (alimenti e non)', icon: 'fa-box' }
    ];

    areas = signal<AreaChecklist[]>([
        { id: 'staff-hygiene', label: 'Igiene Personale', icon: 'fa-user-tie', steps: this.getInitialSteps('staff-hygiene'), expanded: false },
        { id: 'cucina-sala', label: 'Cucina e Sala', icon: 'fa-utensils', steps: this.getInitialSteps('cucina-sala'), expanded: false },
        { id: 'area-lavaggio', label: 'Area Lavaggio', icon: 'fa-sink', steps: this.getInitialSteps('area-lavaggio'), expanded: false },
        { id: 'deposito', label: 'Deposito', icon: 'fa-boxes-stacked', steps: this.getInitialSteps('deposito'), expanded: false },
        { id: 'spogliatoio', label: 'Spogliatoio', icon: 'fa-shirt', steps: this.getInitialSteps('spogliatoio'), expanded: false },
        { id: 'antibagno-bagno-personale', label: 'Antibagno e Bagno Personale', icon: 'fa-restroom', steps: this.getInitialSteps('antibagno-bagno-personale'), expanded: false },
        { id: 'bagno-clienti', label: 'Bagno Clienti', icon: 'fa-people-arrows', steps: this.getInitialSteps('bagno-clienti'), expanded: false },
        { id: 'pavimenti', label: 'Pavimenti', icon: 'fa-table-cells', steps: this.getInitialSteps('pavimenti'), expanded: false },
        { id: 'pareti', label: 'Pareti', icon: 'fa-border-all', steps: this.getInitialSteps('pareti'), expanded: false },
        { id: 'soffitto', label: 'Soffitto', icon: 'fa-cloud', steps: this.getInitialSteps('soffitto'), expanded: false },
        { id: 'infissi', label: 'Infissi', icon: 'fa-door-closed', steps: this.getInitialSteps('infissi'), expanded: false }
    ]);

    getInitialSteps(areaId: string) {
        if (areaId === 'staff-hygiene') return this.getStaffHygieneSteps();
        if (areaId.startsWith('eq-')) {
            return [
                { id: 'ispezione', label: 'Ispezione visiva', icon: 'fa-eye', status: 'pending' as const },
                { id: 'integrita', label: 'Integrità e funzionamento', icon: 'fa-screwdriver-wrench', status: 'pending' as const }
            ];
        }
        return this.stepDefinitions
            .filter(def => {
                // Area Lavaggio and Pavimenti: elimina Integrità attrezzature
                if ((areaId === 'area-lavaggio' || areaId === 'pavimenti') && def.id === 'integrita') return false;
                // Deposito, Spogliatoio e Pavimenti: elimina Disponibilità prodotti
                if ((areaId === 'deposito' || areaId === 'spogliatoio' || areaId === 'pavimenti') && def.id === 'materiali') return false;
                // Pareti: elimina integrità, pulizia e materiali
                if (areaId === 'pareti' && (def.id === 'integrita' || def.id === 'pulizia' || def.id === 'materiali')) return false;
                // Soffitto and Infissi: elimina integrità e materiali
                if ((areaId === 'soffitto' || areaId === 'infissi') && (def.id === 'integrita' || def.id === 'materiali')) return false;
                // Reti Anti-intrusione: elimina tutto tranne ispezione
                if (areaId === 'reti-antiintrusione' && def.id !== 'ispezione') return false;
                return true;
            })
            .map(def => {
                let label = def.label;
                // Area Lavaggio: sostituisci Disponibilità prodotti
                if (areaId === 'area-lavaggio' && def.id === 'materiali') {
                    label = 'Disponibilità prodotti di pulizia e sanificazione';
                }
                // Deposito e Spogliatoio: integrità attrezzature con integrità materiali
                if ((areaId === 'deposito' || areaId === 'spogliatoio') && def.id === 'integrita') {
                    label = 'Integrità materiali';
                }
                // Antibagno/Bagno Personale e Bagno Clienti: ispezione e disponibilità prodotti
                if (areaId === 'antibagno-bagno-personale' || areaId === 'bagno-clienti') {
                    if (def.id === 'ispezione') label = 'Ispezione lavabo, tazza, rubinetteria';
                    if (def.id === 'materiali') label = 'Disponibilità prodotti di pulizia e sanificazione e presenza di acqua calda';
                }
                // Pavimenti: ispezione e pulizia
                if (areaId === 'pavimenti') {
                    if (def.id === 'ispezione') label = 'ispezione integrità della pavimentazione';
                    if (def.id === 'pulizia') label = 'assenza di sporco';
                }
                // Pareti: ispezione
                if (areaId === 'pareti' && def.id === 'ispezione') {
                    label = 'Ispezione integrità delle pareti';
                }
                // Soffitto: ispezione e pulizia
                if (areaId === 'soffitto') {
                    if (def.id === 'ispezione') label = 'ispezione integrità soffitto';
                    if (def.id === 'pulizia') label = 'assenza di ragnatele';
                }
                // Infissi: ispezione
                if (areaId === 'infissi' && def.id === 'ispezione') {
                    label = 'ispezione pulizia';
                }
                // Reti Anti-intrusione: ispezione
                if (areaId === 'reti-antiintrusione' && def.id === 'ispezione') {
                    label = 'verifica assenza di polvere e sporco';
                }
                return { ...def, label, status: 'pending' as const };
            });
    }

    getStaffHygieneSteps() {
        return [
            { id: 'work-clothes', label: 'PULIZIA ABITI DA LAVORO', icon: 'fa-shirt', status: 'pending' as const },
            { id: 'personal-hygiene', label: 'IGIENE DELLA PERSONA (CAPELLI RACCOLTI, UNGHIE PULITE, ASSENZA FERITE, TOSSE O ALTRO)', icon: 'fa-hand-sparkles', status: 'pending' as const }
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
        const historyRecord: any = this.state.getRecord('pre-op-checklist');

        // Equipment areas from census (same as operative/post-operative)
        const census = this.state.groupedEquipment();
        const equipmentAreas: AreaChecklist[] = census.map(eq => ({
            id: `eq-${eq.id}`,
            label: eq.name,
            icon: eq.type === 'freddo' ? 'fa-snowflake' : eq.type === 'caldo' ? 'fa-fire' : 'fa-microchip',
            steps: [
                { id: 'ispezione', label: 'Ispezione visiva', icon: 'fa-eye', status: 'pending' as const },
                { id: 'integrita', label: 'Integrità e funzionamento', icon: 'fa-screwdriver-wrench', status: 'pending' as const }
            ],
            expanded: false
        }));

        if (historyRecord && historyRecord.areas) {
            // Re-apply updated labels to the saved data
            const relabeledAreas = historyRecord.areas.map((area: any) => {
                const updatedSteps = area.steps.map((step: any) => {
                    const currentDefinition = this.getInitialSteps(area.id).find(d => d.id === step.id);
                    return { ...step, label: currentDefinition?.label || step.label };
                });

                const currentStepIds = new Set(this.getInitialSteps(area.id).map(d => d.id));
                const filteredSteps = updatedSteps.filter((s: any) => currentStepIds.has(s.id));

                const existingIds = new Set(filteredSteps.map((s: any) => s.id));
                const missingSteps = this.getInitialSteps(area.id).filter(d => !existingIds.has(d.id));

                const existingArea = this.areas().find(ea => ea.id === area.id);
                const isExpanded = existingArea ? existingArea.expanded : (area.expanded ?? false);
                return { ...area, steps: [...filteredSteps, ...missingSteps], expanded: isExpanded };
            });

            const currentStaticAreas = [
                { id: 'staff-hygiene', label: 'Igiene Personale', icon: 'fa-user-tie', steps: this.getStaffHygieneSteps(), expanded: false },
                { id: 'cucina-sala', label: 'Cucina e Sala', icon: 'fa-utensils', steps: this.getInitialSteps('cucina-sala'), expanded: false },
                { id: 'area-lavaggio', label: 'Area Lavaggio', icon: 'fa-sink', steps: this.getInitialSteps('area-lavaggio'), expanded: false },
                { id: 'deposito', label: 'Deposito', icon: 'fa-boxes-stacked', steps: this.getInitialSteps('deposito'), expanded: false },
                { id: 'spogliatoio', label: 'Spogliatoio', icon: 'fa-shirt', steps: this.getInitialSteps('spogliatoio'), expanded: false },
                { id: 'antibagno-bagno-personale', label: 'Antibagno e Bagno Personale', icon: 'fa-restroom', steps: this.getInitialSteps('antibagno-bagno-personale'), expanded: false },
                { id: 'bagno-clienti', label: 'Bagno Clienti', icon: 'fa-people-arrows', steps: this.getInitialSteps('bagno-clienti'), expanded: false },
                { id: 'pavimenti', label: 'Pavimenti', icon: 'fa-table-cells', steps: this.getInitialSteps('pavimenti'), expanded: false },
                { id: 'pareti', label: 'Pareti', icon: 'fa-border-all', steps: this.getInitialSteps('pareti'), expanded: false },
                { id: 'soffitto', label: 'Soffitto', icon: 'fa-cloud', steps: this.getInitialSteps('soffitto'), expanded: false },
                { id: 'infissi', label: 'Infissi', icon: 'fa-door-closed', steps: this.getInitialSteps('infissi'), expanded: false }
            ].filter(a => this.state.isActivityEnabled('pre-op-checklist', a.id));

            const savedIds = new Set(relabeledAreas.map((a: any) => a.id));
            const missingStaticAreas = currentStaticAreas.filter(a => !savedIds.has(a.id));
            const newEquipAreas = equipmentAreas.filter(ea => !savedIds.has(ea.id));
            
            // Filter relabeled areas as well (in case they were saved but now disabled)
            const filteredRelabeled = relabeledAreas.filter((a: any) => {
                if (a.id.startsWith('eq-')) return true;
                return this.state.isActivityEnabled('pre-op-checklist', a.id);
            });

            // Compose final areas list, with missing static areas at the top
            this.areas.set([...filteredRelabeled, ...missingStaticAreas, ...newEquipAreas].sort((a, b) => {
                const aIndex = currentStaticAreas.findIndex(cs => cs.id === a.id);
                const bIndex = currentStaticAreas.findIndex(cs => cs.id === b.id);
                if (aIndex === -1 && bIndex === -1) return 0;
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            }));
            
            if (historyRecord.globalItems) {
                const filteredGlobal = historyRecord.globalItems.filter((i: any) => 
                    this.state.isActivityEnabled('pre-op-checklist', i.id)
                );
                this.globalItems.set(filteredGlobal);
            }

            // Find and set the actual record ID
            const rawRecord = this.state.checklistRecords().find(r => 
                r.moduleId === 'pre-op-checklist' && 
                r.date === this.state.filterDate() &&
                r.userId === (this.state.isAdmin() && this.state.filterCollaboratorId() ? this.state.filterCollaboratorId() : this.state.currentUser()?.id)
            );
            
            if (rawRecord) {
              this.currentRecordId.set(rawRecord.id);
            }

            this.isSubmitted.set(!!rawRecord?.data?.status);
        } else {
            this.isSubmitted.set(false);
            this.currentRecordId.set(null);
            this.areas.update(areas => {
                const staticAreas = areas.filter(a => !a.id.startsWith('eq-'));
                const filteredStatic = staticAreas.filter(a => this.state.isActivityEnabled('pre-op-checklist', a.id));
                const areasWithSteps = filteredStatic.map(a => ({ ...a, steps: this.getInitialSteps(a.id) }));
                return [...areasWithSteps, ...equipmentAreas];
            });
            this.globalItems.update(items => items
                .filter(i => this.state.isActivityEnabled('pre-op-checklist', i.id))
                .map(i => ({ ...i, status: 'pending' as const }))
            );
        }
    }

    areaId(area: AreaChecklist) { return area.id; }

    toggleArea(id: string) {
        this.areas.update(areas => areas.map(a => a.id === id ? { ...a, expanded: !a.expanded } : a));
    }

    setStepStatus(areaId: string, stepId: string, status: 'pending' | 'ok' | 'issue') {
        const area = this.areas().find(a => a.id === areaId);
        const step = area?.steps.find(s => s.id === stepId);
        
        if (status === 'issue' && step) {
            this.currentAnomalyStep.set({ areaId, id: stepId, label: step.label });
            this.currentAnomalyType.set('step');
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
        this.autoSave();
    }

    setGlobalStatus(id: string, status: 'pending' | 'ok' | 'issue') {
        const item = this.globalItems().find(i => i.id === id);
        
        if (status === 'issue' && item) {
            this.currentAnomalyStep.set({ areaId: 'global', id, label: item.label });
            this.currentAnomalyType.set('global');
            this.anomalySubject = `Anomalia riscontrata in: ${item.label}`;
            this.isAnomalyModalOpen.set(true);
            return;
        }

        this.globalItems.update(items => items.map(item => {
            if (item.id === id) {
                return { ...item, status };
            }
            return item;
        }));
        this.autoSave();
    }

    setAreaIssue(areaId: string) {
        const area = this.areas().find(a => a.id === areaId);
        if (area) {
            this.currentAnomalyStep.set({ areaId, id: 'area_full', label: area.label });
            this.currentAnomalyType.set('step');
            this.anomalySubject = `Anomalia riscontrata in: ${area.label}`;
            this.isAnomalyModalOpen.set(true);
        }
    }

    closeAnomalyModal() {
        this.isAnomalyModalOpen.set(false);
        this.currentAnomalyStep.set(null);
    }

    confirmAnomaly(note: string) {
        const anomaly = this.currentAnomalyStep();
        if (!anomaly) return;

        const type = this.currentAnomalyType();

        if (type === 'step') {
            this.areas.update(areas => areas.map(a => {
                if (a.id === anomaly.areaId) {
                    if (anomaly.id === 'area_full') {
                        // Mark all steps in area as issue
                        return { ...a, steps: a.steps.map(s => ({ ...s, status: 'issue', note })), expanded: true };
                    }
                    return { ...a, steps: a.steps.map(s => s.id === anomaly.id ? { ...s, status: 'issue', note } : s) };
                }
                return a;
            }));
        } else {
            this.globalItems.update(items => items.map(i => {
                if (i.id === anomaly.id) return { ...i, status: 'issue', note };
                return i;
            }));
        }

        const parentArea = this.areas().find(a => a.id === anomaly.areaId || a.steps.some(s => s.id === anomaly.id));
        const areaName = parentArea ? parentArea.label : 'Generale';
        const operatorName = this.state.currentUser()?.name || 'Operatore';
        const currentDate = new Date().toLocaleDateString();

        // Auto-post to admin alerts with detailed info
        this.state.sendMessage(
            `🚨 ANOMALIA PRE-OPERATIVA: ${anomaly.label}`,
            `⚠ SEGNALAZIONE NON CONFORMITÀ ⚠\n\nFASE: Pre-operativa (Avvio)\nAREA: ${areaName}\nELEMENTO: ${anomaly.label}\nOPERATORE: ${operatorName}\nDATA: ${currentDate}\n\nNOTE OPERATORE:\n${note || 'Nessuna specifica'}`,
            'SINGLE',
            'ADMIN_OFFICE'
        );

        // Persistent record with structured description
        this.state.saveNonConformity({
            id: Math.random().toString(36).substring(2, 9),
            moduleId: 'pre-op-checklist',
            date: this.state.filterDate(),
            description: `[PRE-OP] ${areaName} -> ${anomaly.label}: ${note || 'Anomalia rilevata'}`,
            itemName: anomaly.label
        });

        this.toast.warning('Anomalia registrata', 'Segnalazione inviata per revisione amministrativa.');
        this.autoSave();
        this.closeAnomalyModal();
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

    setAllStepsInArea(areaId: string, status: 'ok' | 'issue') {
        this.areas.update(areas => areas.map(a => {
            if (a.id === areaId) {
                return { ...a, steps: a.steps.map(s => ({ ...s, status })), expanded: true };
            }
            return a;
        }));
        this.autoSave();
    }

    private autoSaveTimeout: any;
    private autoSave() {
        if (this.autoSaveTimeout) clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => {
            let recordId = this.currentRecordId();
            if (!recordId) {
                const existingRecord = this.state.checklistRecords().find(r => 
                    r.moduleId === 'pre-op-checklist' && 
                    r.date === this.state.filterDate() &&
                    r.userId === (this.state.isAdmin() && this.state.filterCollaboratorId() ? this.state.filterCollaboratorId() : this.state.currentUser()?.id)
                );
                if (existingRecord) recordId = existingRecord.id;
            }

            this.state.saveRecord('pre-op-checklist', {
                areas: this.areas(),
                globalItems: this.globalItems(),
                status: this.isSubmitted() ? ((this.areas().some(a => a.steps.some(s => s.status === 'issue')) || this.globalItems().some(i => i.status === 'issue')) ? 'Non Conforme' : 'Conforme') : undefined
            });
        }, 2000);
    }

    isAreaComplete(id: string) {
        const area = this.areas().find(a => a.id === id);
        return area?.steps.every(s => s.status !== 'pending') || false;
    }

    hasAreaIssues(id: string) {
        const area = this.areas().find(a => a.id === id);
        return area?.steps.some(s => s.status === 'issue') || false;
    }

    getCompletedStepsInArea(id: string) {
        const area = this.areas().find(a => a.id === id);
        return area?.steps.filter(s => s.status === 'ok').length || 0;
    }

    getAreaStatusLabel(id: string) {
        if (!this.isAreaComplete(id)) return 'In corso';
        return this.hasAreaIssues(id) ? 'Rilevate Anomalie' : 'Conforme';
    }

    getIssueSteps(areaId: string) {
        const area = this.areas().find(a => a.id === areaId);
        return area?.steps.filter(s => s.status === 'issue') || [];
    }

    getAreaProcedures(areaId: string): string[] {
        // Handle equipment areas
        if (areaId.startsWith('eq-')) {
            return [
                'Scollegare l\'apparecchiatura se presenta difetti elettrici.',
                'Pulire le guarnizioni e le superfici interne con sanificante.',
                'Chiamare l\'assistenza tecnica se il malfunzionamento persiste.',
                'Spostare eventuali alimenti in un altro frigo/cella conforme.'
            ];
        }
        return this.AREA_PROCEDURES[areaId] || [
            'Identificare la causa specifica della non conformità.',
            'Eseguire un intervento di pulizia o manutenzione mirato.',
            'Verificare il ripristino delle condizioni igienico-sanitarie.',
            'Documentare l\'azione correttiva nel registro specifico.'
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
        return this.areas().reduce((acc, a) => acc + a.steps.length, 0);
    }

    completedStepsCount() {
        return this.areas().reduce((acc, a) => acc + a.steps.filter(s => s.status !== 'pending').length, 0);
    }

    progressPercentage() {
        const total = this.totalStepsCount();
        return total > 0 ? (this.completedStepsCount() / total) * 100 : 0;
    }

    isAllCompleted() { return this.completedStepsCount() === this.totalStepsCount(); }

    submitChecklist() {
        const recordId = this.currentRecordId() || Math.random().toString(36).substring(2, 11);
        this.currentRecordId.set(recordId);

        this.state.saveChecklist({
            id: recordId,
            moduleId: 'pre-op-checklist',
            date: this.state.filterDate(),
            data: {
                areas: this.areas(),
                globalItems: this.globalItems(),
                status: (this.areas().some(a => a.steps.some(s => s.status === 'issue')) || this.globalItems().some(i => i.status === 'issue')) ? 'Non Conforme' : 'Conforme'
            }
        });
        this.isSubmitted.set(true);
        this.toast.success('Registrato', 'Fase Pre-Operativa salvata.');
    }

    resetForm() {
        this.areas.update(areas => areas.map(a => ({
            ...a,
            // For equipment areas (dynamic, from census), reset only step statuses
            steps: a.id.startsWith('eq-')
                ? a.steps.map(s => ({ ...s, status: 'pending' as const }))
                : this.getInitialSteps(a.id),
            expanded: false
        })));
        this.globalItems.update(items => items.map(i => ({ ...i, status: 'pending' as const })));
    }

    confirmReset() {
        this.resetForm();
        this.isResetModalOpen.set(false);
        this.toast.info('Scheda Resettata', 'I dati pre-operativi sono stati azzerati.');
    }

    startNewChecklist() {
        this.isSubmitted.set(false);
        this.resetForm();
    }

    printReport() { window.print(); }
    getFormattedDate() { return new Date(this.state.filterDate()).toLocaleDateString('it-IT'); }

    // --- Document Management Methods ---
    selectedDocCategory = signal<string | null>(null);

    openDocModal(categoryId: string) {
        this.selectedDocCategory.set(categoryId);
        this.isDocModalOpen.set(true);
    }

    closeDocModal() {
        this.isDocModalOpen.set(false);
        this.selectedDocCategory.set(null);
    }

    getDocsByType(type: string) {
        const clientId = this.state.currentUser()?.clientId || 'demo';
        return this.state.documents().filter(d => d.clientId === clientId && d.type === type);
    }

    getItemBadgeCount(categoryId: string) {
        if (categoryId === 'g_docs') {
            const clientId = this.state.currentUser()?.clientId || 'demo';
            return this.state.documents().filter(d => d.clientId === clientId && d.category === 'regolarita-documentazione').length;
        }
        if (categoryId === 'g_cleaning_sanit') {
            return this.state.groupedEquipment().length;
        }
        return 0;
    }

    addEquipment(val: string) {
        if (!val) return;
        const [area, name] = val.split('|');
        this.state.addEquipment(area, name);
        this.toast.success('Attrezzatura aggiunta', name);
    }

    handleFileSelect(event: any, type: string) {
        const files: FileList = event.target.files;
        if (!files || files.length === 0) return;

        const clientId = this.state.currentUser()?.clientId || 'demo';
        const category = this.selectedDocCategory() === 'g_docs' ? 'regolarita-documentazione' : 'prodotti-pulizia';

        Array.from(files).forEach(file => {
            this.state.saveDocument({
                clientId,
                category,
                type,
                fileName: file.name,
                fileType: file.type,
                fileData: 'BASE64_PLACE_HOLDER'
            });
        });
    }

    getExpiryDate(type: string) {
        const docs = this.getDocsByType(type);
        return docs.length > 0 ? docs[0].expiryDate : '';
    }

    updateExpiryDate(type: string, event: any) {
        const expiryDate = event.target.value;
        const docs = this.getDocsByType(type);
        if (docs.length > 0) {
            // Update existing doc metadata
            this.state.documents.update(allDocs => allDocs.map(d => {
                if (d.id === docs[0].id) return { ...d, expiryDate };
                return d;
            }));
            this.toast.success('Scadenza salvata', 'Data di scadenza aggiornata correttamente.');
        } else {
            this.toast.info('Attenzione', 'Carica prima il documento per poter impostare la data di scadenza.');
        }
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

    downloadDoc(doc: any) {
        this.toast.info('Download in corso', `Il file ${doc.fileName} sta per essere scaricato.`);

        // Real download simulation using Blob
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

        this.toast.success('Completato', 'Download terminato con successo.');
    }

    shareDoc(doc: any) {
        this.toast.info('Condivisione Documento', `Scegli come condividere ${doc.fileName}`);

        // Mocking a share menu with a toast sequence for now
        setTimeout(() => {
            this.toast.success('Inviato', 'Il documento è stato correttamente condiviso via Email e WhatsApp.');
        }, 800);
    }

    askDeleteDoc(doc: any) {
        // Open app-style custom confirmation modal
        this.docToDelete.set(doc);
        this.isDeleteModalOpen.set(true);
    }

    confirmDelete() {
        const doc = this.docToDelete();
        if (doc) {
            this.state.deleteDocument(doc.id);
            this.isDeleteModalOpen.set(false);
            this.docToDelete.set(null);
            // Success toast is already called by state.deleteDocument
        }
    }

    deleteDoc(id: string) {
        this.state.deleteDocument(id);
    }
}
