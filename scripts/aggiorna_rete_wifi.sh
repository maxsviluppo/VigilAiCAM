#!/usr/bin/env bash
# ==============================================================================
# Vigil.AI - Aggiornamento rapido pagina Wi-Fi display 3.5"
# Da eseguire sul Raspberry Pi DOPO aver copiato i file aggiornati via WinSCP
# ==============================================================================
# UTILIZZO:
#   chmod +x scripts/aggiorna_rete_wifi.sh
#   ./scripts/aggiorna_rete_wifi.sh
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CLEAR='\033[0m'

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo -e "${YELLOW}Directory progetto: $DIR${CLEAR}"
echo -e "${YELLOW}[1/3] Compilazione frontend...${CLEAR}"
npm run build
echo -e "${GREEN}✓ Build completata.${CLEAR}"

echo -e "${YELLOW}[2/3] Riavvio servizio vigilai...${CLEAR}"
sudo systemctl restart vigilai
sleep 2
if systemctl is-active --quiet vigilai; then
  echo -e "${GREEN}✓ Servizio vigilai attivo.${CLEAR}"
else
  echo -e "${RED}✗ Servizio vigilai non attivo. Controlla: journalctl -u vigilai -n 30${CLEAR}"
  exit 1
fi

echo -e "${YELLOW}[3/3] Aggiornamento URL kiosk (?mode=pi)...${CLEAR}"
KIOSK_SCRIPT="/usr/local/bin/vigilai-kiosk.sh"
if [ -f "$KIOSK_SCRIPT" ]; then
  if grep -q "localhost:3088/?mode=pi" "$KIOSK_SCRIPT"; then
    echo -e "${GREEN}✓ Kiosk già configurato con ?mode=pi${CLEAR}"
  else
    sudo sed -i 's|http://localhost:3088|http://localhost:3088/?mode=pi|g' "$KIOSK_SCRIPT"
    echo -e "${GREEN}✓ Kiosk aggiornato: $KIOSK_SCRIPT${CLEAR}"
  fi
else
  echo -e "${YELLOW}→ Script kiosk non trovato (normale se non usi autostart Chromium).${CLEAR}"
fi

echo -e ""
echo -e "${GREEN}Aggiornamento completato.${CLEAR}"
echo -e "Per vedere la nuova pagina Wi-Fi sul display 3.5\":"
echo -e "  • Riavvia il browser kiosk, oppure"
echo -e "  • ${YELLOW}sudo reboot${CLEAR}"
echo -e ""
echo -e "Test da SSH (senza display): curl -s http://localhost:3088/api/network/status"
