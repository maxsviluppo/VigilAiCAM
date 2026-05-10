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
  ChevronRight,
  Maximize2,
  Scan,
  X,
  AlertCircle,
  Move,
  Gem,
  Lock,
  LogOut,
  EyeOff
} from "lucide-react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { QRCodeCanvas } from 'qrcode.react';
import { analyzeFrame, DetectionResult } from "./services/gemini";
import { Camera, Incident, AlertTrigger, Zone, ZoneType, Point } from "./types";
import { supabase } from "./supabase";
import { User } from "@supabase/supabase-js";

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

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [status, setStatus] = useState<{ type: 'error' | 'success', title: string, message: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="fixed inset-0 z-[1000] bg-[#050810] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(30,58,138,0.2),transparent_70%)]" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md glass p-8 rounded-[40px] border-white/5 shadow-2xl relative z-10">
        <div className="flex flex-col items-center gap-6 mb-8">
          <div className="w-20 h-20 glass rounded-3xl flex items-center justify-center bg-blue-600/10 border-blue-500/20 shadow-[0_0_30px_rgba(37,99,235,0.2)]">
            <ShieldCheck size={48} className="text-blue-400" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">VIGIL.<span className="text-blue-400">AI</span></h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Intelligence-Driven Security</p>
          </div>
        </div>
        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-blue-500/50 outline-none transition-all" placeholder="Email" required />
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-blue-500/50 outline-none transition-all pr-12" 
              placeholder="Password" 
              required 
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase py-4 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:opacity-50">{loading ? 'Caricamento...' : mode === 'login' ? 'Accedi' : 'Registrati'}</button>
        </form>
        <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="w-full mt-6 text-xs text-slate-500 hover:text-blue-400 uppercase font-bold tracking-widest">{mode === 'login' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}</button>
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
    </div>
  );
};

export default function App() {

  const [connectMethod, setConnectMethod] = useState<'direct' | 'advanced' | 'browser'>('direct');
  
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isAiEnabled, setIsAiEnabled] = useState(true);
  const [alertingCameraIds, setAlertingCameraIds] = useState<string[]>([]);
  const [lastAnalysis, setLastAnalysis] = useState<DetectionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [activeCamStatuses, setActiveCamStatuses] = useState<Record<string, boolean>>({});
  const [cameraToDelete, setCameraToDelete] = useState<string | null>(null);
  const [isNightMode, setIsNightMode] = useState(false);
  const [notificationEmails, setNotificationEmails] = useState<string[]>(["castromassimo@gmail.com"]);
  const [newEmail, setNewEmail] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isMultiView, setIsMultiView] = useState(true);
  const [preventSleep, setPreventSleep] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [globalModal, setGlobalModal] = useState<{ type: 'error' | 'success' | 'info', title: string, message: string } | null>(null);

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
  const [aiModel, setAiModel] = useState(() => localStorage.getItem("vigilai_model") || "gemini-1.5-flash");
  const [appSettings, setAppSettings] = useState({
    geminiKey: localStorage.getItem("vigilai_gemini_key") || "",
    emailUser: localStorage.getItem("vigilai_email_user") || "",
    emailPass: localStorage.getItem("vigilai_email_pass") || "",
  });
  
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

  // Notification function
  const sendNotification = async (description: string, screenshot: string) => {
    try {
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "email",
          recipient: notificationEmails,
          description,
          screenshot,
          emailUser: appSettings.emailUser,
          emailPass: appSettings.emailPass
        })
      });
      console.log("Notification request sent to:", notificationEmails.join(", "));
    } catch (e) {
      console.error("Failed to send notification request", e);
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
    if (!canvasRef.current || !activeCameraId) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    const cam = cameras.find(c => c.id === activeCameraId);
    if (!cam) return;

    const img = imgRefs.current.get(cam.id);
    const video = videoRefs.current.get(cam.id);
    
    let success = false;
    if ((cam.type === 'ip' || cam.type === 'onvif') && img) {
      canvas.width = img.naturalWidth || 1280;
      canvas.height = img.naturalHeight || 720;
      if (canvas.width > 0 && canvas.height > 0) {
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        success = true;
      }
    } else if (video && video.readyState >= 2) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      success = true;
    }

    if (success) {
      const screenshot = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
      await sendNotification(`[TEST MANUALE] Allarme inviato manualmente per verificare la ricezione delle immagini dalla camera: ${cam.name}`, screenshot);
      
      setIncidents(prev => [{
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        cameraId: cam.id,
        cameraName: cam.name,
        description: "[TEST MANUALE] Notifica inviata con successo",
        threatLevel: "medium",
        screenshot: canvas.toDataURL("image/jpeg", 0.8)
      }, ...prev]);
      
      setGlobalModal({
        type: 'success',
        title: 'Test Inviato',
        message: 'L\'allarme di test è stato inoltrato correttamente ai destinatari configurati.'
      });
    } else {
      setGlobalModal({
        type: 'error',
        title: 'Errore Acquisizione',
        message: 'Impossibile catturare l\'immagine della camera. Assicurati che il flusso video sia attivo.'
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
    } else if (video && video.readyState >= 2) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      base64Image = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
      success = true;
    }

    if (success && base64Image) {
      if (!isAiEnabled && !isSimulating) return; // Skip analysis if AI is disabled

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
        const result = await analyzeFrame(base64Image, cam.enabledTriggers, cam.location, aiModel, cam.zones);
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
  }, [cameras, activeCameraId, isAnalyzing, isSimulating, isMultiView, isAiEnabled]);

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
      enabledTriggers: ["intrusion", "violence", "fire"]
    });
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
    <div className="min-h-screen bg-[#050810] text-slate-300 font-sans selection:bg-blue-500/30 flex flex-col overflow-hidden">
      

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-20 lg:pb-0 overflow-y-auto">
        
        <header className="glass m-4 lg:m-8 p-4 lg:p-6 rounded-[32px] lg:rounded-[40px] flex flex-col md:flex-row items-center justify-between gap-6 lg:gap-0 sticky top-4 lg:top-8 z-[100] border-white/5 shadow-2xl">
          
          {/* TOP ROW / IDENTITY */}
          <div className="flex items-center justify-between w-full md:w-auto gap-4 lg:gap-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 lg:w-14 lg:h-14 glass rounded-2xl lg:rounded-3xl flex items-center justify-center bg-blue-600/10 border-blue-500/20 group hover:scale-110 transition-all duration-500">
                <ShieldCheck size={28} className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-xl lg:text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-1">
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

            {/* Mobile-only status badge */}
            <div className="flex md:hidden items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
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
          <div className="flex items-center gap-2 lg:gap-4 w-full md:w-auto justify-between md:justify-end overflow-x-auto pb-2 md:pb-0 custom-scrollbar">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsMultiView(!isMultiView)}
                className={`p-3 rounded-xl lg:rounded-2xl transition-all border ${isMultiView ? 'bg-white/10 border-white/20 text-white' : 'glass border-white/5 text-slate-500 hover:text-white'}`}
                title="Vista Griglia"
              >
                <LayoutGrid size={18} />
              </button>

              <button 
                onClick={() => {
                  setIsReordering(!isReordering);
                  if (!isReordering) setIsEditingZones(false);
                }}
                className={`p-3 rounded-xl lg:rounded-2xl transition-all border ${isReordering ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] border-blue-400' : 'glass border-white/5 text-slate-500 hover:text-white'}`}
                title={isReordering ? "Salva Ordine" : "Ordina Griglia"}
              >
                <Move size={18} className={isReordering ? "animate-pulse" : ""} />
              </button>

              <button 
                onClick={() => openCameraConfig()}
                className="p-3 glass border-white/5 text-slate-500 hover:text-white rounded-xl lg:rounded-2xl transition-all"
                title="Aggiungi Camera"
              >
                <Plus size={18} />
              </button>

              <button 
                onClick={() => setShowSettings(true)}
                className="p-3 glass border-white/5 text-slate-500 hover:text-white rounded-xl lg:rounded-2xl transition-all"
                title="Impostazioni"
              >
                <Settings size={18} />
              </button>

              <button 
                onClick={() => setShowPlans(true)}
                className="p-3 glass border-white/5 text-slate-500 hover:text-white rounded-xl lg:rounded-2xl transition-all"
                title="Piani e Costi"
              >
                <Gem size={18} />
              </button>

              <button 
                onClick={handleLogout}
                className="p-3 glass border-white/5 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-xl lg:rounded-2xl transition-all"
                title="Logout"
              >
                <LogOut size={18} />
              </button>

              <button
                onClick={() => setIsEditingZones(!isEditingZones)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl lg:rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border ${
                  isEditingZones
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                    : 'glass border-white/5 text-slate-500 hover:text-white'
                }`}
              >
                <Scan size={14} className={isEditingZones ? 'animate-pulse' : ''} />
                <span className="hidden lg:inline">{isEditingZones ? 'Salva Zone' : 'Zone'}</span>
              </button>

              <button
                onClick={() => setIsAiEnabled(!isAiEnabled)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl lg:rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border ${
                  isAiEnabled
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                    : 'glass border-white/5 text-slate-500 hover:text-white'
                }`}
                title={isAiEnabled ? 'Disattiva AI' : 'Attiva AI'}
              >
                <Cpu size={14} className={isAiEnabled && isMonitoring ? 'animate-pulse' : ''} />
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
              className={`flex items-center justify-center gap-3 px-6 lg:px-10 h-[44px] lg:h-[54px] rounded-xl lg:rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-2xl ${isMonitoring ? 'bg-white/10 text-white border border-white/20' : 'bg-blue-600 text-white shadow-blue-500/20'}`}
            >
              {isMonitoring ? <VideoOff size={18} /> : <Video size={18} />}
              <span>{isMonitoring ? 'OFF' : 'VIGILA'}</span>
            </motion.button>
          </div>
        </header>

        {/* Content Scrolling Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-10 custom-scrollbar relative">
          <div className="max-w-[1600px] mx-auto space-y-6 lg:space-y-10">
            
            {/* Camera Grid Section */}
            <div
              className={`grid gap-8 ${isMultiView ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}
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
                    className={`relative glass rounded-[48px] overflow-hidden group shadow-2xl ${
                      isReordering ? 'border-blue-500/50 bg-blue-500/5 shadow-blue-500/10' : 'cursor-pointer'
                    } ${
                      !isMultiView && cam.id !== activeCameraId ? 'hidden' : ''
                    } aspect-[16/10] ${
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
                          crossOrigin="anonymous"
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
                          className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center border-2 border-blue-500/40 rounded-[48px] p-6"
                        >
                          <div className="relative group/num">
                            <input 
                              type="text"
                              defaultValue={index + 1}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleOrderSwap(cam.id, (e.target as HTMLInputElement).value);
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              className="w-40 h-40 bg-white/5 border-2 border-white/10 rounded-[40px] text-center text-8xl font-black text-white focus:outline-none focus:border-blue-500 focus:bg-blue-500/10 transition-all selection:bg-blue-500/30"
                            />
                            <div className="absolute -top-4 -right-4 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg">
                              <Move size={16} />
                            </div>
                          </div>
                          <p className="mt-8 text-[12px] font-black text-blue-400 uppercase tracking-[0.4em] animate-pulse">Cambia Posizione</p>
                          <p className="mt-2 text-[9px] text-slate-500 font-bold uppercase tracking-widest italic">Premi INVIO per confermare</p>
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
                            <div className="flex flex-col items-end gap-2">
                              <div className="glass px-3 py-1.5 lg:px-4 lg:py-2 rounded-xl bg-blue-600/20 border-blue-500/30 backdrop-blur-md flex items-center gap-2">
                                <Cpu size={10} className="text-blue-400" />
                                <span className="text-[8px] lg:text-[9px] font-black text-blue-400 uppercase tracking-widest">AI Core</span>
                              </div>
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
                            onClick={() => { setIsEditingZones(false); setSelectedZoneId(null); }} 
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

            {/* AI Diagnostics & Event Log Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* AI Real-time Output */}
              <div id="ai-engine" className="lg:col-span-2 glass rounded-[32px] lg:rounded-[40px] p-6 lg:p-10 space-y-6 lg:space-y-8 border-white/5 relative overflow-hidden">
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
                  <div className="space-y-4">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Descrizione Scena</label>
                    <div className="glass bg-slate-900/40 rounded-3xl p-6 min-h-[140px] border-white/5 flex items-center justify-center">
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
              <div id="event-log" className="glass rounded-[32px] lg:rounded-[40px] p-6 lg:p-10 space-y-6 lg:space-y-8 border-white/5 flex flex-col max-h-[500px] lg:max-h-none">
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

            </div>

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
      </main>

      {/* MODALS */}

      {/* Camera Config Modal */}
      <AnimatePresence>
        {showCameraModal && editingCamera && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-3xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="glass bg-slate-900/95 lg:bg-slate-900/60 rounded-[32px] lg:rounded-[40px] w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl border-white/5"
            >
              <div className="p-6 lg:p-10 space-y-6 lg:space-y-8">
                <div>
                  <h2 className="text-xl lg:text-2xl font-black text-white uppercase tracking-tight">Setup Camera</h2>
                  <p className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mt-1">Configura parametri e profilo AI</p>
                </div>

                <div className="space-y-5 lg:space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Nome Identificativo</label>
                    <input 
                      type="text" value={editingCamera.name}
                      onChange={(e) => setEditingCamera({...editingCamera, name: e.target.value})}
                      placeholder="es. Ingresso Sud"
                      className="w-full bg-white/5 border border-white/10 px-4 py-3 text-xs rounded-xl focus:border-white/30 outline-none transition-all text-white font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Posizione Fisica</label>
                    <input 
                      type="text" value={editingCamera.location}
                      onChange={(e) => setEditingCamera({...editingCamera, location: e.target.value})}
                      placeholder="es. Primo Piano, Ala Est"
                      className="w-full bg-white/5 border border-white/10 px-4 py-3 text-xs rounded-xl focus:border-white/30 outline-none transition-all text-white font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Tipo Segnale</label>
                      <select 
                        value={editingCamera.type}
                        onChange={(e) => setEditingCamera({...editingCamera, type: e.target.value as any})}
                        className="w-full bg-white/5 border border-white/10 px-4 py-3 text-xs rounded-xl outline-none transition-all text-white font-bold appearance-none"
                      >
                        <option value="webcam" className="bg-[#0f172a]">Webcam Locale</option>
                        <option value="onvif" className="bg-[#0f172a]">ONVIF / Tapo / IP Cam</option>
                        <option value="ip" className="bg-[#0f172a]">Stream (URL Diretto)</option>
                      </select>
                    </div>
                    
                    {editingCamera.type !== 'onvif' && (
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Sorgente Video</label>
                        <input 
                          type="text" 
                          disabled={editingCamera.type === 'webcam'}
                          value={editingCamera.type === 'webcam' ? 'Default System' : editingCamera.url}
                          onChange={(e) => setEditingCamera({...editingCamera, url: e.target.value})}
                          placeholder="rtsp://..."
                          className="w-full bg-white/5 border border-white/10 px-4 py-3 text-[10px] rounded-xl focus:border-white/30 outline-none transition-all text-white/60 font-mono disabled:opacity-30"
                        />
                      </div>
                    )}
                  </div>

                  {editingCamera.type === 'onvif' && (
                    <div className="p-5 lg:p-6 bg-blue-500/5 rounded-2xl border border-blue-500/10 space-y-4 mt-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap size={14} className="text-blue-400" />
                        <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Configurazione ONVIF</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase tracking-widest text-slate-500 px-1">Indirizzo IP</label>
                          <input 
                            type="text" value={editingCamera.ip || ''}
                            onChange={(e) => setEditingCamera({...editingCamera, ip: e.target.value})}
                            placeholder="es. 192.168.1.17"
                            className="w-full bg-slate-900/50 border border-white/10 px-4 py-3 text-xs rounded-xl outline-none text-white font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase tracking-widest text-slate-500 px-1">Porta RTSP</label>
                          <input 
                            type="number" value={editingCamera.port || 554}
                            onChange={(e) => setEditingCamera({...editingCamera, port: Number(e.target.value)})}
                            className="w-full bg-slate-900/50 border border-white/10 px-4 py-3 text-xs rounded-xl outline-none text-white font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase tracking-widest text-slate-500 px-1">Username</label>
                          <input 
                            type="text" value={editingCamera.username || ''}
                            onChange={(e) => setEditingCamera({...editingCamera, username: e.target.value})}
                            className="w-full bg-slate-900/50 border border-white/10 px-4 py-3 text-xs rounded-xl outline-none text-white font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase tracking-widest text-slate-500 px-1">Password</label>
                          <input 
                            type="password" value={editingCamera.password || ''}
                            onChange={(e) => setEditingCamera({...editingCamera, password: e.target.value})}
                            className="w-full bg-slate-900/50 border border-white/10 px-4 py-3 text-xs rounded-xl outline-none text-white font-mono"
                          />
                        </div>
                        <div className="space-y-1 col-span-1 sm:col-span-2">
                          <label className="text-[8px] font-black uppercase tracking-widest text-slate-500 px-1">Percorso (Path)</label>
                          <input 
                            type="text" value={editingCamera.rtspPath || '/stream1'}
                            onChange={(e) => setEditingCamera({...editingCamera, rtspPath: e.target.value})}
                            className="w-full bg-slate-900/50 border border-white/10 px-4 py-3 text-xs rounded-xl outline-none text-white font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Trigger Allarmi AI Attivi</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'intrusion', label: 'Intrusione', icon: <Eye size={12} />, color: 'text-blue-400' },
                        { id: 'violence', label: 'Violenza', icon: <ShieldAlert size={12} />, color: 'text-red-500' },
                        { id: 'fire', label: 'Incendio', icon: <Flame size={12} />, color: 'text-orange-500' },
                        { id: 'smoke', label: 'Fumo', icon: <Wind size={12} />, color: 'text-slate-300' },
                        { id: 'safety_gear', label: 'DPI', icon: <UserCheck size={12} />, color: 'text-green-400' },
                        { id: 'fall', label: 'Cadute', icon: <Activity size={12} />, color: 'text-purple-400' },
                      ].map(trigger => {
                        const isActive = editingCamera.enabledTriggers.includes(trigger.id as AlertTrigger);
                        return (
                          <button
                            key={trigger.id}
                            onClick={() => {
                              const current = editingCamera.enabledTriggers;
                              const updated = isActive ? current.filter(t => t !== trigger.id) : [...current, trigger.id as AlertTrigger];
                              setEditingCamera({...editingCamera, enabledTriggers: updated});
                            }}
                            className={`flex items-center gap-2 lg:gap-3 px-3 py-2.5 lg:px-4 lg:py-3 rounded-xl lg:rounded-2xl text-[9px] lg:text-[10px] font-black uppercase tracking-tight transition-all border ${isActive ? 'bg-white/10 border-white/30 text-white shadow-lg' : 'bg-transparent border-white/5 text-slate-500 hover:border-white/20'}`}
                          >
                            <span className={isActive ? trigger.color : 'opacity-40'}>{trigger.icon}</span>
                            {trigger.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
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
            className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-3xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="glass bg-slate-900/95 lg:bg-slate-900/60 rounded-[32px] lg:rounded-[40px] w-full max-w-lg p-6 lg:p-10 space-y-6 lg:space-y-8 max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl border-white/5"
            >
              <h2 className="text-2xl font-black text-white uppercase">Impostazioni Sistema</h2>
              
              <div className="space-y-6">
                {/* AI Configuration */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Motore AI (Gemini 1.5)</label>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[8px] text-blue-400 hover:text-blue-300 uppercase font-black tracking-widest flex items-center gap-1">Ottieni API Key <ChevronRight size={10}/></a>
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
                        <option value="gemini-3-flash-preview" className="bg-[#0f172a]">Gemini 3.0 Flash (Top Performance)</option>
                        <option value="gemini-2.0-flash" className="bg-[#0f172a]">Gemini 2.0 Flash (Fast & Modern)</option>
                        <option value="gemini-1.5-flash" className="bg-[#0f172a]">Gemini 1.5 Flash (High Quota/Stable)</option>
                      </select>
                    </div>
                    
                    <input 
                      type="password" 
                      value={appSettings.geminiKey} 
                      onChange={(e) => setAppSettings({...appSettings, geminiKey: e.target.value})}
                      placeholder="Chiave API (AIzaSy...)"
                      className="w-full bg-black/20 border border-white/5 px-4 py-3 rounded-xl text-xs text-white outline-none focus:border-blue-500/50 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="h-px w-full bg-white/5" />

                {/* Email Sender Configuration */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Mittente Notifiche Email</label>
                    <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-[8px] text-blue-400 hover:text-blue-300 uppercase font-black tracking-widest flex items-center gap-1">Password App Gmail <ChevronRight size={10}/></a>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="email" 
                      value={appSettings.emailUser} 
                      onChange={(e) => setAppSettings({...appSettings, emailUser: e.target.value})}
                      placeholder="tua.email@gmail.com"
                      className="w-full sm:flex-1 bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-xs text-white outline-none focus:border-blue-500 transition-colors"
                    />
                    <input 
                      type="password" 
                      value={appSettings.emailPass} 
                      onChange={(e) => setAppSettings({...appSettings, emailPass: e.target.value})}
                      placeholder="Password App (16 car.)"
                      className="w-full sm:flex-1 bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-xs text-white outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <p className="text-[8px] text-slate-500 uppercase tracking-widest">Usa una "Password per le app" se utilizzi Gmail per inviare gli allarmi.</p>
                </div>

                <div className="h-px w-full bg-white/5" />

                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Destinatari Notifiche Email</label>
                  <div className="flex gap-2">
                    <input 
                      type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
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
                  <div className="space-y-2 mt-4">
                    {notificationEmails.map(email => (
                      <div key={email} className="flex items-center justify-between p-3 glass bg-white/5 rounded-xl border-white/5">
                        <span className="text-xs text-slate-400 font-medium">{email}</span>
                        <button onClick={() => setNotificationEmails(notificationEmails.filter(e => e !== email))} className="text-slate-600 hover:text-red-400"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 glass bg-white/5 rounded-2xl border-white/5">
                  <div className="flex items-center gap-3">
                    <Lock size={16} className="text-blue-400" />
                    <span className="text-[10px] font-black uppercase text-white tracking-widest">Anti-Sleep Mode</span>
                  </div>
                  <button onClick={() => setPreventSleep(!preventSleep)} className={`w-12 h-6 rounded-full transition-all relative ${preventSleep ? 'bg-blue-600' : 'bg-slate-800'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${preventSleep ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              </div>

                <div className="pt-4 space-y-3">
                  <button 
                    onClick={sendManualTestAlarm}
                    className="w-full py-4 bg-orange-600/20 border border-orange-500/30 rounded-2xl text-[10px] font-black uppercase tracking-widest text-orange-400 hover:bg-orange-600 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Bell size={14} />
                    Invia Allarme Test (con foto cam)
                  </button>

                  <button 
                    onClick={() => {
                      localStorage.setItem("vigilai_gemini_key", appSettings.geminiKey);
                      localStorage.setItem("vigilai_email_user", appSettings.emailUser);
                      localStorage.setItem("vigilai_email_pass", appSettings.emailPass);
                      localStorage.setItem("vigilai_model", aiModel);
                      setShowSettings(false);
                    }} 
                    className="w-full py-4 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl hover:bg-blue-500 transition-all"
                  >
                    Salva e Chiudi
                  </button>
                </div>
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
                {globalModal.type === 'error' ? <AlertCircle size={32} /> : <ShieldCheck size={32} />}
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">{globalModal.title}</h3>
                <p className="text-slate-400 text-xs font-bold leading-relaxed uppercase tracking-tight">{globalModal.message}</p>
              </div>
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
