# Relazione di Allineamento Codici: VigilAI (PC) e VigilAI_Raspberry (Raspberry)

Questo documento spiega la struttura del progetto e la relazione tra le due cartelle per evitare errori di allineamento futuri.

## 📌 Relazione tra i progetti
1. **`VigilAI` (C:\Users\Max\Downloads\A Codici Main\VigilAI)**:
   * Rappresenta la **sorgente principale (PC)** del progetto.
   * Viene utilizzata per la versione desktop/web standard.
   
2. **`VigilAI_Raspberry` (C:\Users\Max\Downloads\A Codici Main\VigilAI_Raspberry)**:
   * È la versione derivata e configurata specificamente per l'hardware **Raspberry Pi 5** e lo schermo **MHS 3.5" Touchscreen**.
   * Contiene script di avvio kiosk (`install_pi.sh`, `vigilai.service`, ecc.).

## 🔄 Regola di Sviluppo ed Allineamento
* **Sincronia del Codice**: Le modifiche effettuate su una delle due versioni (es. adattamenti mobile, fix SMTP, diagnostica di rete, salvataggio globale delle impostazioni) **devono sempre essere allineate** tra le due cartelle per evitare regressioni o disallineamenti di codice.
* **File da allineare**:
  * `src/App.tsx`
  * `src/index.css`
  * `server.ts`
  
* **Caricamento su GitHub**:
  * Quando effettui aggiornamenti per la versione PC su GitHub, assicurati che i file in `VigilAI` contengano sempre le ultime modifiche mutuate/sviluppate in `VigilAI_Raspberry`.
