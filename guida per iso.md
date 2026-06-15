# Manuale di Verifica e Clonazione per VigilAI

Questo documento contiene le istruzioni per verificare il corretto funzionamento delle modifiche apportate (Setup Wizard + Installer automatico) e la procedura per clonare la scheda SD da distribuire alle aziende.

---

## 1. Come testare il Setup Wizard

Per verificare che la schermata web di configurazione iniziale funzioni correttamente, segui questi passaggi dal tuo PC (tramite il terminale SSH che hai già aperto):

### Passo A: Rinomina temporaneamente il file `.env` esistente sul Raspberry
Questo simulerà un'installazione pulita (senza chiavi):
```bash
mv ~/VigilAI/.env ~/VigilAI/.env.backup
```

### Passo B: Riavvia il servizio VigilAI
```bash
sudo systemctl restart vigilai
```

### Passo C: Accedi dal browser
Apri il browser sul tuo PC Windows e vai a:
`http://192.168.1.12:3088` (oppure `http://raspberrypi.local:3088`)

* **Cosa dovresti vedere:** La nuova pagina scura di configurazione di VigilAI (Setup Wizard) con i campi per inserire Gemini API Key, Supabase URL/Key e le credenziali Email.
* **Fai un test:** Inserisci dei dati di prova o le tue credenziali reali e premi **"Salva e Avvia Sistema"**.
* **Cosa succede:** Vedrai un conto alla rovescia di 5 secondi, il Raspberry scriverà il file `.env` corretto in automatico e riavvierà il servizio. Allo scadere dei 5 secondi, la pagina si ricaricherà mostrando la dashboard ufficiale di VigilAI!

*(Se tutto funziona, puoi eliminare il file di backup con `rm ~/VigilAI/.env.backup`)*.

---

## 2. Come testare l'Installer Automatico e il Desktop Icon

Per verificare che lo script ricrei in automatico l'icona sul desktop con il browser e i percorsi corretti:

1. Nel terminale SSH sul PC, esegui nuovamente lo script:
   ```bash
   cd ~/VigilAI
   ./install_pi.sh
   ```
2. Lo script rileverà automaticamente se il desktop è in italiano (`Scrivania`) o inglese (`Desktop`), installerà il servizio e creerà l'icona corretta sul monitor del Raspberry Pi senza che tu debba fare nulla manualmente.

---

## 3. Procedura di Clonazione della Scheda SD (Master) per le Aziende

Una volta che hai configurato il Raspberry Pi di prova e verificato che tutto funzioni, puoi creare un file immagine (`.img`) per duplicare l'installazione su quanti Raspberry vuoi.

### Passo 1: Spegni il Raspberry in modo sicuro
Nel terminale SSH del Raspberry Pi, digita:
```bash
sudo shutdown -h now
```
Attendi che il LED verde del Raspberry Pi si spenga del tutto, scollega l'alimentazione ed estrai la scheda MicroSD.

### Passo 2: Crea l'immagine Master dal tuo PC Windows
1. Inserisci la scheda MicroSD nel tuo PC Windows.
2. Scarica e apri il programma gratuito **Win32DiskImager** ([link per il download](https://sourceforge.net/projects/win32diskimager/)).
3. Configura Win32DiskImager:
   * **Image File:** Clicca sull'icona della cartella blu e scegli dove salvare il file sul tuo PC (chiamalo ad esempio `VigilAI_Master_v1.0.img`).
   * **Device:** Seleziona la lettera dell'unità corrispondente alla tua scheda SD (es. `D:` o `E:`).
4. Clicca sul pulsante **Read** (Leggi).
   * *Il programma leggerà l'intera scheda SD e creerà un file `.img` identico sul tuo PC.*
5. Una volta completato, fai tasto destro sul file `.img` appena creato e seleziona **Invia a ➔ Cartella compressa (zip)**. 
   * *Questo ridurrà le dimensioni del file da diversi gigabyte a pochissimo spazio (perché lo spazio non utilizzato sulla SD viene compresso a zero).*

### Passo 3: Scrivi l'immagine per un nuovo cliente
Quando devi installare il sistema per un nuovo cliente:
1. Inserisci una nuova scheda SD vergine nel tuo PC.
2. Apri **Raspberry Pi Imager** (o **BalenaEtcher**).
3. Scegli il file `.zip` (o `.img`) come sistema operativo (usando la voce *Use Custom / Usa immagine personalizzata*).
4. Seleziona la nuova scheda SD e clicca su **Scrivi (Write)**.
5. Inserisci la scheda SD nel nuovo Raspberry Pi e accendilo.
6. L'applicazione VigilAI si avvierà in automatico e mostrerà a schermo il Setup Wizard, pronta per essere configurata con le chiavi specifiche di quel cliente!
