# Manuale di Verifica e Clonazione per VigilAI

Questo documento contiene le istruzioni per verificare il corretto funzionamento delle modifiche apportate (Nuovo Setup Wizard a 3 Fasi + Tastiera Virtuale Integrata + Installer automatico + Ottimizzazione TV/Desktop + Gestione API Key Gemini) e la procedura per clonare la scheda SD da distribuire alle aziende.

---

## 1. Come preparare e trasferire i file

I file sono stati sincronizzati nella cartella `VigilAI_Raspberry` del tuo PC Windows. Questa cartella è pulita (non contiene `node_modules`, evitando problemi di architettura o rallentamenti nel trasferimento).

### Passo A: Connessione con WinSCP
1. Avvia **WinSCP** sul tuo PC Windows.
2. Collegati al Raspberry Pi usando:
   * **Host Name (IP):** L'indirizzo IP locale del Raspberry Pi (es. `192.168.1.12`).
   * **Port:** `22` (SSH standard).
   * **Username:** `max1974test` (o il tuo utente configurato).
   * **Password:** La password del tuo utente sul Pi.

### Passo B: Trasferimento della cartella
1. Assicurati che non vi siano cartelle `VigilAI` vecchie o che siano state rimosse/rinominate per evitare conflitti.
2. Trascina l'intera cartella `VigilAI_Raspberry` dal tuo PC al Raspberry Pi, posizionandola ad esempio in `/home/max1974test/VigilAI`.
3. Attendi il completamento del trasferimento (sarà velocissimo perché la cartella `node_modules` pesante è esclusa).

---

## 2. Come avviare l'installazione sul Raspberry Pi

Una volta completato il trasferimento, connettiti in SSH (tramite Prompt dei comandi o PowerShell su Windows) ed esegui i comandi per installare il sistema:

```bash
# Entra nella cartella di VigilAI
cd /home/max1974test/VigilAI

# Rendi eseguibile lo script di installazione
chmod +x install_pi.sh

# Avvia l'installazione automatica
./install_pi.sh
```

### Cosa farà lo script di installazione:
1. **Aggiornamento pacchetti:** Esegue `apt-get update`.
2. **Node.js v20:** Verifica ed eventuale installazione automatica di Node.js.
3. **FFmpeg & Build-Essential:** Installa le librerie video e gli strumenti di compilazione locali.
4. **npm install:** Scarica e compila i moduli node per l'architettura ARM64 del Raspberry Pi.
5. **Copia del template .env:** Genera un file `.env` pulito che farà scattare automaticamente il Setup Wizard al primo avvio.
6. **Compilazione Frontend:** Compila i sorgenti React creando la cartella `dist`.
7. **Servizio di sistema vigilai.service:** Configura il servizio in background tramite systemd, abilitandolo all'avvio del Raspberry Pi (`sudo systemctl enable vigilai`).
8. **Kiosk Mode e Scorciatoia Desktop:** Configura l'avvio automatico di Chromium a schermo intero all'indirizzo `http://localhost:3088` e crea l'icona sul desktop.
9. **Permessi di Rete e Regole Sudoers:** Permette a Node.js di gestire la Wi-Fi (`nmcli`) e l'hostname senza richiedere la password di root.

Al termine dello script, il server sarà attivo ed eseguirà il Setup Wizard in modalità Hotspot (se non c'è una connessione Wi-Fi attiva).

---

## 3. Ottimizzazioni per Schermi Grandi (TV 40-50 pollici & Desktop PC)

Il layout principale di VigilAI è stato riprogettato per offrire un'esperienza eccellente sia su schermi piccoli che su televisori industriali o monitor di grandi dimensioni, occupando tutta la superficie disponibile senza perdere la struttura originale:

* **Disposizione Desktop & TV (grandi schermi):**
  * Il contenitore principale dell'applicazione è responsive e si allarga a tutto schermo (`max-w-none px-4 lg:px-12`).
  * I pannelli **AI Diagnostic Feed** e **Event Log** si spostano in una colonna verticale fissa sul lato **sinistro** dello schermo (`lg:w-[400px] xl:w-[480px] order-2 lg:order-1`).
  * La **Griglia delle Telecamere (Monitor)** si posiziona sulla **destra** (`flex-1 order-1 lg:order-2`), sfruttando l'intera larghezza e altezza residua dello schermo.
* **Disposizione Tablet (schermi medi):**
  * I pannelli Diagnostica e Log si posizionano in basso sotto la griglia video, organizzati orizzontalmente (2/3 per la diagnostica e 1/3 per i log) per sfruttare la larghezza dello schermo.
* **Disposizione Mobile (schermi piccoli):**
  * Gli elementi mantengono il layout impilato classico (Griglia Cam in alto, Diagnostica e Registro Log sotto in verticale), ottimizzando la leggibilità ed il touch sui cellulari.

---

## 4. Gestione Gemini API Key e Modal In-App con QR Code

Per prevenire il blocco del browser in Kiosk Mode causato dai reindirizzamenti esterni e per facilitare l'inserimento su dispositivi sprovvisti di tastiera fisica:

1. **API Key Input nella Menu Bar:**
   * Aggiunta l'icona a forma di Chiave (`Key`) nella barra superiore del menu (visibile su PC/TV/Tablet).
   * Al clic, si apre un campo di testo ad espansione simile alla barra di ricerca, mostrando la chiave API corrente o permettendo di incollarla/modificarla direttamente.
2. **Pulsante "Ottieni / Info":**
   * Se la chiave non è impostata, viene mostrato il pulsante **"Ottieni"** (o **"Info"** se presente).
   * Al clic si apre il nuovo **Modal di supporto in-app**:
     * **Colonna Sinistra (QR Code & Link):** Mostra un **QR Code** dinamico generato con `<QRCodeCanvas>` puntante direttamente alla pagina delle API Key di Google AI Studio (`https://aistudio.google.com/app/apikey`). L'utente può inquadrare il codice con il proprio cellulare, generare la chiave, e inserirla nell'app (o collegarsi da mobile/tablet all'indirizzo IP del Pi per incollarla direttamente nell'interfaccia).
     * **Colonna Destra (Iframe in-app):** Carica in un iframe interno la stessa pagina di Google AI Studio. È presente una nota che avvisa dell'eventuale blocco di Google (a causa delle restrizioni di sicurezza CSP `SAMEORIGIN`), offrendo il QR Code as fallback immediato e sicuro.
     * **Salvataggio Centralizzato:** Permette di inserire la chiave in un input dedicato e salvarla direttamente nel `localStorage` e nella configurazione complessiva del sistema.

---

## 5. Tastiera Virtuale Globale e Rilevamento Tastiere Esterne

La tastiera virtuale on-screen è stata estesa a tutti i campi sensibili dell'applicazione:

* **Copertura di tutti i campi:**
  * **Configurazione Telecamere:** Nome, Posizione, URL Stream, IP ONVIF, Porta RTSP, Username, Password e Percorso RTSP.
  * **Impostazioni di Rete ed Email (SMTP):** Chiave API Gemini, Utente Email SMTP, Password Email e Aggiunta nuovi destinatari.
  * **Modal API Key:** Campo di testo per incollare la chiave.
* **Rilevamento Tastiera Fisica (Verifica Presenza):**
  * Il sistema monitora in background gli input della tastiera dell'utente. Se viene rilevata la digitazione da una tastiera fisica (USB o Bluetooth), la tastiera virtuale a schermo **si disattiva automaticamente** per non ostacolare la vista e lasciare spazio all'input standard.
* **Pulsante di Attivazione Manuale:**
  * Aggiunto il pulsante a forma di Tastiera (`Keyboard`) nella barra superiore del menu. Questo pulsante permette di forzare l'attivazione della tastiera virtuale a schermo in qualsiasi momento, sovrascrivendo la disattivazione automatica (molto utile se la tastiera esterna si scollega o se l'utente preferisce usare il touchscreen).

---

## 6. Procedura di Clonazione della Scheda SD (Master) per le Aziende

Una volta configurato e testato il sistema, puoi clonare la MicroSD per replicare la stessa installazione sui Raspberry Pi dei tuoi futuri clienti.

### Passo 1: Spegnimento sicuro del Raspberry Pi
Nel terminale SSH, digita:
```bash
sudo shutdown -h now
```
Attendi che il LED verde si spenga del tutto, scollega l'alimentazione ed estrai la scheda MicroSD.

### Passo 2: Creazione dell'Immagine Master su Windows
1. Inserisci la scheda MicroSD nel PC Windows.
2. Scarica e apri **Win32DiskImager** ([link download](https://sourceforge.net/projects/win32diskimager/)).
3. Configura Win32DiskImager:
   * **Image File:** Clicca sull'icona della cartella blu e scegli dove salvare il file sul tuo PC (chiamalo ad esempio `VigilAI_Master_v1.0.img`).
   * **Device:** Seleziona la lettera corrispondente alla tua scheda SD (es. `D:` o `E:`).
4. Clicca su **Read** (Leggi) per generare il file `.img` sul tuo computer.
5. Fai tasto destro sul file `.img` creato e seleziona **Invia a ➔ Cartella compressa (zip)**. Questo ridurrà drasticamente le dimensioni del file eliminando lo spazio vuoto non utilizzato.

### Passo 3: Scrittura dell'immagine per un automated setup
1. Inserisci una nuova scheda SD vergine nel PC Windows.
2. Apri **Raspberry Pi Imager** (o **BalenaEtcher**).
3. Seleziona **Usa immagine personalizzata (Use Custom)** e seleziona il file `.zip` (o `.img`) creato al Passo 2.
4. Seleziona la nuova scheda SD e clicca su **Scrivi (Write)**.
5. Inserisci la scheda SD nel Raspberry Pi del nuovo cliente e accendilo.
6. Il sistema si avvierà pulito e presenterà a schermo il Setup Wizard a 3 fasi, pronto per associare la Wi-Fi locale e le telecamere IP di quel cliente!

---

## 7. Backup e Ripristino API Key Gemini su Supabase

Per prevenire la perdita delle configurazioni in caso di cancellazione manuale o automatica della cache del browser/`localStorage`, abbiamo integrato una strategia di backup cloud su Supabase:

1. **Tabella di Backup (`settings`):**
   * Creata tramite lo script SQL [supabase_backup_table.sql](file:///c:/Users/Max/Downloads/A%20Codici%20Main/VigilAI/supabase_backup_table.sql) eseguibile nell'SQL Editor di Supabase.
2. **Suddivisione in due colonne (`gemini_part1` e `gemini_part2`):**
   * Per sicurezza, la chiave API non viene memorizzata come stringa unica nel database. All'inserimento, viene divisa a metà (`Math.floor(length / 2)`) e memorizzata in due colonne distinte.
3. **Ripristino automatico e Allineamento all'avvio:**
   * All'avvio dell'applicazione, se il `localStorage` del browser è vuoto ma nel database cloud è presente una chiave precedentemente configurata, quest'ultima viene scaricata, ricomposta (`part1 + part2`) e reinserita automaticamente in locale.
   * Se la chiave è presente in locale ma non sul database, l'applicazione aggiorna automaticamente il cloud al primo caricamento per garantire la presenza del backup.
   * In caso di disallineamento, la chiave in locale ha la priorità e viene sincronizzata con il database cloud.

---

## 8. Trigger AI Dinamici da Database (Supabase)

Per consentire l'aggiunta o la modifica immediata degli scenari di allarme (es. per nuove richieste dei clienti) senza richiedere alcun aggiornamento o ricompilazione del codice dell'applicazione:

1. **Tabella di Configurazione (`alert_triggers`):**
   * Creata ed inizializzata tramite lo script SQL [supabase_alert_triggers.sql](file:///c:/Users/Max/Downloads/A%20Codici%20Main/VigilAI/supabase_alert_triggers.sql).
   * Definisce per ciascun trigger: l'ID, la Label mostrata, la Descrizione passata all'AI, l'Icona e la classe colore associata.
2. **Caricamento all'Avvio ed Integrazione Dinamica:**
   * All'avvio dell'applicazione, viene eseguito il caricamento automatico di tutti i trigger presenti nella tabella `alert_triggers`.
   * **Resilienza e Fallback:** Se la tabella non è accessibile o se la connessione internet è assente al boot, l'applicazione utilizza automaticamente la lista cablata locale (`DEFAULT_TRIGGERS`), evitando blocchi o crash e garantendo la continuità operativa.
   * Le icone associate (es. `Eye`, `Flame`, `ShieldAlert`, `UserCheck`, `Activity`, `Wind`) vengono caricate in modo dinamico all'interno dei pulsanti tramite l'import globale di Lucide.
3. **Analisi Gemini Dinamica:**
   * La mappa delle descrizioni associate ai trigger attivi viene inviata dinamicamente a `analyzeFrame`.
   * Gemini utilizza le istruzioni aggiornate presenti nel database per interpretare gli allarmi da rilevare sulle telecamere.

Se configuri un nuovo scenario nel pannello Supabase (es. Allagamento, Rilevazione Fumo anomalo, ecc.), questo apparirà all'istante nei menu di selezione di tutte le telecamere configurate dai clienti.
