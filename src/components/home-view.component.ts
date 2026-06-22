
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../services/app-state.service';

@Component({
  selector: 'app-home-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-teal-500/30 selection:text-teal-200">
      
      <!-- Premium Navigation -->
      <nav class="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-transparent rounded-xl flex items-center justify-center overflow-hidden">
              <img src="logo.png" class="w-full h-full object-contain">
            </div>
            <span class="text-xl font-black tracking-tighter uppercase">SAI <span class="text-teal-400">FAST HACCP</span></span>
          </div>
          
          <div class="hidden md:flex items-center gap-8 text-sm font-bold text-slate-400 uppercase tracking-widest">
            <a href="#features" class="hover:text-white transition-colors">Vantaggi</a>
            <a href="#traceability" class="hover:text-white transition-colors">Tracciabilità</a>
            <a href="#security" class="hover:text-white transition-colors">Sicurezza</a>
          </div>

          <button (click)="goToLogin()" class="px-6 py-2.5 bg-white text-slate-900 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-teal-400 transition-all shadow-xl shadow-white/5">
            Accedi Portal
          </button>
        </div>
      </nav>

      <!-- Hero Section -->
      <header class="relative pt-32 pb-20 md:pt-48 md:pb-40 overflow-hidden">
        <!-- Abstract Glows -->
        <div class="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-teal-500/20 rounded-full blur-[120px] animate-pulse"></div>
        <div class="absolute top-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px]"></div>

        <div class="max-w-7xl mx-auto px-6 relative z-10">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div class="space-y-8 animate-fade-in-up">
              <div class="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-500/10 border border-teal-500/20 rounded-full">
                <span class="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
                <span class="text-[10px] font-black uppercase tracking-[0.2em] text-teal-400">Rivoluzione Digitale HACCP</span>
              </div>
              <h1 class="text-5xl md:text-8xl font-black tracking-tighter leading-[0.95] md:leading-[0.9]">
                Elimina il <span class="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">Cartaceo</span><br>
                Governa la Qualità.
              </h1>
              <p class="text-lg md:text-xl text-slate-400 font-medium leading-relaxed max-w-xl">
                La piattaforma enterprise per la gestione dell'autocontrollo alimentare. Controlli immediati, processi sicuri e tracciabilità digitale totale.
              </p>
              <div class="flex flex-col sm:flex-row gap-4 pt-4">
                <button (click)="goToLogin()" class="px-10 py-5 bg-teal-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-teal-400 hover:shadow-[0_20px_40px_rgba(20,184,166,0.3)] transition-all transform hover:-translate-y-1">
                  Inizia Ora Gratis
                </button>
                <a href="#features" class="px-10 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3">
                  Scopri di più <i class="fa-solid fa-arrow-down text-teal-400"></i>
                </a>
              </div>
            </div>

            <div class="relative group animate-fade-in-right">
              <div class="absolute -inset-4 bg-gradient-to-br from-teal-500 to-blue-600 rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <img src="haccp_hero.png" class="relative rounded-[2.5rem] shadow-2xl border border-white/10 transition-transform group-hover:scale-[1.02] duration-700">
            </div>
          </div>
        </div>
      </header>

      <!-- Features Grid -->
      <section id="features" class="py-24 md:py-40 bg-slate-950">
        <div class="max-w-7xl mx-auto px-6">
          <div class="text-center max-w-3xl mx-auto mb-20 md:mb-32 space-y-6">
            <h2 class="text-3xl md:text-6xl font-black tracking-tight uppercase">Perchè Scegliere il <span class="text-teal-400">Digitale</span>?</h2>
            <p class="text-slate-400 text-lg font-medium">Abbiamo reinventato il protocollo HACCP per renderlo uno strumento di crescita, non solo un obbligo burocratico.</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <!-- Feature 1 -->
            <div class="p-8 md:p-12 bg-[#0f172a] rounded-[2.5rem] border border-white/5 hover:border-teal-500/30 transition-all group">
              <div class="w-16 h-16 bg-teal-500/10 rounded-2xl flex items-center justify-center text-teal-400 text-3xl mb-8 group-hover:scale-110 group-hover:bg-teal-500 group-hover:text-white transition-all duration-500">
                <i class="fa-solid fa-leaf"></i>
              </div>
              <h3 class="text-2xl font-black mb-4 uppercase tracking-tight">Zero Carta</h3>
              <p class="text-slate-400 leading-relaxed font-medium">Addio a faldoni, registri sporchi e fogli smarriti. Tutto il tuo archivio è protetto in cloud, accessibile in un click.</p>
            </div>

            <!-- Feature 2 -->
            <div class="p-8 md:p-12 bg-[#0f172a] rounded-[2.5rem] border border-white/5 hover:border-blue-500/30 transition-all group">
              <div class="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 text-3xl mb-8 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-500">
                <i class="fa-solid fa-bolt-lightning"></i>
              </div>
              <h3 class="text-2xl font-black mb-4 uppercase tracking-tight">Controllo Immediato</h3>
              <p class="text-slate-400 leading-relaxed font-medium">Monitora in tempo reale le temperature, le pulizie e le scadenze. Ricevi alert istantanei se qualcosa non va.</p>
            </div>

            <!-- Feature 3 -->
            <div class="p-8 md:p-12 bg-[#0f172a] rounded-[2.5rem] border border-white/5 hover:border-purple-500/30 transition-all group">
              <div class="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 text-3xl mb-8 group-hover:scale-110 group-hover:bg-purple-500 group-hover:text-white transition-all duration-500">
                <i class="fa-solid fa-qrcode"></i>
              </div>
              <h3 class="text-2xl font-black mb-4 uppercase tracking-tight">Tracciabilità Smart</h3>
              <p class="text-slate-400 leading-relaxed font-medium">Genera etichette intelligenti con QR Code. Condividi la qualità dei tuoi prodotti con i clienti in totale trasparenza.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Traceability Showcase -->
      <section id="traceability" class="py-24 md:py-40 relative overflow-hidden">
        <div class="max-w-7xl mx-auto px-6 relative z-10">
          <div class="bg-gradient-to-br from-teal-500/10 to-blue-600/10 border border-white/10 rounded-[4rem] p-8 md:p-24 overflow-hidden relative">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 class="text-4xl md:text-7xl font-black tracking-tighter uppercase leading-none mb-8">
                  La <span class="text-teal-400">Trasparenza</span><br> che genera Fiducia.
                </h2>
                <div class="space-y-6">
                  <div class="flex gap-5">
                    <div class="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                      <i class="fa-solid fa-check"></i>
                    </div>
                    <div>
                      <h4 class="font-black uppercase tracking-widest text-sm mb-1">Etichettatura Automatica</h4>
                      <p class="text-slate-400 text-sm">Crea etichette 29x90 o 62x62 in secondi.</p>
                    </div>
                  </div>
                  <div class="flex gap-5">
                    <div class="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                      <i class="fa-solid fa-check"></i>
                    </div>
                    <div>
                      <h4 class="font-black uppercase tracking-widest text-sm mb-1">Landing Page Pubbliche</h4>
                      <p class="text-slate-400 text-sm">Ogni prodotto ha la sua scheda tecnica digitale.</p>
                    </div>
                  </div>
                  <div class="flex gap-5">
                    <div class="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                      <i class="fa-solid fa-check"></i>
                    </div>
                    <div>
                      <h4 class="font-black uppercase tracking-widest text-sm mb-1">Allergeni Automatici</h4>
                      <p class="text-slate-400 text-sm">AI-driven detection dagli ingredienti.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="relative">
                <div class="bg-[#0f172a] rounded-3xl p-4 border border-white/10 shadow-2xl rotate-3 transform translate-x-10 scale-110 hidden md:block">
                  <!-- Mockup of the public page -->
                  <div class="w-full h-80 bg-slate-900 rounded-2xl overflow-hidden flex flex-col">
                    <div class="p-4 bg-slate-800 flex justify-between items-center border-b border-white/5">
                      <div class="w-20 h-4 bg-slate-700 rounded"></div>
                      <div class="w-4 h-4 bg-teal-500 rounded-full"></div>
                    </div>
                    <div class="p-6 space-y-4">
                      <div class="w-3/4 h-8 bg-slate-800 rounded-lg"></div>
                      <div class="w-1/2 h-4 bg-slate-800 rounded"></div>
                      <div class="grid grid-cols-2 gap-4 pt-4">
                        <div class="h-20 bg-slate-800/50 rounded-2xl border border-white/5"></div>
                        <div class="h-20 bg-slate-800/50 rounded-2xl border border-white/5"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="absolute inset-0 bg-gradient-to-t from-[#0f172a] to-transparent pointer-events-none"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Footer CTA -->
      <section class="py-24 md:py-40 text-center">
        <div class="max-w-4xl mx-auto px-6 space-y-12">
          <h2 class="text-4xl md:text-8xl font-black tracking-tighter uppercase leading-none">Pronto per il <br><span class="text-teal-400">Futuro?</span></h2>
          <p class="text-slate-400 text-xl font-medium">Unisciti alle attività che hanno già digitalizzato la loro sicurezza alimentare.</p>
          <button (click)="goToLogin()" class="px-16 py-6 bg-white text-slate-900 rounded-[2rem] font-black text-lg uppercase tracking-widest hover:bg-teal-400 hover:shadow-[0_20px_60px_rgba(20,184,166,0.3)] transition-all transform hover:-translate-y-2">
            Inizia Ora
          </button>
        </div>
      </section>

      <!-- SAI Napoli Link Section -->
      <section class="py-20 bg-slate-950 border-t border-white/5">
        <div class="max-w-4xl mx-auto px-6 text-center space-y-6 animate-fade-in-up">
          <h3 class="text-2xl font-black uppercase tracking-tight text-white">SALUTE, AMBIENTE E IGIENE</h3>
          <p class="text-teal-400 font-black uppercase tracking-widest text-sm">Ti aiutiamo a rendere la tua azienda sicura</p>
          <p class="text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto">
            Attraverso la nostra opera di consulenza alle attività commerciali ci pregiamo di renderle edotte e autonome nella corretta applicazione dei dispositivi di Legge da rispettare, lasciando a noi solo la parte specifica professionale.
          </p>
          <a href="https://www.sainapoli.com" target="_blank" class="inline-flex items-center gap-3 px-8 py-4 bg-teal-500/10 border border-teal-500/30 rounded-2xl text-teal-400 font-black text-xs uppercase tracking-widest hover:bg-teal-500 hover:text-white transition-all group mt-4">
            Scopri di più su sainapoli.com <i class="fa-solid fa-external-link group-hover:translate-x-1 transition-transform"></i>
          </a>
        </div>
      </section>

      <!-- Mini Footer -->
      <footer class="py-10 border-t border-white/5 text-center text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em]">
        © 2026 SAI FAST HACCP • Ecosystem SAI Napoli
      </footer>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .animate-fade-in-up { animation: fadeInUp 1s ease-out forwards; }
    .animate-fade-in-right { animation: fadeInRight 1s ease-out forwards; }
    
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeInRight {
      from { opacity: 0; transform: translateX(30px); }
      to { opacity: 1; transform: translateX(0); }
    }
  `]
})
export class HomeViewComponent {
  state = inject(AppStateService);

  goToLogin() {
    this.state.toggleHome(false);
  }
}
