import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService, ClientEntity } from '../services/app-state.service';

interface CompanyReport {
  client: ClientEntity;
  users: {
    id: string;
    name: string;
    department: string;
    checksCompleted: number;
    checksTotal: number;
    lastActivity: string;
  }[];
  totalChecks: number;
  completedChecks: number;
}

@Component({
  selector: 'app-reports-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6 pb-12 max-w-7xl mx-auto p-4">
      
      <!-- Premium Header Banner -->
      <div class="bg-gradient-to-r from-slate-700 via-slate-800 to-blue-900 p-8 rounded-3xl shadow-xl border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div class="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <i class="fa-solid fa-file-invoice text-9xl text-white"></i>
        </div>
        
        <div class="relative z-10">
          <h2 class="text-3xl font-black text-white flex items-center tracking-tight">
            <span class="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mr-4 shadow-lg border border-white/20">
              <i class="fa-solid fa-file-chart-column"></i>
            </span>
            Report Controlli
          </h2>
          <div class="flex items-center gap-4 mt-2">
            <p class="text-slate-300 text-sm font-medium ml-1">Analisi e riepilogo attività di autocontrollo</p>
            @if (selectedClient()) {
                <span class="bg-blue-500/20 text-blue-200 px-2 py-1 rounded border border-blue-400/30 font-black text-[9px] uppercase tracking-widest">
                  {{ selectedClient()?.name }}
                </span>
            }
          </div>
        </div>
        
        <div class="relative z-10 flex flex-col gap-2">
          <div class="flex items-center gap-3 bg-white/5 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-white">
            <i class="fa-solid fa-calendar-days text-blue-400"></i>
            <span class="font-bold">{{ state.filterDate() | date:'dd/MM/yyyy' }}</span>
          </div>
        </div>
      </div>

      <!-- Companies Accordion -->
      <div class="space-y-4">
        @for (report of companyReports(); track report.client.id) {
          @let isOpen = isCompanyExpanded(report.client.id);
          @let completionRate = (report.completedChecks / report.totalChecks * 100) || 0;

          <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:border-slate-300">
            
            <!-- Company Header -->
            <div class="relative bg-white px-5 py-4 cursor-pointer select-none transition-colors hover:bg-slate-50 border-l-[3px]"
                 [class.border-l-blue-500]="isOpen" [class.border-l-transparent]="!isOpen"
                 [class.bg-red-50]="report.client.suspended"
                 (click)="toggleCompany(report.client.id)">
               
               @if (report.client.suspended) {
                   <div class="absolute top-0 right-0 bg-red-500 text-white px-3 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-bl-lg">
                       SOSPESO
                   </div>
               }

               <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                   <div class="flex items-center gap-4 flex-1 w-full relative">
                       <div class="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                          <i class="fa-solid fa-building text-base"></i>
                       </div>
                       
                       <div class="flex-1 min-w-0 pr-12 md:pr-0">
                          <div class="flex items-center gap-3 mb-1">
                              <h3 class="font-bold text-base text-slate-800 truncate">{{ report.client.name }}</h3>
                              <span class="text-[9px] bg-slate-50 text-slate-500 border border-slate-200 px-2 py-0.5 rounded font-bold uppercase tracking-widest shrink-0">
                                  {{ report.users.length }} OPE.
                              </span>
                          </div>
                          
                          <div class="flex items-center gap-3 mt-1.5">
                              <div class="flex-1 max-w-[200px]">
                                  <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div class="h-full transition-all duration-500"
                                           [class.bg-emerald-500]="completionRate === 100"
                                           [class.bg-orange-500]="completionRate < 100"
                                           [style.width.%]="completionRate"></div>
                                  </div>
                              </div>
                              <span class="text-[10px] font-bold" [class.text-emerald-600]="completionRate === 100" [class.text-slate-500]="completionRate < 100">
                                  {{ completionRate | number:'1.0-0' }}% 
                                  <span class="text-slate-400">({{ report.completedChecks }}/{{ report.totalChecks }})</span>
                              </span>
                          </div>
                       </div>

                       <div class="absolute right-0 top-1/2 -translate-y-1/2 md:relative md:top-auto md:translate-y-0 w-8 h-8 flex items-center justify-center text-slate-400 transition-transform duration-300"
                            [class.rotate-180]="isOpen">
                           <i class="fa-solid fa-chevron-down text-sm"></i>
                       </div>
                   </div>

                   <!-- Print Button -->
                   <div (click)="$event.stopPropagation()" class="w-full md:w-auto mt-2 md:mt-0">
                       <button (click)="printReport(report)" 
                               class="w-full md:w-auto px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm">
                          <i class="fa-solid fa-print"></i> PDF/Stampa
                       </button>
                   </div>
               </div>
            </div>

            <!-- Users Detail (Accordion Body) -->
            @if (isOpen) {
                <div class="border-t border-slate-100 bg-slate-50/50 p-4 md:p-6 animate-slide-down">
                   @if (report.users.length === 0) {
                     <div class="text-center py-6 text-slate-400 bg-white border border-slate-100 rounded-lg">
                        <i class="fa-solid fa-users-slash text-2xl mb-2 text-slate-300"></i>
                        <p class="text-xs font-bold uppercase tracking-widest">Nessun operatore configurato</p>
                     </div>
                   } @else {
                     <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        @for (user of report.users; track user.id) {
                            <div class="bg-white rounded-lg p-4 border border-slate-200 hover:border-slate-300 transition-all">
                                <div class="flex items-start justify-between mb-3">
                                    <div class="min-w-0 pr-2">
                                        <h4 class="font-bold text-sm text-slate-800 truncate">{{ user.name }}</h4>
                                        <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{{ user.department }}</p>
                                    </div>
                                    <div class="text-right shrink-0">
                                        <div class="text-lg font-black leading-none" 
                                             [class.text-emerald-600]="user.checksCompleted === user.checksTotal"
                                             [class.text-orange-500]="user.checksCompleted < user.checksTotal">
                                            {{ user.checksCompleted }}/{{ user.checksTotal }}
                                        </div>
                                        <div class="text-[9px] text-slate-400 font-bold uppercase mt-1">Check</div>
                                    </div>
                                </div>
                                
                                <div class="h-1 bg-slate-100 rounded-full overflow-hidden mb-3">
                                    <div class="h-full transition-all"
                                         [class.bg-emerald-500]="user.checksCompleted === user.checksTotal"
                                         [class.bg-orange-500]="user.checksCompleted < user.checksTotal"
                                         [style.width.%]="(user.checksCompleted / user.checksTotal * 100)"></div>
                                </div>

                                <div class="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px]">
                                    <span class="text-slate-400 font-bold uppercase">Ultima att.</span>
                                    <span class="font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{{ user.lastActivity }}</span>
                                </div>
                            </div>
                        }
                     </div>
                   }
                </div>
            }
          </div>
        }

        @if (companyReports().length === 0) {
            <div class="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-sm">
                <div class="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                   <i class="fa-solid fa-folder-open text-2xl text-slate-300"></i>
                </div>
                <p class="text-sm font-bold text-slate-600 uppercase tracking-widest">Nessuna azienda nel sistema</p>
            </div>
        }
      </div>

      <!-- Print Template (Hidden) -->
      <div id="print-template" class="hidden">
        <!-- Will be populated dynamically -->
      </div>
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

    @media print {
      body * {
        visibility: hidden;
      }
      #print-template, #print-template * {
        visibility: visible;
      }
      #print-template {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
    }
  `]
})
export class ReportsViewComponent {
  state = inject(AppStateService);

  expandedCompanyIds = signal<Set<string>>(new Set());

  // Filter by global company selection
  selectedClient = computed(() => {
    const filterId = this.state.filterClientId();
    if (!filterId) return null;
    return this.state.clients().find(c => c.id === filterId) || null;
  });

  companyReports = computed((): CompanyReport[] => {
    const selectedClient = this.selectedClient();
    const clientsToShow = selectedClient ? [selectedClient] : this.state.clients();

    return clientsToShow.map(client => {
      const allClientUsers = this.state.systemUsers().filter(u => u.clientId === client.id);
      const userIds = allClientUsers.map(u => u.id);

      // Fetch real records for this client and date
      const clientRecords = this.state.checklistRecords().filter(r =>
        userIds.includes(r.userId) && r.date === this.state.filterDate()
      );

      const users = allClientUsers
        .filter(u => u.role !== 'ADMIN')
        .map(u => {
          const userRecords = clientRecords.filter(r => r.userId === u.id);
          return {
            id: u.id,
            name: u.name,
            department: u.department || 'Generale',
            checksCompleted: userRecords.length,
            checksTotal: 14, // Assuming 14 standard modules for now or based on menu
            lastActivity: userRecords.length > 0 ?
              new Date(userRecords[userRecords.length - 1].timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) :
              'Nessuna'
          };
        });

      const totalChecks = users.reduce((acc, u) => acc + u.checksTotal, 0);
      const completedChecks = users.reduce((acc, u) => acc + u.checksCompleted, 0);

      const detailedChecks = clientRecords.map(r => {
        const user = allClientUsers.find(u => u.id === r.userId);
        const module = this.state.menuItems.find(m => m.id === r.moduleId);
        return {
          userName: user?.name || 'Utente',
          moduleName: module?.label || r.moduleId,
          timestamp: r.timestamp,
          data: r.data
        };
      });

      return { client, users, totalChecks, completedChecks, detailedChecks };
    });
  });

  isCompanyExpanded(id: string): boolean {
    return this.expandedCompanyIds().has(id);
  }

  toggleCompany(id: string) {
    this.expandedCompanyIds.update(set => {
      const newSet = new Set(set);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  getRandomTime(): string {
    const hours = Math.floor(Math.random() * 12) + 1;
    return `${hours}h fa`;
  }

  printReport(report: CompanyReport) {
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

  generatePrintHTML(report: any): string {
    const date = new Date(this.state.filterDate()).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    const logo = report.client.logo || this.state.currentLogo();

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Autocontrollo HACCP - ${report.client.name}</title>
        <style>
          @page { size: A4; margin: 1.5cm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; line-height: 1.5; margin: 0; padding: 0; }
          .a4-container { width: 100%; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: start; }
          .logo-container { display: flex; align-items: center; gap: 15px; }
          .logo-img { width: 60px; height: 60px; border-radius: 12px; object-fit: contain; }
          .brand-title { font-size: 24px; font-weight: 800; color: #0f172a; }
          .header-meta { text-align: right; font-size: 12px; color: #64748b; }
          
          .report-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 15px; border: 1px solid #e2e8f0; }
          .info-block h3 { font-size: 18px; margin: 0 0 5px; color: #0f172a; }
          .info-block p { margin: 2px 0; font-size: 13px; color: #475569; }
          
          .section-title { font-size: 16px; font-weight: 800; text-transform: uppercase; color: #0f172a; border-left: 4px solid #3b82f6; padding-left: 10px; margin: 30px 0 15px; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px; }
          th { background: #f1f5f9; padding: 10px; text-align: left; font-weight: 700; border-bottom: 1px solid #cbd5e1; color: #475569; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
          
          .check-detail { margin-bottom: 15px; padding: 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; }
          .check-header { display: flex; justify-content: space-between; font-weight: 700; font-size: 11px; margin-bottom: 8px; color: #334155; border-bottom: 1px dashed #e2e8f0; padding-bottom: 5px; }
          .check-body { font-size: 11px; color: #1e293b; }
          .data-item { display: inline-block; margin-right: 20px; }
          .data-label { color: #64748b; font-weight: normal; }
          .data-value { font-weight: 600; }
          
          .signature-section { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
          .sig-box { border-top: 1px solid #94a3b8; padding-top: 10px; text-align: center; font-size: 11px; color: #64748b; }
          
          .footer { position: fixed; bottom: 1.5cm; left: 1.5cm; right: 1.5cm; font-size: 10px; text-align: center; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 10px; }
          
          @media print {
            .no-print { display: none; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="a4-container">
          <div class="header">
            <div class="logo-container">
              <img src="${logo}" class="logo-img">
              <div>
                <div class="brand-title">HACCP PRO</div>
                <div style="font-size: 10px; color: #64748b;">Software di Gestione Sicurezza Alimentare</div>
              </div>
            </div>
            <div class="header-meta">
              <div>Documento: Registro Autocontrollo</div>
              <div>Versione: 2.0.1</div>
              <div>Data emissione: ${new Date().toLocaleDateString('it-IT')}</div>
            </div>
          </div>

          <div class="report-info">
            <div class="info-block">
              <h3>${report.client.name}</h3>
              <p>P.IVA: ${report.client.piva}</p>
              <p>Indirizzo: ${report.client.address}</p>
            </div>
            <div style="text-align: right;">
              <p><strong>DATA REGISTRAZIONE:</strong></p>
              <p style="font-size: 20px; font-weight: 800; color: #3b82f6;">${date}</p>
            </div>
          </div>

          <div class="section-title">Riepilogo Avanzamento Giornaliero</div>
          <table>
            <thead>
              <tr>
                <th>Operatore Responsabile</th>
                <th>Reparto / Funzione</th>
                <th>Check Eseguiti</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              ${report.users.map((user: any) => `
                <tr>
                  <td><strong>${user.name}</strong></td>
                  <td>${user.department}</td>
                  <td>${user.checksCompleted} / ${user.checksTotal}</td>
                  <td>
                    <span style="color: ${user.checksCompleted === user.checksTotal ? '#10b981' : '#f59e0b'}; font-weight: 800;">
                      ${user.checksCompleted === user.checksTotal ? 'COMPLETATO' : 'IN CORSO'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="section-title">Registro Attività Dettagliato</div>
          ${report.detailedChecks.length === 0 ? `
            <p style="text-align: center; color: #94a3b8; padding: 20px;">Nessuna attività registrata per la data selezionata.</p>
          ` : `
            ${report.detailedChecks.map((check: any) => `
              <div class="check-detail">
                <div class="check-header">
                  <span>MODULO: ${check.moduleName}</span>
                  <span>ESECUTO DA: ${check.userName} • ORE: ${new Date(check.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div class="check-body">
                  ${this.formatCheckData(check.data)}
                </div>
              </div>
            `).join('')}
          `}

          <div class="signature-section">
            <div class="sig-box">
              <p><strong>Firma Operatore Responsabile</strong></p>
              <div style="height: 60px;"></div>
            </div>
            <div class="sig-box">
              <p><strong>Visto del Responsabile HACCP</strong></p>
              <div style="height: 60px;"></div>
            </div>
          </div>

          <div class="footer">
             HACCP Pro - Documento generato elettronicamente conforme ai requisiti del Reg. CE 852/04. 
             Pagina 1 di 1
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private formatCheckData(data: any): string {
    if (!data) return 'Nessun dato';

    // Handle array of check items (id, label, checked)
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0].hasOwnProperty('label')) {
      return data
        .map((item: any) => {
          const status = item.checked ? '✅ CONFORME' : '❌ NON CONFORME';
          return `<span class="data-item"><span class="data-label">${item.label}:</span> <span class="data-value">${status}</span></span>`;
        })
        .join(' ');
    }

    // Default object handling
    return Object.entries(data)
      .map(([key, value]) => {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        let formattedValue = value;
        if (value === true) formattedValue = '✅ CONFORME';
        if (value === false) formattedValue = '❌ NON CONFORME';
        if (Array.isArray(value)) formattedValue = value.join(', ');

        return `<span class="data-item"><span class="data-label">${label}:</span> <span class="data-value">${formattedValue}</span></span>`;
      })
      .join(' ');
  }
}
