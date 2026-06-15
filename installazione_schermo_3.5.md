# Guida d'Installazione Schermo Touchscreen 3.5" su Raspberry Pi 5

Questa guida spiega come installare i driver per lo schermo touchscreen da 3.5" (modello MHS-3.5) su un'installazione pulita del sistema operativo Raspberry Pi OS.

> [!WARNING]
> Prima di procedere con l'installazione dei driver su un sistema in produzione, effettua sempre un backup della scheda MicroSD. La modifica dei file di avvio può rendere temporaneamente instabile il sistema se non configurata correttamente.

---

## Passo 1: Preparazione e Collegamento Hardware

1. Inserisci lo schermo da 3.5" sulla porta GPIO del Raspberry Pi 5, allineando i pin partendo dall'alto (come mostrato nel manuale PDF).
2. Collega temporaneamente un monitor HDMI standard, una tastiera e un mouse al Raspberry Pi per completare la configurazione iniziale (oppure collegati tramite SSH).
3. Accendi il Raspberry Pi ed esegui la configurazione iniziale guidata del sistema operativo.

---

## Passo 2: Copia o Download dei Driver

I file dei driver sono già stati scaricati ed estratti all'interno della cartella di progetto:
`VigilAI_Raspberry/LCD-show`

Puoi trasferire questa cartella sul tuo Raspberry Pi in due modi:

### Metodo A: Se il Raspberry Pi è connesso a Internet (Consigliato)
Puoi scaricare i driver direttamente dal terminale del Raspberry Pi digitando:
```bash
sudo rm -rf LCD-show
git clone https://github.com/goodtft/LCD-show.git
```

### Metodo B: Copia tramite Chiavetta USB o Rete (SCP/SFTP)
Copia la cartella `LCD-show` presente in questa directory di lavoro direttamente nella home directory del tuo Raspberry Pi (`/home/pi/` o `/home/<tuo-utente>/`).

---

## Passo 3: Esecuzione dell'Installazione

1. Apri il terminale sul Raspberry Pi (o collegati in SSH).
2. Spostati nella cartella dei driver:
   ```bash
   cd LCD-show/
   ```
3. Rendi eseguibili gli script di installazione:
   ```bash
   chmod -R 755 .
   ```
4. Esegui lo script specifico per lo schermo MHS-3.5:
   ```bash
   sudo ./MHS35-show
   ```

Il Raspberry Pi si riavvierà automaticamente. Al riavvio, il segnale video dovrebbe essere reindirizzato sullo schermo da 3.5" anziché sulla porta HDMI.

---

## Passo 4: Risoluzione Schermo Bianco su Raspberry Pi 5 (Importante!)

Il Raspberry Pi 5 con il nuovo sistema operativo **Raspberry Pi OS Bookworm** utilizza di default il server grafico **Wayland** (anziché X11). I vecchi driver SPI come *LCD-show* spesso mostrano uno schermo bianco fisso su Wayland.

Se dopo il riavvio lo schermo resta bianco o non mostra l'interfaccia grafica:

1. Apri la configurazione di sistema tramite terminale:
   ```bash
   sudo raspi-config
   ```
2. Naviga su: **Advanced Options** -> **Wayland**.
3. Seleziona **X11** (o **Openbox / X11 Backend**) anziché Wayland.
4. Salva, esci e riavvia il Raspberry Pi:
   ```bash
   sudo reboot
   ```

Questo forzerà il sistema a utilizzare X11, ripristinando la piena compatibilità con i driver dello schermo da 3.5".
