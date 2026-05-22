#!/usr/bin/env bash
# ==============================================================================
# Vigil.AI - Raspberry Pi Hotspot Management Script
# ==============================================================================

ACTION=$1
SSID=${2:-"VigilAI_Setup"}
PASSWORD="vigilai12345"

if [ -z "$ACTION" ]; then
    echo "Uso: $0 [start|stop]"
    exit 1
fi

if [ "$ACTION" == "start" ]; then
    echo "Avvio Hotspot Wi-Fi temporaneo: $SSID..."
    # Assicurati che la radio Wi-Fi sia abilitata
    sudo nmcli radio wifi on || true
    
    # Rimuovi eventuali connessioni hotspot precedenti per prevenire errori di conflitto
    sudo nmcli connection delete Hotspot || true
    sudo nmcli connection delete id "$SSID" || true
    
    # Crea ed avvia l'hotspot tramite NetworkManager (WPA2 richiede minimo 8 caratteri)
    sudo nmcli device wifi hotspot ssid "$SSID" password "$PASSWORD" ifname wlan0 || true
    echo "Hotspot avviato con successo. Connettiti alla rete '$SSID' con password '$PASSWORD'."
elif [ "$ACTION" == "stop" ]; then
    echo "Arresto Hotspot Wi-Fi..."
    # Spegne la connessione hotspot attiva
    sudo nmcli connection down Hotspot || true
    sudo nmcli connection delete Hotspot || true
    sudo nmcli connection down id "$SSID" || true
    sudo nmcli connection delete id "$SSID" || true
    
    # Assicurati che la radio Wi-Fi sia attiva e riabilita l'autoconnessione client
    sudo nmcli radio wifi on || true
    sudo nmcli device set wlan0 autoconnect yes || true
    echo "Hotspot arrestato. Modalità client Wi-Fi ripristinata."
else
    echo "Azione non valida: $ACTION. Usa 'start' o 'stop'."
    exit 1
fi

