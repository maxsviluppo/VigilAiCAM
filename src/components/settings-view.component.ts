
import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AppStateService, ClientEntity } from '../services/app-state.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-settings-view',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- Admin View: System & Master Company Settings -->
      @if (state.isAdmin()) {
        <!-- Enhanced Settings Header (Admin) -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden mb-6">
          <div class="absolute left-0 top-0 h-full w-1/3 bg-gradient-to-r from-cyan-50 to-transparent pointer-events-none"></div>
          
          <div class="relative z-10 flex items-center gap-5">
             <div class="h-14 w-14 rounded-xl bg-white border border-cyan-100 flex items-center justify-center shadow-sm text-cyan-600 shrink-0">
                <i class="fa-solid fa-gears text-2xl"></i>
             </div>
             <div>
                <h2 class="text-2xl font-bold text-slate-800 tracking-tight">Configurazione Sistema</h2>
                <p class="text-xs font-semibold text-slate-500 mt-1">Gestione parametri globali e reportistica</p>
             </div>
          </div>
  
          <div class="w-full md:w-auto mt-4 md:mt-0 relative z-10 flex flex-col sm:flex-row gap-4 items-center bg-slate-50 rounded-xl p-4 md:p-2 border border-slate-200">
             <div class="flex items-center gap-3 w-full justify-between sm:justify-start px-2">
                 <div>
                    <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-0.5">Email Reportistica</span>
                    <span class="text-xs font-bold text-slate-700">{{ state.reportRecipientEmail() || 'Non configurata' }}</span>
                 </div>
                 <i class="fa-solid fa-envelope-circle-check text-cyan-400 text-lg mr-2"></i>
             </div>
             
             <div class="flex gap-2 w-full sm:w-auto relative">
                 <input type="email" #newEmail [value]="state.reportRecipientEmail()"
                         class="bg-white text-slate-800 border border-slate-200 rounded text-base px-3 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 w-full sm:min-w-[200px]"
                         placeholder="email@esempio.it">
                 <button (click)="state.setReportRecipientEmail(newEmail.value)"
                         class="px-4 py-2 bg-white border border-slate-200 hover:bg-cyan-50 text-cyan-600 rounded text-[11px] font-bold transition-colors shadow-sm whitespace-nowrap">
                     Salva
                 </button>
             </div>
          </div>
        </div>

        <!-- Master Company Anagraphic -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
            <div class="flex items-center gap-4">
              <!-- Admin Logo Preview/Upload -->
              <div class="relative group shrink-0">
                <div class="w-14 h-14 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                  @if (state.adminCompany().logo) {
                    <img [src]="state.adminCompany().logo" class="w-full h-full object-contain p-1.5">
                  } @else {
                    <i class="fa-solid fa-building-user text-slate-300 text-xl"></i>
                  }
                </div>
                @if (isEditingAdmin()) {
                  <label class="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-indigo-600 text-white rounded flex items-center justify-center cursor-pointer shadow-sm hover:bg-indigo-700 transition-colors border border-white">
                    <i class="fa-solid fa-camera text-[10px]"></i>
                    <input type="file" (change)="onLogoChange($event, 'ADMIN')" class="hidden" accept="image/*">
                  </label>
                }
              </div>
              <div>
                <h2 class="text-base font-black text-slate-800 flex items-center">
                    {{ state.adminCompany().name }}
                </h2>
                <p class="text-slate-500 text-[11px] font-bold mt-0.5">Gestisci i dati della sede centrale e il logo globale</p>
              </div>
            </div>
            
            <div class="shrink-0 flex gap-2">
                @if (!isEditingAdmin()) {
                  <button (click)="startEditingAdmin()" class="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5">
                    <i class="fa-solid fa-pen-to-square"></i> Modifica
                  </button>
                } @else {
                  <button (click)="cancelEditingAdmin()" class="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded text-xs font-bold transition-colors shadow-sm">
                    Annulla
                  </button>
                  <button (click)="saveAdminData()" class="px-3 py-1.5 bg-indigo-600 border border-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5">
                    <i class="fa-solid fa-save"></i> Salva
                  </button>
                }
            </div>
          </div>

          <div class="p-6">
            <form [formGroup]="adminForm" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <div class="space-y-1.5 lg:col-span-1">
                <label class="text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Ragione Sociale</label>
                @if (isEditingAdmin()) {
                  <input type="text" formControlName="name" class="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded text-base focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-slate-800 transition-colors">
                } @else {
                  <p class="text-sm font-bold text-slate-800 bg-slate-50 border border-transparent px-3 py-2 rounded">{{ state.adminCompany().name || '-' }}</p>
                }
              </div>
              
              <div class="space-y-1.5">
                <label class="text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Partita IVA</label>
                @if (isEditingAdmin()) {
                  <input type="text" formControlName="piva" class="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded text-base focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-slate-800 transition-colors font-mono uppercase">
                } @else {
                  <p class="text-sm font-bold text-slate-800 bg-slate-50 border border-transparent px-3 py-2 rounded font-mono">{{ state.adminCompany().piva || '-' }}</p>
                }
              </div>

              <div class="space-y-1.5">
                <label class="text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Indirizzo Sede Centrale</label>
                @if (isEditingAdmin()) {
                  <input type="text" formControlName="address" class="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded text-base focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-slate-800 transition-colors">
                } @else {
                  <p class="text-sm font-bold text-slate-800 bg-slate-50 border border-transparent px-3 py-2 rounded">{{ state.adminCompany().address || '-' }}</p>
                }
              </div>

              <div class="space-y-1.5">
                <label class="text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Email Amministrativa</label>
                @if (isEditingAdmin()) {
                  <input type="email" formControlName="email" class="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded text-base focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-slate-800 transition-colors lowercase">
                } @else {
                  <p class="text-sm font-bold text-slate-800 bg-slate-50 border border-transparent px-3 py-2 rounded">{{ state.adminCompany().email || '-' }}</p>
                }
              </div>
              
              <div class="space-y-1.5">
                <label class="text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">PEC</label>
                @if (isEditingAdmin()) {
                  <input type="email" formControlName="pec" class="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded text-base focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-slate-800 transition-colors lowercase">
                } @else {
                  <p class="text-sm font-bold text-indigo-600 bg-indigo-50/50 border border-transparent px-3 py-2 rounded">{{ state.adminCompany().pec || '-' }}</p>
                }
              </div>

              <div class="space-y-1.5">
                <label class="text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Codice Univoco (SDI)</label>
                @if (isEditingAdmin()) {
                  <input type="text" formControlName="sdi" class="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded text-base focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-slate-800 transition-colors uppercase font-mono">
                } @else {
                  <p class="text-sm font-bold text-slate-800 font-mono tracking-widest bg-slate-50 border border-transparent px-3 py-2 rounded">{{ state.adminCompany().sdi || '-' }}</p>
                }
              </div>

              <div class="space-y-1.5">
                <label class="text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Telefono Fisso</label>
                @if (isEditingAdmin()) {
                  <input type="text" formControlName="phone" class="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded text-base focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-slate-800 transition-colors">
                } @else {
                  <p class="text-sm font-bold text-slate-800 bg-slate-50 border border-transparent px-3 py-2 rounded">{{ state.adminCompany().phone || '-' }}</p>
                }
              </div>

              <div class="space-y-1.5">
                <label class="text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Cellulare</label>
                @if (isEditingAdmin()) {
                  <input type="text" formControlName="cellphone" class="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded text-base focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-slate-800 transition-colors">
                } @else {
                  <p class="text-sm font-bold text-slate-800 bg-slate-50 border border-transparent px-3 py-2 rounded">{{ state.adminCompany().cellphone || '-' }}</p>
                }
              </div>

              <div class="space-y-1.5">
                <label class="text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">WhatsApp</label>
                @if (isEditingAdmin()) {
                  <input type="text" formControlName="whatsapp" class="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded text-base focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-slate-800 transition-colors">
                } @else {
                  <p class="text-sm font-bold text-emerald-600 flex items-center gap-2 bg-emerald-50 border border-transparent px-3 py-2 rounded">
                    <i class="fa-brands fa-whatsapp"></i> {{ state.adminCompany().whatsapp || '-' }}
                  </p>
                }
              </div>

              <div class="space-y-1.5 lg:col-span-1">
                <label class="text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Nr. Licenza Master</label>
                @if (isEditingAdmin()) {
                  <input type="text" formControlName="licenseNumber" class="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded text-base focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-slate-800 transition-colors uppercase font-mono">
                } @else {
                  <p class="text-sm font-bold text-slate-800 bg-slate-50 border border-transparent px-3 py-2 rounded font-mono">{{ state.adminCompany().licenseNumber || '-' }}</p>
                }
              </div>
            </form>
          </div>
        </div>

        <!-- ==================== GEMINI AI PANEL ==================== -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <!-- Panel Header -->
          <div class="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-indigo-50/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl bg-white border border-violet-100 flex items-center justify-center shadow-sm shrink-0">
                <i class="fa-solid fa-robot text-violet-600 text-xl"></i>
              </div>
              <div>
                <h3 class="text-base font-black text-slate-800">Intelligenza Artificiale – Gemini</h3>
                <p class="text-[11px] font-bold text-slate-500 mt-0.5">Configurazione chiave API per OCR documenti e automazione</p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border"
                    [class]="geminiApiKey() ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'">
                <i class="fa-solid mr-1" [class]="geminiApiKey() ? 'fa-circle-check' : 'fa-circle-exclamation'"></i>
                {{ geminiApiKey() ? 'API Configurata' : 'Non Configurata' }}
              </span>
            </div>
          </div>

          <div class="p-6 space-y-6">

            <!-- Model Info Row -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Modello Attivo</p>
                <div class="flex items-center gap-2 bg-violet-50 border border-violet-100 p-3 rounded-xl text-violet-700 font-bold text-xs">
                  <i class="fa-solid fa-robot"></i>
                  <span>Gemini 2.0 Flash (Consigliato & Gratuito)</span>
                </div>
                <div class="mt-3 space-y-1">
                  <p class="text-[9px] text-slate-500 font-bold leading-tight"><span class="text-emerald-600">Tariffa Free:</span> Gratuito fino a 15 RPM.</p>
                  <p class="text-[9px] text-slate-500 font-bold leading-tight"><span class="text-amber-600">Sync:</span> Configurazione salvata in Cloud per tutti i tuoi dispositivi.</p>
                </div>
              </div>
              <div class="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between">
                <div>
                  <p class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Statistiche Utilizzo ({{ state.aiConfig()?.model || 'N/A' }})</p>
                  <div class="space-y-3 mt-2">
                    <div class="flex justify-between items-end">
                      <span class="text-[10px] font-bold text-slate-500">Chiamate Totali</span>
                      <span class="text-xl font-black text-slate-800">{{ state.aiConfig()?.stats?.[state.aiConfig()?.model]?.count || 0 }}</span>
                    </div>
                    <div class="flex justify-between items-end">
                      <span class="text-[10px] font-bold text-slate-500">Costo Stimato</span>
                      <span class="text-xl font-black text-emerald-600">{{ (state.aiConfig()?.stats?.[state.aiConfig()?.model]?.estimatedCost || 0) | currency:'USD' }}</span>
                    </div>
                  </div>
                </div>
                <button (click)="resetGeminiStats()" class="mt-4 text-[9px] font-black uppercase text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors">
                  <i class="fa-solid fa-rotate-left"></i> Reset Statistiche
                </button>
              </div>
              <div class="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Costo Stimato</p>
                <p class="text-2xl font-black text-emerald-600">~€{{ (geminiCallCount() * 0.00025).toFixed(4) }}</p>
                <p class="text-[10px] text-slate-400 font-bold mt-1">€0.00025 per chiamata</p>
              </div>
            </div>

            <!-- API Key Input -->
            <div class="space-y-2">
              <label class="text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Chiave API Gemini</label>
              <div class="flex gap-3">
                <div class="relative flex-1">
                  <i class="fa-solid fa-key absolute left-3 top-1/2 -translate-y-1/2 text-violet-400 text-sm"></i>
                  <input 
                    [type]="showApiKey() ? 'text' : 'password'"
                    [(ngModel)]="geminiApiKeyInput"
                    placeholder="AIza..."
                    class="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all"
                  >
                  <button (click)="showApiKey.set(!showApiKey())" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    <i class="fa-solid text-sm" [class]="showApiKey() ? 'fa-eye-slash' : 'fa-eye'"></i>
                  </button>
                </div>
                <button (click)="saveGeminiApiKey()" class="px-5 py-3 bg-violet-600 hover:bg-violet-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-2 shrink-0">
                  <i class="fa-solid fa-save"></i> Salva
                </button>
                <button (click)="testAiConnection()" [disabled]="!geminiApiKey() || isTestingAi()"
                        class="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-2 shrink-0">
                  @if (isTestingAi()) {
                    <i class="fa-solid fa-spinner fa-spin"></i>
                  } @else {
                    <i class="fa-solid fa-vial"></i> Testa Connessione
                  }
                </button>
                @if (geminiApiKey()) {
                  <button (click)="clearGeminiApiKey()" class="px-4 py-3 bg-white border border-red-200 hover:bg-red-50 text-red-600 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm shrink-0">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                }
              </div>
              <p class="text-[10px] text-slate-400 font-bold pl-1">La chiave viene salvata localmente nel browser. Non viene mai inviata a terzi.</p>
            </div>

            <!-- Info + Link Box -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-violet-50 rounded-xl p-5 border border-violet-100">
                <h4 class="text-xs font-black text-violet-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <i class="fa-solid fa-circle-info text-violet-500"></i> Come ottenere la chiave API
                </h4>
                <ol class="space-y-2">
                  <li class="flex items-start gap-2 text-[11px] text-violet-700 font-bold">
                    <span class="w-5 h-5 rounded-full bg-violet-600 text-white text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
                    Accedi a Google AI Studio con il tuo account Google
                  </li>
                  <li class="flex items-start gap-2 text-[11px] text-violet-700 font-bold">
                    <span class="w-5 h-5 rounded-full bg-violet-600 text-white text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
                    Clicca su <strong>"Get API Key"</strong> → <strong>"Create API Key"</strong>
                  </li>
                  <li class="flex items-start gap-2 text-[11px] text-violet-700 font-bold">
                    <span class="w-5 h-5 rounded-full bg-violet-600 text-white text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">3</span>
                    Copia la chiave generata e incollala nel campo sopra
                  </li>
                </ol>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
                   class="mt-4 w-full py-3 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition-all shadow-md">
                  <i class="fa-solid fa-external-link-alt"></i>
                  Apri Google AI Studio
                </a>
              </div>

              <div class="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-3">
                <h4 class="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <i class="fa-solid fa-chart-bar text-slate-500"></i> Limiti & Costi
                </h4>
                <div class="space-y-2">
                  <div class="flex justify-between items-center text-[11px] font-bold">
                    <span class="text-slate-500">Piano gratuito (Free Tier)</span>
                    <span class="text-emerald-600">15 richieste/min</span>
                  </div>
                  <div class="flex justify-between items-center text-[11px] font-bold">
                    <span class="text-slate-500">Costo per foto DDT</span>
                    <span class="text-slate-700">~€0.00025</span>
                  </div>
                  <div class="flex justify-between items-center text-[11px] font-bold">
                    <span class="text-slate-500">1.000 foto/mese</span>
                    <span class="text-slate-700">~€0.25</span>
                  </div>
                  <div class="h-px bg-slate-200 my-1"></div>
                  <div class="flex justify-between items-center text-[11px] font-bold">
                    <span class="text-slate-500">Modello consigliato</span>
                    <span class="text-violet-600 font-mono">gemini-2.0-flash</span>
                  </div>
                </div>
                <a href="https://ai.google.dev/pricing" target="_blank" rel="noopener noreferrer"
                   class="mt-2 text-[10px] text-blue-600 font-black hover:underline flex items-center gap-1">
                  <i class="fa-solid fa-external-link-alt text-[9px]"></i> Vedi prezzi ufficiali Google AI
                </a>
              </div>
            </div>

          </div>
        </div>
        <!-- ========================================================= -->

      } @else {
        <!-- Collaborator View: Remains Read-Only Summary of THEIR company, with EDIT possibility -->
        <div class="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div class="flex items-center gap-4">
              <!-- Operator Logo Preview/Upload -->
              <div class="relative group shrink-0">
                <div class="w-14 h-14 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                  @if (state.companyConfig().logo) {
                    <img [src]="state.companyConfig().logo" class="w-full h-full object-contain p-1.5">
                  } @else {
                    <div class="w-full h-full bg-slate-50 text-slate-400 flex items-center justify-center text-xl font-bold">
                       {{ state.companyConfig().name.substring(0,1) }}
                    </div>
                  }
                </div>
                @if (isEditingOperator()) {
                  <label class="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-indigo-600 text-white rounded flex items-center justify-center cursor-pointer shadow-sm hover:bg-indigo-700 transition-colors border border-white">
                    <i class="fa-solid fa-camera text-[10px]"></i>
                    <input type="file" (change)="onLogoChange($event, 'OPERATOR')" class="hidden" accept="image/*">
                  </label>
                }
              </div>
              <div>
                <h2 class="text-base font-black text-slate-800">Profilo Aziendale Operativo</h2>
                <p class="text-[11px] font-bold text-slate-500 mt-0.5">Gestisci recapiti e immagine della tua unità</p>
              </div>
            </div>
            
            <div class="flex gap-2">
              @if (!isEditingOperator()) {
                <button (click)="startEditingOperator()" class="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5">
                  <i class="fa-solid fa-pen-to-square"></i> Modifica
                </button>
              } @else {
                <button (click)="cancelEditingOperator()" class="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded text-xs font-bold transition-colors shadow-sm">
                  Annulla
                </button>
                <button (click)="saveOperatorData()" 
                        [disabled]="operatorForm.invalid"
                        class="px-4 py-2 bg-indigo-600 border border-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-black transition-all shadow-md flex items-center gap-2">
                  <i class="fa-solid fa-save text-[11px]"></i> Salva Modifiche
                </button>
              }
            </div>
          </div>
          <div class="p-6">
             <div class="mb-8">
                <h1 class="text-xl font-black text-slate-800 leading-tight mb-2">{{ state.companyConfig().name }}</h1>
                <div class="flex items-center gap-2">
                  <span class="text-[9px] font-black uppercase text-slate-500 px-2.5 py-1 bg-slate-50 rounded border border-slate-200 tracking-widest"><span class="text-slate-400 mr-1">P.IVA</span>{{ state.companyConfig().piva }}</span>
                  <span class="text-[9px] font-black uppercase text-indigo-600 px-2.5 py-1 bg-indigo-50/50 rounded border border-indigo-100 tracking-widest"><span class="text-indigo-400 mr-1">LIC.</span>{{ state.companyConfig().licenseNumber }}</span>
                </div>
             </div>
             
             <form [formGroup]="operatorForm" class="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div class="space-y-1.5">
                 <label class="text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Sede Operativa (Indirizzo)</label>
                 @if (isEditingOperator()) {
                   <input type="text" formControlName="address" class="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded text-base focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-slate-800 transition-colors" placeholder="Indirizzo">
                 } @else {
                   <p class="text-sm font-bold text-slate-800 bg-slate-50 border border-transparent px-3 py-2 rounded truncate">{{ state.companyConfig().address || 'Non specificato' }}</p>
                 }
               </div>

               <div class="space-y-1.5">
                 <label class="text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Email di Contatto</label>
                 @if (isEditingOperator()) {
                   <input type="email" formControlName="email" class="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded text-base focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-slate-800 transition-colors lowercase" placeholder="Email">
                 } @else {
                   <p class="text-sm font-bold text-slate-800 bg-slate-50 border border-transparent px-3 py-2 rounded truncate">{{ state.companyConfig().email || 'Non specificato' }}</p>
                 }
               </div>

               <div class="space-y-1.5">
                 <label class="text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Indirizzo PEC</label>
                 @if (isEditingOperator()) {
                   <input type="email" formControlName="pec" class="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded text-base focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-slate-800 transition-colors lowercase" placeholder="pec@esempio.it">
                 } @else {
                   <p class="text-sm font-bold text-indigo-600 bg-indigo-50 border border-transparent px-3 py-2 rounded truncate">{{ state.companyConfig().pec || 'Non specificato' }}</p>
                 }
               </div>

               <div class="space-y-1.5">
                 <label class="text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Telefono Fisso</label>
                 @if (isEditingOperator()) {
                   <input type="text" formControlName="phone" class="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded text-base focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-slate-800 transition-colors" placeholder="Prefisso e numero">
                 } @else {
                   <p class="text-sm font-bold text-slate-800 bg-slate-50 border border-transparent px-3 py-2 rounded">{{ state.companyConfig().phone || 'Non specificato' }}</p>
                 }
               </div>

               <div class="space-y-1.5">
                 <label class="text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Cellulare / Mobile</label>
                 @if (isEditingOperator()) {
                   <input type="text" formControlName="cellphone" class="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded text-base focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-slate-800 transition-colors" placeholder="Cellulare">
                 } @else {
                   <p class="text-sm font-bold text-slate-800 bg-slate-50 border border-transparent px-3 py-2 rounded">{{ state.companyConfig().cellphone || '-' }}</p>
                 }
               </div>

               <div class="space-y-1.5">
                 <label class="text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">WhatsApp Business</label>
                 @if (isEditingOperator()) {
                   <input type="text" formControlName="whatsapp" class="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-200 rounded text-base focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold text-slate-800 transition-colors" placeholder="WhatsApp">
                 } @else {
                   <p class="text-sm font-bold text-emerald-600 flex items-center gap-2 bg-emerald-50 border border-transparent px-3 py-2 rounded">
                     <i class="fa-brands fa-whatsapp text-lg"></i> {{ state.companyConfig().whatsapp || '-' }}
                   </p>
                 }
               </div>

             </form>
                          <div class="mt-8 p-4 bg-indigo-50/50 rounded-lg border border-indigo-100 flex items-start gap-3">
                <i class="fa-solid fa-circle-info mt-0.5 text-indigo-400"></i>
                <div>
                   <h4 class="text-xs font-black text-indigo-800 uppercase tracking-wider mb-1">Nota Informativa</h4>
                   <p class="text-[11px] font-bold text-indigo-600/80 leading-relaxed">Inserisci anche il logo aziendale se desiderato tramite l'icona di caricamento sull'immagine di sinistra.</p>
                </div>
              </div>
            </div>
          </div>
        }

    </div>
  `,
  styles: [`
    :host { display: block; }
    .animate-fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class SettingsViewComponent {
  state = inject(AppStateService);
  fb = inject(FormBuilder);
  toast = inject(ToastService);

  isEditingAdmin = signal(false);
  isEditingOperator = signal(false);

  showApiKey = signal(false);
  geminiApiKeyInput = '';
  geminiCallCount = signal(0);

  geminiApiKey = computed(() => this.state.aiConfig()?.apiKey || '');

  saveGeminiApiKey() {
    this.saveGeminiConfig();
  }

  clearGeminiApiKey() {
    const current = this.state.aiConfig() || { model: 'gemini-2.0-flash', stats: {} };
    this.state.saveAiConfig({ ...current, apiKey: '', model: 'gemini-2.0-flash' });
    this.geminiApiKeyInput = '';
    this.toast.info('Configurazione Rimossa', 'La chiave API è stata rimossa dal database.');
  }

  saveGeminiConfig() {
    const key = this.geminiApiKeyInput.trim();
    if (key.length < 10) {
      this.toast.error('Chiave non valida', 'La chiave API Gemini inserita sembra troppo corta.');
      return;
    }
    const current = this.state.aiConfig() || { model: 'gemini-2.0-flash', stats: {} };
    this.state.saveAiConfig({
      ...current,
      apiKey: key,
      model: 'gemini-2.0-flash'
    });
    this.toast.success('Configurazione salvata', 'La chiave è stata cifrata e salvata nel database globale.');
  }

  setGeminiModel(model: string) {
    const current = this.state.aiConfig() || { apiKey: '', stats: {} };
    this.state.saveAiConfig({ ...current, model: 'gemini-2.0-flash' });
    this.toast.success('Modello Impostato', `Modello forzato a gemini-2.0-flash`);
  }

  resetGeminiStats() {
    const current = this.state.aiConfig() || { apiKey: '', model: 'gemini-2.0-flash' };
    this.state.saveAiConfig({ ...current, stats: {} });
    this.toast.info('Statistiche Resettate', 'Le statistiche di utilizzo sono state azzerate nel database.');
  }
  isTestingAi = signal(false);

  async testAiConnection() {
    const config = this.state.aiConfig();
    const key = config?.apiKey;
    const model = config?.model || 'gemini-2.0-flash';
    if (!key) return;

    this.isTestingAi.set(true);
    try {
      const body = {
        contents: [{ parts: [{ text: 'Rispondi solo con la parola "OK" se mi ricevi.' }] }]
      };
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        this.toast.success('Test Superato', 'La connessione con l\'AI è attiva e funzionante!');
      } else {
        const err = await res.json();
        const msg = err.error?.message || 'Errore ignoto';
        if (res.status === 429) {
          this.toast.error('Limite Superato', 'Il tuo account Google ha raggiunto il limite di frequenza. Attendi o cambia chiave.');
        } else {
          this.toast.error('Test Fallito', msg);
        }
      }
    } catch (e) {
      this.toast.error('Errore Connessione', 'Impossibile raggiungere i server Google.');
    } finally {
      this.isTestingAi.set(false);
    }
  }

  resetGeminiCounters() {
    sessionStorage.setItem('haccp_gemini_calls', '0');
    this.geminiCallCount.set(0);
    this.toast.info('Contatore Azzerato', 'Il conteggio delle chiamate AI per questa sessione è stato resettato.');
  }
  // --- End Gemini AI Config ---

  adminForm: FormGroup;
  operatorForm: FormGroup;

  get currentLabelFormat() {
    return this.state.isAdmin() ? 
           this.adminForm.get('labelFormat')?.value : 
           this.operatorForm.get('labelFormat')?.value;
  }

  constructor() {
    this.adminForm = this.fb.group({
      name: ['', Validators.required],
      piva: ['', Validators.required],
      address: ['', Validators.required],
      phone: [''],
      cellphone: [''],
      whatsapp: [''],
      email: ['', [Validators.required, Validators.email]],
      pec: ['', [Validators.required, Validators.email]],
      sdi: ['', [Validators.required, Validators.minLength(7)]],
      licenseNumber: [''],
      logo: [''],
      labelFormat: ['62mm']
    });

    this.operatorForm = this.fb.group({
      address: [''],
      phone: [''],
      cellphone: [''],
      whatsapp: [''],
      email: ['', [Validators.email]],
      pec: ['', [Validators.email]],
      logo: [''],
      labelFormat: ['62mm']
    });

    // Reactive sync for the AI Key input
    effect(() => {
      const config = this.state.aiConfig();
      if (config?.apiKey && !this.geminiApiKeyInput) {
        this.geminiApiKeyInput = config.apiKey;
      }
    });

    // Reactive sync for forms when data arrives from DB
    effect(() => {
      const adminData = this.state.adminCompany();
      if (!this.isEditingAdmin() && adminData) {
        this.adminForm.patchValue(adminData, { emitEvent: false });
      }
    });

    effect(() => {
      const operatorData = this.state.companyConfig();
      if (!this.isEditingOperator() && operatorData) {
        this.operatorForm.patchValue({
          address: operatorData.address,
          phone: operatorData.phone,
          cellphone: operatorData.cellphone || '',
          whatsapp: operatorData.whatsapp || '',
          email: operatorData.email,
          pec: operatorData.pec || '',
          logo: operatorData.logo || '',
          labelFormat: operatorData.labelFormat || '62mm'
        }, { emitEvent: false });
      }
    });
  }

  setLabelFormat(format: '62mm' | '30mm') {
    if (this.state.isAdmin()) {
      this.adminForm.patchValue({ labelFormat: format });
    } else {
      this.operatorForm.patchValue({ labelFormat: format });
    }
  }

  saveHardwareConfig() {
    if (this.state.isAdmin()) {
      this.state.updateAdminCompany(this.adminForm.value);
    } else {
      this.state.updateCurrentCompany(this.operatorForm.value);
    }
  }

  // Logo Handling
  onLogoChange(event: any, role: 'ADMIN' | 'OPERATOR') {
    const file = event.target.files[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        this.toast.error('Logo troppo grande', 'L\'immagine del logo supera i 10MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const logoData = e.target.result;
        if (role === 'ADMIN') {
          this.adminForm.patchValue({ logo: logoData });
        } else {
          this.operatorForm.patchValue({ logo: logoData });
        }
      };
      reader.readAsDataURL(file);
    }
  }

  // Admin Methods
  startEditingAdmin() {
    this.adminForm.patchValue(this.state.adminCompany());
    this.isEditingAdmin.set(true);
  }

  cancelEditingAdmin() {
    this.isEditingAdmin.set(false);
  }

  saveAdminData() {
    if (this.adminForm.valid) {
      this.state.updateAdminCompany(this.adminForm.value);
      this.isEditingAdmin.set(false);
    }
  }

  // Operator Methods
  startEditingOperator() {
    const config = this.state.companyConfig();
    this.operatorForm.patchValue({
      address: config.address,
      phone: config.phone,
      cellphone: config.cellphone || '',
      whatsapp: config.whatsapp || '',
      email: config.email,
      pec: config.pec || '',
      logo: config.logo || '',
      labelFormat: config.labelFormat || '62mm'
    });
    this.isEditingOperator.set(true);
  }

  cancelEditingOperator() {
    this.isEditingOperator.set(false);
  }

  saveOperatorData() {
    if (this.operatorForm.valid) {
      this.state.updateCurrentCompany(this.operatorForm.value);
      this.isEditingOperator.set(false);
    }
  }
}
