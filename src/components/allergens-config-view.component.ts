import { Component, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../services/app-state.service';

interface CheckItem {
    id: string;
    label: string;
    checked: boolean;
}

@Component({
    selector: 'app-allergens-config-view',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="space-y-8 pb-10">
        <!-- Premium Header Banner -->
        <div class="bg-gradient-to-r from-lime-600 via-green-600 to-emerald-600 p-8 rounded-3xl shadow-xl border border-lime-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
            <div class="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <i class="fa-solid fa-wheat-awn text-9xl text-white"></i>
            </div>
            <div class="relative z-10">
                <h2 class="text-3xl font-black text-white flex items-center tracking-tight">
                    <span class="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mr-4 shadow-lg border border-white/30">
                        <i class="fa-solid fa-wheat-awn"></i>
                    </span>
                    Reg. U.E. 1169/2011
                </h2>
                <p class="text-lime-100 text-sm mt-2 font-medium ml-1">Informazioni e registro allergeni / intolleranze</p>
            </div>
            <div class="relative z-10 flex flex-col gap-2">
                <div class="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
                    <i class="fa-solid fa-book-medical text-white text-lg"></i>
                    <span class="text-white font-bold">{{ checkedCount() }} / {{ checks().length }}</span>
                </div>
                <div class="text-xs text-lime-100 font-medium flex items-center gap-2">
                    <i class="fa-regular fa-calendar"></i> {{ state.filterDate() | date:'dd/MM/yyyy' }}
                    @if (getDisplayName()) { <span class="mx-1">•</span> <i class="fa-regular fa-user"></i> {{ getDisplayName() }} }
                </div>
            </div>
        </div>
        <div class="grid grid-cols-1 gap-4">
            @for (check of checks(); track check.id) {
                <div class="bg-white p-6 rounded-2xl shadow-sm border-2 transition-all duration-300 group"
                     [class.cursor-pointer]="canEdit()" [class.cursor-not-allowed]="!canEdit()" [class.opacity-60]="!canEdit()"
                     [class.border-lime-200]="!check.checked" [class.border-lime-500]="check.checked"
                     [class.bg-lime-50]="check.checked" [class.shadow-lg]="check.checked" [class.shadow-lime-200/50]="check.checked"
                     (click)="toggleCheck(check.id)">
                    <div class="flex items-start gap-4">
                        <div class="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300"
                             [class.bg-lime-500]="check.checked" [class.text-white]="check.checked" [class.shadow-lg]="check.checked"
                             [class.shadow-lime-200]="check.checked" [class.bg-slate-100]="!check.checked" [class.text-slate-400]="!check.checked">
                            <i class="fa-solid text-2xl" [class.fa-check-circle]="check.checked" [class.fa-clipboard-list]="!check.checked"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h3 class="font-bold text-slate-800 text-base leading-tight mb-2">{{ check.label }}</h3>
                            <div class="flex items-center gap-2">
                                @if (check.checked) {
                                    <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-lime-500 text-white text-xs font-bold rounded-full">
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
    </div>
  `,
    styles: [`
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class AllergensConfigViewComponent {
    state = inject(AppStateService);
    moduleId = 'allergens-ue1169';

    checks = signal<CheckItem[]>([
        { id: 'inform-register', label: 'INFORMARE E REGISTRARE ALLERGIE / INTOLLERANZE', checked: false }
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
        if (this.state.isAdmin() && this.state.filterCollaboratorId()) return false;
        return true;
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
