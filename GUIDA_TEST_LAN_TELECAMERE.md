# 🚀 Guida Rapida: Collegamento LAN Raspberry Pi + Switch + 2 Telecamere IP

Questa guida spiega come eseguire il test collegando il **Raspberry Pi** a uno **Switch/Hub IP** con **2 telecamere IP** (es. TP-Link Tapo C220 o telecamere ONVIF), garantendo l'assegnazione automatica degli indirizzi IP e il flusso RTSP automatico.

---

## 1. Schema di Collegamento Fisico (Cavi)

1. Collega un cavo Ethernet dalla porta **LAN del Raspberry Pi** a una porta dello **Switch/Hub IP**.
2. Collega la **Camera 1** con cavo Ethernet a una porta dello Switch IP.
3. Collega la **Camera 2** con cavo Ethernet a una porta dello Switch IP.
4. Alimenta lo Switch e le 2 telecamere (e verifica che i LED delle porte Ethernet si accendano o lampeggino).

---

## 2. Attivazione DHCP sul Raspberry Pi (1 solo comando)

Se lo switch è isolato (non collegato a un modem/router casalingo), il Raspberry Pi deve fare da **Server DHCP** per assegnare gli IP alle 2 telecamere.

Apri il terminale del Raspberry (o via SSH) ed esegui:

```bash
cd ~/VigilAI
sudo bash scripts/setup_cam_lan.sh
```

### Cosa fa questo comando:
* Assegna al Raspberry l'IP fisso **`192.168.10.1`** sulla porta Ethernet.
* Avvia il server DHCP che assegna automaticamente gli IP alle 2 telecamere (es. **`192.168.10.101`** e **`192.168.10.102`**).
* Lascia intatta la connessione Wi-Fi per Internet, Supabase e Gemini AI.

---

## 3. Rilevamento Automatico Telecamere (WS-Discovery)

Non serve conoscere gli indirizzi IP a memoria: il sistema li trova da solo!

### Opzione A: Nel Setup Wizard Iniziale
1. Apri il browser all'indirizzo del Raspberry Pi (o sullo schermo touch 3.5").
2. Nel passaggio **Nuova Telecamera** ➔ **Configurazione ONVIF**, tocca il pulsante blu:
   > **`🔍 Rileva Telecamere sulla Rete (WS-Discovery)`**
3. Il sistema scansiona la rete LAN e mostra istantaneamente le 2 telecamere con il loro IP (es. `192.168.10.101`).
4. **Tocca la telecamera desiderata**: l'IP, la porta 554 e il percorso `/stream1` vengono compilati automaticamente!
5. Inserisci solo **Username** e **Password** della telecamera e tocca **Salva Telecamera**.

### Opzione B: Dall'Applicazione VigilAI già installata
1. Apri **Impostazioni ➔ Telecamere** (oppure tocca l'icona della telecamera da configurare).
2. Nella scheda **ONVIF / RTSP**, tocca il pulsante in alto a destra:
   > **`🔍 Cerca Cam`**
3. Tocca l'IP della camera rilevata per autocompilare la configurazione.
4. Inserisci **Username** e **Password**.
5. Il flusso RTSP viene generato istantaneamente:
   `rtsp://username:password@192.168.10.101:554/stream1`

---

## 4. Come ricavare Username e Password delle Telecamere

* **TP-Link Tapo (C220, C200, C310, C320, ecc.)**:
  1. Apri l'app **Tapo** sullo smartphone.
  2. Tocca la telecamera ➔ Icona Ingranaggio (Impostazioni) in alto a destra.
  3. Vai su **Impostazioni avanzate ➔ Account telecamera**.
  4. Crea o verifica il **Nome Utente** e la **Password** (es. `admin` / `password123`).
* **Telecamere Hikvision / Dahua / Reolink / Generiche**:
  * Utilizza le credenziali di amministratore impostate durante la prima inizializzazione o quelle stampate sull'etichetta del produttore.

---

## 5. Verifica Rapida da Terminale (Comandi Utili)

Se vuoi verificare rapidamente gli IP assegnati alle telecamere dal terminale del Raspberry:

* **Vedi tutti i dispositivi connessi allo switch LAN**:
  ```bash
  cat /proc/net/arp
  ```
  oppure:
  ```bash
  ip neigh
  ```
* **Vedi i lease DHCP rilasciati dal Raspberry**:
  ```bash
  cat /var/lib/misc/dnsmasq.leases
  ```
* **Testa il ping verso una telecamera**:
  ```bash
  ping -c 2 192.168.10.101
  ```
