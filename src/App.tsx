import { useState, useEffect, useRef, useCallback, MouseEvent } from "react";
import { 
  Camera as CameraIcon, 
  ShieldAlert, 
  Settings, 
  Activity, 
  History, 
  Bell, 
  Video, 
  VideoOff, 
  AlertTriangle,
  Monitor,
  Plus,
  Trash2,
  Flame,
  Wind,
  Eye,
  UserCheck,
  Zap,
  LayoutGrid,
  ShieldCheck,
  Cpu,
  Mail,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Scan,
  Globe,
  X,
  AlertCircle,
  Move,
  // Gem,
  Lock,
  LogOut,
  EyeOff,
  Key,
  ExternalLink,
  Keyboard,
  Send
} from "lucide-react";
import * as Lucide from "lucide-react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { QRCodeCanvas } from 'qrcode.react';
import { analyzeFrame, DetectionResult } from "./services/gemini";
import { Camera, Incident, AlertTrigger, AlertTriggerItem, Zone, ZoneType, Point } from "./types";
import { supabase } from "./supabase";
import { User } from "@supabase/supabase-js";

const RaspberryIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    fill="currentColor" 
    className={`inline-block ${className}`}
    style={{ verticalAlign: 'middle' }}
  >
    {/* Leaves */}
    <path 
      d="M12 1.5c-.3 0-.6.1-.8.3-.4.4-.3 1 .1 1.4.3.3.7.4 1.1.2.4.2.8.1 1.1-.2.4-.4.4-1 0-1.4-.3-.2-.5-.3-.8-.3-.2 0-.4 0-.6.1.1-.1.2-.1.2-.1z" 
      fill="#22c55e" 
    />
    <path 
      d="M9.7 3.8c-.3-.2-.7-.1-.9.2-.2.3-.1.7.2.9.2.1.4.1.6 0 .1.2.3.3.5.3.3 0 .6-.2.7-.5 0-.3-.2-.6-.5-.7-.2-.1-.4-.1-.6-.2z" 
      fill="#22c55e" 
    />
    <path 
      d="M14.3 3.8c-.2.1-.4.1-.6.2-.3.1-.5.4-.5.7 0 .3.3.5.7.5.2 0 .4-.1.5-.3.2.1.4.1.6 0 .3-.2.4-.6.2-.9-.2-.3-.6-.4-.9-.2z" 
      fill="#22c55e" 
    />
    <path 
      d="M12 4.5c-.5 0-1 .4-1 1s.5 1 1 1 1-.4 1-1-.5-1-1-1z" 
      fill="#22c55e" 
    />
    {/* Raspberry druplets */}
    <circle cx="12" cy="9.5" r="2.2" fill="#ef4444" />
    <circle cx="9" cy="11.5" r="2.2" fill="#ef4444" />
    <circle cx="15" cy="11.5" r="2.2" fill="#ef4444" />
    <circle cx="7" cy="14.5" r="2.2" fill="#ef4444" />
    <circle cx="11.5" cy="14.5" r="2.2" fill="#ef4444" />
    <circle cx="16.5" cy="14.5" r="2.2" fill="#ef4444" />
    <circle cx="9.5" cy="17.5" r="2.2" fill="#ef4444" />
    <circle cx="14.5" cy="17.5" r="2.2" fill="#ef4444" />
    <circle cx="12" cy="20.5" r="2.2" fill="#ef4444" />
  </svg>
);

const TailscaleIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    fill="currentColor" 
    className={`inline-block ${className}`}
    style={{ verticalAlign: 'middle' }}
  >
    <circle cx="6" cy="6" r="2.5" fill="#3b82f6" />
    <circle cx="12" cy="6" r="2.5" fill="#3b82f6" />
    <circle cx="18" cy="6" r="2.5" fill="#3b82f6" />
    <circle cx="6" cy="12" r="2.5" fill="#3b82f6" />
    <circle cx="12" cy="12" r="2.5" fill="#3b82f6" />
    <circle cx="18" cy="12" r="2.5" fill="#3b82f6" />
    <circle cx="6" cy="18" r="2.5" fill="#3b82f6" />
    <circle cx="12" cy="18" r="2.5" fill="#3b82f6" />
    <circle cx="18" cy="18" r="2.5" fill="#3b82f6" />
  </svg>
);

const IPCameraPlayer = ({ url, isAlertActive, isNightMode, imgRefCallback }: { 
  url: string; 
  isAlertActive: boolean; 
  isNightMode: boolean;
  imgRefCallback?: (el: HTMLImageElement | null) => void;
}) => {
  const [src, setSrc] = useState<string>("");
  const [isWarmingUp, setIsWarmingUp] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let timeoutId: any;

    const fetchFrame = async () => {
      if (!mountedRef.current) return;
      
      try {
        const response = await fetch(`/api/snapshot?rtsp=${encodeURIComponent(url)}&t=${Date.now()}`);
        
        if (!mountedRef.current) return;

        if (response.ok) {
          const blob = await response.blob();
          const newSrc = URL.createObjectURL(blob);
          setSrc(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return newSrc;
          });
          setIsWarmingUp(false);
          setConnectionError(null);
          timeoutId = setTimeout(fetchFrame, 200);
        } else if (response.status === 503) {
          setIsWarmingUp(true);
          setConnectionError(null);
          timeoutId = setTimeout(fetchFrame, 1000);
        } else {
          setConnectionError(`Errore Server (${response.status})`);
          timeoutId = setTimeout(fetchFrame, 3000);
        }
      } catch (e: any) {
        if (!mountedRef.current) return;
        setConnectionError("Errore di Rete");
        timeoutId = setTimeout(fetchFrame, 3000);
      }
    };

    fetchFrame();
    return () => {
      mountedRef.current = false;
      if (timeoutId) clearTimeout(timeoutId);
      setSrc(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });
    };
  }, [url]);

  return (
    <div className="relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden">
      {connectionError ? (
        <div className="flex flex-col items-center gap-2 p-4 text-center">
          <AlertTriangle size={24} className="text-red-500 animate-pulse" />
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">{connectionError}</p>
          <p className="text-[8px] text-slate-500 font-bold uppercase mt-1">Tentativo di riconnessione...</p>
        </div>
      ) : isWarmingUp ? (
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest animate-pulse">Inizializzazione Cam...</p>
        </div>
      ) : (
        <img 
          ref={imgRefCallback}
          src={src} 
          className={`w-full h-full object-cover transition-all duration-300 ${isAlertActive ? 'opacity-40 saturate-150' : 'opacity-100'}`}
          style={isNightMode ? { filter: 'grayscale(1) brightness(1.2) contrast(1.1) sepia(0.2) hue-rotate(180deg)' } : {}}
          crossOrigin="anonymous"
        />
      )}
    </div>
  );
};

interface VirtualKeyboardProps {
  activeField: string | null;
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  onClose: () => void;
  title?: string;
}

const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  activeField,
  value,
  setValue,
  onClose,
  title
}) => {
  const [isShift, setIsShift] = useState(false);
  const [isSymbols, setIsSymbols] = useState(false);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('button[type="button"]') || target.closest('input') || target.closest('textarea');
      const isKeyboard = target.closest('.virtual-keyboard');
      if (!isInput && !isKeyboard) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [onClose]);

  if (!activeField) return null;

  const normalRows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '_'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '.', '/'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '@', ':'],
    ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'Space', '?123'],
    ['Canc', 'OK']
  ];

  const symbolRows = [
    ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_'],
    ['+', '=', '{', '}', '[', ']', '|', '\\', ':', ';', '"', '\''],
    ['<', '>', ',', '?', '/', '~', '`', '.', 'Space', 'ABC'],
    ['Canc', 'OK']
  ];

  const rows = isSymbols ? symbolRows : normalRows;

  const handleKeyPress = (key: string) => {
    if (key === 'Shift') {
      setIsShift(prev => !prev);
    } else if (key === '?123') {
      setIsSymbols(true);
    } else if (key === 'ABC') {
      setIsSymbols(false);
    } else if (key === 'Space') {
      setValue(prev => prev + ' ');
    } else if (key === 'Canc') {
      setValue(prev => prev.slice(0, -1));
    } else if (key === 'OK') {
      onClose();
    } else {
      const val = isShift ? key.toUpperCase() : key.toLowerCase();
      setValue(prev => prev + val);
    }
  };

  return (
    <motion.div
      initial={{ y: 320, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 320, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="virtual-keyboard fixed bottom-0 left-0 right-0 mx-auto w-full max-w-lg bg-[#0d101e]/98 backdrop-blur-xl border-t border-white/10 rounded-t-[32px] p-4 z-[9999] flex flex-col gap-2 shadow-[0_-15px_40px_rgba(0,0,0,0.8)]"
    >
      <div className="flex justify-between items-center px-2 mb-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          {title || `Tastiera Virtuale (${activeField})`}
        </span>
        <button
          onClick={onClose}
          type="button"
          className="text-slate-500 hover:text-white text-xs font-black uppercase tracking-wider"
        >
          Nascondi
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        {rows.map((row, rIndex) => (
          <div key={rIndex} className="flex justify-center gap-1 w-full">
            {row.map((keyVal, kIndex) => {
              let displayVal = keyVal;
              let isWide = false;
              let isActive = false;
              let isAction = false;

              if (keyVal === 'Shift') {
                isWide = true;
                displayVal = '⇧';
                isActive = isShift;
              } else if (keyVal === 'Space') {
                isWide = true;
                displayVal = 'Spazio';
              } else if (keyVal === 'Canc') {
                isWide = true;
                displayVal = '⌫';
              } else if (keyVal === 'OK') {
                isWide = true;
                isAction = true;
                displayVal = 'OK';
              } else if (keyVal === '?123' || keyVal === 'ABC') {
                isWide = true;
                displayVal = keyVal;
              } else {
                displayVal = isShift ? keyVal.toUpperCase() : keyVal.toLowerCase();
              }

              return (
                <button
                  key={kIndex}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleKeyPress(keyVal);
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleKeyPress(keyVal);
                  }}
                  className={`
                    h-11 rounded-lg text-sm font-bold flex items-center justify-center select-none transition-all duration-75 active:scale-95 touch-manipulation
                    ${isWide ? 'flex-[1.5]' : 'flex-1'}
                    ${isAction 
                      ? 'bg-blue-600 border border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]' 
                      : isActive 
                        ? 'bg-blue-500/20 border border-blue-500/40 text-blue-400' 
                        : 'bg-white/5 border border-white/5 text-slate-200 hover:bg-white/10 hover:border-white/10'
                    }
                  `}
                >
                  {displayVal}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [status, setStatus] = useState<{ type: 'error' | 'success', title: string, message: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [activeField, setActiveField] = useState<'email' | 'password' | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setStatus({
          type: 'success',
          title: 'Verifica Richiesta',
          message: "Abbiamo inviato un link di conferma alla tua email. Controlla la posta per attivare l'account."
        });
      }
    } catch (error: any) {
      let msg = error.message;
      if (msg === "Invalid login credentials") {
        msg = "Le credenziali inserite non sono corrette. Verifica email e password e riprova.";
      }
      setStatus({
        type: 'error',
        title: 'Accesso Negato',
        message: msg
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#050810] flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(30,58,138,0.2),transparent_70%)]" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md glass p-4 sm:p-8 rounded-3xl sm:rounded-[40px] border-white/5 shadow-2xl relative z-10 max-h-full overflow-y-auto custom-scrollbar">
        <div className="flex flex-row sm:flex-col items-center justify-center gap-4 sm:gap-6 mb-4 sm:mb-8">
          <div className="w-10 h-10 sm:w-20 sm:h-20 glass rounded-2xl sm:rounded-3xl flex items-center justify-center bg-blue-600/10 border-blue-500/20 shadow-[0_0_30px_rgba(37,99,235,0.2)] shrink-0">
            <ShieldCheck size={24} className="text-blue-400 sm:w-12 sm:h-12" />
          </div>
          <div className="text-left sm:text-center">
            <h1 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tighter">VIGIL.<span className="text-blue-400">AI</span></h1>
            <p className="text-slate-500 text-[9px] sm:text-xs font-bold uppercase tracking-widest mt-0.5 sm:mt-1">Intelligence-Driven Security</p>
          </div>
        </div>
        <form onSubmit={handleAuth} className="space-y-2 sm:space-y-4">
          <div className="relative">
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-white focus:border-blue-500/50 outline-none transition-all pr-12 text-sm sm:text-base" 
              placeholder="Email" 
              required 
            />
            <button 
              type="button"
              onClick={() => setActiveField(activeField === 'email' ? null : 'email')}
              className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${activeField === 'email' ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}
              title="Tastiera Virtuale"
            >
              <Keyboard size={18} />
            </button>
          </div>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-white focus:border-blue-500/50 outline-none transition-all pr-20 text-sm sm:text-base" 
              placeholder="Password" 
              required 
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button 
                type="button"
                onClick={() => setActiveField(activeField === 'password' ? null : 'password')}
                className={`transition-colors ${activeField === 'password' ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}
                title="Tastiera Virtuale"
              >
                <Keyboard size={18} />
              </button>
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:opacity-50 text-xs sm:text-sm">{loading ? 'Caricamento...' : mode === 'login' ? 'Accedi' : 'Registrati'}</button>
        </form>
        <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="w-full mt-4 sm:mt-6 text-[10px] sm:text-xs text-slate-500 hover:text-blue-400 uppercase font-bold tracking-widest">{mode === 'login' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}</button>
      </motion.div>

      <AnimatePresence>
        {status && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1100] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="glass max-w-sm w-full p-8 rounded-[40px] border-white/10 text-center space-y-6 shadow-2xl"
            >
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto border ${status.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-green-500/10 border-green-500/20 text-green-500'}`}>
                {status.type === 'error' ? <AlertCircle size={32} /> : <ShieldCheck size={32} />}
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">{status.title}</h3>
                <p className="text-slate-400 text-xs font-bold leading-relaxed uppercase tracking-tight">{status.message}</p>
              </div>
              <button 
                onClick={() => setStatus(null)}
                className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all"
              >
                Ho Capito
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeField && (
          <VirtualKeyboard
            activeField={activeField}
            value={activeField === 'email' ? email : password}
            setValue={activeField === 'email' ? setEmail : setPassword}
            title={activeField === 'email' ? 'Tastiera Virtuale (Email)' : 'Tastiera Virtuale (Password)'}
            onClose={() => setActiveField(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const DEFAULT_TRIGGERS: AlertTriggerItem[] = [
  { id: 'intrusion', label: 'Intrusione', description: 'Intrusione non autorizzata o presenza sospetta di intrusi.', icon_name: 'Eye', color_class: 'text-blue-400' },
  { id: 'violence', label: 'Violenza', description: 'Rapine, aggressioni, atti vandalici o armi (pistole, coltelli, mazze).', icon_name: 'ShieldAlert', color_class: 'text-red-500' },
  { id: 'fire', label: 'Incendio', description: 'Fiamme libere, principio di incendio o presenza di fuoco.', icon_name: 'Flame', color_class: 'text-orange-500' },
  { id: 'smoke', label: 'Fumo', description: 'Fumo denso o fumo anomalo negli ambienti.', icon_name: 'Wind', color_class: 'text-slate-300' },
  { id: 'safety_gear', label: 'DPI', description: 'Mancato uso di caschi di protezione, giubbotti catarifrangenti o abbigliamento protettivo obbligatorio.', icon_name: 'UserCheck', color_class: 'text-green-400' },
  { id: 'fall', label: 'Cadute', description: 'Persone a terra, svenimenti o cadute accidentali.', icon_name: 'Activity', color_class: 'text-purple-400' },
  { id: 'flooding', label: 'Allagamento', description: 'Presenza di acqua o liquidi sul pavimento, allagamenti, pozze o perdite da tubature.', icon_name: 'Waves', color_class: 'text-cyan-400' },
  { id: 'earthquake', label: 'Terremoto', description: 'Vibrazioni, oscillazioni continue o scuotimento dell\'inquadratura compatibili con un terremoto/scossa sismica (da distinguere da urti singoli al tavolo/supporto).', icon_name: 'Zap', color_class: 'text-amber-500' }
];

export default function App() {

  const [connectMethod, setConnectMethod] = useState<'direct' | 'advanced' | 'browser'>('direct');
  const [availableTriggers, setAvailableTriggers] = useState<AlertTriggerItem[]>(DEFAULT_TRIGGERS);
  
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [isAiEnabled, setIsAiEnabled] = useState(true);
  const [alertingCameraIds, setAlertingCameraIds] = useState<string[]>([]);
  const [lastAnalysis, setLastAnalysis] = useState<DetectionResult | null>({
    description: "🚀 Sincronizzazione motore AI in corso...",
    isEmergency: false,
    threatLevel: "low",
    detectedEvents: []
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [activeCameraTab, setActiveCameraTab] = useState<'info' | 'source' | 'triggers'>('info');
  const [activeCamStatuses, setActiveCamStatuses] = useState<Record<string, boolean>>({});
  const [cameraToDelete, setCameraToDelete] = useState<string | null>(null);
  const [isNightMode, setIsNightMode] = useState(false);
  const [notificationEmails, setNotificationEmails] = useState<string[]>(() => {
    const saved = localStorage.getItem("vigilai_notification_emails");
    return saved ? JSON.parse(saved) : ["allarme.vigilai@gmail.com"];
  });
  const [newEmail, setNewEmail] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isMultiView, setIsMultiView] = useState(true);
  const [preventSleep, setPreventSleep] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [globalModal, setGlobalModal] = useState<{ type: 'error' | 'success' | 'info', title: string, message: string } | null>(null);
  const [serverInfo, setServerInfo] = useState<{ ips: string[], port: number } | null>(null);
  const [activeQrTab, setActiveQrTab] = useState<'local' | 'tailscale'>('local');
  const [vpnStatus, setVpnStatus] = useState<{ installed: boolean, state: string, authUrl: string | null, ip: string | null } | null>(null);
  const [loadingVpn, setLoadingVpn] = useState(false);

  const [isMobile35, setIsMobile35] = useState(false);
  const [showMobileOverlay, setShowMobileOverlay] = useState(false);
  const [showMobileLogsModal, setShowMobileLogsModal] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      // Sogli allargata per intercettare anche simulatori o scale DPI elevate (fino a 600px x 400px)
      const is35 = window.innerWidth <= 600 && window.innerHeight <= 450;
      setIsMobile35(is35);
      if (is35) {
        setIsMultiView(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (showMobileOverlay && isMobile35) {
      const timer = setTimeout(() => {
        setShowMobileOverlay(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showMobileOverlay, isMobile35]);

  useEffect(() => {
    fetch('/api/info').then(res => res.json()).then(setServerInfo).catch(console.error);

    // Recupera le impostazioni locali per allineare lo stato al file .env ed evitare sovrascritture vuote
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (data.geminiKey) {
            localStorage.setItem("vigilai_gemini_key", data.geminiKey);
          }
          if (data.emailUser) {
            localStorage.setItem("vigilai_email_user", data.emailUser);
          }
          if (data.emailPass) {
            localStorage.setItem("vigilai_email_pass", data.emailPass);
          }
          if (data.telegramChatId) {
            localStorage.setItem("vigilai_telegram_chat_id", data.telegramChatId);
          }
          if (data.telegramToken) {
            localStorage.setItem("vigilai_telegram_token", data.telegramToken);
          }
          setAppSettings({
            geminiKey: data.geminiKey || localStorage.getItem("vigilai_gemini_key") || "",
            emailUser: data.emailUser || localStorage.getItem("vigilai_email_user") || "",
            emailPass: data.emailPass || localStorage.getItem("vigilai_email_pass") || "",
            telegramChatId: data.telegramChatId || localStorage.getItem("vigilai_telegram_chat_id") || "",
            telegramToken: data.telegramToken || localStorage.getItem("vigilai_telegram_token") || "",
          });
          if (data.notificationEmails) {
            setNotificationEmails(data.notificationEmails);
            localStorage.setItem("vigilai_notification_emails", JSON.stringify(data.notificationEmails));
          }
        }
      })
      .catch(console.error);
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setGlobalModal({
        type: 'error',
        title: 'Errore Logout',
        message: 'Si è verificato un errore durante la disconnessione. Riprova.'
      });
    }
  };

  const [isEditingZones, setIsEditingZones] = useState(false);
  const [currentDrawingZone, setCurrentDrawingZone] = useState<Partial<Zone> | null>(null);
  const [draggingZoneId, setDraggingZoneId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<"move" | number | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; initialPoints: Point[] } | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  
  // Settings State
  const [aiModel, setAiModel] = useState(() => localStorage.getItem("vigilai_model") || "gemini-3-flash-preview");
  const [showEmailPass, setShowEmailPass] = useState(false);
  const [appSettings, setAppSettings] = useState({
    geminiKey: localStorage.getItem("vigilai_gemini_key") || "",
    emailUser: localStorage.getItem("vigilai_email_user") || "",
    emailPass: localStorage.getItem("vigilai_email_pass") || "",
    telegramChatId: localStorage.getItem("vigilai_telegram_chat_id") || "",
    telegramToken: localStorage.getItem("vigilai_telegram_token") || "",
  });
  const [disabledAiCameraIds, setDisabledAiCameraIds] = useState<string[]>([]);
  const [activeSettingsTab, setActiveSettingsTab] = useState<"ai" | "email" | "telegram" | "sleep" | "test">("ai");

  const toggleCameraAi = (camId: string) => {
    setDisabledAiCameraIds(prev => 
      prev.includes(camId) 
        ? prev.filter(id => id !== camId) 
        : [...prev, camId]
    );
  };

  // State della tastiera virtuale e del rilevamento tastiera fisica
  const [keyboardTarget, setKeyboardTarget] = useState<{ id: string; title: string } | null>(null);
  const [useVirtualKeyboard, setUseVirtualKeyboard] = useState(true);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [modalGeminiKey, setModalGeminiKey] = useState(() => localStorage.getItem("vigilai_gemini_key") || "");
  const [showApiKeyHeaderInput, setShowApiKeyHeaderInput] = useState(false);

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isInAppBrowser = /FBAN|FBAV|Instagram|GSA|Line|MicroMessenger|Messenger|Snapchat/i.test(navigator.userAgent || '');

  const goToNextCamera = useCallback(() => {
    if (cameras.length === 0) return;
    const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
    if (currentIndex !== -1) {
      const nextIndex = (currentIndex + 1) % cameras.length;
      setActiveCameraId(cameras[nextIndex].id);
    }
  }, [cameras, activeCameraId]);

  const goToPrevCamera = useCallback(() => {
    if (cameras.length === 0) return;
    const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
    if (currentIndex !== -1) {
      const prevIndex = (currentIndex - 1 + cameras.length) % cameras.length;
      setActiveCameraId(cameras[prevIndex].id);
    }
  }, [cameras, activeCameraId]);

  const handleDragEnd = useCallback((event: any, info: any) => {
    if (isMultiView) return;
    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold) {
      goToNextCamera();
    } else if (info.offset.x > swipeThreshold) {
      goToPrevCamera();
    }
  }, [isMultiView, goToNextCamera, goToPrevCamera]);


  useEffect(() => {
    const handlePhysicalKeyboard = (e: KeyboardEvent) => {
      // Se l'evento è affidabile (isTrusted) ed è un singolo carattere alfanumerico
      if (e.isTrusted && e.key.length === 1) {
        setUseVirtualKeyboard(false);
        setKeyboardTarget(null); // Chiude la tastiera a schermo
      }
    };
    window.addEventListener('keydown', handlePhysicalKeyboard);
    return () => window.removeEventListener('keydown', handlePhysicalKeyboard);
  }, []);

  // Sincronizza modalGeminiKey quando cambia appSettings.geminiKey
  useEffect(() => {
    setModalGeminiKey(appSettings.geminiKey);
  }, [appSettings.geminiKey]);

  // Esegue il backup diviso della chiave API su Supabase
  const backupApiKeyToSupabase = async (key: string) => {
    // 1. Salva sempre anche nei metadati dell'utente per un ripristino sicuro ed immediato senza tabelle
    try {
      await supabase.auth.updateUser({
        data: { gemini_key: key }
      });
      console.log("[Backup API Key] Sincronizzato con successo nei metadati utente Supabase Auth.");
    } catch (authErr) {
      console.warn("[Backup API Key] Errore nel salvataggio dei metadati utente:", authErr);
    }

    if (!key) {
      try {
        await supabase.from('settings').upsert({
          id: 'gemini_key_backup',
          gemini_part1: '',
          gemini_part2: '',
          updated_at: new Date().toISOString()
        });
        localStorage.setItem("vigilai_gemini_key_updated_at", new Date().toISOString());
      } catch (err) {
        console.warn("[Backup API Key] Errore nella rimozione dalla tabella settings:", err);
      }
      return;
    }
    
    try {
      const mid = Math.floor(key.length / 2);
      const part1 = key.substring(0, mid);
      const part2 = key.substring(mid);
      
      const { error } = await supabase.from('settings').upsert({
        id: 'gemini_key_backup',
        gemini_part1: part1,
        gemini_part2: part2,
        updated_at: new Date().toISOString()
      });
      
      if (error) {
        if (error.code === 'PGRST205') {
          console.warn("[Backup API Key] Tabella 'settings' non trovata su Supabase. Assicurati di aver eseguito lo script supabase_backup_table.sql");
        } else {
          console.error("[Backup API Key] Errore nel salvataggio su Supabase:", error.message);
        }
      } else {
        console.log("[Backup API Key] Backup completato con successo su Supabase (diviso in due colonne).");
        localStorage.setItem("vigilai_gemini_key_updated_at", new Date().toISOString());
      }
    } catch (err) {
      console.error("[Backup API Key] Errore inaspettato:", err);
    }
  };

  const prevKeyboardTargetRef = useRef<{ id: string; title: string } | null>(null);
  useEffect(() => {
    const prevTarget = prevKeyboardTargetRef.current;
    if (prevTarget && (prevTarget.id === 'settingsGeminiKey' || prevTarget.id === 'modalGeminiKey') && keyboardTarget?.id !== prevTarget.id) {
      backupApiKeyToSupabase(appSettings.geminiKey);
    }
    prevKeyboardTargetRef.current = keyboardTarget;
  }, [keyboardTarget, appSettings.geminiKey]);

  // Risolve dinamicamente valore e setter per la tastiera virtuale globale
  const getKeyboardProps = () => {
    if (!keyboardTarget) return null;
    const id = keyboardTarget.id;

    if (id === 'settingsGeminiKey') {
      return {
        value: appSettings.geminiKey,
        setValue: (val: string | ((prev: string) => string)) => {
          setAppSettings(prev => {
            const nextVal = typeof val === 'function' ? val(prev.geminiKey) : val;
            localStorage.setItem("vigilai_gemini_key", nextVal);
            return { ...prev, geminiKey: nextVal };
          });
        }
      };
    }
    if (id === 'settingsEmailUser') {
      return {
        value: appSettings.emailUser,
        setValue: (val: string | ((prev: string) => string)) => {
          setAppSettings(prev => {
            const nextVal = typeof val === 'function' ? val(prev.emailUser) : val;
            return { ...prev, emailUser: nextVal };
          });
        }
      };
    }
    if (id === 'settingsEmailPass') {
      return {
        value: appSettings.emailPass,
        setValue: (val: string | ((prev: string) => string)) => {
          setAppSettings(prev => {
            const nextVal = typeof val === 'function' ? val(prev.emailPass) : val;
            return { ...prev, emailPass: nextVal };
          });
        }
      };
    }
    if (id === 'settingsTelegramToken') {
      return {
        value: appSettings.telegramToken,
        setValue: (val: string | ((prev: string) => string)) => {
          setAppSettings(prev => {
            const nextVal = typeof val === 'function' ? val(prev.telegramToken) : val;
            return { ...prev, telegramToken: nextVal };
          });
        }
      };
    }
    if (id === 'settingsTelegramChatId') {
      return {
        value: appSettings.telegramChatId,
        setValue: (val: string | ((prev: string) => string)) => {
          setAppSettings(prev => {
            const nextVal = typeof val === 'function' ? val(prev.telegramChatId) : val;
            return { ...prev, telegramChatId: nextVal };
          });
        }
      };
    }
    if (id === 'settingsNewEmail') {
      return {
        value: newEmail,
        setValue: setNewEmail
      };
    }
    if (id === 'modalGeminiKey') {
      return {
        value: modalGeminiKey,
        setValue: setModalGeminiKey
      };
    }

    if (editingCamera) {
      if (id === 'cameraName') {
        return {
          value: editingCamera.name || '',
          setValue: (val: string | ((prev: string) => string)) => {
            setEditingCamera(prev => {
              if (!prev) return null;
              const nextVal = typeof val === 'function' ? val(prev.name || '') : val;
              return { ...prev, name: nextVal };
            });
          }
        };
      }
      if (id === 'cameraLocation') {
        return {
          value: editingCamera.location || '',
          setValue: (val: string | ((prev: string) => string)) => {
            setEditingCamera(prev => {
              if (!prev) return null;
              const nextVal = typeof val === 'function' ? val(prev.location || '') : val;
              return { ...prev, location: nextVal };
            });
          }
        };
      }
      if (id === 'cameraUrl') {
        return {
          value: editingCamera.url || '',
          setValue: (val: string | ((prev: string) => string)) => {
            setEditingCamera(prev => {
              if (!prev) return null;
              const nextVal = typeof val === 'function' ? val(prev.url || '') : val;
              return { ...prev, url: nextVal };
            });
          }
        };
      }
      if (id === 'cameraIp') {
        return {
          value: editingCamera.ip || '',
          setValue: (val: string | ((prev: string) => string)) => {
            setEditingCamera(prev => {
              if (!prev) return null;
              const nextVal = typeof val === 'function' ? val(prev.ip || '') : val;
              return { ...prev, ip: nextVal };
            });
          }
        };
      }
      if (id === 'cameraPort') {
        return {
          value: String(editingCamera.port || ''),
          setValue: (val: string | ((prev: string) => string)) => {
            setEditingCamera(prev => {
              if (!prev) return null;
              const nextVal = typeof val === 'function' ? val(String(prev.port || '')) : val;
              return { ...prev, port: nextVal ? parseInt(nextVal) || 0 : 0 };
            });
          }
        };
      }
      if (id === 'cameraUser') {
        return {
          value: editingCamera.username || '',
          setValue: (val: string | ((prev: string) => string)) => {
            setEditingCamera(prev => {
              if (!prev) return null;
              const nextVal = typeof val === 'function' ? val(prev.username || '') : val;
              return { ...prev, username: nextVal };
            });
          }
        };
      }
      if (id === 'cameraPass') {
        return {
          value: editingCamera.password || '',
          setValue: (val: string | ((prev: string) => string)) => {
            setEditingCamera(prev => {
              if (!prev) return null;
              const nextVal = typeof val === 'function' ? val(prev.password || '') : val;
              return { ...prev, password: nextVal };
            });
          }
        };
      }
      if (id === 'cameraRtsp') {
        return {
          value: editingCamera.rtspPath || '',
          setValue: (val: string | ((prev: string) => string)) => {
            setEditingCamera(prev => {
              if (!prev) return null;
              const nextVal = typeof val === 'function' ? val(prev.rtspPath || '') : val;
              return { ...prev, rtspPath: nextVal };
            });
          }
        };
      }
    }
    return null;
  };
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Caricamento dei trigger AI dinamici da Supabase
  useEffect(() => {
    const fetchTriggers = async () => {
      try {
        const { data, error } = await supabase
          .from('alert_triggers')
          .select('*')
          .order('created_at', { ascending: true });
        
        if (error) {
          console.warn("[Database] Impossibile recuperare i trigger AI, uso fallback locali:", error.message);
          return;
        }

        if (data && data.length > 0) {
          console.log("[Database] Trigger AI caricati con successo:", data.length);
          setAvailableTriggers(data);
        }
      } catch (err: any) {
        console.warn("[Database] Errore imprevisto nel recupero dei trigger AI:", err.message);
      }
    };
    fetchTriggers();
  }, []);

  // Diagnostic: Check if 'cameras' table is accessible
  useEffect(() => {
    const checkTable = async () => {
      const { data, error } = await supabase.from('cameras').select('id').limit(1);
      if (error) {
        console.error("[Supabase Diagnostic] Error accessing 'cameras' table:", error);
      } else {
        console.log("[Supabase Diagnostic] 'cameras' table is accessible. Found:", data.length, "records");
      }
    };
    if (user) checkTable();
  }, [user]);

  // Recupero e allineamento delle impostazioni da Supabase all'avvio
  useEffect(() => {
    const syncAppSettings = async () => {
      if (!user) return;
      try {
        const localKey = localStorage.getItem("vigilai_gemini_key") || "";
        const localEmailUser = localStorage.getItem("vigilai_email_user") || "";
        const localEmailPass = localStorage.getItem("vigilai_email_pass") || "";
        const localTelegramChatId = localStorage.getItem("vigilai_telegram_chat_id") || "";
        const localTelegramToken = localStorage.getItem("vigilai_telegram_token") || "";
        const localRecipientsStr = localStorage.getItem("vigilai_notification_emails") || "";
        
        let localRecipients: string[] = ["allarme.vigilai@gmail.com"];
        try {
          if (localRecipientsStr) {
            localRecipients = JSON.parse(localRecipientsStr);
            if (!Array.isArray(localRecipients)) localRecipients = ["allarme.vigilai@gmail.com"];
          }
        } catch (e) {}

        const metadata = user.user_metadata || {};
        const cloudKey = metadata.gemini_key || "";
        const cloudEmailUser = metadata.email_user || "";
        const cloudEmailPass = metadata.email_pass || "";
        const cloudTelegramChatId = metadata.telegram_chat_id || "";
        const cloudTelegramToken = metadata.telegram_token || "";
        
        let cloudRecipients: string[] = [];
        if (metadata.notification_emails) {
          if (Array.isArray(metadata.notification_emails)) {
            cloudRecipients = metadata.notification_emails;
          } else if (typeof metadata.notification_emails === "string") {
            cloudRecipients = metadata.notification_emails.split(",").map((e: string) => e.trim()).filter(Boolean);
          }
        }

        const needsLocalUpdate = 
          (!localKey && cloudKey) || 
          (!localEmailUser && cloudEmailUser) || 
          (!localEmailPass && cloudEmailPass) || 
          (!localTelegramChatId && cloudTelegramChatId) ||
          (!localTelegramToken && cloudTelegramToken) ||
          (localRecipients.length === 1 && localRecipients[0] === "castromassimo@gmail.com" && cloudRecipients.length > 0);

        const saveToLocalServer = (key: string, userMail: string, passMail: string, tgChatId: string, tgToken: string, recs: string[]) => {
          fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              geminiKey: key,
              emailUser: userMail,
              emailPass: passMail,
              telegramChatId: tgChatId,
              telegramToken: tgToken,
              notificationEmails: recs
            })
          }).then(res => res.json()).then(resData => {
            if (resData.success) {
              console.log("[VigilAI Sync] Impostazioni allineate con successo sul server locale.");
            }
          }).catch(err => console.warn("[VigilAI Sync] Impossibile salvare le impostazioni sul server locale:", err));
        };

        if (needsLocalUpdate) {
          console.log("[VigilAI Sync] Rilevate impostazioni nel cloud. Ripristino in locale...");
          
          const finalKey = cloudKey || localKey;
          const finalEmailUser = cloudEmailUser || localEmailUser;
          const finalEmailPass = cloudEmailPass || localEmailPass;
          const finalTelegramChatId = cloudTelegramChatId || localTelegramChatId;
          const finalTelegramToken = cloudTelegramToken || localTelegramToken;
          const finalRecipients = cloudRecipients.length > 0 ? cloudRecipients : localRecipients;

          localStorage.setItem("vigilai_gemini_key", finalKey);
          localStorage.setItem("vigilai_gemini_key_updated_at", new Date().toISOString());
          localStorage.setItem("vigilai_email_user", finalEmailUser);
          localStorage.setItem("vigilai_email_pass", finalEmailPass);
          localStorage.setItem("vigilai_telegram_chat_id", finalTelegramChatId);
          localStorage.setItem("vigilai_telegram_token", finalTelegramToken);
          localStorage.setItem("vigilai_notification_emails", JSON.stringify(finalRecipients));

          setAppSettings({
            geminiKey: finalKey,
            emailUser: finalEmailUser,
            emailPass: finalEmailPass,
            telegramChatId: finalTelegramChatId,
            telegramToken: finalTelegramToken
          });
          setNotificationEmails(finalRecipients);
          setModalGeminiKey(finalKey);

          saveToLocalServer(finalKey, finalEmailUser, finalEmailPass, finalTelegramChatId, finalTelegramToken, finalRecipients);

          setGlobalModal({
            type: 'success',
            title: 'Impostazioni Sincronizzate',
            message: 'Le impostazioni (API Key, SMTP e Telegram) sono state allineate con successo con il tuo account cloud.'
          });
        } else {
          const needsCloudUpdate = 
            (localKey && !cloudKey) || 
            (localEmailUser && !cloudEmailUser) || 
            (localEmailPass && !cloudEmailPass) ||
            (localTelegramChatId && !cloudTelegramChatId) ||
            (localTelegramToken && !cloudTelegramToken);

          if (needsCloudUpdate) {
            console.log("[VigilAI Sync] Caricamento impostazioni locali su cloud (backup)...");
            try {
              await supabase.auth.updateUser({
                data: {
                  gemini_key: localKey,
                  email_user: localEmailUser,
                  email_pass: localEmailPass,
                  telegram_chat_id: localTelegramChatId,
                  telegram_token: localTelegramToken,
                  notification_emails: localRecipients
                }
              });
              console.log("[VigilAI Sync] Backup completato nei metadati utente Supabase Auth.");
            } catch (authErr) {
              console.warn("[VigilAI Sync] Errore nel salvataggio dei metadati utente:", authErr);
            }
          }
        }
      } catch (err) {
        console.error("[VigilAI Sync] Errore critico nel processo di sincronizzazione impostazioni:", err);
      }
    };
    
    const timer = setTimeout(() => {
      syncAppSettings();
    }, 1500);
    return () => clearTimeout(timer);
  }, [user]);


  
  const fetchUserData = useCallback(async () => {

    if (!user) return;
    const { data: cams } = await supabase.from('cameras').select('*').order('order', { ascending: true });
    if (cams) {
      const mappedCams = cams.map((c: any) => ({ ...c, enabledTriggers: c.enabled_triggers || [], rtspPath: c.rtsp_path || '/stream1' }));
      setCameras(mappedCams);
      // Auto-enable monitoring for active cams if desired
      const initialStatuses: Record<string, boolean> = {};
      mappedCams.forEach(c => initialStatuses[c.id] = true);
      setActiveCamStatuses(initialStatuses);
      if (mappedCams.length > 0 && !activeCameraId) setActiveCameraId(mappedCams[0].id);
    }
  }, [user, activeCameraId]);

  const updateCameraOrder = async (newOrder: Camera[]) => {
    setCameras(newOrder);
    if (!user) return;
    
    // Persist new order to Supabase without wiping other columns
    const updates = newOrder.map((cam, index) => ({
      ...cam,
      user_id: user.id,
      order: index,
      // Map frontend field names to DB column names if they differ
      enabled_triggers: cam.enabledTriggers,
      rtsp_path: cam.rtspPath
    }));
    
    const { error } = await supabase.from('cameras').upsert(updates, { onConflict: 'id' });
    if (error) console.error("Errore salvataggio ordine:", error);
  };

  const handleOrderSwap = (camId: string, newPosStr: string) => {
    const newPos = parseInt(newPosStr);
    if (isNaN(newPos) || newPos < 1 || newPos > cameras.length) return;
    
    const currentIndex = cameras.findIndex(c => c.id === camId);
    const targetIndex = newPos - 1;
    
    if (currentIndex === targetIndex) return;
    
    const newOrder = [...cameras];
    const temp = newOrder[currentIndex];
    newOrder[currentIndex] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    
    updateCameraOrder(newOrder);
  };

  useEffect(() => { if (user) fetchUserData(); }, [user, fetchUserData]);




  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const imgRefs = useRef<Map<string, HTMLImageElement>>(new Map());
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamsRef = useRef<Map<string, MediaStream>>(new Map());
  const wakeLockRef = useRef<any>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const camRotationIndexRef = useRef<number>(0);
  const lastNotificationTimeRef = useRef<number>(0);
  const alertSequenceCountRef = useRef<number>(0);

  const activeCamera = cameras.find(c => c.id === activeCameraId);

  // Helper: capture a frame from a webcam/browser camera robustly
  const captureFromWebcam = async (camId: string): Promise<HTMLVideoElement | null> => {
    // 1. Try the existing video ref
    const videoEl = videoRefs.current.get(camId);
    if (videoEl && videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
      return videoEl;
    }

    // 2. If ref exists but not ready, wait up to 2s for it to become ready
    if (videoEl) {
      const ready = await new Promise<boolean>(resolve => {
        if (videoEl.readyState >= 2 && videoEl.videoWidth > 0) { resolve(true); return; }
        const onReady = () => { videoEl.removeEventListener('canplay', onReady); resolve(videoEl.readyState >= 2 && videoEl.videoWidth > 0); };
        videoEl.addEventListener('canplay', onReady);
        setTimeout(() => { videoEl.removeEventListener('canplay', onReady); resolve(videoEl.readyState >= 2 && videoEl.videoWidth > 0); }, 2000);
      });
      if (ready) return videoEl;
    }

    // 3. Fallback: create a temporary video from the MediaStream
    const stream = streamsRef.current.get(camId);
    if (!stream || !stream.active) return null;
    const tempVideo = document.createElement('video');
    tempVideo.srcObject = stream;
    tempVideo.muted = true;
    tempVideo.playsInline = true;
    await tempVideo.play().catch(() => {});
    const ready = await new Promise<boolean>(resolve => {
      if (tempVideo.readyState >= 2 && tempVideo.videoWidth > 0) { resolve(true); return; }
      const onReady = () => { tempVideo.removeEventListener('canplay', onReady); resolve(tempVideo.readyState >= 2 && tempVideo.videoWidth > 0); };
      tempVideo.addEventListener('canplay', onReady);
      setTimeout(() => { tempVideo.removeEventListener('canplay', onReady); resolve(tempVideo.readyState >= 2 && tempVideo.videoWidth > 0); }, 2500);
    });
    if (ready) return tempVideo;
    tempVideo.srcObject = null;
    return null;
  };

  // Notification function
  const sendNotification = async (description: string, screenshot: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "email",
          recipient: notificationEmails,
          description,
          screenshot,
          emailUser: appSettings.emailUser,
          emailPass: appSettings.emailPass,
          telegramChatId: appSettings.telegramChatId,
          telegramToken: appSettings.telegramToken
        })
      });

      let data: any = {};
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error("[notify] Non-JSON response:", response.status, text.slice(0, 200));
        return { success: false, error: `Risposta del server non valida (Stato ${response.status})` };
      }

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || `Errore del server (${response.status})` };
      }
      console.log("Notification request sent to:", notificationEmails.join(", "));
      return { success: true };
    } catch (e: any) {
      console.error("Failed to send notification request", e);
      return { success: false, error: e.message || "Errore di connessione" };
    }
  };

  // Sound effects
  const playAlertSound = () => {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3");
    audio.play().catch(e => console.log("Audio playback failed", e));
  };

  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && preventSleep && isMonitoring) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          console.log('Vigil.AI: Wake Lock Attivo');
        } catch (err: any) {
          console.error(`${err.name}, ${err.message}`);
        }
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('Wake Lock released');
      }
    };

    if (preventSleep && isMonitoring) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [preventSleep, isMonitoring]);

  useEffect(() => {
    const checkTime = () => {
      const hour = new Date().getHours();
      if (hour >= 20 || hour < 6) {
        setIsNightMode(true);
      } else {
        setIsNightMode(false);
      }
    };
    checkTime();
    const timer = setInterval(checkTime, 60000);
    return () => clearInterval(timer);
  }, []);

  const toggleMonitoring = () => {
    if (isMonitoring) {
      setIsMonitoring(false);
      setAlertingCameraIds([]);
      setLastAnalysis(null);
      alertSequenceCountRef.current = 0;
      lastNotificationTimeRef.current = 0;
      setIsSimulating(false);
      setActiveCamStatuses({});
    } else {
      setIsMonitoring(true);
      const initialStatuses: Record<string, boolean> = {};
      cameras.forEach(c => initialStatuses[c.id] = true);
      setActiveCamStatuses(initialStatuses);
      setLastAnalysis({
        description: "🚀 Sincronizzazione motore AI in corso...",
        isEmergency: false,
        threatLevel: "low",
        detectedEvents: []
      });
    }
  };

  const toggleSingleCamera = (id: string, e?: MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveCamStatuses(prev => {
      const isPresentlyActive = prev[id];
      if (isPresentlyActive) {
        // Turning off: stop the physical stream if it exists
        const stream = streamsRef.current.get(id);
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
          streamsRef.current.delete(id);
        }
        // Also remove the videoRef so it doesn't try to play null
        videoRefs.current.delete(id);
      } else {
        // Turning on: we trigger startCameras after state updates
        setTimeout(startCameras, 100);
      }
      return {
        ...prev,
        [id]: !isPresentlyActive
      };
    });
  };

  const deleteCamera = (id: string, e?: MouseEvent) => {
    if (e) e.stopPropagation();
    setCameraToDelete(id);
  };

  const confirmDelete = async () => {
    if (!cameraToDelete) return;
    
    // Stop the stream if it exists
    const stream = streamsRef.current.get(cameraToDelete);
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      streamsRef.current.delete(cameraToDelete);
    }
    
    await supabase.from('cameras').delete().eq('id', cameraToDelete);
    fetchUserData();
    
    setCameraToDelete(null);
  };

  const sendManualTestAlarm = async () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    if (!isMonitoring) {
      setGlobalModal({
        type: 'error',
        title: 'Sistema Standby',
        message: 'Per inviare un allarme di test con foto, devi prima avviare la vigilanza premendo il pulsante "VIGILA".'
      });
      return;
    }

    const activeCams = cameras.filter(c => activeCamStatuses[c.id]);
    if (activeCams.length === 0) {
      setGlobalModal({
        type: 'error',
        title: 'Nessuna Camera Attiva',
        message: 'Non ci sono telecamere attive al momento. Assicurati che almeno una telecamera sia abilitata.'
      });
      return;
    }

    let sentCount = 0;
    let lastErrorMsg = "";

    for (const cam of activeCams) {
      const img = imgRefs.current.get(cam.id);

      // Prepara canvas con dimensioni default
      canvas.width = 640;
      canvas.height = 480;
      // Sfondo nero di default (come prima)
      context.fillStyle = "#000000";
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Prova a catturare il frame dalla sorgente migliore disponibile
      if ((cam.type === 'ip' || cam.type === 'onvif') && img && img.naturalWidth > 0) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
      } else if (cam.type === 'webcam' || cam.type === 'browser') {
        // Prova a catturare dalla webcam (con fallback a frame nero se non pronta)
        const readyVideo = await captureFromWebcam(cam.id);
        if (readyVideo && readyVideo.videoWidth > 0) {
          canvas.width = readyVideo.videoWidth;
          canvas.height = readyVideo.videoHeight;
          context.drawImage(readyVideo, 0, 0, canvas.width, canvas.height);
        }
        // Se non pronta: rimane il frame nero → va bene lo stesso
      }

      // Invia SEMPRE (anche con foto nera se cam non disponibile)
      const screenshot = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
      const res = await sendNotification(`[TEST MANUALE] Allarme inviato manualmente per verificare la ricezione delle immagini dalla camera: ${cam.name}`, screenshot);

      if (res.success) {
        setIncidents(prev => [{
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          cameraId: cam.id,
          cameraName: cam.name,
          description: `[TEST MANUALE] Notifica inviata con successo (${cam.name})`,
          threatLevel: "medium",
          screenshot: canvas.toDataURL("image/jpeg", 0.8)
        }, ...prev]);
        sentCount++;
      } else {
        lastErrorMsg = res.error || "Errore sconosciuto";
      }
    }

    if (sentCount > 0) {
      setGlobalModal({
        type: 'success',
        title: 'Test Inviato',
        message: `L'allarme di test è stato inoltrato correttamente per ${sentCount} telecamere attive.`
      });
    } else {
      setGlobalModal({
        type: 'error',
        title: 'Errore Invio Allarme',
        message: lastErrorMsg
          ? `Impossibile inviare la notifica email. Dettaglio errore: ${lastErrorMsg}`
          : 'Errore sconosciuto durante l\'invio.'
      });
    }
  };

  const startCameras = async () => {
    // Wait a brief moment to ensure refs are populated after mount
    await new Promise(resolve => setTimeout(resolve, 300));
    
    for (const cam of cameras) {
      const videoEl = videoRefs.current.get(cam.id);
      if (!videoEl) continue;

      if (cam.type === "webcam") {
        try {
          let stream = streamsRef.current.get(cam.id);
          if (!stream || !stream.active) {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamsRef.current.set(cam.id, stream);
          }
          if (videoEl.srcObject !== stream) {
            videoEl.srcObject = stream;
            videoEl.play().catch(e => console.warn("Video play interrupted", e));
          }
        } catch (err) {
          console.error(`Camera ${cam.id} access error:`, err);
        }
      } else if (cam.type === "browser") {
        const stream = streamsRef.current.get(cam.id);
        if (stream && videoEl.srcObject !== stream) {
          videoEl.srcObject = stream;
          videoEl.play().catch(e => console.warn("Video play interrupted", e));
        }
      } else if ((cam.type === "ip" || cam.type === "onvif") && cam.url) {
        // IP/ONVIF cameras are handled by IPCameraPlayer via backend polling
      }
    }
  };

  const stopCameras = () => {
    streamsRef.current.forEach(stream => {
      stream.getTracks().forEach(track => {
        track.stop();
        stream.removeTrack(track);
      });
    });
    streamsRef.current.clear();
    videoRefs.current.forEach(video => {
      video.srcObject = null;
      video.load(); // Reset video element
    });
  };

  const handleDetectionAlert = (cam: Camera, result: any, canvas: HTMLCanvasElement) => {
    setAlertingCameraIds(prev => prev.includes(cam.id) ? prev : [...prev, cam.id]);
    playAlertSound();
    const desc = result.description;
    const now = Date.now();
    const timeSinceLast = now - lastNotificationTimeRef.current;
    let shouldNotify = false;

    if (alertSequenceCountRef.current === 0) {
      shouldNotify = true;
    } else if (alertSequenceCountRef.current === 1 && timeSinceLast >= 20000) {
      shouldNotify = true;
    } else if (alertSequenceCountRef.current > 1 && timeSinceLast >= 10000) {
      shouldNotify = true;
    }

    const screenshot = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
    
    if (shouldNotify) {
      sendNotification(desc, screenshot);
      lastNotificationTimeRef.current = now;
      alertSequenceCountRef.current += 1;
    }
    
    setIncidents(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      cameraId: cam.id,
      cameraName: cam.name,
      timestamp: new Date(),
      description: desc,
      threatLevel: result.threatLevel || "high",
      screenshot: screenshot
    }, ...prev]);
  };

  const stopActiveAlert = (camId?: string) => {
    if (camId) {
      setAlertingCameraIds(prev => prev.filter(id => id !== camId));
    } else {
      setAlertingCameraIds([]);
    }
    alertSequenceCountRef.current = 0;
  };

  const captureAndAnalyze = useCallback(async () => {
    if (isAnalyzing || !canvasRef.current || cameras.length === 0) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    // Logic: If we are in single view, prioritize the active camera. 
    // In multi-view or if no active cam, use rotation.
    let cam;
    if (!isMultiView && activeCameraId) {
      cam = cameras.find(c => c.id === activeCameraId);
    } 
    
    if (!cam) {
      const camIndex = camRotationIndexRef.current % cameras.length;
      cam = cameras[camIndex];
      camRotationIndexRef.current += 1;
    }

    if (!cam) return;

    const img = imgRefs.current.get(cam.id);
    const video = videoRefs.current.get(cam.id);
    
    let base64Image = '';
    let success = false;

    if ((cam.type === 'ip' || cam.type === 'onvif') && img) {
      canvas.width = img.naturalWidth || 1280;
      canvas.height = img.naturalHeight || 720;
      if (canvas.width > 0 && canvas.height > 0) {
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        base64Image = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
        success = true;
      }
    } else if (cam.type === 'webcam' || cam.type === 'browser') {
      const readyVideo = await captureFromWebcam(cam.id);
      if (readyVideo) {
        canvas.width = readyVideo.videoWidth || 640;
        canvas.height = readyVideo.videoHeight || 480;
        context.drawImage(readyVideo, 0, 0, canvas.width, canvas.height);
        base64Image = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
        success = true;
      }
    } else if (video && video.readyState >= 2) {
      // Fallback for any other video type
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      base64Image = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
      success = true;
    }

    if (success && base64Image) {
      const isCamAiDisabled = disabledAiCameraIds.includes(cam.id);
      if ((!isAiEnabled || isCamAiDisabled) && !isSimulating) return; // Skip analysis if AI is disabled globally or for this specific camera

      setLastAnalysis(prev => ({
        description: `🔄 Analisi in corso: ${cam.name}...`,
        isEmergency: prev?.isEmergency || false,
        threatLevel: prev?.threatLevel || "low"
      }));

      if (isSimulating) {
        setAlertingCameraIds(prev => prev.includes(cam.id) ? prev : [...prev, cam.id]);
        playAlertSound();
        handleDetectionAlert(cam, { description: `[CAMERA: ${cam.name}] SIMULAZIONE: Rapina` }, canvas);
        return;
      }

      setIsAnalyzing(true);
      try {
        const triggerDescriptionsMap: Record<string, string> = {};
        availableTriggers.forEach(t => {
          triggerDescriptionsMap[t.id] = t.description;
        });
        const result = await analyzeFrame(base64Image, cam.enabledTriggers, cam.location, aiModel, cam.zones, triggerDescriptionsMap);
        if (cam.id === activeCameraId || result.isEmergency) {
          setLastAnalysis(result);
        }
        if (result.isEmergency) {
          handleDetectionAlert(cam, result, canvas);
        }
      } catch (err: any) {
        console.error("AI Analysis failed:", err);
        if (err.message?.includes("quota") || err.message?.includes("RESOURCE_EXHAUSTED")) {
          setLastAnalysis({
            description: "⚠️ Limite API raggiunto. Il sistema sta attendendo il ripristino della quota (solitamente 60s). Il monitoraggio continua...",
            isEmergency: false,
            threatLevel: "low"
          });
        }
      } finally {
        setIsAnalyzing(false);
      }
    }
  }, [cameras, activeCameraId, isAnalyzing, isSimulating, isMultiView, isAiEnabled, disabledAiCameraIds]);

  useEffect(() => {
    if (isMonitoring) {
      startCameras();
    } else {
      stopCameras();
    }
    return () => {
      stopCameras();
    };
  }, [isMonitoring, cameras]);

  // Stable reference to analysis function to prevent interval jitter
  const analysisFnRef = useRef(captureAndAnalyze);
  useEffect(() => { analysisFnRef.current = captureAndAnalyze; }, [captureAndAnalyze]);

  useEffect(() => {
    if (isMonitoring) {
      // 15s interval ensures we stay within the 5 RPM limit of Gemini Free Tier
      analysisIntervalRef.current = setInterval(() => {
        analysisFnRef.current();
      }, 15000); 
    } else {
      if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
    }
    return () => {
      if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
    };
  }, [isMonitoring]);

  // ── SMART ZONE DRAWING HANDLERS ──────────────────────────────────────────

  const getRelativePos = (e: MouseEvent | TouchEvent, camId: string) => {
    const card = cardRefs.current.get(camId);
    if (!card) return null;
    const rect = card.getBoundingClientRect();
    const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    };
  };

  const handleZoneStart = (e: MouseEvent | TouchEvent, camId: string) => {
    if (!isEditingZones) return;
    if (activeCameraId !== camId) setActiveCameraId(camId);
    const pos = getRelativePos(e, camId);
    if (!pos) return;
    const { x, y } = pos;
    const cam = cameras.find(c => c.id === camId);
    for (const zone of [...(cam?.zones || [])].reverse()) {
      const hs = 0.05; // Balanced sensitivity
      for (let i = 0; i < zone.points.length; i++) {
        if (Math.abs(x - zone.points[i].x) < hs && Math.abs(y - zone.points[i].y) < hs) {
          if (e.cancelable) e.preventDefault();
          setDraggingZoneId(zone.id); setDragType(i);
          setSelectedZoneId(zone.id);
          setDragStart({ x, y, initialPoints: JSON.parse(JSON.stringify(zone.points)) });
          return;
        }
      }
      const bx = [Math.min(...zone.points.map(p => p.x)), Math.max(...zone.points.map(p => p.x))];
      const by = [Math.min(...zone.points.map(p => p.y)), Math.max(...zone.points.map(p => p.y))];
      if (x > bx[0] && x < bx[1] && y > by[0] && y < by[1]) {
        if (e.cancelable) e.preventDefault();
        setDraggingZoneId(zone.id); setDragType('move');
        setSelectedZoneId(zone.id);
        setDragStart({ x, y, initialPoints: JSON.parse(JSON.stringify(zone.points)) });
        return;
      }
    }
    if (e.cancelable) e.preventDefault();
    setCurrentDrawingZone({ points: [{ x, y }, { x, y }, { x, y }, { x, y }], type: 'alert' });
  };

  const handleZoneMove = (e: MouseEvent | TouchEvent) => {
    if (!isEditingZones || (!currentDrawingZone && !draggingZoneId) || !activeCameraId) return;
    if (e.cancelable) e.preventDefault();
    const pos = getRelativePos(e as any, activeCameraId);
    if (!pos) return;
    const { x: cx, y: cy } = pos;
    
    if (draggingZoneId && dragStart) {
      let dx = cx - dragStart.x;
      let dy = cy - dragStart.y;
      
      setCameras(prev => prev.map(c => c.id !== activeCameraId ? c : {
        ...c,
        zones: (c.zones || []).map(z => z.id !== draggingZoneId ? z : {
          ...z,
          points: typeof dragType === 'number'
            ? z.points.map((p, i) => i === dragType ? { x: Math.max(0, Math.min(1, cx)), y: Math.max(0, Math.min(1, cy)) } : p)
            : (() => {
                // Precise area move: avoid distortion at boundaries
                const initialPoints = dragStart.initialPoints as Point[];
                const minX = Math.min(...initialPoints.map(p => p.x));
                const maxX = Math.max(...initialPoints.map(p => p.x));
                const minY = Math.min(...initialPoints.map(p => p.y));
                const maxY = Math.max(...initialPoints.map(p => p.y));
                
                // Clamp delta so the WHOLE box stays within [0,1]
                const clampedDx = Math.max(-minX, Math.min(1 - maxX, dx));
                const clampedDy = Math.max(-minY, Math.min(1 - maxY, dy));
                
                return initialPoints.map(p => ({ x: p.x + clampedDx, y: p.y + clampedDy }));
              })()
        })
      }));
    } else if (currentDrawingZone?.points) {
      const s = currentDrawingZone.points[0];
      setCurrentDrawingZone(prev => ({ ...prev, points: [s, { x: cx, y: s.y }, { x: cx, y: cy }, { x: s.x, y: cy }] }));
    }
  };

  const handleZoneEnd = () => {
    if (!isEditingZones) return;
    if (currentDrawingZone?.points && activeCameraId) {
      const xs = currentDrawingZone.points.map(p => p.x);
      const ys = currentDrawingZone.points.map(p => p.y);
      if (Math.max(...xs) - Math.min(...xs) > 0.02 && Math.max(...ys) - Math.min(...ys) > 0.02) {
        const zid = `zone-${Date.now()}`;
        const newZone: Zone = {
          id: zid,
          type: currentDrawingZone.type as ZoneType,
          points: currentDrawingZone.points as Point[],
          label: `Zona ${(cameras.find(c => c.id === activeCameraId)?.zones?.length || 0) + 1}`
        };
        setSelectedZoneId(zid);
        setCameras(prev => prev.map(c => c.id !== activeCameraId ? c : { ...c, zones: [...(c.zones || []), newZone] }));
      }
    }
    setCurrentDrawingZone(null); setDraggingZoneId(null); setDragType(null); setDragStart(null);
  };

  const deleteZone = (zoneId: string) => setCameras(prev => prev.map(c => c.id !== activeCameraId ? c : { ...c, zones: (c.zones || []).filter(z => z.id !== zoneId) }));
  const updateZoneType = (zoneId: string, type: ZoneType) => setCameras(prev => prev.map(c => c.id !== activeCameraId ? c : { ...c, zones: (c.zones || []).map(z => z.id === zoneId ? { ...z, type } : z) }));

  // ── END SMART ZONE HANDLERS ────────────────────────────────────────────────

  const saveCameraZones = async (cameraId: string) => {
    if (!user) return;
    const cam = cameras.find(c => c.id === cameraId);
    if (!cam) return;
    
    try {
      const { error } = await supabase
        .from('cameras')
        .update({ zones: cam.zones || [] })
        .eq('id', cameraId);
        
      if (error) throw error;
      console.log(`[Supabase] Zone salvate con successo per la camera: ${cam.name}`);
    } catch (err: any) {
      console.error("Errore nel salvataggio delle zone su Supabase:", err);
      setGlobalModal({
        type: 'error',
        title: 'Errore Salvataggio',
        message: 'Non è stato possibile salvare le zone nel database. Controlla la connessione e riprova.'
      });
    }
  };

  const saveCamera = async (cam: Camera) => {
    if (!user) return;
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const finalCam: any = { 
        ...cam, 
        user_id: user.id, 
        enabled_triggers: cam.enabledTriggers, 
        rtsp_path: cam.rtspPath 
      };
      
      // Handle ONVIF URL construction
      if (finalCam.type === 'onvif' && finalCam.ip && finalCam.username) {
        // Build the URL only if it's missing or needs update
        finalCam.url = `rtsp://${finalCam.username}:${finalCam.password}@${finalCam.ip}:${finalCam.port || 554}${finalCam.rtspPath || '/stream1'}`;
      } else if (finalCam.type === 'ip' && !finalCam.url) {
        // Fallback for IP type if URL is missing
        finalCam.url = `rtsp://${finalCam.username}:${finalCam.password}@${finalCam.ip}:${finalCam.port || 554}/stream1`;
      }
      
      const dbCam = { ...finalCam };
      // If it's a new camera (temporary ID), remove ID to let Supabase generate one
      if (dbCam.id?.startsWith('cam-')) {
        delete dbCam.id;
      }
      
      // Clean up fields that shouldn't be in the DB
      delete dbCam.enabledTriggers; 
      delete dbCam.rtspPath;
      
      console.log("[Supabase] Saving camera:", dbCam);
      
      const { error } = await supabase.from('cameras').upsert(dbCam);
      if (error) throw error;
      
      await fetchUserData();
      setSaveStatus({ type: 'success', message: 'Camera salvata con successo!' });
      
      // Close modal after a short delay to show success
      setTimeout(() => {
        setShowCameraModal(false);
        setEditingCamera(null);
        setSaveStatus(null);
      }, 1500);

    } catch (err: any) {
      console.error("Errore salvataggio camera:", err);
      setSaveStatus({ 
        type: 'error', 
        message: err.message?.includes('PGRST205') 
          ? 'Errore: Tabella "cameras" non trovata nel database. Crea la tabella su Supabase.' 
          : `Errore: ${err.message || 'Errore nel salvataggio'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openCameraConfig = (cam?: Camera) => {
    setEditingCamera(cam || {
      id: `cam-${Date.now()}`,
      name: "Tapo C220",
      location: "Ingresso",
      type: "onvif",
      url: "",
      ip: "192.168.1.",
      port: 554,
      username: "Testcamera",
      password: "12345678",
      rtspPath: "/stream1",
      status: "online",
      enabledTriggers: availableTriggers.slice(0, 3).map(t => t.id)
    });
    setActiveCameraTab('info');
    setShowCameraModal(true);
  };

  if (authLoading) return (
    <div className="min-h-screen bg-[#050810] flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin shadow-[0_0_20px_rgba(37,99,235,0.2)]" />
        <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] animate-pulse">Sincronizzazione Vigil.AI...</p>
      </div>
    </div>
  );

  if (!user) return <Auth />;


  return (
    <div className={`min-h-screen bg-[#050810] text-slate-300 font-sans selection:bg-blue-500/30 flex flex-col ${isMobile35 ? 'h-screen w-screen overflow-hidden' : 'overflow-hidden'}`}>
      

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col min-w-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 ${isMobile35 ? 'h-screen w-screen overflow-hidden p-0 m-0 pb-0' : 'pb-20 lg:pb-0 overflow-y-auto'}`}>
        
        {!isMobile35 && (
          <header className="glass m-0 sm:m-4 lg:m-8 p-3 sm:p-4 lg:p-6 rounded-none sm:rounded-[32px] lg:rounded-[40px] flex flex-row items-center justify-between sticky top-0 sm:top-4 lg:top-8 z-[100] border-white/5 shadow-2xl shrink-0 w-full">
          
          {/* TOP ROW / IDENTITY */}
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 shrink-0">
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-14 lg:h-14 glass rounded-xl sm:rounded-2xl lg:rounded-3xl flex items-center justify-center bg-blue-600/10 border-blue-500/20 group hover:scale-110 transition-all duration-500 shrink-0">
                <ShieldCheck size={20} className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)] sm:w-6 sm:h-6" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm sm:text-xl lg:text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-1">
                  VIGIL.<span className="text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.8)]">AI</span>
                </h2>
                <div className="hidden md:flex items-center gap-3 lg:gap-4 mt-0.5">
                  <div className="flex items-center gap-2 text-[8px] lg:text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    <span className={`w-1.5 h-1.5 rounded-full ${isMonitoring ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-slate-700'}`} />
                    {isMonitoring ? 'Sistema Attivo' : 'In Attesa'}
                  </div>
                  <div className="w-px h-2.5 bg-white/10" />
                  <div className="flex items-center gap-2 text-[8px] lg:text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    <LayoutGrid size={10} /> {cameras.length} Camere
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile-only status badge - Hidden on tiny screens */}
            <div className="hidden sm:flex md:hidden items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/5 shrink-0">
              <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <span className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-slate-700'}`} />
                {isMonitoring ? 'Attivo' : 'Attesa'}
              </div>
              <div className="w-px h-3 bg-white/10" />
              <div className="flex items-center gap-1 text-[9px] font-black text-blue-400 uppercase tracking-widest">
                {cameras.length} CAM
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS / TOOLBAR */}
          <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-4 overflow-x-auto custom-scrollbar flex-nowrap w-full pl-2 justify-end">
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button 
                onClick={() => setIsMultiView(!isMultiView)}
                className={`p-2 sm:p-3 rounded-lg sm:rounded-xl lg:rounded-2xl transition-all border ${isMultiView ? 'bg-white/10 border-white/20 text-white' : 'glass border-white/5 text-slate-500 hover:text-white'}`}
                title="Vista Griglia"
              >
                <LayoutGrid size={14} className="sm:w-[18px] sm:h-[18px]" />
              </button>

              {/* Gemini API Key Bar - Solo Desktop/TV */}
              <div className="hidden md:flex items-center gap-2 relative">
                <button
                  type="button"
                  onClick={() => setShowApiKeyHeaderInput(!showApiKeyHeaderInput)}
                  className={`p-3 rounded-xl lg:rounded-2xl transition-all border ${showApiKeyHeaderInput || appSettings.geminiKey ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'glass border-white/5 text-slate-500 hover:text-white'}`}
                  title="Gestisci API Key Gemini"
                >
                  <Key size={18} />
                </button>
                
                <AnimatePresence>
                  {showApiKeyHeaderInput && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 220, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      className="overflow-hidden flex items-center gap-2 bg-slate-900/90 border border-white/10 rounded-xl px-2 py-1"
                    >
                      <input
                        type="password"
                        value={appSettings.geminiKey}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAppSettings(prev => ({ ...prev, geminiKey: val }));
                          localStorage.setItem("vigilai_gemini_key", val);
                        }}
                        onFocus={() => {
                          if (useVirtualKeyboard) {
                            setKeyboardTarget({ id: 'settingsGeminiKey', title: 'Chiave API Gemini' });
                          }
                        }}
                        onBlur={() => backupApiKeyToSupabase(appSettings.geminiKey)}
                        placeholder="API Key Gemini"
                        className="bg-transparent text-xs text-white outline-none w-full px-1 py-1 font-mono"
                      />
                      {!appSettings.geminiKey && (
                        <button
                          type="button"
                          onClick={() => setShowApiKeyModal(true)}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-[9px] font-black uppercase whitespace-nowrap hover:bg-blue-500"
                        >
                          Ottieni
                        </button>
                      )}
                      {appSettings.geminiKey && (
                        <button
                          type="button"
                          onClick={() => setShowApiKeyModal(true)}
                          className="text-[9px] text-slate-400 hover:text-white uppercase font-bold px-1"
                          title="Mostra QR Code / Info"
                        >
                          Info
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Pulsante Forza Tastiera Virtuale */}
              <button 
                type="button"
                onClick={() => setUseVirtualKeyboard(!useVirtualKeyboard)}
                className={`p-2 sm:p-3 rounded-lg sm:rounded-xl lg:rounded-2xl transition-all border ${useVirtualKeyboard ? 'bg-blue-600/20 border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'glass border-white/5 text-slate-500 hover:text-white'}`}
                title={useVirtualKeyboard ? "Tastiera Virtuale Attiva" : "Tastiera Virtuale Disattivata"}
              >
                <Keyboard size={14} className="sm:w-[18px] sm:h-[18px]" />
              </button>

              <button 
                onClick={() => {
                  setIsReordering(!isReordering);
                  if (!isReordering) setIsEditingZones(false);
                }}
                className={`p-2 sm:p-3 rounded-lg sm:rounded-xl lg:rounded-2xl transition-all border ${isReordering ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] border-blue-400' : 'glass border-white/5 text-slate-500 hover:text-white'}`}
                title={isReordering ? "Salva Ordine" : "Ordina Griglia"}
              >
                <Move size={14} className={`sm:w-[18px] sm:h-[18px] ${isReordering ? "animate-pulse" : ""}`} />
              </button>

              <button 
                onClick={() => openCameraConfig()}
                className="p-2 sm:p-3 glass border-white/5 text-slate-500 hover:text-white rounded-lg sm:rounded-xl lg:rounded-2xl transition-all"
                title="Aggiungi Camera"
              >
                <Plus size={14} className="sm:w-[18px] sm:h-[18px]" />
              </button>

              <button 
                onClick={() => setShowSettings(true)}
                className="p-2 sm:p-3 glass border-white/5 text-slate-500 hover:text-white rounded-lg sm:rounded-xl lg:rounded-2xl transition-all"
                title="Impostazioni"
              >
                <Settings size={14} className="sm:w-[18px] sm:h-[18px]" />
              </button>

              <button 
                onClick={handleLogout}
                className="p-2 sm:p-3 glass border-white/5 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg sm:rounded-xl lg:rounded-2xl transition-all"
                title="Logout"
              >
                <LogOut size={14} className="sm:w-[18px] sm:h-[18px]" />
              </button>

              <button
                onClick={async () => {
                  if (isEditingZones && activeCameraId) {
                    await saveCameraZones(activeCameraId);
                  }
                  setIsEditingZones(!isEditingZones);
                }}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl lg:rounded-2xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] transition-all border ${
                  isEditingZones
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                    : 'glass border-white/5 text-slate-500 hover:text-white'
                }`}
              >
                <Scan size={10} className={`sm:w-[14px] sm:h-[14px] ${isEditingZones ? 'animate-pulse' : ''}`} />
                <span className="inline">{isEditingZones ? 'Salva Zone' : 'Zone'}</span>
              </button>

              <button
                onClick={() => setIsAiEnabled(!isAiEnabled)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl lg:rounded-2xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] transition-all border ${
                  isAiEnabled
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                    : 'glass border-white/5 text-slate-500 hover:text-white'
                }`}
                title={isAiEnabled ? 'Disattiva AI' : 'Attiva AI'}
              >
                <Cpu size={10} className={`sm:w-[14px] sm:h-[14px] ${isAiEnabled && isMonitoring ? 'animate-pulse' : ''}`} />
                <span className="hidden lg:inline">{isAiEnabled ? 'AI Core ON' : 'AI Core OFF'}</span>
              </button>
            </div>

            <motion.button 
              whileHover={{ 
                backgroundColor: isMonitoring ? 'rgba(255,255,255,0.15)' : '#f59e0b',
                color: isMonitoring ? '#fff' : '#000',
                boxShadow: isMonitoring ? 'none' : '0 0 30px rgba(245,158,11,0.4)'
              }}
              whileTap={{ scale: 0.98 }}
              onClick={toggleMonitoring}
              className={`flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 lg:px-10 h-[36px] sm:h-[44px] lg:h-[54px] rounded-lg sm:rounded-xl lg:rounded-2xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] transition-all shadow-2xl ${isMonitoring ? 'bg-white/10 text-white border border-white/20' : 'bg-blue-600 text-white shadow-blue-500/20'}`}
            >
              {isMonitoring ? <VideoOff size={14} className="sm:w-[18px] sm:h-[18px]" /> : <Video size={14} className="sm:w-[18px] sm:h-[18px]" />}
              <span>{isMonitoring ? 'OFF' : 'VIGILA'}</span>
            </motion.button>

            {serverInfo && (
              <>
                <button 
                  onClick={() => {
                    setActiveQrTab('local');
                    setGlobalModal({
                      type: 'info',
                      title: 'Quick Connect',
                      message: 'Scansiona il QR Code con il tablet per collegarlo istantaneamente.'
                    });
                    fetch('/api/vpn/status')
                      .then(res => res.json())
                      .then(data => {
                        if (data.success) setVpnStatus(data);
                      })
                      .catch(console.error);
                  }}
                  className="p-2 sm:p-3 bg-green-600/20 border border-green-500/30 text-green-400 rounded-lg sm:rounded-xl lg:rounded-2xl hover:bg-green-600 hover:text-white transition-all shadow-lg shadow-green-500/10"
                  title="Collega Tablet (Locale)"
                >
                  <Scan size={14} className="sm:w-[20px] sm:h-[20px]" />
                </button>

                <button 
                  onClick={() => {
                    setActiveQrTab('tailscale');
                    setGlobalModal({
                      type: 'info',
                      title: 'Quick Connect',
                      message: 'Configurazione e autorizzazione della VPN Tailscale per connessione remota.'
                    });
                    setLoadingVpn(true);
                    fetch('/api/vpn/status')
                      .then(res => res.json())
                      .then(data => {
                        if (data.success) setVpnStatus(data);
                      })
                      .catch(console.error)
                      .finally(() => setLoadingVpn(false));
                  }}
                  className="p-2 sm:p-3 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg sm:rounded-xl lg:rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-500/10 flex items-center justify-center"
                  title="VPN Remota (Tailscale)"
                >
                  <Globe size={14} className="sm:w-[20px] sm:h-[20px]" />
                </button>
              </>
            )}
          </div>
        </header>
        )}

        {/* Content Scrolling Area */}
        {isMobile35 ? (
          <div className="w-full h-full flex flex-row bg-black p-1 gap-1 text-slate-300">
            {cameras.length > 0 && activeCameraId ? (
              (() => {
                const activeCamera = cameras.find(c => c.id === activeCameraId) || cameras[0];
                return (
                  <>
                    {/* Left Section: Top Bar + Video Player */}
                    <div className="flex-1 flex flex-col h-full gap-1 overflow-hidden">
                      {/* Top Bar for Camera Navigation */}
                      <div className="flex items-center justify-between bg-slate-900/90 border border-white/10 rounded-xl p-1 shrink-0">
                        <button
                          type="button"
                          onClick={goToPrevCamera}
                          className="px-3 py-1.5 bg-white/5 border border-white/5 text-white rounded-lg active:scale-95 cursor-pointer"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        
                        <div className="flex items-center gap-1.5 px-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${isMonitoring ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`} />
                          <span className="text-[10px] font-black text-white uppercase tracking-wider">{activeCamera.name}</span>
                        </div>

                        <button
                          type="button"
                          onClick={goToNextCamera}
                          className="px-3 py-1.5 bg-white/5 border border-white/5 text-white rounded-lg active:scale-95 cursor-pointer"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>

                      {/* Video Feed Box */}
                      <div 
                        className="flex-1 bg-slate-950 rounded-xl overflow-hidden relative border border-white/5"
                        onMouseDown={(e) => handleZoneStart(e as any, activeCamera.id)}
                        onTouchStart={(e) => handleZoneStart(e as any, activeCamera.id)}
                        onMouseMove={(e) => handleZoneMove(e as any)}
                        onTouchMove={(e) => handleZoneMove(e as any)}
                        onMouseUp={handleZoneEnd}
                        onTouchEnd={handleZoneEnd}
                        onMouseLeave={handleZoneEnd}
                      >
                        {/* Drag / Swipe camera view wrapper */}
                        <motion.div
                          key={activeCamera.id}
                          drag={!isEditingZones ? "x" : undefined}
                          dragConstraints={{ left: 0, right: 0 }}
                          onDragEnd={handleDragEnd}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          className="w-full h-full"
                          ref={(el) => { if (el) cardRefs.current.set(activeCamera.id, el as HTMLDivElement); }}
                        >
                          {isMonitoring && activeCamStatuses[activeCamera.id] ? (
                            (activeCamera.type === 'ip' || activeCamera.type === 'onvif') ? (
                              <IPCameraPlayer 
                                url={activeCamera.url || ''} 
                                isAlertActive={alertingCameraIds.includes(activeCamera.id)} 
                                isNightMode={isNightMode} 
                                imgRefCallback={(el) => { if (el) imgRefs.current.set(activeCamera.id, el); else imgRefs.current.delete(activeCamera.id); }} 
                              />
                            ) : (
                              <video 
                                ref={(el) => { if (el) videoRefs.current.set(activeCamera.id, el); else videoRefs.current.delete(activeCamera.id); }}
                                autoPlay 
                                muted 
                                playsInline 
                                className={`w-full h-full object-cover transition-all duration-1000 ${alertingCameraIds.includes(activeCamera.id) ? 'opacity-40 saturate-150' : 'opacity-100'}`}
                                style={isNightMode ? { filter: 'grayscale(1) brightness(1.2) contrast(1.1) sepia(0.2) hue-rotate(180deg)' } : {}}
                              />
                            )
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 text-slate-500 bg-slate-950">
                              <VideoOff size={24} />
                              <div className="text-center">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] animate-pulse">Segnale Assente</p>
                                <p className="text-[7px] font-bold text-slate-700 mt-0.5">SISTEMA IN STANDBY</p>
                              </div>
                            </div>
                          )}
                        </motion.div>

                        {/* UI Overlays for Video (DRAWING MODE in mobile) */}
                        {isEditingZones && activeCameraId === activeCamera.id && (
                          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-auto w-[95%]">
                            <motion.div 
                              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                              className="glass p-1 rounded-xl bg-slate-950/90 backdrop-blur-3xl border-amber-500/30 shadow-lg flex items-center justify-center gap-1"
                            >
                              {(['restricted', 'alert', 'privacy', 'excluded'] as ZoneType[]).map(t => {
                                const isSelected = selectedZoneId ? activeCamera.zones?.find(z => z.id === selectedZoneId)?.type === t : false;
                                return (
                                  <button
                                    key={t}
                                    onClick={() => selectedZoneId && updateZoneType(selectedZoneId, t)}
                                    className={`flex-1 h-7 px-1.5 rounded-lg border text-[7px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                                      isSelected
                                      ? (t === 'restricted' ? 'bg-red-500 border-red-400 text-white' : t === 'alert' ? 'bg-amber-500 border-amber-400 text-white' : t === 'privacy' ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-500 border-slate-400 text-white')
                                      : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                                    }`}
                                    title={t}
                                  >
                                    <div className={`w-1.5 h-1.5 rounded-full ${t === 'restricted' ? 'bg-red-500' : t === 'alert' ? 'bg-amber-500' : t === 'privacy' ? 'bg-black' : 'bg-slate-400'}`} />
                                    <span>{t === 'restricted' ? 'Vietata' : t === 'alert' ? 'Allerta' : t === 'privacy' ? 'Privacy' : 'Esclusa'}</span>
                                  </button>
                                );
                              })}
                              
                              {selectedZoneId && (
                                <button 
                                  onClick={() => { deleteZone(selectedZoneId); setSelectedZoneId(null); }}
                                  className="p-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg border border-red-500/20 transition-all"
                                  title="Elimina Zona"
                                >
                                  <Trash2 size={10} />
                                </button>
                              )}
                              
                              <button 
                                onClick={async () => { 
                                  if (activeCameraId) {
                                    await saveCameraZones(activeCameraId);
                                  }
                                  setIsEditingZones(false); 
                                  setSelectedZoneId(null); 
                                }} 
                                className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg border border-white/5 transition-all"
                                title="Chiudi Configurazione"
                              >
                                <X size={10}/>
                              </button>
                            </motion.div>
                          </div>
                        )}

                        {/* ── SMART ZONE SVG OVERLAY (mobile) ── */}
                        <div className="absolute inset-0 pointer-events-none z-20">
                          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                            {/* Existing zones */}
                            {activeCamera.zones?.map((zone) => {
                              const ZONE_COLORS: Record<string, { fill: string; stroke: string }> = {
                                restricted: { fill: 'rgba(239,68,68,0.12)', stroke: '#ef4444' },
                                alert:      { fill: 'rgba(245,158,11,0.10)', stroke: '#f59e0b' },
                                privacy:    { fill: 'rgba(0,0,0,0.65)',       stroke: '#64748b' },
                                excluded:   { fill: 'rgba(100,116,139,0.10)', stroke: '#64748b' },
                              };
                              const col = ZONE_COLORS[zone.type];
                              const xs = zone.points.map(p => p.x);
                              const ys = zone.points.map(p => p.y);
                              const cx = ((Math.min(...xs) + Math.max(...xs)) / 2 * 100).toFixed(1);
                              const labelY = (Math.min(...ys) * 100 - 4).toFixed(1);
                              const LABELS: Record<string, string> = { restricted: '🚫 VIETATA', alert: '⚠️ ALLERTA', privacy: '🔒 PRIVACY', excluded: '⬛ ESCLUSA' };
                              return (
                                <g key={zone.id}>
                                  <polygon
                                    points={zone.points.map(p => `${(p.x*100).toFixed(2)},${(p.y*100).toFixed(2)}`).join(' ')}
                                    fill={col.fill}
                                    stroke={col.stroke}
                                    strokeWidth="0.6"
                                    strokeDasharray={zone.type === 'excluded' ? '2,1' : undefined}
                                    style={{ pointerEvents: 'auto', cursor: isEditingZones ? 'grab' : 'default' }}
                                    className="transition-colors duration-300"
                                  />
                                  {isEditingZones && activeCameraId === activeCamera.id && zone.points.map((p, i) => (
                                    <g key={i} className="zone-control-btn" style={{pointerEvents:'auto',cursor:'pointer'}}>
                                      <circle cx={p.x*100} cy={p.y*100} r="6" fill="transparent" />
                                      <circle cx={p.x*100} cy={p.y*100} r="2.5" fill="white" stroke={col.stroke} strokeWidth="1" className="transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                                    </g>
                                  ))}
                                  <foreignObject x={Number(cx)-8} y={Number(labelY)} width="16" height="5" className="overflow-visible" style={{pointerEvents:'none'}}>
                                    <div className="flex justify-center">
                                      <span className="bg-black/80 backdrop-blur-sm text-white font-black uppercase tracking-widest whitespace-nowrap rounded-full border border-white/10 shadow-xl" style={{fontSize:'2.2px',padding:'0.5px 2px'}}>
                                        {LABELS[zone.type]}
                                      </span>
                                    </div>
                                  </foreignObject>
                                </g>
                              );
                            })}
                            {/* Drawing preview */}
                            {isEditingZones && activeCameraId === activeCamera.id && currentDrawingZone?.points && (
                              <polygon
                                points={currentDrawingZone.points.map(p => `${(p.x*100).toFixed(2)},${(p.y*100).toFixed(2)}`).join(' ')}
                                fill="rgba(245,158,11,0.08)"
                                stroke="#f59e0b"
                                strokeWidth="0.5"
                                strokeDasharray="2,1"
                              />
                            )}
                          </svg>
                        </div>
                        {/* ── END ZONE OVERLAY ── */}

                        {/* Alarm Overlay for the active camera */}
                        <AnimatePresence>
                          {alertingCameraIds.includes(activeCamera.id) && isMonitoring && (
                            <motion.div 
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              className="absolute inset-0 z-40 border-4 border-red-500/50 animate-pulse bg-red-950/40 flex flex-col items-center justify-center p-2"
                            >
                              <div className="p-2 rounded-full bg-red-600 animate-bounce mb-1">
                                <AlertTriangle className="text-white w-4 h-4" />
                              </div>
                              <h2 className="text-[10px] font-black text-white uppercase tracking-tighter text-center">ALLARME RILEVATO</h2>
                              <button 
                                onClick={() => stopActiveAlert(activeCamera.id)}
                                className="mt-1.5 px-3 py-1 bg-white text-red-600 rounded-lg font-black uppercase tracking-widest text-[8px] shadow-lg active:scale-95 transition-all"
                              >
                                Silenzia
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* AI DIAGNOSTICS & ANALYSIS FEED (compact for 3.5") */}
                      <div className="bg-[#0b0e17] border border-white/5 rounded-xl p-1.5 shrink-0 flex items-center justify-between gap-2 overflow-hidden">
                        <div className="flex items-center gap-1.5 flex-1 overflow-hidden">
                          <Cpu size={12} className="text-blue-400 animate-pulse shrink-0" />
                          <p className="text-[8px] font-semibold text-slate-300 leading-tight line-clamp-2">
                            {isMonitoring && isAiEnabled ? (
                              isAnalyzing ? "Elaborazione in corso..." : (lastAnalysis?.description || "In attesa di dati video...")
                            ) : !isAiEnabled && isMonitoring ? (
                              "AI Core disattivato."
                            ) : (
                              "Sistema in standby."
                            )}
                          </p>
                        </div>
                        
                        {/* Live Threat Bar */}
                        <div className="flex flex-col items-end gap-0.5 shrink-0 pl-2 border-l border-white/10">
                          <span className="text-[5px] font-black text-slate-500 uppercase tracking-widest">MINACCIA</span>
                          <div className="flex gap-0.5 w-10 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className={`flex-1 ${lastAnalysis?.threatLevel === 'low' ? 'bg-green-500' : 'bg-slate-800'}`} />
                            <div className={`flex-1 ${lastAnalysis?.threatLevel === 'medium' ? 'bg-orange-500' : 'bg-slate-800'}`} />
                            <div className={`flex-1 ${lastAnalysis?.threatLevel === 'high' ? 'bg-red-500' : 'bg-slate-800'}`} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Section: Fixed Toolbar Sidebar */}
                    <div className="w-14 h-full flex flex-col justify-between items-center bg-[#0d101e]/90 border border-white/10 rounded-xl p-1 shrink-0 gap-1.5">
                      <div className="flex flex-col gap-1.5 w-full items-center">
                        {/* Aggiungi Camera button */}
                        <button
                          type="button"
                          onClick={() => openCameraConfig()}
                          className="w-10 h-[34px] rounded-lg bg-blue-600/20 border border-blue-500/30 flex flex-col items-center justify-center text-blue-400 hover:text-white active:scale-95 cursor-pointer"
                          title="Aggiungi Camera"
                        >
                          <Plus size={14} />
                          <span className="text-[6px] font-black uppercase tracking-widest mt-0.5">Cam +</span>
                        </button>

                        {/* Options button */}
                        <button
                          type="button"
                          onClick={() => setShowSettings(true)}
                          className="w-10 h-[34px] rounded-lg bg-white/5 border border-white/5 flex flex-col items-center justify-center text-slate-400 hover:text-white active:scale-95 cursor-pointer"
                          title="Opzioni"
                        >
                          <Settings size={14} />
                          <span className="text-[6px] font-black uppercase tracking-widest mt-0.5">Opz</span>
                        </button>

                        {/* Logs button */}
                        <button
                          type="button"
                          onClick={() => setShowMobileLogsModal(true)}
                          className="w-10 h-[34px] rounded-lg bg-white/5 border border-white/5 flex flex-col items-center justify-center text-slate-400 hover:text-white active:scale-95 cursor-pointer"
                          title="Logs"
                        >
                          <History size={14} />
                          <span className="text-[6px] font-black uppercase tracking-widest mt-0.5">Log</span>
                        </button>

                        {/* AI Core Toggle button */}
                        <button
                          type="button"
                          onClick={() => setIsAiEnabled(!isAiEnabled)}
                          className={`w-10 h-[34px] rounded-lg border flex flex-col items-center justify-center active:scale-95 cursor-pointer ${
                            isAiEnabled
                              ? 'bg-blue-600/80 border-blue-400 text-white'
                              : 'bg-white/5 border-white/5 text-slate-500'
                          }`}
                          title={isAiEnabled ? "AI Core Attivo" : "AI Core Disattivo"}
                        >
                          <Cpu size={14} className={isAiEnabled && isMonitoring ? 'animate-pulse' : ''} />
                          <span className="text-[6px] font-black uppercase tracking-widest mt-0.5">AI</span>
                        </button>

                        {/* Vigil / Standby Toggle button */}
                        <button
                          type="button"
                          onClick={toggleMonitoring}
                          className={`w-10 h-[34px] rounded-lg border flex flex-col items-center justify-center active:scale-95 cursor-pointer ${
                            isMonitoring
                              ? 'bg-red-600/80 border-red-400 text-white'
                              : 'bg-white/5 border-white/5 text-slate-500'
                          }`}
                          title={isMonitoring ? "Vigilanza Attiva" : "Vigilanza in Standby"}
                        >
                          {isMonitoring ? <Video size={14} /> : <VideoOff size={14} />}
                          <span className="text-[6px] font-black uppercase tracking-widest mt-0.5">Vigila</span>
                        </button>

                        {/* Zone Toggle button */}
                        <button
                          type="button"
                          onClick={async () => {
                            if (isEditingZones && activeCameraId) {
                              await saveCameraZones(activeCameraId);
                            }
                            setIsEditingZones(!isEditingZones);
                          }}
                          className={`w-10 h-[34px] rounded-lg border flex flex-col items-center justify-center active:scale-95 cursor-pointer ${
                            isEditingZones
                              ? 'bg-amber-600/80 border-amber-400 text-white'
                              : 'bg-white/5 border-white/5 text-slate-500'
                          }`}
                          title={isEditingZones ? "Salva Zone" : "Modifica Zone"}
                        >
                          <Scan size={14} className={isEditingZones ? 'animate-pulse' : ''} />
                          <span className="text-[6px] font-black uppercase tracking-widest mt-0.5">Zone</span>
                        </button>
                      </div>

                      {/* Logout button */}
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-10 h-[34px] rounded-lg bg-red-950/40 border border-red-500/20 flex flex-col items-center justify-center text-red-400 hover:text-red-300 active:scale-95 cursor-pointer mt-1"
                        title="Logout"
                      >
                        <LogOut size={14} />
                        <span className="text-[6px] font-black uppercase tracking-widest mt-0.5">Esci</span>
                      </button>
                    </div>
                  </>
                );
              })()
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-3">
                <p>Nessuna camera configurata</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg active:scale-95 pointer-events-auto"
                >
                  Configura Sistema
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-1 sm:p-4 lg:p-10 custom-scrollbar relative">
          <div className="max-w-none mx-auto space-y-3 sm:space-y-6 lg:space-y-10">
            
            <div className="flex flex-col lg:flex-row gap-2 sm:gap-8 items-start">
              
              {/* Colonna Destra (Griglia Camere) - sopra su mobile, a dx su desktop */}
              <div className="flex-1 w-full order-1 lg:order-2">
                {/* Camera Grid Section */}
                <div
                  className={`grid gap-2 sm:gap-8 ${isMultiView ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}
              onMouseMove={(e) => handleZoneMove(e as any)}
              onTouchMove={(e) => handleZoneMove(e as any)}
              onMouseUp={handleZoneEnd}
              onTouchEnd={handleZoneEnd}
              onMouseLeave={handleZoneEnd}
            >
              <AnimatePresence mode="popLayout">
                {cameras.map((cam, index) => (
                  <motion.div 
                    key={cam.id}
                    layout
                    drag={!isMultiView && !isEditingZones ? "x" : undefined}
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={handleDragEnd}
                    transition={{ 
                      type: "spring", 
                      stiffness: 400, 
                      damping: 35 
                    }}
                    ref={(el) => { if (el) cardRefs.current.set(cam.id, el as HTMLDivElement); }}
                    onMouseDown={(e) => handleZoneStart(e as any, cam.id)}
                    onTouchStart={(e) => handleZoneStart(e as any, cam.id)}
                    onClick={() => { 
                      if (isReordering) return;
                      if (isEditingZones) {
                        setActiveCameraId(cam.id);
                      } else {
                        setActiveCameraId(cam.id); 
                        setIsMultiView(false); 
                      }
                    }}
                    className={`relative glass rounded-2xl sm:rounded-[48px] overflow-hidden group shadow-2xl ${
                      isReordering ? 'border-blue-500/50 bg-blue-500/5 shadow-blue-500/10' : 'cursor-pointer'
                    } ${
                      !isMultiView && cam.id !== activeCameraId ? 'hidden' : ''
                    } aspect-[16/10] ${
                      !isMultiView ? 'max-w-[1200px] mx-auto w-full' : ''
                    } ${
                      isEditingZones && activeCameraId === cam.id
                        ? 'ring-4 ring-amber-500/60 ring-inset touch-none'
                        : 'border-white/5 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="absolute inset-0 bg-slate-900/40 z-0 animate-pulse" />
                    
                    {isMonitoring && activeCamStatuses[cam.id] ? (
                      (cam.type === 'ip' || cam.type === 'onvif') ? (
                        <IPCameraPlayer 
                          url={cam.url || ''} 
                          isAlertActive={alertingCameraIds.includes(cam.id)} 
                          isNightMode={isNightMode} 
                          imgRefCallback={(el) => { if (el) imgRefs.current.set(cam.id, el); else imgRefs.current.delete(cam.id); }} 
                        />
                      ) : (
                        <video 
                          ref={(el) => { if (el) videoRefs.current.set(cam.id, el); else videoRefs.current.delete(cam.id); }}
                          autoPlay 
                          muted 
                          playsInline 
                          className={`w-full h-full object-cover transition-all duration-1000 ${alertingCameraIds.includes(cam.id) ? 'opacity-40 saturate-150' : 'opacity-100'}`}
                          style={isNightMode ? { filter: 'grayscale(1) brightness(1.2) contrast(1.1) sepia(0.2) hue-rotate(180deg)' } : {}}
                        />
                      )
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6 text-slate-700">
                        <div className="p-8 glass rounded-full bg-white/5"><VideoOff size={40} /></div>
                        <div className="text-center">
                          <p className="text-xs font-black uppercase tracking-[0.4em] animate-pulse">Segnale Assente</p>
                          <p className="text-[10px] font-bold text-slate-800 mt-2">IL SISTEMA È IN STANDBY</p>
                        </div>
                      </div>
                    )}
  
                    {/* Numeric Reorder Overlay */}
                    <AnimatePresence>
                      {isReordering && (
                        <motion.div 
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center border-2 border-blue-500/40 rounded-[48px] p-6 text-center"
                        >
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Posizione Monitor</p>
                          
                          {/* Controlli di spostamento incrementale */}
                          <div className="flex items-center gap-6 mb-8">
                            {/* Sposta Indietro (Sinistra) */}
                            <button
                              disabled={index === 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (index > 0) handleOrderSwap(cam.id, String(index));
                              }}
                              className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${
                                index === 0
                                  ? 'border-white/5 bg-white/2 text-slate-700 cursor-not-allowed'
                                  : 'border-white/10 bg-white/5 text-white hover:bg-blue-600 hover:border-blue-400 active:scale-95'
                              }`}
                            >
                              <ChevronLeft size={24} />
                            </button>

                            {/* Posizione Corrente */}
                            <div className="w-28 h-28 bg-blue-600/10 border-2 border-blue-500/30 rounded-[32px] flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.15)]">
                              <span className="text-6xl font-black text-white">{index + 1}</span>
                            </div>

                            {/* Sposta Avanti (Destra) */}
                            <button
                              disabled={index === cameras.length - 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (index < cameras.length - 1) handleOrderSwap(cam.id, String(index + 2));
                              }}
                              className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${
                                index === cameras.length - 1
                                  ? 'border-white/5 bg-white/2 text-slate-700 cursor-not-allowed'
                                  : 'border-white/10 bg-white/5 text-white hover:bg-blue-600 hover:border-blue-400 active:scale-95'
                              }`}
                            >
                              <ChevronRight size={24} />
                            </button>
                          </div>

                          {/* Selezione Posizione Diretta */}
                          <div className="space-y-3 w-full max-w-[280px]">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Sposta Direttamente In:</p>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              {cameras.map((_, i) => {
                                const isCurrent = i === index;
                                return (
                                  <button
                                    key={i}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isCurrent) handleOrderSwap(cam.id, String(i + 1));
                                    }}
                                    className={`w-10 h-10 rounded-xl text-xs font-black transition-all border ${
                                      isCurrent
                                        ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20 active:scale-95'
                                    }`}
                                  >
                                    {i + 1}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <p className="mt-8 text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                            Il salvataggio è immediato e automatico
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* UI Overlays for Video (MONITORING MODE) */}
                    {!isEditingZones && !isReordering && (
                      <div className="absolute inset-0 p-4 lg:p-10 pointer-events-none flex flex-col justify-between z-30">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col gap-2">
                            <div className="glass px-3 py-1.5 lg:px-4 lg:py-2 rounded-xl bg-slate-950/40 border-white/20 backdrop-blur-md flex items-center gap-2 lg:gap-3">
                              <div className={`w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full ${isMonitoring ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`} />
                              <span className="text-[9px] lg:text-[10px] font-black text-white uppercase tracking-widest">{cam.name}</span>
                            </div>
                            <div className="glass px-3 py-1 rounded-lg bg-slate-950/20 text-[8px] lg:text-[9px] font-bold text-slate-400 uppercase tracking-widest w-fit">
                              {cam.location || 'Settore Default'}
                            </div>
                          </div>
                          {isMonitoring && isAiEnabled && (
                            <div className="flex flex-col items-end gap-2 pointer-events-auto">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCameraAi(cam.id);
                                }}
                                className={`glass px-3 py-1.5 lg:px-4 lg:py-2 rounded-xl backdrop-blur-md flex items-center gap-2 border transition-all hover:scale-105 active:scale-95 ${
                                  disabledAiCameraIds.includes(cam.id)
                                    ? 'bg-slate-800/40 border-slate-700/30 text-slate-500 hover:bg-slate-800/60'
                                    : 'bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600/30'
                                }`}
                                title={disabledAiCameraIds.includes(cam.id) ? "Attiva AI su questa camera" : "Disattiva AI su questa camera"}
                              >
                                <Cpu size={10} className={disabledAiCameraIds.includes(cam.id) ? 'text-slate-500' : 'text-blue-400 animate-pulse'} />
                                <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-widest">
                                  {disabledAiCameraIds.includes(cam.id) ? 'AI OFF' : 'AI ON'}
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
  
                        <div className="flex justify-between items-end">
                          <div className="flex gap-2 pointer-events-auto">
                            <button 
                              onClick={(e) => toggleSingleCamera(cam.id, e)}
                              className={`p-2.5 lg:p-3.5 glass rounded-xl lg:rounded-2xl transition-all border ${activeCamStatuses[cam.id] ? 'bg-green-600/20 border-green-500/30 text-green-400' : 'bg-red-600/20 border-red-500/30 text-red-400'}`}
                            >
                              {activeCamStatuses[cam.id] ? <Video size={16} /> : <VideoOff size={16} />}
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                openCameraConfig(cam);
                              }}
                              className="p-2.5 lg:p-3.5 glass rounded-xl lg:rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-all shadow-xl border-white/5"
                              title="Impostazioni Camera"
                            >
                              <Settings size={16} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setCameraToDelete(cam.id);
                              }}
                              className="p-2.5 lg:p-3.5 glass rounded-xl lg:rounded-2xl bg-red-600/10 hover:bg-red-600/20 text-red-500 hover:text-red-400 transition-all shadow-xl border-red-500/10"
                              title="Elimina Camera"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        
                          <div className="flex flex-col items-end gap-3">
                            <div className="text-[8px] lg:text-[10px] font-mono font-bold text-white/40 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                              {new Date().toLocaleTimeString('it-IT')}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
  
                    {/* UI Overlays for Video (DRAWING MODE) */}
                    {isEditingZones && activeCameraId === cam.id && (
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto w-[95%] sm:w-auto">
                        <motion.div 
                          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                          className="glass p-1.5 lg:p-2 rounded-2xl bg-slate-950/90 backdrop-blur-3xl border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.3)] flex items-center justify-center gap-1.5"
                        >
                          {(['restricted', 'alert', 'privacy', 'excluded'] as ZoneType[]).map(t => {
                            const isSelected = selectedZoneId ? cameras.find(c => c.id === cam.id)?.zones?.find(z => z.id === selectedZoneId)?.type === t : false;
                            return (
                              <button
                                key={t}
                                onClick={() => selectedZoneId && updateZoneType(selectedZoneId, t)}
                                className={`flex-1 sm:flex-none h-10 px-3 sm:px-4 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                                  isSelected
                                  ? (t === 'restricted' ? 'bg-red-500 border-red-400 text-white' : t === 'alert' ? 'bg-amber-500 border-amber-400 text-white' : t === 'privacy' ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-500 border-slate-400 text-white')
                                  : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                                }`}
                                title={t}
                              >
                                <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)] ${t === 'restricted' ? 'bg-red-500' : t === 'alert' ? 'bg-amber-500' : t === 'privacy' ? 'bg-black' : 'bg-slate-400'}`} />
                                <span className="hidden sm:inline">{t === 'restricted' ? 'Vietata' : t === 'alert' ? 'Allerta' : t === 'privacy' ? 'Privacy' : 'Esclusa'}</span>
                              </button>
                            );
                          })}
                          
                          {selectedZoneId && (
                            <button 
                              onClick={() => { deleteZone(selectedZoneId); setSelectedZoneId(null); }}
                              className="p-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-xl border border-red-500/20 transition-all"
                              title="Elimina Zona"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                          
                          <button 
                            onClick={async () => { 
                              if (activeCameraId) {
                                await saveCameraZones(activeCameraId);
                              }
                              setIsEditingZones(false); 
                              setSelectedZoneId(null); 
                            }} 
                            className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl border border-white/5 transition-all"
                            title="Chiudi Configurazione"
                          >
                            <X size={18}/>
                          </button>
                        </motion.div>
                      </div>
                    )}
  
                    {/* ── SMART ZONE SVG OVERLAY ── */}
                    <div className="absolute inset-0 pointer-events-none z-20">
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                        {/* Existing zones */}
                        {cam.zones?.map((zone) => {
                          const ZONE_COLORS: Record<string, { fill: string; stroke: string }> = {
                            restricted: { fill: 'rgba(239,68,68,0.12)', stroke: '#ef4444' },
                            alert:      { fill: 'rgba(245,158,11,0.10)', stroke: '#f59e0b' },
                            privacy:    { fill: 'rgba(0,0,0,0.65)',       stroke: '#64748b' },
                            excluded:   { fill: 'rgba(100,116,139,0.10)', stroke: '#64748b' },
                          };
                          const col = ZONE_COLORS[zone.type];
                          const xs = zone.points.map(p => p.x);
                          const ys = zone.points.map(p => p.y);
                          const cx = ((Math.min(...xs) + Math.max(...xs)) / 2 * 100).toFixed(1);
                          const labelY = (Math.min(...ys) * 100 - 4).toFixed(1);
                          const LABELS: Record<string, string> = { restricted: '🚫 VIETATA', alert: '⚠️ ALLERTA', privacy: '🔒 PRIVACY', excluded: '⬛ ESCLUSA' };
                          return (
                            <g key={zone.id}>
                              <polygon
                                points={zone.points.map(p => `${(p.x*100).toFixed(2)},${(p.y*100).toFixed(2)}`).join(' ')}
                                fill={col.fill}
                                stroke={col.stroke}
                                strokeWidth="0.6"
                                strokeDasharray={zone.type === 'excluded' ? '2,1' : undefined}
                                style={{ pointerEvents: 'auto', cursor: isEditingZones ? 'grab' : 'default' }}
                                className="transition-colors duration-300"
                              />
                              {isEditingZones && activeCameraId === cam.id && zone.points.map((p, i) => (
                                <g key={i} className="zone-control-btn" style={{pointerEvents:'auto',cursor:'pointer'}}>
                                  <circle cx={p.x*100} cy={p.y*100} r="6" fill="transparent" />
                                  <circle cx={p.x*100} cy={p.y*100} r="2.5" fill="white" stroke={col.stroke} strokeWidth="1" className="transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                                </g>
                              ))}
                              <foreignObject x={Number(cx)-8} y={Number(labelY)} width="16" height="5" className="overflow-visible" style={{pointerEvents:'none'}}>
                                <div className="flex justify-center">
                                  <span className="bg-black/80 backdrop-blur-sm text-white font-black uppercase tracking-widest whitespace-nowrap rounded-full border border-white/10 shadow-xl" style={{fontSize:'2.2px',padding:'0.5px 2px'}}>
                                    {LABELS[zone.type]}
                                  </span>
                                </div>
                              </foreignObject>
                            </g>
                          );
                        })}
                        {/* Drawing preview */}
                        {isEditingZones && activeCameraId === cam.id && currentDrawingZone?.points && (
                          <polygon
                            points={currentDrawingZone.points.map(p => `${(p.x*100).toFixed(2)},${(p.y*100).toFixed(2)}`).join(' ')}
                            fill="rgba(245,158,11,0.08)"
                            stroke="#f59e0b"
                            strokeWidth="0.5"
                            strokeDasharray="2,1"
                          />
                        )}
                      </svg>
                    </div>
                    {/* ── END ZONE OVERLAY ── */}
  
                    {/* Alert Overlay */}
                    <AnimatePresence>
                      {alertingCameraIds.includes(cam.id) && isMonitoring && (
                        <motion.div 
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="absolute inset-0 z-40 pointer-events-none border-[6px] lg:border-[12px] border-red-500/40 animate-pulse bg-red-950/20"
                        >
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center w-full px-4 text-center">
                            <div className="p-5 lg:p-10 rounded-full bg-red-600 shadow-[0_0_50px_rgba(239,68,68,0.6)] lg:shadow-[0_0_100px_rgba(239,68,68,0.8)] animate-bounce mb-4 lg:mb-6">
                              <AlertTriangle className="text-white w-8 h-8 lg:w-16 lg:h-16" />
                            </div>
                            <h2 className="text-xl sm:text-2xl lg:text-5xl font-black text-white uppercase tracking-tighter drop-shadow-2xl">MINACCIA RILEVATA</h2>
                            <button 
                              onClick={(e) => { e.stopPropagation(); stopActiveAlert(cam.id); }}
                              className="mt-6 lg:mt-10 pointer-events-auto px-6 py-3 lg:px-10 lg:py-5 bg-white text-red-600 rounded-full font-black uppercase tracking-widest text-[9px] lg:text-xs shadow-2xl hover:scale-110 active:scale-95 transition-all"
                            >
                              Silenzia Allarme
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            </div> {/* Fine Colonna Destra */}

            {/* Colonna Sinistra (Diagnostica + Log) - sotto su mobile, a sx su desktop/TV */}
            <div className="w-full lg:w-[400px] xl:w-[480px] grid grid-cols-1 md:grid-cols-3 lg:flex lg:flex-col gap-8 order-2 lg:order-1 shrink-0">
              
              {/* AI Real-time Output */}
              <div id="ai-engine" className="md:col-span-2 lg:w-full glass rounded-[32px] lg:rounded-[40px] p-6 lg:p-10 space-y-6 lg:space-y-8 border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
                
                <div className="flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center bg-blue-500/10 border-blue-500/20">
                      <Cpu size={24} className="text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-tight">AI Diagnostic Feed</h3>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Analisi contestuale Gemini 3</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase shadow-[0_0_15px_rgba(59,130,246,0.2)]">AI Engine Online</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                  <div className="flex flex-col space-y-4 h-full">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Descrizione Scena</label>
                    <div className="glass bg-slate-900/40 rounded-3xl p-6 border-white/5 flex-1 flex items-center justify-center min-h-[140px]">
                      {isMonitoring && isAiEnabled ? (
                        <p className="text-[11px] font-bold text-white leading-relaxed italic text-center">
                          {isAnalyzing ? "Elaborazione fotogramma in corso..." : (lastAnalysis?.description || "In attesa di dati dalla telecamera attiva...")}
                        </p>
                      ) : !isAiEnabled && isMonitoring ? (
                        <div className="text-center opacity-40">
                          <Cpu size={24} className="mx-auto mb-3 text-slate-500" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">AI Core Pausato</p>
                        </div>
                      ) : (
                        <div className="text-center opacity-20">
                          <Lock size={24} className="mx-auto mb-3" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Analisi Disattivata</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Livello Minaccia</label>
                      <div className="flex gap-4">
                        {['low', 'medium', 'high'].map(level => {
                          const isActive = lastAnalysis?.threatLevel === level;
                          const colors = {
                            low: 'bg-green-500',
                            medium: 'bg-orange-500',
                            high: 'bg-red-500'
                          };
                          return (
                            <div key={level} className={`flex-1 h-2 rounded-full transition-all duration-500 ${isActive ? colors[level as keyof typeof colors] + ' shadow-[0_0_15px_rgba(0,0,0,0.5)]' : 'bg-slate-800'}`} />
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter text-slate-600">
                        <span>Minima</span>
                        <span>Moderata</span>
                        <span>Critica</span>
                      </div>
                    </div>

                    <div className="glass bg-white/5 rounded-3xl p-6 border-white/5">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black text-white/40 uppercase">Eventi Rilevati</span>
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(lastAnalysis?.detectedEvents || []).map((event, i) => (
                          <span key={i} className="px-4 py-1.5 glass rounded-full text-[10px] font-bold text-white uppercase bg-white/5 border-white/10">{event}</span>
                        ))}
                        {(!lastAnalysis?.detectedEvents || lastAnalysis.detectedEvents.length === 0) && (
                          <span className="text-[10px] font-bold text-slate-700 italic">Nessun evento attivo</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Log Sidebar */}
              <div id="event-log" className="md:col-span-1 lg:w-full glass rounded-[32px] lg:rounded-[40px] p-6 lg:p-10 space-y-6 lg:space-y-8 border-white/5 flex flex-col max-h-[500px] lg:max-h-none">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 glass rounded-2xl flex items-center justify-center bg-orange-500/10 border-orange-500/20">
                    <History size={20} className="text-orange-400 lg:size-[24px]" />
                  </div>
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-tight">Registro Log</h3>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Ultime 24 ore</p>
                    </div>
                    <button 
                      onClick={() => setIncidents([])}
                      className="p-3 glass border-white/5 text-slate-500 hover:text-red-400 hover:border-red-500/20 rounded-xl transition-all"
                      title="Svuota Log"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-4 custom-scrollbar">
                  {incidents.length > 0 ? incidents.map(incident => (
                    <div key={incident.id} className="glass bg-white/5 rounded-2xl p-5 border-l-4 border-l-blue-600 group hover:bg-white/10 transition-all cursor-pointer">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-white uppercase tracking-tighter">{incident.cameraName || 'Camera Sconosciuta'}</span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {incident.timestamp instanceof Date ? incident.timestamp.toLocaleTimeString() : '--:--'}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-200 leading-snug mb-3">{incident.description}</p>
                      {incident.screenshot && (
                        <div className="relative rounded-xl overflow-hidden aspect-video border border-white/10 grayscale group-hover:grayscale-0 transition-all">
                          <img src={`data:image/jpeg;base64,${incident.screenshot}`} className="w-full h-full object-cover" alt="event capture" />
                          <div className="absolute inset-0 bg-red-600/10 pointer-events-none" />
                        </div>
                      )}
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center h-full opacity-20 text-center py-20">
                      <Bell size={40} className="mb-4" />
                      <p className="text-xs font-black uppercase tracking-widest">Nessun Incidente</p>
                    </div>
                  )}
                </div>
              </div>

            </div> {/* Fine Colonna Sinistra */}
            </div> {/* Fine flex container responsive */}

            {/* Developer Credit Footer */}
            <div className="mt-20 pb-10 flex flex-col items-center justify-center gap-2 opacity-40 hover:opacity-100 transition-opacity">
              <div className="h-px w-20 bg-gradient-to-r from-transparent via-blue-500 to-transparent mb-4" />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
                Sviluppo e creazione <span className="text-white">Castro Massimo</span> by <span className="text-blue-500">DEVTOOLS</span>
              </p>
              <a 
                href="mailto:castromassimo@gmail.com" 
                className="text-[9px] font-bold text-slate-600 hover:text-blue-400 transition-colors uppercase tracking-widest"
              >
                castromassimo@gmail.com
              </a>
            </div>

          </div>
        </div>
        )}
      </main>

      {/* MODALS */}

      {/* Camera Config Modal */}
      <AnimatePresence>
        {showCameraModal && editingCamera && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-3xl flex items-center justify-center p-0 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="glass bg-slate-900/95 lg:bg-slate-900/60 rounded-none sm:rounded-[32px] lg:rounded-[40px] w-full h-full sm:h-auto sm:max-h-[90vh] max-w-lg overflow-y-auto custom-scrollbar shadow-2xl border-white/5"
            >
              <div className="p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 lg:space-y-8">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Setup Camera</h2>
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-500 mt-1">Configura parametri e profilo AI</p>
                  </div>
                  {isMobile35 && (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveCameraTab('info')}
                        className={`p-2 rounded-lg border text-xs font-black transition-all active:scale-95 cursor-pointer ${
                          activeCameraTab === 'info' ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-400'
                        }`}
                        title="Info Generale"
                      >
                        <Monitor size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveCameraTab('source')}
                        className={`p-2 rounded-lg border text-xs font-black transition-all active:scale-95 cursor-pointer ${
                          activeCameraTab === 'source' ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-400'
                        }`}
                        title="Configura Sorgente"
                      >
                        <Video size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveCameraTab('triggers')}
                        className={`p-2 rounded-lg border text-xs font-black transition-all active:scale-95 cursor-pointer ${
                          activeCameraTab === 'triggers' ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-400'
                        }`}
                        title="Trigger AI"
                      >
                        <Cpu size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {/* GENERAL INFO FIELDS */}
                  {(!isMobile35 || activeCameraTab === 'info') && (
                    <>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Nome Identificativo</label>
                          {keyboardTarget?.id === 'cameraName' && (
                            <Keyboard size={12} className="text-blue-400 animate-pulse" />
                          )}
                        </div>
                        <input 
                          type="text" value={editingCamera.name}
                          onChange={(e) => setEditingCamera({...editingCamera, name: e.target.value})}
                          onFocus={() => { if (useVirtualKeyboard) setKeyboardTarget({ id: 'cameraName', title: 'Nome Identificativo' }); }}
                          placeholder="es. Ingresso Sud"
                          className="w-full bg-white/5 border border-white/10 px-4 py-3 text-xs rounded-xl focus:border-white/30 outline-none transition-all text-white font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Posizione Fisica</label>
                          {keyboardTarget?.id === 'cameraLocation' && (
                            <Keyboard size={12} className="text-blue-400 animate-pulse" />
                          )}
                        </div>
                        <input 
                          type="text" value={editingCamera.location}
                          onChange={(e) => setEditingCamera({...editingCamera, location: e.target.value})}
                          onFocus={() => { if (useVirtualKeyboard) setKeyboardTarget({ id: 'cameraLocation', title: 'Posizione Fisica' }); }}
                          placeholder="es. Primo Piano, Ala Est"
                          className="w-full bg-white/5 border border-white/10 px-4 py-3 text-xs rounded-xl focus:border-white/30 outline-none transition-all text-white font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Tipo Segnale</label>
                        <select 
                          value={editingCamera.type}
                          onChange={(e) => setEditingCamera({...editingCamera, type: e.target.value as any})}
                          className="w-full bg-white/5 border border-white/10 px-4 py-3 text-xs rounded-xl outline-none transition-all text-white font-bold appearance-none animate-fade-in"
                        >
                          <option value="webcam" className="bg-[#0f172a]">Webcam Locale</option>
                          <option value="onvif" className="bg-[#0f172a]">ONVIF / Tapo / IP Cam</option>
                          <option value="ip" className="bg-[#0f172a]">Stream (URL Diretto)</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* SOURCE CONFIGURATION FIELDS */}
                  {(!isMobile35 || activeCameraTab === 'source') && (
                    <>
                      {editingCamera.type !== 'onvif' && (
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Sorgente Video</label>
                            {keyboardTarget?.id === 'cameraUrl' && (
                              <Keyboard size={12} className="text-blue-400 animate-pulse" />
                            )}
                          </div>
                          <input 
                            type="text" 
                            disabled={editingCamera.type === 'webcam'}
                            value={editingCamera.type === 'webcam' ? 'Default System' : editingCamera.url}
                            onChange={(e) => setEditingCamera({...editingCamera, url: e.target.value})}
                            onFocus={() => { if (useVirtualKeyboard) setKeyboardTarget({ id: 'cameraUrl', title: 'Sorgente Video URL' }); }}
                            placeholder="rtsp://..."
                            className="w-full bg-white/5 border border-white/10 px-4 py-3 text-[10px] rounded-xl focus:border-white/30 outline-none transition-all text-white/60 font-mono disabled:opacity-30"
                          />
                        </div>
                      )}

                      {editingCamera.type === 'onvif' && (
                        <div className="p-3 bg-blue-500/5 rounded-2xl border border-blue-500/10 space-y-3 mt-1 animate-fade-in">
                          <div className="flex items-center gap-2 mb-1">
                            <Zap size={14} className="text-blue-400" />
                            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Configurazione ONVIF</h4>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <label className="text-[8px] font-black uppercase tracking-widest text-slate-500 px-1">Indirizzo IP</label>
                                {keyboardTarget?.id === 'cameraIp' && <Keyboard size={10} className="text-blue-400 animate-pulse" />}
                              </div>
                              <input 
                                type="text" value={editingCamera.ip || ''}
                                onChange={(e) => setEditingCamera({...editingCamera, ip: e.target.value})}
                                onFocus={() => { if (useVirtualKeyboard) setKeyboardTarget({ id: 'cameraIp', title: 'Indirizzo IP ONVIF' }); }}
                                placeholder="es. 192.168.1.17"
                                className="w-full bg-slate-900/50 border border-white/10 px-3 py-2.5 text-xs rounded-xl outline-none text-white font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <label className="text-[8px] font-black uppercase tracking-widest text-slate-500 px-1">Porta RTSP</label>
                                {keyboardTarget?.id === 'cameraPort' && <Keyboard size={10} className="text-blue-400 animate-pulse" />}
                              </div>
                              <input 
                                type="number" value={editingCamera.port || 554}
                                onChange={(e) => setEditingCamera({...editingCamera, port: Number(e.target.value)})}
                                onFocus={() => { if (useVirtualKeyboard) setKeyboardTarget({ id: 'cameraPort', title: 'Porta RTSP' }); }}
                                className="w-full bg-slate-900/50 border border-white/10 px-3 py-2.5 text-xs rounded-xl outline-none text-white font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <label className="text-[8px] font-black uppercase tracking-widest text-slate-500 px-1">Username</label>
                                {keyboardTarget?.id === 'cameraUser' && <Keyboard size={10} className="text-blue-400 animate-pulse" />}
                              </div>
                              <input 
                                type="text" value={editingCamera.username || ''}
                                onChange={(e) => setEditingCamera({...editingCamera, username: e.target.value})}
                                onFocus={() => { if (useVirtualKeyboard) setKeyboardTarget({ id: 'cameraUser', title: 'Username ONVIF' }); }}
                                className="w-full bg-slate-900/50 border border-white/10 px-3 py-2.5 text-xs rounded-xl outline-none text-white font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <label className="text-[8px] font-black uppercase tracking-widest text-slate-500 px-1">Password</label>
                                {keyboardTarget?.id === 'cameraPass' && <Keyboard size={10} className="text-blue-400 animate-pulse" />}
                              </div>
                              <input 
                                type="password" value={editingCamera.password || ''}
                                onChange={(e) => setEditingCamera({...editingCamera, password: e.target.value})}
                                onFocus={() => { if (useVirtualKeyboard) setKeyboardTarget({ id: 'cameraPass', title: 'Password ONVIF' }); }}
                                className="w-full bg-slate-900/50 border border-white/10 px-3 py-2.5 text-xs rounded-xl outline-none text-white font-mono"
                              />
                            </div>
                            <div className="space-y-1 col-span-1 sm:col-span-2">
                              <div className="flex justify-between items-center">
                                <label className="text-[8px] font-black uppercase tracking-widest text-slate-500 px-1">Percorso (Path)</label>
                                {keyboardTarget?.id === 'cameraRtsp' && <Keyboard size={10} className="text-blue-400 animate-pulse" />}
                              </div>
                              <input 
                                type="text" value={editingCamera.rtspPath || '/stream1'}
                                onChange={(e) => setEditingCamera({...editingCamera, rtspPath: e.target.value})}
                                onFocus={() => { if (useVirtualKeyboard) setKeyboardTarget({ id: 'cameraRtsp', title: 'Percorso RTSP (Path)' }); }}
                                className="w-full bg-slate-900/50 border border-white/10 px-3 py-2.5 text-xs rounded-xl outline-none text-white font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* AI TRIGGERS CONFIGURATION */}
                  {(!isMobile35 || activeCameraTab === 'triggers') && (
                    <div className="space-y-3 animate-fade-in">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Trigger Allarmi AI Attivi</label>
                      <div className="grid grid-cols-2 gap-2">
                        {availableTriggers.map(trigger => {
                          const isActive = editingCamera.enabledTriggers.includes(trigger.id as AlertTrigger);
                          const LucideIcon = (Lucide as any)[trigger.icon_name] || Lucide.AlertTriangle;
                          return (
                            <button
                              key={trigger.id}
                              onClick={() => {
                                const current = editingCamera.enabledTriggers;
                                const updated = isActive ? current.filter(t => t !== trigger.id) : [...current, trigger.id as AlertTrigger];
                                setEditingCamera({...editingCamera, enabledTriggers: updated});
                              }}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all border ${isActive ? 'bg-white/10 border-white/30 text-white shadow-lg' : 'bg-transparent border-white/5 text-slate-500 hover:border-white/20'}`}
                            >
                              <span className={isActive ? trigger.color_class : 'opacity-40'}><LucideIcon size={12} /></span>
                              {trigger.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {saveStatus && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center ${
                      saveStatus.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {saveStatus.message}
                  </motion.div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button 
                    disabled={isSaving}
                    onClick={() => setShowCameraModal(false)} 
                    className="flex-1 py-4 glass rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all order-2 sm:order-1 disabled:opacity-30"
                  >
                    Annulla
                  </button>
                  <button 
                    disabled={isSaving}
                    onClick={() => saveCamera(editingCamera)} 
                    className="flex-[2] py-4 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl hover:bg-blue-500 order-1 sm:order-2 disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {isSaving && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                    {isSaving ? 'Salvataggio...' : 'Salva Configurazione'}
                  </button>
                </div>

                <div className="h-px w-full bg-white/5" />

                {/* Local Connection Guide */}
                {serverInfo && (
                  <div className="p-6 bg-green-500/5 border border-green-500/10 rounded-3xl space-y-4">
                    <div className="flex items-center gap-2 text-green-400">
                      <Monitor size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Connessione Tablet Cliente</span>
                    </div>
                    <p className="text-[9px] text-slate-400 uppercase font-bold leading-relaxed">
                      Per collegare un tablet, apri il browser sul dispositivo e inserisci uno dei seguenti indirizzi:
                    </p>
                    <div className="space-y-2">
                      {serverInfo.ips.map(ip => (
                        <div key={ip} className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5">
                          <code className="text-xs text-blue-400 font-mono">http://{ip}:{serverInfo.port}</code>
                          <span className="text-[8px] font-black text-slate-600 uppercase">WiFi Locale</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 bg-blue-600/10 rounded-xl border border-blue-500/20">
                      <p className="text-[8px] text-blue-400 font-black uppercase tracking-widest text-center">
                        💡 Tocca "Aggiungi a Home" sul tablet per installarla come App
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Logs & Diagnostic Modal */}
      <AnimatePresence>
        {showMobileLogsModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-3xl flex items-center justify-center p-0"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="w-full h-full bg-slate-900/98 flex flex-col p-4 overflow-hidden"
            >
              <div className="flex justify-between items-center pb-3 border-b border-white/10 shrink-0">
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-tight">LOGS & DIAGNOSTICA</h2>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Feed in tempo reale & registro eventi</p>
                </div>
                <button
                  onClick={() => setShowMobileLogsModal(false)}
                  className="p-2 bg-white/5 border border-white/10 text-white rounded-xl active:scale-95"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal scroll area */}
              <div className="flex-1 overflow-y-auto py-4 space-y-6 custom-scrollbar">
                {/* AI Real-time Output */}
                <div className="glass rounded-2xl p-4 space-y-4 border-white/5 relative overflow-hidden">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Cpu size={18} className="text-blue-400" />
                      <h3 className="text-xs font-black text-white uppercase">AI Diagnostic Feed</h3>
                    </div>
                    <div className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-black uppercase rounded-lg">AI Online</div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Descrizione Scena</label>
                      <div className="glass bg-slate-900/40 rounded-xl p-4 border-white/5 min-h-[80px] flex items-center justify-center">
                        {isMonitoring && isAiEnabled ? (
                          <p className="text-[10px] font-bold text-white leading-relaxed italic text-center">
                            {isAnalyzing ? "Elaborazione fotogramma..." : (lastAnalysis?.description || "In attesa di dati dalla telecamera attiva...")}
                          </p>
                        ) : !isAiEnabled && isMonitoring ? (
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">AI Core Pausato</p>
                        ) : (
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Analisi Disattivata</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Livello Minaccia</label>
                      <div className="flex gap-2">
                        {['low', 'medium', 'high'].map(level => {
                          const isActive = lastAnalysis?.threatLevel === level;
                          const colors = {
                            low: 'bg-green-500',
                            medium: 'bg-orange-500',
                            high: 'bg-red-500'
                          };
                          return (
                            <div key={level} className={`flex-1 h-1.5 rounded-full ${isActive ? colors[level as keyof typeof colors] : 'bg-slate-800'}`} />
                          );
                        })}
                      </div>
                    </div>

                    <div className="glass bg-white/5 rounded-xl p-3 border-white/5">
                      <div className="text-[8px] font-black text-white/40 uppercase mb-2">Eventi Rilevati</div>
                      <div className="flex flex-wrap gap-1.5">
                        {(lastAnalysis?.detectedEvents || []).map((event, i) => (
                          <span key={i} className="px-2.5 py-1 glass rounded-full text-[8px] font-bold text-white uppercase bg-white/5 border-white/10">{event}</span>
                        ))}
                        {(!lastAnalysis?.detectedEvents || lastAnalysis.detectedEvents.length === 0) && (
                          <span className="text-[8px] font-bold text-slate-700 italic">Nessun evento attivo</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Event Log Sidebar */}
                <div className="glass rounded-2xl p-4 space-y-4 border-white/5 flex flex-col">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <History size={18} className="text-orange-400" />
                      <h3 className="text-xs font-black text-white uppercase">Registro Log</h3>
                    </div>
                    <button 
                      onClick={() => setIncidents([])}
                      className="p-2 bg-white/5 border border-white/5 text-slate-500 hover:text-red-400 rounded-lg active:scale-95"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                    {incidents.length > 0 ? incidents.map(incident => (
                      <div key={incident.id} className="glass bg-white/5 rounded-xl p-3 border-l-2 border-l-blue-600">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[8px] font-black text-white uppercase">{incident.cameraName || 'Camera'}</span>
                          <span className="text-[8px] font-mono text-slate-500">
                            {incident.timestamp instanceof Date ? incident.timestamp.toLocaleTimeString() : '--:--'}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-200 leading-snug mb-2">{incident.description}</p>
                        {incident.screenshot && (
                          <div className="relative rounded-lg overflow-hidden aspect-video border border-white/10">
                            <img src={`data:image/jpeg;base64,${incident.screenshot}`} className="w-full h-full object-cover" alt="event capture" />
                          </div>
                        )}
                      </div>
                    )) : (
                      <div className="flex flex-col items-center justify-center py-6 opacity-20 text-center">
                        <Bell size={24} className="mb-2" />
                        <p className="text-[9px] font-black uppercase tracking-widest">Nessun Incidente</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-3xl flex items-center justify-center p-0 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="glass bg-slate-900/95 lg:bg-slate-900/60 w-full h-full sm:h-auto sm:max-h-[90vh] max-w-lg rounded-none sm:rounded-[32px] lg:rounded-[40px] p-4 sm:p-6 lg:p-10 space-y-3 sm:space-y-6 lg:space-y-8 overflow-y-auto custom-scrollbar shadow-2xl border-white/5"
            >
              <h2 className="text-lg sm:text-2xl font-black text-white uppercase">Impostazioni Sistema</h2>
              
              {/* Menu Grid - 2 Colonne */}
              {isMobile35 ? (
                <div className="flex justify-between gap-1 mb-1">
                  <button
                    type="button"
                    onClick={() => setActiveSettingsTab("ai")}
                    className={`flex-1 flex items-center justify-center p-2 rounded-xl border transition-all active:scale-95 cursor-pointer ${
                      activeSettingsTab === "ai"
                        ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/25"
                        : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                    title="AI APIKEY"
                  >
                    <Cpu size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSettingsTab("email")}
                    className={`flex-1 flex items-center justify-center p-2 rounded-xl border transition-all active:scale-95 cursor-pointer ${
                      activeSettingsTab === "email"
                        ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/25"
                        : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                    title="EMAIL Destinatari"
                  >
                    <Mail size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSettingsTab("telegram")}
                    className={`flex-1 flex items-center justify-center p-2 rounded-xl border transition-all active:scale-95 cursor-pointer ${
                      activeSettingsTab === "telegram"
                        ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/25"
                        : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                    title="ID Telegram"
                  >
                    <Send size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSettingsTab("sleep")}
                    className={`flex-1 flex items-center justify-center p-2 rounded-xl border transition-all active:scale-95 cursor-pointer ${
                      activeSettingsTab === "sleep"
                        ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/25"
                        : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                    title="MODE Anti-sleep"
                  >
                    <Lock size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSettingsTab("test")}
                    className={`flex-1 flex items-center justify-center p-2 rounded-xl border transition-all active:scale-95 cursor-pointer ${
                      activeSettingsTab === "test"
                        ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/25"
                        : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                    title="Test alarm"
                  >
                    <Activity size={16} />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-1 sm:mb-2">
                  <button
                    type="button"
                    onClick={() => setActiveSettingsTab("ai")}
                    className={`flex items-center justify-center gap-2 sm:gap-3 px-3 py-2 sm:px-6 sm:py-4.5 rounded-xl sm:rounded-2xl border text-[9px] sm:text-[11px] lg:text-xs font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer ${
                      activeSettingsTab === "ai"
                        ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/25"
                        : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Cpu size={14} className="sm:w-[16px] sm:h-[16px]" />
                    <span>AI APIKEY</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSettingsTab("email")}
                    className={`flex items-center justify-center gap-2 sm:gap-3 px-3 py-2 sm:px-6 sm:py-4.5 rounded-xl sm:rounded-2xl border text-[9px] sm:text-[11px] lg:text-xs font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer ${
                      activeSettingsTab === "email"
                        ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/25"
                        : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Mail size={14} className="sm:w-[16px] sm:h-[16px]" />
                    <span>EMAIL Destinatari</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSettingsTab("telegram")}
                    className={`flex items-center justify-center gap-2 sm:gap-3 px-3 py-2 sm:px-6 sm:py-4.5 rounded-xl sm:rounded-2xl border text-[9px] sm:text-[11px] lg:text-xs font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer ${
                      activeSettingsTab === "telegram"
                        ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/25"
                        : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Send size={14} className="sm:w-[16px] sm:h-[16px]" />
                    <span>ID Telegram</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSettingsTab("sleep")}
                    className={`flex items-center justify-center gap-2 sm:gap-3 px-3 py-2 sm:px-6 sm:py-4.5 rounded-xl sm:rounded-2xl border text-[9px] sm:text-[11px] lg:text-xs font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer ${
                      activeSettingsTab === "sleep"
                        ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/25"
                        : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Lock size={14} className="sm:w-[16px] sm:h-[16px]" />
                    <span>MODE Anti-sleep</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSettingsTab("test")}
                    className={`flex items-center justify-center gap-2 sm:gap-3 px-3 py-2 sm:px-6 sm:py-4.5 rounded-xl sm:rounded-2xl border text-[9px] sm:text-[11px] lg:text-xs font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer col-span-2 ${
                      activeSettingsTab === "test"
                        ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/25"
                        : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Activity size={14} className="sm:w-[16px] sm:h-[16px]" />
                    <span>Test alarm</span>
                  </button>
                </div>
              )}

              <div className="h-px w-full bg-white/5" />

              <div className="space-y-6">
                {/* AI Configuration Tab */}
                {activeSettingsTab === "ai" && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Motore AI (Gemini 1.5)</label>
                      <button type="button" onClick={() => setShowApiKeyModal(true)} className="text-[8px] text-blue-400 hover:text-blue-300 uppercase font-black tracking-widest flex items-center gap-1">Ottieni API Key <ChevronRight size={10}/></button>
                    </div>
                    <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl space-y-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Seleziona Motore AI</span>
                          </div>
                        </div>
                        
                        <select 
                          value={aiModel}
                          onChange={(e) => setAiModel(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-xs text-white outline-none focus:border-blue-500/50 transition-all font-bold appearance-none cursor-pointer"
                        >
                          <option value="gemini-3-flash-preview" className="bg-[#0f172a]">Gemini 3.0 Flash</option>
                        </select>
                      </div>
                      
                      <input 
                        type="password" 
                        value={appSettings.geminiKey} 
                        onChange={(e) => setAppSettings({...appSettings, geminiKey: e.target.value})}
                        onFocus={() => { if (useVirtualKeyboard) setKeyboardTarget({ id: 'settingsGeminiKey', title: 'Chiave API Gemini' }); }}
                        onBlur={() => backupApiKeyToSupabase(appSettings.geminiKey)}
                        placeholder="Chiave API (AIzaSy...)"
                        autoComplete="new-password"
                        className="w-full bg-black/20 border border-white/5 px-4 py-3 rounded-xl text-xs text-white outline-none focus:border-blue-500/50 transition-all font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Email Destinatari Tab */}
                {activeSettingsTab === "email" && (
                  <div className="space-y-4">
                    {/* Email Sender Configuration */}
                    {!isMobile35 && (
                      <>
                        <div className="space-y-3">
                          <div className="flex justify-between items-end">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Mittente Notifiche Email</label>
                            <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-[8px] text-blue-400 hover:text-blue-300 uppercase font-black tracking-widest flex items-center gap-1">Password App Gmail <ChevronRight size={10}/></a>
                          </div>
                          <div className="flex flex-col gap-3">
                            <input 
                              type="email" 
                              value={appSettings.emailUser} 
                              onChange={(e) => setAppSettings({...appSettings, emailUser: e.target.value})}
                              onFocus={() => { if (useVirtualKeyboard) setKeyboardTarget({ id: 'settingsEmailUser', title: 'Email SMTP Mittente' }); }}
                              placeholder="Email mittente (lascia vuoto per default)"
                              autoComplete="new-password"
                              className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-xs text-white outline-none focus:border-blue-500 transition-colors"
                            />
                            <div className="relative">
                              <input 
                                type={showEmailPass ? "text" : "password"} 
                                value={appSettings.emailPass} 
                                onChange={(e) => setAppSettings({...appSettings, emailPass: e.target.value})}
                                onFocus={() => { if (useVirtualKeyboard) setKeyboardTarget({ id: 'settingsEmailPass', title: 'Password App SMTP' }); }}
                                placeholder="Password App (lascia vuoto per default)"
                                autoComplete="new-password"
                                className="w-full bg-white/5 border border-white/10 pl-4 pr-10 py-3 rounded-xl text-xs text-white outline-none focus:border-blue-500 transition-colors"
                              />
                              <button
                                type="button"
                                onClick={() => setShowEmailPass(!showEmailPass)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                              >
                                {showEmailPass ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>
                          <p className="text-[8px] text-slate-500 uppercase tracking-widest">Usa una "Password per le app" se utilizzi Gmail per inviare gli allarmi.</p>
                        </div>

                        <div className="h-px w-full bg-white/5" />
                      </>
                    )}

                    {/* Email Recipients Configuration */}
                    <div className="space-y-3">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Destinatari Notifiche Email</label>
                      <div className="flex gap-2">
                        <input 
                          type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                          onFocus={() => { if (useVirtualKeyboard) setKeyboardTarget({ id: 'settingsNewEmail', title: 'Aggiungi Destinatario Email' }); }}
                          placeholder="aggiungi destinatario..."
                          className="flex-1 bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-xs text-white outline-none focus:border-blue-500 transition-colors"
                        />
                        <button 
                          onClick={() => { if(newEmail) { setNotificationEmails([...notificationEmails, newEmail]); setNewEmail(""); } }}
                          className="p-3 bg-blue-600 rounded-xl text-white hover:bg-blue-500 transition-all"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                      <div className="space-y-2 mt-4 max-h-[140px] overflow-y-auto custom-scrollbar">
                        {notificationEmails.map(email => (
                          <div key={email} className="flex items-center justify-between p-3 glass bg-white/5 rounded-xl border-white/5">
                            <span className="text-xs text-slate-400 font-medium">{email}</span>
                            <button onClick={() => setNotificationEmails(notificationEmails.filter(e => e !== email))} className="text-slate-600 hover:text-red-400"><Trash2 size={14} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ID Telegram Tab */}
                {activeSettingsTab === "telegram" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Telegram Bot Token</label>
                        <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-[8px] text-blue-400 hover:text-blue-300 uppercase font-black tracking-widest flex items-center gap-1">Crea Bot / Ottieni Token <ChevronRight size={10}/></a>
                      </div>
                      <input 
                        type="password" 
                        value={appSettings.telegramToken} 
                        onChange={(e) => setAppSettings({...appSettings, telegramToken: e.target.value})}
                        onFocus={() => { if (useVirtualKeyboard) setKeyboardTarget({ id: 'settingsTelegramToken', title: 'Telegram Bot Token' }); }}
                        placeholder="Es: 123456789:ABCdefGhI..."
                        className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-xs text-white outline-none focus:border-blue-500 transition-colors font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Destinatario Telegram Chat ID</label>
                        <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-[8px] text-blue-400 hover:text-blue-300 uppercase font-black tracking-widest flex items-center gap-1">Trova Chat ID <ChevronRight size={10}/></a>
                      </div>
                      <input 
                        type="text" 
                        value={appSettings.telegramChatId} 
                        onChange={(e) => setAppSettings({...appSettings, telegramChatId: e.target.value})}
                        onFocus={() => { if (useVirtualKeyboard) setKeyboardTarget({ id: 'settingsTelegramChatId', title: 'Telegram Chat ID' }); }}
                        placeholder="Es: 123456789"
                        className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-xs text-white outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    
                    {/* Visual Guide & QR Code */}
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3 mt-2 flex flex-col sm:flex-row items-center gap-4">
                      <div className="bg-white p-2 rounded-xl shrink-0">
                        <svg width="80" height="80" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg" shapeRendering="crispEdges">
                          <path fill="#000" d="M0 0h7v7H0zM22 0h7v7h-7zM0 22h7v7H0zM2 2h3v3H2zM24 2h3v3h-3zM2 24h3v3H2zM10 0h3v1h-3zM14 0h1v4h-1zM16 0h4v1h-4zM10 2h3v1h-3zM16 2h1v1h-1zM19 2h1v1h-1zM10 4h2v1h-2zM18 4h2v1h-2zM10 6h4v1h-4zM18 6h3v1h-3zM8 8h1v5H8zM10 8h2v1h-2zM16 8h1v4h-1zM20 8h2v2h-2zM24 8h1v2h-1zM27 8h2v1h-2zM14 9h1v1h-1zM18 9h1v1h-1zM22 10h1v1h-1zM25 10h2v1h-2zM10 11h2v1h-2zM12 11h2v1h-2zM21 11h1v1h-1zM27 11h2v1h-2zM9 12h1v1H9zM15 12h1v1h-1zM17 12h2v1h-2zM20 12h1v1h-1zM22 12h2v1h-2zM25 12h1v1h-1zM11 13h1v1h-1zM13 13h1v1h-1zM27 13h1v1h-1zM8 15h1v4H8zM10 15h2v1h-2zM14 15h1v2h-1zM16 15h1v3h-1zM18 15h3v1h-3zM23 15h2v1h-2zM26 15h3v2h-3zM11 16h2v1h-2zM21 16h1v1h-1zM24 16h1v1h-1zM10 17h1v1h-1zM13 17h1v1h-1zM19 17h1v1h-1zM22 17h1v1h-1zM10 19h2v1h-2zM14 19h1v1h-1zM17 19h1v2h-1zM20 19h1v1h-1zM22 19h3v1h-3zM27 19h1v2h-1zM8 20h2v1H8zM11 20h2v1h-2zM21 20h2v1h-2zM25 20h1v1h-1zM10 21h1v1h-1zM15 21h1v1h-1zM18 21h2v1h-2zM23 21h1v1h-1zM9 23h3v1H9zM14 23h2v1h-2zM17 23h2v1h-2zM20 23h2v1h-2zM24 23h1v2h-1zM26 23h1v1h-1zM28 23h1v2h-1zM8 24h1v2H8zM15 24h1v1h-1zM18 24h1v1h-1zM20 24h1v1h-1zM22 24h1v1h-1zM27 24h1v1h-1zM9 26h1v3H9zM11 26h3v1h-3zM16 26h3v1h-3zM20 26h1v1h-1zM22 26h1v3h-1zM24 26h2v1h-2zM27 26h1v1h-1zM12 27h1v2h-1zM15 27h2v1h-2zM19 27h2v1h-2zM25 27h3v1h-3zM10 28h1v1h-1zM14 28h4v1h-4zM20 28h1v1h-1z"/>
                        </svg>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1">
                          🔍 Come trovare il tuo Chat ID
                        </p>
                        <ol className="text-[8px] text-slate-400 uppercase tracking-wide font-bold space-y-1 list-decimal list-inside">
                          <li>Inquadra il QR code o clicca su "Trova Chat ID"</li>
                          <li>Avvia il bot <strong>@userinfobot</strong> su Telegram</li>
                          <li>Copia il valore <strong>Id:</strong> (es. 8832732995) e incollalo sopra.</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODE Anti-sleep Tab */}
                {activeSettingsTab === "sleep" && (
                  <div className="flex items-center justify-between p-4 glass bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <Lock size={16} className="text-blue-400" />
                      <span className="text-[10px] font-black uppercase text-white tracking-widest">Anti-Sleep Mode</span>
                    </div>
                    <button type="button" onClick={() => setPreventSleep(!preventSleep)} className={`w-12 h-6 rounded-full transition-all relative ${preventSleep ? 'bg-blue-600' : 'bg-slate-800'}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${preventSleep ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                )}

                {/* Test alarm Tab */}
                {activeSettingsTab === "test" && (
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button"
                      onClick={sendManualTestAlarm}
                      className="py-4 bg-orange-600/20 border border-orange-500/30 rounded-2xl text-[9px] font-black uppercase tracking-widest text-orange-400 hover:bg-orange-600 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <Mail size={14} />
                      Test Email
                    </button>

                    <button 
                      type="button"
                      onClick={async () => {
                        if (!appSettings.telegramChatId) {
                          setGlobalModal({
                            type: 'error',
                            title: 'Chat ID Mancante',
                            message: 'Inserisci prima un Telegram Chat ID valido per inviare il test.'
                          });
                          return;
                        }
                        try {
                          const res = await fetch("/api/notify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              type: "telegram",
                              recipient: [],
                              description: "🔔 [TEST VIGIL.AI] - Integrazione Telegram completata con successo!",
                              screenshot: "",
                              telegramChatId: appSettings.telegramChatId,
                              telegramToken: appSettings.telegramToken
                            })
                          });
                          const data = await res.json();
                          if (data.success) {
                            setGlobalModal({
                              type: 'success',
                              title: 'Test Telegram Inviato',
                              message: 'La notifica di test è stata inoltrata al bot Telegram.'
                            });
                          } else {
                            throw new Error(data.error || "Errore sconosciuto");
                          }
                        } catch (err: any) {
                          setGlobalModal({
                            type: 'error',
                            title: 'Errore Test Telegram',
                            message: `Impossibile inviare: ${err.message}`
                          });
                        }
                      }}
                      className="py-4 bg-blue-600/20 border border-blue-500/30 rounded-2xl text-[9px] font-black uppercase tracking-widest text-blue-400 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <Send size={14} />
                      Test Telegram
                    </button>
                  </div>
                )}
              </div>

                  <button 
                    onClick={() => {
                      localStorage.setItem("vigilai_gemini_key", appSettings.geminiKey);
                      localStorage.setItem("vigilai_gemini_key_updated_at", new Date().toISOString());
                      localStorage.setItem("vigilai_email_user", appSettings.emailUser);
                      localStorage.setItem("vigilai_email_pass", appSettings.emailPass);
                      localStorage.setItem("vigilai_telegram_chat_id", appSettings.telegramChatId);
                      localStorage.setItem("vigilai_telegram_token", appSettings.telegramToken);
                      localStorage.setItem("vigilai_model", aiModel);
                      localStorage.setItem("vigilai_notification_emails", JSON.stringify(notificationEmails));
                      
                      // Salva le impostazioni sul server locale per persisterle nel file .env
                      fetch("/api/settings", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          geminiKey: appSettings.geminiKey,
                          emailUser: appSettings.emailUser,
                          emailPass: appSettings.emailPass,
                          telegramChatId: appSettings.telegramChatId,
                          telegramToken: appSettings.telegramToken,
                          notificationEmails: notificationEmails
                        })
                      }).then(res => res.json()).then(resData => {
                        if (resData.success) {
                          console.log("[Settings] Impostazioni salvate sul server locale.");
                        }
                      }).catch(err => console.error("[Settings] Errore salvataggio server locale:", err));

                      // Backup immediato della chiave Gemini su Supabase
                      backupApiKeyToSupabase(appSettings.geminiKey);
                      if (user) {
                        supabase.auth.updateUser({
                          data: {
                            gemini_key: appSettings.geminiKey,
                            email_user: appSettings.emailUser,
                            email_pass: appSettings.emailPass,
                            telegram_chat_id: appSettings.telegramChatId,
                            telegram_token: appSettings.telegramToken,
                            notification_emails: notificationEmails
                          }
                        }).catch((err: any) => console.warn("[Settings] Errore backup cloud:", err));
                      }

                      setShowSettings(false);
                    }} 
                    className="w-full py-4 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl hover:bg-blue-500 transition-all"
                  >
                    Salva e Chiudi
                  </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {cameraToDelete && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 backdrop-blur-2xl bg-slate-950/80">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass max-w-md w-full p-6 lg:p-10 rounded-[32px] lg:rounded-[48px] border-white/10 text-center space-y-6 lg:space-y-8 shadow-[0_0_100px_rgba(239,68,68,0.2)]"
            >
              <div className="w-16 h-16 lg:w-24 lg:h-24 bg-red-600/20 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
                <Trash2 size={32} className="text-red-500 lg:size-[40px]" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl lg:text-2xl font-black text-white uppercase tracking-tighter">Conferma Eliminazione</h3>
                <p className="text-slate-400 text-xs lg:text-sm leading-relaxed">
                  Sei sicuro di voler rimuovere questa telecamera dal sistema? L'azione è irreversibile e interromperà il monitoraggio attivo.
                </p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setCameraToDelete(null)}
                  className="flex-1 py-4 lg:py-5 rounded-2xl lg:rounded-3xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all bg-white/5"
                >
                  Annulla
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-4 lg:py-5 rounded-2xl lg:rounded-3xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-white bg-red-600 shadow-xl shadow-red-500/20 hover:bg-red-500 transition-all"
                >
                  Elimina Ora
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Plans Modal */}
      <AnimatePresence>
        {showPlans && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 50 }} animate={{ scale: 1, y: 0 }}
              className="w-full max-w-6xl max-h-[90vh] overflow-y-auto custom-scrollbar glass bg-slate-900/95 lg:bg-slate-900/40 rounded-[32px] lg:rounded-[40px] p-6 lg:p-14 relative shadow-2xl border-white/5"
            >
              <button onClick={() => setShowPlans(false)} className="absolute right-4 top-4 lg:right-8 lg:top-8 p-2 lg:p-3 glass rounded-full hover:bg-white/10 transition-all text-slate-500 hover:text-white z-50"><Plus size={20} className="rotate-45" /></button>
              
              <div className="flex flex-col gap-10">
                <div className="text-center max-w-4xl mx-auto space-y-4 lg:space-y-6 mb-8 lg:mb-16">
                  <h2 className="text-3xl lg:text-6xl font-black text-white uppercase tracking-tighter leading-tight">La Nuova Era della <span className="text-blue-500">Sicurezza Attiva</span></h2>
                  <p className="text-sm lg:text-lg text-slate-400 font-medium leading-relaxed">
                    VigilAI non è un semplice sistema di sorveglianza. È un'intelligenza artificiale avanzata che <span className="text-white">vede, comprende e reagisce</span> in tempo reale.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 lg:pt-10 text-left">
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/20">
                        <Zap size={20} />
                      </div>
                      <h4 className="text-[12px] font-black text-white uppercase tracking-widest">Oltre il Movimento</h4>
                      <p className="text-sm text-slate-400 leading-relaxed font-bold uppercase tracking-tight">I sistemi classici allertano per ogni movimento (foglie, ombre). VigilAI analizza il <span className="text-white">contesto semantico</span>, ignorando i falsi allarmi.</p>
                    </div>
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/20">
                        <Monitor size={20} />
                      </div>
                      <h4 className="text-[12px] font-black text-white uppercase tracking-widest">Hardware Libero</h4>
                      <p className="text-sm text-slate-400 leading-relaxed font-bold uppercase tracking-tight">Non sei legato a marche costose. VigilAI trasforma <span className="text-white">qualsiasi telecamera IP</span> in un sensore intelligente di nuova generazione.</p>
                    </div>
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/20">
                        <ShieldCheck size={20} />
                      </div>
                      <h4 className="text-[12px] font-black text-white uppercase tracking-widest">Analisi Forense</h4>
                      <p className="text-sm text-slate-400 leading-relaxed font-bold uppercase tracking-tight">Ottieni descrizioni tecniche istantanee: <span className="text-white">Marca, Colore, Targa</span> dei veicoli e dettagli precisi sulle azioni umane.</p>
                    </div>
                  </div>
                </div>

                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8 lg:mb-16" />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
                  {/* VigilAI Platform & Features */}
                  <div className="glass bg-blue-600/10 border-blue-500/30 p-8 lg:p-12 rounded-[32px] lg:rounded-[48px] space-y-8 lg:space-y-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                      <ShieldCheck size={120} />
                    </div>
                    
                    <div>
                      <span className="px-4 py-1.5 bg-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/20">Licenza Software</span>
                      <h3 className="text-2xl lg:text-3xl font-black text-white uppercase mt-4 lg:mt-6 tracking-tighter">Piattaforma VigilAI Pro</h3>
                      <div className="flex items-baseline gap-2 mt-2 lg:mt-4">
                        <span className="text-4xl lg:text-6xl font-black text-white tracking-tighter">€49</span>
                        <span className="text-slate-500 text-sm font-bold uppercase tracking-widest">/mese</span>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-[11px] font-black text-blue-400 uppercase tracking-widest border-b border-blue-500/20 pb-2">Funzionalità Incluse</h4>
                      <div className="grid grid-cols-1 gap-6">
                        {[
                          { title: 'Monitoraggio H24', desc: 'Analisi continua ogni 10-15 secondi per una protezione costante' },
                          { title: 'Notifiche Email', desc: 'Allerte istantanee con screenshot allegato inviate al tuo smartphone' },
                          { title: 'Multi-View PRO', desc: 'Fino a 16 flussi video simultanei visualizzati in alta definizione' },
                          { title: 'Zone Dinamiche', desc: 'Definizione aree Alert, Restricted e Privacy per un controllo granulare' },
                          { title: 'Vehicle Tracking', desc: 'Riconoscimento Marca, Colore e Targa dei veicoli sospetti' }
                        ].map((item, i) => (
                          <div key={i} className="flex gap-5">
                            <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6] shrink-0" />
                            <div>
                              <p className="text-[11px] font-black text-white uppercase leading-none tracking-tight">{item.title}</p>
                              <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-tight leading-relaxed">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* AI Scenarios & Customization */}
                  <div className="glass bg-slate-900/40 border-white/5 p-8 lg:p-12 rounded-[32px] lg:rounded-[48px] space-y-8 lg:space-y-10">
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black text-orange-400 uppercase tracking-widest border-b border-orange-500/20 pb-2">6 Scenari AI Programmati</h4>
                      <div className="grid grid-cols-2 gap-6">
                        {[
                          { icon: <UserCheck size={16}/>, name: 'Intrusione', desc: 'Uomini in zone vietate' },
                          { icon: <ShieldAlert size={16}/>, name: 'Violenza', desc: 'Armi o aggressioni' },
                          { icon: <Flame size={16}/>, name: 'Incendio', desc: 'Fiamme libere' },
                          { icon: <Wind size={16}/>, name: 'Fumo', desc: 'Fumo denso sospetto' },
                          { icon: <Scan size={16}/>, name: 'Sicurezza', desc: 'Caschi e DPI mancanti' },
                          { icon: <Activity size={16}/>, name: 'Malore', desc: 'Persone a terra / cadute' }
                        ].map((item, i) => (
                          <div key={i} className="space-y-2 p-4 bg-white/5 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-2 text-white">
                              {item.icon}
                              <p className="text-[11px] font-black uppercase tracking-tight">{item.name}</p>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight leading-tight">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-[32px] space-y-3">
                      <div className="flex items-center gap-2 text-blue-400">
                        <Zap size={16} />
                        <span className="text-[11px] font-black uppercase tracking-widest">Sviluppo Scenari Custom</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed uppercase font-bold tracking-tight">
                        Possiamo implementare algoritmi personalizzati per qualsiasi esigenza specifica (es. conteggio persone, parcheggi abusivi, controllo processi industriali).
                      </p>
                    </div>
                  </div>
                </div>

                {/* AI Cost Table */}
                <div className="glass bg-black/40 border-white/5 p-8 lg:p-12 rounded-[32px] lg:rounded-[48px] space-y-6 lg:space-y-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Tabella Costi API (Google Gemini)</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 italic">I costi AI dipendono dal numero di cam attive e sono pagati a consumo direttamente a Google.</p>
                    </div>
                    <div className="px-6 py-4 bg-white/5 rounded-3xl border border-white/10">
                      <p className="text-[10px] font-black text-slate-400 uppercase text-center mb-1">Stima Costo per Cam</p>
                      <p className="text-xl font-black text-blue-400 text-center uppercase tracking-tighter">€6-8 <span className="text-[9px] text-slate-600">/mese</span></p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                      { label: '1 Telecamera', cost: '€6-8' },
                      { label: '2 Telecamere', cost: '€12-16' },
                      { label: '4 Telecamere', cost: '€24-32' },
                      { label: '8 Telecamere', cost: '€48-64' }
                    ].map((item, i) => (
                      <div key={i} className="p-6 bg-white/5 rounded-[32px] border border-white/5 text-center">
                        <p className="text-[10px] font-black text-slate-500 uppercase mb-2">{item.label}</p>
                        <p className="text-lg font-black text-white">{item.cost}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Developer Credit in Modal */}
                <div className="pt-10 flex flex-col items-center justify-center gap-2 opacity-30 hover:opacity-100 transition-opacity">
                  <div className="h-px w-20 bg-gradient-to-r from-transparent via-blue-500 to-transparent mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 text-center">
                    Sviluppo e creazione <span className="text-white">Castro Massimo</span> by <span className="text-blue-500">DEVTOOLS</span>
                  </p>
                  <a 
                    href="mailto:castromassimo@gmail.com" 
                    className="text-[9px] font-bold text-slate-600 hover:text-blue-400 transition-colors uppercase tracking-widest"
                  >
                    castromassimo@gmail.com
                  </a>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {globalModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="glass max-w-sm w-full p-8 rounded-[40px] border-white/10 text-center space-y-6 shadow-2xl"
            >
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto border ${
                globalModal.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 
                globalModal.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                'bg-blue-500/10 border-blue-500/20 text-blue-500'
              }`}>
                {globalModal.title === 'Quick Connect' ? <Scan size={32} /> : globalModal.type === 'error' ? <AlertCircle size={32} /> : <ShieldCheck size={32} />}
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">{globalModal.title}</h3>
                <p className="text-slate-400 text-xs font-bold leading-relaxed uppercase tracking-tight">{globalModal.message}</p>
              </div>

              {globalModal.title === 'Quick Connect' && serverInfo && (
                <div className="flex flex-col items-center gap-4 py-2 w-full">
                  {/* Selector Tabs */}
                  <div className="flex bg-slate-950/40 p-1 rounded-xl border border-white/5 w-full">
                    <button
                      onClick={() => setActiveQrTab('local')}
                      className={`flex-1 py-2 px-3 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                        activeQrTab === 'local' 
                          ? 'bg-blue-600 text-white shadow-md' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <RaspberryIcon size={12} className={activeQrTab === 'local' ? 'text-white' : 'text-green-400'} />
                      Sito Locale
                    </button>
                    <button
                      onClick={() => {
                        setActiveQrTab('tailscale');
                        setLoadingVpn(true);
                        fetch('/api/vpn/status')
                          .then(res => res.json())
                          .then(data => {
                            if (data.success) setVpnStatus(data);
                          })
                          .catch(console.error)
                          .finally(() => setLoadingVpn(false));
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                        activeQrTab === 'tailscale' 
                          ? 'bg-blue-600 text-white shadow-md' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <TailscaleIcon size={12} className={activeQrTab === 'tailscale' ? 'text-white' : 'text-blue-400'} />
                      Tailscale VPN
                    </button>
                  </div>

                  {/* Tab Contents */}
                  {(() => {
                    const localIp = serverInfo.ips.find(ip => (ip.startsWith('192.168.') || ip.startsWith('10.')) && ip !== '10.42.0.1') || serverInfo.ips.find(ip => !ip.startsWith('100.')) || serverInfo.ips[0];
                    const tailscaleIp = serverInfo.ips.find(ip => ip.startsWith('100.'));

                    if (activeQrTab === 'local') {
                      return (
                        <div className="flex flex-col items-center gap-4 w-full">
                          <div className="p-4 bg-white rounded-[32px] shadow-2xl shadow-blue-500/20">
                            <QRCodeCanvas 
                              value={`http://${localIp}:${serverInfo.port}`}
                              size={180}
                              level="H"
                              includeMargin={false}
                              imageSettings={{
                                src: "/favicon.png",
                                x: undefined,
                                y: undefined,
                                height: 36,
                                width: 36,
                                excavate: true,
                              }}
                            />
                          </div>
                          <p className="text-[9px] text-slate-400 uppercase font-bold text-center">
                            Connessione diretta tramite WiFi locale
                          </p>
                          <div className="bg-white/5 px-4 py-2.5 rounded-xl border border-white/5 w-full flex justify-between items-center">
                            <code className="text-[10px] text-slate-300 font-mono">http://{localIp}:{serverInfo.port}</code>
                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
                              <RaspberryIcon size={8} /> Consigliato
                            </span>
                          </div>
                        </div>
                      );
                    } else {
                      if (loadingVpn) {
                        return (
                          <div className="flex flex-col items-center gap-3 py-10 w-full text-center">
                            <span className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
                            <p className="text-[9px] text-slate-400 uppercase font-bold">Verifica dello stato VPN...</p>
                          </div>
                        );
                      }

                      const activeVpnIp = vpnStatus?.ip || tailscaleIp;
                      const isVpnRunning = vpnStatus?.state === "Running" && activeVpnIp;

                      if (isVpnRunning) {
                        return (
                          <div className="flex flex-col items-center gap-4 w-full">
                            <div className="p-4 bg-white rounded-[32px] shadow-2xl shadow-blue-500/20">
                              <QRCodeCanvas 
                                value={`http://${activeVpnIp}:${serverInfo.port}`}
                                size={180}
                                level="H"
                                includeMargin={false}
                                imageSettings={{
                                  src: "/favicon.png",
                                  x: undefined,
                                  y: undefined,
                                  height: 36,
                                  width: 36,
                                  excavate: true,
                                }}
                              />
                            </div>
                            <p className="text-[9px] text-slate-400 uppercase font-bold text-center">
                              Connessione remota sicura tramite VPN Tailscale
                            </p>
                            <div className="bg-white/5 px-4 py-2.5 rounded-xl border border-white/5 w-full flex justify-between items-center">
                              <code className="text-[10px] text-slate-300 font-mono">http://{activeVpnIp}:{serverInfo.port}</code>
                              <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                                Connesso
                              </span>
                            </div>
                          </div>
                        );
                      } else if (vpnStatus?.state === "NeedsLogin" && vpnStatus?.authUrl) {
                        return (
                          <div className="flex flex-col items-center gap-4 w-full">
                            <div className="p-4 bg-white rounded-[32px] shadow-2xl shadow-blue-500/20">
                              <QRCodeCanvas 
                                value={vpnStatus.authUrl}
                                size={180}
                                level="H"
                                includeMargin={false}
                                imageSettings={{
                                  src: "/favicon.png",
                                  x: undefined,
                                  y: undefined,
                                  height: 36,
                                  width: 36,
                                  excavate: true,
                                }}
                              />
                            </div>
                            <div className="text-center space-y-1">
                              <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Associazione Richiesta</h4>
                              <p className="text-[8px] text-slate-400 uppercase font-bold leading-relaxed max-w-[240px] mx-auto">
                                Scansiona questo QR Code per associare il Raspberry Pi al tuo account Tailscale.
                              </p>
                            </div>
                            <div className="flex gap-2 w-full">
                              <a 
                                href={vpnStatus.authUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex-1 py-3 bg-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest text-white text-center hover:bg-blue-500 transition-all flex items-center justify-center gap-1.5"
                              >
                                <ExternalLink size={12} /> Apri Link
                              </a>
                              <button 
                                onClick={() => {
                                  setLoadingVpn(true);
                                  fetch('/api/vpn/status')
                                    .then(res => res.json())
                                    .then(data => {
                                      if (data.success) setVpnStatus(data);
                                    })
                                    .catch(console.error)
                                    .finally(() => setLoadingVpn(false));
                                }}
                                className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/10 transition-all"
                              >
                                Verifica
                              </button>
                            </div>
                          </div>
                        );
                      } else {
                        const isInstalled = vpnStatus?.installed !== false;
                        return (
                          <div className="flex flex-col items-center gap-3 py-6 px-4 bg-white/5 rounded-2xl border border-white/5 w-full text-center">
                            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-1">
                              <AlertTriangle size={18} />
                            </div>
                            <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                              {isInstalled ? 'VPN Disconnessa' : 'VPN non Rilevata'}
                            </h4>
                            <p className="text-[8px] text-slate-400 uppercase font-bold leading-relaxed max-w-[240px] mx-auto">
                              {isInstalled 
                                ? 'Tailscale è installato ma non è attivo o non è autenticato. Clicca su "Attiva VPN" per avviarlo.'
                                : 'Tailscale non è installato sul Raspberry Pi. Installa il pacchetto tailscale per attivare il collegamento remoto.'}
                            </p>
                            {isInstalled && (
                              <button 
                                onClick={() => {
                                  setLoadingVpn(true);
                                  fetch('/api/vpn/activate', { method: 'POST' })
                                    .then(res => res.json())
                                    .then(data => {
                                      if (data.success) {
                                        setVpnStatus(data);
                                      }
                                    })
                                    .catch(console.error)
                                    .finally(() => setLoadingVpn(false));
                                }}
                                className="w-full mt-2 py-3 bg-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest text-white hover:bg-blue-500 transition-all"
                              >
                                Attiva VPN
                              </button>
                            )}
                          </div>
                        );
                      }
                    }
                  })()}
                  
                  {/* List of other detected IPs */}
                  <div className="space-y-2 w-full pt-2 border-t border-white/5">
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">Tutti gli indirizzi rilevati:</p>
                    <div className="flex flex-col gap-1.5 max-h-[80px] overflow-y-auto custom-scrollbar pr-1">
                      {serverInfo.ips.map(ip => (
                        <div key={ip} className="flex items-center justify-between bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                          <code className="text-[9px] text-slate-400 font-mono">{ip}</code>
                          <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                            ip.startsWith('100.') ? 'bg-blue-500/20 text-blue-400' :
                            ip.startsWith('192.168.') || ip.startsWith('10.') ? 'bg-green-500/20 text-green-400' :
                            'bg-slate-800 text-slate-500'
                          }`}>
                            {ip.startsWith('100.') ? 'Tailscale' :
                             ip.startsWith('192.168.') || ip.startsWith('10.') ? 'WiFi' : 'Altro'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button 
                onClick={() => setGlobalModal(null)}
                className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all"
              >
                Chiudi
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gemini API Key Helper Modal */}
      <AnimatePresence>
        {showApiKeyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-3xl flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 30 }}
              className="glass bg-slate-900/98 rounded-[32px] lg:rounded-[40px] w-full max-w-4xl p-6 lg:p-10 border border-white/10 shadow-2xl relative flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl lg:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <Key className="text-blue-400" /> Ottieni API Key Gemini
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mt-1">Configurazione motore AI Google AI Studio</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="p-2 lg:p-3 glass rounded-full hover:bg-white/10 transition-all text-slate-500 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                <div className="flex flex-col items-center justify-center gap-6">
                  
                  {/* QR Code & Direct Link */}
                  <div className="glass bg-white/5 border border-white/5 p-6 rounded-3xl space-y-4 flex flex-col items-center text-center max-w-md w-full animate-fade-in">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Scansiona con Smartphone / Tablet</h4>
                    <p className="text-[10px] text-slate-400 uppercase font-bold leading-relaxed">
                      Scansiona il codice QR per generare e copiare la chiave sul tuo telefono. Puoi incollarla qui usando la tastiera virtuale, oppure puoi aprire l'app dal browser del tuo telefono all'indirizzo <span className="text-blue-400 font-mono select-all lowercase">{window.location.origin}</span> per incollarla direttamente da lì.
                    </p>
                    
                    <div className="p-4 bg-white rounded-[24px] shadow-2xl shadow-blue-500/10">
                      <QRCodeCanvas
                        value="https://aistudio.google.com/app/apikey"
                        size={160}
                        level="H"
                        includeMargin={false}
                      />
                    </div>

                    <p className="text-[9px] text-amber-400 uppercase font-black tracking-wider leading-relaxed bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl w-full">
                      ⚠️ IMPORTANTE: Usa la fotocamera standard del cellulare. NON scansionare con l'App Google o Google Lens per evitare blocchi del login.
                    </p>

                    <div className="w-full pt-2">
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all w-full justify-center shadow-lg shadow-blue-500/20"
                      >
                        Apri Google AI Studio <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>

                  {/* Warning Alerts */}
                  {isInAppBrowser && (
                    <div className="bg-amber-500/15 border border-amber-500/30 p-5 rounded-[24px] text-left space-y-2 max-w-md w-full shadow-lg shadow-amber-500/5">
                      <div className="flex items-center gap-2 text-amber-400 text-[10px] font-black uppercase tracking-wider">
                        <AlertTriangle size={14} className="shrink-0" /> Browser Interno Rilevato
                      </div>
                      <p className="text-[9px] text-slate-300 font-bold uppercase tracking-wide leading-relaxed">
                        Stai visualizzando l'applicazione all'interno dell'app Google o di un browser interno (es. Facebook, Instagram).
                      </p>
                      <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
                        Google blocca l'accesso a Google AI Studio da questi browser interni (in-app). 
                        Per risolvere, <span className="text-amber-400 font-bold">apri VigilAI direttamente nel browser principale del tuo telefono</span> (es. <span className="text-white font-bold">Google Chrome</span> su Android o <span className="text-white font-bold">Safari</span> su iOS) inserendo questo indirizzo: <span className="text-blue-400 font-mono select-all break-all">{window.location.origin}</span>.
                      </p>
                    </div>
                  )}

                  {isLocalhost && (
                    <div className="bg-blue-500/15 border border-blue-500/30 p-5 rounded-[24px] text-left space-y-2 max-w-md w-full shadow-lg shadow-blue-500/5">
                      <div className="flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase tracking-wider">
                        <Monitor size={14} className="shrink-0" /> Monitor Raspberry Pi Local
                      </div>
                      <p className="text-[9px] text-slate-300 font-bold uppercase tracking-wide leading-relaxed">
                        Sei sul display fisico del Raspberry Pi.
                      </p>
                      <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
                        Non fare clic sul pulsante "Apri Google AI Studio" direttamente da questo schermo, poiché non dispone di un browser completo con supporto al login Google. Scansiona invece il codice QR sopra con il tuo telefono.
                      </p>
                    </div>
                  )}


                </div>

                {/* API Key Input and Virtual Keyboard Trigger */}
                <div className="bg-blue-900/20 border border-blue-500/20 p-5 rounded-3xl space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 px-1">Inserisci la tua API Key Gemini</label>
                    {keyboardTarget?.id === 'modalGeminiKey' && (
                      <Keyboard size={12} className="text-blue-400 animate-pulse" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={modalGeminiKey}
                    onChange={(e) => setModalGeminiKey(e.target.value)}
                    onFocus={() => {
                      if (useVirtualKeyboard) {
                        setKeyboardTarget({ id: 'modalGeminiKey', title: 'Nuova API Key Gemini' });
                      }
                    }}
                    placeholder="Incolla o digita qui la chiave (AIzaSy...)"
                    className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-xs text-white outline-none focus:border-blue-500 transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-4 pt-4 border-t border-white/5 mt-6">
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="flex-1 py-4 glass rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAppSettings(prev => {
                      const next = { ...prev, geminiKey: modalGeminiKey };
                      localStorage.setItem("vigilai_gemini_key", modalGeminiKey);
                      localStorage.setItem("vigilai_gemini_key_updated_at", new Date().toISOString());
                      return next;
                    });
                    backupApiKeyToSupabase(modalGeminiKey);
                    setShowApiKeyModal(false);
                    setGlobalModal({
                      type: 'success',
                      title: 'API Key Salvata',
                      message: 'La chiave API Gemini è stata configurata e salvata con successo.'
                    });
                  }}
                  className="flex-2 py-4 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl hover:bg-blue-500 transition-all font-bold"
                >
                  Salva API Key
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Virtual Keyboard */}
      <AnimatePresence>
        {keyboardTarget && (
          <VirtualKeyboard
            activeField={keyboardTarget.id}
            value={getKeyboardProps()?.value || ""}
            setValue={getKeyboardProps()?.setValue || (() => {})}
            title={keyboardTarget.title}
            onClose={() => setKeyboardTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* Floating control buttons (Hidden in smartphone mode as they are in the top menu) */}
      {false && (
        <div className="fixed bottom-4 right-4 z-[99] flex flex-col gap-3 md:hidden mobile-35-controls">
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="w-12 h-12 rounded-full bg-slate-950/90 border border-white/20 flex items-center justify-center text-white shadow-2xl active:scale-95 cursor-pointer backdrop-blur-md"
            title="Impostazioni"
          >
            <Settings size={20} />
          </button>
          <button
            type="button"
            onClick={toggleMonitoring}
            className={`w-12 h-12 rounded-full border flex items-center justify-center text-white shadow-2xl active:scale-95 cursor-pointer backdrop-blur-md ${isMonitoring ? 'bg-red-600/90 border-red-500/30' : 'bg-blue-600/90 border-blue-500/30'}`}
            title={isMonitoring ? "Disattiva Monitoraggio" : "Attiva Monitoraggio"}
          >
            {isMonitoring ? <VideoOff size={20} /> : <Video size={20} />}
          </button>
          <button
            type="button"
            onClick={() => setIsMultiView(!isMultiView)}
            className={`w-12 h-12 rounded-full border flex items-center justify-center text-white shadow-2xl active:scale-95 cursor-pointer backdrop-blur-md ${isMultiView ? 'bg-white/10 border-white/20' : 'bg-slate-950/90 border border-white/20'}`}
            title={isMultiView ? "Vista Singola" : "Vista Griglia"}
          >
            <LayoutGrid size={20} />
          </button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
      <style>{`
        .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.05); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .logo { filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.5)); }
      `}</style>
    </div>
  );
}
