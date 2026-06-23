
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AppStateService, SystemUser, ClientEntity } from '../services/app-state.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-collaborators-view',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6 max-w-7xl mx-auto p-4 pb-12">
      
      <!-- Sleek Professional Header -->
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden mb-6">
        <div class="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none"></div>
        
        <div class="relative z-10 flex items-center gap-5">
           <div class="h-14 w-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm text-indigo-600 shrink-0 relative">
              <i class="fa-solid fa-sitemap text-2xl"></i>
           </div>
           <div>
              <h2 class="text-2xl font-bold text-slate-800 tracking-tight">Struttura Organizzativa</h2>
              <p class="text-xs font-semibold text-slate-500 mt-1">Gestione Aziende e Personale Operativo</p>
           </div>
        </div>
        
        <div class="flex gap-3 w-full md:w-auto relative z-10 justify-end">
            <button (click)="openClientModal()" class="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center text-sm group">
                <i class="fa-solid fa-plus mr-3 text-indigo-200 group-hover:rotate-90 transition-transform"></i> Nuova Azienda
            </button>
        </div>
      </div>

      <!-- Accordion List - Companies -->
      <div class="space-y-3">
        @for (client of state.clients(); track client.id) {
          @let isOpen = isClientExpanded(client.id);
          @let users = getUsersByClient(client.id);

          <div class="bg-white rounded-xl shadow-sm border transition-all duration-300"
               [class.border-indigo-300]="isOpen && !client.suspended" [class.border-slate-200]="!isOpen && !client.suspended"
               [class.border-red-300]="client.suspended" [class.bg-red-50/20]="client.suspended">
            
            <!-- Company Header (Clickable for Accordion) -->
            <div class="p-4 md:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                 (click)="toggleClient(client.id)">
               
               <div class="flex items-center gap-4 w-full md:w-auto flex-1">
                   <!-- Icon Box -->
                   <div class="w-10 h-10 rounded border flex items-center justify-center text-slate-500 shrink-0 transition-colors"
                        [class.bg-red-50]="client.suspended" [class.border-red-200]="client.suspended" [class.text-red-600]="client.suspended"
                        [class.bg-white]="!client.suspended" [class.border-slate-200]="!client.suspended">
                      <i class="fa-regular fa-building text-sm" [class.fa-solid]="client.suspended" [class.fa-ban]="client.suspended"></i>
                   </div>
                   
                   <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-1">
                          <h3 class="text-base font-bold text-slate-800 truncate" [class.text-red-700]="client.suspended">
                              {{ client.name }}
                          </h3>
                          @if (client.suspended) {
                              <span class="px-1.5 py-0.5 bg-red-100 text-red-700 border border-red-200 text-[9px] font-black uppercase tracking-widest rounded whitespace-nowrap">
                                  Sospeso
                              </span>
                          }
                          <span class="px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold rounded whitespace-nowrap">
                              {{ users.length }} Op.
                          </span>
                      </div>
                      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-slate-500 tracking-wide">
                         <span class="flex items-center"><i class="fa-solid fa-location-dot mr-1.5 text-slate-400"></i> {{ client.address }}</span>
                         <span class="hidden sm:inline text-slate-300">•</span>
                         <span class="flex items-center"><i class="fa-solid fa-file-invoice mr-1.5 text-slate-400"></i> P.IVA: {{ client.piva }}</span>
                      </div>
                  </div>
               </div>

               <!-- Quick Actions -->
               <div class="flex items-center gap-3 w-full md:w-auto justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-100" (click)="$event.stopPropagation()">
                   
                   <div class="flex items-center gap-2 px-2.5 py-1.5 rounded bg-white border border-slate-100 shadow-sm transition-all"
                        [class.bg-red-50]="client.suspended" [class.border-red-200]="client.suspended">
                       <span class="text-[9px] font-black uppercase tracking-widest" 
                             [class.text-red-600]="client.suspended" [class.text-emerald-600]="!client.suspended">
                           {{ client.suspended ? 'Sospeso' : 'Attivo' }}
                       </span>
                       <button (click)="toggleSuspension(client)" 
                           class="w-8 h-4 rounded-full relative transition-colors duration-200 shadow-inner"
                           [class.bg-red-400]="client.suspended"
                           [class.bg-emerald-400]="!client.suspended"
                           title="{{ client.suspended ? 'Riattiva Servizio' : 'Sospendi per Mancato Pagamento' }}">
                           <div class="w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all duration-200 shadow-sm"
                                [class.left-4.5]="client.suspended"
                                [class.left-0.5]="!client.suspended"></div>
                       </button>
                   </div>

                   <button (click)="openClientModal(client)" class="w-8 h-8 rounded border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 flex items-center justify-center transition-all bg-white shadow-sm" title="Modifica Azienda">
                      <i class="fa-solid fa-pen text-xs"></i>
                   </button>
                   <button (click)="deleteClient(client.id)" class="w-8 h-8 rounded border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-all bg-white shadow-sm" title="Elimina Azienda">
                      <i class="fa-solid fa-trash-can text-xs"></i>
                   </button>
                    <button (click)="openUserModal(undefined, client.id)" class="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition-all flex items-center whitespace-nowrap shadow-md"
                            [disabled]="client.suspended" [class.opacity-50]="client.suspended" [class.cursor-not-allowed]="client.suspended">
                       <i class="fa-solid fa-plus-circle mr-2"></i> Nuova Unità
                    </button>
                   
                   <div class="w-6 h-6 flex items-center justify-center text-slate-400 transition-transform duration-300 ml-1" [class.rotate-180]="isOpen">
                       <i class="fa-solid fa-chevron-down text-sm"></i>
                   </div>
               </div>
            </div>

            <!-- Users List (Accordion Body) -->
            @if (isOpen) {
                <div class="border-t border-slate-100 bg-white p-4 md:p-5 rounded-b-xl border-t-dashed">
                   
                   @if (users.length === 0) {
                     <div class="bg-slate-50 border border-dashed border-slate-200 rounded-lg p-6 text-center">
                        <i class="fa-solid fa-users-slash text-2xl text-slate-300 mb-2"></i>
                        <p class="text-xs text-slate-500 font-bold">Nessuna unità operativa configurata per questa sede.</p>
                     </div>
                   } @else {
                     <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        @for (user of users; track user.id) {
                            <div class="group bg-slate-50 rounded-lg p-3.5 border border-slate-100 hover:bg-white hover:border-indigo-200 hover:shadow-sm transition-all flex items-center gap-3.5">
                                <!-- Avatar -->
                                <div class="relative shrink-0">
                                    <img [src]="user.avatar" class="w-10 h-10 rounded border border-slate-200 shadow-sm" [class.grayscale]="!user.active">
                                    <div class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center"
                                         [class.bg-emerald-500]="user.active" [class.bg-slate-300]="!user.active">
                                    </div>
                                </div>

                                <!-- User Details -->
                                <div class="flex-1 min-w-0">
                                    <div class="flex justify-between items-start mb-1">
                                        <div>
                                            <h4 class="font-bold text-slate-800 text-sm leading-tight truncate">{{ user.name }}</h4>
                                            <div class="flex items-center gap-2">
                                                <p class="text-[10px] text-slate-500 font-bold truncate">{{ user.email }}</p>
                                                <span class="text-[10px] text-indigo-400 font-black">•</span>
                                                <p class="text-[10px] text-indigo-600 font-black truncate">@{{ user.username }}</p>
                                            </div>
                                        </div>
                                        <span class="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-white text-slate-500 border border-slate-200 group-hover:border-indigo-200 transition-colors">
                                            {{ user.department || 'Generale' }}
                                        </span>
                                    </div>
                                    
                                    <!-- Actions Row -->
                                    <div class="flex items-center justify-between mt-2">
                                        <!-- Active Toggle -->
                                        <div class="flex items-center gap-3">
                                            <button (click)="toggleUserActive(user)" [disabled]="user.role === 'ADMIN'"
                                                class="flex items-center gap-1.5 focus:outline-none transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed">
                                                <div class="w-6 h-3 rounded-full relative transition-colors duration-200"
                                                    [class.bg-emerald-400]="user.active" [class.bg-slate-300]="!user.active">
                                                    <div class="w-2 h-2 bg-white rounded-full absolute top-[2px] transition-all duration-200 shadow-sm"
                                                        [class.left-[14px]]="user.active" [class.left-[2px]]="!user.active"></div>
                                                </div>
                                                <span class="text-[9px] font-black uppercase tracking-widest" [class.text-emerald-600]="user.active" [class.text-slate-400]="!user.active">
                                                    {{ user.active ? 'On' : 'Off' }}
                                                </span>
                                            </button>
                                            <div class="flex items-center gap-1 px-1.5 py-0.5 bg-white rounded border border-slate-200">
                                                <i class="fa-solid fa-file-shield text-[10px] text-indigo-400"></i>
                                                <span class="text-[9px] font-black text-slate-500">{{ getDocCount(user.clientId) }}</span>
                                            </div>
                                        </div>

                                        <!-- Edit/Delete -->
                                        <div class="flex gap-1.5 opacity-100 transition-opacity">
                                            <button (click)="viewUnitDocs(user)" class="text-indigo-600 bg-white hover:bg-indigo-50 px-2.5 py-1 rounded border border-slate-200 hover:border-indigo-200 transition-colors text-[9px] font-black uppercase flex items-center gap-1.5" title="Vedi Archivio">
                                                <i class="fa-solid fa-folder-open"></i> Docs
                                            </button>
                                            <button (click)="openUserModal(user)" class="w-6 h-6 flex items-center justify-center rounded bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 transition-colors" title="Modifica">
                                                <i class="fa-solid fa-pen text-[10px]"></i>
                                            </button>
                                            @if (user.role !== 'ADMIN') {
                                                <button (click)="deleteUser(user.id)" class="w-6 h-6 flex items-center justify-center rounded bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Elimina">
                                                    <i class="fa-solid fa-trash-can text-[10px]"></i>
                                                </button>
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>
                        }
                     </div>
                   }
                </div>
            }
          </div>
        }
      </div>
      
      <!-- CUSTOM DELETE CONFIRMATION MODAL -->
      @if (isDeleteConfirmOpen()) {
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" (click)="closeDeleteModal()"></div>
          <div class="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden p-8 animate-slide-up text-center border border-slate-200">
            
            <div class="w-20 h-20 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-6 border border-red-100 shadow-inner group transition-transform hover:scale-110">
                <i class="fa-solid fa-trash-can-arrow-up text-3xl animate-bounce-short"></i>
            </div>

            <h3 class="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">Conferma Eliminazione</h3>
            <p class="text-base font-medium text-slate-500 leading-relaxed mb-8">
                Sei sicuro di voler rimuovere <span class="text-slate-800 font-bold">"{{ itemToDelete()?.name }}"</span>?<br>
                <span class="text-[11px] font-black text-red-500 uppercase tracking-widest bg-red-50 px-2 py-1 rounded inline-block mt-3 border border-red-100">Operazione irreversibile</span>
            </p>

            <div class="flex gap-4">
                <button (click)="closeDeleteModal()"
                        class="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200">
                    ANNULLA
                </button>
                <button (click)="confirmDeletion()"
                        class="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-[0_8px_20px_rgba(220,38,38,0.3)] active:scale-95">
                    ELIMINA
                </button>
            </div>
          </div>
        </div>
      }

      <!-- DUPLICATE NAME WARNING MODAL -->
      @if (isDuplicateModalOpen()) {
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" (click)="isDuplicateModalOpen.set(false)"></div>
          <div class="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden p-8 animate-slide-up text-center border border-slate-200">
            
            <div class="w-20 h-20 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-6 border border-amber-100 shadow-inner group transition-transform hover:scale-110">
                <i class="fa-solid fa-triangle-exclamation text-3xl"></i>
            </div>

            <h3 class="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">Nome Già In Uso</h3>
            <p class="text-sm font-medium text-slate-500 leading-relaxed mb-8">
                Esiste già un'azienda registrata come <span class="text-indigo-600 font-bold">"{{ duplicateName() }}"</span>.<br><br>
                Ti suggeriamo di aggiungere un riferimento (es. la città o il nome della via) per distinguere le sedi.
            </p>

            <button (click)="isDuplicateModalOpen.set(false)"
                    class="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg active:scale-95">
                HO CAPITO, MODIFICO
            </button>
          </div>
        </div>
      }

      <!-- SUSPENSION CONFIRMATION MODAL -->
      @if (isSuspensionModalOpen()) {
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" (click)="isSuspensionModalOpen.set(false)"></div>
          <div class="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden p-8 animate-slide-up border border-slate-200">
            
            <div [class]="clientToSuspend()?.suspended ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-amber-50 text-amber-500 border-amber-100'"
                 class="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 border shadow-inner transition-transform hover:scale-110">
                <i [class]="clientToSuspend()?.suspended ? 'fa-solid fa-unlock' : 'fa-solid fa-user-slash'" class="text-3xl"></i>
            </div>

            <h3 class="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight text-center">
                {{ clientToSuspend()?.suspended ? 'Riattiva Servizio' : 'Sospendi Servizio' }}
            </h3>
            
            <p class="text-sm font-medium text-slate-500 leading-relaxed mb-8 text-center px-4">
                @if (clientToSuspend()?.suspended) {
                    Vuoi ripristinare l'accesso per <span class="text-slate-800 font-bold">"{{ clientToSuspend()?.name }}"</span>? 
                    Gli utenti potranno tornare ad operare immediatamente.
                } @else {
                    Stai per sospendere <span class="text-slate-800 font-bold">"{{ clientToSuspend()?.name }}"</span>.<br><br>
                    <span class="text-amber-600 font-bold uppercase text-[10px] tracking-widest bg-amber-50 px-2 py-1 rounded inline-block border border-amber-100 mb-2">Azione Reversibile</span><br>
                    Tutti gli account collegati a questa azienda verranno <span class="text-slate-800 font-bold">BLOCCATI</span> e non potranno più accedere.
                }
            </p>

            <div class="flex gap-4">
                <button (click)="isSuspensionModalOpen.set(false)"
                        class="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200">
                    ANNULLA
                </button>
                <button (click)="confirmSuspension()"
                        [class]="clientToSuspend()?.suspended ? 'bg-emerald-600 hover:bg-emerald-700 shadow-[0_8px_20px_rgba(16,185,129,0.3)]' : 'bg-amber-600 hover:bg-amber-700 shadow-[0_8px_20px_rgba(217,119,6,0.3)]'"
                        class="flex-1 py-4 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95">
                    CONFERMA
                </button>
            </div>
          </div>
        </div>
      }

      <!-- Unit Modal -->
      @if (activeModal() === 'user') {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" (click)="closeModal()"></div>
          
          <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div class="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
            <div class="px-6 py-5 flex justify-between items-center border-b border-slate-100">
              <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
                <i class="fa-solid fa-user-plus text-indigo-500"></i>
                {{ isEditing() ? 'Modifica Unità Operativa' : 'Nuova Unità Operativa' }}
              </h3>
              <button (click)="closeModal()" class="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <i class="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
            
            <form [formGroup]="userForm" (ngSubmit)="saveUser()" class="p-6 space-y-4 bg-slate-50/50">
              
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Sede di Appartenenza</label>
                <select formControlName="clientId" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-sm font-bold text-slate-700 hover:border-indigo-200 transition-all shadow-sm">
                  <option value="">-- Seleziona Sede --</option>
                  @for (client of state.clients(); track client.id) {
                    <option [value]="client.id">{{ client.name }}</option>
                  }
                </select>
              </div>

              <div class="grid grid-cols-2 gap-4">
                 <div>
                   <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nome / Reparto</label>
                   <input type="text" formControlName="department" placeholder="Es. Cucina, Bar..." 
                          class="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm bg-white transition-all placeholder:font-normal font-bold text-slate-700 hover:border-indigo-200 shadow-sm">
                 </div>
                 <div>
                   <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Ruolo Accesso</label>
                   <select formControlName="role" class="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-sm font-bold text-slate-700 transition-all hover:border-indigo-200 shadow-sm">
                     <option value="COLLABORATOR">Operatore</option>
                     <option value="ADMIN">Amministratore</option>
                   </select>
                 </div>
              </div>

              <div>
                 <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Responsabile (Nome e Cognome)</label>
                 <div class="relative">
                    <i class="fa-solid fa-user absolute left-3.5 top-3.5 text-slate-400 text-sm"></i>
                    <input type="text" formControlName="name" placeholder="Es. Mario Rossi"
                           class="w-full pl-10 px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm font-bold text-slate-800 transition-all placeholder:font-normal hover:border-indigo-200 shadow-sm bg-white">
                 </div>
              </div>

              <div>
                 <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Email (Anagrafica)</label>
                 <div class="relative">
                    <i class="fa-solid fa-envelope absolute left-3.5 top-3.5 text-slate-400 text-sm"></i>
                    <input type="email" formControlName="email" placeholder="operatore@esempio.it"
                           class="w-full pl-10 px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm font-bold text-slate-800 transition-all placeholder:font-normal hover:border-indigo-200 shadow-sm bg-white">
                 </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Username (Accesso)</label>
                    <div class="relative">
                        <i class="fa-solid fa-at absolute left-3.5 top-3.5 text-slate-400 text-sm"></i>
                        <input type="text" formControlName="username" placeholder="mario.cucina"
                               class="w-full pl-10 px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm font-bold text-slate-800 transition-all placeholder:font-normal hover:border-indigo-200 shadow-sm bg-white">
                    </div>
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Password</label>
                    <div class="relative">
                        <i class="fa-solid fa-lock absolute left-3.5 top-3.5 text-slate-400 text-sm"></i>
                        <input type="text" formControlName="password" placeholder="Pass123!"
                               class="w-full pl-10 px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm font-bold text-slate-800 transition-all placeholder:font-normal hover:border-indigo-200 shadow-sm bg-white">
                    </div>
                  </div>
              </div>

              <div class="pt-4 flex justify-end gap-2 border-t border-slate-100 mt-6">
                 <button type="button" (click)="closeModal()" class="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">Annulla</button>
                 <button type="submit" [disabled]="userForm.invalid" class="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    <i class="fa-solid fa-check text-xs"></i>
                    {{ isEditing() ? 'Salva Modifiche' : 'Crea Unità' }}
                 </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Client Company Modal -->
      @if (activeModal() === 'client') {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" (click)="closeModal()"></div>
          
          <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div class="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
            <div class="px-6 py-5 flex justify-between items-center border-b border-slate-100">
              <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
                <i class="fa-solid fa-building text-indigo-500"></i>
                {{ isEditing() ? 'Modifica Azienda' : 'Nuova Azienda' }}
              </h3>
              <button (click)="closeModal()" class="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <i class="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
            
            <form [formGroup]="clientForm" (ngSubmit)="saveClient()" class="p-6 space-y-4 bg-slate-50/50">
              
              <div>
                 <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Ragione Sociale / Nome</label>
                 <input type="text" formControlName="name" placeholder="Es. Ristorante Da Mario S.r.l."
                        class="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm font-bold text-slate-800 transition-all placeholder:font-normal hover:border-indigo-200 shadow-sm bg-white">
              </div>

              <div>
                 <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Partita IVA</label>
                 <input type="text" formControlName="piva" placeholder="12345678901"
                        class="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm font-mono font-bold text-slate-700 transition-all placeholder:font-sans placeholder:font-normal hover:border-indigo-200 shadow-sm bg-white">
              </div>

              <div>
                 <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Indirizzo Sede Operativa</label>
                 <input type="text" formControlName="address" placeholder="Via Roma 1, Milano"
                        class="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm font-bold text-slate-700 transition-all placeholder:font-normal hover:border-indigo-200 shadow-sm bg-white">
              </div>

               <div class="grid grid-cols-2 gap-4">
                 <div>
                   <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Telefono</label>
                   <input type="text" formControlName="phone" placeholder="02 1234567" 
                          class="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm font-bold text-slate-700 transition-all placeholder:font-normal hover:border-indigo-200 shadow-sm bg-white">
                 </div>
                 <div>
                   <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Email Aziendale</label>
                   <input type="email" formControlName="email" placeholder="info@azienda.it" 
                          class="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm font-bold text-slate-700 transition-all placeholder:font-normal hover:border-indigo-200 shadow-sm bg-white">
                 </div>
              </div>

              <div class="pt-4 flex justify-end gap-2 border-t border-slate-100 mt-6">
                 <button type="button" (click)="closeModal()" class="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">Annulla</button>
                 <button type="submit" [disabled]="clientForm.invalid" class="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    <i class="fa-solid fa-check text-xs"></i>
                    {{ isEditing() ? 'Aggiorna Azienda' : 'Crea Azienda' }}
                 </button>
              </div>

            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-slide-down {
      animation: slideDown 0.2s ease-out forwards;
    }
  `]
})
export class CollaboratorsViewComponent {
  state = inject(AppStateService);
  fb = inject(FormBuilder);
  toastService = inject(ToastService);

  activeModal = signal<'user' | 'client' | null>(null);
  isEditing = signal(false);
  editingId = signal<string | null>(null);

  // Deletion Modal State
  isDeleteConfirmOpen = signal(false);
  itemToDelete = signal<{ id: string, name: string, type: 'user' | 'client' } | null>(null);

  // Duplicate Check Modal
  isDuplicateModalOpen = signal(false);
  duplicateName = signal('');

  // Suspension Modal State
  isSuspensionModalOpen = signal(false);
  clientToSuspend = signal<ClientEntity | null>(null);

  // Accordion State: Set of open client IDs
  expandedClientIds = signal<Set<string>>(new Set());

  userForm: FormGroup;
  clientForm: FormGroup;

  constructor() {
    this.userForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['COLLABORATOR', Validators.required],
      department: ['', Validators.required],
      clientId: ['', Validators.required],
      username: ['', Validators.required],
      password: ['', Validators.required],
      active: [true]
    });

    this.clientForm = this.fb.group({
      name: ['', Validators.required],
      piva: ['', Validators.required],
      address: ['', Validators.required],
      phone: [''],
      email: [''],
      licenseNumber: ['']
    });

    // All closed by default as requested
    // const clients = this.state.clients();
    // if (clients.length > 0) {
    //   this.toggleClient(clients[0].id);
    // }
  }

  isClientExpanded(clientId: string): boolean {
    return this.expandedClientIds().has(clientId);
  }

  toggleClient(clientId: string) {
    this.expandedClientIds.update(set => {
      const newSet = new Set(set);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        // Optional: Close others if we want "Accordion" behavior (only one open)
        // newSet.clear(); 
        newSet.add(clientId);
      }
      return newSet;
    });
  }

  getUsersByClient(clientId: string): SystemUser[] {
    return this.state.systemUsers().filter(u => u.clientId === clientId);
  }

  toggleUserActive(user: SystemUser) {
    if (user.role === 'ADMIN') return;
    this.state.updateSystemUser(user.id, { active: !user.active });
  }

  // --- User Logic ---
  openUserModal(user?: SystemUser, preSelectedClientId?: string) {
    this.activeModal.set('user');
    if (user) {
      this.isEditing.set(true);
      this.editingId.set(user.id);
      this.userForm.patchValue({
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department || '',
        clientId: user.clientId || '',
        username: user.username || '',
        password: user.password || '',
        active: user.active
      });
    } else {
      this.isEditing.set(false);
      this.editingId.set(null);
      this.userForm.reset({
        role: 'COLLABORATOR',
        active: true,
        department: '',
        clientId: preSelectedClientId || ''
      });
    }
  }

  saveUser() {
    if (this.userForm.valid) {
      const formValue = this.userForm.value;
      const updates = {
        ...formValue,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formValue.name)}&background=random&color=fff`
      };
      if (this.isEditing() && this.editingId()) {
        this.state.updateSystemUser(this.editingId()!, updates);
      } else {
        this.state.addSystemUser(updates);
      }
      this.closeModal();
    }
  }

    getDocCount(clientId?: string): number {
        if (!clientId) return 0;
        return this.state.documents().filter(d => d.clientId === clientId).length;
    }

    viewUnitDocs(user: SystemUser) {
        this.state.setCollaboratorFilter(user.id);
        this.state.setModule('documentation');
        this.toastService.info('Accesso Archivio', `Consultazione documenti per l'unità ${user.name}`);
    }

  deleteUser(id: string) {
    const user = this.state.systemUsers().find(u => u.id === id);
    if (!user) return;
    this.itemToDelete.set({ id, name: user.name, type: 'user' });
    this.isDeleteConfirmOpen.set(true);
  }

  deleteClient(id: string) {
    const client = this.state.clients().find(c => c.id === id);
    if (!client) return;
    this.itemToDelete.set({ id, name: client.name, type: 'client' });
    this.isDeleteConfirmOpen.set(true);
  }

  confirmDeletion() {
    const item = this.itemToDelete();
    if (!item) return;

    if (item.type === 'client') {
      this.state.deleteClient(item.id);
    } else {
      this.state.deleteSystemUser(item.id);
    }
    this.closeDeleteModal();
  }

  closeDeleteModal() {
    this.isDeleteConfirmOpen.set(false);
    this.itemToDelete.set(null);
  }

  // --- Client/Company Logic ---
  openClientModal(client?: ClientEntity) {
    this.activeModal.set('client');
    if (client) {
      this.isEditing.set(true);
      this.editingId.set(client.id);
      this.clientForm.patchValue({
        name: client.name,
        piva: client.piva,
        address: client.address,
        phone: client.phone,
        email: client.email,
        licenseNumber: client.licenseNumber
      });
    } else {
      this.isEditing.set(false);
      this.editingId.set(null);
      this.clientForm.reset();
    }
  }

  saveClient() {
    if (this.clientForm.valid) {
      const formValue = this.clientForm.value;

      // Duplicate Check
      if (!this.isEditing()) {
          const exists = this.state.clients().some(c => c.name.toLowerCase() === formValue.name.trim().toLowerCase());
          if (exists) {
              this.duplicateName.set(formValue.name);
              this.isDuplicateModalOpen.set(true);
              return;
          }
      }

      if (this.isEditing() && this.editingId()) {
        this.state.updateClient(this.editingId()!, formValue);
      } else {
        this.state.addClient({ ...formValue, suspended: false });
      }
      this.closeModal();
    }
  }

  toggleSuspension(client: ClientEntity) {
    this.clientToSuspend.set(client);
    this.isSuspensionModalOpen.set(true);
  }

  confirmSuspension() {
    const client = this.clientToSuspend();
    if (!client) return;
    this.state.toggleClientSuspension(client.id, !client.suspended);
    this.isSuspensionModalOpen.set(false);
    this.clientToSuspend.set(null);
  }

  closeModal() {
    this.activeModal.set(null);
    this.userForm.reset();
    this.clientForm.reset();
  }
}
