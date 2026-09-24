#!/usr/bin/env bash
# ==============================================================================
# Vigil.AI - Configurazione Automatica LAN / Switch per Telecamere IP
# ==============================================================================
# Questo script trasforma la porta Ethernet (eth0) del Raspberry Pi in un
# Router/DHCP Server dedicato (subnet 192.168.10.0/24) per le telecamere
# collegate allo switch IP, senza interferire con il Wi-Fi (wlan0).
# ==============================================================================

set -e

# Colori per il terminale
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}      Vigil.AI - Attivazione Rete LAN Telecamere     ${NC}"
echo -e "${BLUE}======================================================${NC}"

# Verifica privilegi di root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Errore: Questo script richiede privilegi di amministratore.${NC}"
  echo -e "Esegui con: ${YELLOW}sudo bash $0${NC}"
  exit 1
fi

IFACE=${1:-"eth0"}
IP_GATEWAY="192.168.10.1/24"
CON_NAME="Cam-LAN"

echo -e "\n${YELLOW}[1/4] Verifica interfaccia Ethernet '${IFACE}'...${NC}"
if ! ip link show "$IFACE" > /dev/null 2>&1; then
  echo -e "${RED}Attenzione: Interfaccia ${IFACE} non trovata. Cerco interfacce ethernet alternative...${NC}"
  ALT_IFACE=$(ip -o link show | awk -F': ' '{print $2}' | grep -E '^(eth|en)' | head -n 1)
  if [ -n "$ALT_IFACE" ]; then
    echo -e "${GREEN}Trovata interfaccia alternativa: ${ALT_IFACE}${NC}"
    IFACE="$ALT_IFACE"
  else
    echo -e "${RED}Nessuna interfaccia ethernet rilevata! Collega il cavo LAN e riprova.${NC}"
    exit 1
  fi
fi

echo -e "${YELLOW}[2/4] Rimozione vecchie configurazioni '${CON_NAME}'...${NC}"
nmcli connection delete "$CON_NAME" 2>/dev/null || true
nmcli connection delete "Wired connection 1" 2>/dev/null || true

echo -e "${YELLOW}[3/4] Creazione connessione DHCP condivisa (ipv4.method shared)...${NC}"
nmcli connection add type ethernet ifname "$IFACE" con-name "$CON_NAME" \
  ipv4.method shared \
  ipv4.addresses "$IP_GATEWAY" \
  connection.autoconnect yes

echo -e "${YELLOW}[4/4] Attivazione connessione '${CON_NAME}'...${NC}"
nmcli connection up "$CON_NAME"

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN}  CONFIGURAZIONE COMPLETATA CON SUCCESSO!              ${NC}"
echo -e "${GREEN}======================================================${NC}"
echo -e "Interfaccia LAN:        ${YELLOW}${IFACE}${NC}"
echo -e "IP Raspberry (LAN):     ${GREEN}192.168.10.1${NC}"
echo -e "Server DHCP Telecamere: ${GREEN}ATTIVO${NC} (assegna IP 192.168.10.10 - 192.168.10.254)"
echo -e "Accesso Internet:       ${GREEN}Invariato via Wi-Fi (wlan0)${NC}"
echo -e "------------------------------------------------------"
echo -e "Collega ora le 2 telecamere allo switch IP:"
echo -e "1. Le telecamere riceveranno automaticamente l'IP via DHCP entro pochi secondi."
echo -e "2. Apri il browser su VigilAI e tocca '🔍 Cerca Cam (WS-Discovery)'."
echo -e "3. Per visualizzare gli IP assegnati da terminale digita: ${YELLOW}ip neigh${NC} o ${YELLOW}cat /proc/net/arp${NC}"
echo -e "${BLUE}======================================================${NC}\n"
