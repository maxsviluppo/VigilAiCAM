import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HexCellData, GameState } from './types';
import { INITIAL_TIME, BASE_POINTS_START, MAX_STREAK, GRID_ROWS, GRID_COLS, OPERATORS, MOCK_LEADERBOARD, APP_CONFIG } from './constants';
import HexCell from './components/HexCell';
import ParticleEffect from './components/ParticleEffect';
import CharacterHelper from './components/CharacterHelper';
import { getIQInsights } from './services/geminiService';
import { soundService } from './services/soundService';
import { matchService } from './services/matchService';
import { Trophy, Timer, Zap, Brain, RefreshCw, ChevronLeft, ChevronRight, Play, Award, BarChart3, HelpCircle, Sparkles, Home, X, Volume2, VolumeX, User, Pause, Shield, Swords, Info, AlertTriangle, FastForward, Clock, Crown, Lock, Target, Send, XCircle, Globe, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import AuthModal from './components/AuthModal';
import AdminPanel from './components/AdminPanel';
import NeuralDuelLobby from './components/NeuralDuelLobby';
import DuelRecapModal from './components/DuelRecapModal';
import IntroVideo from './components/IntroVideo';
import ComicTutorial, { TutorialStep } from './components/ComicTutorial';
import UserProfileModal, { getRank } from './components/UserProfileModal'; // Updated import
import RegistrationSuccess from './components/RegistrationSuccess';

import { BADGES } from './constants/badges';
import { authService, profileService, leaderboardService, supabase, configService, UserProfile } from './services/supabaseClient'; // Moved this import here
import { BOSS_LEVELS } from './constants/boss_levels';
import { AdMob, BannerAdPosition, BannerAdSize, AdMobBannerSize, RewardAdPluginEvents } from '@capacitor-community/admob';

const TUTORIAL_STEPS = [
  {
    title: "OBIETTIVO E GRIGLIA",
    description: "Collega le celle per formare equazioni che danno come risultato i Target richiesti. Usa i numeri e gli operatori (+, -, ×, ÷) in modo strategico per svuotare la lista nel minor tempo possibile!",
    icon: <Brain className="w-12 h-12 text-[#FF8800]" />
  },
  {
    title: "CONNESSIONE NEURALE",
    description: "Trascina per collegare le celle adiacenti rispettando la sequenza: Numero → Operatore → Numero (es. 5 + 3). Il percorso si illumina di VERDE se l'equazione è esatta, di ROSSO in caso di errore.",
    icon: <RefreshCw className="w-12 h-12 text-[#FF8800]" />
  },
  {
    title: "SFIDE BOSS & GRAVITÀ",
    description: "Ogni 5 livelli affronterai un potente Boss Guardiano con meccaniche uniche, come griglie a cascata e gravità dinamica! Sconfiggilo entro il tempo limite per sbloccare ricompense e moltiplicatori.",
    icon: <Crown className="w-12 h-12 text-[#FF8800]" />
  },
  {
    title: "NEURAL DUEL (1VS1)",
    description: "Entra nell'arena multigiocatore! Scegli tra la modalità STANDARD e la frenetica modalità BLITZ / DOMINIO, dove la rapidità è tutto e puoi persino rubare i Target completati dal tuo avversario!",
    icon: <Swords className="w-12 h-12 text-[#FF8800]" />
  },
  {
    title: "QI RANKING AI",
    description: "Il nostro motore di intelligenza artificiale valuta costantemente la tua velocità di calcolo, l'ottimizzazione dei percorsi e la serie di risposte corrette per stimare in tempo reale il tuo QI Matematico.",
    icon: <Zap className="w-12 h-12 text-[#FF8800]" />
  }
];

const WIN_VIDEOS = ['/Win1noaudio.mp4', '/Win2noaudioe.mp4', '/Win3noaudio.mp4', '/Win4noaudio.mp4'];
const LOSE_VIDEOS = ['/Lose1noaudio.mp4', '/Lose2noaudio.mp4'];
const SURRENDER_VIDEOS = ['/Resa1noaudio.mp4'];

// BOSS_LEVELS imported from constants/boss_levels
const GameView: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    totalScore: 0,
    streak: 0,
    level: 1,
    timeLeft: INITIAL_TIME,
    targetResult: 0,
    status: 'idle',
    estimatedIQ: 100,
    lastLevelPerfect: true,
    basePoints: BASE_POINTS_START,
    levelTargets: [],
    targetsFound: 0,
    isBossLevel: false,
    bossLevelId: null as number | null,
  });

  const [grid, setGrid] = useState<HexCellData[]>([]);
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [previewResult, setPreviewResult] = useState<number | null>(null);
  const [pathStatus, setPathStatus] = useState<'correct' | 'wrong' | null>(null);
  const [matchedTargetValue, setMatchedTargetValue] = useState<number | null>(null);
  const [insight, setInsight] = useState<string>("");

  const [activeModal, setActiveModal] = useState<'leaderboard' | 'tutorial' | 'admin' | 'duel' | 'duel_selection' | 'resume_confirm' | 'logout_confirm' | 'profile' | 'registration_success' | 'boss_selection' | 'full_reset_confirm' | null>(null);
  const [activeMatch, setActiveMatch] = useState<{ id: string, opponentId: string, isDuel: boolean, isP1: boolean } | null>(null);
  const [duelMode, setDuelMode] = useState<'standard' | 'blitz'>('standard');
  const [opponentScore, setOpponentScore] = useState(0);
  const [opponentTargets, setOpponentTargets] = useState(0);
  const [duelRounds, setDuelRounds] = useState({ p1: 0, p2: 0, current: 1 });
  const [tutorialStep, setTutorialStep] = useState(0);
  const [targetAnimKey, setTargetAnimKey] = useState(0);
  const [scoreAnimKey, setScoreAnimKey] = useState(0);
  const [isVictoryAnimating, setIsVictoryAnimating] = useState(false);
  const [triggerParticles, setTriggerParticles] = useState(false);
  const [toast, setToast] = useState<{ message: string, visible: boolean, actions?: { label: string, onClick: () => void, variant?: 'primary' | 'secondary' }[] }>({ message: '', visible: false });
  const [isMuted, setIsMuted] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showLostVideo, setShowLostVideo] = useState(false);
  const [showBossIntro, setShowBossIntro] = useState(false);
  const [isBossBonusPlaying, setIsBossBonusPlaying] = useState(false);
  const [remoteConfig, setRemoteConfig] = useState<any>(null);
  const [configLoading, setConfigLoading] = useState(true);

  // FETCH GLOBAL CONFIG ON START
  useEffect(() => {
    const loadGlobalConfig = async () => {
      try {
        const config = await configService.getSystemConfig();
        if (config) {
          setRemoteConfig(config);
          // Sync with local memory for components that might not re-render immediately
          if (config.adsense_enabled !== undefined) localStorage.setItem('adsense_enabled', config.adsense_enabled.toString());
          if (config.admob_enabled !== undefined) localStorage.setItem('admob_enabled', config.admob_enabled.toString());
        }
      } catch (e) {
        console.error("Error loading remote config:", e);
      } finally {
        setConfigLoading(false);
      }
    };
    loadGlobalConfig();
  }, []);
  const [showHomeTutorial, setShowHomeTutorial] = useState(false);
  const [showGameTutorial, setShowGameTutorial] = useState(false);
  const theme = 'orange';
  const [levelBuffer, setLevelBuffer] = useState<{ grid: HexCellData[], targets: number[] }[]>([]);
  const timerRef = useRef<number | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const winAudioRef = useRef<HTMLAudioElement | null>(null);
  const boss2TimerRef = useRef<number | null>(null);
  const boss2VibrationRef = useRef<number | null>(null);

  // Supabase Integration
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [logoAnim, setLogoAnim] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const gameStateRef = useRef<GameState>(gameState);
  const prevRoundRef = useRef(1);
  const processedWinRef = useRef<string | null>(null);
  const isProcessingSuccessRef = useRef(false);
  const selectionTimeoutRef = useRef<number | null>(null);
  const gridRef = useRef(grid);
  const disconnectionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const adTouchStartX = useRef<number | null>(null);

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Keep duelRoundsRef in sync
  const duelRoundsRef = useRef(duelRounds);
  useEffect(() => {
    duelRoundsRef.current = duelRounds;
  }, [duelRounds]);

    // Mobile Haptics Helper (Capacitor Fallback)
    const vibrateDevice = useCallback((pattern: number | number[]) => {
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate(pattern);
        } catch (e) {
          console.debug("Vibration not supported or blocked");
        }
      }
    }, []);

  const handleRequestExtraTime = async () => {
    if (advUsesThisLevel >= 3 || activeMatch) return;

    // 1. Pause and Setup
    togglePause(true);
    vibrateDevice(50);
    soundService.playExternalSound('switch.mp3');

    // MOBILE AD LOGIC (AdMob)
    if (['android', 'ios'].includes((window as any).Capacitor?.getPlatform())) {
      let earnedReward = false;
      let listeners: any[] = [];

      const cleanupListeners = () => {
        listeners.forEach(l => {
          try {
            l.remove();
          } catch (err) {
            console.error("Error removing AdMob listener:", err);
          }
        });
        listeners = [];
      };

      try {
        // Register listeners before showing the ad
        const rewardedListener = await AdMob.addListener(
          RewardAdPluginEvents.Rewarded,
          (reward: any) => {
            console.log("AdMob Reward Earned:", reward);
            earnedReward = true;
          }
        );
        listeners.push(rewardedListener);

        const dismissedListener = await AdMob.addListener(
          RewardAdPluginEvents.Dismissed,
          () => {
            console.log("AdMob Ad Dismissed");
            cleanupListeners();
            handleFinishAd(earnedReward);
          }
        );
        listeners.push(dismissedListener);

        const failedToShowListener = await AdMob.addListener(
          RewardAdPluginEvents.FailedToShow,
          (error: any) => {
            console.error("AdMob Failed to Show:", error);
            cleanupListeners();
            togglePause(false);
            showToast("Impossibile mostrare il video.");
          }
        );
        listeners.push(failedToShowListener);

        await AdMob.prepareRewardVideoAd({
          adId: ADS_CONFIG.rewardedId,
          isTesting: false,
        });

        await AdMob.showRewardVideoAd();
      } catch (e) {
        console.error("AdMob Rewarded Error:", e);
        cleanupListeners();
        // Fallback for unexpected errors
        togglePause(false);
        showToast("Impossibile caricare il video.");
      }
      return;
    }

    // WEB MOCK AD LOGIC (Already exists)
    setIsAdvPlaying(true);
    setAdTimer(ADS_CONFIG.rewardDuration);
    setAdCanSkip(false);
    setAdRewardTriggered(false);

    const interval = setInterval(() => {
      setAdTimer(prev => {
        const next = prev - 1;
        if (ADS_CONFIG.rewardDuration - next >= ADS_CONFIG.skipOffset) {
          setAdCanSkip(true);
        }
        if (next <= 0) {
          clearInterval(interval);
          handleFinishAd(true);
          return 0;
        }
        return next;
      });
    }, 1000);
    (window as any)._adInterval = interval;
  };

  const handleFinishAd = (getReward: boolean) => {
    if ((window as any)._adInterval) clearInterval((window as any)._adInterval);

    setIsAdvPlaying(false);

    if (getReward) {
      setAdvUsesThisLevel(prev => prev + 1);
      setAdRewardTriggered(true);

      // 3. Reward: +30 seconds
      setGameState(prev => ({
        ...prev,
        timeLeft: prev.timeLeft + ADS_CONFIG.rewardValue
      }));

      showToast(`🎁 +${ADS_CONFIG.rewardValue} SECONDI AGGIUNTI! Forza!`);
      vibrateDevice([100, 50, 100]);
      soundService.playSuccess();
    } else {
      showToast('⚠️ Video saltato: nessun premio assegnato.');
    }

    // 4. Resume
    setTimeout(() => {
      togglePause(false);
    }, 500);
  };


  // Logo Animation Effect
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Silenziamo i falsi positivi di AbortError (comuni con Supabase o cambi pagina rapidi)
      const reason = event.reason;
      const errorName = reason?.name || reason?.statusText;
      const errorMsg = reason?.message || '';

      const isAbortError =
        errorName === 'AbortError' ||
        errorMsg.includes('signal is aborted without reason') ||
        errorMsg.includes('The user aborted a request') ||
        errorMsg.includes('Fetch is aborted') ||
        errorMsg.includes('aborted');

      if (isAbortError) {
        event.preventDefault(); // Previene banner rosso/overlay del browser
        console.debug("🔇 Silenziato AbortError (Promise):", errorMsg);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    const interval = setInterval(() => {
      setLogoAnim(true);
      setTimeout(() => setLogoAnim(false), 2000); // Slower breath (2s)
    }, 8000); // Slightly more frequent

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      clearInterval(interval);
    };
  }, []);
  useEffect(() => {
    if (gameState.isBossLevel) {
      document.body.style.background = '#022c22'; // emerald-950
      document.documentElement.style.background = '#022c22';
    } else if (gameState.status !== 'idle') {
      document.body.style.background = '#18212d'; // Further desaturated blue for matches
      document.documentElement.style.background = '#18212d';
    } else {
      document.body.style.background = '#020617'; // Default Slate-950 for home
      document.documentElement.style.background = '#020617';
    }
    return () => {
      document.body.style.background = '#020617';
      document.documentElement.style.background = '#020617';
    };
  }, [gameState.isBossLevel, gameState.status]);

  const [leaderboardData, setLeaderboardData] = useState<{ byScore: any[], byLevel: any[] } | null>(null);

  const [savedGame, setSavedGame] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseLocked, setPauseLocked] = useState(false);
  const [winVideoSrc, setWinVideoSrc] = useState(WIN_VIDEOS[0]);
  const [loseVideoSrc, setLoseVideoSrc] = useState(LOSE_VIDEOS[0]);
  const [surrenderVideoSrc, setSurrenderVideoSrc] = useState(SURRENDER_VIDEOS[0]);
  const [showSurrenderVideo, setShowSurrenderVideo] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(false);

  // NEW STATE FOR DUEL RECAP
  const [showDuelRecap, setShowDuelRecap] = useState(false);
  const [latestMatchData, setLatestMatchData] = useState<any>(null); // NEW: Full Match Object Store

  const [isAdvPlaying, setIsAdvPlaying] = useState(false);
  const [advUsesThisLevel, setAdvUsesThisLevel] = useState(0);
  const [adBannerActive, setAdBannerActive] = useState(false);
  const [adTimer, setAdTimer] = useState(30);
  const [adCanSkip, setAdCanSkip] = useState(false);
  const [adRewardTriggered, setAdRewardTriggered] = useState(false);

  // GOOGLE ADSENSE / ADMOB CONFIG
  const ADS_CONFIG = {
    // Forza l'attivazione sul Web come richiesto in attesa dell'autorizzazione AdSense
    enabled: true, 
    rewardDuration: 30, // Full duration for reward
    skipOffset: 30, // Set to 30 for production
    rewardValue: 30, // Seconds granted
    client: 'ca-pub-8620196010585213',
    adsenseSlot: '4546676285',
    // TEST IDS (Replace with ca-app-pub-2753359398526340/xxxxxxxxxx)
    bannerId: 'ca-app-pub-3940256099942544/6300978111',
    rewardedId: 'ca-app-pub-8620196010585213/5397002761',
  };

  useEffect(() => {
    if (isAdvPlaying && ADS_CONFIG.enabled) {
      setTimeout(() => {
        try {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        } catch (e) {
          console.warn("AdSense Push Warning:", e);
        }
      }, 300);
    }
  }, [isAdvPlaying, ADS_CONFIG.enabled]);

  // NEW: Video Intro State
  const [showIntro, setShowIntro] = useState(false);
  const [onlinePlayers, setOnlinePlayers] = useState<any[]>([]);
  const [pendingMatchInvite, setPendingMatchInvite] = useState<string | null>(null);
  const [isJoiningPending, setIsJoiningPending] = useState(false);

  // FAILSAFE: Force Intro End after timeout to prevent boot freeze
  useEffect(() => {
    if (showIntro) {
      const timer = setTimeout(() => {
        console.warn("⚠️ BOOT SYSTEM: Intro sequence timed out - Force entering app");
        setShowIntro(false);
        setGameState(prev => ({ ...prev, status: 'idle' }));
      }, 120000);
      return () => clearTimeout(timer);
    }
    // L'avvio automatico del tutorial è stato disabilitato come richiesto dall'utente.
    // Rimane accessibile unicamente dal pulsante dedicato nella Home.
  }, [showIntro]);

  // Ad Banner Timing Effect: Closed during play, every 4s during pause (Career Mode)
  const adBannerTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const startCycle = () => {
      if (adBannerTimerRef.current) clearTimeout(adBannerTimerRef.current);

      // Condition: Playing, NOT a match, NOT boss level, AND IS PAUSED
      if (gameState.status === 'playing' && isPaused && advUsesThisLevel < 3 && !activeMatch && !gameState.isBossLevel) {
        adBannerTimerRef.current = setTimeout(() => {
          setAdBannerActive(true);
          adBannerTimerRef.current = setTimeout(() => {
            setAdBannerActive(false);
            startCycle(); // Continue cycle if still paused
          }, 3000); // Expanded for 3 seconds
        }, 4000); // Wait 4 seconds between expansions
      } else {
        setAdBannerActive(false);
      }
    };

    if (gameState.status === 'playing' && isPaused && advUsesThisLevel < 3 && !activeMatch && !gameState.isBossLevel) {
      startCycle();
    } else {
      setAdBannerActive(false);
      if (adBannerTimerRef.current) clearTimeout(adBannerTimerRef.current);
    }

    return () => {
      if (adBannerTimerRef.current) clearTimeout(adBannerTimerRef.current);
    };
  }, [gameState.status, isPaused, advUsesThisLevel, activeMatch, gameState.isBossLevel]);

  // NEW: AdMob Initialization
  useEffect(() => {
    if (!ADS_CONFIG.enabled) return;

    const initAdMob = async () => {
      try {
        await AdMob.initialize({
          requestTrackingAuthorization: true,
          testingDevices: [],
          initializeForTesting: true,
          requestConfiguration: {
            tagForChildDirectedTreatment: true,
            maxAdContentRating: 'G',
          }
        });
      } catch (e) {
        console.error("AdMob Init Error:", e);
      }
    };

    initAdMob();

    return () => {
      if (['android', 'ios'].includes((window as any).Capacitor?.getPlatform())) {
        AdMob.removeBanner().catch(() => {});
      }
    };
  }, []);

  // Ensure no banners are shown on visibility/state changes
  useEffect(() => {
    if (!ADS_CONFIG.enabled) return;

    const hideBanner = async () => {
      const isMobile = ['android', 'ios'].includes((window as any).Capacitor?.getPlatform());
      if (!isMobile) return;
      try {
        await AdMob.removeBanner();
      } catch (e) {
        console.debug("Banner Removal Error:", e);
      }
    };

    hideBanner();
  }, [isPaused, gameState.status]);

  const handleUserInteraction = useCallback(async () => {
    await soundService.init();
  }, []);

  const showToast = useCallback((message: string, actions?: { label: string, onClick: () => void, variant?: 'primary' | 'secondary' }[]) => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    setToast({ message, visible: true, actions });
    // Durata ridotta: 2.5 secondi per toast normali, 6 secondi se ci sono azioni
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, actions ? 6000 : 2500);
  }, []);

  // DETERMINISTIC RNG HELPERS
  const stringToSeed = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  const seededRandom = (seed: number) => {
    return () => {
      seed |= 0; seed = seed + 0x6d2b79f5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };


  const getDifficultyRange = (levelInput: number) => {
    const level = Number(levelInput) || 1;
    // NUOVA CURVA NEURAL 2.0: Molto più graduale
    // La difficoltà che prima era al liv 70 ora è al liv 200 (min 15, max 55)

    if (level <= 30) return { min: 1, max: 15 };       // Flow iniziale
    if (level <= 60) return { min: 3, max: 22 };       // Introduzione x
    if (level <= 90) return { min: 5, max: 30 };       // Consolidamento x
    if (level <= 150) return { min: 8, max: 42 };      // Introduzione /
    if (level <= 200) return { min: 12, max: 55 };     // Raggiungimento soglia "sfida"

    // PLATEAU: Dal livello 200 al 900 la difficoltà resta costante
    if (level <= 900) return { min: 15, max: 58 };

    // Fino al livello 1100 riprende in modo quasi impercettibile come da logica originale
    if (level <= 1100) {
      return {
        min: 15 + Math.floor((level - 900) * 0.5),
        max: 58 + Math.floor((level - 900) * 1.5)
      };
    }

    // Oltre il livello 1100 (Loop Infinito): stabilizziamo sul tetto massimo calcolato a 1100
    // per mantenere i numeri calcolabili con le tessere ed evitare il fallback.
    return {
      min: 115, // corrisponde a min al livello 1100
      max: 358  // corrisponde a max al livello 1100
    };
  };

  // Helper: Calculate result from a cell path (for solver)
  const calculateResultFromCells = (cells: HexCellData[]): number | null => {
    if (cells.length < 1) return null;
    try {
      let result = 0;
      let currentOp = '+';
      let hasStarted = false;

      for (let i = 0; i < cells.length; i++) {
        const part = cells[i].value;
        if (OPERATORS.includes(part)) {
          currentOp = part;
        } else {
          const num = parseInt(part);
          if (!hasStarted) {
            result = num;
            hasStarted = true;
          } else {
            if (currentOp === '+') result += num;
            else if (currentOp === '-') result -= num;
            else if (currentOp === '×') result *= num;
            else if (currentOp === '÷') result = num !== 0 ? Math.floor(result / num) : result;
          }
        }
      }
      return result;
    } catch (e) {
      return null;
    }
  };

  // Helper: Check adjacency (rectilinear for orange theme)
  const areCellsAdjacent = (cell1: HexCellData, cell2: HexCellData): boolean => {
    if (theme === 'orange') {
      const dr = Math.abs(cell1.row - cell2.row);
      const dc = Math.abs(cell1.col - cell2.col);
      return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
    }

    // Default Hex Adjacency
    const dr = Math.abs(cell1.row - cell2.row);
    const dc = cell2.col - cell1.col;
    if (dr === 0) return Math.abs(dc) === 1;
    if (dr === 1) {
      if (cell1.row % 2 === 0) return dc === 0 || dc === -1;
      else return dc === 0 || dc === 1;
    }
    return false;
  };


  // SOLVER: Find all valid paths and their results - RETURNS MAP WITH PATHS
  // UPDATED to return Map<number, string[]> so we can protect cells in Boss Levels
  const findAllSolutions = (gridCells: HexCellData[]): Map<number, string[]> => {
    if (!gridCells) return new Map();
    const solutions = new Map<number, string[]>();
    const maxPathLength = 5; // Reduced max depth for perf, enough for standard solutions

    const explorePath = (currentPath: HexCellData[]) => {
      const lastCell = currentPath[currentPath.length - 1];

      // Calculate if path is valid (at least 3 cells: N-Op-N)
      if (currentPath.length >= 3 && currentPath.length % 2 === 1) {
        const result = calculateResultFromCells(currentPath);
        if (result !== null && result > 0) {
          // Save the path IDs for this result if not already found
          if (!solutions.has(result)) {
            solutions.set(result, currentPath.map(c => c.id));
          }
        }
      }

      if (currentPath.length >= maxPathLength) return;

      // Optimization: Get neighbors efficiently
      // In a real grid search, we should pre-calculate neighbors, but here we scan.
      // Filter strictly by adjacency
      const neighbors = gridCells.filter(n =>
        n.id !== lastCell.id &&
        !currentPath.some(c => c.id === n.id) &&
        n.type !== lastCell.type &&
        areCellsAdjacent(lastCell, n)
      );

      for (const nextCell of neighbors) {
        explorePath([...currentPath, nextCell]);
      }
    };

    // Start DFS from each number
    gridCells.filter(c => c.type === 'number').forEach(startCell => {
      explorePath([startCell]);
    });

    return solutions;
  };

  // BOSS UNLOCK CHECKER
  useEffect(() => {
    if (gameState.status === 'idle' && userProfile) {
      // BOSS 1 UNLOCK (Level > 5)
      if ((userProfile.max_level || 1) > 5) {
        const key = `boss_unlock_seen_1_${userProfile.id}`;
        if (localStorage.getItem(key) !== 'true') {
          setTimeout(() => {
            // Play Unlock Video (Placeholder for now)
            setShowHomeTutorial(false); // Hide tutorial if overlapping
            showToast("⚠️ LIVELLO BOSS SBLOCCATO!", [{ label: "GIOCA ORA", onClick: () => setActiveModal('boss_selection') }]);
            soundService.playBadge(); // Alert Sound
            localStorage.setItem(key, 'true');
          }, 3000);
        }
      }
    }
  }, [gameState.status, userProfile, showToast]);

  const createLevelData = useCallback((levelInput: number, seedStr?: string, targetCount: number = 5) => {
    const level = Number(levelInput) || 1;
    const { min, max } = getDifficultyRange(level);
    let attempts = 0;
    const maxAttempts = 20;

    // Initialize RNG
    const rng = seedStr ? seededRandom(stringToSeed(seedStr)) : Math.random;

    // Helper: Weighted numbers for early levels
    const getWeightedNumber = () => {
      // Numeri più piccoli per molto più tempo (fino al liv 150)
      if (level <= 150) {
        const r = rng();
        // 70% small (1-4), 25% mid (5-7), 5% high (8-9) or 0
        if (r < 0.70) return Math.floor(rng() * 4) + 1;
        if (r < 0.95) return Math.floor(rng() * 3) + 5;
        return Math.floor(rng() * 3) + 7;
      }
      return Math.floor(rng() * 10);
    };

    // Helper: generate a balanced pool of operators to distribute spatially
    const generateBalancedOperatorPool = (count: number) => {
      const pool = [];
      let weights = { '+': 0.35, '-': 0.35, '×': 0.20, '÷': 0.10 };

      // NUOVA PROGRESSIONE NEURAL 2.0
      if (level <= 30) {
        // Solo + e -
        weights = { '+': 0.50, '-': 0.50, '×': 0.0, '÷': 0.0 };
      }
      else if (level <= 60) {
        // Introduzione x (10%)
        weights = { '+': 0.45, '-': 0.45, '×': 0.10, '÷': 0.0 };
      }
      else if (level <= 90) {
        // Incremento x (20%)
        weights = { '+': 0.40, '-': 0.40, '×': 0.20, '÷': 0.0 };
      }
      else if (level <= 150) {
        // Introduzione / (5%) rarest
        weights = { '+': 0.375, '-': 0.375, '×': 0.20, '÷': 0.05 };
      }
      else if (level <= 900) {
        // Bilanciamento plateau
        weights = { '+': 0.35, '-': 0.35, '×': 0.20, '÷': 0.10 };
      }
      else {
        // Oltre il 900
        weights = { '+': 0.25, '-': 0.25, '×': 0.30, '÷': 0.20 };
      }

      for (let i = 0; i < count; i++) {
        const r = rng();
        if (r < weights['+']) pool.push('+');
        else if (r < weights['+'] + weights['-']) pool.push('-');
        else if (r < weights['+'] + weights['-'] + weights['×']) pool.push('×');
        else pool.push('÷');
      }

      // Shuffle pool (Fisher-Yates) for uniform distribution
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return pool;
    };

    while (attempts < maxAttempts) {
      attempts++;

      // Count operators needed
      let opCount = 0;
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if ((r + c) % 2 !== 0) opCount++;
        }
      }

      const opPool = generateBalancedOperatorPool(opCount);
      let opIndex = 0;

      // Generate random grid with spatial distribution logic
      const newGrid: HexCellData[] = [];
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const isOperator = (r + c) % 2 !== 0;
          newGrid.push({
            id: `${r}-${c}`,
            row: r,
            col: c,
            type: isOperator ? 'operator' : 'number',
            value: isOperator
              ? (opPool[opIndex++] || '+')
              : getWeightedNumber().toString(),
          });
        }
      }

      // Find all possible solutions
      const allSolutions = findAllSolutions(newGrid);
      const validSolutions = Array.from(allSolutions.keys())
        .filter(n => n >= min && n <= max)
        .sort((a, b) => a - b); // CRITICAL: Sort first for deterministic shuffle

      // Need at least 5 unique solutions. 
      if (validSolutions.length >= 5) {
        // USE PROPER FISHER-YATES SHUFFLE FOR DETERMINISTIC SELECTION
        const shuffled = [...validSolutions];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(rng() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const targets = shuffled.slice(0, targetCount).sort((a, b) => a - b);
        return { grid: newGrid, targets };
      }
    }

    // Fallback: simpler grid if generation fails often
    console.warn(`Level ${level}: Using fallback grid generation`);
    const newGrid: HexCellData[] = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const isOperator = (r + c) % 2 !== 0;
        newGrid.push({
          id: `${r}-${c}`,
          row: r,
          col: c,
          type: isOperator ? 'operator' : 'number',
          value: isOperator ? '+' : Math.floor(rng() * 5).toString(), // Fallback to very simple (Deterministic)
        });
      }
    }
    // Generate simple UNIQUE targets for fallback
    const targetSet = new Set<number>();
    while (targetSet.size < Math.min(targetCount, max - min + 1)) {
      targetSet.add(Math.floor(rng() * (max - min + 1)) + min);
    }
    const targets = Array.from(targetSet).sort((a, b) => a - b);

    return { grid: newGrid, targets };
  }, []);

  const generateBossLevel = useCallback((bossId: number) => {
    const boss = BOSS_LEVELS.find(b => b.id === bossId);
    if (!boss) return null;

    const targetCount = boss.targets;
    const rng = Math.random;

    if (bossId === 2) {
      // BOSS 2: FALLEN MECHANICS - Retry logic to ensure 5 targets
      for (let attempt = 0; attempt < 10; attempt++) {
        const newGrid: HexCellData[] = [];
        for (let r = 0; r < GRID_ROWS; r++) {
          for (let c = 0; c < GRID_COLS; c++) {
            const isOperator = (r + c) % 2 !== 0;
            newGrid.push({
              id: `${r}-${c}`,
              row: r,
              col: c,
              type: isOperator ? 'operator' : 'number',
              value: isOperator
                ? (rng() > 0.5 ? '+' : '-')
                : (Math.floor(rng() * 9) + 1).toString(), // 1-9
              isFallen: false
            });
          }
        }

        // Find ALL possible paths of length 3 (N-Op-N)
        const allPaths: { result: number, path: string[] }[] = [];
        const numberCells = newGrid.filter(c => c.type === 'number');

        for (const startCell of numberCells) {
          for (const opCell of newGrid.filter(c => c.type === 'operator' && areCellsAdjacent(startCell, c))) {
            for (const endCell of newGrid.filter(c => c.type === 'number' && c.id !== startCell.id && areCellsAdjacent(opCell, c))) {
              const res = calculateResultFromCells([startCell, opCell, endCell]);
              // Target numbers 1-10 for Boss 2
              if (res !== null && res >= 1 && res <= 10) {
                allPaths.push({ result: res, path: [startCell.id, opCell.id, endCell.id] });
              }
            }
          }
        }

        // Greedy select disjoint paths
        const finalTargets: { value: number, displayValue: string, completed: boolean, path: string[] }[] = [];
        const usedCells = new Set<string>();
        const shuffledPaths = allPaths.sort(() => rng() - 0.5);

        for (const p of shuffledPaths) {
          if (finalTargets.length >= targetCount) break;

          // Ensure unique values for Boss 2 targets
          const isDuplicateValue = finalTargets.some(t => t.value === p.result);
          if (isDuplicateValue) continue;

          if (!p.path.some(id => usedCells.has(id))) {
            p.path.forEach(id => usedCells.add(id));
            finalTargets.push({
              value: p.result,
              displayValue: "",
              completed: false,
              path: p.path
            });
          }
        }

        // Only return if we found enough targets
        if (finalTargets.length === targetCount) {
          newGrid.forEach(cell => {
            if (!usedCells.has(cell.id)) {
              if (cell.type === 'number') {
                cell.value = "9";
              } else {
                cell.value = "+";
              }
            }
          });
          return { grid: newGrid, targets: finalTargets };
        }
      }
      return null; // Should not happen easily with 10 attempts
    } else {
      // BOSS 1 & OTHERS: Legacy Generation
      const localGrid: HexCellData[] = [];
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const isOperator = (r + c) % 2 !== 0;
          localGrid.push({
            id: `${r}-${c}`,
            row: r,
            col: c,
            type: isOperator ? 'operator' : 'number',
            value: isOperator
              ? (rng() > 0.5 ? '+' : '-')
              : Math.floor(rng() * 10).toString(),
            isFallen: false
          });
        }
      }

      const allSolutionsMap = findAllSolutions(localGrid);
      const validSolutions = Array.from(allSolutionsMap.keys()).filter(n => n >= 1 && n <= 18);

      const finalTargets: any[] = [];
      const shuffledSolutions = validSolutions.sort(() => rng() - 0.5);

      for (const sol of shuffledSolutions) {
        if (finalTargets.length >= targetCount) break;

        const solPath = allSolutionsMap.get(sol); // RETRIEVE THE PATH!

        let a = Math.floor(rng() * 9) + 1;
        let b = sol - a;
        let op = '+';

        // Display logic (just for show, the real requirement is the Value 'sol')
        if (rng() > 0.5 || b < 1) {
          b = Math.floor(rng() * 9) + 1;
          a = sol + b;
          op = '-';
        }
        if (op === '+' && b <= 0) { b = 1; a = sol - 1; }

        finalTargets.push({
          value: sol,
          displayValue: `${a} ${op} ${b}`, // This is just a hint, user can solve 'sol' any way
          completed: false,
          path: solPath // CRITICAL: Save the path so Boss 2 knows what to protect
        });
      }

      while (finalTargets.length < targetCount) {
        // Fallback targets (ensure uniqueness)
        let val = Math.floor(rng() * 18) + 1;
        if (!finalTargets.some(t => t.value === val)) {
          finalTargets.push({ value: val, displayValue: "??", completed: false, path: [] });
        }
      }

      return { grid: localGrid, targets: finalTargets };
    }
  }, [findAllSolutions, areCellsAdjacent, calculateResultFromCells]);

  const startBossGame = (bossId: number) => {
    const boss = BOSS_LEVELS.find(b => b.id === bossId);
    if (!boss) return;

    // CRITICAL: Require login and loaded profile to play boss levels
    if (!currentUser || !userProfile) {
      console.log(`⛔ Boss ${bossId} richiede login o profilo non caricato!`);
      showToast('Caricamento profilo in corso o accesso richiesto per sfidare i Boss!');
      if (!currentUser) setShowAuthModal(true);
      return;
    }

    // Safety check: Don't allow re-playing defeated bosses
    // Check BOTH localStorage (instant, set on victory) AND profile badges (from DB)
    const badgeToCheck = `boss_${bossId}_defeated`;
    const hasBadge = (userProfile?.badges || []).includes(badgeToCheck);

    console.log(`🔍 Controllo blocco Boss ${bossId}:`, {
      badgeToCheck,
      hasBadge
    });

    if (hasBadge) {
      console.log(`⛔ Boss ${bossId} bloccato.`);
      showToast('Hai già sconfitto questo boss! Sfida completata.');
      return;
    }

    const levelData = generateBossLevel(bossId);
    if (!levelData) return;

    setActiveModal(null);
    setGrid(levelData.grid);

    // CRITICAL FIX: Preserve career level during boss challenges
    // Boss levels are separate challenges and should NOT overwrite max_level
    const careerLevel = userProfile?.max_level || 1;

    // UNIFIED: All boss levels use the same initialization
    setGameState(prev => ({
      ...prev,
      score: 0,
      totalScore: 0,
      streak: 0,
      level: careerLevel, // PRESERVE CAREER LEVEL
      isBossLevel: true,
      bossLevelId: bossId,
      timeLeft: boss.time || 90,
      targetResult: 0,
      status: 'idle', // Stay idle until intro video ends
      levelTargets: levelData.targets,
      targetsFound: 0
    }));

    // SHOW BOSS INTRO (works for ALL boss levels)
    setShowBossIntro(true);
    setIsVideoVisible(true);
  };

  const generateGrid = useCallback((forceStartLevel?: number, forcedSeed?: string) => {
    let nextLevelData;
    let newBuffer = [...levelBuffer];

    const currentLevel = Number(forceStartLevel !== undefined ? forceStartLevel : gameState.level) || 1;

    const targetCount = (duelMode === 'blitz' || activeMatch?.mode === 'blitz') ? 5 : 5; // Always 5 for parity across modes now, specifically requested for Blitz

    if (newBuffer.length === 0 || forceStartLevel !== undefined || forcedSeed) {
      // If we have a forced seed (DUEL MODE), generate exactly that board
      newBuffer = [];
      nextLevelData = createLevelData(currentLevel, forcedSeed, targetCount);
      for (let i = 1; i <= 5; i++) {
        newBuffer.push(createLevelData(currentLevel + i, undefined, targetCount));
      }
    } else {
      // Shift buffer (Normal progression)
      nextLevelData = newBuffer.shift()!;
      // Replenish buffer
      newBuffer.push(createLevelData(Number(gameState.level) + 6, undefined, targetCount));
    }

    setGrid(nextLevelData.grid);
    setLevelBuffer(newBuffer);

    setGameState(prev => ({
      ...prev,
      score: 0, // CRITICAL: Reset level points when generating new grid
      targetResult: 0,
      levelTargets: nextLevelData.targets.map(t => ({ value: t, completed: false, owner: undefined as any }))
    }));
    setTargetAnimKey(k => k + 1);
  }, [levelBuffer, createLevelData, gameState.level]);

  // BADGE CHECKER
  const resetDuelState = async (matchId?: string, userId?: string) => {
    // 1. If currently in a match, ABANDON it properly on DB
    if (matchId && userId) {
      console.log("🏳️ Abandoning Match:", matchId);
      await matchService.abandonMatch(matchId, userId);
    }

    setActiveMatch(null);
    setDuelRounds({ p1: 0, p2: 0, current: 0 });
    setOpponentScore(0);
    setOpponentTargets(0);
    setShowDuelRecap(false);
    setGameState(prev => ({ ...prev, status: 'idle' }));
    setIsVideoVisible(false);
    setShowSurrenderVideo(false);
    setShowVideo(false);
    setShowLostVideo(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const checkAndUnlockBadges = useCallback(async (profile: any) => {
    if (!profile) return;
    const unlockedIds = profile.badges || [];
    const newBadges: string[] = [];

    BADGES.forEach(badge => {
      if (!unlockedIds.includes(badge.id)) {
        if (badge.condition(profile)) {
          newBadges.push(badge.id);
          // Toast Notification
          showToast(`🏆 Medaglia Sbloccata: ${badge.title}!`);
          soundService.playSuccess();
        }
      }
    });

    if (newBadges.length > 0) {
      const updatedBadges = [...unlockedIds, ...newBadges];
      // Update Local
      setUserProfile(prev => prev ? ({ ...prev, badges: updatedBadges }) : null);
      // Update Remote
      await profileService.updateProfile({ id: profile.id, badges: updatedBadges });
    }
  }, [showToast]);

  const loadProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    try {
      const profile = await profileService.getProfile(userId);
      const save = await profileService.loadGameState(userId);
      
      // Load offline backup save state
      let localSave: any = null;
      try {
        const cached = localStorage.getItem(`number_game_save_${userId}`);
        if (cached) localSave = JSON.parse(cached);
      } catch (e) {
        console.warn("Error reading local game save:", e);
      }

      // Resolve the best saved state (max of online save, local backup, and career level)
      let resolvedSave = save || localSave;
      const careerMaxLevel = profile?.max_level || 1;

      if (!resolvedSave) {
        resolvedSave = {
          level: careerMaxLevel,
          totalScore: 0,
          timeLeft: INITIAL_TIME,
          streak: 0,
          estimatedIQ: profile?.estimated_iq || 100
        };
      } else {
        // Correct level if it falls below career max level
        if (resolvedSave.level < careerMaxLevel) {
          resolvedSave.level = careerMaxLevel;
        }
        // Take local save if it is more advanced than the online save
        if (save && localSave && localSave.level > save.level) {
          resolvedSave = localSave;
        }
      }

      setSavedGame(resolvedSave);

      // Sync resolved save back to online DB and local storage if out of sync
      if (profile && JSON.stringify(save) !== JSON.stringify(resolvedSave)) {
        profileService.saveGameState(userId, resolvedSave).catch(e => {
          console.error("Error auto-syncing resolved save to DB:", e);
        });
      }
      try {
        localStorage.setItem(`number_game_save_${userId}`, JSON.stringify(resolvedSave));
      } catch (e) {
        console.warn("Error writing local game save:", e);
      }

      if (profile) {
        setUserProfile(profile);

        // Sync Bonus State from DB (Source of Truth) to LocalStorage
        if (profile.career_time_bonus !== undefined) {
          localStorage.setItem('career_time_bonus', profile.career_time_bonus.toString());
        } else {
          // If undefined (new user?), clear it to be safe
          localStorage.removeItem('career_time_bonus');
        }

        // Sync boss defeat badges from DB to localStorage (ensures cross-session consistency)
        (profile.badges || []).forEach((badge: string) => {
          const match = badge.match(/^boss_(\d+)_defeated$/);
          if (match) {
            localStorage.setItem(`defeated_boss_${match[1]}`, 'true');
          }
        });

        // Check for Badges on Load (In case of missed updates or offline play sync)
        checkAndUnlockBadges(profile);

        setGameState(prev => ({
          ...prev,
          // Only update stats if they are better in DB (usually sync handles this, but just in case)
          estimatedIQ: profile.estimated_iq || 100
        }));
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError' && !error?.message?.includes('signal is aborted without reason')) {
        console.error("Error loading profile:", error);
      }
      
      // Fallback on error (e.g., offline)
      try {
        const cached = localStorage.getItem(`number_game_save_${userId}`);
        if (cached) {
          const localSave = JSON.parse(cached);
          setSavedGame(localSave);
        }
      } catch (e) {
        console.warn("Offline fallback failed:", e);
      }
    } finally {
      setProfileLoading(false);
    }
  }, [checkAndUnlockBadges]);

  // Initialize Session & Handle Auth Redirects (Email Config etc.)
  useEffect(() => {
    // 1. Check current session immediately
    authService.getCurrentSession().then(session => {
      if (session?.user) {
        setCurrentUser(session.user);
        loadProfile(session.user.id);
      } else {
        setProfileLoading(false);
      }
    }).catch(e => {
      // Silent error for session check
      setProfileLoading(false);
    });

    // 2. Listen for Auth Changes (Login, Logout, Email Confirmation Redirects)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔔 Auth Event:', event);

      if (event === 'SIGNED_IN' && session?.user) {
        setCurrentUser(session.user);
        loadProfile(session.user.id);


        // Show Welcome Message ONLY if it's a new registration or recovery
        const username = session.user.user_metadata?.username || 'Giocatore';
        const isSignup = window.location.hash && (window.location.hash.includes('type=signup') || window.location.hash.includes('type=recovery'));

        if (isSignup) {
          const welcomeMsg = `🎉 Account Confermato! Benvenuto in Number, ${username}!`;
          showToast(welcomeMsg, [{ label: 'Profilo', onClick: () => setActiveModal('profile') }]);
        }
        // Else: Standard login, silent entry (no toast)

        // Close modals if open
        setShowAuthModal(false);
      }

      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setUserProfile(null);
        setSavedGame(null);
        setProfileLoading(false);
        localStorage.removeItem('career_time_bonus'); // Clear sensitive session data
        resetDuelState(); // Ensure match state is cleared locally
        setGameState(prev => ({ ...prev, status: 'idle' }));
        showToast("Disconnessione completata.");
      }

      if (event === 'USER_UPDATED') {
        // Handle password recovery or profile update events
        if (session?.user) {
          setCurrentUser(session.user);
          loadProfile(session.user.id);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadProfile, showToast]);

  // GLOBAL PRESENCE & CHALLENGE NOTIFICATION
  useEffect(() => {
    if (!currentUser) {
      setOnlinePlayers([]);
      return;
    }

    // 1. GLOBAL PRESENCE TRACKING
    const globalChannel = (supabase as any)
      .channel('global_online_users', {
        config: { presence: { key: currentUser.id } }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = globalChannel.presenceState();
        const players = Object.values(state).map((presence: any) => presence[0]);
        setOnlinePlayers(players);
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await globalChannel.track({
            id: currentUser.id,
            username: userProfile?.username || currentUser.user_metadata?.username || 'Guerriero',
            avatar_url: userProfile?.avatar_url,
            level: userProfile?.max_level || 1,
            online_at: new Date().toISOString()
          });
        }
      });

    // 2. GLOBAL CHALLENGE LISTENER
    const invitesChannel = (supabase as any)
      .channel('global_invites')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'matches',
        filter: `player2_id=eq.${currentUser.id}`
      }, (payload: any) => {
        const newMatch = payload.new;
        if (newMatch.status === 'invite_pending') {
          // Play badge sound
          soundService.playBadge();
          // Show toast with action - Updated to DIRECT ACCEPT
          showToast(`🎮 Nuova Sfida Ricevuta! Modalità: ${newMatch.mode.toUpperCase().replace('_', ' ')}`, [
            {
              label: 'Accetta',
              onClick: () => {
                setPendingMatchInvite(newMatch.id);
              },
              variant: 'primary'
            }
          ]);
        }
      })
      .subscribe();

    return () => {
      (supabase as any).removeChannel(globalChannel);
      (supabase as any).removeChannel(invitesChannel);
    };
  }, [currentUser, userProfile, showToast]);

  // 3. Game Over Trigger on Time Left reaching zero
  useEffect(() => {
    if (gameState.status === 'playing' && gameState.timeLeft === 0 && !isVictoryAnimating) {
      // TIME ATTACK END (Duel)
      if (activeMatch?.mode === 'time_attack' || activeMatch?.mode === 'blitz') {
        handleTimeAttackEnd();
        return;
      }

      // STANDARD GAME OVER (Single Player)
      if (!activeMatch?.isDuel) {
        setGameState(prev => ({ ...prev, status: 'game-over' }));
        if (currentUser) {
          // MODIFIED: Keep saved game to allow Retry/Checkpoint behavior
          // profileService.clearSavedGame(currentUser.id);
          loadProfile(currentUser.id);
        }

        // VIDEO UNLOCK - AUTO PLAY MUTED ON TIMEOUT (Browser Policy)
        let loseVid = '';
        if (gameState.bossLevelId === 1) {
          loseVid = '/Boss1sconfitta.mp4';
        } else if (gameState.bossLevelId === 2) {
          loseVid = '/RiprovaBoss2noaudio.mp4';
        } else {
          const loseIdx = Math.floor(Math.random() * LOSE_VIDEOS.length);
          loseVid = LOSE_VIDEOS[loseIdx];
          // Play Synchronized Audio Track (Lose1.mp3 / Lose2.mp3)
          soundService.playLose(loseIdx);
        }

        setLoseVideoSrc(loseVid);
        setShowLostVideo(true);
        setIsVideoVisible(true);

        // Force ref update in next tick to ensure element exists
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.src = loseVid;
            videoRef.current.muted = true; // REQUIRED for auto-play without click
            videoRef.current.load();
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(e => console.warn("Loss video autoplay blocked:", e));
            }
          }
        }, 0);
      }
    } else if (gameState.status === 'playing' && !activeMatch?.isDuel && gameState.timeLeft <= 5 && gameState.timeLeft > 0) {
      // LOW TIME WARNING (Single Player Only)
      // Play a tick/beep for the last 5 seconds
      soundService.playTick();
    }
  }, [gameState.timeLeft, gameState.status, activeMatch, currentUser, isVictoryAnimating, loadProfile]);

  useEffect(() => {
    if (!currentUser) return;

    // CHECK FOR PENDING INVITES ON LOAD
    matchService.getPendingInvitesForUser(currentUser.id).then(invites => {
      if (invites.length > 0) {
        invites.forEach(inv => {
          const modeLabel = inv.mode ? inv.mode.toUpperCase().replace('_', ' ') : 'DUEL';
          showToast(`⚔️ Invito per ${modeLabel} da ${inv.player1?.username || 'Sconosciuto'}!`, [
            {
              label: 'Accetta',
              onClick: () => {
                setPendingMatchInvite(inv.id);
              },
              variant: 'primary'
            },
            {
              label: 'Rifiuta',
              onClick: async () => {
                await matchService.declineInvite(inv.id, currentUser.id).catch(() => { });
                showToast("Invito rifiutato.");
              },
              variant: 'secondary'
            }
          ]);
        });
      }
    }).catch(() => { });
  }, [currentUser, showToast]);

  // 4. URL DEEP LINKING (Invitation Handling)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get('joinMatch');
    if (joinId) {
      console.log("🔗 Detected Match Invite Link:", joinId);
      setPendingMatchInvite(joinId);
      // Clean URL
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // 5. AUTO-JOIN PENDING INVITE
  useEffect(() => {
    if (currentUser && pendingMatchInvite && !isJoiningPending) {
      const autoJoin = async () => {
        setIsJoiningPending(true);
        showToast("Accesso alla sfida in corso...");
        try {
          const match = await matchService.getMatchById(pendingMatchInvite);
          if (!match) {
            showToast("Sfida scaduta o non trovata.");
          } else if (match.status === 'finished' || match.status === 'cancelled') {
            showToast("La sfida è già terminata o è stata annullata.");
          } else {
            // Check if I am already in the match or need to join
            const isP1 = match.player1_id === currentUser.id;
            const isP2 = match.player2_id === currentUser.id;

            if (isP1 || isP2) {
              // I'm part of it, just activate
              if (match.status === 'invite_pending' && isP2) {
                await matchService.acceptInvite(match.id, currentUser.id);
              }
            } else if (!match.player2_id) {
              // Joinable public or invite without player2
              await matchService.joinMatch(match.id, currentUser.id);
            } else {
              showToast("La sfida è già al completo.");
              setIsJoiningPending(false);
              setPendingMatchInvite(null);
              return;
            }

            // Start the game logic (onMatchStart copy)
            setActiveModal(null);
            setDuelMode(match.mode as any);
            setActiveMatch({
              id: match.id,
              opponentId: match.player1_id === currentUser.id ? match.player2_id! : match.player1_id,
              isDuel: true,
              isP1: match.player1_id === currentUser.id,
              mode: match.mode // Capture mode explicitly
            });

            setGameState(prev => ({
              ...prev,
              score: 0,
              streak: 0,
              level: userProfile?.max_level || 1,
              timeLeft: match.mode === 'time_attack' ? 60 : INITIAL_TIME,
              status: 'playing',
              levelTargets: [],
            }));
            generateGrid(1, match.grid_seed);
            setOpponentScore(0);
            matchService.resetRoundStatus(match.id);
            soundService.playSuccess();
          }
        } catch (e: any) {
          if (e?.name !== 'AbortError' && !e?.message?.includes('signal is aborted without reason')) {
            console.error("Auto-join error:", e);
            showToast("Impossibile caricare la sfida.");
          }
        } finally {
          setIsJoiningPending(false);
          setPendingMatchInvite(null);
        }
      };
      autoJoin();
    } else if (!currentUser && pendingMatchInvite && !showAuthModal) {
      // Prompt for login if someone followed a link but isn't logged in
      setShowAuthModal(true);
      showToast("Accedi per accettare la sfida!");
    }
  }, [currentUser, pendingMatchInvite, isJoiningPending, showAuthModal, generateGrid, showToast]);


  const togglePause = async (e?: React.PointerEvent | boolean) => {
    if (e && typeof e === 'object' && 'preventDefault' in e) {
      e.preventDefault();
      e.stopPropagation();
    }
    await handleUserInteraction();
    soundService.playUIClick();

    const targetPauseState = typeof e === 'boolean' ? e : !isPaused;

    if (targetPauseState) {
      if (pauseLocked && typeof e !== 'boolean') {
        showToast("Sistema in riscaldamento... Attesa 3s");
        return;
      }
      setIsPaused(true);
    } else {
      setIsPaused(false);
      if (typeof e !== 'boolean') {
        setPauseLocked(true);
        setTimeout(() => setPauseLocked(false), 3000);
      }
    }
  };

  // Fetch Leaderboard Data on Open
  useEffect(() => {
    if (activeModal === 'leaderboard') {
      setLeaderboardData(null); // Reset for loading state
      const fetchLeaderboard = async () => {
        const data = await leaderboardService.getTopPlayers(1000); // Mostra tutti i giocatori (fino a 1000)
        setLeaderboardData(data as any);
      };
      fetchLeaderboard();
    }
  }, [activeModal]);

  // 🔄 CROSS-DEVICE BOSS SYNC: Reload profile from DB every time boss_selection opens.
  // This ensures that if a boss was defeated on another device/browser, the badge state
  // is always fresh from the DB — no persistent connections needed.
  useEffect(() => {
    if (activeModal === 'boss_selection' && currentUser) {
      loadProfile(currentUser.id);
    }
  }, [activeModal, currentUser, loadProfile]);

  // Timer: Dedicated Loop for decrementing time only
  useEffect(() => {
    // MODIFIED: Timer disabled for Standard, ENABLED for Time Attack AND Blitz
    const isTimeDuel = activeMatch?.mode === 'time_attack' || activeMatch?.mode === 'blitz';
    // ADDED: !showGameTutorial blocks timer during tutorials
    if (gameState.status === 'playing' && gameState.timeLeft > 0 && !isVictoryAnimating && !showVideo && !isPaused && !showGameTutorial && (!activeMatch?.isDuel || isTimeDuel)) {
      timerRef.current = window.setInterval(() => {
        setGameState(prev => {
          if (prev.timeLeft <= 0) return prev;
          const newTime = prev.timeLeft - 1;

          // TIME SYNC BROADCAST (Role: Host/P1)
          if (activeMatch?.isDuel && activeMatch.isP1 && newTime % 5 === 0) {
            matchService.sendTimeSync(activeMatch.id, newTime);
          }

          return { ...prev, timeLeft: newTime };
        });
      }, 1000);
    } else {
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [gameState.status, isPaused, isVictoryAnimating, showVideo, activeMatch, gameState.timeLeft, showGameTutorial]);


  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    loadProfile(user.id);
    setShowAuthModal(false);
    showToast(`Benvenuto, ${user.user_metadata?.username || 'Operatore'}`);
  };

  const toggleMute = async (e?: React.PointerEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    await handleUserInteraction();
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    soundService.setMuted(newMuted);
    if (!newMuted) soundService.playUIClick();
  };

  const goToHome = async (e?: React.PointerEvent) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    await handleUserInteraction();
    soundService.playReset();
    vibrateDevice(15);
    setAdvUsesThisLevel(0);
    setIsAdvPlaying(false);

    // SFIDA LOGIC (ABBANDONO)
    if (activeMatch && currentUser && latestMatchData?.status !== 'finished') {
      const targetToWin = duelMode === 'blitz' ? 3 : 5;
      const someoneWon = latestMatchData?.winner_id ||
        (latestMatchData?.p1_rounds >= targetToWin) ||
        (latestMatchData?.p2_rounds >= targetToWin);

      if (!someoneWon) {
        // Se esco durante un duello ATTIVO, dichiaro l'avversario vincitore (Abbandono)
        matchService.abandonMatch(activeMatch.id, currentUser.id).catch(() => { });
        showToast("Sfida abbandonata.");
      }
    }

    setGameState(prev => ({
      ...prev,
      status: 'idle',
      isBossLevel: false,
      bossLevelId: null
    }));
    setActiveModal(null);
    setActiveMatch(null);
    setShowDuelRecap(false);
    setShowVideo(false);
    setShowLostVideo(false);
    setIsVictoryAnimating(false);
    setTriggerParticles(false);
    setPreviewResult(null);
    setSelectedPath([]);
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (currentUser) loadProfile(currentUser.id);
  };

  // BOSS 2: FALLEN MECHANICS (Vibrations & Falling Debris)
  useEffect(() => {
    if (gameState.status !== 'playing' || !gameState.isBossLevel || gameState.bossLevelId !== 2 || isPaused) {
      if (boss2TimerRef.current) clearTimeout(boss2TimerRef.current);
      if (boss2VibrationRef.current) clearTimeout(boss2VibrationRef.current);
      return;
    }

    const startVictimCycle = () => {
      // 1. Access latest grid via Ref to make decision
      const currentGrid = gridRef.current;
      const targets = gameStateRef.current.levelTargets || [];
      const pathCells = new Set(targets.map(t => t.path || []).flat());

      // 2. Pick a "victim" cell (STRICTLY NUMBERS that are not in the solution path)
      const survivors = currentGrid.filter(c => !pathCells.has(c.id) && !c.isFallen && !c.isVibrating && c.type === 'number');

      if (survivors.length === 0) {
        // Retry soon if no victim found
        boss2VibrationRef.current = window.setTimeout(startVictimCycle, 2000);
        return;
      }

      const victim = survivors[Math.floor(Math.random() * survivors.length)];

      // 3. Update State: Start Vibrating
      setGrid(prev => prev.map(c => c.id === victim.id ? { ...c, isVibrating: true } : c));
      soundService.playSelect(); // Subtle cue for vibration start

      // 4. Schedule Fall (3s later)
      boss2TimerRef.current = window.setTimeout(() => {
        setGrid(prev => {
          soundService.playTick(); // Sound cue for collapse

          // Mark victim as fallen
          let nextGrid = prev.map(c =>
            c.id === victim.id ? { ...c, isFallen: true, isVibrating: false } : c
          );

          // Cascade Effect logic
          let changed = true;
          while (changed) {
            changed = false;
            const nonFallen = nextGrid.filter(c => !c.isFallen);
            nextGrid = nextGrid.map(c => {
              if (c.type === 'operator' && !c.isFallen) {
                const hasNeighbors = nonFallen.some(other => other.id !== c.id && areCellsAdjacent(c, other));
                if (!hasNeighbors) {
                  changed = true;
                  return { ...c, isFallen: true };
                }
              }
              return c;
            });
          }
          return nextGrid;
        });

        // 5. Schedule Next Cycle (9s wait after fall = 12s total cycle)
        boss2VibrationRef.current = window.setTimeout(startVictimCycle, 9000);
      }, 3000);
    };

    // Initial delay: start first cycle after 5 seconds
    boss2VibrationRef.current = window.setTimeout(startVictimCycle, 5000);

    return () => {
      if (boss2TimerRef.current) clearTimeout(boss2TimerRef.current);
      if (boss2VibrationRef.current) clearTimeout(boss2VibrationRef.current);
    };
  }, [gameState.status, gameState.isBossLevel, gameState.bossLevelId, isPaused]);

  const goToDuelLobby = async () => {
    soundService.playReset();
    setGameState(prev => ({ ...prev, status: 'idle' }));
    setActiveModal('duel_selection'); // Torna alla lobby dei duelli
    setActiveMatch(null);
    setShowDuelRecap(false);
    setShowVideo(false);
    setShowLostVideo(false);
    setIsVictoryAnimating(false);
    setTriggerParticles(false);
    setPreviewResult(null);
    setSelectedPath([]);
    if (timerRef.current) window.clearInterval(timerRef.current);
  };

  const handleQuickInvite = async () => {
    if (!currentUser || !userProfile?.referral_code) {
      showToast("Accedi per invitare un amico e guadagnare bonus!");
      setShowAuthModal(true);
      return;
    }

    soundService.playUIClick();
    const joinUrl = `${window.location.origin}/?ref=${userProfile.referral_code}`;
    const text = `Ricevi 60s EXTRA! Usa il mio link per iscriverti a NumberGame!`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "Regalo NumberGame!", text, url: joinUrl });
      } catch (err) {
        console.log('Share dismissed', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(joinUrl);
        showToast("🎁 Link copiato! Condividilo per i 60s bonus!");
      } catch (err) {
        showToast("Impossibile copiare il link.");
      }
    }
  };


  const handleDuelRoundStart = (matchData: any) => {
    // Close Modal
    setShowDuelRecap(false);
    setGameState(prev => ({
      ...prev,
      levelTargets: [],
      score: 0, // Reset score (targets found) for new round
      // FORCE 60s for Time Attack AND Blitz when round actually starts
      timeLeft: (matchData.mode === 'time_attack' || matchData.mode === 'blitz') ? 60 : INITIAL_TIME,
      status: 'playing'
    }));

    if (activeMatch?.isDuel) {
      // Deterministic seed based on match ID and total rounds played
      // This ensures both players get the same board for each round
      const roundSum = (matchData.p1_rounds || 0) + (matchData.p2_rounds || 0);
      const deterministicSeed = `${matchData.id}_round_${roundSum}`;
      generateGrid(1, deterministicSeed);
    } else {
      generateGrid(gameState.level);
    }

    if (currentUser?.id === matchData.player1_id) {
      matchService.resetRoundStatus(matchData.id);
    }
    soundService.playReset();
  };

  // Wrapper for calculation using paths (IDs) instead of Cells
  const calculateResultFromPath = (pathIds: string[]): number | null => {
    const cells = pathIds.map(id => grid.find(c => c.id === id)).filter(Boolean) as HexCellData[];
    return calculateResultFromCells(cells);
  };

  // DUEL: Subscribe to Match Updates (Score, Rounds, Winner, READY STATUS)
  useEffect(() => {
    if (activeMatch?.id && activeMatch.isDuel) {
      const sub = matchService.subscribeToMatch(activeMatch.id, (payload: any) => {
        const newData = payload.new;
        if (!newData) return;

        setLatestMatchData((prev: any) => {
          if (prev?.id === newData.id && prev.status === 'finished' && newData.status !== 'finished') {
            return { ...newData, status: 'finished', winner_id: prev.winner_id };
          }
          return newData;
        });

        const amIP1 = newData.player1_id === currentUser?.id;

        // Ensure Active Match has critical data (Mode) for Host Timer
        if (activeMatch && (!activeMatch.mode || activeMatch.mode !== newData.mode)) {
          setActiveMatch(prev => prev ? { ...prev, isP1: amIP1, mode: newData.mode } : null);
          setDuelMode(newData.mode as any); // Force Sync Local Mode
        } else if (activeMatch && activeMatch.isP1 !== amIP1) {
          setActiveMatch(prev => prev ? { ...prev, isP1: amIP1 } : null);
        }

        // TIME ATTACK SYNC START
        // If match becomes ACTIVE and it's Time Attack, start immediately if not playing
        // AND ensuring we haven't already finished this match locally (prevent loop)
        if (newData.status === 'active' &&
          (newData.mode === 'time_attack' || activeMatch?.mode === 'time_attack') &&
          gameStateRef.current.status !== 'playing' &&
          processedWinRef.current !== newData.id) {
          console.log("⚡ Time Attack START SYNC");
          startGame(1); // Force start
        }

        if (newData.p1_ready && newData.p2_ready && showDuelRecap && newData.status !== 'finished') {
          handleDuelRoundStart(newData);
        }

        const currentMode = newData.mode || activeMatch?.mode || 'standard';
        const currentP1Rounds = newData.p1_rounds || 0;
        const currentP2Rounds = newData.p2_rounds || 0;
        const totalRoundsWon = currentP1Rounds + currentP2Rounds;

        // TRACK ROUND CHANGES (Blitz Mode Auto-Reset)
        // Use Ref to avoid stale closure issues in subscription
        const localRounds = duelRoundsRef.current;
        const localTotal = localRounds.p1 + localRounds.p2;

        // Detect if DB has advanced beyond our local state
        // Detect if DB has advanced beyond our local state
        // DOMINION / BLITZ SIGNAL INTERCEPTOR
        // We use 'current_round' to signal Stolen Targets (+Value = P1, -Value = P2)
        // We check if the signal is different from what we last processed.
        const signal = newData.current_round || 0;
        const lastSignal = localRounds.current || 0;

        if (currentMode === 'blitz' && newData.status === 'active' && signal !== 0 && signal !== lastSignal) {
          const stolenValue = Math.abs(signal);
          const newOwner = signal > 0 ? 'p1' : 'p2';
          const imOwner = (amIP1 && newOwner === 'p1') || (!amIP1 && newOwner === 'p2');

          console.log(`🏴 DOMINION SIGNAL: Target ${stolenValue} captured by ${newOwner}`);

          // Update UI Targets Ownership
          setGameState(prev => {
            const updated = prev.levelTargets.map(t => {
              if (t.value === stolenValue) {
                return { ...t, completed: true, owner: newOwner };
              }
              return t;
            });
            return { ...prev, levelTargets: updated };
          });

          // Toast for Enemy Action
          // Toast for Enemy Action - DISABLED for Blitz Dominion (Too spammy)
          if (!imOwner && currentMode !== 'blitz') {
            showToast(`L'AVVERSARIO HA RUBATO IL ${stolenValue}!`, [], 2000);
            soundService.playError(); // Alert sound
          }

          // Update REF to avoid re-processing same signal
          duelRoundsRef.current = {
            ...duelRoundsRef.current,
            current: signal
          };
        }

        // REMOVED OLD BLITZ ROUND LOGIC (Previously lines 984-1082)


        const opScore = amIP1 ? newData.player2_score : newData.player1_score;
        const opRounds = amIP1 ? newData.p2_rounds : newData.p1_rounds;

        setOpponentScore(opScore);
        // In Blitz Dominion, targets = opScore (targets owned), in Standard targets = opRounds (total targets)
        setOpponentTargets(currentMode === 'blitz' ? opRounds : opRounds);

        setDuelRounds({
          p1: currentP1Rounds,
          p2: currentP2Rounds,
          current: newData.current_round || 1
        });

        // Use new values for loss check
        const opponentRoundWins = amIP1 ? currentP2Rounds : currentP1Rounds;

        // ROBUST CHECK: "Wins who first reaches 5 points"
        // We use the match target_score (default 5 for Standard) to determine immediate loss.
        const targetScore = newData.target_score || (currentMode === 'blitz' ? 3 : 5);
        const isScoreConditionMet = opRounds >= targetScore;

        // Standard Loss Condition: Opponent reached target score (5)
        // TIME ATTACK & BLITZ: Ignored, game only ends when time is up
        const isStandardLoss = (currentMode === 'standard') && isScoreConditionMet;

        // PREDICTIVE LOSS: If opponent has enough rounds/points, I lost. Don't wait for DB status update.
        // We also check DB status as a fallback.
        const isDefiniteLoss = isStandardLoss || (newData.status === 'finished' && newData.winner_id && newData.winner_id !== currentUser?.id);

        if (isDefiniteLoss && gameStateRef.current.status !== 'opponent-surrendered') {
          // Ensure processedWinRef blocks duplicate execution but allow UI cleanup
          // We allow re-entry if we are still 'playing' to ensure we force-quit the game loop
          if (processedWinRef.current !== newData.id || gameStateRef.current.status === 'playing') {

            // Only play video/sound if this is the FIRST time processing this loss
            const isFirstProcess = processedWinRef.current !== newData.id;

            console.log("🏁 MATCH FINISHED: I am the LOSER. Playing Defeat Sequence.");
            processedWinRef.current = newData.id;

            // FORCE UI SYNC: Ensure the opponent's winning score is visible
            setOpponentTargets(targetScore);
            setOpponentScore(amIP1 ? newData.player2_score : newData.player1_score);

            if (timerRef.current) window.clearInterval(timerRef.current);
            setGameState(prev => ({ ...prev, status: 'idle' }));
            setIsDragging(false);
            setSelectedPath([]);

            if (videoRef.current && isFirstProcess) {
              const loseVid = LOSE_VIDEOS[Math.floor(Math.random() * LOSE_VIDEOS.length)];
              setLoseVideoSrc(loseVid);
              setShowLostVideo(true);
              setIsVideoVisible(true);

              // FORCE SOUND PLAYBACK
              soundService.playLose();

              videoRef.current.src = loseVid;
              videoRef.current.muted = false;
              videoRef.current.load();
              videoRef.current.play().catch(e => {
                console.warn("Loss video blocked:", e);
                // Fallback if video fails to play
                setTimeout(() => setShowDuelRecap(true), 2000);
              });
            } else if (isFirstProcess) {
              // Fallback if video element is missing
              soundService.playLose();
              setGameState(prev => ({ ...prev, status: 'idle' })); // RE-FORCE IDLE
              setShowDuelRecap(true);
            }
          }
        }


        // ADDITIONAL CHECK: Handle CANCELLED explicitly (Surrender/Abandon)
        if (newData.status === 'cancelled' && !showSurrenderVideo && gameStateRef.current.status !== 'opponent-surrendered') {
          console.log("⚡ Realtime: Match Cancelled (Opponent Surrendered)");
          if (timerRef.current) window.clearInterval(timerRef.current);
          setGameState(prev => ({ ...prev, status: 'idle' }));

          // Trigger Surrender Win Flow
          const randomSurrender = SURRENDER_VIDEOS[Math.floor(Math.random() * SURRENDER_VIDEOS.length)];
          setSurrenderVideoSrc(randomSurrender);
          setShowSurrenderVideo(true);
          setIsVideoVisible(false);

          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.src = randomSurrender;
            videoRef.current.play().catch(e => {
              console.warn("Surrender video blocked:", e);
              setIsVideoVisible(false);
            });
            soundService.playExternalSound('Resa1.mp3');
          }
        }
      });

      if (latestMatchData?.id === activeMatch.id && latestMatchData?.status === 'finished' && gameStateRef.current.status === 'playing') {
        const amIWinner = latestMatchData.winner_id === currentUser?.id;

        // Prevent duplicate handling if we already processed this win locally
        if (amIWinner && processedWinRef.current === latestMatchData.id) return;

        if (!amIWinner) {
          // Play Defeat Video
          // FORCE UI SYNC here too as a fallback
          const targetScore = latestMatchData.target_score || (duelMode === 'blitz' ? 3 : 5);
          setOpponentTargets(targetScore);

          if (videoRef.current) {
            const loseVid = LOSE_VIDEOS[0];
            videoRef.current.src = loseVid;
            videoRef.current.muted = true;
            videoRef.current.load();
            videoRef.current.play().catch(e => console.warn("Duel loss video blocked:", e));

            soundService.playLose();
            setLoseVideoSrc(loseVid);
            setShowLostVideo(true);
            setIsVideoVisible(true);
          }
        }

        setGameState(prev => ({ ...prev, status: 'idle' }));
        setIsDragging(false);
        setSelectedPath([]);

        // Delay Recap controlled by video end
        if (!amIWinner && !videoRef.current) {
          // Fallback if no video plays
          setShowDuelRecap(true);
        } else if (amIWinner && !videoRef.current) {
          // If I won but no video (rare), show recap
          setShowDuelRecap(true);
        }
      }

      return () => {
        if (sub) (supabase as any).removeChannel(sub);
      };
    }
  }, [activeMatch, currentUser, showDuelRecap, latestMatchData]);

  // BLITZ ROUND TRANSITION EFFECT
  // BLITZ ROUND TRANSITION EFFECT REMOVED (Legacy Round Logic)

  // MATCH BROADCAST LOGIC (Abandonment & Presence & Time Sync)
  useEffect(() => {
    if (activeMatch?.id && currentUser) {
      const channel = matchService.subscribeToMatchEvents(activeMatch.id, currentUser.id, (event, payload) => {
        // TIME SYNC HANDLER (Role: Client/P2)
        if (event === 'time_sync' && !activeMatch.isP1) {
          const serverTime = payload.timeLeft;
          const drift = Math.abs(gameStateRef.current.timeLeft - serverTime);
          // Only sync if significant drift (> 2s) to avoid UI jumping on jitter
          if (drift > 2) {
            console.log(`⏱️ Sync: Host at ${serverTime}s, Local at ${gameStateRef.current.timeLeft}s. Adjusting.`);
            setGameState(prev => ({ ...prev, timeLeft: serverTime }));
          }
          return;
        }

        const handleSurrender = () => {
          if (processedWinRef.current === activeMatch.id) {
            console.log("⏭️ Surrender already processed for this match.");
            return;
          }
          processedWinRef.current = activeMatch.id;
          console.log("🏳️ Handling Surrender/Abandonment Flow...");

          if (timerRef.current) window.clearInterval(timerRef.current);
          setGameState(prev => {
            return { ...prev, status: 'opponent-surrendered' };
          });

          // SURRENDER FLOW:
          const randomSurrender = SURRENDER_VIDEOS[Math.floor(Math.random() * SURRENDER_VIDEOS.length)];
          setSurrenderVideoSrc(randomSurrender);
          setShowSurrenderVideo(true);
          setIsVideoVisible(true);

          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.src = randomSurrender;
            videoRef.current.load();
            videoRef.current.play()
              .then(() => console.log("🎬 Surrender video playing..."))
              .catch(e => {
                console.warn("⚠️ Surrender video blocked:", e);
                setIsVideoVisible(true);
              });
            soundService.playExternalSound('Resa1.mp3');
          }
        };

        if (event === 'match_abandoned' && payload.fromUserId !== currentUser?.id) {
          console.log("⚡ Broadcast: Match Abandoned by opponent.");
          handleSurrender();
        } else if (event === 'presence_sync') {
          const opponentId = activeMatch.opponentId;
          const isOpponentPresent = payload[opponentId];
          if (isOpponentPresent && disconnectionTimerRef.current) {
            console.log("✅ Opponent reconnected. Clearing timer.");
            clearTimeout(disconnectionTimerRef.current);
            disconnectionTimerRef.current = null;
            showToast("✅ AVVERSARIO RICONNESSO!", [], 3000);
          }
        } else if (event === 'presence_leave') {
          console.log("👥 Presence Leave Event:", payload);
          const opponentId = activeMatch.opponentId;
          const hasOpponentLeft = payload.some((p: any) =>
            p.user_id === opponentId ||
            p.key === opponentId
          );

          if (hasOpponentLeft && (gameStateRef.current.status === 'playing' || gameStateRef.current.status === 'round-won')) {
            console.log("⚠️ Opponent left (silent). Starting 15s grace period.");
            showToast("⚠️ AVVERSARIO DISCONNESSO! Vittoria a tavolino tra 15s...", [], 5000);

            if (disconnectionTimerRef.current) clearTimeout(disconnectionTimerRef.current);
            disconnectionTimerRef.current = setTimeout(async () => {
              console.log("⏰ Disconnection timer expired. Winning by abandonment.");

              // Force local win state first to block other signals
              if (processedWinRef.current !== activeMatch.id) {
                // We call declareWinner to notify the DB/opponent
                await matchService.declareWinner(activeMatch.id, currentUser.id);
                // Trigger the UI victory flow
                handleSurrender();
              }

              disconnectionTimerRef.current = null;
            }, 15000);
          }
        } else if (event === 'match_won' && payload.winnerId !== currentUser?.id) {
          // BROADCAST LOSS SIGNAL RECEIVED
          console.log("⚡ Broadcast: Match WON by opponent. Triggering Defeat immediately.");

          if (processedWinRef.current !== activeMatch?.id || gameStateRef.current.status === 'playing') {
            processedWinRef.current = activeMatch?.id;

            if (timerRef.current) window.clearInterval(timerRef.current);
            setGameState(prev => ({ ...prev, status: 'idle' }));
            setIsDragging(false);
            setSelectedPath([]);

            setOpponentTargets(duelMode === 'blitz' ? 3 : 5);

            if (videoRef.current) {
              const loseVid = LOSE_VIDEOS[Math.floor(Math.random() * LOSE_VIDEOS.length)];
              setLoseVideoSrc(loseVid);
              setShowLostVideo(true);
              setIsVideoVisible(true);
              soundService.playLose();
              videoRef.current.src = loseVid;
              videoRef.current.muted = false;
              videoRef.current.load();
              videoRef.current.play().catch(e => {
                console.warn("Loss video blocked (via broadcast):", e);
                setTimeout(() => setShowDuelRecap(true), 2000);
              });
            } else {
              soundService.playLose();
              setShowDuelRecap(true);
            }
          }
        }
      });

      return () => {
        if (disconnectionTimerRef.current) clearTimeout(disconnectionTimerRef.current);
        (supabase as any).removeChannel(channel);
      };
    }
  }, [activeMatch, currentUser, duelMode]);

  /* 
  // SYNC WATCHDOG (Fallback for missed events) - DISABLED temporarily as requested
  useEffect(() => {
    let syncInterval: NodeJS.Timeout;
   
    if (activeMatch?.id && gameStateRef.current.status === 'playing') {
      syncInterval = setInterval(async () => {
        const status = await matchService.verifyMatchStatus(activeMatch.id);
   
        // SAFETY CHECK: If transient error, skip this cycle
        if (status && status.status === 'ERROR') return;
   
        const isMatchGone = status === null;
        const isCancelled = status && status.status === 'cancelled';
        const isFinished = status && status.status === 'finished';
   
        // CASE 1: SURRENDER / ABNORMAL END
        // Match deleted or explicitly cancelled -> Force Surrender Win
        if (isMatchGone || isCancelled) {
          if (gameStateRef.current.status === 'playing') {
            console.warn("SYNC WATCHDOG: Match abandoned/missing. Triggering Surrender Win.");
            if (timerRef.current) window.clearInterval(timerRef.current);
            setGameState(prev => ({ ...prev, status: 'idle' }));
   
            const randomSurrender = SURRENDER_VIDEOS[Math.floor(Math.random() * SURRENDER_VIDEOS.length)];
            setSurrenderVideoSrc(randomSurrender);
            setShowSurrenderVideo(true);
            setIsVideoVisible(false);
   
            if (videoRef.current) {
              videoRef.current.muted = false;
              videoRef.current.src = randomSurrender;
              videoRef.current.play().catch(e => {
                console.warn("Surrender (watchdog) video blocked:", e);
                setIsVideoVisible(false);
              });
            }
          }
        }
        // CASE 2: NORMAL END (SYNC LAG)
        // Match finished but I am still playing -> Force Normal End
        else if (isFinished) {
          if (gameStateRef.current.status === 'playing') {
            console.log("SYNC WATCHDOG: Match finished normally. Syncing state.");
            if (timerRef.current) window.clearInterval(timerRef.current);
   
            // Determine if I won or lost based on DB
            const amIWinner = status.winner_id === currentUser?.id;
   
            // If I lost, show Lost Sound/Flow. If I won, handle Win.
            // Since we are lagging, easiest is to go to idle and let DuelRecap component show result.
            setGameState(prev => ({ ...prev, status: 'idle' }));
            if (!amIWinner) soundService.playExternalSound('lost.mp3');
            setShowDuelRecap(true);
          }
        }
      }, 3000); // Check every 3 seconds
    }
   
    return () => {
      if (syncInterval) clearInterval(syncInterval);
    };
  }, [activeMatch, currentUser, gameState.status]);
  */

  // NEW: Invite Listener (Global) - Properly placed after generateGrid
  useEffect(() => {
    if (!currentUser) return;

    const channel = (supabase as any).channel('invite-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matches',
          filter: `player2_id=eq.${currentUser.id}`,
        },
        async (payload: any) => {
          if (payload.new.status === 'invite_pending') {
            soundService.playSuccess(); // Notification sound

            showToast(`⚔️ SFIDA! Un giocatore ti ha invitato a ${payload.new.mode}.`, [
              {
                label: 'ACCETTA',
                onClick: async () => {
                  const success = await matchService.acceptInvite(payload.new.id, currentUser.id);
                  if (success) {
                    // Initialize Game
                    const seed = payload.new.grid_seed;
                    const mode = payload.new.mode;

                    setActiveMatch({ id: payload.new.id, opponentId: payload.new.player1_id, isDuel: true, isP1: false, mode: mode });
                    setDuelMode(mode);

                    // Reset Game State for Duel
                    soundService.playUIClick();
                    setGameState(prev => ({
                      ...prev,
                      score: 0,
                      totalScore: prev.totalScore,
                      streak: 0,
                      level: userProfile?.max_level || 1,
                      timeLeft: mode === 'time_attack' ? 60 : INITIAL_TIME,
                      targetResult: 0,
                      status: 'playing',
                      lastLevelPerfect: true,
                      basePoints: BASE_POINTS_START,
                      levelTargets: [],
                    }));

                    generateGrid(1, seed);
                    setOpponentScore(0);
                    matchService.resetRoundStatus(payload.new.id);

                    // If any modal is open, close it
                    setActiveModal(null);
                  }
                }
              },
              {
                label: 'RIFIUTA',
                onClick: async () => {
                  await matchService.abandonMatch(payload.new.id, currentUser.id);
                  showToast("Invito rifiutato.");
                }
              }
            ]);
          }
        }
      )
      .subscribe();

    return () => { (supabase as any).removeChannel(channel); };
  }, [currentUser, showToast, generateGrid]);


  const startGame = async (startLevel: number = 1) => {
    await handleUserInteraction();
    soundService.playUIClick();
    try {
      localStorage.setItem('number_tutorial_done', 'true');
    } catch (e) { console.warn("LocalStorage blocked", e); }

    setActiveModal(null);
    setIsVictoryAnimating(false);
    setTriggerParticles(false);
    setPreviewResult(null);
    setShowVideo(false);
    setShowLostVideo(false);
    setShowDuelRecap(false);

    // FIXED: Session score (totalScore) now always starts at 0 for Single Player sittings
    // to ensure a clean local run, while all-time points are safely kept in the global profile.
    const careerBonus = parseInt(localStorage.getItem('career_time_bonus') || '0');
    // Consume bonus if starting a standard game
    if (careerBonus > 0 && !activeMatch?.isDuel) {
      localStorage.setItem('career_time_bonus', '0');
      if (currentUser) {
        profileService.updateProfile({ id: currentUser.id, career_time_bonus: 0 }).catch(e => console.error("Errore azzeramento bonus:", e));
      }
      // Show toast notification
      showToast(`🏆 BONUS BOSS ATTIVATO! +${careerBonus}s al tempo iniziale!`);
    }

    // AUTOMATIC REFERRAL BONUS FOR NEW ACCOUNTS (or first run)
    let referralBonus = 0;
    if (userProfile && userProfile.bonus_charges && userProfile.bonus_charges > 0 && !activeMatch?.isDuel && startLevel === 1) {
      referralBonus = 60;
      const newCharges = userProfile.bonus_charges - 1;
      setUserProfile(prev => prev ? { ...prev, bonus_charges: newCharges } : null);
      if (currentUser) {
        profileService.updateProfile({ id: currentUser.id, bonus_charges: newCharges }).catch(e => console.error("Error updating referral bonus:", e));
      }
      showToast("🎁 BONUS REFERRAL ATTIVATO! +60s EXTRA PER LA PARTITA!");
      soundService.playLevelComplete(); 
    }

    setGameState(prev => {
      let nextTotalScore = prev.totalScore;

      if (!activeMatch?.isDuel) {
        // Single Player Logic: Every sitting starts at 0.
        // It will accumulate points across levels (via nextLevel) as long as the session continues.
        nextTotalScore = 0;
      }

      return {
        ...prev,
        score: 0,
        totalScore: nextTotalScore,
        streak: 0,
        level: startLevel,
        timeLeft: (activeMatch?.mode === 'time_attack') ? 60 : INITIAL_TIME + careerBonus + referralBonus,
        targetResult: 0,
        status: 'playing',
        estimatedIQ: startLevel === 1 ? 100 : prev.estimatedIQ,
        lastLevelPerfect: true,
        basePoints: BASE_POINTS_START,
        levelTargets: [],
        isBossLevel: false,
        bossLevelId: null,
      };
    });

    // Reset Buffer and Grid with explicit Level
    setTimeout(() => generateGrid(startLevel), 0);

    // Clear and re-save initial state for session
    if (currentUser && !activeMatch?.isDuel) {
      const initialSaveState = {
        totalScore: startLevel === 1 ? 0 : (savedGame?.totalScore || 0),
        streak: 0,
        level: startLevel,
        timeLeft: (activeMatch?.mode === 'time_attack') ? 60 : INITIAL_TIME,
        estimatedIQ: startLevel === 1 ? 100 : (userProfile?.estimated_iq || 100),
      };

      profileService.saveGameState(currentUser.id, initialSaveState)
        .catch(e => {
          if (e?.name !== 'AbortError' && !e?.message?.includes('signal is aborted without reason')) {
            console.error("Error saving initial game state:", e);
          }
        });
      setSavedGame(initialSaveState);
      try {
        localStorage.setItem(`number_game_save_${currentUser.id}`, JSON.stringify(initialSaveState));
      } catch (e) {
        console.warn("LocalStorage blocked", e);
      }
    }
  };

  const restoreGame = async () => {
    if (!savedGame) return;
    await handleUserInteraction();
    soundService.playSuccess(); // Different sound for restore?

    setActiveModal(null);
    setIsVictoryAnimating(false);
    setTriggerParticles(false);
    setPreviewResult(null);

    // Check for Career Bonus
    const careerBonus = parseInt(localStorage.getItem('career_time_bonus') || '0');
    let newTimeLeft = savedGame.timeLeft || INITIAL_TIME;

    if (careerBonus > 0) {
      localStorage.setItem('career_time_bonus', '0');
      if (currentUser) {
        profileService.updateProfile({ id: currentUser.id, career_time_bonus: 0 }).catch(e => console.error("Errore azzeramento bonus:", e));
      }
      newTimeLeft += careerBonus;
      showToast(`🏆 BONUS BOSS ATTIVATO! +${careerBonus}s al tempo ripristinato!`);
    }

    setGameState(prev => ({
      ...prev, // Keep some defaults
      score: 0,
      totalScore: 0, // Reset session score to 0 on restore
      streak: savedGame.streak || 0,
      level: Number(savedGame.level) || 1,
      timeLeft: newTimeLeft,
      status: 'playing',
      estimatedIQ: savedGame.estimatedIQ || 100,
      levelTargets: [],
    }));

    // Restore Bonus State
    // Bonus surge and last bonus spawn level removed as they were abolished

    // Generate Grid for the SAVED Level
    setTimeout(() => generateGrid(Number(savedGame.level) || 1), 0);
  };



  // FULL GAME RESET: Ora agisce come "NUOVA PARTITA" (soft reset)
  // Resetta Livello a 1, ma mantiene Badge, Boss e Statistiche totali.
  const handleFullReset = async () => {
    if (!currentUser) return;

    try {
      // 1. Cancella la partita salvata (resume state)
      await profileService.saveGameState(currentUser.id, null);
      setSavedGame(null);
      try {
        localStorage.removeItem(`number_game_save_${currentUser.id}`);
      } catch (e) {
        console.warn("LocalStorage blocked", e);
      }
      localStorage.setItem('career_time_bonus', '0'); // Clear any local bonus

      // 2. Reset solo del livello nel profilo (mantiene badge, score totale, ecc.)
      await profileService.updateProfile({
        id: currentUser.id,
        max_level: 1,
        career_time_bonus: 0 // Assicurarsi che il reset cancelli anche i bonus accumulati
      });

      // 3. Ricarica profilo aggiornato
      await loadProfile(currentUser.id);

      // 4. Reset stato gioco locale
      setGameState({
        ...gameState,
        score: 0,
        // totalScore: 0, // Manteniamo il punteggio totale accumulato? Se vuoi reset parziale, meglio tenerlo o resettarlo? 
        // L'utente ha chiesto "azzeriamo livelli e tempo come pulsante nuova partita".
        // La mia handleNewGame di prima metteva totalScore a 0 LATO CLIENT per la sessione, ma non toccava il DB.
        totalScore: 0, // Reset visuale sessione
        streak: 0,
        level: 1,
        timeLeft: INITIAL_TIME,
        targetResult: 0,
        status: 'idle',
        estimatedIQ: 100, // Manteniamo o reset? HandleNewGame lo teneva. Mettiamo default visuale.
        lastLevelPerfect: true,
        basePoints: BASE_POINTS_START,
        levelTargets: [],
        isBossLevel: false,
        bossLevelId: null,
      });

      setActiveModal(null);
      soundService.playSuccess();
      showToast('🎮 PARTITA RIAVVIATA! Si riparte dal Livello 1');

    } catch (error: any) {
      if (error?.name !== 'AbortError' && !error?.message?.includes('signal is aborted without reason')) {
        console.error('Errore durante il reset:', error);
        showToast('❌ Errore durante il riavvio. Riprova.');
      }
    }
  };

  const handleStartGameClick = useCallback(async (e?: React.PointerEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    await handleUserInteraction();
    soundService.playUIClick();

    // Clear any leftover duel state when starting single player
    if (activeMatch) setActiveMatch(null);

    // Always show briefing modal before starting
    setActiveModal('resume_confirm');
    return;

    // New Comic Tutorial Check
    if (localStorage.getItem('comic_game_tutorial_done') !== 'true') {
      startGame(); // Start the game first so elements exist
      setTimeout(() => setShowGameTutorial(true), 1000); // Delay to let animation finish
    } else {
      startGame();
    }
  }, [savedGame, startGame, handleUserInteraction]);

  const nextTutorialStep = async () => {
    await handleUserInteraction();
    soundService.playSelect();
    if (tutorialStep < TUTORIAL_STEPS.length - 1) {
      setTutorialStep(prev => prev + 1);
    } else {
      // Tutorial Finished - Just close and stay on Home
      setActiveModal(null);
      localStorage.setItem('number_tutorial_done', 'true');
      // If we are not playing, ensure we are visible in idle
      if (gameState.status !== 'playing') {
        setGameState(prev => ({ ...prev, status: 'idle' }));
      }
    }
  };

  const evaluatePath = (pathIds: string[]) => {
    try {
      if (pathIds.length < 3) {
        if (pathIds.length > 0) soundService.playReset();
        setSelectedPath([]);
        setPreviewResult(null);
        return;
      }

      const result = calculateResultFromPath(pathIds);
      // USE REF TO ENSURE FRESHNESS (Fixes First Target Glitch)
      const currentTargets = gameStateRef.current.levelTargets || [];
      // BLITZ DOMINION FIX: Allow selecting 'completed' targets to steal them back!
      const isBlitzDominion = activeMatch?.mode === 'blitz' || duelMode === 'blitz';

      let matchedTarget;

      if (gameStateRef.current.isBossLevel) {
        // BOSS MODE - Any uncompleted target can be matched (not sequential)
        if (gameStateRef.current.bossLevelId === 2) {
          // BOSS 2: Must match value AND specific path of one of the available targets
          matchedTarget = currentTargets.find(t => {
            if (t.completed) return false;
            if (t.value !== result) return false;
            const path = t.path || [];
            // Check path forwards OR backwards
            const isForward = path.length === pathIds.length && path.every((id, idx) => id === pathIds[idx]);
            const isBackward = path.length === pathIds.length && [...path].reverse().every((id, idx) => id === pathIds[idx]);
            return isForward || isBackward;
          });
        } else {
          // OTHER BOSSES: Any uncompleted target with matching value
          matchedTarget = currentTargets.find(t => !t.completed && t.value === result);
        }
      } else {
        // STANDARD MODE LOGIC (Any uncompleted target is valid)
        matchedTarget = currentTargets.find(t => t.value === result && (!t.completed || isBlitzDominion));
      }

      if (matchedTarget) {
        // SYNC VIDEO TRIGGER FOR MOBILE - Call play() directly in user gesture stack
        const isLastTarget = currentTargets.filter(t => !t.completed).length === 1;
        const isTimeAttack = !!activeMatch && (activeMatch.mode === 'time_attack' || duelMode === 'time_attack');

        // CRITICAL MOBILE FIX: Set source and play synchronously within the event handler
        if (isLastTarget && !isTimeAttack && !isBlitzDominion && videoRef.current) {
          // 1. Play "Fine Partita" sound immediately on last click
          soundService.playLevelComplete();

          // 2. Delay the Victory Video (Win1/Win2) to let the first sound play
          setTimeout(() => {
            if (videoRef.current) {

              if (gameStateRef.current.isBossLevel) {
                // BOSS LEVELS: Skip video here — handleSuccess manages the full victory sequence
                console.log('🎬 [evaluatePath] Boss level last target — delegating video to handleSuccess');
              } else {
                // STANDARD LEVEL WIN
                const winIdx = Math.floor(Math.random() * WIN_VIDEOS.length);
                const vidSrc = WIN_VIDEOS[winIdx];

                videoRef.current.src = vidSrc;
                videoRef.current.muted = true; // Still muted for browser policy, user un-mutes
                videoRef.current.load();

                // Play Sync Win Audio (matching the video) instead of relying on video track
                soundService.playWinner(winIdx);

                const playPromise = videoRef.current.play();
                if (playPromise !== undefined) {
                  playPromise.catch(error => {
                    console.warn("Video play blocked by browser policy:", error);
                    // Fallback: If video blocked, at least we heard the audio
                  });
                }

                setWinVideoSrc(vidSrc);
                setShowVideo(true);
                setIsVideoVisible(true);
              }
            }
          }, 800); // 0.8 second delay
        }

        vibrateDevice([40, 30, 40]); // Subtle double-pulse for success on mobile
        setPathStatus('correct');
        setMatchedTargetValue(result!);
        
        // Attende 500ms mostrando la celebre animazione a 4 fasi del target prima di completarlo!
        setTimeout(() => {
          handleSuccess(result!);
          setSelectedPath([]);
          setPathStatus(null);
          setMatchedTargetValue(null);
        }, 500);
      } else {
        setPathStatus('wrong');
        handleError();
        vibrateDevice(80); // Single hard pulse for error
        
        // Attende 420ms mostrando il flash rosso fuoco prima di pulire la selezione!
        setTimeout(() => {
          setSelectedPath([]);
          setPathStatus(null);
        }, 420);
      }
      setPreviewResult(null);
    } catch (err: any) {
      if (err?.name !== 'AbortError' && !err?.message?.includes('signal is aborted without reason')) {
        console.error("Critical error in evaluatePath:", err);
      }
      // Prevent crash, reset selection
      setSelectedPath([]);
    }
  };

  async function handleSuccess(matchedValue: number) {
    if (isProcessingSuccessRef.current) return;
    try {
      isProcessingSuccessRef.current = true;
      console.log("🎯 SUCCESS: Target Found:", matchedValue);
      // RACE CONDITION FIX: Do not process win if game is already over
      if (gameStateRef.current.status !== 'playing') {
        isProcessingSuccessRef.current = false;
        return;
      }

      // Update targets state
      const currentTargets = gameStateRef.current.levelTargets;
      const isBlitzDominion = activeMatch?.mode === 'blitz' || duelMode === 'blitz';
      const amIP1 = activeMatch?.isP1;
      const myOwner = amIP1 ? 'p1' : 'p2';
      const timeBonus = gameStateRef.current.timeLeft || 0;

      // BLITZ DOMINION FIX: Allow finding completed targets too
      let targetIndex = -1;
      if (gameStateRef.current.isBossLevel) {
        targetIndex = currentTargets.findIndex(t => !t.completed && t.value === matchedValue);
      } else {
        // TARGET SELECTION LOGIC: Fix for Dominion/Blitz
        // 1. Try to find an UNCOMPLETED target with this value
        targetIndex = currentTargets.findIndex(t => t.value === matchedValue && !t.completed);

        // 2. If all targets with this value are completed, but it's Blitz Dominion, try to steal one FROM THE OPPONENT
        if (targetIndex === -1 && isBlitzDominion) {
          targetIndex = currentTargets.findIndex(t => t.value === matchedValue && t.completed && t.owner !== myOwner);
        }
      }

      if (targetIndex === -1) {
        console.warn("⚠️ Target already completed or not found:", matchedValue);
        return;
      }

      // BLITZ OPTIMIZATION: Prevent stealing from self
      if (isBlitzDominion) {
        const t = currentTargets[targetIndex];
        if (t.completed && t.owner === myOwner) {
          console.log("⚠️ Target already owned by me: IGNORED");
          return;
        }
      }

      soundService.playSuccess();

      // 2. Calculate Rewards
      const alreadyCompleted = currentTargets[targetIndex].completed;

      // Points only for the FIRST capture, to avoid infinite points exploit in Blitz
      const myPoints = (alreadyCompleted && isBlitzDominion)
        ? (gameState.score || 0) // No new points for stealing
        : (gameState.score || 0) + (timeBonus * 2) + 50 + (gameState.streak * 10);
      const basePoints = 10;
      const streakBonus = gameStateRef.current.streak * 1;
      const currentPoints = basePoints + streakBonus;
      const newScore = gameStateRef.current.score + currentPoints;

      const newTargets = [...currentTargets];
      // Mark as completed. In Dominion, the 'owner' update (later) is what really counts.
      newTargets[targetIndex] = { ...newTargets[targetIndex], completed: true };

      // BOSS 2 FALLEN EFFECT - Immediate cascade for solved path
      if (gameStateRef.current.isBossLevel && gameStateRef.current.bossLevelId === 2) {
        const path = newTargets[targetIndex].path;
        if (path) {
          setGrid(prev => {
            let nextGrid = prev.map(cell =>
              path.includes(cell.id) ? { ...cell, isFallen: true } : cell
            );

            // Immediate Cascade: If an operator is left without neighbors, it falls
            let changed = true;
            while (changed) {
              changed = false;
              const nonFallen = nextGrid.filter(c => !c.isFallen);
              nextGrid = nextGrid.map(c => {
                if (c.type === 'operator' && !c.isFallen) {
                  const hasNeighbors = nonFallen.some(other => other.id !== c.id && areCellsAdjacent(c, other));
                  if (!hasNeighbors) {
                    changed = true;
                    return { ...c, isFallen: true };
                  }
                }
                return c;
              });
            }
            return nextGrid;
          });
        }
      }

      // Update Local Game State right away for UI feedback
      setGameState(prev => ({
        ...prev,
        score: newScore,
        totalScore: prev.totalScore + currentPoints,
        streak: prev.streak + 1,
        targetsFound: prev.targetsFound + 1,
        estimatedIQ: Math.min(200, prev.estimatedIQ + 0.5),
        levelTargets: newTargets
      }));

      // DEFINISCI COSTANTI (Winning bonuses)
      const finalTimeBonus = Math.floor(gameStateRef.current.timeLeft * 1.5);
      const finalVictoryBonus = 50;
      const totalWinBonuses = finalTimeBonus + finalVictoryBonus;
      const finalPointsToSync = newScore + totalWinBonuses;

      setScoreAnimKey(k => k + 1);

      const isTimeAttack = !!activeMatch && (activeMatch.mode === 'time_attack' || duelMode === 'time_attack');
      const isBlitz = !!activeMatch && (duelMode === 'blitz' || activeMatch.mode === 'blitz');

      // For Time Attack/Blitz, we don't care about 'allDone' in the traditional sense
      const localTargetsFound = newTargets.filter(t => t.completed).length;
      const isBoss = gameStateRef.current.isBossLevel;
      // CRITICAL: Boss victory depends only on completing all targets in the level
      const allDone = isBoss
        ? newTargets.every(t => t.completed)
        : (newTargets.every(t => t.completed) && (!isTimeAttack && !isBlitz));

      console.log(`🎯 [handleSuccess] Targets: ${localTargetsFound}/${newTargets.length} | allDone: ${allDone} | isBoss: ${isBoss}`);

      // TIME ATTACK: REGENERATE TARGET AFTER 3 SECONDS
      if (isTimeAttack) {
        // Calculate new total target count manually to avoid async state lag
        const newTargetsFound = gameStateRef.current.targetsFound + 1;
        const amIP1 = activeMatch!.isP1;

        matchService.updateMatchStats(activeMatch!.id, amIP1, newScore, newTargetsFound)
          .catch(e => {
            if (e?.name !== 'AbortError' && !e?.message?.includes('signal is aborted without reason')) {
              console.error("TA Stats Sync Error", e);
            }
          });

        setTimeout(() => {
          // Check if game is still playing
          if (gameStateRef.current.status !== 'playing') return;

          const currentTargetsRef = gameStateRef.current.levelTargets;
          // Find the finished target index (safe lookup)
          // We rely on the fact that we just completed 'matchedValue'. 
          // But multiple instances of same value? We find the first completed one that matches or index.
          // Better: just replace the specific index we touched 'targetIndex'.

          if (targetIndex >= 0 && targetIndex < currentTargetsRef.length) {
            // Generate new UNIQUE Random Target Logic
            const lvl = gameStateRef.current.level;
            const diff = getDifficultyRange(lvl);
            const min = diff.min;
            // Ensure max is valid (at least 10 numbers range) and respects the cap only if min is low
            const max = Math.max(min + 10, Math.min(25, diff.max));

            // Find all valid unique solutions on the CURRENT grid
            const allSols = Array.from(findAllSolutions(gridRef.current).keys());
            const currentTargetValues = currentTargetsRef.map(t => t.value);

            // Candidates: valid on grid AND not currently on screen
            const candidates = allSols.filter(v => v >= min && v <= max && !currentTargetValues.includes(v));

            let newTargetValue;
            if (candidates.length > 0) {
              // Pick a guaranteed valid unique solution
              newTargetValue = candidates[Math.floor(Math.random() * candidates.length)];
            } else {
              // Extreme Fallback: deterministic unique selection
              // Create pool of all available integers in range
              const rangePool: number[] = [];
              for (let i = min; i <= max; i++) {
                if (!currentTargetValues.includes(i)) rangePool.push(i);
              }

              if (rangePool.length > 0) {
                newTargetValue = rangePool[Math.floor(Math.random() * rangePool.length)];
              } else {
                // Absolute failsafe (expand range upwards until unique)
                let emergencyVal = min;
                while (currentTargetValues.includes(emergencyVal)) emergencyVal++;
                newTargetValue = emergencyVal;
              }
            }

            setGameState(prev => {
              const updatedTargets = [...prev.levelTargets];
              if (updatedTargets[targetIndex]) {
                updatedTargets[targetIndex] = { value: newTargetValue, completed: false };
              }
              return { ...prev, levelTargets: updatedTargets };
            });
          }
        }, 3000); // 3 Seconds delay (As requested)
      }

      if (activeMatch?.isDuel && duelMode === 'blitz') {
        const isP1 = activeMatch.isP1;

        // DOMINION LOGIC: Steal the target!
        const signalValue = matchedValue; // The number itself

        // 1. Calculate new ownership status locally
        const updatedTargets = newTargets.map(t => {
          if (t.value === matchedValue) {
            return { ...t, completed: true, owner: isP1 ? 'p1' : 'p2' };
          }
          return t;
        });

        // 2. Calculate current count of owned targets
        const myOwnerId = isP1 ? 'p1' : 'p2';
        const oppOwnerId = isP1 ? 'p2' : 'p1';

        const myNewTargetCount = updatedTargets.filter(t => t.owner === myOwnerId).length;
        const opNewTargetCount = updatedTargets.filter(t => t.owner === oppOwnerId).length;

        // Sync Points as well for Tie-Breaker
        const myPoints = newScore;
        const opPoints = opponentScore;

        // 3. Update DB
        // targetsP1, targetsP2, pointsP1, pointsP2
        await matchService.stealTarget(activeMatch.id, isP1, signalValue,
          isP1 ? myNewTargetCount : opNewTargetCount, // Targets P1
          isP1 ? opNewTargetCount : myNewTargetCount, // Targets P2
          isP1 ? myPoints : opPoints,                 // Points P1
          isP1 ? opPoints : myPoints                  // Points P2
        );

        // Update local state with the final ownership (so UI turns green)
        setGameState(prev => ({ ...prev, levelTargets: updatedTargets }));
      }

      if (allDone) {
        setTriggerParticles(false);
        if (!videoRef.current) soundService.playExternalSound('Fine_partita_win.mp3');

        // BOSS LEVEL WIN LOGIC
        if (gameStateRef.current.isBossLevel) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          setIsVictoryAnimating(true);

          // Reward calculation
          const bonusAmt = gameStateRef.current.bossLevelId === 2 ? 45 : 30;
          const bonusPoints = gameStateRef.current.bossLevelId === 2 ? 1500 : 1000;

          // Sync score to global profile AND award boss completion
          if (currentUser) {
            const bossFinalPoints = newScore + 50;
            const currentBossId = gameStateRef.current.bossLevelId;

            if (currentBossId) {
              const targetBadge = `boss_${currentBossId}_defeated`;
              console.log(`🏆 [VICTORY] Boss ${currentBossId} Sconfitto! Badge: ${targetBadge}`);

              // ⚡ STEP 1: INSTANT LOCAL LOCK — write to localStorage immediately (synchronous)
              // This guarantees the boss is blocked even before the DB responds
              const localBossKey = `defeated_boss_${currentBossId}`;
              localStorage.setItem(localBossKey, 'true');
              console.log(`✅ [LOCAL] Boss ${currentBossId} bloccato localmente: ${localBossKey}=true`);

              // ⚡ STEP 2: Update local React state immediately (no await needed)
              setUserProfile(prev => {
                if (!prev) return prev;
                const currentBadges = prev.badges || [];
                if (currentBadges.includes(targetBadge)) return prev;
                return { ...prev, badges: [...currentBadges, targetBadge] };
              });

              // ⚡ STEP 3: Sync to DB in background (non-blocking)
              profileService.completeBoss(currentUser.id, currentBossId)
                .then(result => {
                  if (result && result.profile) {
                    const updatedProfile = result.profile;
                    setUserProfile(updatedProfile);
                    if (updatedProfile.career_time_bonus !== undefined) {
                      localStorage.setItem('career_time_bonus', updatedProfile.career_time_bonus.toString());
                    }
                    return profileService.syncProgress(currentUser.id, bossFinalPoints, gameStateRef.current.level, gameStateRef.current.estimatedIQ);
                  }
                })
                .then(() => loadProfile(currentUser.id))
                .catch(e => console.error("Errore salvataggio boss DB:", e));
            }
          }

          // START VIDEO SEQUENCE: STEP 1 (Bonus Video)
          setTimeout(() => {
            if (videoRef.current) {
              const vidSrc = gameStateRef.current.bossLevelId === 1
                ? '/Bonus30secondiboss.mp4'
                : '/Bonus45secondiboss.MP4';

              videoRef.current.src = vidSrc;
              videoRef.current.muted = true; // Stay muted for bonus video as it has no audio usually
              videoRef.current.load();

              const playPromise = videoRef.current.play();
              if (playPromise !== undefined) {
                playPromise.catch(e => console.warn("Video blocked:", e));
              }

              setIsBossBonusPlaying(true);
              setWinVideoSrc(vidSrc);
              setShowVideo(true);
              setIsVideoVisible(true);
            }
          }, 300);

          return;
        }

        // DUEL WIN LOGIC
        if (activeMatch?.isDuel) {
          // STANDARD MODE - WIN CONDITION: 5 TARGETS (POINTS)
          // CRITICAL FIX: Ensure this NEVER runs for Blitz mode
          if (duelMode === 'standard') {
            const finalScore = newScore;

            // OPTIMIZATION: If we win (5 targets), send ONE atomic update to finish match.
            // Otherwise, send regular stats update.
            if (localTargetsFound >= 5) {
              try {
                // FORCE SYNC FINAL STATS FIRST (Ensure 5 is broadcasted)
                // We revert to 2-step process to double-ensure opponent receives the "5" rounds count
                await matchService.updateMatchStats(activeMatch.id, activeMatch.isP1, finalScore, localTargetsFound);

                // THEN DECLARE WINNER (COMPETITIVE)
                const wonRace = await matchService.declareWinner(activeMatch.id, currentUser.id);

                if (!wonRace) {
                  console.log("🏁 Race lost: Opponent won first. Aborting victory sequence.");
                  return;
                }

                // BROADCAST WIN SIGNAL (FAST PATH)
                matchService.sendWinSignal(activeMatch.id, currentUser.id, finalScore);

                processedWinRef.current = activeMatch.id;

                // Optimistic Update
                setLatestMatchData(prev => ({
                  ...prev,
                  status: 'finished',
                  winner_id: currentUser!.id,
                  player1_score: activeMatch.isP1 ? finalScore : prev?.player1_score,
                  player2_score: !activeMatch.isP1 ? finalScore : prev?.player2_score,
                  p1_rounds: activeMatch.isP1 ? 5 : prev?.p1_rounds,
                  p2_rounds: !activeMatch.isP1 ? 5 : prev?.p2_rounds,
                  player1_id: activeMatch.isP1 ? currentUser.id : prev?.player1_id, // Ensure IDs are robust
                  player2_id: !activeMatch.isP1 ? currentUser.id : prev?.player2_id,
                  last_time_bonus: finalTimeBonus,
                  last_victory_bonus: finalVictoryBonus
                }));

                // SYNC GLOBAL SCORE: Match Points + Bonuses
                await profileService.syncProgress(currentUser.id, finalPointsToSync, gameStateRef.current.level, gameStateRef.current.estimatedIQ);
                await loadProfile(currentUser.id);

                soundService.playLevelComplete();

                setTimeout(() => {
                  if (videoRef.current) {
                    const winIdx = Math.floor(Math.random() * WIN_VIDEOS.length);
                    const vidSrc = WIN_VIDEOS[winIdx];
                    videoRef.current.src = vidSrc;
                    videoRef.current.muted = false;
                    videoRef.current.load();
                    videoRef.current.play().catch(e => console.warn("Duel win video blocked:", e));
                    soundService.playWinner(winIdx);
                    setWinVideoSrc(vidSrc);
                    setShowVideo(true);
                    setIsVideoVisible(true);
                  }
                }, 800);

              } catch (error: any) {
                if (error?.name !== 'AbortError' && !error?.message?.includes('signal is aborted without reason')) {
                  console.error("Error finishing duel safely:", error);
                }
                setGameState(prev => ({ ...prev, status: 'idle' }));
                setShowDuelRecap(true);
              }
              setSelectedPath([]);
              return;
            } else {
              // Regular update (Not a win yet)
              matchService.updateMatchStats(activeMatch.id, activeMatch.isP1, finalScore, localTargetsFound)
                .catch(e => console.error("Error syncing duel stats:", e));
            }
          }
          // BLITZ DOMINION LOGIC:
          // We intentionally do NOT trigger a win here.
          // Dominion mode ends strictly when the timer reaches zero (handled in handleTimeAttackEnd).
          // Finding all targets (if that were possible/relevant) doesn't end the game early in Dominion.
        }

        // STANDARD LEVEL WIN LOGIC (Single Player)
        if (timerRef.current) window.clearInterval(timerRef.current);
        setIsVictoryAnimating(true);

        setGameState(prev => ({
          ...prev,
          score: prev.score + totalWinBonuses,
          totalScore: prev.totalScore + totalWinBonuses,
          streak: 0,
          estimatedIQ: Math.min(200, prev.estimatedIQ + 4),
          levelTargets: newTargets,
        }));

        if (currentUser) {
          // 3. LEVEL UP & SAVE (SINGLE PLAYER ONLY)
          // CRITICAL FIX: Do NOT save state or increment level if in a DUEL or BOSS LEVEL
          if (!activeMatch && !gameStateRef.current.isBossLevel) {
            const nextLvlVal = gameStateRef.current.level + 1;
            const saveState = {
              totalScore: gameStateRef.current.totalScore + totalWinBonuses,
              streak: 0,
              level: nextLvlVal,
              timeLeft: gameStateRef.current.timeLeft,
              estimatedIQ: gameStateRef.current.estimatedIQ,
            };
            // SYNC TO GLOBAL PROFILE
            profileService.syncProgress(currentUser.id, finalPointsToSync, saveState.level, saveState.estimatedIQ)
              .then(() => loadProfile(currentUser.id))
              .catch(e => {
                if (e?.name !== 'AbortError' && !e?.message?.includes('signal is aborted without reason')) {
                  console.error("Error syncing progress:", e);
                }
              });

            profileService.saveGameState(currentUser.id, saveState)
              .catch(e => {
                if (e?.name !== 'AbortError' && !e?.message?.includes('signal is aborted without reason')) {
                  console.error("Error saving game state:", e);
                }
              });
            setSavedGame(saveState);
            try {
              localStorage.setItem(`number_game_save_${currentUser.id}`, JSON.stringify(saveState));
            } catch (e) {
              console.warn("LocalStorage blocked", e);
            }
          }
        }
      } else {
        // NOT ALL DONE - CONTINUE PLAYING
        // setGameState was already called at the top of handleSuccess for consistent UI update
        // SYNC DUEL STATS (Non-Winning Move)
        if (activeMatch?.isDuel && currentUser) {
          // Calculate localTargetsFound for this scope
          const localTargetsFound = newTargets.filter(t => t.completed).length;

          if (duelMode === 'standard') {
            // STANDARD MODE: Score logic
            matchService.updateMatchStats(activeMatch.id, activeMatch.isP1, newScore, localTargetsFound)
              .catch(e => console.error("Error syncing duel stats:", e));

            // CHECK WIN CONDITION HERE TOO
            // CRITICAL: Ensure we are explicitly in STANDARD mode
            if (localTargetsFound >= 5 && duelMode === 'standard') {
              (async () => {
                try {
                  // FORCE SYNC FINAL STATS (Ensure 5 is broadcasted)
                  await matchService.updateMatchStats(activeMatch.id, activeMatch.isP1, newScore, localTargetsFound);

                  const wonRace = await matchService.declareWinner(activeMatch.id, currentUser.id);
                  if (!wonRace) {
                    console.log("🏁 Race lost (secondary): Opponent won first.");
                    return;
                  }

                  // BROADCAST WIN SIGNAL
                  matchService.sendWinSignal(activeMatch.id, currentUser.id, newScore);

                  processedWinRef.current = activeMatch.id;

                  // Optimistic Data Update
                  setLatestMatchData(prev => ({
                    ...prev,
                    status: 'finished',
                    winner_id: currentUser.id,
                    player1_score: activeMatch.isP1 ? newScore : prev?.player1_score,
                    player2_score: !activeMatch.isP1 ? newScore : prev?.player2_score,
                    p1_rounds: activeMatch.isP1 ? 5 : prev?.p1_rounds,
                    p2_rounds: !activeMatch.isP1 ? 5 : prev?.p2_rounds,
                  }));

                  // SYNC GLOBAL SCORE
                  const finalPointsToSync = newScore;
                  await profileService.syncProgress(currentUser.id, finalPointsToSync, gameStateRef.current.level, gameStateRef.current.estimatedIQ);
                  await loadProfile(currentUser.id);

                  soundService.playLevelComplete();

                  setTimeout(() => {
                    if (videoRef.current) {
                      const winIdx = Math.floor(Math.random() * WIN_VIDEOS.length);
                      const vidSrc = WIN_VIDEOS[winIdx];
                      videoRef.current.src = vidSrc;
                      videoRef.current.muted = false;
                      videoRef.current.load();
                      videoRef.current.play().catch(e => console.warn("Duel win video blocked (safe):", e)); // SAFE CATCH
                      setWinVideoSrc(vidSrc);
                      setShowVideo(true);
                      setIsVideoVisible(true);
                    }
                  }, 800);
                } catch (e: any) {
                  console.error("Duel Win Error (Handled):", e); // CATCH ALL ASYNC ERRORS
                  // Fallback recap
                  setGameState(prev => ({ ...prev, status: 'idle' }));
                  setShowDuelRecap(true);
                }
              })().catch(err => console.error("Unhandled async closure error:", err)); // OVERALL CATCH
              setSelectedPath([]);
              return;
            }

          } else {
            // Blitz/TimeAttack generic sync
            const currentRounds = activeMatch.isP1 ? duelRounds.p1 : duelRounds.p2;
            matchService.updateMatchStats(activeMatch.id, activeMatch.isP1, localTargetsFound, currentRounds)
              .catch(e => console.error("Error syncing duel stats:", e));
          }
        }

        // TIME ATTACK: Individual Target Refill
        if (duelMode === 'time_attack' || activeMatch?.mode === 'time_attack') {
          setTimeout(() => {
            const currentState = gameStateRef.current;
            if (!currentState || !currentState.grid) return;

            const currentGrid = currentState.grid;
            const currentRefTargets = currentState.levelTargets || [];
            const allSols = Array.from(findAllSolutions(currentGrid).keys());
            const activeValues = currentRefTargets.filter(t => !t.completed).map(t => t.value);
            const candidates = allSols.filter(v => !activeValues.includes(v));

            if (candidates.length > 0) {
              const nextVal = candidates[Math.floor(Math.random() * candidates.length)];
              setGameState(prev => {
                const updated = [...prev.levelTargets];
                const idx = updated.findIndex(t => t.value === matchedValue && t.completed);
                if (idx !== -1) {
                  updated[idx] = { value: nextVal, completed: false };
                }
                return { ...prev, levelTargets: updated };
              });
              soundService.playPop();
            }
          }, 3000);
        }
      }
      setSelectedPath([]);
    } catch (error: any) {
      if (error?.name !== 'AbortError' && !error?.message?.includes('signal is aborted without reason')) {
        console.error("Critical error in handleSuccess:", error);
      }
      setGameState(prev => ({ ...prev, status: 'idle' }));
      setSelectedPath([]);
    } finally {
      // Small Delay before allowing next success to prevent rapid-fire detection issues
      setTimeout(() => {
        isProcessingSuccessRef.current = false;
      }, 100);
    }
  }

  const handleTimeAttackEnd = () => {
    // 1. Play Sound (Finished)
    soundService.playExternalSound('Fine_partita_win.mp3');

    // 2. Final Score Update and Finish Match
    if (activeMatch && currentUser) {
      processedWinRef.current = activeMatch.id;
      const myScore = gameStateRef.current.score; // This is POINTS (10, 20...)
      const oppScore = opponentScore;             // This is OPP POINTS (if synced correctly in Blitz)

      let winnerId: string | null = null;

      // Determine My Targets vs Opponent Targets (for Blitz)
      // Standard: Targets = Completed Count (Accumulated)
      // Blitz: Targets = Owned Count (Current)
      let myTargetsForSync = gameStateRef.current.levelTargets.filter(t => t.completed).length; // Default

      if (activeMatch.mode === 'blitz') {
        const isP1 = activeMatch.isP1;
        const myOwnerId = isP1 ? 'p1' : 'p2';
        const oppOwnerId = isP1 ? 'p2' : 'p1';

        // SOURCE OF TRUTH: Local Target State (synced via signals)
        const myOwned = gameStateRef.current.levelTargets.filter(t => t.owner === myOwnerId).length;
        const oppOwned = gameStateRef.current.levelTargets.filter(t => t.owner === oppOwnerId).length;

        // Use THESE for win calculation
        myTargetsForSync = myOwned;

        console.log(`🏁 Blitz End Analysis: Me(${myOwned}) vs Opp(${oppOwned})`);

        // 1. PRIMARY: Who has more TARGETS owned?
        if (myOwned > oppOwned) {
          winnerId = currentUser.id;
        } else if (oppOwned > myOwned) {
          winnerId = activeMatch.opponentId;
        } else {
          // 2. SECONDARY: Tie-Breaker (Points gathered)
          if (myScore > oppScore) {
            winnerId = currentUser.id;
          } else if (oppScore > myScore) {
            winnerId = activeMatch.opponentId;
          } else {
            winnerId = null; // Perfect Draw
          }
        }
      } else if (activeMatch.mode === 'time_attack') {
        const amIP1 = activeMatch.isP1;
        const myTargets = gameStateRef.current.targetsFound; // LOCAL ACCUMULATED TARGETS AS SOURCE OF TRUTH
        const oppTargets = amIP1 ? (latestMatchData?.p2_rounds || 0) : (latestMatchData?.p1_rounds || 0);

        // SYNC THIS VALUE TO DB
        myTargetsForSync = myTargets;

        console.log(`🏁 TimeAttack End: Me(${myTargets} targets, ${myScore} pts) vs Opp(${oppTargets} targets, ${oppScore} pts)`);

        if (myTargets > oppTargets) {
          winnerId = currentUser.id;
        } else if (oppTargets > myTargets) {
          winnerId = activeMatch.opponentId;
        } else {
          // Tie-Breaker: Points
          if (myScore > oppScore) winnerId = currentUser.id;
          else if (oppScore > myScore) winnerId = activeMatch.opponentId;
          else winnerId = null;
        }
      }

      const iWon = winnerId === currentUser.id;

      // PASS POINTS TO GLOBAL:
      // Use ONLY the points from this match to avoid session-total inflation
      const pointsToSync = myScore + 100; // +100 Bonus for winning/finishing

      // Sync Stats: Score (Points) AND Targets (Owned Count or Found Count)
      matchService.updateMatchStats(activeMatch.id, activeMatch.isP1, myScore, myTargetsForSync)
        .then(async () => {
          // DECLARE WINNER (COMPETITIVE)
          const wonRace = await matchService.declareWinner(activeMatch.id, winnerId || '');

          if (wonRace || (winnerId === null)) { // If draw, we don't care who writes first
            if (iWon) {
              matchService.sendWinSignal(activeMatch.id, currentUser.id, myScore);
              // SYNC TO GLOBAL PROFILE - Score + Win Bonus
              profileService.syncProgress(currentUser.id, pointsToSync, gameStateRef.current.level, gameStateRef.current.estimatedIQ)
                .then(() => loadProfile(currentUser.id));
            }
          }
        })
        .catch(e => console.error("Error ending time attack/blitz:", e));

      // 3. Play Video before Recap
      if (iWon) {
        setTimeout(() => {
          if (videoRef.current) {
            const winIdx = Math.floor(Math.random() * WIN_VIDEOS.length);
            const vidSrc = WIN_VIDEOS[winIdx];
            videoRef.current.src = vidSrc;
            videoRef.current.muted = true;
            videoRef.current.load();
            videoRef.current.play().catch(e => console.warn("TimeAttack win video blocked:", e));
            soundService.playWinner(winIdx);
            setWinVideoSrc(vidSrc);
            setShowVideo(true);
            setIsVideoVisible(true);
          }
        }, 800);
      } else {
        setTimeout(() => {
          if (videoRef.current) {
            const loseVid = LOSE_VIDEOS[0];
            videoRef.current.src = loseVid;
            videoRef.current.muted = true;
            videoRef.current.load();
            videoRef.current.play().catch(e => console.warn("TimeAttack loss video blocked:", e));
            soundService.playLose();
            setLoseVideoSrc(loseVid);
            setShowLostVideo(true);
            setIsVideoVisible(true);
          }
        }, 800);
      }

      // 4. Show Recap trigger handles by Video Close
      // Fallback only if no video
      if (!iWon && !activeMatch?.isDuel) {
        // Should not happen here given logic
      }
    } else {
      setGameState(prev => ({ ...prev, status: 'idle' }));
      setShowDuelRecap(true);
    }
  };

  function handleError() {
    soundService.playError();
    setGameState(prev => ({
      ...prev,
      streak: 0,
      lastLevelPerfect: false,
      basePoints: BASE_POINTS_START,
      estimatedIQ: Math.max(70, prev.estimatedIQ - 1.5),
    }));
  }



  const nextLevel = () => {
    soundService.playUIClick();
    vibrateDevice(20);
    setIsVictoryAnimating(false);
    const nextLvl = Number(gameState.level) + 1;

    // --- BOSS UNLOCK CHECK ---

    // Check for boss unlocks
    const unlockedBoss = BOSS_LEVELS.find(b => b.requiredLevel === nextLvl && !b.isComingSoon);
    if (unlockedBoss) {
      showToast(`🏆 NUOVA SFIDA BOSS SBLOCCATA: ${unlockedBoss.title}!`);
      soundService.playSuccess();
    }

    setGameState(prev => ({
      ...prev,
      level: nextLvl,
      status: 'playing',
      score: 0, // CRITICAL: Reset level score to 0 for the new level
      streak: 0,
      // CARRY OVER: Add 60s to whatever is left
      timeLeft: prev.timeLeft + 60,
    }));
    setAdvUsesThisLevel(0); // Reset AD usage for new level
    // Pass explicit level to avoid stale state
    generateGrid(nextLvl);

    // Persist new level state
    if (currentUser && !activeMatch) {
      const saveState = {
        totalScore: gameState.totalScore,
        streak: 0,
        level: nextLvl,
        timeLeft: gameState.timeLeft + 60,
        estimatedIQ: gameState.estimatedIQ,
        score: 0, // Reset level score in save state
      };
      profileService.saveGameState(currentUser.id, saveState).catch(e => {
        if (e?.name !== 'AbortError' && !e?.message?.includes('signal is aborted without reason')) {
          console.error("Error saving next level state:", e);
        }
      });
      setSavedGame(saveState);
      try {
        localStorage.setItem(`number_game_save_${currentUser.id}`, JSON.stringify(saveState));
      } catch (e) {
        console.warn("LocalStorage blocked", e);
      }
    }
  };



  useEffect(() => {
    if (gameState.status === 'level-complete' || gameState.status === 'game-over') {
      getIQInsights(gameState.totalScore, gameState.level, gameState.timeLeft).then(setInsight);
    }
  }, [gameState.status, gameState.totalScore, gameState.level, gameState.timeLeft]); // Added dependencies

  // BOSS UNLOCK CHECKER
  useEffect(() => {
    if (gameState.status === 'idle' && userProfile) {
      // BOSS 1 UNLOCK (Level > 5)
      if ((userProfile.max_level || 1) > 5) {
        const key = `boss_unlock_seen_1_${userProfile.id}`;
        if (localStorage.getItem(key) !== 'true') {
          setTimeout(() => {
            // Play Unlock Video (Placeholder for now)
            setShowHomeTutorial(false); // Hide tutorial if overlapping
            showToast("⚠️ LIVELLO BOSS SBLOCCATO!", [{ label: "GIOCA ORA", onClick: () => setActiveModal('boss_selection') }]);
            soundService.playBadge(); // Alert Sound
            localStorage.setItem(key, 'true');
          }, 3000);
        }
      }
    }
  }, [gameState.status, userProfile, showToast]);

  /* INPUT BLOCKING LOGIC */
  const canInteract = () => {
    // STRICTLY BLOCK if game is over or paused or not playing
    if (gameState.status !== 'playing') return false;
    if (isPaused) return false;
    if (isVictoryAnimating) return false;
    if (showVideo || showLostVideo) return false;
    if (showDuelRecap) return false; // Explicitly block if recap is open
    return true;
  };

  const onStartInteraction = async (id: string) => {
    if (!canInteract()) return;
    setAdBannerActive(false); // Close banner on grid interaction
    await handleUserInteraction();

    const cell = grid.find(c => c.id === id);
    if (cell && cell.type === 'number') {
      soundService.playSelect();
      setIsDragging(true);
      setSelectedPath([id]);
      setPreviewResult(parseInt(cell.value));

      // [FIX] SELECTION AUTO-DESELECT (1 SECOND)
      if (selectionTimeoutRef.current) window.clearTimeout(selectionTimeoutRef.current);
      selectionTimeoutRef.current = window.setTimeout(() => {
        setSelectedPath(prev => {
          if (prev.length === 1 && prev[0] === id) {
            setPreviewResult(null);
            return [];
          }
          return prev;
        });
      }, 420);
    }
  };

  const isAdjacent = (cell1: HexCellData, cell2: HexCellData): boolean => {
    if (theme === 'orange') {
      const dr = Math.abs(cell1.row - cell2.row);
      const dc = Math.abs(cell1.col - cell2.col);
      // Rectilinear adjacency: Up/Down OR Left/Right
      return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
    }

    const dr = Math.abs(cell1.row - cell2.row);
    const dc = cell2.col - cell1.col;

    // Stessa riga
    if (dr === 0) return Math.abs(dc) === 1;

    // Righe adiacenti
    if (dr === 1) {
      // Per il sistema offset a righe pari
      if (cell1.row % 2 === 0) {
        return dc === 0 || dc === -1;
      } else {
        return dc === 0 || dc === 1;
      }
    }
    return false;
  };

  const onMoveInteraction = (id: string) => {
    if (!isDragging || !canInteract()) return;
    // BACKTRACKING LOGIC
    // Se l'utente torna alla penultima casella selezionata, rimuovi l'ultima (backtrack)
    if (selectedPath.length > 1 && id === selectedPath[selectedPath.length - 2]) {
      soundService.playSelect(); // Suono feedback rimozione
      const newPath = selectedPath.slice(0, -1);
      setSelectedPath(newPath);
      setPreviewResult(calculateResultFromPath(newPath));
      return;
    }

    if (selectedPath.includes(id)) return;

    const lastId = selectedPath[selectedPath.length - 1];
    const lastCell = grid.find(c => c.id === lastId);
    const currentCell = grid.find(c => c.id === id);

    if (lastCell && currentCell) {
      // Regola 1: Alternanza Tipi (Numero -> Operatore o viceversa)
      const typeCheck = lastCell.type !== currentCell.type;

      // Regola 2: Adiacenza Fisica (Deve essere un vicino diretto nell'esagono)
      const adjacencyCheck = isAdjacent(lastCell, currentCell);

      if (typeCheck && adjacencyCheck) {
        soundService.playSelect();
        const newPath = [...selectedPath, id];
        setSelectedPath(newPath);
        setPreviewResult(calculateResultFromPath(newPath));

        // Clear selection timeout if we started a path
        if (selectionTimeoutRef.current) {
          window.clearTimeout(selectionTimeoutRef.current);
          selectionTimeoutRef.current = null;
        }
      }
    }
  };

  // Logic for First Selection (Click/Tap) - Removed selectionTimeoutRef logic
  const onSelectionStart = (id: string) => {
    // No timeout logic needed here anymore
  };

  const handleGlobalEnd = () => {
    if (selectionTimeoutRef.current) {
      window.clearTimeout(selectionTimeoutRef.current);
      selectionTimeoutRef.current = null;
    }
    if (isDragging) {
      setIsDragging(false);
      evaluatePath(selectedPath);
    }
  };





  const handleVideoClose = () => {
    // Terminazione immediata quando si clicca skip
    setIsVideoVisible(false);
    soundService.stopAllVideoSounds();
    setIsBossBonusPlaying(false);

    // Stop video immediately
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.volume = 0;
    }

    // 3. Unmount after fade and Show Recap if Duel
    setTimeout(() => {
      setShowVideo(false);
      setIsVictoryAnimating(false);

      if (activeMatch?.isDuel) {
        setShowDuelRecap(true);
        // Ensure we are idle to stop game interaction
        setGameState(prev => ({ ...prev, status: 'idle' }));
      } else if (gameState.isBossLevel) {
        setActiveModal('boss_selection');
        setGameState(prev => ({ ...prev, status: 'idle', isBossLevel: false, bossLevelId: null }));
      } else {
        setGameState(prev => ({
          ...prev,
          status: 'level-complete'
        }));
      }
    }, 300);
  };

  const handleLostVideoClose = () => {
    // Terminazione immediata quando si clicca skip
    setIsVideoVisible(false);
    soundService.stopAllVideoSounds();

    // Stop video immediately
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.volume = 0;
    }

    // 3. Unmount after fade and Show Recap if Duel
    setTimeout(() => {
      setShowLostVideo(false);
      if (activeMatch?.isDuel) {
        setShowDuelRecap(true);
        setGameState(prev => ({ ...prev, status: 'idle' }));
      }
    }, 300);
  };

  const handleBossIntroClose = () => {
    // Terminazione immediata quando si clicca skip
    setIsVideoVisible(false);
    setShowBossIntro(false);
    soundService.stopAllVideoSounds();

    // Stop video immediately
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.volume = 0;
    }

    setTimeout(() => {
      setShowBossIntro(false);
      setGameState(prev => ({ ...prev, status: 'playing' }));
      soundService.playSuccess();
    }, 1000);
  };

  const handleSurrenderVideoClose = () => {
    // Terminazione immediata quando si clicca skip
    setIsVideoVisible(false);
    soundService.stopAllVideoSounds();

    // Stop video immediately
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.volume = 0;
    }

    setTimeout(() => {
      setShowSurrenderVideo(false);
      setGameState(prev => {
        // Bonus points for surrender win
        const bonus = (duelMode === 'blitz' ? 50 : 100);
        if (currentUser) {
          profileService.syncProgress(currentUser.id, bonus, prev.level, prev.estimatedIQ)
            .then(() => loadProfile(currentUser.id));
        }
        return { ...prev, status: 'opponent-surrendered' };
      });
    }, 800);
  };

  return (
    <>
      {showIntro && <IntroVideo onFinish={() => {
        setShowIntro(false);
        setGameState(prev => ({ ...prev, status: 'idle' }));
        // Check for Home Tutorial
        try {
          if (localStorage.getItem('comic_home_tutorial_done') !== 'true') {
            setTimeout(() => setShowHomeTutorial(true), 500);
          }
        } catch (e) { console.warn("Tutorial check skipped", e); }
      }} />}
      <div
        className={`fixed inset-0 w-full h-[100dvh] text-slate-100 font-sans overflow-hidden select-none transition-colors duration-1000`}
        style={{
          background: gameState.isBossLevel ? '#022c22' : 'transparent'
        }}
        onPointerUp={handleGlobalEnd}
        onPointerLeave={handleGlobalEnd}
      >
        {/* MAIN BLUE BACKGROUND IMAGE LAYER */}
        <div 
          className={`fixed inset-0 bg-[url('/sfondoblu.png')] bg-cover bg-center transition-opacity duration-1000 z-[-2] ${!gameState.isBossLevel ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          style={{
            filter: 'brightness(0.85) contrast(1.6) saturate(1.43) hue-rotate(-5deg)'
          }}
        ></div>

        {/* BOSS 2 BACKGROUND IMAGE LAYER */}
        <div className={`fixed -inset-[20%] w-[140%] h-[140%] bg-[url('/sfondomarrone.png')] bg-cover bg-center bg-no-repeat transition-opacity duration-1000 z-0 ${gameState.bossLevelId === 2 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}></div>

        {/* BOSS 1 BACKGROUND IMAGE LAYER */}
        <div className={`fixed -inset-[20%] w-[140%] h-[140%] bg-[url('/sfondo_green.png')] bg-cover bg-center bg-no-repeat transition-opacity duration-1000 z-0 ${gameState.bossLevelId === 1 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}></div>

        {/* BOSS BACKGROUND FALLBACK LAYER (Solid Green/Dark) - Ensures no blue leaks ever */}
        <div className={`fixed inset-0 ${gameState.bossLevelId === 2 ? 'bg-[#2a1a0a]' : 'bg-emerald-950'} z-[-1] transition-opacity duration-300 ${gameState.isBossLevel ? 'opacity-100' : 'opacity-0'}`}></div>

        {/* BOSS BOTTOM PATCH - Extra safety for safe-area */}
        <div className={`fixed -bottom-40 left-0 w-full h-80 ${gameState.bossLevelId === 2 ? 'bg-[#2a1a0a]' : 'bg-emerald-950'} z-[-1] ${gameState.isBossLevel ? 'opacity-100' : 'opacity-0'}`}></div>




        {/* WIN VIDEO OVERLAY REMOVED (Duplicate/Legacy) */}

        {/* UNIFIED VIDEO OVERLAY - Always in DOM for Mobile Unlock */}
        {/* BOSS VICTORY VIDEOS DISABLED - Only show for intro, defeat, and surrender */}
        <div
          className={`fixed inset-0 z-[2000] bg-black flex items-center justify-center transition-opacity duration-[800ms] ease-out 
            ${(showVideo || showLostVideo || showSurrenderVideo || showBossIntro) ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onPointerDown={() => {
            if (showVideo) handleVideoClose();
            else if (showLostVideo) handleLostVideoClose();
            else if (showSurrenderVideo) handleSurrenderVideoClose();
            else if (showBossIntro) handleBossIntroClose();
          }}
        >
          <video
            ref={videoRef}
            src={
              isBossBonusPlaying
                ? '/Bonus30secondiboss.mp4'
                : showVideo
                  ? winVideoSrc
                  : showLostVideo
                    ? loseVideoSrc
                    : showSurrenderVideo
                      ? surrenderVideoSrc
                      : showBossIntro
                        ? (gameState.bossLevelId === 2 ? '/PresentBoss2noaudio.mp4' : '/Boss1intro.mp4')
                        : ''
            }
            className="w-full h-full object-cover"
            playsInline
            autoPlay
            onPlaying={() => {
              if (videoRef.current) videoRef.current.volume = 0.7;
              setIsVideoVisible(true);

              const currentBossId = gameStateRef.current.bossLevelId;

              if (currentBossId === 1 || currentBossId === 2) {
                if (showBossIntro) {
                  // BOSS INTRO SYNC
                  if (currentBossId === 1) {
                    soundService.stopBossIntro();
                    soundService.playBossIntro();
                  } else {
                    soundService.stopBoss2Intro();
                    soundService.playBoss2Intro();
                  }
                } else if (showVideo) {
                  // BOSS VICTORY SEQUENCES
                  if (isBossBonusPlaying) {
                    // STEP 1: Bonus Video (Integrated Audio)
                    if (videoRef.current) {
                      videoRef.current.muted = isMuted;
                      videoRef.current.volume = 0.8;
                    }
                  } else {
                    // STEP 2: Victory Animation Video (External Sync Audio)
                    if (videoRef.current) {
                      videoRef.current.muted = true;
                      videoRef.current.currentTime = 0;
                    }
                    if (currentBossId === 1) {
                      soundService.stopBoss1vittoria();
                      soundService.playBoss1vittoria();
                    } else {
                      soundService.stopBoss2vittoria();
                      soundService.playBoss2vittoria();
                    }
                  }
                } else if (showLostVideo) {
                  // BOSS DEFEAT SYNC
                  if (videoRef.current) {
                    videoRef.current.muted = true;
                    videoRef.current.currentTime = 0;
                  }
                  if (currentBossId === 1) {
                    soundService.stopBoss1sconfitta();
                    soundService.playBoss1sconfitta();
                  } else {
                    soundService.stopBoss2sconfitta();
                    soundService.playBoss2sconfitta();
                  }
                }
              } else if (showLostVideo) {
                // Standard level loss
                soundService.stopAllVideoSounds();
              }
            }}
            onEnded={() => {
              if (showVideo) {
                if (gameState.bossLevelId === 1 && isBossBonusPlaying) {
                  // STEP 1 COMPLETE: Bonus Video Ended -> Play Boss Victory Video
                  setIsBossBonusPlaying(false);
                  setWinVideoSrc('/Boss1vittoria.mp4');
                  // Force reload to ensure src update
                  setTimeout(() => {
                    if (videoRef.current) {
                      videoRef.current.load();
                      videoRef.current.play().catch(e => console.warn("Boss 1 victory video blocked:", e));
                    }
                  }, 50);
                } else if (gameState.bossLevelId === 2 && isBossBonusPlaying) {
                  // STEP 1 COMPLETE: Bonus 45s Ended -> Play Boss 2 Victory Video
                  setIsBossBonusPlaying(false);
                  setWinVideoSrc('/FinalBoss2video.mp4');
                  setTimeout(() => {
                    if (videoRef.current) {
                      videoRef.current.load();
                      videoRef.current.play().catch(e => console.warn("Boss 2 victory video blocked:", e));
                    }
                  }, 50);
                } else {
                  // STEP 2 COMPLETE: Boss Victory Video Ended -> Close and return to lobby
                  console.log(`🎬 Video vittoria Boss ${gameState.bossLevelId} terminato.`);
                  handleVideoClose();
                }
              }
              else if (showLostVideo) handleLostVideoClose();
              else if (showSurrenderVideo) handleSurrenderVideoClose();
              else if (showBossIntro) handleBossIntroClose();
            }}
          />

          {/* Audio Toggle for Boss Intro/Win/Loss */}
          {(showBossIntro || ((showVideo || showLostVideo) && gameState.isBossLevel)) && (
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                const newMuted = !isMuted;
                setIsMuted(newMuted);
                soundService.setMuted(newMuted);
              }}
              className={`absolute top-12 right-6 z-[2010] p-3 rounded-full border transition-all active:scale-95 shadow-lg
                    ${!isMuted
                  ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                  : 'bg-black/40 backdrop-blur-md border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
            >
              {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
          )}

          {/* Overlay color based on state */}
          {showLostVideo && <div className="absolute inset-0 bg-red-900/10 mix-blend-overlay pointer-events-none"></div>}
          {showSurrenderVideo && <div className="absolute inset-0 bg-blue-900/10 mix-blend-overlay pointer-events-none"></div>}

          {(showVideo || showLostVideo || showSurrenderVideo || showBossIntro) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-50 pointer-events-none">
              {/* FAIL-SAFE TAP TO PLAY (Only visible if video stuck/not visible) */}
              {/* FAIL-SAFE TAP TO PLAY REMOVED - AUTOMATIC ONLY */}


              <button
                className="absolute bottom-12 right-12 z-50 px-6 py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl text-white font-orbitron font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-3 active:scale-95 group pointer-events-auto"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (showVideo) handleVideoClose();
                  else if (showLostVideo) handleLostVideoClose();
                  else if (showSurrenderVideo) handleSurrenderVideoClose();
                  else if (showBossIntro) handleBossIntroClose();
                }}
              >
                <span>SKIP {showBossIntro ? 'INTRO' : ''}</span>
                <FastForward size={14} className={showLostVideo ? (gameState.isBossLevel ? "text-emerald-400" : "text-red-500") : (showSurrenderVideo ? "text-blue-500" : ((showBossIntro || (showVideo && gameState.isBossLevel)) ? "text-emerald-400" : "text-[#FF8800]"))} />
              </button>
            </div>
          )}
        </div>


        <ParticleEffect trigger={triggerParticles} />

        {/* Abstract Curves Removed for single clean blue background */}

        {toast.visible && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[10000] animate-toast-in w-[90%] max-w-md">
            <div className="bg-transparent text-white px-8 py-5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] flex flex-col items-center gap-4 border-[3px] border-[#FF8800] backdrop-blur-sm">
              <span className="font-bold text-center text-lg leading-snug drop-shadow-md">{toast.message}</span>
              {toast.actions && (
                <div className="flex gap-3 w-full justify-center">
                  {toast.actions.map((action, i) => (
                    <button
                      key={i}
                      onPointerDown={(e) => { e.stopPropagation(); action.onClick(); }}
                      className={`px-6 py-2.5 rounded-xl font-black uppercase text-sm tracking-wider transition-all active:scale-95 shadow-lg border-2
                                ${action.variant === 'secondary'
                          ? 'bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600'
                          : 'bg-[#FF8800] text-white border-white hover:bg-[#FF9900]'
                        }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}



        {gameState.status === 'idle' && (
          <>
            <CharacterHelper />
            <div className="z-10 w-full max-w-xl flex flex-col items-center text-center px-6 animate-screen-in relative h-full justify-center -translate-y-5">



              {/* TOP LEFT: Site Link */}
              <div className="fixed top-12 left-6 z-[3000] flex gap-3 items-center">
                <button
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    soundService.playUIClick();
                    window.open("https://www.numbergame.it/site", "_blank");
                  }}
                  className="relative w-12 h-12 bg-transparent flex items-center justify-center active:scale-95 transition-all hover:scale-110 group cursor-pointer"
                  title="Vai al Sito"
                >
                  <img src="/CasellaGlass.png" alt="Octagon" className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10" />
                  <Globe size={22} className="relative z-20 text-white drop-shadow-md opacity-100" strokeWidth={2.5} />
                </button>
              </div>

              {/* TOP RIGHT: Action Buttons (Audio) */}
              <div className="fixed top-12 right-6 z-[3000] flex gap-3 items-center">
                <button
                  onPointerDown={toggleMute}
                  className="relative w-12 h-12 bg-transparent flex items-center justify-center active:scale-95 transition-all hover:scale-110 group"
                  title="Audio"
                  id="audio-btn-home"
                >
                  <img 
                    src="/CasellaGlass.png" 
                    alt="Octagon" 
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10 transition-all duration-300"
                    style={{
                      filter: isMuted ? 'grayscale(1) brightness(0.65)' : 'none'
                    }}
                  />
                  <div className="relative z-20 text-white drop-shadow-md">
                    {isMuted ? <VolumeX size={22} strokeWidth={2.5} /> : <Volume2 size={22} strokeWidth={2.5} />}
                  </div>
                </button>
              </div>

              {/* BOTTOM LEFT: Profile Summary Badge */}
              <div className="fixed bottom-4 left-4 z-[2000] flex flex-col items-start gap-1" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
                <div
                  onPointerDown={async (e) => {
                    e.stopPropagation();
                    await handleUserInteraction();
                    soundService.playUIClick();
                    if (!currentUser) {
                      setShowAuthModal(true);
                    } else {
                      setActiveModal('logout_confirm');
                    }
                  }}
                  className={`flex items-center gap-2 p-1 pr-4 rounded-full border-2 transition-all duration-500 cursor-pointer shadow-xl group overflow-hidden
                    ${currentUser
                      ? 'bg-gradient-to-r from-slate-900/90 to-slate-800/90 border-[#FF8800] shadow-[#FF8800]/40 min-w-[150px]'
                      : 'bg-black/40 border-white/20 hover:border-white/40 w-12 h-12 justify-center'
                    }`}
                >
                  {/* Avatar Circle - Aligned with other bubbles */}
                  <div className={`shrink-0 w-10 h-10 rounded-full border-[2px] flex items-center justify-center overflow-hidden transition-all duration-500 -ml-0.5
                    ${currentUser ? 'border-[#FF8800] bg-slate-800 shadow-[0_0_15px_rgba(255,136,0,0.4)]' : 'border-white/30 bg-white/5'}`}>
                    {currentUser && userProfile?.avatar_url ? (
                      <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User size={18} className={currentUser ? 'text-[#FF8800]' : 'text-white/40'} strokeWidth={3} />
                    )}
                  </div>

                  {/* Info Text */}
                  {currentUser && (
                    <div className="flex flex-col items-start leading-[1.1] animate-screen-in overflow-hidden">
                      <span className="text-[12px] font-black font-orbitron text-white uppercase tracking-wider truncate max-w-[90px]">
                        {userProfile?.username || currentUser.user_metadata?.username || 'Guerriero'}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[13px] font-black text-[#FF8800] font-orbitron">
                           {userProfile?.total_score || 0}
                        </span>
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">pts</span>
                      </div>
                    </div>
                  )}

                  {/* Peeking Action icon (if not logged in) */}
                  {!currentUser && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Zap size={16} className="text-white animate-pulse" />
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-white/30 font-black ml-3 font-mono tracking-wider select-none pointer-events-none">v2.3.1</span>
              </div>

              {/* BOTTOM RIGHT ICONS: Admin & Tutorial (FIXED Position) */}
              <div className="fixed bottom-4 right-4 z-[2000] flex gap-3" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>

                {/* Tutorial Icon */}
                <button
                  onPointerDown={async (e) => {
                    e.stopPropagation();
                    await handleUserInteraction();
                    soundService.playUIClick();
                    setTutorialStep(0);
                    setActiveModal('tutorial');
                  }}
                  id="tutorial-btn-home"
                  className="relative w-12 h-12 bg-transparent flex items-center justify-center active:scale-95 transition-all hover:scale-110 group"
                  title="Tutorial"
                >
                  <img src="/CasellaGlass.png" alt="Octagon" className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10" />
                  <HelpCircle size={22} className="relative z-20 text-white drop-shadow-md" strokeWidth={2.5} />
                </button>

                {/* Quick Invite Button */}
                <button
                  onPointerDown={async (e) => { e.stopPropagation(); await handleUserInteraction(); handleQuickInvite(); }}
                  id="invite-btn-home"
                  className="relative w-12 h-12 bg-transparent flex items-center justify-center active:scale-95 transition-all hover:scale-110 group"
                  title="Invita Amico"
                >
                  <img src="/CasellaGlass.png" alt="Octagon" className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10" />
                  <Gift size={22} className="relative z-20 text-white drop-shadow-md ml-0.5" strokeWidth={2.5} />
                </button>

                {/* Admin Access */}
                <button
                  onPointerDown={async (e) => {
                    e.stopPropagation();
                    await handleUserInteraction();
                    soundService.playUIClick();
                    setActiveModal('admin');
                  }}
                  className="relative w-12 h-12 bg-transparent flex items-center justify-center active:scale-95 transition-all hover:scale-110 group"
                  title="Admin Access"
                >
                  <img src="/CasellaGlass.png" alt="Octagon" className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10" />
                  <Shield size={22} className="relative z-20 text-white drop-shadow-md" strokeWidth={2.5} />
                </button>
              </div>
              <div className="mb-6 flex flex-col items-center">
                {/* Logo: Custom Shape Image with White Border & Brain */}
                {/* Logo: Pure Color CSS Mask Implementation */}
                {/* Logo: Custom Shape Image with White Border & Brain */}
                {/* Logo: Pure Color CSS Mask Implementation */}
                <div
                  onPointerDown={async (e) => {
                    e.stopPropagation();
                    await handleUserInteraction();
                    soundService.playUIClick();
                    setActiveModal('profile');
                  }}
                  id="logo-home"
                  className={`relative w-40 h-40 flex items-center justify-center mb-4 transition-all duration-[2000ms] ease-in-out group cursor-pointer
                    ${logoAnim 
                      ? 'scale-110' 
                      : 'hover:scale-110'
                    }`}
                  style={{
                    filter: logoAnim
                      ? 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3)) drop-shadow(0 0 25px rgba(255, 136, 0, 0.65))'
                      : undefined
                  }}
                  title="Apri Profilo"
                >
                  {/* Custom Octagon Image */}
                  <img src="/Faviconottagonook.png" alt="Logo Base" className="absolute inset-0 w-full h-full object-contain drop-shadow-lg" />

                </div>

                <h1 className="text-6xl sm:text-8xl font-black font-orbitron tracking-tighter text-[#FF8800] lowercase" style={{ WebkitTextStroke: '3px white' }}>
                  number
                </h1>
              </div>

              <div className="flex flex-col gap-4 items-center w-full max-w-sm relative z-20">
                <button
                  disabled={profileLoading}
                  onPointerDown={handleStartGameClick}
                  id="play-btn-home"
                  className="w-full group relative overflow-hidden flex items-center justify-center gap-4 bg-[#FF8800] text-white py-5 rounded-2xl font-orbitron font-black text-xl border-[4px] border-white hover:scale-105 transition-all duration-300 active:translate-y-1 disabled:opacity-50 disabled:pointer-events-none"
                  style={{
                    boxShadow: '0 8px 0 rgba(0,0,0,0.2), inset 0 4px 8px rgba(255,255,255,0.5), inset 0 -4px 8px rgba(0,0,0,0.5)'
                  }}
                >
                  {/* Glass layout elements */}
                  <div className="absolute inset-0 pointer-events-none z-10" style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 30%, transparent 30.1%, transparent 70%, rgba(255,255,255,0.08) 70.1%, rgba(255,255,255,0.2) 100%)'
                  }}></div>
                  <div className="absolute top-0 inset-x-0 h-[45%] pointer-events-none rounded-t-2xl z-10" style={{
                    background: 'linear-gradient(to bottom, rgba(255,255,255,0.28), transparent)'
                  }}></div>
                  <div className="absolute top-[8%] left-[4%] w-[20%] h-[20%] rounded-full filter blur-[1px] pointer-events-none z-10" style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.48), rgba(255,255,255,0.02))'
                  }}></div>
                  <div className="absolute top-[8%] right-[4%] w-[20%] h-[20%] rounded-full filter blur-[1px] pointer-events-none z-10" style={{
                    background: 'linear-gradient(225deg, rgba(255,255,255,0.48), rgba(255,255,255,0.02))'
                  }}></div>
                  <div className="absolute bottom-0 inset-x-0 h-[25%] pointer-events-none z-10" style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.25), transparent)'
                  }}></div>

                  <Play className="w-8 h-8 fill-current relative z-20" />
                  <span className="tracking-widest relative z-20">
                    {profileLoading ? 'CARICAMENTO...' : (savedGame && savedGame.level > 1 ? `CONTINUA LVL ${savedGame.level}` : 'GIOCA')}
                  </span>
                </button>
 
                <div className="grid grid-cols-2 gap-3 w-full">
                  {/* 1VS1 MODE BUTTON */}
                  <button
                    className="flex items-center justify-center gap-2 bg-red-600 text-white py-4 rounded-xl border-[3px] border-white hover:scale-105 transition-all duration-300 col-span-2 relative overflow-hidden group active:translate-y-1"
                    id="duel-btn-home"
                    style={{
                      boxShadow: '0 6px 0 rgba(0,0,0,0.15), inset 0 4px 8px rgba(255,255,255,0.45), inset 0 -4px 8px rgba(0,0,0,0.45)'
                    }}
                    onPointerDown={async (e) => {
                      e.stopPropagation();
                      await handleUserInteraction();
                      soundService.playUIClick();
                      if (!currentUser) {
                        showToast("Accedi per sfidare altri giocatori!");
                        setShowAuthModal(true);
                      } else {
                        setActiveModal('duel_selection');
                      }
                    }}
                  >
                    {/* Glass layout elements */}
                    <div className="absolute inset-0 pointer-events-none z-10" style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 30%, transparent 30.1%, transparent 70%, rgba(255,255,255,0.08) 70.1%, rgba(255,255,255,0.2) 100%)'
                    }}></div>
                    <div className="absolute top-0 inset-x-0 h-[45%] pointer-events-none rounded-t-xl z-10" style={{
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0.28), transparent)'
                    }}></div>
                    <div className="absolute top-[8%] left-[4%] w-[20%] h-[20%] rounded-full filter blur-[1px] pointer-events-none z-10" style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.48), rgba(255,255,255,0.02))'
                    }}></div>
                    <div className="absolute top-[8%] right-[4%] w-[20%] h-[20%] rounded-full filter blur-[1px] pointer-events-none z-10" style={{
                      background: 'linear-gradient(225deg, rgba(255,255,255,0.48), rgba(255,255,255,0.02))'
                    }}></div>
                    <div className="absolute bottom-0 inset-x-0 h-[25%] pointer-events-none z-10" style={{
                      background: 'linear-gradient(to top, rgba(0,0,0,0.25), transparent)'
                    }}></div>

                    <Swords className="w-8 h-8 animate-pulse text-yellow-300 relative z-20" />
                    <div className="flex flex-col items-start leading-none relative z-20">
                      <span className="font-orbitron text-xl font-black uppercase tracking-widest italic drop-shadow-md">NEURAL DUEL</span>
                      <span className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Sfida 1vs1 Realtime</span>
                    </div>
                    {/* Badge */}
                    <div className="absolute top-2 right-2 bg-red-600/90 backdrop-blur-md border border-white/20 px-2 py-0.5 rounded text-[8px] font-bold text-white animate-pulse shadow-lg z-20">NEW</div>
                  </button>
 
                  {/* BOSS LEVELS BUTTON - COLS-SPAN-1 */}
                  <button
                    className="flex flex-col items-center justify-center pt-5 pb-4 gap-2 bg-slate-700 text-white/50 rounded-xl border-[3px] border-white/20 col-span-1 relative overflow-hidden group cursor-not-allowed"
                    id="boss-btn-home"
                    style={{
                      boxShadow: '0 5px 0 rgba(0,0,0,0.15), inset 0 4px 8px rgba(255,255,255,0.1), inset 0 -4px 8px rgba(0,0,0,0.45)'
                    }}
                    onPointerDown={async (e) => {
                      e.stopPropagation();
                      await handleUserInteraction();
                      soundService.playUIClick();
                      showToast("La modalità BOSS sarà disponibile a breve!");
                    }}
                  >
                    {/* Glass layout elements */}
                    <div className="absolute inset-0 pointer-events-none z-10" style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 30%, transparent 30.1%, transparent 70%, rgba(255,255,255,0.04) 70.1%, rgba(255,255,255,0.1) 100%)'
                    }}></div>
                    <div className="absolute top-0 inset-x-0 h-[45%] pointer-events-none rounded-t-xl z-10" style={{
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0.15), transparent)'
                    }}></div>
                    <div className="absolute top-[8%] left-[4%] w-[20%] h-[20%] rounded-full filter blur-[1px] pointer-events-none z-10" style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.01))'
                    }}></div>
                    <div className="absolute top-[8%] right-[4%] w-[20%] h-[20%] rounded-full filter blur-[1px] pointer-events-none z-10" style={{
                      background: 'linear-gradient(225deg, rgba(255,255,255,0.2), rgba(255,255,255,0.01))'
                    }}></div>
                    <div className="absolute bottom-0 inset-x-0 h-[25%] pointer-events-none z-10" style={{
                      background: 'linear-gradient(to top, rgba(0,0,0,0.15), transparent)'
                    }}></div>

                    <Crown className="w-8 h-8 text-white/40 relative z-20" />
                    <span className="font-orbitron text-[13px] sm:text-[14px] font-black uppercase tracking-widest drop-shadow-md relative z-20 mt-1">BOSS</span>
                    
                    {/* Badge COMING SOON */}
                    <div className="absolute top-1.5 right-1.5 bg-yellow-500 text-black px-1.5 py-0.5 rounded-[4px] text-[7px] font-black tracking-widest uppercase shadow-md z-20 animate-pulse">COMING SOON</div>
                  </button>
 
                  {/* RANKING BUTTON - COLS-SPAN-1 */}
                  <button
                    id="ranking-btn-home"
                    onPointerDown={async (e) => { e.stopPropagation(); await handleUserInteraction(); soundService.playUIClick(); setActiveModal('leaderboard'); }}
                    className="flex flex-col items-center justify-center pt-5 pb-4 gap-2 bg-yellow-500 text-slate-900 rounded-xl border-[3px] border-white hover:scale-105 transition-all duration-300 col-span-1 relative overflow-hidden group active:translate-y-1"
                    style={{
                      boxShadow: '0 5px 0 rgba(0,0,0,0.15), inset 0 4px 8px rgba(255,255,255,0.45), inset 0 -4px 8px rgba(0,0,0,0.45)'
                    }}
                  >
                    {/* Glass layout elements */}
                    <div className="absolute inset-0 pointer-events-none z-10" style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 30%, transparent 30.1%, transparent 70%, rgba(255,255,255,0.08) 70.1%, rgba(255,255,255,0.2) 100%)'
                    }}></div>
                    <div className="absolute top-0 inset-x-0 h-[45%] pointer-events-none rounded-t-xl z-10" style={{
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0.28), transparent)'
                    }}></div>
                    <div className="absolute top-[8%] left-[4%] w-[20%] h-[20%] rounded-full filter blur-[1px] pointer-events-none z-10" style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.48), rgba(255,255,255,0.02))'
                    }}></div>
                    <div className="absolute top-[8%] right-[4%] w-[20%] h-[20%] rounded-full filter blur-[1px] pointer-events-none z-10" style={{
                      background: 'linear-gradient(225deg, rgba(255,255,255,0.48), rgba(255,255,255,0.02))'
                    }}></div>
                    <div className="absolute bottom-0 inset-x-0 h-[25%] pointer-events-none z-10" style={{
                      background: 'linear-gradient(to top, rgba(0,0,0,0.25), transparent)'
                    }}></div>

                    <BarChart3 className="w-8 h-8 relative z-20 text-slate-800 drop-shadow-md" />
                    <span className="font-orbitron text-[13px] sm:text-[14px] font-black uppercase tracking-widest relative z-20 mt-1">RANKING</span>
                  </button>
                </div>
                {/* AUTH BUTTON */}
                {/* Auth Button Moved to Top Right - Removed from here */}

                {/* Audio Button Removed */}


              </div>
            </div>
          </>
        )}



        {gameState.status !== 'idle' && (
          <div className="w-full h-full flex flex-col items-center z-10 p-4 pt-12 sm:pt-4 max-w-4xl animate-screen-in">
            {gameState.status !== 'won' && gameState.status !== 'level-complete' && gameState.status !== 'game-over' && gameState.status !== 'opponent-surrendered' && (
              <header className="w-full max-w-2xl mx-auto mb-2 relative z-50">
                <style dangerouslySetInnerHTML={{__html: `
                  .chrome-bar {
                    background: linear-gradient(to bottom, #ffffff 0%, #e8ebf0 10%, #c2c7d2 25%, #858c99 50%, #535a66 75%, #a1a7b5 92%, #ffffff 100%);
                    border: 4px solid #b1b6c0;
                    box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.9), inset 0 -4px 4px rgba(0, 0, 0, 0.6), 0 10px 20px rgba(0,0,0,0.5);
                  }

                  .chrome-divider {
                    width: 5px;
                    height: 80%;
                    background: linear-gradient(to right, #404550 0%, #8c93a0 25%, #ffffff 50%, #8c93a0 75%, #2a2e37 100%);
                    box-shadow: 1px 0 1px rgba(255,255,255,0.2), -1px 0 1px rgba(0,0,0,0.4);
                  }

                  .btn-panel {
                    box-shadow: inset 2px 3px 6px rgba(0, 0, 0, 0.6), inset -2px -3px 5px rgba(255, 255, 255, 0.2);
                    transition: transform 0.1s ease, filter 0.2s ease, box-shadow 0.2s ease;
                    position: relative;
                    overflow: hidden;
                    height: 85%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                  }

                  button.btn-panel {
                    cursor: pointer;
                  }

                  .btn-panel::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 40%;
                    background: linear-gradient(to bottom, rgba(255, 255, 255, 0.25), transparent);
                    pointer-events: none;
                  }

                  .btn-panel:active {
                    transform: scale(0.95);
                  }

                  .btn-panel-green {
                    background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
                  }
                  .btn-panel-green:hover {
                    filter: brightness(1.2);
                    box-shadow: inset 2px 3px 6px rgba(0, 0, 0, 0.4), inset -2px -3px 5px rgba(255, 255, 255, 0.3), 0 0 15px rgba(16, 185, 129, 0.8), 0 0 5px rgba(16, 185, 129, 0.4);
                  }
                  .btn-panel-green:hover svg {
                    filter: drop-shadow(0 0 6px #10b981) !important;
                  }
                  .btn-panel-green:active {
                    filter: brightness(1.35);
                    box-shadow: inset 2px 3px 6px rgba(0, 0, 0, 0.3), inset -2px -3px 5px rgba(255, 255, 255, 0.4), 0 0 25px rgba(16, 185, 129, 1), 0 0 10px rgba(16, 185, 129, 0.6);
                  }
                  .btn-panel-green:active svg {
                    filter: drop-shadow(0 0 10px #10b981) !important;
                  }

                  .btn-panel-blue {
                    background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #6366f1 100%);
                  }
                  .btn-panel-blue:hover {
                    filter: brightness(1.2);
                    box-shadow: inset 2px 3px 6px rgba(0, 0, 0, 0.4), inset -2px -3px 5px rgba(255, 255, 255, 0.3), 0 0 15px rgba(6, 182, 212, 0.8), 0 0 5px rgba(6, 182, 212, 0.4);
                  }
                  .btn-panel-blue:hover svg {
                    filter: drop-shadow(0 0 6px #06b6d4) !important;
                  }
                  .btn-panel-blue:active {
                    filter: brightness(1.35);
                    box-shadow: inset 2px 3px 6px rgba(0, 0, 0, 0.3), inset -2px -3px 5px rgba(255, 255, 255, 0.4), 0 0 25px rgba(6, 182, 212, 1), 0 0 10px rgba(6, 182, 212, 0.6);
                  }
                  .btn-panel-blue:active svg {
                    filter: drop-shadow(0 0 10px #06b6d4) !important;
                  }

                  .btn-panel-orange {
                    background: linear-gradient(135deg, #db2777 0%, #f97316 60%, #eab308 100%);
                  }
                  .btn-panel-orange:hover {
                    filter: brightness(1.2);
                    box-shadow: inset 2px 3px 6px rgba(0, 0, 0, 0.4), inset -2px -3px 5px rgba(255, 255, 255, 0.3), 0 0 15px rgba(249, 115, 22, 0.8), 0 0 5px rgba(249, 115, 22, 0.4);
                  }
                  .btn-panel-orange:hover span {
                    filter: drop-shadow(0 0 6px #f97316) !important;
                  }
                  .btn-panel-orange:active {
                    filter: brightness(1.35);
                    box-shadow: inset 2px 3px 6px rgba(0, 0, 0, 0.3), inset -2px -3px 5px rgba(255, 255, 255, 0.4), 0 0 25px rgba(249, 115, 22, 1), 0 0 10px rgba(249, 115, 22, 0.6);
                  }
                  .btn-panel-orange:active span {
                    filter: drop-shadow(0 0 10px #f97316) !important;
                  }

                  .btn-panel-yellow {
                    background: linear-gradient(135deg, #fde047 0%, #eab308 60%, #ca8a04 100%);
                  }
                  .btn-panel-yellow:hover {
                    filter: brightness(1.2);
                    box-shadow: inset 2px 3px 6px rgba(0, 0, 0, 0.4), inset -2px -3px 5px rgba(255, 255, 255, 0.3), 0 0 15px rgba(234, 179, 8, 0.8), 0 0 5px rgba(234, 179, 8, 0.4);
                  }
                  .btn-panel-yellow:hover span {
                    filter: drop-shadow(0 0 6px #eab308) !important;
                  }
                  .btn-panel-yellow:active {
                    filter: brightness(1.35);
                    box-shadow: inset 2px 3px 6px rgba(0, 0, 0, 0.3), inset -2px -3px 5px rgba(255, 255, 255, 0.4), 0 0 25px rgba(234, 179, 8, 1), 0 0 10px rgba(234, 179, 8, 0.6);
                  }
                  .btn-panel-yellow:active span {
                    filter: drop-shadow(0 0 10px #eab308) !important;
                  }

                  .chrome-timer-outer {
                    width: 101px;
                    height: 101px;
                    border-radius: 50%;
                    position: relative;
                    background: conic-gradient(from 135deg, #ffffff 0%, #d8dbe3 10%, #8f96a3 22%, #434955 35%, #9fa5b2 45%, #ffffff 55%, #b0b5c1 65%, #323740 78%, #949aa7 90%, #ffffff 100%);
                    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.65), inset 0 2px 3px rgba(255, 255, 255, 0.9), inset 0 -2px 3px rgba(0, 0, 0, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                  }

                  .chrome-timer-outer-square {
                    width: 101px;
                    height: 101px;
                    border-radius: 20px;
                    position: relative;
                    background: conic-gradient(from 135deg, #ffffff 0%, #d8dbe3 10%, #8f96a3 22%, #434955 35%, #9fa5b2 45%, #ffffff 55%, #b0b5c1 65%, #323740 78%, #949aa7 90%, #ffffff 100%);
                    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.65), inset 0 2px 3px rgba(255, 255, 255, 0.9), inset 0 -2px 3px rgba(0, 0, 0, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                  }

                  .glass-timer-inner {
                    width: 85px;
                    height: 85px;
                    border-radius: 50%;
                    background: radial-gradient(circle at 50% 25%, #181d28 0%, #030406 80%, #000000 100%);
                    box-shadow: inset 0 4px 8px rgba(0, 0, 0, 0.95), inset 0 -3px 6px rgba(255, 255, 255, 0.15), 0 0 1px 1px rgba(0, 0, 0, 0.4);
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                  }

                  .glass-timer-inner-square {
                    width: 84px;
                    height: 84px;
                    border-radius: 14px;
                    background: radial-gradient(circle at 50% 25%, #181d28 0%, #030406 80%, #000000 100%);
                    box-shadow: inset 0 4px 8px rgba(0, 0, 0, 0.95), inset 0 -3px 6px rgba(255, 255, 255, 0.15), 0 0 1px 1px rgba(0, 0, 0, 0.4);
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                  }

                  .glass-timer-reflection {
                    position: absolute;
                    top: -18%;
                    left: -10%;
                    width: 120%;
                    height: 60%;
                    border-radius: 50%;
                    background: radial-gradient(ellipse 80% 55% at 50% 30%, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.18) 45%, transparent 70%);
                    pointer-events: none;
                    z-index: 30;
                  }

                  .glass-timer-glint {
                    position: absolute;
                    bottom: -20%;
                    left: -10%;
                    width: 120%;
                    height: 55%;
                    border-radius: 50%;
                    background: radial-gradient(ellipse 80% 50% at 50% 70%, rgba(255, 255, 255, 0.30) 0%, rgba(255, 255, 255, 0.10) 45%, transparent 70%);
                    pointer-events: none;
                    z-index: 30;
                  }
                  
                   @keyframes heartBeatPulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.4); }
                    100% { transform: scale(1); }
                  }

                  #logo-home {
                    transition: transform 2s ease-in-out, filter 2s ease-in-out;
                    filter: drop-shadow(0 12px 15px rgba(0, 0, 0, 0.5));
                  }
                  
                  @media (hover: hover) {
                    #logo-home:hover {
                      filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3)) !important;
                    }
                  }

                  #logo-home:active {
                    transform: scale(0.95) !important;
                    filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.6)) !important;
                    transition: transform 0.1s ease, filter 0.1s ease !important;
                  }
                 `}} />

                <div className="relative w-full h-16 chrome-bar rounded-[2.5rem] flex items-center px-2.5 justify-between">
                  
                  {/* LATO SINISTRO: HOME + DIVISORE + AUDIO */}
                  <div className="flex w-[40%] h-full items-center gap-1.5">
                    {/* HOME */}
                    <button
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        soundService.playUIClick();
                        resetDuelState(activeMatch?.id, currentUser?.id);
                        goToHome(e);
                        setGameState(prev => ({ ...prev, isBossLevel: false, bossLevelId: null }));
                      }}
                      className="btn-panel btn-panel-green flex-grow rounded-l-[1.8rem] rounded-r-md text-emerald-950 font-black flex items-center justify-center"
                    >
                      <Home className="w-7 h-7 text-emerald-950/90 drop-shadow-[0_2px_4px_rgba(255,255,255,0.35),0_1px_2px_rgba(0,0,0,0.4)]" />
                    </button>

                    {/* SOLCO */}
                    <div className="chrome-divider" />

                    {/* AUDIO */}
                    <button
                      onPointerDown={toggleMute}
                      className="btn-panel btn-panel-blue flex-grow rounded-md text-indigo-950 font-black flex items-center justify-center"
                    >
                      {isMuted ? (
                        <VolumeX className="w-7 h-7 text-indigo-950/90 drop-shadow-[0_2px_4px_rgba(255,255,255,0.35),0_1px_2px_rgba(0,0,0,0.4)]" />
                      ) : (
                        <Volume2 className="w-7 h-7 text-indigo-950/90 drop-shadow-[0_2px_4px_rgba(255,255,255,0.35),0_1px_2px_rgba(0,0,0,0.4)]" />
                      )}
                    </button>
                  </div>

                  {/* CENTRO: TIMER (assoluto per sporgere sopra/sotto) */}
                  <div className="w-[16%] flex justify-center">
                    {/* Spazio vuoto occupato dal timer assoluto */}
                  </div>

                  {/* LATO DESTRO: PUNTI + DIVISORE + LIVELLI */}
                  <div className="flex w-[40%] h-full items-center gap-1.5">
                    {/* PUNTI */}
                    <div className="btn-panel btn-panel-orange flex-grow rounded-md flex flex-col justify-center items-center text-amber-950 font-black">
                      <span className="text-[7px] leading-none text-amber-950/60 uppercase tracking-widest">PUNTI</span>
                      <span className="text-xl font-black font-orbitron leading-none text-white drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.6)] mt-0.5">
                        {activeMatch?.isDuel ? gameState.score : gameState.totalScore}
                      </span>
                    </div>

                    {/* SOLCO */}
                    <div className="chrome-divider" />

                    {/* LIVELLI */}
                    <div className="btn-panel btn-panel-yellow flex-grow rounded-r-[1.8rem] rounded-l-md flex flex-col justify-center items-center text-yellow-950 font-black">
                      <span className="text-[7px] leading-none text-yellow-950/60 uppercase tracking-widest">
                        {gameState.isBossLevel ? 'BOSS' : 'LIVELLO'}
                      </span>
                      <span className="text-xl font-black font-orbitron leading-none text-white drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.6)] mt-0.5">
                        {gameState.isBossLevel ? gameState.bossLevelId : gameState.level}
                      </span>
                    </div>
                  </div>

                  {/* TIMER IN SOVRAPPOSIZIONE ASSOLUTA */}
                  <div
                    id="timer-display-game"
                    className="absolute left-1/2 -translate-x-1/2 top-1/2 translate-y-[-20%] z-[100] cursor-pointer group"
                    onPointerDown={activeMatch?.isDuel ? undefined : togglePause}
                  >
                    {gameState.isBossLevel ? (
                      <div className={`chrome-timer-outer-square transition-all duration-300 ${isPaused ? 'scale-110' : 'hover:scale-105'}`}>
                        <div className="glass-timer-inner-square text-white">
                          <div className="glass-timer-reflection" />
                          <div className="glass-timer-glint" />
                          {isPaused ? (
                            <Pause className="w-8 h-8 animate-pulse text-emerald-400" />
                          ) : (
                            <>
                              <span className="text-[7px] font-black uppercase leading-none mb-0.5 text-emerald-400 tracking-widest">BOSS</span>
                              <span className="font-black font-orbitron text-2xl leading-none drop-shadow-md text-white">{gameState.timeLeft}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (() => {
                      const timerLimit = (activeMatch?.mode === 'time_attack') ? 60 : (60 + parseInt(typeof window !== 'undefined' ? localStorage.getItem('career_time_bonus') || '0' : '0'));
                      const timerPct = (gameState.timeLeft / timerLimit) * 100;
                      const timerColor = timerPct > 80 ? '#00f0ff' : timerPct > 40 ? '#00ff66' : timerPct > 15 ? '#FF8800' : '#ff003c';
                      const getTimerFontSize = (n: number) => {
                        const digits = Math.abs(n).toString().length;
                        if (digits >= 4) return 'text-sm tracking-tight';
                        if (digits === 3) return 'text-xl';
                        return 'text-3xl';
                      };

                      return (
                        <div className={`chrome-timer-outer transition-all duration-300 ${isPaused ? 'scale-110' : 'group-hover:scale-105'}`}>
                          <div className="glass-timer-inner">
                            <div className="glass-timer-reflection" />
                            <div className="glass-timer-glint" />
                            
                            <svg className="absolute inset-0 w-full h-full -rotate-90 scale-95" style={{ overflow: 'visible' }}>
                              <circle cx="50%" cy="50%" r="44%" stroke={`${timerColor}18`} strokeWidth="4" fill="none" />
                              {!isPaused && (
                                <>
                                  <circle
                                    cx="50%" cy="50%" r="44%"
                                    stroke={activeMatch?.isDuel && duelMode !== 'time_attack' && duelMode !== 'blitz'
                                      ? `rgb(${Math.floor(((opponentTargets || 0) / 5) * 205 + 34)}, ${Math.floor((1 - (opponentTargets || 0) / 5) * 129 + 68)}, 68)`
                                      : timerColor}
                                    strokeWidth="6"
                                    fill="none"
                                    pathLength="100"
                                    strokeDasharray="100"
                                    strokeDashoffset={activeMatch?.isDuel && duelMode !== 'time_attack' && duelMode !== 'blitz'
                                        ? 100 - (100 * (opponentTargets || 0) / 5)
                                        : (100 * (1 - Math.max(0, Math.min(1, gameState.timeLeft / timerLimit))))
                                    }
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-linear blur-[2px] opacity-60"
                                  />
                                  <circle
                                    cx="50%" cy="50%" r="44%"
                                    stroke={activeMatch?.isDuel && duelMode !== 'time_attack' && duelMode !== 'blitz'
                                      ? `rgb(${Math.floor(((opponentTargets || 0) / 5) * 205 + 34)}, ${Math.floor((1 - (opponentTargets || 0) / 5) * 129 + 68)}, 68)`
                                      : timerColor}
                                    strokeWidth="4"
                                    fill="none"
                                    pathLength="100"
                                    strokeDasharray="100"
                                    strokeDashoffset={activeMatch?.isDuel && duelMode !== 'time_attack' && duelMode !== 'blitz'
                                        ? 100 - (100 * (opponentTargets || 0) / 5)
                                        : (100 * (1 - Math.max(0, Math.min(1, gameState.timeLeft / timerLimit))))
                                    }
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-linear"
                                  />
                                </>
                              )}
                            </svg>
                            
                            {isPaused ? (
                              <Pause className="w-8 h-8 text-white animate-pulse" fill="white" />
                            ) : (
                              <div className="relative z-10 flex flex-col items-center justify-center text-white">
                                {activeMatch?.isDuel && duelMode === 'blitz' ? (
                                  <>
                                    <div className="flex items-center gap-1 mb-0.5 scale-75 opacity-90 font-orbitron font-black">
                                      <span className="text-cyan-400 text-xs drop-shadow-[0_0_4px_rgba(34,211,238,0.5)]">
                                        {gameState.levelTargets.filter(t => t.owner === (activeMatch?.isP1 ? 'p1' : 'p2')).length}
                                      </span>
                                      <span className="text-white/20 text-[5px]">VS</span>
                                      <span className="text-red-500 text-xs drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]">
                                        {gameState.levelTargets.filter(t => t.owner === (activeMatch?.isP1 ? 'p2' : 'p1')).length}
                                      </span>
                                    </div>
                                    <span className={`font-black font-orbitron leading-none tracking-tighter ${getTimerFontSize(gameState.timeLeft)}`}
                                      style={{ 
                                        color: timerColor, 
                                        textShadow: `0 0 8px ${timerColor}, 0 0 16px ${timerColor}80`,
                                        ...(gameState.timeLeft <= 5 ? {
                                          animation: 'heartBeatPulse 1s ease-in-out infinite',
                                          display: 'inline-block'
                                        } : {})
                                      }}>
                                      {gameState.timeLeft}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    {activeMatch?.isDuel && duelMode !== 'time_attack' && (
                                      <span className="text-[6px] font-black text-white/40 uppercase leading-none mb-0.5 tracking-widest">
                                        {duelMode === 'time_attack' ? 'TIME' : 'ENEMY'}
                                      </span>
                                    )}
                                    {(() => {
                                        const displayVal = activeMatch?.isDuel
                                          ? ((duelMode === 'time_attack' || duelMode === 'blitz') ? gameState.timeLeft : opponentTargets)
                                          : gameState.timeLeft;
                                        return (
                                          <span className={`font-black font-orbitron leading-none ${getTimerFontSize(displayVal)}`}
                                            style={{ 
                                              color: (activeMatch?.isDuel && duelMode !== 'time_attack' && duelMode !== 'blitz') ? '#FF8800' : timerColor, 
                                              textShadow: (activeMatch?.isDuel && duelMode !== 'time_attack' && duelMode !== 'blitz')
                                                ? '0 0 8px rgba(255,136,0,0.9), 0 0 16px rgba(255,136,0,0.5)'
                                                : `0 0 8px ${timerColor}, 0 0 16px ${timerColor}80`,
                                              ...(gameState.timeLeft <= 5 && !(activeMatch?.isDuel && duelMode !== 'time_attack' && duelMode !== 'blitz') ? {
                                                animation: 'heartBeatPulse 1s ease-in-out infinite',
                                                display: 'inline-block'
                                              } : {})
                                            }}>
                                            {displayVal}
                                          </span>
                                        );
                                      })()}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                </div>
              </header>
            )}

            <main className="relative flex-grow w-full flex flex-col items-center justify-center">
              {gameState.status === 'playing' && (
                <div className="w-full flex flex-col items-center h-full relative">
                  {/* Info Row: Current Calculation Badge (Left) */}
                  <div className="w-full max-w-2xl px-4 flex justify-start items-center min-h-[50px] mb-2 mt-6">
                    {(() => {
                      const isTargetMatched = previewResult !== null && (gameState.isBossLevel
                        ? (gameState.levelTargets.find(t => !t.completed)?.value === previewResult)
                        : gameState.levelTargets.some(t => t.value === previewResult && !t.completed));
                      
                      const neonClass = isTargetMatched 
                        ? 'text-[#00ff66] drop-shadow-[0_0_15px_rgba(0,255,102,0.9)] animate-pulse'
                        : 'text-[#00f0ff] drop-shadow-[0_0_15px_rgba(0,240,255,0.9)]';

                      const borderGlow = isTargetMatched
                        ? 'shadow-[0_0_25px_rgba(0,255,102,0.6)] border-[#00ff66] scale-105'
                        : 'shadow-[0_0_15px_rgba(0,240,255,0.3)] border-[#555]';

                      return (
                        <div className={`transition-all duration-300 transform origin-left
                            ${isDragging && selectedPath.length > 0 ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-90 -translate-x-4 pointer-events-none'}`}>
                          
                          {/* Square Badge with Rounded Corners matching the Timer Circle */}
                          <div 
                            className={`relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 border-[5px] ${borderGlow}`}
                            style={{
                              background: 'repeating-linear-gradient(135deg, #1c1c1c 0px, #1c1c1c 2px, #2a2a2a 2px, #2a2a2a 4px, #222 4px, #222 6px, #303030 6px, #303030 8px)',
                              boxShadow: isTargetMatched 
                                ? '0 0 0 2px #00ff66, 0 0 0 3px #111, inset 0 1px 0 rgba(255,255,255,0.12), 0 0 20px rgba(0,255,102,0.5)'
                                : '0 0 0 2px #888, 0 0 0 3px #333, inset 0 1px 0 rgba(255,255,255,0.12)'
                            }}
                          >
                            {/* Glass reflection cover matching the timer circle */}
                            <div 
                              className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden z-20"
                              style={{
                                boxShadow: 'inset 0 4px 8px rgba(255,255,255,0.35), inset 0 -4px 8px rgba(0,0,0,0.3)'
                              }}
                            >
                              {/* Glossy Curved Bevel Cover */}
                              <div 
                                className="absolute top-0 inset-x-0 h-[45%] rounded-t-xl"
                                style={{
                                  background: 'linear-gradient(to bottom, rgba(255,255,255,0.15), transparent)'
                                }}
                              ></div>
                              
                              {/* Diagonal Spotlight Reflection - Outer Soft */}
                              <div 
                                className="absolute top-[8%] left-[8%] w-[32%] h-[32%] rounded-full filter blur-[3px] rotate-[15deg]"
                                style={{
                                  background: 'linear-gradient(to bottom right, rgba(255,255,255,0.18), transparent)'
                                }}
                              ></div>

                              {/* Diagonal Spotlight Reflection - Inner Sharp Core */}
                              <div 
                                className="absolute top-[12%] left-[12%] w-[15%] h-[15%] rounded-full filter blur-[0.5px] rotate-[15deg]"
                                style={{
                                  background: 'linear-gradient(to bottom right, rgba(255,255,255,0.45), rgba(255,255,255,0.05))'
                                }}
                              ></div>
                            </div>

                            {/* The Number */}
                            <span className={`text-2xl font-black font-orbitron leading-none z-10 ${neonClass}`}>
                              {previewResult !== null ? previewResult : ''}
                            </span>

                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* TARGETS - Chrome Frame: auto-sizing to remaining targets */}
                  {(() => {
                    const activeTargetCount = gameState.isBossLevel && gameState.bossLevelId === 1
                      ? (gameState.levelTargets.find(t => !t.completed) ? 1 : 0)
                      : gameState.levelTargets.filter(t => !t.completed).length;
                    const totalCount = gameState.levelTargets.length;
                    return (
                      <div className="flex justify-center w-full mb-5">
                        <div
                          className="chrome-bar rounded-[2rem] flex items-center justify-center transition-all duration-500 ease-in-out"
                          style={{
                            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.9), inset 0 -4px 4px rgba(0,0,0,0.6), 0 8px 18px rgba(0,0,0,0.5)',
                            padding: activeTargetCount === 0 ? '6px 16px' : '10px 12px',
                          }}
                        >
                          <div
                            className="flex gap-2 items-center flex-nowrap justify-center transition-all duration-500"
                            id="targets-display-tutorial"
                            style={{ maxWidth: `${Math.max(activeTargetCount, 1) * 68}px` }}
                          >
                        {gameState.isBossLevel && gameState.bossLevelId === 1 ? (
                          // BOSS 1: Sequential Large Target
                          (() => {
                            const activeTarget = gameState.levelTargets.find(t => !t.completed);
                            if (!activeTarget) return null;
                            const remainingCount = gameState.levelTargets.filter(t => !t.completed).length;
                            const totalCount = gameState.levelTargets.length;
                            const currentIndex = totalCount - remainingCount + 1;

                            return (
                              <div className="flex flex-col items-center animate-bounce-short w-full">
                                <div data-target-value={activeTarget.value} className={`relative overflow-hidden flex flex-col items-center justify-center w-full max-w-[240px] h-24 px-4 rounded-xl border-[4px] border-emerald-400 bg-emerald-900/80 shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all duration-300 transform hover:scale-105 ${matchedTargetValue === activeTarget.value ? 'animate-hex-correct-bounce-delayed' : ''}`}>
                                  {/* Circular/Rounded 3D Glass Embossed Reflection Cover */}
                                  <div 
                                    className="absolute inset-0 rounded-lg pointer-events-none overflow-hidden z-20"
                                    style={{
                                      boxShadow: 'inset 0 6px 12px rgba(255,255,255,0.55), inset 0 -6px 12px rgba(0,0,0,0.45)'
                                    }}
                                  >
                                    {/* Glossy Curved Bevel Cover (Cupola superiore lucida) */}
                                    <div 
                                      className="absolute top-0 inset-x-0 h-[42%] rounded-t-lg"
                                      style={{
                                        background: 'linear-gradient(to bottom, rgba(255,255,255,0.35), transparent)'
                                      }}
                                    ></div>
                                    
                                    {/* Diagonal Spotlight Reflection - Outer Soft (Riflesso morbido) */}
                                    <div 
                                      className="absolute top-[8%] left-[8%] w-[32%] h-[32%] rounded-full filter blur-[2.5px] rotate-[15deg]"
                                      style={{
                                        background: 'linear-gradient(to bottom right, rgba(255,255,255,0.3), transparent)'
                                      }}
                                    ></div>

                                    {/* Diagonal Spotlight Reflection - Inner Sharp Core (Punto luce super specchiato) */}
                                    <div 
                                      className="absolute top-[12%] left-[12%] w-[15%] h-[15%] rounded-full filter blur-[0.5px] rotate-[15deg]"
                                      style={{
                                        background: 'linear-gradient(to bottom right, rgba(255,255,255,0.7), rgba(255,255,255,0.05))'
                                      }}
                                    ></div>
                                  </div>

                                  <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-[0.2em] mb-1 z-10">
                                    TARGET {currentIndex}/{totalCount}
                                  </span>
                                  <span className={`font-orbitron font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none z-10
                                    ${activeTarget.displayValue ? 'text-3xl tracking-widest' : 'text-6xl'}`}>
                                    {activeTarget.displayValue || activeTarget.value}
                                  </span>
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          // STANDARD & BOSS 2+: Career-style Target List
                          gameState.levelTargets.map((t, i) => {
                            const isDominion = activeMatch?.isDuel && duelMode === 'blitz';
                            const isCompleted = t.completed;
                            
                            // Style settings based on status
                            let targetBg = 'linear-gradient(135deg, #0a1733 0%, #030814 100%)';
                            let targetBorder = '2px solid #00d2ff';
                            let targetGlow = '0 0 25px rgba(0, 210, 255, 0.95), 0 0 8px rgba(0, 210, 255, 0.9), inset 0 3px 6px rgba(255, 255, 255, 0.45), inset 0 -3px 6px rgba(0, 0, 0, 0.7)';
                            let numStyle: React.CSSProperties = {
                              color: '#ffffff',
                              textShadow: '0 0 8px #00d2ff, 0 0 16px rgba(0, 210, 255, 0.9), 0 0 24px rgba(0, 210, 255, 0.5)'
                            };

                            if (isCompleted) {
                              targetBg = 'linear-gradient(135deg, #052e16 0%, #022c22 100%)';
                              targetBorder = '2px solid rgba(16, 185, 129, 0.7)';
                              targetGlow = '0 0 20px rgba(16, 185, 129, 0.8), 0 0 6px rgba(16, 185, 129, 1), inset 0 3px 6px rgba(255, 255, 255, 0.35), inset 0 -3px 6px rgba(0, 0, 0, 0.65)';
                              numStyle = {
                                color: '#d1fae5',
                                textShadow: '0 0 8px rgba(16, 185, 129, 0.95), 0 0 15px rgba(16, 185, 129, 0.5)'
                              };
                            } else if (isDominion) {
                              const isMyTarget = (t.owner === 'p1' && activeMatch?.isP1) || (t.owner === 'p2' && !activeMatch?.isP1);
                              const isEnemyTarget = (t.owner === 'p1' && !activeMatch?.isP1) || (t.owner === 'p2' && activeMatch?.isP1);
                              if (isMyTarget) {
                                targetBg = 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)';
                                targetBorder = '2px solid rgba(52, 211, 153, 0.8)';
                                targetGlow = '0 0 25px rgba(52, 211, 153, 0.9), 0 0 8px rgba(52, 211, 153, 1), inset 0 3px 6px rgba(255, 255, 255, 0.4), inset 0 -3px 6px rgba(0, 0, 0, 0.65)';
                              } else if (isEnemyTarget) {
                                targetBg = 'linear-gradient(135deg, #4c0519 0%, #31000e 100%)';
                                targetBorder = '2px solid rgba(244, 63, 94, 0.7)';
                                targetGlow = '0 0 15px rgba(244, 63, 94, 0.6), inset 0 3px 6px rgba(255, 255, 255, 0.25), inset 0 -3px 6px rgba(0, 0, 0, 0.65)';
                                numStyle = {
                                  color: '#ffe4e6',
                                  textShadow: '0 0 8px rgba(244, 63, 94, 0.8)'
                                };
                              }
                            }

                            const valStr = String(t.value || '');
                            let sizeClasses = 'w-14 h-14 text-2xl sm:text-3xl';
                            if (t.displayValue) {
                              sizeClasses = 'w-14 h-14 text-[10px] sm:text-[11px] leading-tight whitespace-nowrap px-1';
                            } else if (valStr.length >= 3) {
                              sizeClasses = 'min-w-[3.5rem] px-2 h-14 text-base sm:text-lg';
                            } else if (valStr.length === 2) {
                              sizeClasses = 'min-w-[3.5rem] px-1.5 h-14 text-xl sm:text-2xl';
                            }

                            const completedClass = isCompleted ? 'animate-target-completed' : '';

                            return (
                              <div key={i} data-target-value={t.value} 
                                className={`relative overflow-hidden flex items-center justify-center rounded-xl transition-all duration-300 font-orbitron font-black shadow-lg ${sizeClasses} ${completedClass} ${matchedTargetValue === t.value && !t.completed ? 'animate-hex-correct-bounce-delayed' : ''}`}
                                style={{
                                  background: isCompleted ? 'transparent' : targetBg,
                                  border: isCompleted ? 'none' : targetBorder,
                                  boxShadow: isCompleted ? 'none' : targetGlow
                                }}
                              >
                                {isCompleted ? (
                                  <div className="plasma-core-wrapper">
                                    <div className="plasma-bloom"></div>
                                    <div className="plasma-sphere"></div>
                                    <div className="plasma-nucleus"></div>
                                    <div className="plasma-cluster">
                                      <span className="micro-particle mp1"></span>
                                      <span className="micro-particle mp2"></span>
                                      <span className="micro-particle mp3"></span>
                                      <span className="micro-particle mp4"></span>
                                      <span className="micro-particle mp5"></span>
                                      <span className="micro-particle mp6"></span>
                                      <span className="micro-particle mp7"></span>
                                      <span className="micro-particle mp8"></span>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    {/* Circular/Rounded 3D Glass Embossed Reflection Cover */}
                                    <div 
                                      className="absolute inset-0 rounded-lg pointer-events-none overflow-hidden z-20"
                                      style={{
                                        boxShadow: 'inset 0 4px 8px rgba(255,255,255,0.35), inset 0 -4px 8px rgba(0,0,0,0.5)'
                                      }}
                                    >
                                      {/* Glossy Curved Bevel Cover */}
                                      <div 
                                        className="absolute top-0 inset-x-0 h-[42%] rounded-t-lg"
                                        style={{
                                          background: 'linear-gradient(to bottom, rgba(255,255,255,0.22), transparent)'
                                        }}
                                      ></div>
                                      
                                      {/* Diagonal Spotlight - Outer Soft */}
                                      <div 
                                        className="absolute top-[8%] left-[8%] w-[35%] h-[35%] rounded-full filter blur-[2px] rotate-[15deg]"
                                        style={{
                                          background: 'linear-gradient(to bottom right, rgba(255,255,255,0.20), transparent)'
                                        }}
                                      ></div>

                                      {/* Diagonal Spotlight - Inner Sharp */}
                                      <div 
                                        className="absolute top-[12%] left-[12%] w-[16%] h-[16%] rounded-full filter blur-[0.5px] rotate-[15deg]"
                                        style={{
                                          background: 'linear-gradient(to bottom right, rgba(255,255,255,0.55), rgba(255,255,255,0.05))'
                                        }}
                                      ></div>
                                    </div>
                                    <span className="z-10" style={numStyle}>{t.displayValue || t.value}</span>
                                  </>
                                )}
                              </div>
                            );
                          })
                        )}

                        {/* EXTRA TIME BUBBLE REMOVED AS IT GAVE ERRORS */}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="relative flex-grow w-full flex items-center justify-center overflow-visible">

                    {isPaused && (
                      <div id="pause-overlay-game" className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl rounded-3xl transition-all animate-fadeIn">
                        <div className="flex flex-col items-center gap-4">
                          <Pause className="w-24 h-24 text-white opacity-100 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                          <span className="font-orbitron font-black text-2xl text-white tracking-[0.3em] animate-pulse">PAUSA</span>
                        </div>
                      </div>
                    )}

                    <div id="grid-container-game" className={`relative mx-auto transition-all duration-500 transform
                    ${isPaused ? 'opacity-10 scale-95 filter blur-lg pointer-events-none grayscale' : 'opacity-100 scale-100 filter-none'}
                    ${theme === 'orange'
                        ? 'w-[calc(272px*var(--hex-scale))] h-[calc(376px*var(--hex-scale))]'
                        : 'w-[calc(400px*var(--hex-scale))] h-[calc(480px*var(--hex-scale))]'
                      }`}
                      style={{
                        filter: isPaused ? 'blur(16px) grayscale(1)' : 'none'
                      }}>
                      {grid.map(cell => (
                        <HexCell key={cell.id} data={cell} isSelected={selectedPath.includes(cell.id)} isSelectable={!isVictoryAnimating && !isPaused} onMouseEnter={onMoveInteraction} onMouseDown={onStartInteraction} theme={theme} isBossLevel={gameState.isBossLevel} bossLevelId={gameState.bossLevelId} pathStatus={pathStatus} />
                      ))}
                    </div>
                  </div>

                  {/* PREMIUM AD REWARD BANNER - Vertical Tab */}
                  <div className={`fixed right-0 top-[140px] md:top-[120px] z-[500] transition-all duration-700 ease-out transform
                    ${adBannerActive ? 'translate-x-0' : 'translate-x-[calc(100%-70px)]'}`}>
                    {/* Keyframes for the fluid moving gradient flow and crystal glass reflections */}
                    <style>{`
                      @keyframes adGradientFlow {
                        0% { background-position: 0% 50%; }
                        50% { background-position: 100% 50%; }
                        100% { background-position: 0% 50%; }
                      }
                      @keyframes glassSheen {
                        0% { left: -150%; }
                        30% { left: 150%; }
                        100% { left: 150%; }
                      }
                    `}</style>
                    <div
                      onPointerDown={(e) => {
                        adTouchStartX.current = e.clientX;
                      }}
                      onPointerUp={(e) => {
                        if (adTouchStartX.current === null) return;
                        const deltaX = e.clientX - adTouchStartX.current;
                        adTouchStartX.current = null;

                        // SWIPE DETECTION
                        if (Math.abs(deltaX) > 30) {
                          if (deltaX < -30) { // Swipe Left: Open (if on the right)
                            if (!adBannerActive) {
                              setAdBannerActive(true);
                              if (adBannerTimerRef.current) clearTimeout(adBannerTimerRef.current);
                              adBannerTimerRef.current = setTimeout(() => {
                                setAdBannerActive(false);
                              }, 5000); // 5 seconds manually
                            }
                          } else if (deltaX > 30) { // Swipe Right: Close
                            setAdBannerActive(false);
                          }
                          return;
                        }

                        // CLICK LOGIC
                        if (!ADS_CONFIG.enabled && adBannerActive) {
                          showToast("Arriverà tra poco!");
                          return;
                        }

                        if (!adBannerActive) {
                          setAdBannerActive(true);
                          if (adBannerTimerRef.current) clearTimeout(adBannerTimerRef.current);
                          adBannerTimerRef.current = setTimeout(() => {
                            setAdBannerActive(false);
                          }, 5000); // 5 seconds manually
                        } else {
                          // Banner is disabled
                          const target = e.target as HTMLElement;
                          if (target.closest('.ad-close-tab')) {
                            setAdBannerActive(false);
                          }
                        }
                      }}
                      className={`flex flex-row-reverse items-center p-0 rounded-l-2xl border-[3px] border-r-0 border-white/75 transition-all group relative overflow-hidden h-[80px] backdrop-blur-xl
                        ${adBannerActive ? 'animate-pulse' : ''}
                        ${ADS_CONFIG.enabled ? 'cursor-pointer' : 'from-gray-600 to-gray-800 bg-gradient-to-r cursor-default grayscale opacity-80'}`}
                      style={ADS_CONFIG.enabled ? {
                        background: 'linear-gradient(135deg, rgba(255, 0, 128, 0.6), rgba(255, 0, 255, 0.6), rgba(255, 85, 0, 0.6), rgba(0, 235, 255, 0.6))',
                        backgroundSize: '300% 300%',
                        animation: 'adGradientFlow 4s linear infinite',
                        boxShadow: adBannerActive 
                          ? '0 0 50px rgba(255,0,128,0.8), inset 0 3px 6px rgba(255,255,255,0.65), inset 0 -3px 6px rgba(0,0,0,0.45)' 
                          : '-8px 0 15px rgba(255,0,128,0.4), inset 0 3px 6px rgba(255,255,255,0.65), inset 0 -3px 6px rgba(0,0,0,0.45)'
                      } : undefined}
                    >
                      {/* Carbon Texture */}
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-15 pointer-events-none"></div>

                      {/* Glossy Sheen Crystal Reflection */}
                      {ADS_CONFIG.enabled && (
                        <div className="absolute inset-y-0 w-[60px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"
                             style={{
                               transform: 'skewX(-25deg)',
                               animation: 'glassSheen 4.5s ease-in-out infinite',
                             }}
                        />
                      )}

                      {/* FIXED EMBOSSED GLASS COVER (Copertura in rilievo 3D con riflesso fisso) */}
                      {ADS_CONFIG.enabled && (
                        <>
                          {/* Top Border Reflection Line (Riflesso di rilievo superiore) */}
                          <div className="absolute top-0 inset-x-0 h-[2px] bg-white/45 pointer-events-none"></div>
                          
                          {/* Curved Glossy Half-Cap (Fascia lucida fissa superiore) */}
                          <div className="absolute top-0 inset-x-0 h-[42%] bg-gradient-to-b from-white/20 to-transparent pointer-events-none"></div>
                          
                          {/* Left Edge Bevel Highlight (Riflesso fisso verticale sul lato) */}
                          <div className="absolute left-0 inset-y-0 w-[4px] bg-gradient-to-r from-white/40 to-transparent pointer-events-none"></div>
                          
                          {/* Bottom Bevel Depth Shadow (Ombra di profondità inferiore) */}
                          <div className="absolute bottom-0 inset-x-0 h-[2px] bg-black/25 pointer-events-none"></div>
                        </>
                      )}

                      <div className="flex flex-row-reverse items-center h-full">
                        {/* Expanded Text Area (Triggers Video) */}
                        <div
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            if (ADS_CONFIG.enabled) {
                              if (adBannerActive) handleRequestExtraTime();
                            } else {
                              showToast("Arriverà tra poco!");
                            }
                          }}
                          className={`flex items-center pr-16 transition-all duration-500 overflow-hidden ${adBannerActive ? 'max-w-[380px] opacity-100' : 'max-w-0 opacity-0'}`}
                        >
                          <div className="text-right pl-6 whitespace-nowrap">
                            <h3 className="font-orbitron font-black text-white text-[18px] uppercase leading-tight tracking-widest italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">{ADS_CONFIG.enabled ? `+${ADS_CONFIG.rewardValue}s BONUS` : 'ARRIVERÀ TRA POCO'}</h3>
                            <p className="text-[14px] text-white/80 font-bold uppercase tracking-tighter drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{ADS_CONFIG.enabled ? 'Guarda video premio' : 'Pubblicità disabilitata'}</p>
                          </div>
                        </div>

                        {/* Impact Tab (Triggers Close when expanded) */}
                        <div className="ad-close-tab flex flex-col items-center justify-center w-[70px] h-full bg-white/10 backdrop-blur-md border-r border-white/20 shrink-0 cursor-pointer">
                          <span style={{ fontFamily: 'Impact, "Arial Narrow", sans-serif' }} className="text-3xl font-black text-white leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">+{ADS_CONFIG.rewardValue}</span>
                          <span className="text-[8px] font-black text-white leading-none mt-1 uppercase tracking-tighter opacity-90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">SECONDI</span>
                        </div>
                      </div>

                      {/* Peeking Arrow */}
                      {!adBannerActive && (
                        <div className="absolute left-0.5 top-1/2 -translate-y-1/2 opacity-60">
                          <ChevronLeft size={14} className="text-white/50" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* BLITZ ROUND WON OVERLAY */}
              {gameState.status === 'round-won' && (
                <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fadeIn">
                  <div className="text-center p-8 bg-slate-900 border-4 border-[#FF8800] rounded-[3rem] shadow-[0_0_50px_rgba(255,136,0,0.5)] animate-bounce-slow">
                    <FastForward className="w-16 h-16 text-[#FF8800] mx-auto mb-4" />
                    <h2 className="text-4xl font-black font-orbitron text-white uppercase tracking-widest leading-none mb-2">ROUND VINTO!</h2>
                    <div className="text-lg font-black font-orbitron text-[#FF8800] uppercase tracking-tighter">Sincronizzazione in corso...</div>
                    <div className="mt-4 flex gap-2 justify-center">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-3 h-3 rounded-full bg-[#FF8800] animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}></div>
                      ))}
                    </div>
                  </div>
                </div>
              )}


              {gameState.status === 'game-over' && (
                <div className={`p-6 rounded-[2.5rem] text-center modal-content animate-screen-in w-full max-w-md relative overflow-hidden border-[4px] backdrop-blur-2xl transition-all duration-300
                  ${gameState.bossLevelId === 2
                    ? 'border-amber-500/80 shadow-[0_40px_100px_rgba(0,0,0,0.85),0_0_40px_rgba(217,119,6,0.3)]'
                    : gameState.isBossLevel
                      ? 'border-emerald-400/80 shadow-[0_40px_100px_rgba(0,0,0,0.85),0_0_40px_rgba(16,185,129,0.3)]'
                      : 'border-red-500/80 shadow-[0_40px_100px_rgba(0,0,0,0.85),0_0_40px_rgba(239,68,68,0.3)]'}`}
                  style={{
                    background: gameState.bossLevelId === 2 
                      ? 'linear-gradient(135deg, rgba(40,25,10,0.75) 0%, rgba(20,10,5,0.9) 100%)' 
                      : gameState.isBossLevel 
                        ? 'linear-gradient(135deg, rgba(10,35,20,0.75) 0%, rgba(5,15,10,0.9) 100%)' 
                        : 'linear-gradient(135deg, rgba(30,10,10,0.75) 0%, rgba(15,5,5,0.9) 100%)',
                    boxShadow: '0 40px 100px rgba(0,0,0,0.85), inset 0 4px 12px rgba(255,255,255,0.35), inset 0 -4px 12px rgba(0,0,0,0.6)'
                  }}>
                  
                  {/* Glass layout elements */}
                  <div className="absolute inset-0 pointer-events-none z-0" style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 30%, transparent 30.1%, transparent 70%, rgba(255,255,255,0.03) 70.1%, rgba(255,255,255,0.1) 100%)'
                  }}></div>
                  <div className="absolute top-0 inset-x-0 h-[45%] pointer-events-none rounded-t-[2.5rem] z-0" style={{
                    background: 'linear-gradient(to bottom, rgba(255,255,255,0.18), transparent)'
                  }}></div>

                  <div className="relative z-10">
                    {/* Header */}
                    <div className="text-center mb-4">
                      <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl border-[3px] border-white/50 mb-2 ${gameState.bossLevelId === 2
                        ? 'bg-gradient-to-br from-amber-550 to-amber-700 shadow-[0_0_20px_rgba(120,53,15,0.5)]'
                        : gameState.isBossLevel
                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                          : 'bg-gradient-to-br from-red-500 to-red-700 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                        }`}>
                        <XCircle className="w-7 h-7 text-white" />
                      </div>
                      <h2 className={`text-2xl font-black font-orbitron uppercase tracking-widest mb-1 drop-shadow-lg ${gameState.bossLevelId === 2 ? 'text-amber-400' : gameState.isBossLevel ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                        HAI PERSO
                      </h2>
                      <div className="h-0.5 w-24 bg-gradient-to-r from-transparent via-red-500 to-transparent mx-auto rounded-full"></div>
                    </div>

                    {/* Info Card */}
                    <div className={`border-[2px] rounded-2xl p-4 mb-5 backdrop-blur-md shadow-[inset_0_2px_6px_rgba(255,255,255,0.15)] bg-white/5
                      ${gameState.bossLevelId === 2 ? 'border-amber-500/30' : gameState.isBossLevel ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Target className={`w-5 h-5 ${gameState.bossLevelId === 2 ? 'text-amber-400' : gameState.isBossLevel ? 'text-emerald-400' : 'text-red-400'}`} />
                          <span className="text-xs font-black text-white/70 uppercase tracking-wider">
                            {gameState.isBossLevel ? 'Boss Sfidato' : 'Livello Non Superato'}
                          </span>
                        </div>

                        <div className="w-full bg-black/30 rounded-xl p-3 border border-white/10 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                              <Trophy size={14} className="text-amber-400" />
                              <span className="text-xs font-black text-white/70 uppercase tracking-wider">Livello</span>
                            </div>
                            <span className="text-2xl font-orbitron font-black text-white">{gameState.level}</span>
                          </div>
                        </div>

                        <div className="w-full bg-black/30 rounded-xl p-3 border border-white/10 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                              <Award size={14} className="text-amber-400" />
                              <span className="text-xs font-black text-white/70 uppercase tracking-wider">Punteggio</span>
                            </div>
                            <span className="text-2xl font-orbitron font-black text-white">{gameState.totalScore}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2.5">
                      <button onPointerDown={(e) => {
                        e.stopPropagation();
                        resetDuelState();
                        if (gameState.isBossLevel && gameState.bossLevelId) {
                          startBossGame(gameState.bossLevelId);
                        } else {
                          startGame(gameState.level);
                        }
                      }}
                        className={`w-full relative overflow-hidden text-white py-5 px-6 rounded-2xl font-orbitron font-black uppercase tracking-widest text-base border-[4px] border-white active:translate-y-1 transition-all hover:scale-[1.02] duration-300 flex items-center justify-center gap-3 group shadow-[0_8px_0_rgba(0,0,0,0.3),inset_0_4px_8px_rgba(255,255,255,0.5),inset_0_-4px_8px_rgba(0,0,0,0.5)]
                          ${gameState.isBossLevel
                            ? (gameState.bossLevelId === 2 ? 'bg-gradient-to-r from-amber-550 to-amber-700' : 'bg-gradient-to-r from-emerald-500 to-emerald-700')
                            : 'bg-[#FF8800]'
                          }`}>
                        {/* 3D Glass shine layer */}
                        <div className="absolute inset-0 pointer-events-none z-10" style={{
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 30%, transparent 30.1%, transparent 70%, rgba(255,255,255,0.08) 70.1%, rgba(255,255,255,0.2) 100%)'
                        }}></div>
                        <div className="absolute top-0 inset-x-0 h-[45%] pointer-events-none rounded-t-xl z-10" style={{
                          background: 'linear-gradient(to bottom, rgba(255,255,255,0.28), transparent)'
                        }}></div>

                        <RefreshCw className="w-5 h-5 relative z-20 group-hover:rotate-180 transition-transform duration-550 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
                        <span className="relative z-20 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">{gameState.isBossLevel ? 'RIPROVA BOSS' : 'RIGIOCA'}</span>
                      </button>

                      <button onPointerDown={(e) => {
                        e.stopPropagation();
                        resetDuelState(activeMatch?.id, currentUser?.id);
                        goToHome();
                      }}
                        className="w-full relative overflow-hidden bg-slate-800 text-white/90 py-4 px-6 rounded-2xl font-orbitron font-black uppercase tracking-widest text-sm border-[3px] border-white/20 active:translate-y-1 transition-all hover:scale-[1.02] duration-300 hover:bg-slate-750 flex items-center justify-center gap-2 shadow-[0_6px_0_rgba(0,0,0,0.25),inset_0_3px_6px_rgba(255,255,255,0.25),inset_0_-3px_6px_rgba(0,0,0,0.45)]">
                        <div className="absolute inset-0 pointer-events-none z-10" style={{
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 30%, transparent 30.1%)'
                        }}></div>
                        <Home size={16} className="relative z-20" />
                        <span className="relative z-20">TORNA ALLA HOME</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SURRENDER RECAP SCREEN */}
              {gameState.status === 'opponent-surrendered' && (
                <div className="p-6 rounded-[2.5rem] text-center modal-content animate-screen-in w-full max-w-md relative overflow-hidden border-[4px] border-cyan-400/80 backdrop-blur-2xl shadow-[0_40px_100px_rgba(0,0,0,0.85),0_0_40px_rgba(6,182,212,0.3)] transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg, rgba(8,47,73,0.75) 0%, rgba(3,7,18,0.9) 100%)',
                    boxShadow: '0 40px 100px rgba(0,0,0,0.85), inset 0 4px 12px rgba(255,255,255,0.35), inset 0 -4px 12px rgba(0,0,0,0.6)'
                  }}>
                  
                  {/* Glass layout elements */}
                  <div className="absolute inset-0 pointer-events-none z-0" style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 30%, transparent 30.1%, transparent 70%, rgba(255,255,255,0.03) 70.1%, rgba(255,255,255,0.1) 100%)'
                  }}></div>
                  <div className="absolute top-0 inset-x-0 h-[45%] pointer-events-none rounded-t-[2.5rem] z-0" style={{
                    background: 'linear-gradient(to bottom, rgba(255,255,255,0.18), transparent)'
                  }}></div>

                  <div className="relative z-10">
                    {/* Header */}
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl border-[3px] border-white/50 mb-2 bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                        <Trophy className="w-7 h-7 text-white" />
                      </div>
                      <h2 className="text-2xl font-black font-orbitron uppercase tracking-widest mb-1 drop-shadow-lg text-cyan-400">
                        HAI VINTO
                      </h2>
                      <div className="h-0.5 w-24 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mx-auto rounded-full"></div>
                    </div>

                    {/* Info Card */}
                    <div className="border-[2px] border-cyan-500/30 rounded-2xl p-4 mb-5 backdrop-blur-md shadow-[inset_0_2px_6px_rgba(255,255,255,0.15)] bg-white/5">
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-cyan-400" />
                          <span className="text-xs font-black text-white/70 uppercase tracking-wider">
                            Vittoria per Ritiro
                          </span>
                        </div>

                        <div className="w-full bg-black/30 rounded-xl p-3 border border-white/10 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                              <Award size={14} className="text-amber-400" />
                              <span className="text-xs font-black text-white/70 uppercase tracking-wider">Punteggio</span>
                            </div>
                            <span className="text-2xl font-orbitron font-black text-white">+{gameState.score + (duelMode === 'blitz' ? 50 : 100)}</span>
                          </div>
                        </div>

                        <div className="w-full bg-black/30 rounded-xl p-3 border border-white/10 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                              <Swords size={14} className="text-cyan-400" />
                              <span className="text-xs font-black text-white/70 uppercase tracking-wider">Modalità</span>
                            </div>
                            <span className="text-lg font-orbitron font-black text-white uppercase">{duelMode === 'blitz' ? 'Blitz' : (duelMode === 'time_attack' ? 'Time Attack' : 'Standard')}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2.5">
                      <button onPointerDown={(e) => {
                        e.stopPropagation();
                        resetDuelState();
                        setActiveModal('duel_selection');
                      }}
                        className="w-full relative overflow-hidden text-white py-5 px-6 rounded-2xl font-orbitron font-black uppercase tracking-widest text-base border-[4px] border-white active:translate-y-1 transition-all hover:scale-[1.02] duration-300 flex items-center justify-center gap-3 group bg-gradient-to-r from-cyan-500 to-cyan-700 shadow-[0_8px_0_rgba(0,0,0,0.3),inset_0_4px_8px_rgba(255,255,255,0.5),inset_0_-4px_8px_rgba(0,0,0,0.5)]">
                        {/* 3D Glass shine layer */}
                        <div className="absolute inset-0 pointer-events-none z-10" style={{
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 30%, transparent 30.1%, transparent 70%, rgba(255,255,255,0.08) 70.1%, rgba(255,255,255,0.2) 100%)'
                        }}></div>
                        <div className="absolute top-0 inset-x-0 h-[45%] pointer-events-none rounded-t-xl z-10" style={{
                          background: 'linear-gradient(to bottom, rgba(255,255,255,0.28), transparent)'
                        }}></div>
                        
                        <Swords className="w-5 h-5 relative z-20 group-hover:scale-110 transition-transform text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
                        <span className="relative z-20 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">NUOVA SFIDA</span>
                      </button>

                      <button onPointerDown={(e) => {
                        e.stopPropagation();
                        resetDuelState();
                        goToHome();
                      }}
                        className="w-full relative overflow-hidden bg-slate-800 text-white/90 py-4 px-6 rounded-2xl font-orbitron font-black uppercase tracking-widest text-sm border-[3px] border-white/20 active:translate-y-1 transition-all hover:scale-[1.02] duration-300 hover:bg-slate-750 flex items-center justify-center gap-2 shadow-[0_6px_0_rgba(0,0,0,0.25),inset_0_3px_6px_rgba(255,255,255,0.25),inset_0_-3px_6px_rgba(0,0,0,0.45)]">
                        <div className="absolute inset-0 pointer-events-none z-10" style={{
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 30%, transparent 30.1%)'
                        }}></div>
                        <Home size={16} className="relative z-20" />
                        <span className="relative z-20">TORNA ALLA HOME</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {gameState.status === 'level-complete' && (
                <div className={`p-6 rounded-[2.5rem] text-center modal-content animate-screen-in w-full max-w-md relative overflow-hidden border-[4px] backdrop-blur-2xl transition-all duration-300
                  ${gameState.isBossLevel
                    ? 'border-yellow-400/80 shadow-[0_40px_100px_rgba(0,0,0,0.85),0_0_40px_rgba(250,204,21,0.3)]'
                    : 'border-orange-500/80 shadow-[0_40px_100px_rgba(0,0,0,0.85),0_0_40px_rgba(251,146,60,0.3)]'}`}
                  style={{
                    background: gameState.isBossLevel
                      ? 'linear-gradient(135deg, rgba(45,35,10,0.75) 0%, rgba(20,15,5,0.9) 100%)'
                      : 'linear-gradient(135deg, rgba(45,20,5,0.75) 0%, rgba(20,10,2,0.9) 100%)',
                    boxShadow: '0 40px 100px rgba(0,0,0,0.85), inset 0 4px 12px rgba(255,255,255,0.35), inset 0 -4px 12px rgba(0,0,0,0.6)'
                  }}>
                  
                  {/* Glass layout elements */}
                  <div className="absolute inset-0 pointer-events-none z-0" style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 30%, transparent 30.1%, transparent 70%, rgba(255,255,255,0.03) 70.1%, rgba(255,255,255,0.1) 100%)'
                  }}></div>
                  <div className="absolute top-0 inset-x-0 h-[45%] pointer-events-none rounded-t-[2.5rem] z-0" style={{
                    background: 'linear-gradient(to bottom, rgba(255,255,255,0.18), transparent)'
                  }}></div>

                  {gameState.isBossLevel ? (
                    // BOSS WIN SCREEN
                    <div className="relative z-10">
                      <Crown className="w-20 h-20 text-yellow-400 mx-auto mb-4 animate-bounce" />
                      <h2 className="text-4xl font-black font-orbitron text-yellow-400 mb-2 uppercase tracking-wider drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]">BOSS SCONFITTO!</h2>
                      <div className="text-xs font-bold text-white mb-6 uppercase tracking-[0.1em] bg-yellow-500/20 py-1 rounded">Dominio Matematico Stabilito</div>

                      <div className="border-[2px] border-yellow-500/30 rounded-2xl p-5 mb-6 backdrop-blur-md shadow-[inset_0_2px_6px_rgba(255,255,255,0.15)] bg-white/5">
                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-2">Ricompensa</span>
                        <div className="text-3xl font-black font-orbitron text-white text-shadow-neon-yellow flex flex-col items-center gap-1">
                          <span>{BOSS_LEVELS.find(b => b.id === gameState.bossLevelId)?.reward || "BOUNTY"}</span>
                          <span className="text-xs text-yellow-500 font-bold">+{gameState.bossLevelId === 2 ? '1500' : '1000'} PUNTI</span>
                        </div>
                      </div>

                      <button onPointerDown={async (e) => {
                        e.stopPropagation();
                        // Badge already saved when targets completed
                        console.log(`🏠 Tornando alla home. Boss ${gameState.bossLevelId} già salvato.`);
                        setGameState(prev => ({ ...prev, isBossLevel: false, bossLevelId: null, status: 'idle' }));
                      }}
                        className="w-full relative overflow-hidden text-white py-5 px-6 rounded-2xl font-orbitron font-black uppercase tracking-widest text-base border-[4px] border-white active:translate-y-1 transition-all hover:scale-[1.02] duration-300 flex items-center justify-center gap-3 group bg-gradient-to-r from-yellow-550 to-yellow-700 shadow-[0_8px_0_rgba(0,0,0,0.3),inset_0_4px_8px_rgba(255,255,255,0.5),inset_0_-4px_8px_rgba(0,0,0,0.5)]">
                        {/* 3D Glass shine layer */}
                        <div className="absolute inset-0 pointer-events-none z-10" style={{
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 30%, transparent 30.1%, transparent 70%, rgba(255,255,255,0.08) 70.1%, rgba(255,255,255,0.2) 100%)'
                        }}></div>
                        <div className="absolute top-0 inset-x-0 h-[45%] pointer-events-none rounded-t-xl z-10" style={{
                          background: 'linear-gradient(to bottom, rgba(255,255,255,0.28), transparent)'
                        }}></div>
                        <span className="relative z-20 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">RISCATTA & TORNA ALLA BASE</span>
                      </button>
                    </div>
                  ) : (
                    // STANDARD LEVEL WIN
                    <div className="relative z-10">
                      {/* Header with Level Progression */}
                      <div className="text-center mb-4">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF8800] to-orange-700 border-[3px] border-white/50 shadow-[0_0_20px_rgba(255,136,0,0.4)] mb-2">
                          <Trophy className="w-7 h-7 text-white" />
                        </div>
                        <h2 className="text-2xl font-black font-orbitron text-white uppercase tracking-widest mb-1 drop-shadow-lg">
                          LIVELLO <span className="text-[#FF8800]">COMPLETATO</span>
                        </h2>
                        <div className="h-0.5 w-24 bg-gradient-to-r from-transparent via-[#FF8800] to-transparent mx-auto rounded-full"></div>
                      </div>

                      {/* Level Progression Card */}
                      <div className="border-[2px] border-orange-500/30 rounded-2xl p-4 mb-5 backdrop-blur-md shadow-[inset_0_2px_6px_rgba(255,255,255,0.15)] bg-white/5">
                        <div className="flex justify-center items-center gap-4 mb-3">
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] uppercase font-black text-white/40 tracking-[0.2em] mb-0.5">COMPLETATO</span>
                            <div className="w-auto min-w-[4rem] px-2 h-16 rounded-xl bg-white/5 border-2 border-white/10 flex items-center justify-center">
                              <span className={`font-black font-orbitron text-white ${gameState.level > 999 ? 'text-xl' : 'text-2xl'}`}>{gameState.level}</span>
                            </div>
                          </div>
                          <ChevronRight className="w-8 h-8 text-[#FF8800] animate-pulse" strokeWidth={3} />
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] uppercase font-black text-[#FF8800] tracking-[0.2em] mb-0.5">PROSSIMO</span>
                            <div className="w-auto min-w-[4rem] px-2 h-16 rounded-xl bg-gradient-to-br from-[#FF8800] to-orange-700 border-[2px] border-white/40 flex items-center justify-center shadow-lg">
                              <span className={`font-black font-orbitron text-white drop-shadow-md ${gameState.level + 1 > 999 ? 'text-2xl' : 'text-3xl'}`}>{gameState.level + 1}</span>
                            </div>
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="space-y-2">
                          <div className="bg-black/30 rounded-xl p-2.5 border border-white/10 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1.5">
                                <Sparkles size={12} className="text-[#FF8800]" />
                                <span className="text-[9px] font-black text-white/70 uppercase tracking-wider">Punti Livello</span>
                              </div>
                              <span className="text-lg font-orbitron font-black text-[#FF8800]">
                                +{gameState.score > 0 ? (gameState.timeLeft * 2) + 50 + (10 * 5) : '...'}
                              </span>
                            </div>
                          </div>

                          <div className="bg-black/30 rounded-xl p-2.5 border border-white/10 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1.5">
                                <Trophy size={12} className="text-amber-400" />
                                <span className="text-[9px] font-black text-white/70 uppercase tracking-wider">Punteggio Totale</span>
                              </div>
                              <span className="text-lg font-orbitron font-black text-white">{gameState.totalScore}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-emerald-500/10 rounded-xl p-2.5 border border-emerald-500/20 flex flex-col items-center">
                              <div className="flex items-center gap-1 mb-1">
                                <Timer size={10} className="text-emerald-400" />
                                <span className="text-[8px] font-black uppercase text-emerald-400 tracking-wider">Residuo</span>
                              </div>
                              <span className="text-base font-orbitron font-black text-emerald-300">{gameState.timeLeft}s</span>
                            </div>
                            <div className="bg-emerald-500/20 rounded-xl p-2.5 border border-emerald-500/30 flex flex-col items-center">
                              <div className="flex items-center gap-1 mb-1">
                                <Zap size={10} className="text-emerald-300" />
                                <span className="text-[8px] font-black uppercase text-emerald-300 tracking-wider">Nuovo Totale</span>
                              </div>
                              <span className="text-base font-orbitron font-black text-white">{gameState.timeLeft + 60}s</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2.5">
                        <button onPointerDown={(e) => { e.stopPropagation(); nextLevel(); }}
                          className="w-full relative overflow-hidden text-white py-5 px-6 rounded-2xl font-orbitron font-black uppercase tracking-widest text-base border-[4px] border-white active:translate-y-1 transition-all hover:scale-[1.02] duration-300 flex items-center justify-center gap-3 group bg-gradient-to-r from-[#FF8800] to-orange-600 shadow-[0_8px_0_rgba(0,0,0,0.3),inset_0_4px_8px_rgba(255,255,255,0.5),inset_0_-4px_8px_rgba(0,0,0,0.5)]">
                          {/* 3D Glass shine layer */}
                          <div className="absolute inset-0 pointer-events-none z-10" style={{
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 30%, transparent 30.1%, transparent 70%, rgba(255,255,255,0.08) 70.1%, rgba(255,255,255,0.2) 100%)'
                          }}></div>
                          <div className="absolute top-0 inset-x-0 h-[45%] pointer-events-none rounded-t-xl z-10" style={{
                            background: 'linear-gradient(to bottom, rgba(255,255,255,0.28), transparent)'
                          }}></div>
                          <Play className="w-5 h-5 fill-current relative z-20 group-hover:scale-110 transition-transform text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
                          <span className="relative z-20 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">PROSSIMO LIVELLO</span>
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                          <button onPointerDown={(e) => { e.stopPropagation(); startGame(gameState.level); }}
                            className="relative overflow-hidden bg-slate-800 text-white/95 py-3 rounded-2xl font-orbitron font-black uppercase tracking-widest text-[9px] border-[3px] border-white/20 active:translate-y-1 transition-all hover:scale-[1.02] duration-300 hover:bg-slate-750 flex items-center justify-center gap-1.5 shadow-[0_5px_0_rgba(0,0,0,0.25),inset_0_2px_4px_rgba(255,255,255,0.25),inset_0_-2px_4px_rgba(0,0,0,0.45)]">
                            <div className="absolute inset-0 pointer-events-none z-10" style={{
                              background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 30%, transparent 30.1%)'
                            }}></div>
                            <RefreshCw size={12} className="relative z-20" />
                            <span className="relative z-20">RIGIOCA</span>
                          </button>
                          
                          <button onPointerDown={(e) => {
                            e.stopPropagation();
                            resetDuelState(activeMatch?.id, currentUser?.id);
                            goToHome(e);
                            setGameState(prev => ({ ...prev, isBossLevel: false, bossLevelId: null }));
                          }}
                            className="relative overflow-hidden bg-slate-800 text-white/95 py-3 rounded-2xl font-orbitron font-black uppercase tracking-widest text-[9px] border-[3px] border-white/20 active:translate-y-1 transition-all hover:scale-[1.02] duration-300 hover:bg-slate-750 flex items-center justify-center gap-1.5 shadow-[0_5px_0_rgba(0,0,0,0.25),inset_0_2px_4px_rgba(255,255,255,0.25),inset_0_-2px_4px_rgba(0,0,0,0.45)]">
                            <div className="absolute inset-0 pointer-events-none z-10" style={{
                              background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 30%, transparent 30.1%)'
                            }}></div>
                            <Home size={12} className="relative z-20" />
                            <span className="relative z-20">HOME</span>
                          </button>
                        </div>

                        <div className="flex items-center justify-center gap-2 pt-1 opacity-55">
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
                          <span className="text-[8px] text-cyan-400 uppercase font-black tracking-[0.2em] drop-shadow-[0_0_2px_rgba(34,211,238,0.5)]">Salvataggio Automatico</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </main>
          </div >
        )}

        {
          activeModal === 'tutorial' && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 modal-overlay bg-black/80 backdrop-blur-sm" onPointerDown={() => { soundService.playUIClick(); setActiveModal(null); }}>
              <div className="bg-white border-[4px] border-[#FF8800] w-full max-w-md p-8 rounded-[2rem] shadow-[0_0_50px_rgba(255,136,0,0.3)] flex flex-col relative" onPointerDown={e => e.stopPropagation()}>
                <button
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    soundService.playUIClick();
                    setActiveModal(null);
                  }}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-black flex items-center justify-center transition-all active:scale-95"
                  title="Chiudi tutorial"
                >
                  <X size={20} strokeWidth={2.5} />
                </button>

                <div className="flex flex-col items-center text-center py-2">
                  <div className="mb-5 scale-125 drop-shadow-sm">{TUTORIAL_STEPS[tutorialStep].icon}</div>
                  <h2 className="text-2xl font-black font-orbitron text-[#FF8800] mb-3 uppercase tracking-widest">{TUTORIAL_STEPS[tutorialStep].title}</h2>
                  <p className="text-slate-600 font-bold text-sm leading-relaxed mb-8 border-t-2 border-slate-100 pt-4 w-full min-h-[80px] flex items-center justify-center">{TUTORIAL_STEPS[tutorialStep].description}</p>
                  <button onPointerDown={(e) => { e.stopPropagation(); nextTutorialStep(); }} className="w-full bg-[#FF8800] text-white border-[3px] border-white py-4 rounded-2xl font-orbitron font-black text-sm uppercase shadow-lg active:scale-95 transition-all outline-none ring-0 hover:bg-orange-600">
                    {tutorialStep === TUTORIAL_STEPS.length - 1 ? 'HO CAPITO' : 'AVANTI'}
                  </button>
                  <div className="flex items-center gap-2 mt-4">
                    {TUTORIAL_STEPS.map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-2 h-2 rounded-full transition-all ${idx === tutorialStep ? 'bg-[#FF8800] w-6' : 'bg-slate-300'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        }



        {/* MODE SELECTION MODAL */}
        {
          activeModal === 'duel_selection' && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 modal-overlay bg-black/80 backdrop-blur-sm" onPointerDown={() => { soundService.playUIClick(); setActiveModal(null); }}>
              <div className="bg-slate-900/90 border-[3px] border-red-500/50 w-full max-w-lg p-8 rounded-[2.5rem] shadow-[0_0_60px_rgba(239,68,68,0.4)] flex flex-col relative overflow-hidden backdrop-blur-xl" onPointerDown={e => e.stopPropagation()}>
                {/* Background Decor */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse"></div>

                <h2 className="text-xl sm:text-3xl font-black font-orbitron text-white mb-2 uppercase text-center relative z-10 flex items-center justify-center gap-2 sm:gap-3">
                  <Swords className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 animate-bounce" /> SELEZIONA SFIDA
                </h2>
                <p className="text-red-500 text-center text-[10px] sm:text-sm mb-4 sm:mb-8 font-orbitron font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] relative z-10 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse-slow">
                  COMBATTI • VINCI • GLORIA
                </p>

                 <div className="flex flex-col gap-3 relative z-10 w-full">
                   {/* Option 1: STANDARD */}
                   <button
                     className="w-full bg-red-600 text-white p-4 rounded-xl flex items-center gap-4 border-[3px] border-white hover:scale-[1.02] active:translate-y-1 transition-all group relative overflow-hidden"
                     style={{
                       boxShadow: '0 5px 0 rgba(0,0,0,0.15), inset 0 4px 8px rgba(255,255,255,0.45), inset 0 -4px 8px rgba(0,0,0,0.45)'
                     }}
                     onPointerDown={() => { soundService.playUIClick(); setDuelMode('standard'); setActiveModal('duel'); }}
                   >
                     {/* Glass layout elements */}
                     <div className="absolute inset-0 pointer-events-none z-10" style={{
                       background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 30%, transparent 30.1%, transparent 70%, rgba(255,255,255,0.08) 70.1%, rgba(255,255,255,0.2) 100%)'
                     }}></div>
                     <div className="absolute top-0 inset-x-0 h-[45%] pointer-events-none rounded-t-xl z-10" style={{
                       background: 'linear-gradient(to bottom, rgba(255,255,255,0.28), transparent)'
                     }}></div>
                     <div className="absolute top-[8%] left-[4%] w-[20%] h-[20%] rounded-full filter blur-[1px] pointer-events-none z-10" style={{
                       background: 'linear-gradient(135deg, rgba(255,255,255,0.48), rgba(255,255,255,0.02))'
                     }}></div>
                     <div className="absolute top-[8%] right-[4%] w-[20%] h-[20%] rounded-full filter blur-[1px] pointer-events-none z-10" style={{
                       background: 'linear-gradient(225deg, rgba(255,255,255,0.48), rgba(255,255,255,0.02))'
                     }}></div>
                     <div className="absolute bottom-0 inset-x-0 h-[25%] pointer-events-none z-10" style={{
                       background: 'linear-gradient(to top, rgba(0,0,0,0.25), transparent)'
                     }}></div>

                     <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20 group-hover:bg-white/20 transition-colors shadow-inner relative z-20">
                       <Swords size={22} className="text-yellow-300 drop-shadow-sm" />
                     </div>
                     <div className="text-left flex-1 relative z-20">
                       <h3 className="font-orbitron font-black text-white text-lg uppercase leading-none mb-1 tracking-wider">STANDARD</h3>
                       <p className="text-[10px] text-white/80 font-bold uppercase tracking-wide">Velocità Pura • Partita Secca</p>
                     </div>
                     <ChevronRight className="text-white/30 group-hover:text-white transition-colors relative z-20" />
                   </button>
 
                   {/* Option 2: BLITZ */}
                   <button
                     className="w-full bg-orange-500 text-white p-4 rounded-xl flex items-center gap-4 border-[3px] border-white hover:scale-[1.02] active:translate-y-1 transition-all group relative overflow-hidden"
                     style={{
                       boxShadow: '0 5px 0 rgba(0,0,0,0.15), inset 0 4px 8px rgba(255,255,255,0.45), inset 0 -4px 8px rgba(0,0,0,0.45)'
                     }}
                     onPointerDown={() => { soundService.playUIClick(); setDuelMode('blitz'); setActiveModal('duel'); }}
                   >
                     {/* Glass layout elements */}
                     <div className="absolute inset-0 pointer-events-none z-10" style={{
                       background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 30%, transparent 30.1%, transparent 70%, rgba(255,255,255,0.08) 70.1%, rgba(255,255,255,0.2) 100%)'
                     }}></div>
                     <div className="absolute top-0 inset-x-0 h-[45%] pointer-events-none rounded-t-xl z-10" style={{
                       background: 'linear-gradient(to bottom, rgba(255,255,255,0.28), transparent)'
                     }}></div>
                     <div className="absolute top-[8%] left-[4%] w-[20%] h-[20%] rounded-full filter blur-[1px] pointer-events-none z-10" style={{
                       background: 'linear-gradient(135deg, rgba(255,255,255,0.48), rgba(255,255,255,0.02))'
                     }}></div>
                     <div className="absolute top-[8%] right-[4%] w-[20%] h-[20%] rounded-full filter blur-[1px] pointer-events-none z-10" style={{
                       background: 'linear-gradient(225deg, rgba(255,255,255,0.48), rgba(255,255,255,0.02))'
                     }}></div>
                     <div className="absolute bottom-0 inset-x-0 h-[25%] pointer-events-none z-10" style={{
                       background: 'linear-gradient(to top, rgba(0,0,0,0.25), transparent)'
                     }}></div>

                     <div className="absolute top-0 right-12 bg-red-600 text-white text-[8px] font-black px-2 py-0.5 rounded-b-lg shadow-sm z-20">NEW</div>
 
                     <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20 group-hover:bg-white/20 transition-colors shadow-inner relative z-20">
                       <Zap size={22} className="text-white drop-shadow-sm" />
                     </div>
                     <div className="text-left flex-1 relative z-20">
                       <h3 className="font-orbitron font-black text-white text-lg uppercase leading-none mb-1 tracking-wider">BLITZ DOMINION</h3>
                       <p className="text-[10px] text-white/80 font-bold uppercase tracking-wide">Alta Strategia • Conquista</p>
                     </div>
                     <ChevronRight className="text-white/30 group-hover:text-white transition-colors relative z-20" />
                   </button>
 
                   {/* Option 3: TIME ATTACK */}
                   <button
                     className="w-full bg-purple-600 text-white p-4 rounded-xl flex items-center gap-4 border-[3px] border-white hover:scale-[1.02] active:translate-y-1 transition-all group relative overflow-hidden"
                     style={{
                       boxShadow: '0 5px 0 rgba(0,0,0,0.15), inset 0 4px 8px rgba(255,255,255,0.45), inset 0 -4px 8px rgba(0,0,0,0.45)'
                     }}
                     onPointerDown={() => { soundService.playUIClick(); setDuelMode('time_attack'); setActiveModal('duel'); }}
                   >
                     {/* Glass layout elements */}
                     <div className="absolute inset-0 pointer-events-none z-10" style={{
                       background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 30%, transparent 30.1%, transparent 70%, rgba(255,255,255,0.08) 70.1%, rgba(255,255,255,0.2) 100%)'
                     }}></div>
                     <div className="absolute top-0 inset-x-0 h-[45%] pointer-events-none rounded-t-xl z-10" style={{
                       background: 'linear-gradient(to bottom, rgba(255,255,255,0.28), transparent)'
                     }}></div>
                     <div className="absolute top-[8%] left-[4%] w-[20%] h-[20%] rounded-full filter blur-[1px] pointer-events-none z-10" style={{
                       background: 'linear-gradient(135deg, rgba(255,255,255,0.48), rgba(255,255,255,0.02))'
                     }}></div>
                     <div className="absolute top-[8%] right-[4%] w-[20%] h-[20%] rounded-full filter blur-[1px] pointer-events-none z-10" style={{
                       background: 'linear-gradient(225deg, rgba(255,255,255,0.48), rgba(255,255,255,0.02))'
                     }}></div>
                     <div className="absolute bottom-0 inset-x-0 h-[25%] pointer-events-none z-10" style={{
                       background: 'linear-gradient(to top, rgba(0,0,0,0.25), transparent)'
                     }}></div>

                     <div className="absolute top-0 right-12 bg-yellow-400 text-black text-[8px] font-black px-2 py-0.5 rounded-b-lg shadow-sm z-20 animate-pulse">HOT</div>
 
                     <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20 group-hover:bg-white/20 transition-colors shadow-inner relative z-20">
                       <Clock size={22} className="text-white drop-shadow-sm" />
                     </div>
                     <div className="text-left flex-1 relative z-20">
                       <h3 className="font-orbitron font-black text-white text-lg uppercase leading-none mb-1 tracking-wider">TIME ATTACK</h3>
                       <p className="text-[10px] text-white/80 font-bold uppercase tracking-wide">60 Secondi • Target Infiniti</p>
                     </div>
                     <ChevronRight className="text-white/30 group-hover:text-white transition-colors relative z-20" />
                   </button>
                 </div>


              </div>
            </div>
          )
        }

        {/* BOSS SELECTION MODAL */}
        {
          activeModal === 'boss_selection' && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 modal-overlay bg-black/80 backdrop-blur-sm" onPointerDown={() => { soundService.playUIClick(); setActiveModal(null); }}>
              <div className="bg-slate-900/90 border-[3px] border-emerald-500/50 w-full max-w-2xl p-6 rounded-[2rem] shadow-[0_0_60px_rgba(16,185,129,0.4)] flex flex-col relative overflow-hidden h-[70vh] backdrop-blur-xl" onPointerDown={e => e.stopPropagation()}>
                {/* Background Decor */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
                <div className="absolute inset-0 bg-[url('/sfondo_green.png')] bg-cover bg-center opacity-30 pointer-events-none mix-blend-overlay"></div>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-pulse"></div>

                <div className="relative z-10">
                  <h2 className="text-xl sm:text-3xl font-black font-orbitron text-white mb-2 uppercase text-center flex items-center justify-center gap-2 sm:gap-3">
                    <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-300 animate-bounce" /> SFIDE BOSS
                  </h2>
                  <p className="text-emerald-400 text-center text-[10px] sm:text-sm mb-4 sm:mb-6 font-orbitron font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] drop-shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse-slow">
                    SFIDALI • VINCI • DOMINA
                  </p>

                  {/* Boss Grid - Scrollbar hidden but scroll enabled */}
                  <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[55vh] pr-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {BOSS_LEVELS.map((boss) => {
                      const isComingSoon = boss.isComingSoon;
                      const isDefeated = (userProfile?.badges || []).includes(`boss_${boss.id}_defeated`);
                      const isUnlocked = ((userProfile?.max_level || 1) >= boss.requiredLevel);
                      const canPlay = !isComingSoon && isUnlocked && !isDefeated;

                      return (
                        <div
                          key={boss.id}
                          className={`relative p-5 rounded-2xl border-2 transition-all overflow-hidden group
                            ${isComingSoon
                              ? 'bg-slate-950/40 border-slate-800 opacity-70 cursor-default'
                              : isDefeated
                                ? 'bg-slate-900 border-green-500/50 opacity-90 cursor-default'
                                : canPlay
                                  ? boss.id === 2
                                    ? 'bg-gradient-to-r from-amber-900/60 to-orange-950/60 border-amber-600/50 hover:border-amber-400 hover:scale-[1.02] cursor-pointer shadow-lg hover:shadow-amber-600/30'
                                    : 'bg-gradient-to-r from-emerald-900/60 to-teal-900/60 border-emerald-500/50 hover:border-emerald-400 hover:scale-[1.02] cursor-pointer shadow-lg hover:shadow-emerald-500/30'
                                  : 'bg-slate-900/50 border-slate-700 opacity-50 grayscale cursor-not-allowed'
                            }
                          `}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            if (isComingSoon) {
                              soundService.playError();
                              showToast("Quest'area Neurale è ancora in fase di calcolo... Torna presto!");
                              return;
                            }
                            if (isDefeated) {
                              // Strictly blocked
                              soundService.playError();
                              showToast('Boss già sconfitto: bonus una-tantum riscattato con successo!');
                              return;
                            }
                            if (canPlay) {
                              soundService.playUIClick();
                              if (!currentUser) {
                                showToast('Accedi per sfidare il boss!');
                                setShowAuthModal(true);
                              } else {
                                startBossGame(boss.id);
                              }
                            } else {
                              soundService.playUIClick();
                              showToast(`Raggiungi il livello ${boss.requiredLevel} per sbloccare questo boss!`);
                            }
                          }}
                        >
                          {/* Background Pattern */}
                          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>

                          {/* Victory Overlay for Defeated Boss */}
                          {isDefeated && (
                            <div className="absolute inset-0 bg-green-900/20 z-0 pointer-events-none flex items-center justify-center">
                              <div className="absolute right-4 bottom-4 opacity-10 rotate-[-20deg]">
                                <Lock size={80} className="text-green-500" />
                              </div>
                            </div>
                          )}

                          {/* Coming Soon Overlay */}
                          {isComingSoon && (
                            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-0 pointer-events-none flex items-center justify-center overflow-hidden">
                              <div className="absolute -right-8 -bottom-8 opacity-5 rotate-[15deg] scale-150">
                                <Sparkles size={120} className="text-emerald-500" />
                              </div>
                            </div>
                          )}

                          {/* Victory Badge - TROPHY */}
                          {isDefeated && (
                            <div className="absolute top-3 right-3 z-30">
                              <div className="flex flex-col items-end gap-1">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-500 to-amber-700 border-4 border-yellow-300 shadow-[0_0_20px_rgba(234,179,8,0.4)] flex items-center justify-center">
                                  <Award className="w-8 h-8 text-white animate-pulse" strokeWidth={2.5} />
                                </div>
                                <span className="bg-yellow-600 text-white text-[7px] font-black px-2 py-0.5 rounded-full shadow-sm tracking-tighter uppercase">COMPLETATO</span>
                              </div>
                            </div>
                          )}

                          {/* Lock Badge for Unlocked Level 1 */}
                          {!isComingSoon && !isUnlocked && !isDefeated && (
                            <div className="absolute top-3 right-3 z-20">
                              <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
                                <Lock className="w-6 h-6 text-slate-500" />
                              </div>
                            </div>
                          )}

                          {/* Coming Soon Badge */}
                          {isComingSoon && (
                            <div className="absolute top-3 right-3 z-30">
                              <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg backdrop-blur-md animate-pulse">
                                IN ARRIVO
                              </div>
                            </div>
                          )}

                          <div className="relative z-10 flex items-start gap-4">
                            {/* Boss Icon */}
                            <div className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 border-2 shadow-lg
                              ${isDefeated
                                ? 'bg-green-900/40 border-green-500/50'
                                : canPlay
                                  ? 'bg-emerald-500/20 border-emerald-500/50'
                                  : 'bg-slate-800 border-slate-700'
                              }
                            `}>
                              <Crown className={`w-6 h-6 sm:w-8 sm:h-8 ${isDefeated ? 'text-green-400' : canPlay ? 'text-yellow-300' : 'text-slate-600'}`} />
                            </div>

                            {/* Boss Info */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {!isComingSoon && (
                                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded
                                    ${isDefeated
                                      ? (boss.id === 2 ? 'bg-amber-800/20 text-amber-600 border border-amber-700/30' : 'bg-green-500/20 text-green-400 border border-green-500/30')
                                      : canPlay
                                        ? (boss.id === 2 ? 'bg-amber-600/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400')
                                        : 'bg-slate-700/50 text-slate-500'
                                    }
                                  `}>
                                    LIV. {boss.requiredLevel}
                                  </span>
                                )}
                                {isDefeated && (
                                  <span className="text-[8px] font-black uppercase text-white bg-yellow-500 px-2 py-0.5 rounded-full shadow-sm">
                                    CONQUISTATO
                                  </span>
                                )}
                                {isComingSoon && (
                                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-tighter">
                                    PROSSIMAMENTE
                                  </span>
                                )}
                              </div>
                              <h3 className={`font-orbitron font-black text-sm sm:text-lg uppercase leading-none mb-2
                                ${isDefeated ? (boss.id === 2 ? 'text-amber-500' : 'text-green-300') : isComingSoon ? 'text-slate-500' : 'text-white'}
                              `}>
                                {boss.title}
                              </h3>
                              <p className={`text-[10px] sm:text-xs mb-3 ${isDefeated ? 'text-slate-500 italic' : 'text-slate-400'}`}>
                                {isComingSoon ? "Nuova sfida in fase di configurazione neurale..." : (isDefeated ? 'Operazione terminata: Intelligenza superiore confermata.' : boss.description)}
                              </p>

                              {/* Stats */}
                              {!isComingSoon && (
                                <div className="flex gap-3 text-[10px]">
                                  <div className="flex items-center gap-1">
                                    <Target className={`w-3 h-3 ${isDefeated ? (boss.id === 2 ? 'text-amber-700' : 'text-green-600') : (boss.id === 2 ? 'text-amber-400' : 'text-emerald-400')}`} />
                                    <span className={`${isDefeated ? 'text-slate-600' : 'text-slate-300'} font-bold`}>{boss.targets} Target</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Timer className={`w-3 h-3 ${isDefeated ? 'text-green-600' : 'text-cyan-400'}`} />
                                    <span className={`${isDefeated ? 'text-slate-600' : 'text-slate-300'} font-bold`}>{boss.time}s</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-yellow-500" />
                                    <span className="text-yellow-400 font-bold">{isDefeated ? 'PREMIO RISCOSSO' : boss.reward}</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Action Indicator */}
                            {canPlay && !isComingSoon && (
                              <ChevronRight className={`w-6 h-6 group-hover:translate-x-1 transition-transform ${boss.id === 2 ? 'text-amber-400' : 'text-emerald-400'}`} />
                            )}

                            {isDefeated && (
                              <div className="flex items-center justify-center">
                                <Shield className="w-5 h-5 text-green-500/30 rotate-12" />
                              </div>
                            )}

                            {isComingSoon && (
                              <div className="flex items-center justify-center opacity-20">
                                <fastForward className="w-5 h-5 text-slate-500" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setActiveModal(null)}
                    className="mt-6 w-full text-slate-400 text-sm hover:text-white uppercase font-bold tracking-widest py-3 rounded-xl border border-slate-700 hover:border-slate-500 transition-all"
                  >
                    Chiudi
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {
          activeModal === 'registration_success' && (
            <RegistrationSuccess onEnter={() => setActiveModal(null)} />
          )
        }

        {
          activeModal === 'resume_confirm' && (
            <div className="fixed inset-0 z-[5000] flex flex-col items-center justify-center p-4 md:p-6 modal-overlay bg-black/85 backdrop-blur-sm overflow-y-auto" onPointerDown={() => setActiveModal(null)}>
              
              {/* Header Section (OUTSIDE of the framed box) */}
              <div className="relative z-10 text-center mb-4 flex flex-col items-center pointer-events-none" onPointerDown={e => e.stopPropagation()}>
                <div className="relative inline-flex items-center justify-center w-14 h-14 mb-2 group active:scale-95 transition-all">
                  <img src="/CasellaGlass.png" alt="Logo Base" className="absolute inset-0 w-full h-full object-contain drop-shadow-lg" />
                  <Brain className="relative w-7 h-7 text-white drop-shadow-md z-10 animate-pulse" strokeWidth={2.5} />
                </div>
                <h2 className="text-2xl font-black font-orbitron text-white uppercase tracking-widest mb-1 drop-shadow-md">
                  MISSIONE <span className="text-[#FF8800]">CARRIERA</span>
                </h2>
                <div className="h-0.5 w-20 bg-[#FF8800]/50 mx-auto rounded-full"></div>
              </div>

              {/* Framed Card container starts from here (Level down to buttons) */}
              <div className="bg-slate-900/90 border-[3px] border-[#FF8800]/50 w-full max-w-md p-6 md:p-8 rounded-[2.5rem] shadow-[0_0_60px_rgba(255,136,0,0.3)] flex flex-col relative overflow-hidden backdrop-blur-xl" onPointerDown={e => e.stopPropagation()}>

                {/* Premium Background Decor */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FF8800] to-transparent animate-pulse"></div>

                {/* Main Info Card */}
                <div className="bg-black/40 border border-[#FF8800]/20 rounded-3xl p-5 mb-6 relative z-10 backdrop-blur-md">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-white/40 font-black uppercase tracking-[0.3em] mb-1.5">LIVELLO ATTUALE</span>
                    <div className="text-7xl font-black font-orbitron text-white drop-shadow-[0_0_30px_rgba(255,136,0,0.4)] mb-4">
                      {savedGame?.level || 1}
                    </div>

                    {/* Progress Stats */}
                    <div className="grid grid-cols-2 gap-3 w-full">
                      <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col items-center">
                        <div className="flex items-center gap-2 mb-1 text-amber-400">
                          <Trophy size={12} />
                          <span className="text-[9px] font-black uppercase tracking-wider">Punti Globali</span>
                        </div>
                        <span className="text-lg font-black font-orbitron text-white">{savedGame?.totalScore || 0}</span>
                      </div>

                      <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col items-center">
                        <div className="flex items-center gap-2 mb-1 text-blue-400">
                          <Timer size={12} />
                          <span className="text-[9px] font-black uppercase tracking-wider">Tempo</span>
                        </div>
                        <span className="text-lg font-black font-orbitron text-white">
                          {(savedGame?.timeLeft || 0) + parseInt(localStorage.getItem('career_time_bonus') || '0')}s
                        </span>
                      </div>
                    </div>

                    {/* Bonus Indicator */}
                    {parseInt(localStorage.getItem('career_time_bonus') || '0') > 0 && (
                      <div className="mt-3 w-full bg-orange-500/10 border border-orange-500/20 rounded-xl py-1.5 px-3 flex items-center justify-center gap-2 animate-pulse">
                        <Sparkles size={12} className="text-[#FF8800]" />
                        <span className="text-[9px] font-black text-[#FF8800] uppercase tracking-wider">
                          Bonus Boss Attivo (+{localStorage.getItem('career_time_bonus')}s)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Section */}
                <div className="space-y-4 relative z-10">
                  <button
                    disabled={profileLoading}
                    onPointerDown={(e) => { e.stopPropagation(); soundService.playUIClick(); savedGame ? restoreGame() : startGame(); }}
                    className="w-full group relative overflow-hidden flex items-center justify-center gap-4 bg-[#FF8800] text-white py-5 rounded-2xl font-orbitron font-black text-lg border-[4px] border-white hover:scale-105 transition-all duration-300 active:translate-y-1 disabled:opacity-50 disabled:pointer-events-none"
                    style={{
                      boxShadow: '0 8px 0 rgba(0,0,0,0.2), inset 0 4px 8px rgba(255,255,255,0.5), inset 0 -4px 8px rgba(0,0,0,0.5)'
                    }}
                  >
                    {/* Glass layout elements */}
                    <div className="absolute inset-0 pointer-events-none z-10" style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 30%, transparent 30.1%, transparent 70%, rgba(255,255,255,0.08) 70.1%, rgba(255,255,255,0.2) 100%)'
                    }}></div>
                    <div className="absolute top-0 inset-x-0 h-[45%] pointer-events-none rounded-t-2xl z-10" style={{
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0.28), transparent)'
                    }}></div>
                    <div className="absolute top-[8%] left-[4%] w-[20%] h-[20%] rounded-full filter blur-[1px] pointer-events-none z-10" style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.48), rgba(255,255,255,0.02))'
                    }}></div>
                    <div className="absolute top-[8%] right-[4%] w-[20%] h-[20%] rounded-full filter blur-[1px] pointer-events-none z-10" style={{
                      background: 'linear-gradient(225deg, rgba(255,255,255,0.48), rgba(255,255,255,0.02))'
                    }}></div>
                    <div className="absolute bottom-0 inset-x-0 h-[25%] pointer-events-none z-10" style={{
                      background: 'linear-gradient(to top, rgba(0,0,0,0.25), transparent)'
                    }}></div>

                    <Play className="w-6 h-6 fill-current relative z-20" />
                    <span className="tracking-widest relative z-20">
                      {profileLoading ? 'CARICAMENTO...' : (savedGame ? 'RIPRENDI PARTITA' : 'INIZIA PARTITA')}
                    </span>
                  </button>

                  <button
                    onPointerDown={(e) => { e.stopPropagation(); soundService.playUIClick(); setActiveModal(null); }}
                    className="w-full relative overflow-hidden bg-slate-800 text-slate-200 py-4 rounded-xl font-orbitron font-black uppercase tracking-widest text-[10px] border-[3px] border-white/60 active:translate-y-0.5 transition-all hover:scale-105 flex items-center justify-center gap-2 group"
                    style={{
                      boxShadow: '0 4px 0 rgba(0,0,0,0.15), inset 0 3px 6px rgba(255,255,255,0.35), inset 0 -3px 6px rgba(0,0,0,0.45)'
                    }}
                  >
                    {/* Glass layout elements */}
                    <div className="absolute inset-0 pointer-events-none z-10" style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.1) 30%, transparent 30.1%, transparent 70%, rgba(255,255,255,0.05) 70.1%, rgba(255,255,255,0.15) 100%)'
                    }}></div>
                    <div className="absolute top-0 inset-x-0 h-[45%] pointer-events-none rounded-t-xl z-10" style={{
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0.22), transparent)'
                    }}></div>
                    <div className="absolute top-[8%] left-[4%] w-[20%] h-[20%] rounded-full filter blur-[1px] pointer-events-none z-10" style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.01))'
                    }}></div>
                    <div className="absolute top-[8%] right-[4%] w-[20%] h-[20%] rounded-full filter blur-[1px] pointer-events-none z-10" style={{
                      background: 'linear-gradient(225deg, rgba(255,255,255,0.4), rgba(255,255,255,0.01))'
                    }}></div>
                    <div className="absolute bottom-0 inset-x-0 h-[25%] pointer-events-none z-10" style={{
                      background: 'linear-gradient(to top, rgba(0,0,0,0.2), transparent)'
                    }}></div>

                    <Home size={14} className="relative z-20 text-slate-300" />
                    <span className="relative z-20">INDIETRO</span>
                  </button>
                </div>

              </div>
            </div>
          )
        }

        {/* FULL RESET CONFIRMATION MODAL */}
        {
          activeModal === 'full_reset_confirm' && (
            <div className="fixed inset-0 z-[5001] flex items-center justify-center p-6 modal-overlay bg-black/95 backdrop-blur-lg" onPointerDown={() => setActiveModal('resume_confirm')}>
              <div className="bg-gradient-to-br from-red-950 via-red-900 to-red-950 border-[3px] border-red-500 w-full max-w-md p-8 rounded-[2rem] shadow-[0_0_80px_rgba(239,68,68,0.6)] flex flex-col relative overflow-hidden animate-pulse" onPointerDown={e => e.stopPropagation()}>
                {/* Animated Warning Background */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse"></div>

                {/* Warning Icon */}
                <div className="relative z-10 mb-6">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-red-600 to-red-800 rounded-full flex items-center justify-center shadow-lg shadow-red-500/50 animate-pulse border-4 border-red-400">
                    <AlertTriangle className="w-14 h-14 text-white" strokeWidth={3} />
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-3xl font-black font-orbitron text-white mb-3 uppercase tracking-wider relative z-10 text-center">
                  ⚠️ ATTENZIONE ⚠️
                </h2>

                {/* Warning Message */}
                <div className="bg-black/40 border-2 border-red-500/50 rounded-xl p-5 mb-6 relative z-10">
                  <p className="text-white font-bold text-center mb-4 leading-relaxed">
                    Stai per <span className="text-red-400 font-black">CANCELLARE TUTTO</span>:
                  </p>
                  <div className="space-y-2 text-sm text-slate-300">
                    <div className="flex items-center gap-2">
                      <X className="w-4 h-4 text-red-400" />
                      <span>Tutti i livelli completati</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <X className="w-4 h-4 text-red-400" />
                      <span>Tutti i badge e medaglie</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <X className="w-4 h-4 text-red-400" />
                      <span>Boss sconfitti e bonus</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <X className="w-4 h-4 text-red-400" />
                      <span>Statistiche duelli</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <X className="w-4 h-4 text-red-400" />
                      <span>Punteggi e QI stimato</span>
                    </div>
                  </div>
                  <p className="text-red-400 font-black text-center mt-4 text-xs uppercase tracking-wider">
                    Questa azione è IRREVERSIBILE!
                  </p>
                </div>

                {/* Confirmation Buttons */}
                <div className="space-y-3 relative z-10">
                  <button
                    onPointerDown={(e) => { e.stopPropagation(); soundService.playUIClick(); localStorage.setItem('career_time_bonus', '0'); handleFullReset(); }}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 px-6 rounded-xl font-orbitron font-black uppercase tracking-widest text-sm shadow-lg shadow-red-500/50 active:scale-95 transition-all border-2 border-white/30 hover:shadow-red-500/70 flex items-center justify-center gap-3 group"
                  >
                    <AlertTriangle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    SÌ, CANCELLA TUTTO
                  </button>

                  <button
                    onPointerDown={(e) => { e.stopPropagation(); soundService.playUIClick(); setActiveModal('resume_confirm'); }}
                    className="w-full bg-gradient-to-r from-slate-700 to-slate-800 text-white py-3 px-6 rounded-xl font-orbitron font-bold uppercase tracking-widest text-xs border-2 border-white/20 active:scale-95 transition-all hover:from-slate-600 hover:to-slate-700 flex items-center justify-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    NO, TORNA INDIETRO
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {
          activeModal === 'logout_confirm' && (
            <div className="fixed inset-0 z-[5000] flex items-center justify-center p-6 modal-overlay bg-black/90 backdrop-blur-md" onPointerDown={() => setActiveModal(null)}>
              <div className="bg-slate-900 border-[3px] border-red-500/50 w-full max-w-sm p-8 rounded-[2.5rem] shadow-[0_0_60px_rgba(239,68,68,0.4)] flex flex-col text-center relative overflow-hidden" onPointerDown={e => e.stopPropagation()}>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse"></div>

                <User className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-black font-orbitron text-white mb-2 uppercase tracking-wider relative z-10">LOGOUT</h2>
                <p className="text-slate-400 font-bold text-sm mb-8 relative z-10">
                  Vuoi davvero disconnetterti?
                </p>

                <div className="space-y-3 relative z-10">
                  <button
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      import('./services/supabaseClient').then(({ authService }) => authService.signOut());
                      setCurrentUser(null);
                      setUserProfile(null);
                      resetDuelState();
                      setGameState(prev => ({ ...prev, status: 'idle' }));
                      showToast(`Logout effettuato.`);
                      setActiveModal(null);
                    }}
                    className="w-full relative overflow-hidden bg-red-600 text-white py-4 rounded-xl font-orbitron font-black uppercase tracking-widest text-xs border-[3px] border-white hover:scale-105 active:translate-y-1 transition-all flex items-center justify-center gap-2 group"
                    style={{
                      boxShadow: '0 4px 0 rgba(0,0,0,0.15), inset 0 3px 6px rgba(255,255,255,0.35), inset 0 -3px 6px rgba(0,0,0,0.45)'
                    }}
                  >
                    {/* Glass layout elements */}
                    <div className="absolute inset-0 pointer-events-none z-10" style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.1) 30%, transparent 30.1%, transparent 70%, rgba(255,255,255,0.05) 70.1%, rgba(255,255,255,0.15) 100%)'
                    }}></div>
                    <div className="absolute top-0 inset-x-0 h-[45%] pointer-events-none rounded-t-xl z-10" style={{
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0.22), transparent)'
                    }}></div>
                    <div className="absolute top-[8%] left-[4%] w-[20%] h-[20%] rounded-full filter blur-[1px] pointer-events-none z-10" style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.01))'
                    }}></div>
                    <div className="absolute top-[8%] right-[4%] w-[20%] h-[20%] rounded-full filter blur-[1px] pointer-events-none z-10" style={{
                      background: 'linear-gradient(225deg, rgba(255,255,255,0.4), rgba(255,255,255,0.01))'
                    }}></div>
                    <div className="absolute bottom-0 inset-x-0 h-[25%] pointer-events-none z-10" style={{
                      background: 'linear-gradient(to top, rgba(0,0,0,0.2), transparent)'
                    }}></div>

                    <span className="relative z-20">CONFERMA USCITA</span>
                  </button>
                  <button
                    onPointerDown={(e) => { e.stopPropagation(); setActiveModal(null); }}
                    className="w-full relative overflow-hidden bg-slate-800 text-slate-200 py-3 rounded-xl font-orbitron font-black uppercase tracking-widest text-[10px] border-[3px] border-white/60 hover:scale-105 active:translate-y-1 transition-all flex items-center justify-center gap-2 group"
                    style={{
                      boxShadow: '0 4px 0 rgba(0,0,0,0.15), inset 0 3px 6px rgba(255,255,255,0.35), inset 0 -3px 6px rgba(0,0,0,0.45)'
                    }}
                  >
                    {/* Glass layout elements */}
                    <div className="absolute inset-0 pointer-events-none z-10" style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.1) 30%, transparent 30.1%, transparent 70%, rgba(255,255,255,0.05) 70.1%, rgba(255,255,255,0.15) 100%)'
                    }}></div>
                    <div className="absolute top-0 inset-x-0 h-[45%] pointer-events-none rounded-t-xl z-10" style={{
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0.22), transparent)'
                    }}></div>
                    <div className="absolute top-[8%] left-[4%] w-[20%] h-[20%] rounded-full filter blur-[1px] pointer-events-none z-10" style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.01))'
                    }}></div>
                    <div className="absolute top-[8%] right-[4%] w-[20%] h-[20%] rounded-full filter blur-[1px] pointer-events-none z-10" style={{
                      background: 'linear-gradient(225deg, rgba(255,255,255,0.4), rgba(255,255,255,0.01))'
                    }}></div>
                    <div className="absolute bottom-0 inset-x-0 h-[25%] pointer-events-none z-10" style={{
                      background: 'linear-gradient(to top, rgba(0,0,0,0.2), transparent)'
                    }}></div>

                    <span className="relative z-20">ANNULLA</span>
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {
          activeModal === 'duel' && currentUser && (
            <NeuralDuelLobby
              currentUser={currentUser}
              userProfile={userProfile}
              mode={duelMode}
              showToast={showToast}
              onlinePlayers={onlinePlayers}
              onClose={() => setActiveModal('duel_selection')}
              onMatchStart={(seed, matchId, opponentId, isP1) => {
                setActiveModal(null);

                // Check if I am P1 by fetching match from matches state or just check if matchId was hosted by me
                // Simplified: The lobby component knows, or we just rely on latest match data sync.
                // Better: neuralDuelLobby already knows, but let's just use current user logic.
                setActiveMatch({ id: matchId, opponentId, isDuel: true, isP1: isP1 }); // Placeholder, fix in effect

                // Initialize Duel Game
                soundService.playUIClick();
                setGameState(prev => ({
                  ...prev,
                  score: 0,
                  totalScore: prev.totalScore, // Preserve points during duel
                  streak: 0,
                  level: userProfile?.max_level || 1,
                  timeLeft: duelMode === 'time_attack' ? 60 : INITIAL_TIME,
                  targetResult: 0,
                  targetsFound: 0,
                  status: 'playing',
                  estimatedIQ: prev.estimatedIQ,
                  lastLevelPerfect: true,
                  basePoints: BASE_POINTS_START,
                  levelTargets: [],
                }));
                // Pass the MATCH SEED to create the exact same board for both players
                generateGrid(1, seed);
                // Reset Opponent Score
                setOpponentScore(0);
                // Clean ready status just in case
                matchService.resetRoundStatus(matchId);
                // CRITICAL: Reset Processed Win/Loss Ref to ensure new match logic runs cleanly
                processedWinRef.current = null;
              }}
            />
          )
        }

        {
          activeModal === 'leaderboard' && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 modal-overlay bg-black/80" onPointerDown={() => { soundService.playUIClick(); setActiveModal(null); }}>
              <div className="glass-panel w-full max-w-md p-6 rounded-[2rem] modal-content flex flex-col h-[70vh]" onPointerDown={e => e.stopPropagation()}>
                <h2 className="text-2xl font-black font-orbitron text-white mb-4 uppercase flex items-center gap-3"><Award className="text-amber-400" /> CLASSIFICHE</h2>

                {/* Leaderboard Tabs */}
                <div className="flex bg-white/10 rounded-xl p-1 mb-4">
                  <button
                    onClick={() => setTutorialStep(0)} // Using tutorialStep variable as a hack for tab index or just create a new local state wrapper... 
                    // Actually, let's just assume we view SCORE by default, or better:
                    // Since I can't easily add state here without full re-write, I'll use a local var logic or verify if I can edit state.
                    // I will check if I can modify App state higher up. I see 'tutorialStep'.
                    // I'll create a simple toggle inside the render using a new state variable is simpler if I could...
                    // Let's use `scoreAnimKey` as a toggle for tabs? No that's dirty.
                    // I'll stick to a simple internal toggle using `tutorialStep` (since it's unused in this modal) 
                    // 0 = Score, 1 = Level.
                    onPointerDown={() => setTutorialStep(0)}
                    className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase transition-all ${tutorialStep === 0 ? 'bg-[#FF8800] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                  >
                    Punteggio
                  </button>
                  <button
                    onPointerDown={() => setTutorialStep(1)}
                    className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase transition-all ${tutorialStep === 1 ? 'bg-cyan-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                  >
                    Livello Max
                  </button>
                </div>

                {!leaderboardData ? (
                  <div className="text-center py-10 text-slate-400 font-orbitron text-xs animate-pulse">Caricamento in corso...</div>
                ) : (
                  <div className="space-y-3 overflow-y-auto flex-1 pr-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {/* DATA LIST */}
                    {((tutorialStep === 0 ? leaderboardData.byScore : leaderboardData.byLevel) || []).map((p: any, idx: number) => {
                      // Rank Calculation Inline for Leaderboard (avoiding circular dependency or extra imports if possible, but we imported `getRank` so use it)
                      const playerRank = getRank(p.max_level || 1);
                      const RankIcon = playerRank.icon;

                      return (
                        <div key={idx} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 relative overflow-hidden group">
                          {/* Top 3 Highlight */}
                          {idx < 3 && <div className={`absolute left-0 top-0 bottom-0 w-1 ${idx === 0 ? 'bg-[#FFD700]' : idx === 1 ? 'bg-gray-300' : 'bg-[#CD7F32]'}`}></div>}

                          <div className="flex items-center gap-3 pl-2">
                            {/* Avatar or Placeholder */}
                            <div className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-slate-800 border-2 border-white/10 overflow-hidden flex items-center justify-center">
                              {p.avatar_url ? (
                                <img src={p.avatar_url} className="w-full h-full object-cover" alt={p.username} />
                              ) : (
                                <span className="text-xs font-bold text-slate-500">{p.username?.charAt(0) || '?'}</span>
                              )}
                            </div>

                            <div className="flex flex-col">
                              <span className={`text-sm font-bold leading-tight ${idx < 3 ? 'text-white' : 'text-gray-300'}`}>
                                {idx + 1}. {p.username || 'Giocatore'}
                              </span>

                              <div className="flex items-center gap-1 mt-0.5">
                                {idx === 0 && <Sparkles size={10} className="text-yellow-400" />}
                                <RankIcon size={10} className={playerRank.color} />
                                <span className={`text-[8px] uppercase font-black tracking-widest ${playerRank.color}`}>{playerRank.title}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            {tutorialStep === 0 ? (
                              <>
                                <span className="font-orbitron font-black text-[#FF8800] text-sm">{p.total_score} pts</span>
                                <span className="font-orbitron font-bold text-gray-500 text-[9px]">Liv {p.max_level}</span>
                              </>
                            ) : (
                              <>
                                <span className="font-orbitron font-black text-cyan-400 text-sm">Liv {p.max_level}</span>
                                <span className="font-orbitron font-bold text-gray-500 text-[9px]">{p.total_score} pts</span>
                              </>
                            )}

                          </div>
                        </div>
                      )
                    })}

                    {((tutorialStep === 0 ? leaderboardData.byScore : leaderboardData.byLevel) || []).length === 0 && (
                      <div className="text-center py-8 text-gray-500 text-xs">Nessun dato disponibile</div>
                    )}
                  </div>
                )}

                <button onPointerDown={() => { soundService.playUIClick(); setActiveModal(null); }} className="mt-4 w-full bg-slate-800 text-white py-4 rounded-xl font-orbitron font-black text-xs uppercase active:scale-95 transition-all">CHIUDI</button>
              </div>
            </div>
          )
        }

        {activeModal === 'admin' && <AdminPanel onClose={() => setActiveModal(null)} />}

        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onSuccess={handleLoginSuccess} showToast={showToast} />}

        {
          activeModal === 'profile' && (
            <UserProfileModal
              currentUser={currentUser}
              userProfile={userProfile}
              onClose={() => setActiveModal(null)}
              onUpdate={(newP) => setUserProfile(newP)}
            />
          )
        }



        {/* DUEL RECAP MODAL */}
        {/* DUEL RECAP MODAL */}
        {
          showDuelRecap && latestMatchData && !showVideo && !showLostVideo && !showSurrenderVideo && (
            <DuelRecapModal
              matchData={latestMatchData}
              currentUser={currentUser}
              isWinnerProp={
                latestMatchData.winner_id
                  ? latestMatchData.winner_id === currentUser?.id
                  : (latestMatchData.mode === 'blitz' || latestMatchData.mode === 'time_attack'
                    ? ( // BLITZ & TIME ATTACK LOGIC: Targets > Points
                      // Calculate my targets (pX_rounds) vs opp targets
                      (() => {
                        const isP1 = latestMatchData.player1_id === currentUser?.id;
                        const myTargets = isP1 ? latestMatchData.p1_rounds : latestMatchData.p2_rounds;
                        const oppTargets = isP1 ? latestMatchData.p2_rounds : latestMatchData.p1_rounds;
                        const myPoints = isP1 ? latestMatchData.player1_score : latestMatchData.player2_score;
                        const oppPoints = isP1 ? latestMatchData.player2_score : latestMatchData.player1_score;

                        if (myTargets > oppTargets) return true;
                        if (oppTargets > myTargets) return false;
                        // Tie on Targets -> Check Points
                        return myPoints > oppPoints;
                      })()
                    )
                    : (gameState.score > opponentScore) // Standard mode
                  )
              }
              myScore={gameState.score}
              opponentScore={opponentScore}
              isFinal={latestMatchData.status === 'finished'}
              onReady={() => { }}
              onExit={goToDuelLobby}
            />
          )
        }

        <footer className="mt-auto py-6 text-slate-600 text-[8px] tracking-[0.4em] uppercase font-black z-10 pointer-events-none opacity-0">AI Evaluation Engine v3.6 - LOCAL DEV</footer>

        {/* HOMEPAGE TUTORIAL OVERLAY */}
        <ComicTutorial
          isVisible={showHomeTutorial}
          steps={[
            {
              targetId: 'audio-btn-home',
              title: 'AUDIO IMMERSIVO',
              description: 'Clicca qui per attivare o disattivare il suono. Per un\'esperienza ottimale, ti consigliamo di tenerlo acceso!',
              position: 'top'
            },

            {
              targetId: 'logo-home',
              title: 'IL TUO HUB',
              description: 'Clicca sul logo NUMBER per accedere al tuo Profilo Completo, vedere i Badge sbloccati e i Trofei!',
              position: 'bottom'
            },
            {
              targetId: 'tutorial-btn-home',
              title: 'GUIDA AI COMANDI',
              description: 'Se hai dubbi su come giocare, clicca qui per rivedere le regole base.',
              position: 'bottom'
            },
            {
              targetId: 'play-btn-home',
              title: 'INIZIA L\'AVVENTURA',
              description: 'Pronto a mettere alla prova i tuoi neuroni? Clicca qui per avviare la modalità Classica.',
              position: 'center'
            },
            {
              targetId: 'duel-btn-home',
              title: 'SFIDE 1VS1',
              description: 'Entra nell\'arena! Sfida altri utenti in tempo reale in duelli di velocità matematica.',
              position: 'bottom'
            },
            {
              targetId: 'ranking-btn-home',
              title: 'CLASSIFICA GLOBALE',
              description: 'Controlla la tua posizione nel mondo. Diventerai il numero 1?',
              position: 'bottom'
            }
          ]}
          onComplete={(neverShow) => {
            setShowHomeTutorial(false);
            if (neverShow) localStorage.setItem('comic_home_tutorial_done', 'true');
          }}
          onSkip={(neverShow) => {
            setShowHomeTutorial(false);
            if (neverShow) localStorage.setItem('comic_home_tutorial_done', 'true');
          }}
        />

        {/* GAME TUTORIAL OVERLAY */}
        <ComicTutorial
          isVisible={showGameTutorial}
          steps={[
            {
              targetId: 'targets-display-tutorial',
              title: 'I TUOI OBIETTIVI',
              description: 'Questi sono i numeri che devi ottenere. Trova le combinazioni nella griglia per raggiungerli tutti!',
              position: 'top'
            },
            {
              targetId: 'grid-container-game',
              title: 'LA GRIGLIA',
              description: 'Collega le celle: NUMERO -> OPERATORE -> NUMERO.  Esempio: 5 + 3.  Non puoi collegare due numeri vicini senza operatore!',
              position: 'center'
            },
            {
              targetId: 'score-display-game',
              title: 'PUNTEGGIO',
              description: 'Più sei veloce e mantieni la streak (serie di risposte corrette), più punti farai. Punta al record!',
              position: 'right'
            },
            {
              targetId: 'timer-display-game',
              title: 'TEMPO & PAUSA',
              description: 'Hai poco tempo! Se ti serve respirare, clicca qui per mettere in PAUSA il sistema.',
              position: 'center'
            }
          ]}
          onComplete={(neverShow) => {
            setShowGameTutorial(false);
            if (neverShow) localStorage.setItem('comic_game_tutorial_done', 'true');
          }}
          onSkip={(neverShow) => {
            setShowGameTutorial(false);
            if (neverShow) localStorage.setItem('comic_game_tutorial_done', 'true');
          }}
        />

        {/* ADV OVERLAY (MOCK UNTIL APPROVAL) */}
        {
          isAdvPlaying && (
            <div className="fixed inset-0 z-[10000] bg-black flex flex-col items-center justify-center animate-screen-in">
              <div className="absolute top-12 right-4 z-[50] flex items-center gap-4">
                {adCanSkip && (
                  <button
                    onPointerDown={() => handleFinishAd(adTimer <= 0)}
                    className="bg-black/50 hover:bg-white/10 text-white px-4 py-2 rounded-lg font-orbitron font-black text-[10px] uppercase tracking-widest border border-white/20 transition-all active:scale-95 flex items-center gap-2 backdrop-blur-md"
                  >
                    {adTimer <= 0 ? (
                      <>CHIUDI <X size={14} /></>
                    ) : (
                      <>SALTA <FastForward size={14} /></>
                    )}
                  </button>
                )}
              </div>

              {/* Progress Ring / Ad Placeholder */}
              <div className="relative w-full h-full flex-1 bg-[#020617] overflow-hidden flex flex-col items-center justify-center group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#FF8800]/10 to-transparent"></div>

                {/* MOCK AD CONTENT OR REAL ADSENSE */}
                <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 w-full h-full max-w-2xl py-8">
                  {ADS_CONFIG.enabled ? (
                    <div className="w-full h-full flex items-center justify-center bg-[#050b20] rounded-2xl border border-white/10 overflow-hidden p-2 shadow-2xl">
                      <ins className="adsbygoogle"
                           style={{ display: 'block', width: '100%', height: '100%', minHeight: '320px' }}
                           data-ad-client={ADS_CONFIG.client}
                           data-ad-slot={ADS_CONFIG.adsenseSlot}
                           data-ad-format="auto"
                           data-full-width-responsive="true"></ins>
                    </div>
                  ) : (
                    <>
                      <div className="w-20 h-20 mb-6 relative">
                        <div className="absolute inset-0 border-4 border-[#FF8800] rounded-full animate-ping opacity-20"></div>
                        <div className="absolute inset-0 border-4 border-[#FF8800] rounded-full animate-spin border-t-transparent shadow-[0_0_20px_#FF8800]"></div>
                        <div className="absolute inset-3 bg-[#FF8800]/20 rounded-full flex items-center justify-center">
                          <Play size={28} className="text-[#FF8800] fill-[#FF8800] ml-1" />
                        </div>
                      </div>

                      <h3 className="font-orbitron font-black text-white text-lg tracking-[0.2em] mb-2 uppercase">Google Adsense</h3>
                      <p className="text-[#FF8800] font-orbitron text-[8px] font-black tracking-[0.3em] uppercase opacity-70 mb-4">In attesa di approvazione</p>

                      <div className="bg-white/5 border border-white/10 rounded-xl py-3 px-6">
                        <span className="text-white/40 text-[9px] font-black uppercase tracking-widest block mb-1">Premio al termine</span>
                        <span className="text-2xl font-black font-orbitron text-white text-shadow-neon-orange">+30 SECONDI</span>
                      </div>
                    </>
                  )}
                </div>

                {/* AD PROGRESS BAR */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-[#FF8800] transition-all duration-1000 ease-linear shadow-[0_0_15px_#FF8800]"
                    style={{ width: `${(1 - adTimer / ADS_CONFIG.rewardDuration) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-2 border-[#FF8800] flex items-center justify-center bg-[#FF8800]/10">
                    <span className="font-orbitron font-black text-white text-xl">{adTimer}</span>
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] block">Sincronizzazione</span>
                    <span className="text-xs font-black text-white uppercase tracking-widest">ADV NEURAL {adTimer > 0 ? 'STREAMING' : 'READY'}</span>
                  </div>
                </div>
              </div>

              <footer className="absolute bottom-8 text-[7px] text-white/20 font-black tracking-[0.5em] uppercase pointer-events-none">
                {ADS_CONFIG.enabled ? "GOOGLE AD NETWORK ACTIVE" : "ADS_MOCK_ENGINE_V1.2 / PENDING APPROVAL"}
              </footer>
            </div>
          )
        }

        {/* Legal Footer for AdSense Compliance */}
        {!isAdvPlaying && (
          <footer className="w-full py-4 text-center border-t border-white/5 bg-[#020617]/50 backdrop-blur-sm relative z-[100]">
             <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-6 text-[10px] font-black uppercase tracking-widest text-[#FF8800]/60">
                <Link to="/site" className="hover:text-white transition-colors">Sito</Link>
                <Link to="/about" className="hover:text-white transition-colors">About</Link>
                <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                <Link to="/cookies" className="hover:text-white transition-colors">Cookies</Link>
                <Link to="/terms" className="hover:text-white transition-colors">Termini</Link>
                <Link to="/contact" className="hover:text-white transition-colors">Supporto</Link>
             </div>
          </footer>
        )}
      </div >
    </>
  );
};

export default GameView;
