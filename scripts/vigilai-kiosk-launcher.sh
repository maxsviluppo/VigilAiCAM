#!/usr/bin/env bash
# ==============================================================================
# Vigil.AI - Kiosk Launcher con Rilevamento Automatico degli Schermi
# ==============================================================================
# Rileva dinamicamente la presenza dello schermo 3.5" (fb1) e/o di una TV HDMI (fb0).
# Se entrambi sono collegati, avvia il mirroring in background tramite FBCP.
# ==============================================================================

# Rileva se lo schermo da 3.5" (fb1) è attivo nel sistema
HAS_SPI_DISPLAY=false
if [ -e /dev/fb1 ]; then
  HAS_SPI_DISPLAY=true
fi

# Rileva se è collegato un monitor HDMI
HAS_HDMI=false
for hdmi in /sys/class/drm/card*-HDMI-A-*; do
  if [ -f "$hdmi/status" ]; then
    status=$(cat "$hdmi/status")
    if [ "$status" = "connected" ]; then
      HAS_HDMI=true
      break
    fi
  fi
done

# Fallback xrandr
if ! $HAS_HDMI && [ -n "$DISPLAY" ]; then
  if command -v xrandr &> /dev/null; then
    if xrandr | grep -q "HDMI.* connected"; then
      HAS_HDMI=true
    fi
  fi
fi

echo "Stato Display - 3.5\" SPI (fb1): $HAS_SPI_DISPLAY | HDMI (fb0): $HAS_HDMI"

# Configurazione della risoluzione per il browser
WINDOW_SIZE="480,320"
if $HAS_SPI_DISPLAY && $HAS_HDMI; then
  echo "Entrambi gli schermi collegati. Avvio del mirroring video con FBCP..."
  if ! pgrep -x "fbcp" > /dev/null; then
    if command -v fbcp &> /dev/null; then
      fbcp &
    elif [ -f /usr/local/bin/fbcp ]; then
      /usr/local/bin/fbcp &
    else
      echo "ATTENZIONE: FBCP richiesto per il mirroring ma non installato!"
    fi
  fi
  WINDOW_SIZE="480,320"
elif $HAS_SPI_DISPLAY; then
  echo "Solo schermo 3.5\" SPI rilevato. Risoluzione Kiosk: 480x320"
  WINDOW_SIZE="480,320"
elif $HAS_HDMI; then
  echo "Solo schermo HDMI rilevato. Risoluzione Kiosk: Fullscreen/Auto"
  WINDOW_SIZE="1280,720"
fi

# Avvia Chromium
BROWSER_CMD="chromium"
if command -v chromium-browser &> /dev/null; then
  BROWSER_CMD="chromium-browser"
fi

echo "Avvio di Chromium Kiosk con risoluzione $WINDOW_SIZE..."

KIOSK_URL="http://localhost:3088"
if $HAS_SPI_DISPLAY; then
  KIOSK_URL="http://localhost:3088/?mode=pi"
fi

$BROWSER_CMD --kiosk \
  --password-store=basic \
  --use-mock-keychain \
  --no-first-run \
  --noerrdialogs \
  --disable-infobars \
  --touch-events=enabled \
  --enable-touch-drag-drop \
  --force-device-scale-factor=1 \
  --window-size=$WINDOW_SIZE \
  --disable-gpu \
  --no-sandbox \
  "$KIOSK_URL"
