# TODO - VigilAI - Prossimi Passi

## 🔐 Configurazione VPN con Tailscale (Accesso Remoto)

Nel prossimo incontro su VigilAI, l'obiettivo sarà configurare **Tailscale** per consentire al cellulare dell'utente di collegarsi e visualizzare le telecamere IP anche da reti esterne (4G/5G, altre reti Wi-Fi) in totale sicurezza.

### Passaggi Pianificati:
1. **Configurazione sul Raspberry Pi**:
   - Scaricare e installare Tailscale sul Raspberry Pi:
     ```bash
     curl -fsSL https://tailscale.com/install.sh | sh
     ```
   - Avviare il client e autenticarlo:
     ```bash
     sudo tailscale up
     ```
   - Recuperare l'indirizzo IP statico assegnato da Tailscale (es. `100.x.y.z`).

2. **Configurazione sul Telefono**:
   - Scaricare l'app **Tailscale** da App Store o Google Play Store.
   - Accedere con lo stesso account utilizzato sul Raspberry Pi.
   - Attivare la VPN sul telefono.

3. **Verifica**:
   - Provare ad accedere dal telefono all'indirizzo IP di Tailscale del Raspberry Pi sulla porta `3088` (es. `http://100.x.y.z:3088`).
   - Verificare che il flusso video delle telecamere IP locali sia completamente visibile anche quando il telefono è scollegato dal Wi-Fi di casa.
