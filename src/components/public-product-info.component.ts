
import { Component, Input, OnInit, OnChanges, SimpleChanges, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService, ProductionRecord, ClientEntity } from '../services/app-state.service';
import { supabase } from '../supabase';

@Component({
  selector: 'app-public-product-info',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-white font-sans print:bg-white text-slate-900">
      
      <!-- Top Header (A4 Minimalist) -->
      <div class="max-w-[210mm] mx-auto px-10 py-6 border-b-2 border-slate-900 flex items-center justify-between">
        <div class="flex items-center gap-6">
          <div class="w-16 h-16 rounded overflow-hidden flex items-center justify-center bg-slate-50 border border-slate-200 shrink-0">
            @if (client()?.logo) {
              <img [src]="client()?.logo" class="w-full h-full object-contain">
            } @else {
              <i class="fa-solid fa-building text-slate-300 text-3xl"></i>
            }
          </div>
          <div>
            <h1 class="text-xl font-black uppercase tracking-tight leading-tight">{{ client()?.name }}</h1>
            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{{ client()?.address }}</p>
            <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">P.IVA: {{ client()?.piva }} | Aut. Sanitaria: {{ client()?.licenseNumber }}</p>
          </div>
        </div>
        
        <div class="text-right print:hidden">
          <button (click)="print()" class="h-10 px-6 bg-slate-900 text-white rounded font-bold text-[10px] uppercase tracking-widest hover:bg-teal-600 transition-all">
            <i class="fa-solid fa-print mr-2"></i> STAMPA A4
          </button>
        </div>
      </div>

      <!-- Main A4 Content -->
      <div class="max-w-[210mm] mx-auto p-10 space-y-8">
        
        <!-- Document Title & Identity -->
        <div class="flex justify-between items-start gap-10">
          <div class="space-y-4 flex-grow">
            <div class="inline-block px-2 py-0.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
              Scheda Tecnica di Rintracciabilità
            </div>
            <h2 class="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none border-l-4 border-slate-900 pl-4">
              {{ record()?.mainProductName }}
            </h2>
          </div>
          
          <!-- Key Info Grid -->
          <div class="grid grid-cols-2 gap-x-6 gap-y-3 border border-slate-200 p-3 rounded-lg bg-slate-50/50 shrink-0">
            <div>
              <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lotto Interno</p>
              <p class="text-base font-mono font-black text-slate-900">{{ record()?.lotto }}</p>
            </div>
            <div>
              <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Confezionamento</p>
              <p class="text-base font-black text-slate-900">{{ record()?.packagingDate | date:'dd/MM/yyyy' }}</p>
            </div>
            <div class="col-span-2 border-t border-slate-200 pt-2">
              <p class="text-[8px] font-black text-rose-400 uppercase tracking-widest">Da Consumarsi entro</p>
              <p class="text-base font-black text-rose-600">{{ record()?.expiryDate | date:'dd/MM/yyyy' }}</p>
            </div>
          </div>
        </div>

        <!-- Ingredients Table (Compact framed grid) -->
        <div class="space-y-3">
          <h3 class="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <i class="fa-solid fa-list-check"></i> Composizione Prodotto e Tracciabilità Materie Prime
          </h3>
          
          <div class="border border-slate-200 rounded-lg overflow-hidden">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                  <th class="px-3 py-1.5 border-r border-slate-700 w-1/3">Ingrediente / Semilavorato</th>
                  <th class="px-3 py-1.5 border-r border-slate-700 w-1/4">Lotto / Provenienza</th>
                  <th class="px-3 py-1.5 w-1/3">Fornitore Certificato</th>
                </tr>
              </thead>
              <tbody class="text-[10px] font-medium text-slate-700">
                @for (ing of record()?.ingredients; track ing.id) {
                  <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td class="px-3 py-2 border-r border-slate-100 font-bold uppercase tracking-tight">
                      {{ ing.name }}
                      @if (ing.allergens && ing.allergens.length > 0) {
                        <div class="mt-0.5 flex gap-1">
                          @for (algId of ing.allergens; track algId) {
                            <span class="text-[7px] bg-rose-50 text-rose-600 px-1 border border-rose-100 rounded uppercase font-black">
                              {{ algId }}
                            </span>
                          }
                        </div>
                      }
                    </td>
                    <td class="px-3 py-2 border-r border-slate-100 font-mono text-[9px]">
                      {{ ing.lotto || '---' }}
                    </td>
                    <td class="px-3 py-2 bg-slate-50/30">
                      <div class="flex flex-col">
                        <span class="font-black uppercase tracking-tighter">{{ ing.supplierName || 'Dato non disponibile' }}</span>
                        <span class="text-[8px] text-slate-400 font-bold">Origine verificata tramite HACCP Pro</span>
                      </div>
                    </td>
                  </tr>
                }
                @if (!record()?.ingredients?.length) {
                  <tr>
                    <td colspan="3" class="px-4 py-8 text-center italic text-slate-400">
                      Nessun ingrediente specifico registrato per questo lotto.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Footer Certifications (Compact) -->
        <div class="grid grid-cols-2 gap-8 pt-8 border-t border-slate-100">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded bg-emerald-50 text-emerald-500 flex items-center justify-center text-lg shrink-0 border border-emerald-100">
              <i class="fa-solid fa-shield-check"></i>
            </div>
            <div class="space-y-1">
              <h4 class="text-[10px] font-black text-slate-900 uppercase tracking-widest">Protocollo di Sicurezza</h4>
              <p class="text-[10px] text-slate-500 leading-tight">
                Certifichiamo che il prodotto è manipolato secondo i piani HACCP vigenti. 
                Rintracciabilità garantita digitalmente al 100%.
              </p>
            </div>
          </div>
          
          <div class="flex justify-end items-center gap-6 opacity-40">
            <div class="text-right">
              <p class="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Tecnologia di Tracciabilità</p>
              <p class="text-[9px] font-black text-slate-900">HACCP PRO PLATFORM</p>
            </div>
            <i class="fa-solid fa-qrcode text-3xl text-slate-400"></i>
          </div>
        </div>

        <!-- Action Buttons Footer Mobile -->
        <div class="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 print:hidden">
          <button (click)="print()" class="px-8 py-4 bg-slate-900 text-white rounded-full shadow-2xl flex items-center gap-3 font-black text-xs uppercase tracking-widest active:scale-95 transition-all">
            <i class="fa-solid fa-print"></i> Stampa Rapporto
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    @media print {
      body { background: white !important; }
      .max-w-\\[210mm\\] { 
        margin: 0 !important; 
        box-shadow: none !important; 
        border: none !important; 
        max-width: none !important;
        width: 100% !important;
      }
      .sticky { position: static !important; }
    }
  `]
})
export class PublicProductInfoComponent implements OnInit, OnChanges {
  @Input() lotto: string | null = null;
  
  record = signal<ProductionRecord | null>(null);
  client = signal<ClientEntity | null>(null);
  state = inject(AppStateService);

  async ngOnInit() {
    if (this.lotto) {
      await this.loadData();
    }
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['lotto'] && !changes['lotto'].firstChange) {
      await this.loadData();
    }
  }

  async loadData() {
    if (!this.lotto) return;
    try {
      // Search by ID first (unique and robust), fallback to Lotto (for backward compatibility)
      const { data, error } = await supabase
        .from('production_records')
        .select('*')
        .or(`id.eq."${this.lotto}",lotto.eq."${this.lotto}"`)
        .order('recorded_date', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        this.record.set({
          id: data.id,
          lotto: data.lotto,
          mainProductName: data.main_product_name,
          packagingDate: data.packaging_date,
          expiryDate: data.expiry_date,
          ingredients: data.ingredients || [],
          userId: data.user_id,
          clientId: data.client_id,
          recordedDate: data.recorded_date
        });

        // Load client info
        const { data: clientData } = await supabase
          .from('clients')
          .select('*')
          .eq('id', data.client_id)
          .single();
        
        if (clientData) {
          this.client.set({
            id: clientData.id,
            name: clientData.name,
            piva: clientData.piva,
            address: clientData.address,
            phone: clientData.phone,
            email: clientData.email,
            licenseNumber: clientData.license_number,
            suspended: clientData.suspended,
            logo: clientData.logo
          });
        }
      }
    } catch (e) {
      console.error('Error loading public info:', e);
    }
  }

  print() {
    window.print();
  }
}
