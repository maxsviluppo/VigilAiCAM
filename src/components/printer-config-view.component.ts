
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../services/app-state.service';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-printer-config-view',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="animate-fade-in space-y-6 pb-20 px-4 max-w-5xl mx-auto">
      <!-- MINIMAL HEADER -->
      <div class="relative rounded-[24px] overflow-hidden bg-slate-900 p-8 text-white shadow-sm border border-slate-800">
        <div class="absolute inset-0 opacity-10 pointer-events-none">
          <div class="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500 rounded-full blur-3xl text-white"></div>
        </div>
        
        <div class="relative z-10 flex items-center gap-6">
          <div class="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner">
             <i class="fa-solid fa-print text-2xl text-indigo-400"></i>
          </div>
          <div>
            <h1 class="text-2xl md:text-3xl font-black tracking-tight text-white uppercase italic">Dotazioni Hardware</h1>
            <p class="text-slate-400 text-[11px] font-bold uppercase tracking-widest mt-1">Configurazione stampanti e periferiche rintracciabilità</p>
          </div>
        </div>
      </div>

      <!-- MAIN CONFIG CONTENT -->
      <div class="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden">
        
        <!-- SUB-HEADER -->
        <div class="px-8 py-6 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm">
               <i class="fa-solid fa-barcode text-xl"></i>
            </div>
            <div>
              <h3 class="text-base font-black text-slate-800 uppercase tracking-tight">Stampante Brother QL-700</h3>
              <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Stato: <span class="text-emerald-500">Configurato</span></p>
            </div>
          </div>
          
          <span class="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-100">
             Ready &bull; Verificato
          </span>
        </div>

        <div class="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          <!-- LEFT: DOWNLOADS -->
          <div class="space-y-6">
            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
               <i class="fa-solid fa-download"></i> Supporto Tecnico
            </h4>

            <div class="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 space-y-4">
              <h5 class="text-sm font-black text-slate-800 uppercase italic">Driver Windows Ufficiali</h5>
              <p class="text-xs font-bold text-slate-500 leading-relaxed mb-4">
                 Necessari per la corretta gestione dei rotoli termici originali Brother.
              </p>

              <div class="flex flex-col gap-2">
                 <a href="/qd700w650cita.exe" download 
                    class="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-[10px] font-black transition-all shadow-sm group">
                    <i class="fa-solid fa-download text-xs group-hover:bounce"></i>
                    DOWNLOAD DRIVER (W11/10)
                 </a>
                 <a href="https://www.brother.it/support/ql700/downloads" target="_blank"
                    class="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 hover:text-indigo-600 text-slate-500 rounded-xl text-[10px] font-black transition-all">
                    <i class="fa-solid fa-globe text-xs"></i>
                    PORTALE BROTHER
                 </a>
              </div>
            </div>

            <div class="p-4 bg-amber-50/50 rounded-xl border border-amber-200/50 flex items-start gap-3">
               <i class="fa-solid fa-circle-exclamation text-amber-500 mt-0.5 text-xs"></i>
               <p class="text-[10px] font-bold text-amber-700/80 leading-snug uppercase tracking-tight">
                  Sempre installare i driver prima di collegare la stampante.
               </p>
            </div>
          </div>

          <!-- RIGHT: LABEL FORMAT -->
          <div class="space-y-6">
             <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
               <i class="fa-solid fa-ruler"></i> Formato Consumabile
             </h4>

             <div class="grid grid-cols-1 gap-3">
                <!-- FORMAT 62mm -->
                <div class="relative group cursor-pointer" (click)="setFormat('62mm')">
                   <div [class]="'flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ' + 
                              (format() === '62mm' ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-slate-50 hover:border-slate-200')">
                      <div [class]="'w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ' + 
                                 (format() === '62mm' ? 'bg-indigo-500 text-white shadow-md' : 'bg-slate-100 text-slate-400')">
                         <i class="fa-solid fa-envelope"></i>
                      </div>
                      <div class="flex-1">
                         <span [class]="'block text-xs font-black uppercase tracking-tight ' + (format() === '62mm' ? 'text-indigo-900' : 'text-slate-500')">Standard 62mm</span>
                         <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Ideale per spedizioni e avvisi</span>
                      </div>
                      @if (format() === '62mm') {
                         <i class="fa-solid fa-check text-indigo-500 text-xs"></i>
                      }
                   </div>
                </div>

                <!-- FORMAT 29mm -->
                <div class="relative group cursor-pointer" (click)="setFormat('29mm')">
                   <div [class]="'flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ' + 
                              (format() === '29mm' ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-slate-50 hover:border-slate-200')">
                      <div [class]="'w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ' + 
                                 (format() === '29mm' ? 'bg-indigo-500 text-white shadow-md' : 'bg-slate-100 text-slate-400')">
                         <i class="fa-solid fa-tag"></i>
                      </div>
                      <div class="flex-1">
                         <span [class]="'block text-xs font-black uppercase tracking-tight ' + (format() === '29mm' ? 'text-indigo-900' : 'text-slate-500')">Medio 29mm</span>
                         <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Segnaletica interna discreta</span>
                      </div>
                      @if (format() === '29mm') {
                         <i class="fa-solid fa-check text-indigo-500 text-xs"></i>
                      }
                   </div>
                </div>

                <!-- FORMAT 12mm -->
                <div class="relative group cursor-pointer" (click)="setFormat('12mm')">
                   <div [class]="'flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ' + 
                              (format() === '12mm' ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-slate-50 hover:border-slate-200')">
                      <div [class]="'w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ' + 
                                 (format() === '12mm' ? 'bg-indigo-500 text-white shadow-md' : 'bg-slate-100 text-slate-400')">
                         <i class="fa-solid fa-grip-lines"></i>
                      </div>
                      <div class="flex-1">
                         <span [class]="'block text-xs font-black uppercase tracking-tight ' + (format() === '12mm' ? 'text-indigo-900' : 'text-slate-500')">Sottile 12mm</span>
                         <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Ideale per scaffali o cavi</span>
                      </div>
                      @if (format() === '12mm') {
                         <i class="fa-solid fa-check text-indigo-500 text-xs"></i>
                      }
                   </div>
                </div>
             </div>
          </div>
        </div>

        <!-- FOOTER ACTIONS -->
        <div class="px-8 py-6 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
           <div class="flex items-center gap-3">
              <div class="w-1.5 h-8 bg-indigo-500 rounded-full"></div>
              <div>
                 <p class="text-[10px] font-black text-slate-800 uppercase tracking-widest">Sincronizzazione Hardware</p>
                 <p class="text-[9px] font-bold text-slate-400 uppercase">Aggiorna tutte le postazioni</p>
              </div>
           </div>

           <button (click)="save()" 
                   class="w-full md:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-black transition-all shadow-md flex items-center justify-center gap-3 active:scale-95 group">
               <i class="fa-solid fa-floppy-disk group-hover:rotate-12 transition-transform"></i>
               SALVA CONFIGURAZIONE
           </button>
        </div>

      </div>

      <!-- TIP CARD -->
      <div class="p-6 bg-slate-100 rounded-2xl border border-slate-200 flex items-start gap-4">
         <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shrink-0 border border-slate-200">
            <i class="fa-solid fa-lightbulb"></i>
         </div>
         <div>
            <h4 class="text-xs font-black text-slate-700 uppercase tracking-widest mb-1 italic">Nota sulla Stampa</h4>
            <p class="text-[11px] font-bold text-slate-500 leading-relaxed uppercase tracking-tight">
               Assicurati che il rotolo inserito nella stampante corrisponda fisicamente al formato selezionato sopra per evitare errori di allineamento.
            </p>
         </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes pulse-slow {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.05); opacity: 0.8; }
    }
    .animate-pulse-slow {
      animation: pulse-slow 4s infinite ease-in-out;
    }
    .bounce {
       animation: bounce 1s infinite;
    }
    @keyframes bounce {
       0%, 100% { transform: translateY(0); }
       50% { transform: translateY(-5px); }
    }
  `]
})
export class PrinterConfigViewComponent {
  state = inject(AppStateService);
  
  format = signal<'62mm' | '29mm' | '12mm'>('62mm');

  constructor() {
    const current = this.state.isAdmin() ? 
                    this.state.adminCompany().labelFormat : 
                    this.state.companyConfig().labelFormat;
    this.format.set(current || '62mm');
  }

  setFormat(f: '62mm' | '29mm' | '12mm') {
    this.format.set(f);
  }

  async save() {
    const updates = {
      labelFormat: this.format()!,
      printerModel: 'Brother QL-700',
      printerDriverUrl: '/qd700w650cita.exe'
    };

    if (this.state.isAdmin()) {
      await this.state.updateAdminCompany({
        ...this.state.adminCompany(),
        ...updates
      } as any);
    } else {
      await this.state.updateCurrentCompany(updates);
    }
  }
}
