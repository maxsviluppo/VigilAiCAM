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
                                    <div class="p-3 flex items-center justify-between gap-3 transition-colors hover:bg-slate-50 group"
                                         [class.bg-emerald-50/30]="item.status === 'ok'"
                                         [class.bg-red-50/30]="item.status === 'issue'">
                                        
                                        <div class="flex items-center gap-3 flex-1 min-w-0">
                                            <div class="w-8 h-8 rounded-md flex items-center justify-center shrink-0 border"
                                                 [class.bg-slate-50]="item.status === 'pending'" [class.border-slate-200]="item.status === 'pending'" [class.text-slate-400]="item.status === 'pending'"
                                                 [class.bg-emerald-50]="item.status === 'ok'" [class.border-emerald-200]="item.status === 'ok'" [class.text-emerald-600]="item.status === 'ok'"
                                                 [class.bg-red-50]="item.status === 'issue'" [class.border-red-200]="item.status === 'issue'" [class.text-red-600]="item.status === 'issue'">
                                                <i [class]="'fa-solid ' + item.icon + ' text-xs'"></i>
                                            </div>
                                            <div class="min-w-0">
                                                <h4 class="font-bold text-slate-700 text-base truncate">{{ item.label }}</h4>
                                                @if (item.status !== 'pending') {
                                                    <span class="text-[10px] font-black uppercase tracking-widest mt-0.5 block"
                                                          [class.text-emerald-600]="item.status === 'ok'"
                                                          [class.text-red-600]="item.status === 'issue'">
                                                        {{ item.status === 'ok' ? 'CONFORME' : 'NON CONFORME' }}
                                                    </span>
                                                }
                                            </div>
                                                                              <div class="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                                            <button (click)="item.id === 'g_cleaning_sanit' ? showCleaningInfo.set(true) : showPestInfo.set(true)" 
                                                    [disabled]="isSubmitted() || !state.isContextEditable()"
                                                    class="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white flex items-center justify-center gap-2 transition-all font-bold text-xs uppercase tracking-tight group-hover:shadow-md disabled:opacity-30">
                                                <i class="fa-solid fa-circle-info text-base"></i>
                                                <span>{{ item.status === 'ok' ? 'Info Standard' : 'Visualizza Info e Conferma' }}</span>
                                            </button>
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
                            @for (area of areas(); track area.id) {
                                <div class="flex flex-col">
                                    <!-- Area Header -->
                                    <div class="p-3 flex items-center justify-between transition-colors cursor-pointer select-none border-b border-transparent"
                                         [class.bg-slate-100]="area.expanded" [class.hover:bg-slate-50]="!area.expanded" [class.shadow-sm]="!area.expanded"
                                         (click)="toggleArea(area.id)">
                                        <div class="flex items-center gap-3 flex-1">
                                            <div class="h-8 w-8 rounded flex items-center justify-center text-lg transition-all border"
                                                 [class.bg-blue-50]="isAreaComplete(area.id)" [class.text-blue-600]="isAreaComplete(area.id)" [class.border-blue-100]="isAreaComplete(area.id)"
                                                 [class.bg-white]="!isAreaComplete(area.id)" [class.text-slate-400]="!isAreaComplete(area.id)" [class.border-slate-200]="!isAreaComplete(area.id)">
                                                <i [class]="'fa-solid ' + area.icon"></i>
                                            </div>
                                            <div>
                                                <h3 class="font-bold text-slate-700 text-lg leading-tight">{{ area.label }}</h3>
                                                <div class="flex items-center gap-2 mt-0.5">
                                                    <span class="text-[10px] font-black uppercase tracking-widest"
                                                          [class.text-emerald-600]="isAreaComplete(area.id) && !hasAreaIssues(area.id)" 
                                                          [class.text-red-600]="hasAreaIssues(area.id)"
                                                          [class.text-slate-400]="!isAreaComplete(area.id)">
                                                        {{ getAreaStatusLabel(area.id) }}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="flex items-center gap-2 shrink-0">
                                            <button (click)="setAllStepsInArea(area.id, 'ok'); $event.stopPropagation()" 
                                                    [disabled]="isSubmitted() || !state.isContextEditable()"
                                                    class="h-7 w-7 rounded border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:border-emerald-600 transition-all flex items-center justify-center tooltip disabled:opacity-30" title="Tutti Conformi">
                                                <i class="fa-solid fa-check-double text-xs"></i>
                                            </button>
                                            <i class="fa-solid fa-chevron-down text-slate-400 text-xs transition-transform duration-300 ml-1" [class.rotate-180]="area.expanded"></i>
                                        </div>
                                    </div>

                                    <!-- Area Steps (Expanded) -->
                                    @if (area.expanded) {
                                        <div class="bg-slate-50 border-t border-slate-200/60 px-3 py-1 divide-y divide-slate-200/50 shadow-inner">
                                            @for (step of area.steps; track step.id; let i = $index) {
                                                <div class="py-2.5 flex items-center justify-between gap-4 group/step">
                                                    <div class="flex items-center gap-2 flex-1">
                                                        <span class="text-[10px] font-black text-slate-400 w-4 h-4 rounded bg-white flex items-center justify-center border border-slate-200 shrink-0 leading-none">
                                                            {{ i + 1 }}
                                                        </span>
                                                        <span class="text-base font-semibold text-slate-600 leading-tight"
                                                              [class.text-emerald-600]="step.status === 'ok'"
                                                              [class.text-red-600]="step.status === 'issue'">
                                                            {{ step.label }}
                                                        </span>
                                                    </div>
                                                    <div class="flex gap-1.5 shrink-0">
                                                        @if (step.status === 'pending') {
                                                            <button (click)="setStepStatus(areaId(area), step.id, 'ok')" [disabled]="isSubmitted() || !state.isContextEditable()" class="w-6 h-6 rounded border border-emerald-200 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all shadow-sm flex items-center justify-center bg-white disabled:opacity-30"><i class="fa-solid fa-check text-[11px]"></i></button>
                                                            <button (click)="setStepStatus(areaId(area), step.id, 'issue')" [disabled]="isSubmitted() || !state.isContextEditable()" class="w-6 h-6 rounded border border-red-200 text-red-600 hover:bg-red-500 hover:text-white transition-all shadow-sm flex items-center justify-center bg-white disabled:opacity-30"><i class="fa-solid fa-triangle-exclamation text-[11px]"></i></button>
                                                        } @else {
                                                            <div class="flex items-center gap-2">
                                                                <span class="text-[10px] font-black uppercase tracking-widest px-1.5"
                                                                      [class.text-emerald-600]="step.status === 'ok'"
                                                                      [class.text-red-600]="step.status === 'issue'">
                                                                    {{ step.status === 'ok' ? 'Conforme' : 'Anomalia' }}
                                                                </span>
                                                                <button (click)="setStepStatus(areaId(area), step.id, 'pending')" [disabled]="isSubmitted() || !state.isContextEditable()" class="w-6 h-6 rounded bg-white border border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all flex items-center justify-center shadow-sm disabled:opacity-30"><i class="fa-solid fa-rotate-left text-[10px]"></i></button>
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
                        <button (click)="showCleaningInfo.set(false); setGlobalStatus('g_cleaning_sanit', 'ok')"
                                class="px-6 py-2 bg-slate-800 text-white rounded-lg font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all shadow-sm">
                            <i class="fa-solid fa-check mr-2"></i> HO PRESO VISIONE E CONFERMO
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
                        <button (click)="showPestInfo.set(false); setGlobalStatus('g_pest_control', 'ok')"
                                class="px-6 py-2 bg-slate-800 text-white rounded-lg font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all shadow-sm">
                            <i class="fa-solid fa-check mr-2"></i> HO PRESO VISIONE E CONFERMO
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

        <!-- Footer Actions -->

        <!-- Footer Actions -->
        <div class="fixed bottom-6 right-6 z-30">
            @if (!isSubmitted()) {
                <button (click)="submitChecklist()" [disabled]="!isAllCompleted() || !state.isContextEditable()"
                        class="bg-blue-600 text-white rounded-xl px-8 py-3.5 shadow-lg font-black text-xs uppercase tracking-widest flex items-center gap-3 disabled:opacity-50 disabled:grayscale transition-all hover:bg-blue-700 active:scale-95 border border-blue-500 tooltip relative overflow-hidden group">
                    <span class="relative z-10 w-full flex items-center gap-3 justify-center">Registra Operazioni <i class="fa-solid fa-check-double text-blue-300 group-hover:text-white transition-colors"></i></span>
                </button>
            } @else {
                <div class="bg-white/95 backdrop-blur-sm p-2 rounded-xl shadow-lg flex items-center gap-2 border border-slate-200 animate-slide-up">
                    <div class="bg-emerald-50 border border-emerald-100 text-emerald-600 px-4 py-2 rounded-lg font-black text-[11px] uppercase tracking-widest text-center shadow-sm"><i class="fa-solid fa-check"></i> Registrato</div>
                    <button (click)="printReport()" class="h-9 px-4 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 font-bold text-xs uppercase tracking-widest transition-colors shadow-sm">
                        <i class="fa-solid fa-print"></i> Stampa
                    </button>
                    <button *ngIf="state.isContextEditable()" (click)="isSubmitted.set(false)" class="h-9 px-4 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-amber-600 flex items-center gap-2 font-bold text-xs uppercase tracking-widest transition-colors shadow-sm" title="Modifica">
                        <i class="fa-solid fa-pen-to-square"></i> Modifica
                    </button>
                    <button (click)="startNewChecklist()" class="h-9 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 font-bold text-xs uppercase tracking-widest transition-colors shadow-sm">
                        <i class="fa-solid fa-rotate-right"></i> Nuova
                    </button>
                </div>
            }
        </div>

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

    masterEquipmentList = [
        { area: 'Area Lavaggio', items: ['Mobile pensile', 'Lavello', 'Tavolo da lavoro'] },
        { area: 'Cucina', items: ['Frigo', 'Congelatore', 'Piano cottura', 'Forno', 'Griglie', 'Banchi lavori', 'Forno a legna', 'Lavello', 'Lavabicchieri', 'Affettatrice', 'Taglia verdure', 'Campana sottovuoto', 'Banco frigo', 'Cappa aspirante'] },
        { area: 'Deposito', items: ['Frigo', 'Cella frigorifero'] },
        { area: 'Spogliatoi', items: ['Armadietto', 'Microonde'] }
    ];

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
            this.state.selectedEquipment(); // re-run when equipment changes
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

            this.isSubmitted.set(!!rawRecord.data?.status);
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

        // Auto-post to admin alerts
        this.state.sendMessage(
            `ANOMALIA: ${anomaly.label}`,
            `Segnalata anomalia durante la fase pre-operativa.\n\nControllo: ${anomaly.label}\nNote operatore: ${note || 'Nessuna specifica'}`,
            'ALL'
        );

        // Persistent record
        this.state.saveNonConformity({
            id: Math.random().toString(36).substring(2, 9),
            moduleId: 'pre-op-checklist',
            date: this.state.filterDate(),
            description: note || 'Anomalia durante pre-operativa',
            itemName: anomaly.label
        });

        this.toast.warning('Anomalia registrata', 'Segnalazione inviata per revisione amministrativa.');
        this.autoSave();
        this.closeAnomalyModal();
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
                globalItems: this.globalItems()
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

    totalStepsCount() { return (this.areas().length * this.stepDefinitions.length) + this.globalItems().length; }

    completedStepsCount() {
        const areaDone = this.areas().reduce((acc, a) => acc + a.steps.filter(s => s.status !== 'pending').length, 0);
        const globalDone = this.globalItems().filter(i => i.status !== 'pending').length;
        return areaDone + globalDone;
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
