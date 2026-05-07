import { Component, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../services/app-state.service';

interface CheckItem {
    id: string;
    label: string;
    checked: boolean;
}

@Component({
    selector: 'app-pest-control-view',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="space-y-8 pb-10">
        <!-- Premium Header Banner -->
        <div class="bg-gradient-to-r from-red-700 via-orange-600 to-amber-600 p-8 rounded-3xl shadow-xl border border-red-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
            <div class="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <i class="fa-solid fa-bug text-9xl text-white"></i>
            </div>
            <div class="relative z-10">
                <h2 class="text-3xl font-black text-white flex items-center tracking-tight">
                    <span class="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mr-4 shadow-lg border border-white/30">
                        <i class="fa-solid fa-bug"></i>
                    </span>
                    Controllo Infestanti
                </h2>
                <div class="flex items-center gap-4 mt-2">
                    <p class="text-orange-100 text-sm font-medium ml-1">Monitoraggio roditori, insetti e volatili</p>
                    <button (click)="showStandardInfo.set(true)" 
                            class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white text-white hover:text-orange-700 transition-all text-[10px] font-black border border-white/30 shadow-md group">
                        <i class="fa-solid fa-circle-info text-sm group-hover:scale-110 transition-transform"></i>
                        <span>INFO PROTOCOLLO</span>
                    </button>
                </div>
            </div>
            <div class="relative z-10 flex flex-col gap-2">
                <div class="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
                    <i class="fa-solid fa-shield-virus text-white text-lg"></i>
                    <span class="text-white font-bold">{{ checkedCount() }} / {{ checks().length }}</span>
                </div>
                <div class="text-xs text-orange-100 font-medium flex items-center gap-2">
                    <i class="fa-regular fa-calendar"></i> {{ state.filterDate() | date:'dd/MM/yyyy' }}
                    @if (getDisplayName()) { <span class="mx-1">•</span> <i class="fa-regular fa-user"></i> {{ getDisplayName() }} }
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            @for (check of checks(); track check.id) {
                <div class="bg-white p-6 rounded-2xl shadow-sm border-2 transition-all duration-300 group"
                     [class.cursor-pointer]="canEdit()" [class.cursor-not-allowed]="!canEdit()" [class.opacity-60]="!canEdit()"
                     [class.border-orange-100]="!check.checked" [class.border-orange-500]="check.checked"
                     [class.bg-orange-50]="check.checked" [class.shadow-lg]="check.checked" [class.shadow-orange-200/50]="check.checked"
                     (click)="toggleCheck(check.id)">
                    <div class="flex items-start gap-4">
                        <div class="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300"
                             [class.bg-orange-500]="check.checked" [class.text-white]="check.checked" [class.shadow-lg]="check.checked"
                             [class.shadow-orange-200]="check.checked" [class.bg-slate-100]="!check.checked" [class.text-slate-400]="!check.checked">
                            <i class="fa-solid text-2xl" [class.fa-check-circle]="check.checked" [class.fa-bug-slash]="!check.checked"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h3 class="font-bold text-slate-800 text-base leading-tight mb-2">{{ check.label }}</h3>
                            <div class="flex items-center gap-2">
                                @if (check.checked) {
                                    <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full">
                                        <i class="fa-solid fa-circle-check"></i> VERIFICATO
                                    </span>
                                } @else {
                                    <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-200 text-slate-600 text-xs font-bold rounded-full">
                                        <i class="fa-regular fa-circle"></i> DA VERIFICARE
                                    </span>
                                }
                            </div>
                        </div>
                    </div>
                </div>
            }
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
                    <div class="p-8 bg-gradient-to-br from-orange-700 to-red-900 text-white relative flex-shrink-0">
                        <div class="absolute top-0 right-0 p-6 opacity-10 pointer-events-none -rotate-12 translate-x-2">
                            <i class="fa-solid fa-bug text-8xl"></i>
                        </div>
                        <div class="relative z-10">
                            <h3 class="text-2xl font-black mb-1">Pest Control</h3>
                            <p class="text-orange-200 text-[10px] font-black uppercase tracking-[0.2em]">Standard HACCP Pro</p>
                        </div>
                    </div>
                    
                    <div class="p-8 pt-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                        <div class="space-y-3">
                            <h4 class="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-2">
                                <i class="fa-solid fa-magnifying-glass text-xs"></i> 01. Monitoraggio
                            </h4>
                            <div class="bg-orange-50/50 p-5 rounded-2xl border border-orange-100 text-xs text-slate-700 font-medium leading-relaxed">
                                Ispezione periodica per rilevare tracce di infestanti (escrementi, rosicchiature, camminamenti).
                            </div>
                        </div>

                        <div class="space-y-3">
                            <h4 class="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-2">
                                <i class="fa-solid fa-barrier text-xs"></i> 02. Prevenzione
                            </h4>
                            <div class="bg-orange-50/50 p-5 rounded-2xl border border-orange-100 text-xs text-slate-700 font-medium leading-relaxed">
                                Integrità di reti antinsetto, sigillatura fori, gestione rifiuti e pulizia accurata dei depositi.
                            </div>
                        </div>

                        <div class="space-y-3">
                            <h4 class="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-2">
                                <i class="fa-solid fa-skull-crossbones text-xs"></i> 03. Intervento
                            </h4>
                            <div class="bg-orange-50/50 p-5 rounded-2xl border border-orange-100 text-[10px] font-bold text-slate-500 italic">
                                In caso di infestazione accertata, isolare l'area e contattare immediatamente la ditta specializzata. Registrare l'evento nel registro non conformità.
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
export class PestControlViewComponent {
    state = inject(AppStateService);
    moduleId = 'pest-control';
    showStandardInfo = signal(false);

    checks = signal<CheckItem[]>([
        { id: 'rodents', label: 'MONITORAGGIO RODITORI (ESCHE E TRAPPOLE)', checked: false },
        { id: 'crawling', label: 'INSETTI STRISCIANTI (BLATTE, FORMICHE)', checked: false },
        { id: 'flying', label: 'INSETTI VOLANTI E LAMPADE UV', checked: false },
        { id: 'nets', label: 'INTEGRITÀ RETI ANTI-INSETTO E SIGILLATURA', checked: false },
        { id: 'external', label: 'VERIFICA PERIMETRO ESTERNO E RIFIUTI', checked: false }
    ]);

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
}

