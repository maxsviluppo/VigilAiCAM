
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService, SystemUser } from '../services/app-state.service';
import { ToastService } from '../services/toast.service';

interface CollaboratorActivity {
  userId: string;
  userName: string;
  avatar: string;
  lastActivity: string;
  tasksCompleted: number;
  tasksPending: number;
  status: 'active' | 'inactive' | 'warning';
  department: string;
}

interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  userId?: string;
  userName?: string;
  timestamp: string;
  actionable: boolean;
}

@Component({
  selector: 'app-dashboard-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6 animate-fade-in p-4 pb-12 max-w-7xl mx-auto">
      
      <!-- Sleek Professional Header -->
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div class="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none"></div>
        <div class="flex items-center gap-5 relative z-10">
          <div class="h-14 w-14 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-md">
             <i class="fa-solid fa-shapes text-2xl"></i>
          </div>
          <div>
            <h2 class="text-2xl font-bold text-slate-800 tracking-tight">Dashboard Amministrativa</h2>
            <p class="text-sm font-medium text-slate-500 mt-1">Sintesi direzionale e controllo stato conformità</p>
          </div>
        </div>
        <div class="flex items-center gap-4 relative z-10 bg-slate-50 px-5 py-3 rounded-xl border border-slate-100">
           <div class="text-right flex flex-col justify-center">
             <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 leading-none">Aggiornamento live</p>
             <p class="text-sm font-bold text-slate-700 leading-none">{{ getCurrentDate() }}</p>
           </div>
           <div class="h-10 w-10 flex items-center justify-center bg-white rounded-full border border-slate-200 text-blue-600 shadow-sm shrink-0">
             <i class="fa-regular fa-clock"></i>
           </div>
        </div>
      </div>
      
      <!-- Compact KPI Summary Bar -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Aziende -->
        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
           <div>
             <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Aziende Associate</p>
             <p class="text-2xl font-bold text-slate-800">{{ getFilteredClientsCount() }}</p>
           </div>
           <div class="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
             <i class="fa-solid fa-building"></i>
           </div>
        </div>
        <!-- Contabilità -->
        <div (click)="state.setModule('accounting')" class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors">
           <div>
             <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status Contabile</p>
             <p class="text-2xl font-bold text-emerald-600">{{ getFinancialStatus() }}</p>
           </div>
           <div class="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
             <i class="fa-solid fa-file-invoice-dollar"></i>
           </div>
        </div>
        <!-- Documenti -->
        <div (click)="state.setModule('documentation')" class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors">
           <div>
             <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Documenti Validi</p>
             <p class="text-2xl font-bold text-slate-800">{{ state.filteredDocuments().length }}</p>
           </div>
           <div class="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
             <i class="fa-solid fa-folder-open"></i>
           </div>
        </div>
        <!-- Alert Critici -->
        <div (click)="scrollToAlerts()" class="bg-white p-5 rounded-2xl shadow-sm border border-red-100 flex items-center justify-between cursor-pointer hover:border-red-200 transition-colors">
           <div>
             <p class="text-[11px] font-bold text-red-500 uppercase tracking-wider mb-1">Alert Critici</p>
             <p class="text-2xl font-bold" [class]="criticalAlerts().length > 0 ? 'text-red-600' : 'text-slate-800'">{{ criticalAlerts().length }}</p>
           </div>
           <div class="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 shrink-0">
             <i class="fa-solid fa-triangle-exclamation"></i>
           </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Left Column -->
        <div class="lg:col-span-2 space-y-6">
          
          <!-- Operations Overview (Timeline-lite) -->
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div class="flex items-center justify-between mb-6">
               <h3 class="text-lg font-bold text-slate-800 tracking-tight">Avanzamento Operativo Odierno</h3>
               <div class="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                 <i class="fa-solid fa-chart-line text-blue-500"></i> Riepilogo Globale
               </div>
            </div>
                        <div class="space-y-5">
                @for (phase of [
                   {id: 'pre', label: 'Apertura (Pre-Op)', data: phaseRecap().pre, color: 'text-sky-600', bgFill: 'bg-sky-500'},
                   {id: 'op', label: 'Monitoraggio (Op)', data: phaseRecap().op, color: 'text-indigo-600', bgFill: 'bg-indigo-500'},
                   {id: 'post', label: 'Chiusura (Post-Op)', data: phaseRecap().post, color: 'text-purple-600', bgFill: 'bg-purple-500'}
                 ]; track phase.id) {
                 <div class="flex items-center gap-4">
                   <div class="w-40 flex-shrink-0">
                     <p class="text-sm font-semibold text-slate-700">{{ phase.label }}</p>
                     <p class="text-[10px] text-slate-500 uppercase tracking-wide">
                        {{ phase.data.count }} su {{ phase.data.total }} operazioni
                     </p>
                   </div>
                   <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div class="h-full rounded-full transition-all duration-1000" [class]="phase.bgFill" [style.width.%]="phase.data.pct"></div>
                   </div>
                   <div class="w-12 text-right">
                     <span class="text-sm font-bold text-slate-700 tabular-nums">{{ (phase.data.pct | number:'1.0-0') }}%</span>
                   </div>
                 </div>
                }
             </div>
          </div>

          <!-- Quick Access Links -->
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 class="text-lg font-bold text-slate-800 tracking-tight mb-6">Moduli Gestionali</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              @for (action of [
                {id: 'accounting', label: 'Contabilità', icon: 'fa-calculator'},
                {id: 'collaborators', label: 'Collaboratori', icon: 'fa-users-gear'},
                {id: 'documentation', label: 'Archivio', icon: 'fa-box-archive'},
                {id: 'settings', label: 'Impostazioni', icon: 'fa-sliders'},
                {id: 'reports', label: 'Report', icon: 'fa-file-signature'},
                {id: 'general-checks', label: 'Check Generali', icon: 'fa-list-check'}
              ]; track action.id) {
                <button (click)="state.setModule(action.id)" class="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all text-center group">
                   <i class="fa-solid {{ action.icon }} text-xl text-slate-400 group-hover:text-blue-600 mb-2 transition-colors"></i>
                   <span class="text-xs font-semibold text-slate-700">{{ action.label }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Recent Documents Snippet -->
          @if (state.filterCollaboratorId() && recentDocuments().length > 0) {
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div class="flex items-center justify-between mb-4">
               <h3 class="text-lg font-bold text-slate-800 tracking-tight">Ultimi Documenti</h3>
               <button (click)="state.setModule('documentation')" class="text-xs font-semibold text-blue-600 hover:text-blue-800">Vedi tutti &rarr;</button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
               @for (doc of recentDocuments(); track doc.id) {
                 <div (click)="state.setModule('documentation')" class="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-3 cursor-pointer hover:bg-white hover:border-slate-300 transition-colors">
                    <i class="fa-regular fa-file-pdf text-red-500 text-lg"></i>
                    <div class="overflow-hidden">
                      <p class="text-xs font-bold text-slate-700 truncate">{{ doc.fileName }}</p>
                      <p class="text-[10px] text-slate-500">{{ doc.uploadDate | date:'dd MMM HH:mm' }}</p>
                    </div>
                 </div>
               }
            </div>
          </div>
          }

        </div>

        <!-- Right Side Sidebar -->
        <div class="space-y-6" id="alerts-section">
          
          <!-- Export & Compliance Action Card -->
          <div class="bg-slate-900 rounded-2xl p-6 shadow-md text-white border border-slate-800 relative overflow-hidden">
            <div class="absolute right-0 top-0 h-32 w-32 bg-blue-500/20 rounded-full blur-2xl"></div>
            <h3 class="text-lg font-bold mb-2 relative z-10 tracking-tight">Esportazione Ufficiale</h3>
            <p class="text-xs text-slate-400 mb-6 relative z-10">Genera i registri conformi in formato PDF per la giornata odierna.</p>
            
            <div class="space-y-3 relative z-10">
                 <button (click)="printDailyReport()" class="w-full py-3 bg-white hover:bg-slate-100 text-slate-900 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm">
                   <i class="fa-solid fa-file-pdf text-red-500"></i> GENERA REPORTE PDF
                 </button>
            </div>
          </div>

          <!-- Alerts Summary -->
          <div class="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[400px]">
            <div class="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
               <h3 class="text-base font-bold text-slate-800 tracking-tight">Notifiche di Sistema</h3>
               <span class="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-md">{{ systemAlerts().length }}</span>
            </div>
            <div class="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
               @if (systemAlerts().length === 0) {
                 <div class="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                   <div class="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                     <i class="fa-solid fa-check text-xl text-emerald-400"></i>
                   </div>
                   <p class="text-sm font-bold text-slate-600">Nessuna segnalazione</p>
                   <p class="text-xs">Tutti i sistemi sono nella norma.</p>
                 </div>
               } @else {
                 @for (alert of systemAlerts(); track alert.id) {
                   <div class="p-3 rounded-xl border text-sm"
                        [class.bg-red-50]="alert.type === 'error'" [class.border-red-100]="alert.type === 'error'"
                        [class.bg-orange-50]="alert.type === 'warning'" [class.border-orange-100]="alert.type === 'warning'"
                        [class.bg-blue-50]="alert.type === 'info'" [class.border-blue-100]="alert.type === 'info'">
                      <div class="flex items-start gap-3">
                        <i class="fa-solid mt-0.5" [class.fa-circle-xmark]="alert.type === 'error'" [class.text-red-500]="alert.type === 'error'"
                           [class.fa-triangle-exclamation]="alert.type === 'warning'" [class.text-orange-500]="alert.type === 'warning'"
                           [class.fa-info-circle]="alert.type === 'info'" [class.text-blue-500]="alert.type === 'info'"></i>
                        <div class="flex-1">
                          <h4 class="font-bold text-slate-800 text-xs mb-1">{{ alert.title }}</h4>
                          <p class="text-[11px] text-slate-600 leading-snug">{{ alert.message }}</p>
                          <div class="flex items-center justify-between mt-2 pt-2 border-t" [class.border-red-200]="alert.type === 'error'" [class.border-orange-200]="alert.type === 'warning'" [class.border-blue-200]="alert.type === 'info'">
                            <span class="text-[9px] text-slate-500 font-semibold">{{ alert.userName || 'Sistema' }} • {{ alert.timestamp }}</span>
                            @if (alert.actionable) {
                              <button (click)="openUserProfile(alert.userId || '')" class="text-[10px] font-bold text-blue-600 hover:underline">Verifica</button>
                            }
                          </div>
                        </div>
                      </div>
                   </div>
                 }
               }
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 5px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
    .shadow-3xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
    .shadow-glow-blue { box-shadow: 0 0 15px rgba(59, 130, 246, 0.5); }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-in { animation: fadeIn 0.4s ease-out; }
  `]
})
export class DashboardViewComponent {
  state = inject(AppStateService);
  private toastService = inject(ToastService);



  // --- KPI Methods ---
  getFilteredClientsCount() {
    if (this.state.filterCollaboratorId()) {
      const user = this.state.systemUsers().find(u => u.id === this.state.filterCollaboratorId());
      return user?.clientId ? 1 : 0;
    }
    return this.state.clients().length;
  }

  getFinancialStatus() {
    if (this.state.filterCollaboratorId()) {
      const user = this.state.systemUsers().find(u => u.id === this.state.filterCollaboratorId());
      return user ? 'Regolare' : 'Pending';
    }
    return 'Pending';
  }

  getCurrentDate(): string {
    const d = this.state.filterDate();
    return new Date(d).toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  getCurrentDateShort(): string {
    return new Date(this.state.filterDate()).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  }

  // --- Report Methods ---


  printDailyReport() {
    const currentCompanyId = this.state.companyConfig()?.id;
    if (!currentCompanyId) return;

    const client = this.state.clients().find(c => c.id === currentCompanyId);
    if (!client) return;

    const allClientUsers = this.state.systemUsers().filter(u => u.clientId === client.id);
    const userIds = allClientUsers.map(u => u.id);

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
          checksTotal: 3,
          lastActivity: userRecords.length > 0 ?
            new Date(userRecords[userRecords.length - 1].timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) :
            'Nessuna'
        };
      });

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

    const report = {
      client,
      users,
      totalChecks: users.reduce((acc, u) => acc + u.checksTotal, 0),
      completedChecks: users.reduce((acc, u) => acc + u.checksCompleted, 0),
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

  // --- Signals & Computeds ---
  filteredUsers = computed(() => {
    const allUsers = this.state.systemUsers();
    const currentFilterId = this.state.filterCollaboratorId();
    const currentCompanyId = this.state.companyConfig()?.id;

    if (!this.state.isAdmin()) {
      const currentUser = this.state.currentUser();
      return currentUser ? [currentUser] : [];
    }

    let users = allUsers;

    if (currentFilterId) {
      users = allUsers.filter(u => u.id === currentFilterId);
    } else if (currentCompanyId) {
      users = allUsers.filter(u => u.clientId === currentCompanyId && u.role !== 'ADMIN');
    }

    return users;
  });

  collaboratorActivities = computed((): CollaboratorActivity[] => {
    const allRecords = this.state.checklistRecords();
    const currentDate = this.state.filterDate();

    return this.filteredUsers().map(user => {
      const phaseIds = ['pre-op-checklist', 'operative-checklist', 'post-op-checklist'];
      const userPhaseRecords = allRecords.filter(r =>
        r.userId === user.id &&
        r.date === currentDate &&
        phaseIds.includes(r.moduleId)
      );

      const completedPhases = new Set(userPhaseRecords.map(r => r.moduleId)).size;
      const hasIssues = userPhaseRecords.some(r => r.data.status === 'Non Conforme');
      const latestRecord = userPhaseRecords.length > 0 ? userPhaseRecords[userPhaseRecords.length - 1] : null;

      return {
        userId: user.id,
        userName: user.name,
        avatar: user.avatar,
        lastActivity: latestRecord ?
          new Date(latestRecord.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) :
          'Inattivo',
        tasksCompleted: completedPhases,
        tasksPending: 3 - completedPhases,
        status: userPhaseRecords.length > 0 ? (hasIssues ? 'warning' : 'active') : 'inactive',
        department: user.department || 'Generale'
      };
    });
  });

  kpiData = computed(() => {
    const recap = this.phaseRecap();
    const totalPossible = recap.pre.total + recap.op.total + recap.post.total;
    const totalCompleted = recap.pre.count + recap.op.count + recap.post.count;

    return {
      completed: totalCompleted,
      total: totalPossible || 3,
      activeUsers: this.collaboratorActivities().filter(a => a.status !== 'inactive').length
    };
  });

  systemAlerts = computed((): SystemAlert[] => {
    const alerts: SystemAlert[] = [];
    const allRecords = this.state.checklistRecords();
    const currentDate = this.state.filterDate();
    const users = this.filteredUsers();
    const userIds = users.map(u => u.id);

    const relevantRecords = allRecords.filter(r =>
      userIds.includes(r.userId) &&
      r.date === currentDate
    );

    relevantRecords.forEach(record => {
      if (record.data.status === 'Non Conforme') {
        const user = users.find(u => u.id === record.userId);
        alerts.push({
          id: `nc-${record.id}`,
          type: 'error',
          title: `Anomalia in ${this.getModuleName(record.moduleId)}`,
          message: record.data.summary || 'Rilevata non conformità durante l\'ispezione.',
          userId: record.userId,
          userName: user?.name,
          timestamp: new Date(record.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
          actionable: true
        });
      }
    });

    users.forEach(user => {
      const userRecords = relevantRecords.filter(r => r.userId === user.id);
      const phasesMissing = [];

      if (!userRecords.some(r => r.moduleId === 'pre-op-checklist')) phasesMissing.push('Pre-operativa');
      if (!userRecords.some(r => r.moduleId === 'operative-checklist')) phasesMissing.push('Operativa');
      if (!userRecords.some(r => r.moduleId === 'post-op-checklist')) phasesMissing.push('Post-operativa');

      if (phasesMissing.length > 0 && phasesMissing.length < 3) {
        alerts.push({
          id: `missing-${user.id}`,
          type: 'warning',
          title: 'Fasi Mancanti',
          message: `${user.name} deve completare: ${phasesMissing.join(', ')}`,
          userId: user.id,
          userName: user.name,
          timestamp: 'Oggi',
          actionable: true
        });
      }
    });

    return alerts;
  });

  criticalAlerts = computed(() =>
    this.systemAlerts().filter(a => a.type === 'error')
  );

  phaseRecap = computed(() => {
    const allRecords = this.state.checklistRecords();
    const currentDate = this.state.filterDate();
    
    // Determine the relevant clients (base entities)
    const currentCompanyId = this.state.companyConfig()?.id;
    let targetClients = this.state.clients();
    
    if (currentCompanyId) {
      targetClients = targetClients.filter(c => c.id === currentCompanyId);
    }
    
    const allEquipment = this.state.selectedEquipment();

    const getModulePossibleChecks = (clientId: string, moduleId: string) => {
      const clientEquipmentCount = allEquipment.filter(e => {
        const cid = (e as any).client_id || (e as any).clientId;
        return String(cid) === String(clientId);
      }).length;

      if (moduleId === 'pre-op-checklist') return 42 + (clientEquipmentCount * 2);
      if (moduleId === 'operative-checklist') return 2 + clientEquipmentCount;
      if (moduleId === 'post-op-checklist') return 22 + (clientEquipmentCount * 2);
      return 1;
    };

    const countCompletedItemsInRecord = (record: any) => {
      const data = record.data;
      if (!data) return 0;
      if (record.moduleId === 'pre-op-checklist') {
        const areaDone = (data.areas || []).reduce((acc: number, a: any) => acc + (a.steps || []).filter((s: any) => s.status !== 'pending').length, 0);
        const globalDone = (data.globalItems || []).filter((i: any) => i.status !== 'pending').length;
        return areaDone + globalDone;
      }
      if (record.moduleId === 'operative-checklist') {
        return (data.items || []).filter((i: any) => i.status !== 'pending').length;
      }
      if (record.moduleId === 'post-op-checklist') {
        return (data.areas || []).reduce((acc: number, a: any) => acc + (a.steps || []).filter((s: any) => s.status !== 'pending').length, 0);
      }
      return 0;
    };

    const getPhaseStats = (moduleId: string) => {
      const moduleRecords = allRecords.filter(r => r.moduleId === moduleId && r.date === currentDate);
      let totalPossible = 0;
      let totalDone = 0;
      let issueCount = 0;

      targetClients.forEach(client => {
        totalPossible += getModulePossibleChecks(client.id, moduleId);
        const clientRec = moduleRecords.find(r => {
           const user = this.state.systemUsers().find(u => u.id === r.userId);
           return user?.clientId === client.id;
        });
        if (clientRec) {
          totalDone += countCompletedItemsInRecord(clientRec);
          const hasIssue = (clientRec.data?.status === 'Non Conforme' || clientRec.data?.areas?.some((a: any) => a.steps?.some((s: any) => s.status === 'issue')) || clientRec.data?.items?.some((i: any) => i.status === 'issue'));
          if (hasIssue) issueCount++;
        }
      });

      return {
        pct: totalPossible > 0 ? (totalDone / totalPossible) * 100 : 0,
        count: totalDone,
        total: totalPossible,
        issues: issueCount
      };
    };

    return {
      pre: getPhaseStats('pre-op-checklist'),
      op: getPhaseStats('operative-checklist'),
      post: getPhaseStats('post-op-checklist')
    };
  });

  recentDocuments = computed(() => {
    return this.state.filteredDocuments()
      .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
      .slice(0, 5);
  });

  // --- Utility Methods ---
  getModuleName(id: string) {
    switch (id) {
      case 'pre-op-checklist': return 'Fase Pre-operativa';
      case 'operative-checklist': return 'Fase Operativa';
      case 'post-op-checklist': return 'Fase Post-operativa';
      default: return id;
    }
  }

  openUserProfile(userId: string) {
    this.state.setModule('collaborators');
  }

  scrollToAlerts() {
    document.getElementById('alerts-section')?.scrollIntoView({ behavior: 'smooth' });
  }

  private generatePrintHTML(report: any): string {
    const dateStr = new Date(this.state.filterDate()).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
    const logo = this.state.currentLogo();
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Report - ${report.client.name}</title>
        <style>
          body { font-family: sans-serif; padding: 2cm; color: #334155; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 20px; display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
          th { background: #f8fafc; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Report HACCP</h1>
          <div>${dateStr}</div>
        </div>
        <h2>${report.client.name}</h2>
        <p>Documento generato per l'unità operativa selezionata.</p>
        <table>
          <thead><tr><th>Utente</th><th>Modulo</th><th>Stato</th></tr></thead>
          <tbody>
            ${report.detailedChecks.map((c: any) => `
              <tr><td>${c.userName}</td><td>${c.moduleName}</td><td>Completato</td></tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
  }
}
