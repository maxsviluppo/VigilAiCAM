
import { Component, inject, signal, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../services/app-state.service';
import { FormsModule } from '@angular/forms';

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

interface ChecklistSection {
  title: string;
  colorClass: string;
  icon: string;
  items: ChecklistItem[];
}

@Component({
  selector: 'app-operational-checklist',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 pb-10">
      
      <!-- Premium Header with Gradient -->
      <div class="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-8 rounded-3xl shadow-2xl border border-emerald-500/20 relative overflow-hidden">
        <div class="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <i class="fa-solid fa-clipboard-check text-9xl text-white"></i>
        </div>

        <div class="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h2 class="text-3xl font-black text-white flex items-center tracking-tight">
              <span class="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mr-4 shadow-lg border border-white/30">
                  <i class="fa-solid fa-clipboard-check text-white"></i>
              </span>
              Controllo Operativo Giornaliero
            </h2>
            <p class="text-emerald-50 text-sm mt-2 font-medium ml-1">
              Verifica delle fasi Pre-Operativa, Operativa e Post-Operativa
            </p>
          </div>
          
          <!-- Date & User Info Box -->
          <div class="relative flex items-center gap-4 bg-white/10 backdrop-blur-sm px-5 py-3 rounded-xl border border-white/30 shadow-lg"
               [class.ring-2]="hasUnsavedChanges()"
               [class.ring-orange-300]="hasUnsavedChanges()">
             
             @if (hasUnsavedChanges()) {
               <div class="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md animate-pulse border-2 border-white z-10 flex items-center">
                 <i class="fa-solid fa-pencil mr-1"></i> Modificato
               </div>
             }

             <div class="flex flex-col">
               <span class="text-xs text-white/70 font-bold uppercase mb-0.5">Data Verifica</span>
               <div class="font-bold text-white text-sm flex items-center">
                  <i class="fa-regular fa-calendar mr-2"></i>
                  {{ state.filterDate() | date:'dd/MM/yyyy' }}
               </div>
             </div>
             
             @if (!state.isContextEditable()) {
                 <div class="h-8 w-px bg-white/30"></div>
                 <div class="flex items-center text-orange-300 font-bold text-xs uppercase px-2">
                     <i class="fa-solid fa-lock mr-1"></i> Sola Lettura
                 </div>
             }

             <div class="h-8 w-px bg-white/30"></div>
             <div class="flex flex-col">
               <span class="text-xs text-white/70 font-bold uppercase mb-0.5">Operatore</span>
               <div class="flex items-center">
                 <span class="font-bold text-white">{{ state.currentUser()?.name }}</span>
               </div>
             </div>
          </div>
        </div>
      </div>

      <!-- Checklist Sections with Progress Bars -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6" [class.opacity-70]="!state.isContextEditable()">
        @for (section of sections(); track section.title) {
          @let progress = (getCheckedCount(section) / section.items.length * 100);
          
          <div class="bg-white rounded-2xl shadow-lg border-2 overflow-hidden flex flex-col h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
               [class.border-emerald-300]="getSectionStatus(section) === 'complete'"
               [class.shadow-emerald-200]="getSectionStatus(section) === 'complete'"
               [class.border-slate-200]="getSectionStatus(section) !== 'complete'">
            
            <!-- Section Header with Gradient -->
            <div [class]="'p-5 flex flex-col gap-3 ' + section.colorClass">
               <div class="flex items-center justify-between">
                 <div class="flex items-center gap-3">
                   <div class="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-lg border border-white/30">
                     <i [class]="'fa-solid ' + section.icon + ' text-xl'"></i>
                   </div>
                   <div>
                     <h3 class="font-black text-white leading-tight text-lg">{{ section.title }}</h3>
                     <p class="text-xs text-white/80 font-medium mt-0.5">
                       {{ getCheckedCount(section) }}/{{ section.items.length }} Completati
                     </p>
                   </div>
                 </div>

                 <!-- Status Icon Badge -->
                 @switch (getSectionStatus(section)) {
                   @case ('complete') {
                      <div class="w-10 h-10 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-xl transform scale-110 animate-bounce">
                        <i class="fa-solid fa-check text-xl"></i>
                      </div>
                   }
                   @case ('progress') {
                      <div class="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center border-2 border-white/40">
                        <i class="fa-solid fa-spinner fa-spin"></i>
                      </div>
                   }
                   @case ('pending') {
                      <div class="w-10 h-10 rounded-full bg-white/10 text-white/50 flex items-center justify-center border-2 border-white/20">
                        <i class="fa-solid fa-minus"></i>
                      </div>
                   }
                 }
               </div>

               <!-- Visual Progress Bar -->
               <div class="w-full h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                 <div class="h-full bg-white rounded-full transition-all duration-500 ease-out shadow-lg"
                      [style.width.%]="progress"></div>
               </div>
            </div>
            
            <!-- Items -->
            <div class="p-5 flex-1 space-y-2">
              @for (item of section.items; track item.id) {
                <label class="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border-2 border-transparent hover:border-slate-100 hover:bg-slate-50 group select-none active:scale-[0.98]"
                       [class.bg-emerald-50]="item.checked"
                       [class.border-emerald-200]="item.checked"
                       [class.pointer-events-none]="!state.isContextEditable()">
                  
                  <div class="relative flex items-center mt-0.5">
                    <input type="checkbox" [(ngModel)]="item.checked" (change)="markDirty()" 
                           [disabled]="!state.isContextEditable()"
                           class="peer h-6 w-6 cursor-pointer appearance-none rounded-lg border-2 border-slate-300 shadow-sm checked:border-emerald-500 checked:bg-emerald-500 hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-1 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"/>
                    <i class="fa-solid fa-check absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm text-white opacity-0 scale-0 peer-checked:opacity-100 peer-checked:scale-100 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none"></i>
                  </div>
                  
                  <span [class]="'text-sm leading-snug transition-all duration-300 flex-1 ' + (item.checked ? 'text-emerald-700 line-through font-medium' : 'text-slate-700 font-semibold')">
                    {{ item.label }}
                  </span>
                </label>
              }
            </div>
          </div>
        }
      </div>

      <!-- Premium Footer Actions -->
      <div class="bg-gradient-to-r from-slate-50 to-white p-6 rounded-2xl shadow-lg border-2 border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
         
         <div class="flex flex-col gap-2 max-w-lg">
           <div class="text-xs text-slate-500 flex items-center font-medium">
             <i class="fa-solid fa-circle-info mr-2 text-blue-500 text-lg"></i>
             <span>Riferirsi sempre al piano di autocontrollo H.A.C.C.P. per procedure correttive.</span>
           </div>
           
           <!-- Auto-Save Indicator -->
           <div class="flex items-center gap-3 ml-7 h-5">
             @if (isAutoSaving()) {
               <span class="text-xs text-blue-600 font-bold flex items-center animate-pulse">
                 <i class="fa-solid fa-cloud-arrow-up mr-1.5"></i> Salvataggio automatico...
               </span>
             } @else if (hasUnsavedChanges()) {
               <span class="text-xs text-orange-600 font-bold flex items-center animate-pulse">
                 <i class="fa-solid fa-circle-exclamation mr-1.5"></i> Modifiche non salvate
               </span>
             } @else if (lastAutoSave()) {
               <span class="text-[10px] text-slate-400 font-medium flex items-center">
                 <i class="fa-solid fa-cloud-check mr-1.5 text-emerald-400"></i> 
                 Ultimo salvataggio: {{ lastAutoSave() | date:'HH:mm:ss' }}
               </span>
             }
           </div>
         </div>

         <div class="flex items-center gap-4">
           @if (showSuccess()) {
             <span class="text-emerald-600 font-black flex items-center animate-pulse text-lg">
               <i class="fa-solid fa-circle-check mr-2"></i> Verifica Salvata!
             </span>
           }
           <button (click)="saveChecklist('MANUAL')" 
                   [disabled]="isSaving() || !isAllChecked() || !state.isContextEditable()" 
                   class="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-xl shadow-emerald-200 font-black text-lg flex items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transform hover:scale-105 active:scale-95">
             @if (isSaving()) {
               <i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Salvataggio...
             } @else {
               <i class="fa-solid fa-save mr-2"></i> Registra Controlli
             }
           </button>
         </div>
      </div>
      
      @if (!isAllChecked() && !showSuccess()) {
        <p class="text-center text-sm text-orange-600 font-bold bg-orange-50 py-3 px-6 rounded-xl border-2 border-orange-200">
          <i class="fa-solid fa-triangle-exclamation mr-2"></i>
          Completa tutte le voci per abilitare il salvataggio manuale definitivo.
        </p>
      }

    </div>
  `
})
export class OperationalChecklistComponent implements OnInit, OnDestroy {
  state = inject(AppStateService);
  // selectedDate removed to use state.filterDate()

  showSuccess = signal(false);
  isSaving = signal(false);
  isAutoSaving = signal(false);

  // Auto-save State
  hasUnsavedChanges = signal(false);
  lastAutoSave = signal<Date | null>(null);
  private autoSaveTimer: any;

  sections = signal<ChecklistSection[]>([
    {
      title: 'Fase Pre-Operativa',
      colorClass: 'bg-blue-600 border-blue-700',
      icon: 'fa-eye',
      items: [
        { id: 'pre-1', label: 'Ispezione visiva degli ambienti di lavoro', checked: false },
        { id: 'pre-2', label: 'Verifica integrità delle attrezzature', checked: false },
        { id: 'pre-3', label: 'Verifica pulizia superfici prima dell\'uso', checked: false }
      ]
    },
    {
      title: 'Fase Operativa',
      colorClass: 'bg-orange-500 border-orange-600',
      icon: 'fa-fire-burner',
      items: [
        { id: 'op-1', label: 'Controllo temperature (Valori positivi)', checked: false },
        { id: 'op-2', label: 'Controllo temperature (Valori negativi)', checked: false },
        { id: 'op-3', label: 'Evitare contaminazioni crociate (Sporco/Pulito)', checked: false },
        { id: 'op-4', label: 'Compilazione schede monitoraggio produzione', checked: false }
      ]
    },
    {
      title: 'Fase Post-Operativa',
      colorClass: 'bg-emerald-600 border-emerald-700',
      icon: 'fa-broom',
      items: [
        { id: 'post-1', label: 'Pulizia e disinfezione ambienti di lavoro', checked: false },
        { id: 'post-2', label: 'Sanificazione attrezzature utilizzate', checked: false },
        { id: 'post-3', label: 'Adeguata conservazione prodotti finiti', checked: false },
        { id: 'post-4', label: 'Stoccaggio semilavorati e materie prime', checked: false }
      ]
    }
  ]);

  constructor() {
    effect(() => {
      // Trigger reload on date change
      this.state.filterDate();
      this.resetViewForNewDate();
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    this.autoSaveTimer = setInterval(() => {
      if (this.hasUnsavedChanges() && this.state.isContextEditable()) {
        this.saveChecklist('AUTO');
      }
    }, 60000);
  }

  ngOnDestroy() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
  }

  getCheckedCount(section: ChecklistSection): number {
    return section.items.filter(i => i.checked).length;
  }

  getSectionStatus(section: ChecklistSection): 'complete' | 'progress' | 'pending' {
    const checkedCount = this.getCheckedCount(section);
    if (checkedCount === section.items.length) return 'complete';
    if (checkedCount > 0) return 'progress';
    return 'pending';
  }

  isAllChecked(): boolean {
    return this.sections().every(section =>
      section.items.every(item => item.checked)
    );
  }

  markDirty() {
    if (!this.state.isContextEditable()) return;
    this.hasUnsavedChanges.set(true);
  }

  resetViewForNewDate() {
    this.showSuccess.set(false);
    this.hasUnsavedChanges.set(false);
    this.lastAutoSave.set(null);

    // Simulate loading/resetting data
    // Ideally we would load from state.getRecord() here
    // For now, reset to unchecked for simplicity to show sync works
    this.resetChecks();
  }

  saveChecklist(mode: 'MANUAL' | 'AUTO' = 'MANUAL') {
    if (!this.state.isContextEditable()) return;

    if (mode === 'MANUAL' && !this.isAllChecked()) return;

    if (mode === 'MANUAL') {
      this.isSaving.set(true);
    } else {
      this.isAutoSaving.set(true);
    }

    setTimeout(() => {
      if (mode === 'MANUAL') {
        this.isSaving.set(false);
        this.showSuccess.set(true);
        setTimeout(() => { this.showSuccess.set(false); }, 3000);
      } else {
        this.isAutoSaving.set(false);
        this.lastAutoSave.set(new Date());
      }

      this.hasUnsavedChanges.set(false);

      // Save to central state for reporting
      const allChecks = this.sections().flatMap(s => s.items.map(i => ({
        id: i.id,
        label: `${s.title}: ${i.label}`,
        checked: i.checked
      })));
      this.state.saveRecord('operational-checklist', allChecks);

      console.log(`Checklist saved (${mode}) to database:`, {
        date: this.state.filterDate(),
        user: this.state.currentUser()?.id,
        data: allChecks,
        mode: mode
      });
    }, 1500);
  }

  resetChecks() {
    this.sections.update(sections =>
      sections.map(s => ({
        ...s,
        items: s.items.map(i => ({ ...i, checked: false }))
      }))
    );
  }
}
