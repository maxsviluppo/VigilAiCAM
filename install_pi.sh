#!/usr/bin/env bash
# ==============================================================================
# Vigil.AI - Raspberry Pi 5 Installation & Deployment Script
# ==============================================================================

# Exit immediately if a command exits with a non-zero status
set -e

# ANSI Color codes for formatting outputs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0;5m' # No Color
CLEAR='\033[0m'

echo -e "${BLUE}======================================================================${CLEAR}"
echo -e "${BLUE}               Vigil.AI - RASPBERRY PI 5 DEPLOYMENT                   ${CLEAR}"
echo -e "${BLUE}======================================================================${CLEAR}"

# 1. Update and Upgrade System Package Indexes
echo -e "${YELLOW}[1/6] Aggiornamento dei pacchetti di sistema...${CLEAR}"
sudo apt-get update

# 2. Check and Install Node.js
if ! command -v node &> /dev/null; then
  echo -e "${YELLOW}Node.js non trovato. Installazione di Node.js v20 via NodeSource...${CLEAR}"
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  echo -e "${GREEN}Node.js installato correttamente: $(node -v)${CLEAR}"
else
  echo -e "${GREEN}Node.js è già installato: $(node -v)${CLEAR}"
fi

# 3. Install System Fallbacks (FFmpeg and compiler tools)
echo -e "${YELLOW}[2/6] Installazione di FFmpeg di sistema e strumenti di compilazione...${CLEAR}"
sudo apt-get install -y ffmpeg build-essential git

# 4. Clean and Install npm dependencies
echo -e "${YELLOW}[3/6] Preparazione delle dipendenze del progetto...${CLEAR}"
if [ -d "node_modules" ]; then
  echo -e "${YELLOW}Rilevata cartella node_modules precedente. Rimozione in corso per compatibilità di piattaforma...${CLEAR}"
  rm -rf node_modules
fi

echo -e "${YELLOW}Installazione dei pacchetti npm (architettura locale)...${CLEAR}"
npm install

# 5. Handle environment variables (.env)
echo -e "${YELLOW}[4/6] Configurazione variabili d'ambiente...${CLEAR}"
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    echo -e "${YELLOW}Creazione del file .env da .env.example...${CLEAR}"
    cp .env.example .env
  else
    echo -e "${RED}Errore: .env.example non trovato. Creazione di un .env vuoto...${CLEAR}"
    touch .env
  fi
  echo -e "${RED}ATTENZIONE: Modifica il file .env inserendo le tue chiavi personali (GEMINI_API_KEY, Supabase, Email) prima di avviare il servizio.${CLEAR}"
else
  echo -e "${GREEN}File .env già esistente.${CLEAR}"
fi

# 6. Build the React frontend
echo -e "${YELLOW}[5/6] Compilazione del frontend statico di VigilAI...${CLEAR}"
npm run build
echo -e "${GREEN}Compilazione completata con successo!${CLEAR}"

# 7. Setup Systemd Background Service
echo -e "${YELLOW}[6/6] Configurazione del servizio di sistema vigilai.service...${CLEAR}"
CURRENT_DIR=$(pwd)
CURRENT_USER=$(whoami)

if [ ! -f "vigilai.service" ]; then
  echo -e "${RED}Errore: file vigilai.service non trovato nella directory corrente.${CLEAR}"
  exit 1
fi

echo -e "Generazione del file di configurazione systemd per l'utente ${GREEN}${CURRENT_USER}${CLEAR} in ${GREEN}${CURRENT_DIR}${CLEAR}..."
sudo sed -e "s|{{WORKING_DIR}}|$CURRENT_DIR|g" \
         -e "s|{{USER}}|$CURRENT_USER|g" \
         vigilai.service > /tmp/vigilai.service

sudo mv /tmp/vigilai.service /etc/systemd/system/vigilai.service

echo -e "Ricaricamento di systemd daemon..."
sudo systemctl daemon-reload

echo -e "Abilitazione del servizio vigilai al boot..."
sudo systemctl enable vigilai

echo -e "Avvio del servizio vigilai..."
sudo systemctl restart vigilai

# 8. Setup Desktop Shortcut (Auto-detected)
echo -e "${YELLOW}Configurazione della scorciatoia sul desktop...${CLEAR}"
DESKTOP_DIR=""
if [ -d "$HOME/Desktop" ]; then
  DESKTOP_DIR="$HOME/Desktop"
elif [ -d "$HOME/Scrivania" ]; then
  DESKTOP_DIR="$HOME/Scrivania"
fi

if [ -n "$DESKTOP_DIR" ]; then
  BROWSER_CMD="chromium"
  if command -v chromium-browser &> /dev/null; then
    BROWSER_CMD="chromium-browser"
  fi
  
  echo -e "Rilevato percorso Desktop: ${GREEN}$DESKTOP_DIR${CLEAR}"
  echo -e "Rilevato comando browser: ${GREEN}$BROWSER_CMD${CLEAR}"
  
  cat << EOF > "$DESKTOP_DIR/VigilAI.desktop"
[Desktop Entry]
Name=VigilAI Monitor
Comment=Avvia il monitoraggio VigilAI
Exec=$BROWSER_CMD --start-maximized --password-store=basic --use-mock-keychain --no-first-run --noerrdialogs --disable-infobars http://localhost:3088
Icon=video-display
Terminal=false
Type=Application
Categories=Utility;
EOF
  
  chmod 755 "$DESKTOP_DIR/VigilAI.desktop"
  echo -e "${GREEN}Scorciatoia creata con successo in: $DESKTOP_DIR/VigilAI.desktop${CLEAR}"
else
  echo -e "${YELLOW}Nessuna cartella Desktop rilevata (Desktop o Scrivania). Scorciatoia saltata.${CLEAR}"
fi

# 9. Setup Autostart in Kiosk Mode for Raspberry Pi Display
echo -e "${YELLOW}Configurazione dell'avvio automatico in modalità Kiosk...${CLEAR}"
AUTOSTART_DIR="$HOME/.config/autostart"
mkdir -p "$AUTOSTART_DIR"
BROWSER_CMD="chromium"
if command -v chromium-browser &> /dev/null; then
  BROWSER_CMD="chromium-browser"
fi

cat << EOF > "$AUTOSTART_DIR/vigilai-kiosk.desktop"
[Desktop Entry]
Type=Application
Name=VigilAI Kiosk
Exec=$BROWSER_CMD --kiosk --password-store=basic --use-mock-keychain --no-first-run --noerrdialogs --disable-infobars http://localhost:3088
X-GNOME-Autostart-enabled=true
EOF

chmod 755 "$AUTOSTART_DIR/vigilai-kiosk.desktop"
echo -e "${GREEN}Autostart Kiosk configurato con successo in: $AUTOSTART_DIR/vigilai-kiosk.desktop${CLEAR}"

# 10. Sudoers permissions & scripts permissions
echo -e "${YELLOW}Configurazione permessi script e regole sudoers per gestione rete...${CLEAR}"
chmod +x "$CURRENT_DIR/scripts/setup_ap.sh"

SUDOERS_FILE="/etc/sudoers.d/vigilai-network"
cat << EOF > /tmp/vigilai-network
# Vigil.AI Network and Hostname management rules for Node.js
$CURRENT_USER ALL=(ALL) NOPASSWD: /usr/bin/nmcli, /usr/bin/hostnamectl, $CURRENT_DIR/scripts/setup_ap.sh
EOF

sudo chmod 440 /tmp/vigilai-network
sudo chown root:root /tmp/vigilai-network
sudo mv /tmp/vigilai-network $SUDOERS_FILE
echo -e "${GREEN}Regole sudoers configurate correttamente in $SUDOERS_FILE${CLEAR}"

echo -e "${GREEN}======================================================================${CLEAR}"
echo -e "${GREEN}         INSTALLAZIONE E CONFIGURAZIONE DI Vigil.AI COMPLETATA!      ${CLEAR}"
echo -e "${GREEN}======================================================================${CLEAR}"
echo -e "L'applicazione è ora configurata come servizio di sistema."
echo -e ""
echo -e "Comandi utili:"
echo -e "  - Controllare lo stato del servizio:  ${BLUE}sudo systemctl status vigilai${CLEAR}"
echo -e "  - Arrestare il servizio:              ${BLUE}sudo systemctl stop vigilai${CLEAR}"
echo -e "  - Riavviare il servizio:              ${BLUE}sudo systemctl restart vigilai${CLEAR}"
echo -e "  - Visualizzare i log in tempo reale:  ${BLUE}sudo journalctl -u vigilai -f${CLEAR}"
echo -e ""
echo -e "Ora puoi connetterti all'IP del Raspberry sulla porta ${GREEN}3088${CLEAR} (es: http://<IP_DEL_RASPBERRY>:3088)"
echo -e "======================================================================"

# Show system service status
sudo systemctl status vigilai --no-pager || true
