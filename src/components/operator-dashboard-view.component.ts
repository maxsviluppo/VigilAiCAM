
import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../services/app-state.service';

@Component({
  selector: 'app-operator-dashboard-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6 animate-fade-in p-4 pb-12 max-w-7xl mx-auto">
      
      <!-- SLEEK HEADER -->
      <div class="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div class="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none"></div>
        
        <div class="flex items-center gap-6 relative z-10 w-full md:w-auto">
          <div class="relative shrink-0">
             <img [src]="state.currentUser()?.avatar" class="h-16 w-16 md:h-20 md:w-20 rounded-3xl shadow-xl object-cover ring-4 ring-slate-50">
             <div class="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-4 border-white bg-emerald-500 shadow-sm"></div>
          </div>
          <div>
            <h2 class="text-2xl md:text-3xl font-black text-slate-800 tracking-tight leading-none mb-2">Ciao, {{ state.currentUser()?.name?.split(' ')[0] }}!</h2>
            <div class="flex items-center gap-2">
               <span class="bg-indigo-50 text-indigo-600 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest border border-indigo-100">{{ state.currentUser()?.department || 'Staff Operativo' }}</span>
               <span class="text-xs font-bold text-slate-400">Punto vendita: {{ state.companyConfig().name }}</span>
            </div>
          </div>
        </div>

        <!-- Quick Stats / Date -->
        <div class="flex items-center gap-4 relative z-10 bg-slate-900 px-6 py-4 rounded-[1.5rem] shadow-xl shadow-slate-200">
           <div class="h-10 w-10 flex items-center justify-center bg-white/10 rounded-xl text-white">
             <i class="fa-regular fa-calendar-check text-xl"></i>
           </div>
           <div class="text-left">
             <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5 leading-none">Turno Odierno</p>
             <p class="text-sm font-black text-white leading-none">{{ getCurrentDay() }}, {{ getCurrentDayNumber() }} {{ getCurrentMonth() }}</p>
           </div>
        </div>
      </div>

      <!-- PAYMENT BANNER -->
      @if (true) {
        @let isPaid = state.recentPaidPayment();
        @let activePay = state.latestActivePayment();
        @let urgency = activePay ? state.getDaysRemaining(activePay.dueDate) : 100;
        @let theme = (activePay && urgency <= 7) ? 'URGENT' : (isPaid ? 'SUCCESS' : 'NOTICE');

        <div [class]="'rounded-[2rem] p-6 mb-2 relative overflow-hidden group border-2 transition-all duration-500 ' + 
            (theme === 'SUCCESS' ? 'bg-emerald-50/30 border-emerald-500 text-slate-800' : 
             theme === 'URGENT' ? 'bg-red-600 border-red-700 text-white shadow-xl shadow-red-500/30' : 
             'bg-amber-50/30 border-amber-400 text-slate-800')">
          
          <div class="absolute inset-0 overflow-hidden pointer-events-none">
            <div [class]="'absolute -right-10 -top-10 w-64 h-64 rounded-full blur-[80px] opacity-20 ' + 
                (theme === 'SUCCESS' ? 'bg-emerald-400' : theme === 'URGENT' ? 'bg-red-400' : 'bg-amber-400')"></div>
          </div>
          
          <div class="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
            <div class="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
              <div [class]="'h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 group-hover:scale-105 ' + 
                  (theme === 'SUCCESS' ? 'bg-emerald-500 text-white' : 
                   theme === 'URGENT' ? 'bg-white text-red-600 shadow-md' : 
                   'bg-amber-500 text-white')">
                <i [class]="'fa-solid text-2xl ' + (theme === 'SUCCESS' ? 'fa-circle-check' : (theme === 'URGENT' ? 'fa-triangle-exclamation' : 'fa-credit-card'))"></i>
              </div>

              <div class="space-y-1">
                  <div class="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <span [class]="'px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ' + 
                        (theme === 'SUCCESS' ? 'bg-white text-emerald-700 border border-emerald-200' : 
                         theme === 'URGENT' ? 'bg-red-700 text-white border border-red-500' : 
                         'bg-white text-amber-700 border border-amber-200')">
                      {{ theme === 'SUCCESS' ? 'Transazione Registrata' : (activePay ? 'Riferimento: ' + (activePay.dueDate | date:'MMMM yyyy') : 'Pianificazione Pagamenti') }}
                    </span>
                  </div>
                  <h4 class="text-xl font-black tracking-tight leading-tight">
                    {{ theme === 'SUCCESS' ? 'Pagamento Ricevuto' : (theme === 'URGENT' ? 'Prossima Rata In Scadenza' : 'Servizio Attivo e Regolare') }}
                  </h4>
                  <p class="text-xs font-medium opacity-70">Il tuo account è in regola con i termini di servizio.</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
               @if (theme === 'SUCCESS') {
                  <div class="px-6 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200">Gestito</div>
               } @else {
                  <button [class]="'px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95 ' + 
                      (theme === 'URGENT' ? 'bg-white text-red-700 hover:bg-slate-50' : 'bg-slate-900 text-white hover:bg-black')">
                    {{ theme === 'URGENT' ? 'Paga Ora' : 'Dettagli Piano' }}
                  </button>
               }
            </div>
          </div>
        </div>
      }

      <!-- OPERATIONAL GRID - EXTREMELY RESPONSIVE -->
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
        @for (action of quickActions; track action.id) {
            <button (click)="action.id === 'abbattimento-log' && !state.hasAbbattitore() ? null : state.setModule(action.id)"
                    [disabled]="action.id === 'abbattimento-log' && !state.hasAbbattitore()"
                    [class]="'group relative overflow-hidden bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200 transition-all duration-300 text-center flex flex-col items-center justify-center gap-4 active:scale-95 h-full ' + (action.id === 'abbattimento-log' && !state.hasAbbattitore() ? 'opacity-40 cursor-not-allowed filter grayscale' : '')">
                <div [class]="'h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg ' + action.bg + ' ' + action.color">
                    <i class="fa-solid {{ action.icon }} text-2xl"></i>
                </div>
                <div>
                    <h4 class="text-sm font-black text-slate-800 uppercase tracking-tight leading-tight">{{ action.label }}</h4>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity">{{ action.sub }}</p>
                </div>
                <!-- Mini status dot -->
                <div class="absolute top-4 right-4 h-2 w-2 rounded-full bg-slate-200 group-hover:bg-indigo-500 transition-colors"></div>
            </button>
        }
      </div>

      <!-- MIDDLE ROW: ANOMALIES & MESSAGES -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- ANOMALIES SECTION (5 cols on large) -->
        <div class="lg:col-span-5 flex flex-col gap-6">
            <!-- ANOMALY CARD -->
            <div class="bg-white rounded-[2rem] p-8 border border-red-100 shadow-sm hover:shadow-md transition-all flex flex-col h-full relative overflow-hidden group">
                <div class="absolute -right-4 -top-4 h-24 w-24 bg-red-50 rounded-full blur-2xl group-hover:bg-red-100/50 transition-all"></div>
                
                <div class="flex items-center justify-between mb-8 relative z-10">
                    <div class="flex items-center gap-4">
                        <div class="h-14 w-14 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-200 animate-pulse">
                            <i class="fa-solid fa-triangle-exclamation text-2xl"></i>
                        </div>
                        <div>
                            <h3 class="text-xl font-black text-slate-800 tracking-tight">Segnala Anomalia</h3>
                            <p class="text-xs font-bold text-red-500 uppercase tracking-widest">Gestione Non Conformità</p>
                        </div>
                    </div>
                    <button (click)="state.setModule('non-compliance')" class="h-10 w-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm border border-slate-100">
                        <i class="fa-solid fa-arrow-right"></i>
                    </button>
                </div>

                <!-- PREVIEW OF OPEN ANOMALIES -->
                <div class="flex-1 space-y-3 relative z-10">
                    <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Ultime Segnalazioni</h4>
                    @for (nc of openAnomalies().slice(0, 2); track nc.id) {
                        <div (click)="state.setModule('non-compliance')" class="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:border-red-200 transition-all cursor-pointer group/item">
                            <div class="flex justify-between items-start gap-3">
                                <div class="min-w-0 flex-1">
                                    <p class="text-xs font-black text-slate-800 truncate mb-1">{{ nc.itemName || 'Anomalia Generica' }}</p>
                                    <p class="text-[10px] text-slate-500 line-clamp-1 italic">"{{ nc.description }}"</p>
                                </div>
                                <span class="bg-amber-100 text-amber-700 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest whitespace-nowrap">Aperta</span>
                            </div>
                        </div>
                    } @empty {
                        <div class="py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            <i class="fa-solid fa-circle-check text-slate-200 text-3xl mb-2"></i>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nessuna anomalia aperta</p>
                        </div>
                    }
                </div>

                <button (click)="state.setModule('non-compliance')" class="w-full mt-8 py-4 bg-red-600 text-white font-black uppercase tracking-widest rounded-2xl text-[11px] shadow-xl shadow-red-200 hover:bg-red-700 transition-all active:scale-95">
                    + Nuova Segnalazione
                </button>
            </div>
        </div>

        <!-- MESSAGES -->
        <div class="lg:col-span-7 space-y-6">
            <div class="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col h-full min-h-[400px]">
                <div class="flex items-center justify-between mb-8">
                    <div class="flex items-center gap-4">
                        <div class="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                            <i class="fa-solid fa-comments text-xl"></i>
                        </div>
                        <div>
                            <h3 class="text-xl font-black text-slate-800 tracking-tight">Comunicazioni</h3>
                            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Messaggi dalla Direzione</p>
                        </div>
                    </div>
                    @if (state.unreadMessagesCount() > 0) {
                        <span class="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full animate-pulse shadow-lg shadow-blue-200">{{ state.unreadMessagesCount() }} NUOVI</span>
                    }
                </div>

                <div class="flex-1 space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                    @for (msg of state.getMessagesForCurrentUser().slice(0, 4); track msg.id) {
                        <div (click)="state.setModule('messages')" class="p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group/msg">
                            <div class="flex items-start gap-4">
                                <div class="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 group-hover/msg:border-blue-300">
                                    <i class="fa-solid fa-user-tie text-slate-400 group-hover/msg:text-blue-500"></i>
                                </div>
                                <div class="min-w-0 flex-1">
                                    <div class="flex justify-between items-center mb-1">
                                        <h5 class="text-xs font-black text-slate-900 truncate uppercase tracking-tight">{{ msg.subject }}</h5>
                                        <span class="text-[9px] font-bold text-slate-400">{{ msg.timestamp | date:'HH:mm' }}</span>
                                    </div>
                                    <p class="text-[11px] text-slate-500 line-clamp-1 italic leading-relaxed">"{{ msg.content }}"</p>
                                </div>
                            </div>
                        </div>
                    } @empty {
                        <div class="h-full flex flex-col items-center justify-center text-slate-300 py-12">
                            <i class="fa-regular fa-envelope-open text-5xl mb-4 opacity-20"></i>
                            <p class="text-xs font-black uppercase tracking-[0.2em]">Nessuna comunicazione</p>
                        </div>
                    }
                </div>
            </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
  `]
})
export class OperatorDashboardViewComponent {
  state = inject(AppStateService);

  quickActions = [
    { id: 'ddt-carico', label: 'Carico Merci', sub: 'DDT / Ricezione', icon: 'fa-truck-ramp-box', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'preparations', label: 'Preparazioni', sub: 'Anagrafica Prodotti', icon: 'fa-mortar-pestle', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'ingredients-book', label: 'Libro Ingredienti', sub: 'Ricettario / Allergeni', icon: 'fa-book-open', color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'temperatures', label: 'Controllo Temperature', sub: 'Registro Rilevazioni', icon: 'fa-temperature-half', color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { id: 'food-conservation', label: 'Controllo Scadenze', sub: 'Conservazione Alimenti', icon: 'fa-calendar-xmark', color: 'text-red-600', bg: 'bg-red-50' },
    { id: 'production-log', label: 'Rintracciabilità', sub: 'Lotti / Produzione', icon: 'fa-barcode', color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'abbattimento-log', label: 'Abbattitore', sub: 'Registro Freddo', icon: 'fa-icicles', color: 'text-sky-600', bg: 'bg-sky-50' },
    { id: 'micro-bio', label: 'Monitoraggio Ambiente', sub: 'Analisi Biologiche', icon: 'fa-vial-virus', color: 'text-violet-600', bg: 'bg-violet-50' },
    { id: 'cleaning-maintenance', label: 'Sanificazione', sub: 'Registro Pulizie', icon: 'fa-broom', color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'production-log', label: 'Prep. Etichette', sub: 'Stampa Etichette', icon: 'fa-tag', color: 'text-teal-600', bg: 'bg-teal-50' }
  ];

  openAnomalies = computed(() => {
    return this.state.filteredNonConformities().filter(nc => nc.status !== 'CLOSED');
  });

  getCurrentDay(): string {
    const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    return days[new Date().getDay()];
  }

  getCurrentDayNumber(): number {
    return new Date().getDate();
  }

  getCurrentMonth(): string {
    const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    return months[new Date().getMonth()];
  }
}
