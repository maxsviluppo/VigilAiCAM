import { Component, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../services/app-state.service';

interface CheckItem {
    id: string;
    label: string;
    checked: boolean;
}

@Component({
  selector: 'app-staff-training-checklist',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6 animate-fade-in p-4 pb-12 overflow-hidden">
      <!-- App-style Header -->
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div class="flex items-center gap-4">
          <div class="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shadow-sm border border-emerald-100/50">
            <i class="fa-solid fa-graduation-cap"></i>
          </div>
          <div>
            <h2 class="text-xl font-bold text-slate-800 tracking-tight">Formazione Personale</h2>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Qualifica & Aggiornamento</p>
          </div>
        </div>
        
        <div class="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 shrink-0 shadow-inner">
           <div class="text-right">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Completate</p>
              <p class="text-xs font-bold text-slate-700 leading-none">{{ checkedCount() }} / {{ checks().length }}</p>
           </div>
           <div class="h-8 w-8 flex items-center justify-center bg-white rounded-lg border border-slate-200 text-emerald-500 shadow-sm">
              <i class="fa-solid fa-check-double text-sm"></i>
           </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div class="mb-6">
           <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <i class="fa-solid fa-list-check"></i> Requisiti Formativi
           </h3>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (check of checks(); track check.id) {
            <button (click)="toggleCheck(check.id)" [disabled]="!canEdit()"
                    class="group relative flex flex-col p-5 rounded-2xl border-2 transition-all text-left h-full overflow-hidden"
                    [class.bg-emerald-50]="check.checked" [class.border-emerald-500]="check.checked" [class.shadow-md]="check.checked"
                    [class.bg-white]="!check.checked" [class.border-slate-100]="!check.checked" [class.hover:border-slate-200]="!check.checked"
                    [class.opacity-60]="!canEdit()">
              
              <div class="flex items-center gap-3 mb-4">
                 <div class="w-8 h-8 rounded bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 shadow-inner group-hover:bg-emerald-50 group-hover:text-emerald-500 group-hover:border-emerald-100 transition-colors"
                      [class.bg-emerald-100]="check.checked" [class.text-emerald-600]="check.checked" [class.border-emerald-200]="check.checked">
                    <i class="fa-solid fa-graduation-cap text-xs"></i>
                 </div>
                 <span class="text-[9px] font-black uppercase tracking-widest" [class.text-emerald-600]="check.checked" [class.text-slate-400]="!check.checked">
                   {{ check.checked ? 'Idoneo' : 'Da Verificare' }}
                 </span>
              </div>

              <h4 class="text-xs font-bold text-slate-700 leading-tight uppercase mb-4 grow">{{ check.label }}</h4>

              <div class="flex items-center justify-between mt-auto">
                 <div class="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden mr-3">
                    <div class="h-full transition-all duration-500"
                         [class]="check.checked ? 'bg-emerald-500' : 'bg-slate-200'"
                         [style.width.%]="check.checked ? 100 : 0"></div>
                 </div>
                 <i class="fa-solid fa-circle-check text-sm transition-all" [class.text-emerald-500]="check.checked" [class.text-slate-200]="!check.checked"></i>
              </div>
            </button>
          }
        </div>
      </div>

      @if (!canEdit()) {
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <i class="fa-solid fa-lock text-slate-400"></i>
            <p class="text-xs text-slate-500 font-bold uppercase tracking-wider">Modalità sola lettura: <span class="font-medium normal-case ml-1 tracking-normal">Seleziona un'unità operativa per modificare i dati.</span></p>
          </div>
      }
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class StaffTrainingChecklistComponent {
  state = inject(AppStateService);
  moduleId = 'staff-training';

  checks = signal<CheckItem[]>([
    { id: 't-1', label: 'VERIFICA POSSESSO ATTESTATO DI FORMAZIONE (HACCP / Sicurezza)', checked: false },
    { id: 't-2', label: 'PROCEDERE CON GLI AGGIORNAMENTI IN SICUREZZA ALIMENTARE', checked: false },
    { id: 't-3', label: 'CONTROLLARE LE ISTRUZIONI DI LAVORO E PROCEDURE OPERATIVE', checked: false }
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

  toggleCheck(id: string) {
    if (!this.canEdit()) return;
    this.checks.update(items =>
      items.map(item => item.id === id ? { ...item, checked: !item.checked } : item)
    );
    this.state.saveRecord(this.moduleId, this.checks());
  }
}
