# Strategia di Distribuzione Semplificata per VigilAI

Questo piano descrive le opzioni e l'architettura per consentire l'installazione di VigilAI presso i clienti aziendali in modo rapido, automatizzato e senza configurazioni manuali.

---

## Opzioni di Distribuzione Proposte

Abbiamo tre strade principali per semplificare la distribuzione. La soluzione migliore e più professionale è una combinazione delle tre:

### Opzione 1: Clonazione di un'Immagine SD "Master" (Plug-and-Play)
Consiste nel preparare un singolo Raspberry Pi in modo perfetto (sistema operativo, VigilAI installato, icona sul desktop configurata) e poi "clonare" la scheda SD per creare un file immagine (`.img` o `.zip`) da installare sulle schede SD dei nuovi Raspberry.

* **Come funziona per te:**
  1. Configuri un Raspberry Pi di riferimento.
  2. Spegni il Raspberry, inserisci la scheda SD nel tuo PC.
  3. Usi un programma gratuito come **Win32DiskImager** (su Windows) per leggere la scheda SD e salvarla come file `.img` sul tuo PC (es. `VigilAI_Master.img`).
  4. Comprimi il file `.img` in un file `.zip` (la dimensione si ridurrà drasticamente perché lo spazio vuoto viene compresso a zero).
* **Come funziona per l'installazione aziendale:**
  * Prendi una nuova scheda SD, la inserisci nel PC e tramite **Raspberry Pi Imager** o **BalenaEtcher** scrivi il file `.zip` sulla scheda.
  * Inserisci la scheda nel nuovo Raspberry ed è già tutto configurato e funzionante (Icona desktop presente, servizio attivo all'avvio).

---

### Opzione 2: Script di Installazione Remota a Riga Singola (1-Click Installer)
Se non puoi usare l'immagine clonata (ad esempio se i clienti hanno già il loro sistema operativo e vogliono solo aggiungere VigilAI), creiamo uno script bash ospitato online. Il cliente dovrà solo aprire il terminale sul Raspberry e lanciare un solo comando.

* **Esempio di comando:**
  ```bash
  curl -sSL https://raw.githubusercontent.com/tuo-profilo/vigilai-dist/main/setup.sh | bash
  ```
* **Cosa fa lo script in automatico:**
  1. Rileva il sistema operativo e scarica le dipendenze (`Node.js`, `FFmpeg`, `Git`, `build-essential`).
  2. Scarica i file di VigilAI nella cartella corretta.
  3. Esegue `npm install` e `npm run build` compilando tutto in locale.
  4. Rileva automaticamente se il browser si chiama `chromium` o `chromium-browser` e crea la scorciatoia funzionante sul Desktop.
  5. Installa e attiva il servizio di background `vigilai.service`.

---

### Opzione 3: Pannello Web di Prima Configurazione (Setup Wizard)
Attualmente, VigilAI richiede di inserire le chiavi personali (Gemini API Key, Supabase, Email) modificando manualmente il file `.env`. Questo è scomodo per i clienti o per chi installa.
Possiamo modificare VigilAI in modo che:
1. All'avvio, se non trova le chiavi nel file `.env`, l'app mostra una **schermata web di configurazione iniziale** (Wizard).
2. L'installatore o il cliente apre l'app dal browser, inserisce le chiavi nei campi di testo (Gemini Key, Email, Database) e clicca su "Salva".
3. VigilAI scrive queste informazioni nel file `.env` sul Raspberry e si riavvia automaticamente in modalità monitoraggio.

---

## Piano di Esecuzione Consigliato

> [!IMPORTANT]
> Per garantire la massima semplicità, implementiamo prima la **configurazione web iniziale (Setup Wizard)** e lo **script a riga singola**, dopodiché potrai creare l'**immagine SD Master** che conterrà già queste due funzionalità.

### 1. Creazione dello Script di Installazione Unico (`setup.sh`)
Creeremo un file script ottimizzato per scaricare e configurare tutto in autonomia, comprensivo di:
* Rilevamento automatico del percorso utente (supporta qualsiasi nome utente sul Raspberry).
* Rilevamento automatico del comando del browser (`chromium` vs `chromium-browser`).
* Configurazione automatica dei permessi e del servizio di sistema.

### 2. Implementazione della Schermata di Configurazione Web (Setup Wizard)
* Modifica a [server.ts](file:///c:/Users/Max/Downloads/A%20Codici%20Main/VigilAI/server.ts) per intercettare la mancanza di variabili d'ambiente.
* Creazione di una pagina frontend minimale ma esteticamente curata per l'inserimento delle chiavi.
* API dedicata per salvare i dati inseriti nel file `.env`.

---

## Domande Aperte per l'Utente

> [!WARNING]
> Rispondi a queste domande per procedere con il piano:
> 1. Pensi che l'idea della schermata di configurazione iniziale via browser sia comoda per i tuoi clienti?
> 2. Preferisci che lo script di installazione scarichi il codice da una repository GitHub (pubblica o privata) o preferisci fornire una cartella zippata tramite un link di download (es. dal tuo sito/Google Drive)?
