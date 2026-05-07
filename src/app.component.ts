
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService, MenuItem } from './services/app-state.service';
import { DashboardViewComponent } from './components/dashboard-view.component';
import { OperatorDashboardViewComponent } from './components/operator-dashboard-view.component';
import { ReportsViewComponent } from './components/reports-view.component';
import { GeneralChecksViewComponent } from './components/general-checks-view.component';
import { GenericModuleComponent } from './components/generic-module.component';
import { SettingsViewComponent } from './components/settings-view.component';
import { CollaboratorsViewComponent } from './components/collaborators-view.component';
import { AccountingViewComponent } from './components/accounting-view.component';
import { PreOperationalChecklistComponent } from './components/checklists/pre-operative.component';
import { OperativeChecklistComponent } from './components/checklists/operative.component';
import { PostOperationalChecklistComponent } from './components/checklists/post-operative.component';

import { SuppliersViewComponent } from './components/suppliers-view.component';
import { NonComplianceViewComponent } from './components/non-compliance-view.component';
import { CleaningMaintenanceViewComponent } from './components/cleaning-maintenance-view.component';
import { MicrobioMonitorViewComponent } from './components/microbio-monitor-view.component';
import { MessagesViewComponent } from './components/messages-view.component';
import { DocumentationViewComponent } from './components/documentation-view.component';
import { ProductionLogViewComponent } from './components/production-log-view.component';
import { ToastContainerComponent } from './components/toast-container.component';
import { ChecklistHistoryComponent } from './components/checklist-history.component';
import { TemperaturesViewComponent } from './components/temperatures-view.component';
import { EquipmentCensusViewComponent } from './components/equipment-census-view.component';
import { EquipmentViewComponent } from './components/equipment-view.component';
import { PestControlViewComponent } from './components/pest-control-view.component';
import { StaffHygieneViewComponent } from './components/staff-hygiene-view.component';
import { AllergensConfigViewComponent } from './components/allergens-config-view.component';
import { CleaningProductsViewComponent } from './components/cleaning-products-view.component';
import { IngredientsBookViewComponent } from './components/ingredients-book-view.component';
import { OperationalPhasesConfigViewComponent } from './components/operational-phases-config-view.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    DashboardViewComponent,
    OperatorDashboardViewComponent,
    ReportsViewComponent,
    GeneralChecksViewComponent,
    GenericModuleComponent,
    SettingsViewComponent,
    CollaboratorsViewComponent,
    AccountingViewComponent,
    PreOperationalChecklistComponent,
    OperativeChecklistComponent,
    PostOperationalChecklistComponent,

    SuppliersViewComponent,
    NonComplianceViewComponent,
    CleaningMaintenanceViewComponent,
    MicrobioMonitorViewComponent,
    MessagesViewComponent,
    DocumentationViewComponent,
    ProductionLogViewComponent,
    ToastContainerComponent,
    ChecklistHistoryComponent,
    TemperaturesViewComponent,
    EquipmentCensusViewComponent,
    EquipmentViewComponent,
    PestControlViewComponent,
    StaffHygieneViewComponent,
    AllergensConfigViewComponent,
    CleaningProductsViewComponent,
    IngredientsBookViewComponent,
    OperationalPhasesConfigViewComponent
  ],
  templateUrl: './app.component.html'
})
export class AppComponent {
  state = inject(AppStateService);

  getItemsByCategory(category: string): MenuItem[] {
    return this.state.menuItems.filter(item => item.category === category);
  }

  hasAccessToCategory(category: string): boolean {
    if (this.state.isAdmin()) {
      return ['dashboard', 'monitoring', 'history', 'production', 'config', 'communication', 'documentation', 'operations'].includes(category);
    }
    return ['dashboard', 'operations', 'history', 'production', 'config', 'communication', 'documentation'].includes(category);
  }
  loginMode = signal<'SELECT' | 'ADMIN' | 'OPERATOR'>('SELECT');
  loginUsername = signal('');
  loginPassword = signal('');
  loginError = signal(false);
  showPassword = signal(false);
  isMobileMenuOpen = signal(false);

  visibleMenuItems = computed(() => {
    return this.state.menuItems.filter(item =>
      this.shouldShowMenuItem(item)
    );
  });

  getClientName(id?: string) {
    if (!id) return '';
    const c = this.state.clients().find(c => c.id === id);
    return c ? c.name : '';
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.update(v => !v);
  }

  setLoginMode(mode: 'SELECT' | 'ADMIN' | 'OPERATOR') {
    this.loginMode.set(mode);
    this.loginUsername.set('');
    this.loginPassword.set('');
    this.loginError.set(false);
    this.showPassword.set(false);
  }

  doLogin() {
    const success = this.state.loginWithCredentials(this.loginUsername(), this.loginPassword());
    if (!success) {
      this.loginError.set(true);
    } else {
      this.setLoginMode('SELECT');
    }
  }

  // --- Template Helpers ---

  shouldShowMenuItem(item: MenuItem): boolean {
    if (item.adminOnly && !this.state.isAdmin()) return false;
    if (item.operatorOnly && this.state.isAdmin()) return false;

    // Phase specific check
    const config = this.state.operationalPhasesConfig();
    if (config && (item.id in config)) {
      if (config[item.id]?.enabled === false) return false;
    }

    return this.hasAccessToCategory(item.category);
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'operations': 'Fasi Operative',
      'monitoring': 'Monitoraggio Operatori',
      'history': 'Archivio Storico',
      'production': 'Rintracciabilità',
      'config': 'Configurazione',
      'communication': 'Comunicazioni',
      'documentation': 'Archivio Documentale',
      'dashboard': 'Panoramica'
    };
    return labels[category] || category;
  }

  getDataboardTitle(): string {
    const modId = this.state.currentModuleId();
    const item = this.state.menuItems.find(i => i.id === modId);
    return item ? item.label : (modId === 'dashboard' ? 'Dashboard Admin' : (modId === 'operator-dashboard' ? 'Centro Operativo' : modId));
  }
}
