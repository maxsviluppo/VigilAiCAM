import React, { useState, useRef, useEffect } from "react";
import { 
  FileUp, 
  Layers, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Sparkles, 
  AlertCircle, 
  Loader2, 
  Image as ImageIcon,
  CheckCircle,
  FileText
} from "lucide-react";

// Register custom global interface declarations for PDFJS
declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

interface DocumentLoaderProps {
  language: "it" | "en";
  onAnalyzePage: (base64Data: string, pageNum: number) => void;
  onAnalyzeAll: (base64Array: string[]) => void;
  aiLoading: boolean;
  onSelectExternalActiveStatus: (isActive: boolean) => void;
  onActiveImageChange?: (activeImg: string, allImgs: string[]) => void;
  initialUrl?: string;
}

export const DocumentLoader: React.FC<DocumentLoaderProps> = ({
  language,
  onAnalyzePage,
  onAnalyzeAll,
  aiLoading,
  onSelectExternalActiveStatus,
  onActiveImageChange,
  initialUrl
}) => {
  const [fileType, setFileType] = useState<"image" | "pdf" | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [pdfPagesBase64, setPdfPagesBase64] = useState<string[]>([]);
  const [singleImageBase64, setSingleImageBase64] = useState<string>("");
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileReaderRef = useRef<FileReader | null>(null);
  
  const lastActiveImgRef = useRef<string | null>(null);
  const lastAllImgsJoinedRef = useRef<string | null>(null);

  // Trigger initial URL load if provided
  useEffect(() => {
    if (initialUrl && !fileType && !pdfLoading) {
      loadFromUrl(initialUrl);
    }
  }, [initialUrl]);

  // Dynamically import / load PDF.js from official Cloudflare CDN on-demand
  const loadPdfJs = (): Promise<any> => {
    if (window.pdfjsLib) {
      return Promise.resolve(window.pdfjsLib);
    }
    return new Promise((resolve, reject) => {
      // Create and attach script tag
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        const lib = window.pdfjsLib;
        // Inject worker source URL
        lib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve(lib);
      };
      script.onerror = () => {
        reject(new Error(language === "it" ? "Impossibile scaricare le librerie PDF.js" : "Failed to retrieve PDF.js engine"));
      };
      document.head.appendChild(script);
    });
  };

  const loadFromUrl = async (url: string) => {
    setPdfLoading(true);
    setErrorMessage("");
    try {
      const isLocal = url.startsWith("/") || url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1");
      let response: Response;
      let usedProxy = false;

      try {
        // Try fetching directly first. This allows CORS-enabled URLs (like Firebase Storage)
        // to load perfectly in the client browser without needing a server-side proxy (useful on Vercel).
        response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Direct fetch failed with status: ${response.status}`);
        }
      } catch (directErr) {
        console.log("Direct fetch failed or was blocked by CORS. Attempting to use proxy...", directErr);
        if (!isLocal) {
          const proxyUrl = `/api/proxy-pdf?url=${encodeURIComponent(url)}`;
          response = await fetch(proxyUrl);
          usedProxy = true;
        } else {
          throw directErr;
        }
      }
      
      if (!response.ok) {
        let detailedError = "";
        try {
          const errorData = await response.json();
          detailedError = errorData.error || "";
        } catch (e) {
          // ignore
        }

        const baseMsg = language === "it" 
          ? (usedProxy ? "Impossibile scaricare il documento tramite proxy" : "Impossibile caricare il file")
          : (usedProxy ? "Could not fetch document via proxy" : "Could not load file");
        
        throw new Error(detailedError ? `${baseMsg}: ${detailedError}` : baseMsg);
      }
      
      const blob = await response.blob();
      const file = new File([blob], "Voynich-Manuscript.pdf", { type: "application/pdf" });
      await processPdfFile(file);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || (language === "it" ? "Errore durante il caricamento dal link" : "Failed to load from URL"));
    } finally {
      setPdfLoading(false);
    }
  };

  // Extract base64 previews for all pages inside the PDF
  const processPdfFile = async (rawFile: File) => {
    setPdfLoading(true);
    setErrorMessage("");
    try {
      const lib = await loadPdfJs();
      const arrayBuffer = await rawFile.arrayBuffer();
      
      const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      setNumPages(totalPages);
      
      const extractedBase64: string[] = [];
      
      // We will loop through each page and render it onto a hidden canvas to save its base64 data URL
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        // Render at a high resolution (1.5x zoom scale)
        const viewport = page.getViewport({ scale: 1.5 });
        const hiddenCanvas = document.createElement("canvas");
        hiddenCanvas.width = viewport.width;
        hiddenCanvas.height = viewport.height;
        const ctx = hiddenCanvas.getContext("2d");
        
        if (ctx) {
          await page.render({
            canvasContext: ctx,
            viewport: viewport
          }).promise;
          extractedBase64.push(hiddenCanvas.toDataURL("image/jpeg", 0.85));
        }
      }

      setPdfPagesBase64(extractedBase64);
      setCurrentPage(1);
      setFileType("pdf");
      setFileName(rawFile.name);
      onSelectExternalActiveStatus(true);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || (language === "it" ? "Errore di decodifica del PDF" : "PDF processing failed"));
    } finally {
      setPdfLoading(false);
    }
  };

  const processImageFile = (rawFile: File) => {
    setPdfLoading(true);
    setErrorMessage("");
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === "string") {
        setSingleImageBase64(e.target.result);
        setFileType("image");
        setNumPages(1);
        setCurrentPage(1);
        setFileName(rawFile.name);
        onSelectExternalActiveStatus(true);
      } else {
        setErrorMessage(language === "it" ? "Incompatibilità file di immagine." : "Image format incompatibility.");
      }
      setPdfLoading(false);
    };
    reader.onerror = () => {
      setErrorMessage(language === "it" ? "Caricamento fallito." : "Load aborted.");
      setPdfLoading(false);
    };
    reader.readAsDataURL(rawFile);
  };

  const handleFile = (file: File) => {
    if (!file) return;
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      processPdfFile(file);
    } else if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name)) {
      processImageFile(file);
    } else {
      setErrorMessage(
        language === "it"
          ? "Formato non supportato. Carica solo immagini o file PDF."
          : "Unsupported extension. Upload images or PDFs only."
      );
    }
  };

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  // Change active page
  const handleNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  // Trigger analysis calls
  const handleAnalyzeClick = () => {
    const activeImage = fileType === "pdf" ? pdfPagesBase64[currentPage - 1] : singleImageBase64;
    if (activeImage) {
      onAnalyzePage(activeImage, currentPage);
    }
  };

  const handleAnalyzeAllClick = () => {
    if (fileType === "pdf" && pdfPagesBase64.length > 0) {
      onAnalyzeAll(pdfPagesBase64);
    } else if (fileType === "image" && singleImageBase64) {
      onAnalyzeAll([singleImageBase64]);
    }
  };

  // Clear current upload
  const handleClear = () => {
    setFileType(null);
    setFileName("");
    setNumPages(0);
    setCurrentPage(1);
    setPdfPagesBase64([]);
    setSingleImageBase64("");
    setErrorMessage("");
    onSelectExternalActiveStatus(false);
  };

  // Render preview canvas for current page
  useEffect(() => {
    if (!fileType) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Clear canvas
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = fileType === "pdf" ? pdfPagesBase64[currentPage - 1] : singleImageBase64;
  }, [fileType, currentPage, pdfPagesBase64, singleImageBase64]);

  // Synchronize active images to parent context
  useEffect(() => {
    if (!onActiveImageChange) return;

    let activeImg = "";
    let allImgs: string[] = [];

    if (fileType === "pdf") {
      activeImg = pdfPagesBase64[currentPage - 1] || "";
      allImgs = pdfPagesBase64;
    } else if (fileType === "image") {
      activeImg = singleImageBase64;
      allImgs = [singleImageBase64];
    }

    const allImgsJoined = allImgs.join("|");

    if (activeImg !== lastActiveImgRef.current || allImgsJoined !== lastAllImgsJoinedRef.current) {
      lastActiveImgRef.current = activeImg;
      lastAllImgsJoinedRef.current = allImgsJoined;
      onActiveImageChange(activeImg, allImgs);
    }
  }, [fileType, currentPage, pdfPagesBase64, singleImageBase64, onActiveImageChange]);

  return (
    <div className="flex flex-col h-full bg-[#16171a] border border-[#2d2e34] rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Header controls matching the exact high contrast Voynich theme */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1b1c21] border-b border-[#2d2e34] z-10 shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-500" />
          <span className="text-xs font-mono font-bold tracking-wider text-gray-300 uppercase">
            {language === "it" ? "SORGENTE CUSTOM (MANOSCRITTO)" : "CUSTOM DOCUMENT PORT"}
          </span>
        </div>
        {fileType && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-red-400 hover:text-red-300 px-2 py-1 bg-red-500/10 border border-red-500/20 hover:bg-red-500/25 rounded transition-colors uppercase tracking-widest cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            {language === "it" ? "RIMUOVI" : "REMOVE"}
          </button>
        )}
      </div>

      {/* Upload Zone & Interactive preview pane */}
      <div className="flex-1 flex flex-col p-4 overflow-y-auto min-h-[260px] sm:min-h-[380px]">
        
        {/* Upload File Drag Zone if empty */}
        {!fileType && !pdfLoading && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging 
                ? "border-cyan-500 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.15)] scale-[0.99]" 
                : "border-white/10 hover:border-cyan-500/50 hover:bg-white/1 bg-black/20"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  handleFile(files[0]);
                }
              }}
              accept="image/*,application/pdf"
              className="hidden"
            />
            
            <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-4 text-slate-400 hover:text-cyan-400 select-none group-hover:scale-110 transition-transform">
              <FileUp className="w-6 h-6 text-cyan-400 animate-pulse" />
            </div>

            <h3 className="font-mono font-bold text-sm text-slate-200 uppercase tracking-widest mb-1.5">
              {language === "it" ? "CARICA IMMAGINE O PDF" : "UPLOAD IMAGE OR PDF"}
            </h3>
            
            <p className="text-xs text-slate-400 max-w-xs leading-normal font-sans mb-4">
              {language === "it" 
                ? "Trascina qui il tuo file oppure clicca per sfogliare. Supporta fogli botanici, PDF multipli e immagini storiche."
                : "Drag & drop files here or click to browse. Fully renders botanical folios, PDFs, or ancient scans."}
            </p>

            <span className="text-[10px] font-mono font-bold text-cyan-400/60 uppercase tracking-widest px-2 py-1 bg-white/5 border border-white/5 rounded">
              PDF / JPG / PNG / WEBP
            </span>
          </div>
        )}

        {/* Loading Spinner during pdf.js initialization and file rendering */}
        {pdfLoading && (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center bg-black/10 rounded-xl border border-white/5">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-4" />
            <span className="text-xs text-slate-300 font-mono tracking-widest uppercase">
              {language === "it" ? "RENDERING ED ESTRAZIONE PAGINE..." : "SPLITTING DOC PAGES..."}
            </span>
            <span className="text-[10px] text-slate-500 font-mono tracking-wider mt-1.5 uppercase">
              {language === "it" ? "Inizializzazione motore PDF..." : "Spawning PDF.js Client-Side Thread..."}
            </span>
          </div>
        )}

        {/* Error notification block */}
        {errorMessage && (
          <div className="p-4 mb-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="text-left font-sans flex-1">
              <span className="text-xs block font-bold font-mono tracking-wider uppercase mb-0.5">
                {language === "it" ? "ERRORE DI CARICAMENTO" : "LOAD SEQUENCE ERROR"}
              </span>
              <p className="text-xs leading-normal opacity-90">{errorMessage}</p>
              {initialUrl && (
                <button 
                  onClick={() => loadFromUrl(initialUrl)}
                  className="mt-2 text-[10px] font-mono font-bold text-cyan-400 hover:text-cyan-300 underline cursor-pointer uppercase tracking-widest"
                >
                  {language === "it" ? "Riprova caricamento" : "Retry automatic load"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Dynamic Canvas Rendering block */}
        {fileType && !pdfLoading && (
          <div className="flex-1 flex flex-col space-y-4">
            
            {/* Meta status bar */}
            <div className="p-3 bg-white/5 border border-white/5 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                {fileType === "pdf" ? (
                  <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span className="text-xs font-mono font-bold text-slate-200 truncate pr-2">
                  {fileName}
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded uppercase shrink-0">
                {fileType === "pdf" ? `PDF` : `IMG`}
              </span>
            </div>

            {/* Canvas Frame */}
            <div className="flex-1 border border-white/10 rounded-xl overflow-hidden bg-[#efeadd] shadow-inner relative flex items-center justify-center p-2 min-h-[200px] sm:min-h-[300px]">
              {/* Scanline visual beam overlay */}
              <div className="absolute left-0 right-0 h-px bg-cyan-400/20 shadow-[0_0_8px_#22d3ee] pointer-events-none scan-beam"></div>
              
              <canvas 
                ref={canvasRef} 
                className="max-h-[50vh] max-w-full object-contain filter contrast-[1.02] bg-white opacity-95 rounded shadow-lg"
              />
            </div>

            {/* If multipage PDF, show pagination controls */}
            {fileType === "pdf" && numPages > 1 && (
              <div className="p-2.5 bg-black/40 border border-white/10 rounded-lg flex items-center justify-between gap-2 select-none">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-20 disabled:hover:bg-transparent rounded transition-colors flex items-center gap-1 text-xs font-mono font-bold cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  PREV
                </button>
                <span className="text-xs font-mono font-bold text-slate-300 tracking-wider">
                  {language === "it" ? `PAGINA ${currentPage} DI ${numPages}` : `PAGE ${currentPage} OF ${numPages}`}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= numPages}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-20 disabled:hover:bg-transparent rounded transition-colors flex items-center gap-1 text-xs font-mono font-bold cursor-pointer"
                >
                  NEXT
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Action buttons list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleAnalyzeClick}
                disabled={aiLoading}
                className="py-3 px-4 bg-cyan-500 text-black hover:bg-cyan-400 disabled:bg-white/5 disabled:text-slate-500 font-bold uppercase tracking-widest text-xs rounded transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:shadow-none font-mono flex items-center justify-center gap-2 cursor-pointer"
              >
                {aiLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                {language === "it" 
                  ? `ANALIZZA PAGINA ${currentPage}` 
                  : `ANALYZE PAGE ${currentPage}`}
              </button>

              <button
                onClick={handleAnalyzeAllClick}
                disabled={aiLoading}
                className="py-3 px-4 bg-indigo-500 text-white hover:bg-indigo-400 disabled:bg-white/5 disabled:text-slate-500 font-bold uppercase tracking-widest text-xs rounded transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:shadow-none font-mono flex items-center justify-center gap-2 cursor-pointer"
              >
                {aiLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Layers className="w-3.5 h-3.5" />
                )}
                {language === "it" 
                  ? `ANALIZZA TUTTO (${numPages} pag)` 
                  : `ANALYZE ALL PAGES (${numPages})`}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
