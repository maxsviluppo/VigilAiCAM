import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../services/app-state.service';

@Component({
  selector: 'app-operator-dashboard-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6 animate-fade-in p-4 pb-12 max-w-7xl mx-auto">
      
      <!-- Sleek Professional Header for Operator -->
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div class="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none"></div>
        <div class="flex items-center gap-5 relative z-10">
          <div class="relative flex-shrink-0">
             <img [src]="state.currentUser()?.avatar" class="h-14 w-14 rounded-xl shadow-md object-cover ring-1 ring-slate-200">
             <div class="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500"></div>
          </div>
          <div>
            <h2 class="text-2xl font-bold text-slate-800 tracking-tight">Ciao, {{ state.currentUser()?.name?.split(' ')[0] }}</h2>
            <div class="flex items-center gap-2 mt-1">
               <span class="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">{{ state.currentUser()?.department || 'Staff Operativo' }}</span>
               <span class="text-xs font-semibold text-emerald-600 flex items-center gap-1"><span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Online</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-4 relative z-10 bg-slate-50 px-5 py-3 rounded-xl border border-slate-100 shrink-0">
           <div class="text-right flex flex-col justify-center">
             <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 leading-none">Turno attuale</p>
             <p class="text-sm font-bold text-slate-700 leading-none">{{ getCurrentDay() }}, {{ getCurrentDayNumber() }} {{ getCurrentMonth() }}</p>
           </div>
           <div class="h-10 w-10 flex items-center justify-center bg-white rounded-full border border-slate-200 text-slate-500 shadow-sm shrink-0">
             <i class="fa-regular fa-calendar-check text-lg"></i>
           </div>
        </div>
      </div>
      <!-- Highly Visible Payment Banner (Always Present) -->
      @if (true) {
        <!-- Logic to determine theme -->
        @let isPaid = state.recentPaidPayment();
        @let activePay = state.latestActivePayment();
        @let urgency = activePay ? state.getDaysRemaining(activePay.dueDate) : 100;
        
        <!-- Updated Priority Logic: URGENT (7 days) > SUCCESS (Recent) > NOTICE -->
        @let theme = (activePay && urgency <= 7) ? 'URGENT' : (isPaid ? 'SUCCESS' : 'NOTICE');

        <div [class]="'rounded-[2rem] p-6 mb-8 relative overflow-hidden group border-2 transition-all duration-500 ' + 
            (theme === 'SUCCESS' ? 'bg-emerald-50/30 border-emerald-500 text-slate-800' : 
             theme === 'URGENT' ? 'bg-red-600 border-red-700 text-white shadow-xl shadow-red-500/30' : 
             'bg-amber-50/30 border-amber-400 text-slate-800')">
          
          <!-- Subtle Glow Effects -->
          <div class="absolute inset-0 overflow-hidden pointer-events-none">
            <div [class]="'absolute -right-10 -top-10 w-64 h-64 rounded-full blur-[80px] opacity-20 ' + 
                (theme === 'SUCCESS' ? 'bg-emerald-400' : theme === 'URGENT' ? 'bg-red-400' : 'bg-amber-400')"></div>
          </div>
          
          <div class="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
            <div class="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
              <!-- Iconic Status Symbol -->
              <div [class]="'h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 group-hover:scale-105 ' + 
                  (theme === 'SUCCESS' ? 'bg-emerald-500 text-white' : 
                   theme === 'URGENT' ? 'bg-white text-red-600 shadow-md' : 
                   'bg-amber-500 text-white')">
                <i [class]="'fa-solid text-2xl ' + (theme === 'SUCCESS' ? 'fa-circle-check' : (theme === 'URGENT' ? 'fa-triangle-exclamation' : 'fa-credit-card'))"></i>
              </div>

              <div class="space-y-3">
                <div class="space-y-1">
                  <div class="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <span [class]="'px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ' + 
                        (theme === 'SUCCESS' ? 'bg-white text-emerald-700 border border-emerald-200' : 
                         theme === 'URGENT' ? 'bg-red-700 text-white border border-red-500' : 
                         'bg-white text-amber-700 border border-amber-200')">
                      @if (theme === 'SUCCESS') {
                        Transazione Registrata
                      } @else if (activePay) {
                         Riferimento: {{ activePay.dueDate | date:'MMMM yyyy' }}
                      } @else {
                        Pianificazione Pagamenti
                      }
                    </span>
                    @if (theme === 'URGENT') {
                      <span class="px-3 py-1 rounded-lg bg-white text-red-700 text-[10px] font-black uppercase tracking-widest animate-pulse shadow-sm">
                        SCADENZA IMMINENTE
                      </span>
                    }
                  </div>
                  
                  <h4 class="text-2xl font-black tracking-tight leading-tight">
                    @if (theme === 'SUCCESS') {
                      Pagamento <span class="text-emerald-600 italic">Ricevuto</span>
                    } @else if (theme === 'URGENT') {
                      @if (urgency <= 0) {
                        ATTENZIONE: <span class="text-red-200 italic">SISTEMA SCADUTO</span>
                      } @else {
                        Prossima Rata <span class="text-red-200 italic">In Scadenza</span>
                      }
                    } @else {
                      Promemoria <span class="text-amber-600 italic">Prossima Rata</span>
                    }
                  </h4>
                  
                  <p [class]="'text-xs font-bold max-w-lg leading-relaxed ' + 
                      (theme === 'URGENT' ? 'text-red-100' : 'text-slate-500')">
                    @if (theme === 'SUCCESS') {
                      L'ultimo saldo è stato confermato. @if (activePay) { La prossima rata è programmata per il <span class="text-slate-800 font-black">{{ activePay.dueDate | date:'dd/MM/yyyy' }}</span>. } @else { Il servizio prosegue regolarmente senza interruzioni. }
                    } @else if (theme === 'URGENT') {
                      @if (urgency <= 0) {
                        AVVISO CRITICO: Il pagamento risulta scaduto. Si informa che, in caso di mancato adeguamento entro 5 giorni dalla scadenza, l'accesso al sistema verrà automaticamente sospeso.
                      } @else {
                        Attenzione: mancano meno di 7 giorni alla scadenza della prossima rata. Ti invitiamo a regolarizzare entro il <span class="text-white bg-red-800/40 px-1 py-0.5 rounded">{{ activePay?.dueDate | date:'dd/MM/yyyy' }}</span> per evitare interruzioni del servizio.
                      }
                    } @else {
                      Ti informiamo che la prossima quota di abbonamento è prevista per il {{ activePay?.dueDate | date:'dd/MM/yyyy' }}. Puoi gestire il rinnovo dall'area riservata.
                    }
                  </p>
                </div>

                <div class="flex flex-wrap items-center justify-center md:justify-start gap-2 text-[10px] font-black uppercase tracking-tighter">
                  <div [class]="'flex items-center gap-2 px-3 py-1.5 rounded-xl border ' + 
                      (theme === 'URGENT' ? 'bg-red-800/50 border-red-500 text-white' : 'bg-white border-slate-100 text-slate-400')">
                    <i class="fa-solid fa-calendar-day"></i>
                    @if (theme === 'SUCCESS') {
                      @if (activePay) {
                        PROSSIMA SCADENZA: {{ activePay.dueDate | date:'dd/MM/yyyy' }}
                      } @else {
                        OPERATIVITÀ GARANTITA
                      }
                    } @else {
                      @if (activePay?.dueDate) {
                        PROSSIMA SCADENZA: {{ activePay!.dueDate | date:'dd/MM/yyyy' }}
                      } @else {
                        DATA SCADENZA: ---
                      }
                    }
                  </div>
                  @if (activePay && theme !== 'SUCCESS') {
                    <div [class]="'flex items-center gap-2 px-3 py-1.5 rounded-xl border ' + 
                        (theme === 'URGENT' ? 'bg-red-900/60 border-red-500 text-white shadow-inner' : 'bg-slate-50 border-slate-100 text-slate-500')">
                      <i class="fa-solid fa-hourglass-half"></i>
                      {{ urgency <= 0 ? 'SCADUTA' : urgency + ' GIORNI AL TERMINE' }}
                    </div>
                  }
                </div>
              </div>
            </div>
            
            <div class="flex flex-col items-center gap-3 shrink-0">
              @if (theme === 'SUCCESS') {
                <div class="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center animate-bounce">
                  <i class="fa-solid fa-check text-lg"></i>
                </div>
                <div class="px-4 py-1.5 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest">
                  Gestito
                </div>
              } @else {
                <button [class]="'px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-md hover:shadow-lg active:scale-95 ' + 
                    (theme === 'URGENT' ? 'bg-white text-red-700 hover:bg-slate-50' : 'bg-slate-900 text-white hover:bg-black')">
                  @if (theme === 'URGENT') {
                    PAGA ORA
                  } @else {
                    MIGLIORA PIANO
                  }
                </button>
              }
            </div>
          </div>
        </div>
      }

      <!-- Main Operational Phases -->
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
         <h3 class="text-lg font-bold text-slate-800 tracking-tight mb-6">Controlli Obbligatori Giornalieri</h3>
         <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            @for (phase of [
              {id: 'pre-op-checklist', label: 'Apertura', sub: 'Pre-Operativa', icon: 'fa-sun', iconColor: 'text-sky-500', bg: 'bg-sky-50', bgFill: 'bg-sky-500'},
              {id: 'operative-checklist', label: 'Monitoraggio', sub: 'Operativa', icon: 'fa-briefcase', iconColor: 'text-indigo-500', bg: 'bg-indigo-50', bgFill: 'bg-indigo-500'},
              {id: 'production-log', label: 'Rintracciabilità', sub: 'Prodotti', icon: 'fa-barcode', iconColor: 'text-amber-500', bg: 'bg-amber-50', bgFill: 'bg-amber-500'},
              {id: 'post-op-checklist', label: 'Chiusura', sub: 'Post-Operativa', icon: 'fa-moon', iconColor: 'text-purple-500', bg: 'bg-purple-50', bgFill: 'bg-purple-500'}
            ]; track phase.id) {
              <button (click)="state.setModule(phase.id)" 
                   class="group relative overflow-hidden rounded-xl p-5 border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-md hover:border-slate-300 transition-all text-left flex flex-col h-full">
                 
                 <div class="mb-4 flex items-center justify-between">
                    <div [class]="'h-10 w-10 rounded-full flex items-center justify-center transition-all bg-white shadow-sm border border-slate-100 group-hover:scale-110 shrink-0 ' + phase.iconColor">
                      <i class="fa-solid {{ phase.icon }} text-lg"></i>
                    </div>
                    <div class="text-right">
                       <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{{ phase.sub }}</span>
                       <span class="text-xs font-bold" [class]="isPhaseComplete(phase.id) ? 'text-emerald-600' : 'text-slate-500'">{{ isPhaseComplete(phase.id) ? 'Lavoro Concluso' : 'Da Rilasciare' }}</span>
                    </div>
                 </div>

                 <h4 class="text-base font-bold text-slate-800 leading-tight mb-4 flex-1">{{ phase.label }}</h4>

                 <div class="relative h-1.5 rounded-full bg-slate-200 overflow-hidden w-full">
                    <div class="h-full transition-all duration-1000" 
                         [class]="phase.bgFill"
                         [style.width.%]="isPhaseComplete(phase.id) ? 100 : 0"></div>
                 </div>
              </button>
            }
         </div>
      </div>

      <!-- Lower Grid: Actions, Insights & Messages -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Action: Anomaly & History -->
        <div class="space-y-6 flex flex-col">
          <!-- Anomaly Button -->
          <button (click)="state.setModule('non-compliance')" 
               class="w-full bg-white rounded-2xl p-6 shadow-sm border border-red-100 hover:border-red-300 hover:shadow-md transition-all text-left flex items-center gap-5 group">
             <div class="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center shrink-0 border border-red-100 group-hover:bg-red-500 group-hover:text-white text-red-500 transition-colors">
                 <i class="fa-solid fa-triangle-exclamation text-xl"></i>
             </div>
             <div>
                <h3 class="text-base font-bold text-red-600 mb-0.5">Segnala Anomalia</h3>
                <p class="text-xs text-slate-500">Apri un ticket di non conformità</p>
             </div>
          </button>

          <!-- Export Official Report -->
          <div class="bg-slate-900 rounded-2xl p-6 shadow-md text-white border border-slate-800 relative overflow-hidden">
            <div class="absolute right-0 top-0 h-32 w-32 bg-indigo-500/20 rounded-full blur-2xl"></div>
            <h3 class="text-base font-bold mb-2 relative z-10 tracking-tight">Esportazione PDF</h3>
            <p class="text-[11px] text-slate-400 mb-5 relative z-10 leading-relaxed">Genera il riepilogo ufficiale delle tue verifiche odierne per l'archivio cartaceo.</p>
            
            <button (click)="printDailyReport()" class="w-full py-3 bg-white hover:bg-slate-100 text-slate-900 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm relative z-10 active:scale-95">
              <i class="fa-solid fa-file-pdf text-red-500"></i> Stampa Verifiche
            </button>
          </div>

          <!-- Personal Insights snippet -->
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex-1 flex flex-col">
             <h3 class="text-sm font-bold text-slate-800 tracking-tight mb-4 border-b border-slate-100 pb-2">Riepilogo Turno</h3>
             
             <div class="flex flex-col gap-4 mb-auto">
                 <div>
                     <div class="flex items-center justify-between mb-1.5">
                         <span class="text-xs font-bold text-slate-500">Avanzamento Globale</span>
                         <span class="text-sm font-bold text-slate-800 tabular-nums border border-slate-100 bg-slate-50 rounded-md px-1.5">{{ completedPhasesCount() }}/4</span>
                     </div>
                     <div class="h-2 rounded-full bg-slate-100 overflow-hidden">
                         <div class="h-full bg-emerald-500 transition-all duration-1000" [style.width.%]="(completedPhasesCount() / 4) * 100"></div>
                     </div>
                 </div>

                 <div class="flex items-center justify-between mt-2">
                     <span class="text-xs font-bold text-slate-500">Ultimo Accesso Registro</span>
                     <span class="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">{{ lastRecordTime() }}</span>
                 </div>
             </div>

             <!-- Documentazione Rapida Operatore -->
             <div class="grid grid-cols-2 gap-3 mt-5">
                 <button (click)="state.setModule('documentation')" class="p-3 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 hover:shadow-sm transition-all text-left group">
                     <i class="fa-solid fa-folder-tree text-lg text-blue-500 mb-2 group-hover:scale-110 transition-transform"></i>
                     <h4 class="text-xs font-bold text-blue-900 leading-tight">Archivio Cloud</h4>
                 </button>
                 <button (click)="state.setModule('micro-bio')" class="p-3 bg-violet-50 border border-violet-100 rounded-xl hover:bg-violet-100 hover:shadow-sm transition-all text-left group">
                     <i class="fa-solid fa-vial-virus text-lg text-violet-500 mb-2 group-hover:scale-110 transition-transform"></i>
                     <h4 class="text-xs font-bold text-violet-900 leading-tight">Analisi Lab</h4>
                 </button>
             </div>

             <button (click)="state.setModule('history')" class="group w-full mt-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2">
                VEDI STORICO LISTE
             </button>
          </div>

        </div>

        <!-- Messaging Center -->
        <div class="col-span-1 lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full min-h-[350px]">
             <div class="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                 <div class="flex items-center gap-3">
                     <h3 class="text-base font-bold text-slate-800 tracking-tight">Messaggistica Aziendale</h3>
                     @if (state.unreadMessagesCount() > 0) {
                        <span class="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">{{ state.unreadMessagesCount() }} nuovi</span>
                     }
                 </div>
                 <button (click)="state.setModule('messages')" class="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline">Vedi Archivio</button>
             </div>
             
             <div class="flex-1 p-4 overflow-y-auto custom-scrollbar">
                 @if (state.getMessagesForCurrentUser().length === 0) {
                     <div class="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                         <div class="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <i class="fa-regular fa-envelope-open text-2xl text-slate-300"></i>
                         </div>
                         <p class="text-sm font-bold text-slate-600">Nessun nuovo messaggio</p>
                         <p class="text-xs">Le comunicazioni ricevute appariranno qui.</p>
                     </div>
                 } @else {
                     <div class="space-y-3">
                         @for (msg of state.getMessagesForCurrentUser().slice(0, 4); track msg.id) {
                             <div (click)="state.setModule('messages')" 
                                  class="p-4 rounded-xl bg-slate-50 hover:bg-white border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer flex gap-4 items-start">
                                 <div class="h-8 w-8 rounded-full flex items-center justify-center shrink-0 border mt-0.5" [class.bg-blue-50]="!msg.read" [class.border-blue-200]="!msg.read" [class.bg-slate-100]="msg.read" [class.border-slate-200]="msg.read">
                                     <i class="fa-solid fa-envelope text-xs" [class.text-blue-500]="!msg.read" [class.text-slate-400]="msg.read"></i>
                                 </div>
                                 <div class="flex-1 min-w-0">
                                     <div class="flex justify-between items-baseline mb-1">
                                         <h4 class="text-sm font-bold text-slate-800 truncate" [class.text-blue-700]="!msg.read">{{ msg.subject }}</h4>
                                     </div>
                                     <p class="text-[11px] text-slate-600 line-clamp-2 leading-relaxed mb-1.5">{{ msg.content }}</p>
                                     <p class="text-[9px] font-bold text-slate-400 uppercase">{{ msg.timestamp | date:'dd MMM HH:mm' }}</p>
                                 </div>
                             </div>
                         }
                     </div>
                 }
             </div>
        </div>
      </div>

      <!-- Maintenance & Security Section -->
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
         <div class="flex items-center justify-between mb-6">
            <div>
               <h3 class="text-lg font-bold text-slate-800 tracking-tight">Manutenzione e Sicurezza Dati</h3>
               <p class="text-xs text-slate-500">Gestisci i tuoi dati localmente per massima sicurezza</p>
            </div>
            <div class="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
               <i class="fa-solid fa-shield-halved"></i>
            </div>
         </div>

         <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Backup Card -->
            <div class="p-5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-md transition-all group">
               <div class="flex items-center gap-4 mb-4">
                  <div class="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110">
                     <i class="fa-solid fa-cloud-arrow-down"></i>
                  </div>
                  <div>
                     <h4 class="text-sm font-bold text-slate-800">Crea Backup Locale</h4>
                     @if (isBackupOverdue()) {
                        <p class="text-[10px] text-red-600 font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
                           <i class="fa-solid fa-clock"></i> Consigliato ora (Scaduto)
                        </p>
                     } @else {
                        <p class="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Altamente raccomandato</p>
                     }
                  </div>
               </div>
               <p class="text-xs text-slate-600 leading-relaxed mb-4">Scarica una copia completa di tutti i tuoi registri, prodotti e messaggi sul tuo computer. Utile per archiviazione personale o per lavorare offline.</p>
               
               <div class="bg-white/50 rounded-xl p-3 border border-slate-100 mb-6 flex items-center justify-between">
                  <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ultimo Backup</span>
                  <span [class]="'text-[10px] font-bold px-2 py-0.5 rounded-md ' + (isBackupOverdue() ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600')">
                     {{ lastBackupDate() ? (lastBackupDate() | date:'dd/MM/yyyy') : 'Mai eseguito' }}
                  </span>
               </div>

               <button (click)="exportData()" class="w-full py-3 bg-white border border-emerald-200 text-emerald-700 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-emerald-50 transition-all flex items-center justify-center gap-2">
                  <i class="fa-solid fa-download"></i> Scarica Archivio .json
               </button>
            </div>

            <!-- Restore Card -->
            <div class="p-5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-md transition-all group">
               <div class="flex items-center gap-4 mb-4">
                  <div class="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110">
                     <i class="fa-solid fa-clock-rotate-left"></i>
                  </div>
                  <div>
                     <h4 class="text-sm font-bold text-slate-800">Ripristina da Backup</h4>
                     <p class="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Procedura di emergenza</p>
                  </div>
               </div>
               <p class="text-xs text-slate-600 leading-relaxed mb-6">Recupera i dati da un file salvato in precedenza. Attenzione: questa operazione sovrascriverà i dati attuali con quelli del file selezionato.</p>
               <button (click)="fileInput.click()" class="w-full py-3 bg-white border border-blue-200 text-blue-700 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-blue-50 transition-all flex items-center justify-center gap-2">
                  <i class="fa-solid fa-upload"></i> Carica ed Esamina
               </button>
               <input #fileInput type="file" class="hidden" accept=".json" (change)="onFileSelected($event)">
            </div>
         </div>
      </div>

      <!-- Advanced Restore Confirmation Modal -->
      @if (showRestoreModal) {
         <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" (click)="closeModal()"></div>
            <div class="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative z-10 animate-scale-in border border-white/20">
               <!-- Modal Header with Pattern -->
               <div class="h-32 bg-gradient-to-br from-blue-600 to-indigo-800 relative flex items-center justify-center">
                  <div class="absolute inset-0 opacity-20 pointer-events-none" style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 24px 24px;"></div>
                  <div class="h-20 w-20 rounded-3xl bg-white shadow-xl flex items-center justify-center text-blue-600 text-3xl animate-bounce-slow">
                     <i class="fa-solid fa-triangle-exclamation"></i>
                  </div>
               </div>
               
               <div class="p-8 pt-10 text-center">
                  <h3 class="text-2xl font-black text-slate-800 tracking-tight mb-2">Conferma Ripristino?</h3>
                  <p class="text-sm text-slate-500 leading-relaxed mb-6">
                     Stai per sovrascrivere l'intero database locale con i dati del file: <br>
                     <span class="font-black text-blue-600 mt-2 block break-all bg-blue-50 py-2 px-4 rounded-xl border border-blue-100 text-xs">{{ pendingFileName }}</span>
                  </p>

                  <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8 text-left flex gap-4">
                     <div class="h-8 w-8 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <i class="fa-solid fa-lightbulb"></i>
                     </div>
                     <p class="text-[10px] text-amber-900 font-bold leading-relaxed">
                        IMPORTANTE: Questa azione non può essere annullata. Assicurati che il file sia corretto e recente. Per sicurezza, ti consigliamo di scaricare un backup dei dati attuali prima di procedere.
                     </p>
                  </div>

                  <div class="flex flex-col gap-3">
                     <button (click)="confirmRestore()" 
                             class="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-3">
                        <i class="fa-solid fa-check-double"></i> CONFERMA E RIPRISTINA
                     </button>
                     <button (click)="closeModal()" 
                             class="w-full py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[11px] uppercase tracking-[0.1em] hover:bg-slate-50 transition-all">
                        ANNULLA OPERAZIONE
                     </button>
                  </div>
               </div>
            </div>
         </div>
      }

      <!-- Success Notification Modal -->
      @if (showSuccessModal) {
         <div class="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-fade-in" (click)="showSuccessModal = false"></div>
            <div class="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl relative z-10 animate-scale-in border border-white/20">
               <div [class]="'h-24 relative flex items-center justify-center ' + successModalConfig.color">
                  <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 16px 16px;"></div>
                  <div class="h-16 w-16 rounded-2xl bg-white shadow-lg flex items-center justify-center text-2xl animate-bounce-slow">
                     <i [class]="'fa-solid ' + successModalConfig.icon"></i>
                  </div>
               </div>
               
               <div class="p-8 text-center">
                  <h3 class="text-xl font-black text-slate-800 tracking-tight mb-2">{{ successModalConfig.title }}</h3>
                  <p class="text-[11px] text-slate-500 leading-relaxed mb-6">{{ successModalConfig.message }}</p>

                  <button (click)="showSuccessModal = false" 
                          class="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-slate-200 transition-all active:scale-95">
                     CHIUDI E CONTINUA
                  </button>
               </div>
            </div>
         </div>
      }
    </div>
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .animate-scale-in {
      animation: scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.9) translateY(20px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .animate-bounce-slow {
      animation: bounceSlow 3s infinite;
    }
    @keyframes bounceSlow {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
  `]
})
export class OperatorDashboardViewComponent {
  state = inject(AppStateService);

  // Modal State for Restore
  showRestoreModal = false;
  showSuccessModal = false;
  successModalConfig = { title: '', message: '', icon: '', color: '' };
  pendingFileName = '';
  pendingData: any = null;
  lastBackupDate = signal<string | null>(localStorage.getItem('haccp_last_backup_date'));

  isBackupOverdue = computed(() => {
    const last = this.lastBackupDate();
    if (!last) return true;
    const diff = new Date().getTime() - new Date(last).getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return days >= 30;
  });

  daysSinceLastBackup = computed(() => {
    const last = this.lastBackupDate();
    if (!last) return null;
    const diff = new Date().getTime() - new Date(last).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  });

  isPhaseComplete = (moduleId: string): boolean => {
    const today = this.state.filterDate();
    const userId = this.state.currentUser()?.id;

    if (moduleId === 'production-log') {
      const prodRecords = this.state.productionRecords();
      return prodRecords.some(r => r.recordedDate === today && r.userId === userId);
    }

    const records = this.state.checklistRecords();
    return records.some(r => r.moduleId === moduleId && r.date === today && r.userId === userId);
  };

  completedPhasesCount = computed(() => {
    const phases = ['pre-op-checklist', 'operative-checklist', 'post-op-checklist', 'production-log'];
    return phases.filter(p => this.isPhaseComplete(p)).length;
  });

  lastRecordTime = computed(() => {
    const records = this.state.checklistRecords();
    const today = this.state.filterDate();
    const userId = this.state.currentUser()?.id;
    const userTodayRecords = records.filter(r => r.date === today && r.userId === userId);

    if (userTodayRecords.length === 0) return '--:--';

    const latest = userTodayRecords.reduce((prev, curr) =>
      new Date(curr.timestamp) > new Date(prev.timestamp) ? curr : prev
    );

    return new Date(latest.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  });

  getCurrentDay(): string {
    return new Date(this.state.filterDate()).toLocaleDateString('it-IT', { weekday: 'long' });
  }

  getCurrentMonth(): string {
    return new Date(this.state.filterDate()).toLocaleDateString('it-IT', { month: 'short' });
  }

  getCurrentDayNumber(): string {
    return new Date(this.state.filterDate()).toLocaleDateString('it-IT', { day: 'numeric' });
  }

  getCurrentDateFormatted(): string {
    return new Date(this.state.filterDate()).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  printDailyReport() {
    const currentUser = this.state.currentUser();
    if (!currentUser) return;

    const today = this.state.filterDate();
    const records = this.state.checklistRecords().filter(r => 
      r.userId === currentUser.id && r.date === today
    );

    const detailedChecks = records.map(r => {
      const module = this.state.menuItems.find(m => m.id === r.moduleId);
      return {
        moduleName: module?.label || r.moduleId,
        timestamp: r.timestamp,
        data: r.data
      };
    });

    const report = {
      userName: currentUser.name,
      department: currentUser.department || 'Staff Operativo',
      date: today,
      detailedChecks
    };

    const printContent = this.generatePrintHTML(report);
    const printWindow = window.open('', '_blank');

    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  }

  private generatePrintHTML(report: any): string {
    const dateStr = new Date(report.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Report Operatore - ${report.userName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 1.5cm; color: #1e293b; line-height: 1.5; }
          .header { border-bottom: 3px solid #0f172a; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
          .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .info-item { font-size: 13px; }
          .info-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 4px; }
          .info-value { font-weight: 700; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #475569; }
          td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 12px; color: #334155; }
          .status { font-weight: 800; color: #10b981; font-size: 10px; }
          .timestamp { font-family: monospace; font-weight: 600; color: #64748b; }
          @media print { body { padding: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 style="margin:0; font-size: 20px; font-weight: 900; letter-spacing: -0.02em; text-transform: uppercase;">Registro Verifiche Giornaliere</h1>
            <div style="font-size: 12px; color: #64748b; font-weight: 600; margin-top: 4px;">HACCP PRO Compliance System</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 16px; font-weight: 900; color: #0f172a;">${dateStr}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Operatore Responsabile</div>
            <div class="info-value">${report.userName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Unità Operativa / Reparto</div>
            <div class="info-value">${report.department}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 100px;">Orario</th>
              <th>Modulo di Controllo</th>
              <th style="width: 120px;">Esito</th>
            </tr>
          </thead>
          <tbody>
            ${report.detailedChecks.length > 0 ? report.detailedChecks.map((c: any) => `
              <tr>
                <td class="timestamp">${new Date(c.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</td>
                <td style="font-weight: 600;">${c.moduleName}</td>
                <td><span class="status">✓ CONFORME</span></td>
              </tr>
            `).join('') : '<tr><td colspan="3" style="text-align:center; padding: 40px; color: #94a3b8; font-weight: 600;">Nessuna verifica registrata nella data odierna.</td></tr>'}
          </tbody>
        </table>

        <div style="margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div style="width: 250px;">
                <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 30px;">Firma del Responsabile</div>
                <div style="border-bottom: 1px solid #0f172a;"></div>
            </div>
            <div style="width: 250px; text-align: right;">
                <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 30px;">Firma dell'Operatore</div>
                <div style="border-bottom: 1px solid #0f172a;"></div>
            </div>
        </div>

        <div class="footer">
          Documento generato digitalmente da HACCP PRO Traceability System — Copia conforme all'originale informatico.
        </div>
      </body>
      </html>
    `;
  }

  // --- Backup & Restore Logic ---

  exportData() {
    const today = new Date().toISOString().split('T')[0];
    const data = {
      backupDate: new Date().toISOString(),
      version: '1.0',
      user: this.state.currentUser()?.name,
      clientId: this.state.currentUser()?.clientId,
      // Core state modules
      checklistRecords: this.state.checklistRecords(),
      productionRecords: this.state.productionRecords(),
      messages: this.state.messages(),
      documents: this.state.documents(),
      nonConformities: this.state.nonConformities(),
      recipes: this.state.recipes(),
      selectedEquipment: this.state.selectedEquipment(),
      baseIngredients: this.state.baseIngredients(),
      accounting: {
        payments: this.state.payments(),
        journalEntries: this.state.journalEntries(),
        reminders: this.state.reminders()
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HACCP_PRO_BACKUP_${this.state.currentUser()?.name?.replace(/\s/g, '_')}_${today}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    // Update last backup date
    const now = new Date().toISOString();
    this.lastBackupDate.set(now);
    localStorage.setItem('haccp_last_backup_date', now);

    this.successModalConfig = {
      title: 'Backup Creato!',
      message: 'Il file è stato scaricato correttamente nella tua cartella Download. Conservalo con cura.',
      icon: 'fa-cloud-arrow-down',
      color: 'bg-gradient-to-br from-emerald-500 to-teal-700'
    };
    this.showSuccessModal = true;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.pendingFileName = file.name;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        this.pendingData = JSON.parse(e.target.result);
        if (!this.pendingData.backupDate || !this.pendingData.checklistRecords) {
          throw new Error('Formato file non valido');
        }
        this.showRestoreModal = true;
      } catch (err) {
        this.successModalConfig = {
          title: 'Errore File',
          message: 'Il file selezionato non è un backup valido di HACCP Pro.',
          icon: 'fa-file-circle-xmark',
          color: 'bg-gradient-to-br from-red-500 to-rose-700'
        };
        this.showSuccessModal = true;
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  confirmRestore() {
    if (!this.pendingData) return;

    try {
      const s = this.state;
      
      if (this.pendingData.checklistRecords) s.checklistRecords.set(this.pendingData.checklistRecords);
      if (this.pendingData.productionRecords) s.productionRecords.set(this.pendingData.productionRecords);
      if (this.pendingData.messages) s.messages.set(this.pendingData.messages);
      if (this.pendingData.documents) s.documents.set(this.pendingData.documents);
      if (this.pendingData.nonConformities) s.nonConformities.set(this.pendingData.nonConformities);
      if (this.pendingData.recipes) s.recipes.set(this.pendingData.recipes);
      if (this.pendingData.selectedEquipment) s.selectedEquipment.set(this.pendingData.selectedEquipment);
      if (this.pendingData.baseIngredients) {
        s.baseIngredients.set(this.pendingData.baseIngredients);
        localStorage.setItem('haccp_base_ingredients', JSON.stringify(this.pendingData.baseIngredients));
      }
      
      if (this.pendingData.accounting) {
        if (this.pendingData.accounting.payments) s.payments.set(this.pendingData.accounting.payments);
        if (this.pendingData.accounting.journalEntries) s.journalEntries.set(this.pendingData.accounting.journalEntries);
        if (this.pendingData.accounting.reminders) s.reminders.set(this.pendingData.accounting.reminders);
      }

      this.closeModal();
      this.successModalConfig = {
        title: 'Dati Ripristinati!',
        message: 'Il database locale è stato aggiornato con successo con le informazioni del backup.',
        icon: 'fa-check-double',
        color: 'bg-gradient-to-br from-blue-600 to-indigo-800'
      };
      this.showSuccessModal = true;
    } catch (err) {
      this.successModalConfig = {
        title: 'Errore Ripristino',
        message: 'Si è verificato un errore durante il ripristino dei dati. Verifica l\'integrità del file.',
        icon: 'fa-circle-exclamation',
        color: 'bg-gradient-to-br from-orange-500 to-red-600'
      };
      this.showSuccessModal = true;
      console.error(err);
    }
  }

  closeModal() {
    this.showRestoreModal = false;
    this.pendingData = null;
    this.pendingFileName = '';
  }
}
