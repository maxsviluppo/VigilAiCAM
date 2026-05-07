
import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../services/app-state.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-operational-phases-config-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fade-in pb-20">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black text-slate-800 tracking-tight">Gestione Fasi Operative</h1>
          <p class="text-slate-500 font-medium">Personalizza i moduli e le singole attività per questa azienda.</p>
        </div>
        
        <div class="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
           <div class="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <i class="fa-solid fa-building-circle-check text-xl"></i>
           </div>
           <div>
              <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Azienda Attiva</div>
              <div class="text-sm font-bold text-slate-700 leading-tight">{{ state.companyConfig().name }}</div>
           </div>
        </div>
      </div>

      <!-- Config Sections -->
      <div class="grid gap-8">
        
        <!-- PHASE: PRE-OPERATIVA -->
        <div class="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
          <div class="p-6 border-b border-slate-100 bg-purple-50/30 flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-lg">
                <i class="fa-solid fa-clipboard-check text-xl"></i>
              </div>
              <div>
                <h2 class="text-xl font-black text-slate-800 tracking-tight">Fase Pre-Operativa</h2>
                <p class="text-xs font-medium text-slate-500 uppercase tracking-wider">Ispezione e Avvio</p>
              </div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer scale-110">
              <input type="checkbox" [(ngModel)]="config.pre.enabled" class="sr-only peer" (change)="save()">
              <div class="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div class="p-8" [class.opacity-40]="!config.pre.enabled" [class.pointer-events-none]="!config.pre.enabled">
            <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Attività Disponibili</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (act of activities.pre; track act.id) {
                <div class="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all group">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-purple-600 transition-colors">
                      <i [class]="'fa-solid ' + act.icon"></i>
                    </div>
                    <span class="text-sm font-bold text-slate-700">{{ act.label }}</span>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" [(ngModel)]="config.pre.activities[act.id]" class="sr-only peer" (change)="save()">
                    <div class="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                  </label>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- PHASE: OPERATIVA -->
        <div class="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
          <div class="p-6 border-b border-slate-100 bg-amber-50/30 flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg">
                <i class="fa-solid fa-briefcase text-xl"></i>
              </div>
              <div>
                <h2 class="text-xl font-black text-slate-800 tracking-tight">Fase Operativa</h2>
                <p class="text-xs font-medium text-slate-500 uppercase tracking-wider">Monitoraggio Giornaliero</p>
              </div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer scale-110">
              <input type="checkbox" [(ngModel)]="config.operative.enabled" class="sr-only peer" (change)="save()">
              <div class="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <div class="p-8" [class.opacity-40]="!config.operative.enabled" [class.pointer-events-none]="!config.operative.enabled">
            <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Attività Disponibili</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (act of activities.operative; track act.id) {
                <div class="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all group">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-amber-500 transition-colors">
                      <i [class]="'fa-solid ' + act.icon"></i>
                    </div>
                    <span class="text-sm font-bold text-slate-700">{{ act.label }}</span>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" [(ngModel)]="config.operative.activities[act.id]" class="sr-only peer" (change)="save()">
                    <div class="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- PHASE: POST-OPERATIVA -->
        <div class="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
          <div class="p-6 border-b border-slate-100 bg-emerald-50/30 flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg">
                <i class="fa-solid fa-hourglass-end text-xl"></i>
              </div>
              <div>
                <h2 class="text-xl font-black text-slate-800 tracking-tight">Fase Post-Operativa</h2>
                <p class="text-xs font-medium text-slate-500 uppercase tracking-wider">Chiusura e Sanificazione</p>
              </div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer scale-110">
              <input type="checkbox" [(ngModel)]="config.post.enabled" class="sr-only peer" (change)="save()">
              <div class="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div class="p-8" [class.opacity-40]="!config.post.enabled" [class.pointer-events-none]="!config.post.enabled">
            <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Attività Disponibili</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (act of activities.post; track act.id) {
                <div class="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all group">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 transition-colors">
                      <i [class]="'fa-solid ' + act.icon"></i>
                    </div>
                    <span class="text-sm font-bold text-slate-700">{{ act.label }}</span>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" [(ngModel)]="config.post.activities[act.id]" class="sr-only peer" (change)="save()">
                    <div class="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              }
            </div>
          </div>
        </div>

      </div>
    </div>
  `
})
export class OperationalPhasesConfigViewComponent {
  state = inject(AppStateService);

  activities = {
    pre: [
      { id: 'g_cleaning_sanit', label: 'Pulizia e Sanificazione', icon: 'fa-broom' },
      { id: 'g_pest_control', label: 'Controllo Infestanti', icon: 'fa-bug' },
      { id: 'staff-hygiene', label: 'Igiene Personale', icon: 'fa-user-tie' },
      { id: 'cucina-sala', label: 'Cucina e Sala', icon: 'fa-utensils' },
      { id: 'area-lavaggio', label: 'Area Lavaggio', icon: 'fa-sink' },
      { id: 'deposito', label: 'Deposito', icon: 'fa-boxes-stacked' },
      { id: 'spogliatoio', label: 'Spogliatoio', icon: 'fa-shirt' },
      { id: 'antibagno-bagno-personale', label: 'Bagno Personale', icon: 'fa-restroom' },
      { id: 'bagno-clienti', label: 'Bagno Clienti', icon: 'fa-people-arrows' },
      { id: 'pavimenti', label: 'Pavimenti', icon: 'fa-table-cells' },
      { id: 'pareti', label: 'Pareti', icon: 'fa-border-all' },
      { id: 'soffitto', label: 'Soffitto', icon: 'fa-cloud' },
      { id: 'infissi', label: 'Infissi', icon: 'fa-door-closed' }
    ],
    operative: [
      { id: 'ricezione-merci', label: 'Ricezione Merci', icon: 'fa-truck-loading' },
      { id: 'temperature', label: 'Monitoraggio Temperature', icon: 'fa-snowflake' },
      { id: 'abbattimento', label: 'Ciclo di Abbattimento', icon: 'fa-wind' }
    ],
    post: [
      { id: 'cucina-sala', label: 'Cucina e Sala', icon: 'fa-utensils' },
      { id: 'area-lavaggio', label: 'Area Lavaggio', icon: 'fa-sink' },
      { id: 'deposito', label: 'Deposito', icon: 'fa-boxes-stacked' },
      { id: 'spogliatoio', label: 'Spogliatoio', icon: 'fa-shirt' },
      { id: 'antibagno-bagno-personale', label: 'Bagno Personale', icon: 'fa-restroom' },
      { id: 'bagno-clienti', label: 'Bagno Clienti', icon: 'fa-people-arrows' },
      { id: 'pavimenti', label: 'Pavimenti', icon: 'fa-table-cells' },
      { id: 'pareti', label: 'Pareti', icon: 'fa-border-all' },
      { id: 'soffitto', label: 'Soffitto', icon: 'fa-cloud' },
      { id: 'infissi', label: 'Infissi', icon: 'fa-door-closed' }
    ]
  };

  config = {
    pre: { enabled: true, activities: {} as any },
    operative: { enabled: true, activities: {} as any },
    post: { enabled: true, activities: {} as any }
  };

  constructor() {
    effect(() => {
        const currentConfig = this.state.operationalPhasesConfig();
        
        // Populate local state ensuring all activities have a default 'true'
        ['pre', 'operative', 'post'].forEach(key => {
            const modId = key === 'pre' ? 'pre-op-checklist' : key === 'operative' ? 'operative-checklist' : 'post-op-checklist';
            const modConfig = currentConfig[modId] || { enabled: true, activities: {} };
            
            (this.config as any)[key].enabled = modConfig.enabled !== false;
            
            (this.activities as any)[key].forEach((act: any) => {
                (this.config as any)[key].activities[act.id] = modConfig.activities?.[act.id] !== false;
            });
        });
    });
  }

  save() {
    const data = {
        'pre-op-checklist': { enabled: this.config.pre.enabled, activities: this.config.pre.activities },
        'operative-checklist': { enabled: this.config.operative.enabled, activities: this.config.operative.activities },
        'post-op-checklist': { enabled: this.config.post.enabled, activities: this.config.post.activities }
    };
    this.state.updateOperationalPhases(data);
  }
}
