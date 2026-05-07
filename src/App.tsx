
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
  Lock,
  Gem,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeCanvas } from 'qrcode.react';
import { analyzeFrame, DetectionResult } from "./services/gemini";
import { Camera, Incident, AlertTrigger, Zone, ZoneType, Point } from "./types";

const IPCameraPlayer = ({ url, isAlertActive, isNightMode, imgRefCallback }: { url: string, isAlertActive: boolean, isNightMode: boolean, imgRefCallback: (el: HTMLImageElement | null) => void }) => {
  const [displayUrl, setDisplayUrl] = useState<string>('');
  
  useEffect(() => {
    let active = true;
    let timeoutId: NodeJS.Timeout;
    const fetchFrame = () => {
      if (!active) return;
      const snapshotUrl = `/api/snapshot?rtsp=${encodeURIComponent(url)}&t=${Date.now()}`;
      const img = new Image();
      img.onload = () => {
        if (!active) return;
        setDisplayUrl(snapshotUrl);
        timeoutId = setTimeout(fetchFrame, 200);
      };
      img.onerror = () => {
        if (!active) return;
        timeoutId = setTimeout(fetchFrame, 2000);
      };
      img.src = snapshotUrl;
    };
    fetchFrame();
    return () => { active = false; clearTimeout(timeoutId); };
  }, [url]);

  return displayUrl ? (
    <img 
      ref={imgRefCallback}
      src={displayUrl} 
      className={`w-full h-full object-cover transition-all duration-300 ${isAlertActive ? 'opacity-40 saturate-150' : 'opacity-100'}`}
      style={isNightMode ? { filter: 'grayscale(1) brightness(1.2) contrast(1.1) sepia(0.2) hue-rotate(180deg)' } : {}}
      crossOrigin="anonymous"
    />
  ) : (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900">
      <Activity size={48} className="text-blue-500 animate-pulse" />
      <p className="text-xs font-black uppercase tracking-widest text-blue-400">Inizializzazione IP Cam...</p>
    </div>
  );
};

export default function App() {
  const [connectMethod, setConnectMethod] = useState<'direct' | 'cloud' | 'advanced' | 'browser'>('direct');
  const [cameras, setCameras] = useState<Camera[]>([
    { 
      id: "cam-1", 
      name: "Main Entrance", 
      location: "Ingresso Principale", 
      type: "webcam", 
      status: "online",
      enabledTriggers: ["intrusion", "violence"]
    },
    {
      id: "cam-tapo-c220",
      name: "Tapo C220",
      location: "Soggiorno",
      type: "ip",
      url: "rtsp://Testcamera:12345678@192.168.1.17:554/stream1",
      status: "online",
      enabledTriggers: ["intrusion", "violence"]
    }
  ]);
  const [activeCameraId, setActiveCameraId] = useState<string>("cam-1");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isAlertActive, setIsAlertActive] = useState(false);
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

  // Smart Zones state
  const [isEditingZones, setIsEditingZones] = useState(false);
  const [currentDrawingZone, setCurrentDrawingZone] = useState<Partial<Zone> | null>(null);
  const [draggingZoneId, setDraggingZoneId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<"move" | number | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; initialPoints: Point[] } | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  
  // Settings State
  const [aiModel, setAiModel] = useState(() => localStorage.getItem("vigilai_model") || "gemini-3-flash-preview");
  const [appSettings, setAppSettings] = useState({
    geminiKey: localStorage.getItem("vigilai_gemini_key") || "",
    emailUser: localStorage.getItem("vigilai_email_user") || "",
    emailPass: localStorage.getItem("vigilai_email_pass") || "",
  });

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
      setIsAlertActive(false);
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

  const confirmDelete = () => {
    if (!cameraToDelete) return;
    
    // Stop the stream if it exists
    const stream = streamsRef.current.get(cameraToDelete);
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      streamsRef.current.delete(cameraToDelete);
    }
    
    setCameras(prev => {
      const updated = prev.filter(c => c.id !== cameraToDelete);
      if (activeCameraId === cameraToDelete) {
        setActiveCameraId(updated[0]?.id || null);
      }
      return updated;
    });
    
    setCameraToDelete(null);
  };

  const stopActiveAlert = () => {
    setIsAlertActive(false);
    setIsSimulating(false);
    alertSequenceCountRef.current = 0;
    lastNotificationTimeRef.current = 0;
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
      // Feedback visivo nel log degli incidenti
      setIncidents(prev => [{
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        cameraId: cam.id,
        cameraName: cam.name,
        description: "[TEST MANUALE] Notifica inviata con successo",
        threatLevel: "medium",
        screenshot: canvas.toDataURL("image/jpeg", 0.8)
      }, ...prev]);
      alert("Allarme test inviato con successo!");
    } else {
      alert("Impossibile catturare l'immagine della camera. Assicurati che sia attiva e visibile.");
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
    setIsAlertActive(true);
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

    if (shouldNotify) {
      const screenshot = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
      sendNotification(desc, screenshot);
      lastNotificationTimeRef.current = now;
      alertSequenceCountRef.current += 1;
    }
    
    setIncidents(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      cameraId: cam.id,
      cameraName: cam.name,
      description: desc,
      threatLevel: "high",
      screenshot: canvas.toDataURL("image/jpeg", 0.8)
    }, ...prev]);
  };

  const captureAndAnalyze = useCallback(async () => {
    if (isAnalyzing || !canvasRef.current || cameras.length === 0) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    const camIndex = camRotationIndexRef.current % cameras.length;
    const cam = cameras[camIndex];
    camRotationIndexRef.current += 1;

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

      if (isSimulating) {
        setIsAlertActive(true);
        playAlertSound();
        handleDetectionAlert(cam, { description: `[CAMERA: ${cam.name}] SIMULAZIONE: Rapina` }, canvas);
        return;
      }

      setIsAnalyzing(true);
      const result = await analyzeFrame(base64Image, cam.enabledTriggers, cam.location, aiModel);
      if (cam.id === activeCameraId || result.isEmergency) {
        setLastAnalysis(result);
      }
      setIsAnalyzing(false);
      if (result.isEmergency) {
        handleDetectionAlert(cam, result, canvas);
      }
    }
  }, [cameras, activeCameraId, isAnalyzing, isSimulating]);

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

  useEffect(() => {
    if (isMonitoring) {
      analysisIntervalRef.current = setInterval(captureAndAnalyze, 6000); 
    } else {
      if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
    }
    return () => {
      if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
    };
  }, [isMonitoring, captureAndAnalyze]);

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
    if ((e.target as HTMLElement).closest('.zone-control-btn')) return;
    if (activeCameraId !== camId) setActiveCameraId(camId);
    const pos = getRelativePos(e, camId);
    if (!pos) return;
    const { x, y } = pos;
    const cam = cameras.find(c => c.id === camId);
    for (const zone of [...(cam?.zones || [])].reverse()) {
      const hs = 0.07;
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
      const dx = cx - dragStart.x, dy = cy - dragStart.y;
      setCameras(prev => prev.map(c => c.id !== activeCameraId ? c : {
        ...c,
        zones: (c.zones || []).map(z => z.id !== draggingZoneId ? z : {
          ...z,
          points: typeof dragType === 'number'
            ? z.points.map((p, i) => i === dragType ? { x: Math.max(0, Math.min(1, cx)), y: Math.max(0, Math.min(1, cy)) } : p)
            : dragStart.initialPoints.map(p => ({ x: Math.max(0, Math.min(1, p.x + dx)), y: Math.max(0, Math.min(1, p.y + dy)) }))
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

  const saveCamera = (cam: Camera) => {
    const finalCam = { ...cam };
    if (finalCam.type === 'onvif') {
      finalCam.url = `rtsp://${finalCam.username}:${finalCam.password}@${finalCam.ip}:${finalCam.port}${finalCam.rtspPath}`;
    }
    if (cameras.find(c => c.id === finalCam.id)) {
      setCameras(cameras.map(c => c.id === finalCam.id ? finalCam : c));
    } else {
      setCameras([...cameras, finalCam]);
    }
    setShowCameraModal(false);
    setEditingCamera(null);
  };

  const removeCamera = (id: string) => {
    setCameras(cameras.filter(c => c.id !== id));
    if (activeCameraId === id) setActiveCameraId(cameras[0]?.id);
  };

  const openCameraConfig = (cam?: Camera) => {
    setEditingCamera(cam || {
      id: `cam-${Date.now()}`,
      name: `Camera ${cameras.length + 1}`,
      location: "",
      type: "onvif",
      url: "",
      ip: "",
      port: 554,
      username: "admin",
      password: "",
      rtspPath: "/stream1",
      status: "online",
      enabledTriggers: ["intrusion", "violence"]
    });
    setShowCameraModal(true);
  };

  return (
    <div className="min-h-screen bg-[#050810] text-slate-300 font-sans selection:bg-blue-500/30 flex flex-col overflow-hidden">
      

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-20 lg:pb-0 overflow-y-auto">
        
        {/* Top Navbar */}
        <header className="min-h-[70px] lg:min-h-[90px] border-b border-white/5 px-4 lg:px-10 py-3 lg:py-4 flex flex-row items-center justify-between gap-4 backdrop-blur-md bg-slate-950/20 sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
              <ShieldCheck size={28} className="text-blue-400" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl lg:text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-1">
                VIGIL.<span className="text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.8)]">AI</span>
              </h2>
              <div className="flex items-center gap-3 lg:gap-4 mt-0.5">
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

          <div className="flex items-center gap-2 lg:gap-4 w-full md:w-auto justify-center">
            <button 
              onClick={() => setIsMultiView(!isMultiView)}
              className={`p-3 rounded-xl lg:rounded-2xl transition-all border ${isMultiView ? 'bg-white/10 border-white/20 text-white' : 'glass border-white/5 text-slate-500 hover:text-white'}`}
              title="Vista Griglia"
            >
              <LayoutGrid size={18} />
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

            <div className="h-8 w-px bg-white/10 mx-1 hidden lg:block" />

            <button 
              onClick={() => openCameraConfig()}
              className="p-3 glass border-white/5 text-slate-500 hover:text-white rounded-xl lg:rounded-2xl transition-all flex items-center gap-2 group"
              title="Aggiungi Camera"
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform" />
              <span className="hidden xl:inline text-[10px] font-black uppercase tracking-widest">Camera</span>
            </button>

            <button
              onClick={() => setIsEditingZones(!isEditingZones)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl lg:rounded-2xl font-black uppercase tracking-widest text-[8px] lg:text-[10px] transition-all border ${
                isEditingZones
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                  : 'glass border-white/5 text-slate-500 hover:text-white'
              }`}
            >
              <Scan size={14} className={isEditingZones ? 'animate-pulse' : ''} />
              <span className="hidden sm:inline">{isEditingZones ? 'Salva Zone' : 'Zone'}</span>
            </button>
            
            <button 
              onClick={toggleMonitoring}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 lg:px-8 h-[44px] lg:h-[52px] rounded-xl lg:rounded-2xl font-black uppercase tracking-widest text-[8px] lg:text-[10px] transition-all shadow-2xl ${isMonitoring ? 'bg-white/10 text-white border border-white/20' : 'bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-500 hover:scale-[1.02] active:scale-95'}`}
            >
              {isMonitoring ? <VideoOff size={16} /> : <Video size={16} />}
              <span>{isMonitoring ? 'OFF' : 'VIGILA'}</span>
            </button>
          </div>
        </header>

        {/* Content Scrolling Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-10 custom-scrollbar relative">
          <div className="max-w-[1600px] mx-auto space-y-6 lg:space-y-10">
            
            {/* Camera Grid Section */}
            <div
              id="monitoring-grid"
              className={`grid gap-8 ${isMultiView ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}
              onMouseMove={(e) => handleZoneMove(e as any)}
              onTouchMove={(e) => handleZoneMove(e as any)}
              onMouseUp={handleZoneEnd}
              onTouchEnd={handleZoneEnd}
              onMouseLeave={handleZoneEnd}
            >
              {cameras.map((cam) => (
                <motion.div 
                  layout
                  key={cam.id}
                  ref={(el) => { if (el) cardRefs.current.set(cam.id, el as HTMLDivElement); }}
                  onMouseDown={(e) => handleZoneStart(e as any, cam.id)}
                  onTouchStart={(e) => handleZoneStart(e as any, cam.id)}
                  onClick={() => { if (!isEditingZones) { setActiveCameraId(cam.id); setIsMultiView(false); } }}
                  className={`relative glass rounded-[48px] overflow-hidden group shadow-2xl transition-all duration-700 cursor-pointer ${
                    !isMultiView && cam.id !== activeCameraId ? 'hidden' : ''
                  } aspect-video ${
                    isEditingZones && activeCameraId === cam.id
                      ? 'ring-2 ring-amber-500/60 ring-inset touch-none'
                      : 'border-white/5'
                  }`}
                >
                  <div className="absolute inset-0 bg-slate-900/40 z-0 animate-pulse" />
                  
                  {isMonitoring && activeCamStatuses[cam.id] ? (
                    (cam.type === 'ip' || cam.type === 'onvif') ? (
                      <IPCameraPlayer 
                        url={cam.url || ''} 
                        isAlertActive={isAlertActive} 
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
                        className={`w-full h-full object-cover transition-all duration-1000 ${isAlertActive ? 'opacity-40 saturate-150' : 'opacity-100'}`}
                        style={isNightMode ? { filter: 'grayscale(1) brightness(1.2) contrast(1.1) sepia(0.2) hue-rotate(180deg)' } : {}}
                      />
                    )
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6 text-slate-700">
                      <div className="p-8 glass rounded-full bg-white/5"><VideoOff size={40} /></div>
                      <div className="text-center">
                        <p className="text-xs font-black uppercase tracking-[0.4em]">Segnale Assente</p>
                        <p className="text-[10px] font-bold text-slate-800 mt-2">IL SISTEMA È IN STANDBY</p>
                      </div>
                    </div>
                  )}

                  {/* UI Overlays for Video */}
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
                      {isMonitoring && (
                        <div className="flex flex-col items-end gap-2">
                          <div className="glass px-3 py-1.5 lg:px-4 lg:py-2 rounded-xl bg-blue-600/20 border-blue-500/30 backdrop-blur-md flex items-center gap-2">
                            <Cpu size={10} className="text-blue-400" />
                            <span className="text-[8px] lg:text-[9px] font-black text-blue-400 uppercase tracking-widest">AI Core</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Zone Selector Menu - Center Top (High Visibility) */}
                    {isEditingZones && activeCameraId === cam.id && (
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
                        <motion.div 
                          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                          className="glass p-2 rounded-2xl bg-slate-950/80 backdrop-blur-2xl border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.2)] flex items-center gap-2"
                        >
                          <div className="px-3 py-1.5 border-r border-white/10 mr-1">
                            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Smart Zones</span>
                          </div>
                          
                          {(['restricted', 'alert', 'privacy', 'excluded'] as ZoneType[]).map(t => (
                            <button
                              key={t}
                              onClick={() => selectedZoneId && updateZoneType(selectedZoneId, t)}
                              className={`px-4 py-2 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                (selectedZoneId ? cameras.find(c => c.id === cam.id)?.zones?.find(z => z.id === selectedZoneId)?.type === t : false)
                                ? (t === 'restricted' ? 'bg-red-500 border-red-400 text-white' : t === 'alert' ? 'bg-amber-500 border-amber-400 text-white' : t === 'privacy' ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-500 border-slate-400 text-white')
                                : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              <div className={`w-2 h-2 rounded-full ${t === 'restricted' ? 'bg-red-500' : t === 'alert' ? 'bg-amber-500' : t === 'privacy' ? 'bg-black' : 'bg-slate-400'}`} />
                              {t === 'restricted' ? 'Vietata' : t === 'alert' ? 'Allerta' : t === 'privacy' ? 'Privacy' : 'Esclusa'}
                            </button>
                          ))}
                          
                          {selectedZoneId && (
                            <button 
                              onClick={() => { deleteZone(selectedZoneId); setSelectedZoneId(null); }}
                              className="ml-2 p-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-xl border border-red-500/20 transition-all"
                              title="Elimina Zona"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                          
                          <button onClick={() => setSelectedZoneId(null)} className="ml-1 p-2 text-slate-500 hover:text-white transition-colors"><X size={16}/></button>
                        </motion.div>
                      </div>
                    )}

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
                        const controlY = (Math.max(...ys) * 100 + 1).toFixed(1);
                        const LABELS: Record<string, string> = { restricted: '🚫 VIETATA', alert: '⚠️ ALLERTA', privacy: '🔒 PRIVACY', excluded: '⬛ ESCLUSA' };
                        return (
                          <g key={zone.id}>
                            {/* Filled polygon */}
                            <polygon
                              points={zone.points.map(p => `${(p.x*100).toFixed(2)},${(p.y*100).toFixed(2)}`).join(' ')}
                              fill={col.fill}
                              stroke={col.stroke}
                              strokeWidth="0.6"
                              strokeDasharray={zone.type === 'excluded' ? '2,1' : undefined}
                            />
                            {/* Corner handles (editing mode) */}
                            {isEditingZones && activeCameraId === cam.id && zone.points.map((p, i) => (
                              <circle key={i} cx={p.x*100} cy={p.y*100} r="1.8" fill="white" stroke={col.stroke} strokeWidth="0.5" className="zone-control-btn" style={{pointerEvents:'auto',cursor:'grab'}} />
                            ))}
                            {/* Zone label badge */}
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
                    {isAlertActive && isMonitoring && (
                      <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 z-40 pointer-events-none border-[12px] border-red-500/40 animate-pulse bg-red-950/20"
                      >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                          <div className="p-10 rounded-full bg-red-600 shadow-[0_0_100px_rgba(239,68,68,0.8)] animate-bounce mb-6">
                            <AlertTriangle size={60} className="text-white" />
                          </div>
                          <h2 className="text-5xl font-black text-white uppercase tracking-tighter drop-shadow-2xl">MINACCIA RILEVATA</h2>
                          <button 
                            onClick={stopActiveAlert}
                            className="mt-10 pointer-events-auto px-10 py-5 bg-white text-red-600 rounded-full font-black uppercase tracking-widest text-xs shadow-2xl hover:scale-110 active:scale-95 transition-all"
                          >
                            Silenzia Allarme
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}

            </div>

            {/* AI Diagnostics & Event Log Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* AI Real-time Output */}
              <div id="ai-engine" className="lg:col-span-2 glass rounded-[40px] p-10 space-y-8 border-white/5 relative overflow-hidden">
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
                      {isMonitoring ? (
                        <p className="text-xl font-bold text-white leading-relaxed italic text-center">
                          {isAnalyzing ? "Elaborazione fotogramma in corso..." : (lastAnalysis?.description || "In attesa di dati dalla telecamera attiva...")}
                        </p>
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
                        {lastAnalysis?.detectedEvents.map((event, i) => (
                          <span key={i} className="px-4 py-1.5 glass rounded-full text-[10px] font-bold text-white uppercase bg-white/5 border-white/10">{event}</span>
                        )) || <span className="text-[10px] font-bold text-slate-700 italic">Nessun evento attivo</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Log Sidebar */}
              <div id="event-log" className="glass rounded-[40px] p-10 space-y-8 border-white/5 flex flex-col max-h-[500px] lg:max-h-none">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center bg-orange-500/10 border-orange-500/20">
                    <History size={24} className="text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Registro Log</h3>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Ultime 24 ore</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-4 custom-scrollbar">
                  {incidents.length > 0 ? incidents.map(incident => (
                    <div key={incident.id} className="glass bg-white/5 rounded-2xl p-5 border-l-4 border-l-blue-600 group hover:bg-white/10 transition-all cursor-pointer">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-white uppercase tracking-tighter">{incident.cameraName}</span>
                        <span className="text-[10px] font-mono text-slate-500">{incident.timestamp.toLocaleTimeString()}</span>
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
              className="glass bg-slate-900/90 lg:bg-slate-900/60 rounded-[32px] lg:rounded-[40px] w-full max-w-lg max-h-[90vh] lg:max-h-[85vh] overflow-y-auto custom-scrollbar shadow-2xl border-white/5"
            >
              <div className="p-6 lg:p-10 space-y-6 lg:space-y-8">
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">Setup Camera</h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mt-1">Configura parametri e profilo AI</p>
                </div>

                <div className="space-y-6">
                <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5">
                  <button 
                    onClick={() => setConnectMethod('direct')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${connectMethod === 'direct' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                  >
                    Direct
                  </button>
                  <button 
                    onClick={() => setConnectMethod('cloud')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${connectMethod === 'cloud' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                  >
                    Tuya QR
                  </button>
                  <button 
                    onClick={() => setConnectMethod('advanced')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${connectMethod === 'advanced' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                  >
                    Local Key
                  </button>
                  <button 
                    onClick={() => setConnectMethod('browser')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${connectMethod === 'browser' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                  >
                    Browser Source
                  </button>
                </div>

                {connectMethod === 'direct' ? (
                  <div className="space-y-6">
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

                    <div className="grid grid-cols-2 gap-4">
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
                            placeholder="rtsp://admin:password@IP:554/..."
                            className="w-full bg-white/5 border border-white/10 px-4 py-3 text-[10px] rounded-xl focus:border-white/30 outline-none transition-all text-white/60 font-mono disabled:opacity-30"
                          />
                        </div>
                      )}
                    </div>

                    {editingCamera.type === 'onvif' && (
                      <div className="p-6 bg-blue-500/5 rounded-2xl border border-blue-500/10 space-y-4 col-span-2 mt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap size={14} className="text-blue-400" />
                          <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest">Configurazione Rete ONVIF</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Indirizzo IP</label>
                            <input 
                              type="text" value={editingCamera.ip || ''}
                              onChange={(e) => setEditingCamera({...editingCamera, ip: e.target.value})}
                              placeholder="es. 192.168.1.17"
                              className="w-full bg-slate-900/50 border border-white/10 px-4 py-3 text-xs rounded-xl outline-none text-white font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Porta RTSP</label>
                            <input 
                              type="number" value={editingCamera.port || 554}
                              onChange={(e) => setEditingCamera({...editingCamera, port: Number(e.target.value)})}
                              className="w-full bg-slate-900/50 border border-white/10 px-4 py-3 text-xs rounded-xl outline-none text-white font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Username</label>
                            <input 
                              type="text" value={editingCamera.username || ''}
                              onChange={(e) => setEditingCamera({...editingCamera, username: e.target.value})}
                              className="w-full bg-slate-900/50 border border-white/10 px-4 py-3 text-xs rounded-xl outline-none text-white font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Password</label>
                            <input 
                              type="password" value={editingCamera.password || ''}
                              onChange={(e) => setEditingCamera({...editingCamera, password: e.target.value})}
                              className="w-full bg-slate-900/50 border border-white/10 px-4 py-3 text-xs rounded-xl outline-none text-white font-mono"
                            />
                          </div>
                          <div className="space-y-2 col-span-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Percorso Flusso (Path)</label>
                            <input 
                              type="text" value={editingCamera.rtspPath || '/stream1'}
                              onChange={(e) => setEditingCamera({...editingCamera, rtspPath: e.target.value})}
                              placeholder="/stream1"
                              className="w-full bg-slate-900/50 border border-white/10 px-4 py-3 text-xs rounded-xl outline-none text-white font-mono"
                            />
                            <div className="flex flex-wrap gap-2 pt-2">
                              {['/stream1', '/live/ch0', '/11', '/onvif1', '/h264Preview_01_main'].map(path => (
                                <button 
                                  key={path}
                                  onClick={() => setEditingCamera({...editingCamera, rtspPath: path})}
                                  className="text-[8px] font-mono bg-white/5 hover:bg-white/10 px-2 py-1 rounded border border-white/5 text-slate-400"
                                >
                                  {path}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="space-y-6 text-center py-4">
                    <div className="bg-white p-6 rounded-[40px] inline-block shadow-2xl shadow-blue-500/40 border-8 border-blue-500/10">
                      <QRCodeCanvas 
                        value={`tuya_auth_session_${Math.random().toString(36).substr(2, 9)}`} 
                        size={220}
                        level={"Q"}
                        includeMargin={true}
                        imageSettings={{
                          src: "https://www.gstatic.com/images/branding/product/2x/googleg_96dp.png",
                          x: undefined,
                          y: undefined,
                          height: 32,
                          width: 32,
                          excavate: true,
                        }}
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 text-left max-w-[320px] mx-auto">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle size={14} className="text-orange-400" />
                          <span className="text-[10px] font-black text-orange-400 uppercase">Nota Tecnica</span>
                        </div>
                        <p className="text-[9px] text-slate-400 leading-tight">
                          Questo QR è una simulazione dell'interfaccia **Smart Life**. Per l'integrazione reale è necessario un account **Tuya IoT Developer** per generare token di streaming validi.
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 max-w-[280px] mx-auto">
                        <div className="flex items-start gap-3 text-left">
                          <div className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                          <p className="text-[10px] text-slate-400">Apri l'app <span className="text-white font-bold">Smart Life</span>.</p>
                        </div>
                        <div className="flex items-start gap-3 text-left">
                          <div className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                          <p className="text-[10px] text-slate-400">Usa lo **Scanner** per inquadrare il codice.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {connectMethod === 'advanced' && (
                  <div className="space-y-4">
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4">
                      <p className="text-[10px] text-purple-300 leading-tight">
                        <span className="font-black uppercase">Metodo Avanzato:</span> Usa questo metodo se la camera è sulla stessa rete locale. Richiede l'estrazione della Local Key tramite **Tuya IoT Platform**.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Device ID</label>
                      <input type="text" placeholder="bf..." className="w-full bg-white/5 border border-white/10 px-4 py-3 text-xs rounded-xl text-white font-mono" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Local Key</label>
                      <input type="password" placeholder="********" className="w-full bg-white/5 border border-white/10 px-4 py-3 text-xs rounded-xl text-white font-mono" />
                    </div>
                  </div>
                )}

                {connectMethod === 'browser' && (
                  <div className="space-y-6 text-center py-4">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-[32px] p-8 space-y-4">
                      <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-blue-500/40">
                        <Monitor size={32} className="text-white" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-sm font-black text-white uppercase">Tab Bridge Mode</h3>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          Questo metodo cattura il video direttamente dalla pagina web di **Tuya Smart Life**. È la soluzione definitiva per le camere WIBY.
                        </p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={async () => {
                        try {
                          const stream = await (navigator.mediaDevices as any).getDisplayMedia({ 
                            video: { 
                              displaySurface: "browser",
                              width: { ideal: 1920 },
                              height: { ideal: 1080 }
                            },
                            audio: false 
                          });
                          
                          const camId = editingCamera.id;
                          streamsRef.current.set(camId, stream);
                          
                          // Force a brief state update to trigger video element re-assignment
                          setCameras(prev => {
                            const newCam = { ...editingCamera, type: 'browser' as const, status: 'online' as const };
                            return prev.map(c => c.id === camId ? newCam : c);
                          });

                          // Ensure video element plays immediately
                          setTimeout(() => {
                            const videoEl = videoRefs.current.get(camId);
                            if (videoEl) {
                              videoEl.srcObject = stream;
                              videoEl.play().catch(console.error);
                            }
                          }, 500);

                          setShowCameraModal(false);
                          if (!isMonitoring) setIsMonitoring(true);
                        } catch (err) {
                          console.error("Browser capture failed", err);
                        }
                      }}
                      className="w-full py-5 bg-blue-600 rounded-[24px] text-xs font-black uppercase tracking-widest text-white shadow-xl hover:bg-blue-500 transition-all flex items-center justify-center gap-3"
                    >
                      <Zap size={16} />
                      Collega Tab Tuya
                    </button>
                    
                    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">
                      Assicurati di avere la pagina Tuya aperta in un'altra scheda
                    </p>
                  </div>
                )}

                  <div className="space-y-4">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Trigger Allarmi AI Attivi</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'intrusion', label: 'Intrusione', icon: <Eye size={12} />, color: 'text-blue-400' },
                        { id: 'violence', label: 'Violenza/Armi', icon: <ShieldAlert size={12} />, color: 'text-red-500' },
                        { id: 'fire', label: 'Incendio', icon: <Flame size={12} />, color: 'text-orange-500' },
                        { id: 'smoke', label: 'Fumo Denso', icon: <Wind size={12} />, color: 'text-slate-300' },
                        { id: 'safety_gear', label: 'DPI/Sicurezza', icon: <UserCheck size={12} />, color: 'text-green-400' },
                        { id: 'fall', label: 'Cadute/MV', icon: <Activity size={12} />, color: 'text-purple-400' },
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
                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-tight transition-all border ${isActive ? 'bg-white/10 border-white/30 text-white shadow-lg' : 'bg-transparent border-white/5 text-slate-500 hover:border-white/20'}`}
                          >
                            <span className={isActive ? trigger.color : 'opacity-40'}>{trigger.icon}</span>
                            {trigger.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowCameraModal(false)} className="flex-1 py-4 glass rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">Annulla</button>
                  <button onClick={() => saveCamera(editingCamera)} className="flex-[2] py-4 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl hover:bg-blue-500">Salva Configurazione</button>
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
              className="glass bg-slate-900 rounded-[40px] w-full max-w-lg p-10 space-y-8 max-h-[90vh] overflow-y-auto"
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Gemini 3 Flash Preview</span>
                      </div>
                      <span className="text-[8px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded uppercase">Default Engine</span>
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
                  <div className="flex gap-2">
                    <input 
                      type="email" 
                      value={appSettings.emailUser} 
                      onChange={(e) => setAppSettings({...appSettings, emailUser: e.target.value})}
                      placeholder="tua.email@gmail.com"
                      className="flex-1 bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-xs text-white outline-none focus:border-blue-500 transition-colors"
                    />
                    <input 
                      type="password" 
                      value={appSettings.emailPass} 
                      onChange={(e) => setAppSettings({...appSettings, emailPass: e.target.value})}
                      placeholder="Password App (16 car.)"
                      className="flex-1 bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-xs text-white outline-none focus:border-blue-500 transition-colors"
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
              className="glass max-w-md w-full p-10 rounded-[48px] border-white/10 text-center space-y-8 shadow-[0_0_100px_rgba(239,68,68,0.2)]"
            >
              <div className="w-24 h-24 bg-red-600/20 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
                <Trash2 size={40} className="text-red-500" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Conferma Eliminazione</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Sei sicuro di voler rimuovere questa telecamera dal sistema? L'azione è irreversibile e interromperà il monitoraggio attivo.
                </p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setCameraToDelete(null)}
                  className="flex-1 py-5 rounded-3xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all bg-white/5"
                >
                  Annulla
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-5 rounded-3xl text-[10px] font-black uppercase tracking-widest text-white bg-red-600 shadow-xl shadow-red-500/20 hover:bg-red-500 transition-all"
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
              className="w-full max-w-6xl max-h-[90vh] overflow-y-auto custom-scrollbar glass bg-slate-900/40 rounded-[40px] p-14 relative shadow-2xl border-white/5"
            >
              <button onClick={() => setShowPlans(false)} className="absolute right-8 top-8 p-3 glass rounded-full hover:bg-white/10 transition-all text-slate-500 hover:text-white"><Plus size={24} className="rotate-45" /></button>
              
              <div className="flex flex-col gap-10">
                <div className="text-center max-w-4xl mx-auto space-y-6 mb-16">
                  <h2 className="text-6xl font-black text-white uppercase tracking-tighter leading-tight">La Nuova Era della <span className="text-blue-500">Sicurezza Attiva</span></h2>
                  <p className="text-lg text-slate-400 font-medium leading-relaxed">
                    VigilAI non è un semplice sistema di registrazione. È un'intelligenza artificiale avanzata che <span className="text-white">vede, comprende e reagisce</span> in tempo reale, superando i limiti dei sistemi di sorveglianza tradizionali.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 text-left">
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

                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-16" />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  {/* VigilAI Platform & Features */}
                  <div className="glass bg-blue-600/10 border-blue-500/30 p-12 rounded-[48px] space-y-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                      <ShieldCheck size={120} />
                    </div>
                    
                    <div>
                      <span className="px-4 py-1.5 bg-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/20">Licenza Software</span>
                      <h3 className="text-3xl font-black text-white uppercase mt-6 tracking-tighter">Piattaforma VigilAI Pro</h3>
                      <div className="flex items-baseline gap-2 mt-4">
                        <span className="text-6xl font-black text-white tracking-tighter">€49</span>
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
                  <div className="glass bg-slate-900/40 border-white/5 p-12 rounded-[48px] space-y-10">
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
                <div className="glass bg-black/40 border-white/5 p-12 rounded-[48px] space-y-8">
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
              </div>
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
