# VigilAI - Note di Progettazione per Schermo Touchscreen da 3.5"

Questo documento descrive le specifiche di design, la UX/UI proposta e i passi tecnici per adattare l'interfaccia di VigilAI al piccolo schermo touchscreen da 3.5 pollici (risoluzione tipica 480x320 in landscape), garantendo un'interazione fluida stile applicazione nativa mobile.

---

## 1. Obiettivi di Design (UX/UI)

1. **Massimizzazione dell'Area Video:** Su uno schermo da 3.5", i controlli di contorno, le intestazioni e i log consumano spazio vitale. Il flusso video della telecamera attiva deve occupare il **100% dell'area visibile** (senza bordi o barre fisse).
2. **Navigazione Semplificata (Menu Hamburger o Bottom Bar):**
   * Sostituzione della sidebar e dell'header desktop con un'icona **Hamburger Menu** posizionata in un angolo dello schermo.
   * Al clic, si apre un drawer a schermo intero con opzioni grandi, facili da toccare con le dita (*Impostazioni*, *API Key*, *Registro Log*).
   * In alternativa: Una **Bottom Tab Bar** (barra inferiore) con icone grandi a tocco singolo.
3. **Gestione Telecamere (Carosello / Scorrimento Orizzontale):**
   * Vista griglia esclusa o secondaria (troppo piccola).
   * Visualizzazione di **una telecamera alla volta**.
   * Transizione tra le telecamere tramite gesture di **Swipe Orizzontale** (swapping a destra o a sinistra).
4. **Controlli a Scomparsa (Tap-to-Show Overlay):**
   * I bottoni delle impostazioni e dello stato dell'allerta sono nascosti per impostazione predefinita.
   * Con un singolo **Tap** (tocco) in qualsiasi punto del video, i controlli appaiono in trasparenza per 4-5 secondi, per poi scomparire automaticamente.

---

## 2. Dettagli di Implementazione Tecnica

### A. Breakpoint CSS Dedicato
Implementeremo una media query specifica in `src/index.css` per schermi ultra-piccoli (sia in larghezza che in altezza per schermi in landscape):

```css
/* Breakpoint per Monitor 3.5" (tipicamente 480x320) */
@media (max-width: 500px), (max-height: 380px) {
  /* Layout a schermo intero */
  .main-app-container {
    padding: 0 !important;
    overflow: hidden;
  }
  
  /* Nascondi sidebar e intestazioni standard */
  .desktop-sidebar, .desktop-header {
    display: none !important;
  }
  
  /* Attiva la Bottom Bar o il Menu Hamburger */
  .mobile-35-nav {
    display: flex !important;
  }
}
```

### B. Gestione Swipe Orizzontale (Framer Motion)
Utilizzeremo la libreria `framer-motion` (già presente nel progetto) per gestire il trascinamento touch e le transizioni fluide di scorrimento laterale delle telecamere:

```typescript
import { motion, AnimatePresence } from "framer-motion";

// Logica per calcolare la telecamera precedente/successiva al termine dello swipe
const handleDragEnd = (event: any, info: any) => {
  const swipeThreshold = 50; // Sensibilità dello swipe in pixel
  if (info.offset.x < -swipeThreshold) {
    // Swipe a sinistra -> Vai alla cam successiva
    goToNextCamera();
  } else if (info.offset.x > swipeThreshold) {
    // Swipe a destra -> Vai alla cam precedente
    goToPrevCamera();
  }
};

// Componente Player con animazione di scivolamento
<motion.div
  key={activeCameraId}
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  onDragEnd={handleDragEnd}
  initial={{ opacity: 0, x: 100 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: -100 }}
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
  className="w-full h-full cursor-grab active:cursor-grabbing"
>
  <IPCameraPlayer url={activeCamera.url} />
</motion.div>
```

### C. Tastiera Virtuale Ottimizzata
* La tastiera a schermo intero occuperebbe troppo spazio. Per gli schermi da 3.5", la tastiera virtuale verrà posizionata in modo da coprire esattamente la **metà inferiore dello schermo** (`height: 50vh`), spingendo il campo di input attivo nella **metà superiore** (`height: 50vh`).
* Questo garantisce che l'utente possa vedere in tempo reale cosa sta digitando senza che la tastiera copra l'input.

---

## 3. Piano di Lavoro (Fase 3 - All'arrivo dell'hardware)

1. **Configurazione Iniziale Hardware:** Collegare lo schermo da 3.5" al Raspberry Pi, installare i driver touch (es. LCD-show) e verificare la calibrazione del tocco.
2. **Abilitazione Touch Chromium in Kiosk Mode:** Assicurarsi che Chromium si avvii sul Pi con i flag touch abilitati (`--touch-events=enabled --simulate-outdated-no-touch-device-mode=never`).
3. **Applicazione delle Modifiche React & CSS:** Integrare le media query e il carosello swipe in `src/App.tsx`.
4. **Verifica sul campo:** Testare la reattività del drag/swipe e la facilità di inserimento dati tramite tastiera virtuale sullo schermo fisico da 3.5".
