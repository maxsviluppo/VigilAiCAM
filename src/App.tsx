import { useState, useEffect, useRef } from "react";
import { Hotspot, Theory, LetterMap, DecryptionResult } from "./types";
import { DECRYPTION_THEORIES, EVA_ALPHABET } from "./data";
import { VoynichText } from "./components/VoynichText";
import { DocumentLoader } from "./components/DocumentLoader";
import {
  Compass,
  Brain,
  Keyboard,
  Sparkles,
  Sliders,
  BookOpen,
  FileText,
  Languages,
  Info,
  HelpCircle,
  Key,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  X,
  Maximize2,
  Minus,
  Plus,
  RotateCcw
} from "lucide-react";

// ─────────────────────────────────────────────
//  STATIC DATA (hotspots and theories mirror
//  what the compiled bundle has at runtime)
// ─────────────────────────────────────────────
const HOTSPOTS: Hotspot[] = [
  {
    id: "flowers",
    name: "Inflorescence (Top Bud)",
    nameIt: "Infiorescenza (Bocciolo Apicale)",
    x: 48, y: 11, width: 14, height: 10,
    description: "The crown of the plant has a dark, shaded semi-spherical capsule. Historically identified with poppy pods, pomegranate seeds, or customized alchemical capsules.",
    descriptionIt: "La cima presenta una capsula semisferica scura e sfumata. Storicamente accostata al papavero da oppio, al melograno, o ad capsule protettive racchiuse ideate dagli alchimisti del XV secolo.",
    evaTranscription: "",
  },
  {
    id: "green_leaves",
    name: "Fresh Green Foliage",
    nameIt: "Fogliame Verde Smeraldo",
    x: 23, y: 28, width: 25, height: 18,
    description: "Symmetric leaves on lateral branches coated with a deep green pigment (likely copper verdigris). Some leaves remain uncolored draft templates.",
    descriptionIt: "Foglie simmetriche sui rami laterali colorate con un pigmento verde profondo (verderame). La disposizione si alterna ritmicamente con rami aventi foglie ocra.",
    evaTranscription: "",
  },
  {
    id: "yellow_leaves",
    name: "Deciduous Yellow Foliage",
    nameIt: "Fogliame Giallo Autunnale",
    x: 52, y: 20, width: 23, height: 18,
    description: "Opposite leaves colored of light ochre. This bicoloration might express a dry state, biological phases, or alchemical hot/cold polarities.",
    descriptionIt: "Foglie opposte tinte di ocra chiaro. Questa bicolorazione potrebbe indicare uno stato essiccato del vegetale, fasi biologiche o polarità alchemiche caldo/freddo.",
    evaTranscription: "",
  },
  {
    id: "roots",
    name: "Stylized Rhizome & Soil",
    nameIt: "Rizoma e Terreno Tratteggiato",
    x: 18, y: 81, width: 63, height: 15,
    description: "A solid, scaly root horizontal block resembling a scaly bulb or tuber, standing over stylized hills drawn with wavy hatching strokes.",
    descriptionIt: "Uscendo da un bulbo squadrato, la radice possiede un fusto orizzontale scaglioso che posa su basse collinette tratteggiate ondulate tipiche dell'autore.",
    evaTranscription: "",
  },
  {
    id: "paragraph_top_left",
    name: "Paragraph A (Top Left)",
    nameIt: "Paragrafo A (In Alto a Sinistra)",
    x: 16, y: 50, width: 25, height: 11,
    description: "Introductory paragraph surrounding the left side of the stem, featuring common Voynich beginnings and repetitive syllable grids.",
    descriptionIt: "Paragrafo di apertura a sinistra del fusto. Contiene termini corti con la classica frequenza ripetitiva tipica dei paragrafi erboristici Voynich.",
    evaTranscription: `tfccy dready or\no tteeo dyedy ot oorg\n8o ttey otteotey oty\n8or dtoltco 8an 8an`,
    translationIt: "Raccogli le foglie bicolore mature e falle bollire nel vaso all'alba. Posa tre gocce sul ciglio dell'occhio malato per riposare l'anima tormentata.",
    translationEn: "Gather mature bi-colored leaves and boil them in the morning vessel. Place three drops upon the ailing eye to soothe the restless mind.",
    wordByWord: [
      { voynichWord: "tfccy", translation: "Raccogli ed estrai", explanation: "Verbo d'azione iniziale tipico dei ricettari medievali." },
      { voynichWord: "dready", translation: "le foglie fresche", explanation: "Termine indicante fogliame o parti verdi della pianta." },
      { voynichWord: "or", translation: "di colore verde e ocra", explanation: "Congiunzione o aggettivo descrittivo del bicolore." },
      { voynichWord: "8o", translation: "esattamente tre gocce", explanation: "Prefisso numerico quantitativo o frazione alchemica." },
      { voynichWord: "ttey", translation: "sulla palpebra o bordo", explanation: "Indicazione anatomica della zona d'applicazione." },
      { voynichWord: "8an", translation: "agitata dal delirio", explanation: "Stato d'inquietudine o febbre alta del paziente." },
    ]
  },
  {
    id: "paragraph_top_right",
    name: "Paragraph B (Top Right)",
    nameIt: "Paragrafo B (In Alto a Destra)",
    x: 58, y: 52, width: 35, height: 10,
    description: "Paragraph on the right side of the main stem, featuring double-loop cursive-like glyphs ('gallows').",
    descriptionIt: "Paragrafo a destra dello stelo. Fornisce parole lunghe e ricche di lettere 'gallows' a doppia asola (caratteri t e k).",
    evaTranscription: `ot tteey oror dtan\n8oro dttoda ottoda8 cro8y\n8 ttooddy ettey totteorody 8an\n2ooudy eeolto8a`,
    translationIt: "Unisci gli steli secchi del fiore d'oro con l'acqua sorgiva del monte sacro. Mescola lentamente finché la pozione non rilascia una fitta nebbia argentea.",
    translationEn: "Mix the withered golden stems with spring water from the high mount. Stir slowly until the liquor emits a thick, silvery mist.",
    wordByWord: [
      { voynichWord: "ot", translation: "Unisci / Mescola insieme", explanation: "Azione di combinazione di ingredienti secchi." },
      { voynichWord: "tteey", translation: "le parti legnose dello stelo", explanation: "Riferimento ai rami o legnetti del fiore." },
      { voynichWord: "8oro", translation: "dorato", explanation: "Colore giallo brillante o valore nobile solare." },
      { voynichWord: "8an", translation: "non produce o esala", explanation: "Emissione di sostanze volatili." },
    ]
  },
  {
    id: "paragraph_bottom_left",
    name: "Paragraph C (Bottom Left)",
    nameIt: "Paragrafo C (In Basso a Sinistra)",
    x: 16, y: 62, width: 32, height: 16,
    description: "Large paragraph on lower-left containing complex ligature clusters. Notice the highly nested letters resembling 15th-century abbreviations.",
    descriptionIt: "Grande blocco in basso a sinistra contenente sequenze di lettere concatenate ('ch', 'sh', 'ol'). Lo stile richiama molto le abbreviazioni notarili del XV secolo.",
    evaTranscription: `totla8 dror 8and dteoa8\ncrotly cror dteor 8tor ottas\nte or tteee occor 8or tteey\nottorteor llot tltey cror lta\ndor ottor cror 8ody lta 8an\ntlan ctotloccy 8as croda`,
    translationIt: "L'autunno ritira la linfa dai rami inferiori per raccoglierla nel fusto grasso. Cuoci il rizoma scaglioso sul fuoco lento fino a ridurlo in pasta lenitiva per le infezioni della pelle.",
    translationEn: "Autumn draws the sap down from the lower branches into the swollen stalk. Roast the scaly rhizome over a slow flame for a soothing ointment against dermal plagues.",
    wordByWord: [
      { voynichWord: "totla8", translation: "Il tempo freddo del raccolto", explanation: "Riferimento alla stagione autunnale." },
      { voynichWord: "dror", translation: "richiama o nasconde", explanation: "Azione naturale di riflusso della linfa." },
      { voynichWord: "8and", translation: "il fluido vitale", explanation: "Sostanza nutritiva della pianta (linfa)." },
      { voynichWord: "8an", translation: "colpita dal male", explanation: "Tessuto infetto o dolorante." },
    ]
  },
  {
    id: "paragraph_bottom_right",
    name: "Paragraph D (Bottom Right)",
    nameIt: "Paragrafo D (In Basso a Destra)",
    x: 53, y: 64, width: 40, height: 16,
    description: "The concluding block on the right, ending with the standard 'tor cro8ad' formula, found in many Voynich herbal pages.",
    descriptionIt: "Blocco conclusivo sulla destra. Termina con la tipica formula ripetitiva 'tor cro8ad', ricorrente nelle chiusure di decine di capitoli botanici.",
    evaTranscription: `8an crty tlo8a olland crofdy\n8o rccca crodo qor cry ttey\nottos 8or 8oro qttos 8or cro8y\ncror etteor crody ctor 8and\ncroy sotol ottor 8ad croda\n2crody tor cro8ad`,
    translationIt: "Conserva la miscela al riparo dal sole d'inverno. Somministra due cucchiai per lenire la tosse cupa ed indurre un sonno ristoratore privo di incubi molesti. Sigilla con cera vergine.",
    translationEn: "Store this mixture safe from the harsh winter sun. Administer two spoonfuls to quiet the heavy cough and induce a blessed sleep free of bad dreams. Seal with virgin wax.",
    wordByWord: [
      { voynichWord: "8an", translation: "Custodisci in luogo asciutto", explanation: "Istruzioni di conservazione a lungo termine." },
      { voynichWord: "crty", translation: "il preparato filtrato", explanation: "Oggetto della conservazione." },
      { voynichWord: "tor", translation: "preservi intatta", explanation: "Mantenimento dei principi attivi." },
      { voynichWord: "cro8ad", translation: "la sua virtù medicamentosa", explanation: "Efficacia curativa nel tempo." },
    ]
  },
];

export default function App() {
  const language = useState<"it" | "en">("it");
  const [lang, setLang] = language;

  const isLocalFile = typeof window !== "undefined" && window.location.protocol === "file:";
  const isWrongPort = typeof window !== "undefined" && window.location.hostname === "localhost" && window.location.port !== "3000" && window.location.port !== "";

  const [activeTab, setActiveTab] = useState<"analyzer" | "sandbox" | "keyboard">("analyzer");
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot>(HOTSPOTS[0]);

  const scrollToWorkbench = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setTimeout(() => {
        document.getElementById("decryption-workbench-col")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };
  const [customQuestion, setCustomQuestion] = useState<string>("");
  const [aiResponse, setAiResponse] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  // Sandbox state
  const [selectedParagraph, setSelectedParagraph] = useState<Hotspot>(
    HOTSPOTS.find(h => h.id === "paragraph_top_left") || HOTSPOTS[4]
  );
  const [scannedParagraphs, setScannedParagraphs] = useState<Hotspot[]>([]);
  const [selectedTheory, setSelectedTheory] = useState<Theory>(DECRYPTION_THEORIES[0]);
  const [letterMapping, setLetterMapping] = useState<Record<string, string>>(
    DECRYPTION_THEORIES[0].exampleSubstitution || {}
  );
  const [autoDecryptLoading, setAutoDecryptLoading] = useState<boolean>(false);
  const [autoDecryptResult, setAutoDecryptResult] = useState<DecryptionResult | null>(null);
  const [typedText, setTypedText] = useState<string>("8am croda ttey");

  // Document source state
  const [documentSource, setDocumentSource] = useState<"voynich_pdf" | "custom">("voynich_pdf");
  const [isCustomActive, setIsCustomActive] = useState<boolean>(false);
  const [activeUploadedImage, setActiveUploadedImage] = useState<string>("");
  const [allUploadedImages, setAllUploadedImages] = useState<string[]>([]);

  // API key state
  const [customApiKey, setCustomApiKey] = useState<string>(
    () => localStorage.getItem("voynich_gemini_api_key") || ""
  );
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  // Response cache
  const [responseCache, setResponseCache] = useState<Record<string, string>>({});

  // Zoom state
  const [zoomOpen, setZoomOpen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const voynichPdfUrl = "https://q9erdk37kmrihba0.public.blob.vercel-storage.com/Voynich-Manuscript.pdf";

  const handleApiKeyChange = (key: string) => {
    setCustomApiKey(key);
    localStorage.setItem("voynich_gemini_api_key", key);
  };

  const apiHeaders = () => ({
    "Content-Type": "application/json",
    ...(customApiKey ? { "x-api-key": customApiKey } : {}),
  });

  const safeFetchJson = async (url: string, options: RequestInit) => {
    const res = await fetch(url, options);
    const contentType = res.headers.get("content-type") || "";
    
    if (!res.ok) {
      let errorMessage = `HTTP Error ${res.status}`;
      if (contentType.includes("application/json")) {
        try {
          const errData = await res.json();
          errorMessage = errData.error || errData.message || errorMessage;
        } catch (_) {}
      } else {
        const text = await res.text();
        if (res.status === 404) {
          errorMessage = lang === "it"
            ? "L'endpoint API non è stato trovato (Errore 404). Verifica di essere collegato sulla porta corretta (solitamente http://localhost:3000) e non direttamente sulla porta di Vite (solitamente http://localhost:5173)."
            : "The API endpoint was not found (404 Error). Ensure you are connected to the correct port (usually http://localhost:3000) and not directly to Vite's dev port (usually http://localhost:5173).";
        } else {
          errorMessage = text.substring(0, 150) || errorMessage;
        }
      }
      throw new Error(errorMessage);
    }

    if (!contentType.includes("application/json")) {
      const text = await res.text();
      let extraInfo = "";
      if (text.toLowerCase().includes("page not found") || text.toLowerCase().includes("cannot be found") || text.toLowerCase().includes("can't find") || res.status === 404) {
        extraInfo = lang === "it"
          ? " L'endpoint API non è stato trovato. Verifica di essere collegato sulla porta corretta (solitamente http://localhost:3000) e non direttamente sulla porta di Vite (solitamente http://localhost:5173)."
          : " The API endpoint was not found. Ensure you are connected to the correct port (usually http://localhost:3000) and not directly to Vite's dev port (usually http://localhost:5173).";
      }
      throw new Error((lang === "it" 
        ? "Il server non ha risposto con dati JSON validi." 
        : "The server did not respond with valid JSON.") + extraInfo + ` (Risposta: "${text.slice(0, 50)}...")`);
    }

    return await res.json();
  };

  // ── Handlers ────────────────────────────────

  const handleAnalyzeCustomPage = async (imageBase64: string, pageNum: number) => {
    setAiLoading(true);
    setAiResponse("");
    setActiveTab("analyzer");
    scrollToWorkbench();
    try {
      const data = await safeFetchJson("/api/analyze", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          elementId: `custom_page_${pageNum}`,
          label: lang === "it" ? `Pagina Caricata ${pageNum}` : `Uploaded Page ${pageNum}`,
          imageBase64,
          customQuestion: customQuestion || (lang === "it"
            ? `Analizza la pagina ${pageNum} del documento. Fornisci SEMPRE una sezione 'TRASCRIZIONE EVA:' con i glifi identificati e una sezione 'TRADUZIONE:' con l'ipotesi di significato.`
            : `Analyze page ${pageNum}. Always include a 'TRASCRIZIONE EVA:' section with identified glyphs and a 'TRANSLATION:' section with the hypothesized meaning.`),
          language: lang,
        }),
      });
      if (data.success) {
        setAiResponse(data.text);
        setResponseCache(prev => ({ ...prev, [imageBase64]: data.text }));
      } else {
        setAiResponse(lang === "it"
          ? `Errore durante l'analisi della pagina: ${data.error}`
          : `Page analysis failed: ${data.error}`);
      }
    } catch (e: any) {
      setAiResponse(lang === "it"
        ? `Impossibile comunicare con il server per l'analisi: ${e.message}`
        : `Could not reach backend parser: ${e.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAnalyzeCustomAll = async (images: string[]) => {
    setAiLoading(true);
    setAiResponse("");
    setActiveTab("analyzer");
    scrollToWorkbench();
    try {
      const data = await safeFetchJson("/api/analyze", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          elementId: "custom_full_doc",
          label: lang === "it" ? `Documento Completo (${images.length} pag)` : `Full Document (${images.length} pages)`,
          imagesBase64: images,
          customQuestion: customQuestion || (lang === "it"
            ? `Esegui uno studio approfondito di tutte le ${images.length} pagine di questo documento. Cerca correlazioni visuali, coerenza stilistica di scrittura e formula un responso paleografico sintetico sul manoscritto.`
            : `Analyze all ${images.length} pages of this custom document sequentially. Track correlations, scribal consistency, and formulate a unified paleographic synopsis.`),
          language: lang,
        }),
      });
      if (data.success) {
        setAiResponse(data.text);
      } else {
        setAiResponse(lang === "it"
          ? `Errore durante l'analisi globale: ${data.error}`
          : `Full analysis failed: ${data.error}`);
      }
    } catch (e: any) {
      setAiResponse(lang === "it"
        ? `Rete non raggiungibile per studio globale: ${e.message}`
        : `Network problem parsing document: ${e.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  // Sync theory mapping when theory changes
  useEffect(() => {
    if (selectedTheory.exampleSubstitution) {
      setLetterMapping(selectedTheory.exampleSubstitution);
    } else {
      setLetterMapping({});
    }
    setAutoDecryptResult(null);
  }, [selectedTheory]);

  // Parse scanned paragraphs from AI response
  function parseScannedParagraphs(text: string): Hotspot[] {
    if (!text) return [];
    const jsonBlockRe = /```json\s*([\s\S]*?)\s*```/;
    const arrayRe = /(\[\s*\{\s*"id"[\s\S]*\}\s*\])/;
    let raw = "";
    const blockMatch = text.match(jsonBlockRe);
    if (blockMatch && blockMatch[1]) {
      raw = blockMatch[1].trim();
    } else {
      const arrMatch = text.match(arrayRe);
      if (arrMatch && arrMatch[1]) raw = arrMatch[1].trim();
    }
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((w: any, idx: number) => ({
            id: w.id || `scanned_par_${idx + 1}`,
            name: w.name || w.nameIt || `Paragraph ${idx + 1}`,
            nameIt: w.nameIt || w.name || `Paragrafo ${idx + 1}`,
            x: w.x || 0, y: w.y || 0, width: w.width || 0, height: w.height || 0,
            description: w.description || w.descriptionIt || "",
            descriptionIt: w.descriptionIt || w.description || "",
            evaTranscription: w.evaTranscription || w.eva || "",
            translationIt: w.translationIt || w.translation || "",
            translationEn: w.translationEn || w.translation || "",
            wordByWord: Array.isArray(w.wordByWord)
              ? w.wordByWord.map((ww: any) => ({
                  voynichWord: ww.voynichWord || ww.word || ww.voynich || "",
                  translation: ww.translation || ww.meaning || ww.translationIt || "",
                  explanation: ww.explanation || ww.desc || ww.explanationIt || "",
                }))
              : [],
          }));
        }
      } catch (err) {
        console.error("JSON parsing error:", err);
      }
    }
    return [];
  }

  // Extract EVA from free-text AI response
  function extractEvaFromText(text: string): string {
    const lines = text.split("\n");
    const evaIdx = lines.findIndex(l =>
      l.toUpperCase().includes("EVA") ||
      l.toUpperCase().includes("TRASCRIZIONE") ||
      l.toUpperCase().includes("TRANSCRIPTION")
    );
    if (evaIdx !== -1) {
      const out: string[] = [];
      for (let i = evaIdx + 1; i < lines.length; i++) {
        const ln = lines[i].trim();
        if (ln && (
          (ln.includes(":") && (ln.includes("TRADUZIONE") || ln.includes("ANALISI"))) ||
          ln.startsWith("#") || ln.startsWith("**") ||
          (out.push(ln), out.length > 10)
        )) break;
      }
      if (out.length > 0) return out.join("\n");
    }
    const evaRe = /[a-z89]{3,}/g;
    const matches = text.match(evaRe);
    return matches && matches.length > 5
      ? matches.slice(0, 20).join(" ")
      : text.slice(0, 200) + "...";
  }

  // Extract translation from AI text
  function extractTranslation(text: string, targetLang: string): string {
    const keywords = targetLang === "it"
      ? ["TRADUZIONE", "ITALIANO", "TESTO CHIARO"]
      : ["TRANSLATION", "ENGLISH", "CLEARTEXT"];
    const lines = text.split("\n");
    let idx = -1;
    for (const kw of keywords) {
      idx = lines.findIndex(l => l.toUpperCase().includes(kw));
      if (idx !== -1) break;
    }
    if (idx !== -1) {
      const out: string[] = [];
      for (let i = idx + 1; i < lines.length; i++) {
        const ln = lines[i].trim();
        if (ln && (
          (ln.includes(":") && (ln.includes("EVA") || ln.includes("TRASCRIZIONE"))) ||
          ln.startsWith("#") ||
          (ln.startsWith("**") && !ln.includes(keywords[0])) ||
          (out.push(ln), out.length > 5)
        )) break;
      }
      if (out.length > 0) return out.join(" ").replace(/[*_]/g, "");
    }
    return "";
  }

  // Sync aiResponse → scannedParagraphs + selectedParagraph
  useEffect(() => {
    if (aiResponse && !aiLoading) {
      const parsed = parseScannedParagraphs(aiResponse);
      if (parsed.length > 0) {
        setScannedParagraphs(parsed);
        setSelectedParagraph(parsed[0]);
      } else {
        setScannedParagraphs([]);
        const activeEntry: Hotspot = {
          id: "custom_active_scan",
          name: lang === "it" ? "Pagina Caricata (Analisi Attiva)" : "Uploaded Page (Active Scan)",
          nameIt: "Pagina Caricata (Analisi Attiva)",
          x: 0, y: 0, width: 100, height: 100,
          description: lang === "it" ? "Risultati dell'analisi IA corrente." : "Current AI analysis results.",
          descriptionIt: "Risultati dell'analisi IA corrente.",
          evaTranscription: extractEvaFromText(aiResponse),
          translationIt: extractTranslation(aiResponse, "it"),
          translationEn: extractTranslation(aiResponse, "en"),
        };
        setSelectedParagraph(activeEntry);
      }
    } else if (!aiLoading) {
      setScannedParagraphs([]);
      if (documentSource === "voynich_pdf") {
        const def = HOTSPOTS.find(h => h.id === "paragraph_top_left") || HOTSPOTS[4];
        setSelectedParagraph(def);
      } else {
        setSelectedParagraph({
          id: "custom_no_scan",
          name: lang === "it" ? "In attesa di analisi..." : "Awaiting scan...",
          nameIt: "In attesa di analisi...",
          x: 0, y: 0, width: 0, height: 0,
          description: lang === "it" ? "Esegui una scansione per visualizzare i dati." : "Run a scan to view data.",
          descriptionIt: "Esegui una scansione per visualizzare i dati.",
          evaTranscription: "",
          translationIt: "",
          translationEn: "",
        });
      }
    }
  }, [aiResponse, aiLoading, documentSource, lang]);

  // Cache-based response restore on hotspot/image change
  useEffect(() => {
    let key = "none";
    if (documentSource === "custom" || documentSource === "voynich_pdf") {
      key = activeUploadedImage || "custom_empty";
    } else {
      key = selectedHotspot?.id || "none";
    }
    if (responseCache[key]) {
      setAiResponse(responseCache[key]);
    } else {
      setAiResponse("");
    }
  }, [selectedHotspot, activeUploadedImage, documentSource]);

  const handleConsultAi = async (hotspot: Hotspot | null, question?: string) => {
    setAiLoading(true);
    const elementId = hotspot ? hotspot.id : "custom_query";
    const label = hotspot ? (lang === "it" ? hotspot.nameIt : hotspot.name) : "Custom";
    const q = question || customQuestion;
    try {
      const data = await safeFetchJson("/api/analyze", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          elementId,
          label,
          imageBase64: (documentSource === "custom" || documentSource === "voynich_pdf") ? activeUploadedImage : undefined,
          customQuestion: q,
          language: lang,
        }),
      });
      if (data.success) {
        setAiResponse(data.text);
        const cacheKey = (documentSource === "custom" || documentSource === "voynich_pdf") ? activeUploadedImage : elementId;
        setResponseCache(prev => ({ ...prev, [cacheKey]: data.text }));
      } else {
        setAiResponse(lang === "it"
          ? `Errore durante la decifrazione: ${data.error}`
          : `Decompiling error: ${data.error}`);
      }
    } catch (e: any) {
      setAiResponse(lang === "it"
        ? `Impossibile contattare la cabina paleografica: ${e.message}`
        : `Could not reach decryption core: ${e.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAutoDecrypt = async () => {
    setAutoDecryptLoading(true);
    setAutoDecryptResult(null);
    try {
      const data: DecryptionResult & { success: boolean; error?: string } = await safeFetchJson("/api/decrypt-auto", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          textToDecrypt: selectedParagraph.evaTranscription,
          cipherMethod: selectedTheory.nameIt,
          customMapping: letterMapping,
          language: lang,
        }),
      });
      if (data.success) {
        setAutoDecryptResult(data);
        if (data.suggestedMapping) setLetterMapping(data.suggestedMapping);
      } else {
        console.error("Auto decrypt error:", data.error);
      }
    } catch (e: any) {
      console.error("Network problem on decryption solver:", e);
    } finally {
      setAutoDecryptLoading(false);
    }
  };

  const handleMappingChange = (evaChar: string, value: string) => {
    setLetterMapping(prev => ({ ...prev, [evaChar]: value.toLowerCase().slice(0, 3) }));
  };

  const handleResetMapping = () => {
    if (selectedTheory.exampleSubstitution) {
      setLetterMapping(selectedTheory.exampleSubstitution);
    } else {
      setLetterMapping({});
    }
    setAutoDecryptResult(null);
  };

  const applyMapping = (text: string): string =>
    text.split("").map(ch => {
      const lower = ch.toLowerCase();
      if (lower === "\n") return "\n";
      if (lower === " ") return "  ";
      return letterMapping[lower] !== undefined && letterMapping[lower] !== "" ? letterMapping[lower] : `_${ch}_`;
    }).join("");

  const activeParagraphs: Hotspot[] = scannedParagraphs.length > 0
    ? scannedParagraphs
    : documentSource === "voynich_pdf"
      ? HOTSPOTS.filter(h => h.id.startsWith("paragraph_"))
      : (selectedParagraph ? [selectedParagraph] : []);

  const pageEvaTranscription = activeParagraphs
    .map(p => p.evaTranscription || "")
    .filter(Boolean)
    .join("\n\n");

  const buildWordList = () => {
    const list: any[] = [];
    activeParagraphs.forEach((p) => {
      if (!p.evaTranscription) return;
      const words = p.evaTranscription
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .split(/[\s\n]+/)
        .filter(w => w.trim() !== "");
      words.forEach((word, idx) => {
        const lower = word.toLowerCase().trim();
        const wbw = p.wordByWord?.find(w => w.voynichWord.toLowerCase().trim() === lower);
        const deciphered = applyMapping(word).trim();
        list.push({
          id: `${p.id}-${word}-${idx}`,
          original: word,
          deciphered,
          translation: wbw?.translation || null,
          explanation: wbw?.explanation || null,
          paragraphName: lang === "it" ? p.nameIt : p.name,
        });
      });
    });
    return list;
  };

  const computeCharFreq = (text: string) => {
    const clean = text.replace(/[\s\n]/g, "").toLowerCase();
    const freq: Record<string, number> = {};
    for (const ch of clean) freq[ch] = (freq[ch] || 0) + 1;
    return Object.entries(freq)
      .sort(([, a], [, b]) => b - a)
      .map(([char, count]) => ({ char, count, percent: ((count / clean.length) * 100).toFixed(1) }));
  };

  const computeCoincidenceIndex = (text: string): number => {
    const clean = text.replace(/[\s\n]/g, "").toLowerCase();
    const n = clean.length;
    if (n <= 1) return 0;
    const freq: Record<string, number> = {};
    for (const ch of clean) freq[ch] = (freq[ch] || 0) + 1;
    let sum = 0;
    for (const count of Object.values(freq)) sum += count * (count - 1);
    return sum / (n * (n - 1));
  };

  const charFreq = computeCharFreq(pageEvaTranscription);
  const coincidenceIndex = computeCoincidenceIndex(pageEvaTranscription);

  // ── RENDER ──────────────────────────────────
  return (
    <div className="min-h-screen text-slate-300 flex flex-col font-sans overflow-x-hidden relative selection:bg-cyan-500/30 selection:text-white" style={{background: 'linear-gradient(135deg, #020408 0%, #050a14 35%, #060b12 65%, #04080d 100%)', backgroundAttachment: 'fixed'}}>
      {/* Dot grid background */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{ backgroundImage: "radial-gradient(rgba(34,211,238,0.04) 1px, transparent 1px)", backgroundSize: "28px 28px" }}
      />
      {/* Top gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none z-20" style={{background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.4) 30%, rgba(99,102,241,0.5) 70%, transparent)'}} />

      {/* ── Header ──────────────────────────────── */}
      <header className="min-h-16 h-auto py-3 sm:py-0 sm:h-16 flex flex-col md:flex-row items-center justify-between px-4 sm:px-8 gap-4 md:gap-0 relative z-20 shrink-0" style={{background: 'rgba(5,10,18,0.88)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)'}}>
        {/* Logo / Title */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-start">
          <div className="w-9 h-9 flex items-center justify-center rounded-xl shrink-0 relative" style={{background: 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(99,102,241,0.15))', border: '1px solid rgba(34,211,238,0.25)', boxShadow: '0 0 16px rgba(34,211,238,0.12)'}}>
            <div className="w-4 h-4 border-2 rounded-sm" style={{borderColor: '#22d3ee', transform: 'rotate(45deg)', boxShadow: '0 0 8px rgba(34,211,238,0.4)'}} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm sm:text-base font-bold tracking-[0.12em] uppercase" style={{fontFamily: 'Cinzel, Georgia, serif', background: 'linear-gradient(135deg, #e2e8f0, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>
              {lang === "it" ? "Decifratore Voynich" : "Voynich Decipherer"}
              <span style={{fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', letterSpacing: '0.15em', color: 'rgba(34,211,238,0.5)', WebkitTextFillColor: 'rgba(34,211,238,0.5)', marginLeft: '8px'}}>v4.0.2</span>
            </h1>
            <p className="hidden sm:block" style={{fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(34,211,238,0.6)'}}>
              {lang === "it" ? "Crittanalisi Botanica · IA" : "Botanical Cryptanalysis · AI"}
            </p>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 sm:gap-3 w-full md:w-auto">
          {/* Status pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full" style={{background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.14)'}}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{boxShadow: '0 0 6px #34d399'}} />
            <span style={{fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: '#34d399', letterSpacing: '0.10em', textTransform: 'uppercase'}}>Online</span>
          </div>

          {/* API Key input */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full w-full max-w-[260px] md:w-auto" style={{background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)'}}>
            <Key className="w-3 h-3 text-cyan-400/70 shrink-0" />
            <input
              type={showApiKey ? "text" : "password"}
              value={customApiKey}
              onChange={e => handleApiKeyChange(e.target.value)}
              placeholder="API KEY"
              className="bg-transparent focus:outline-none text-cyan-300 w-full placeholder:text-slate-600"
              style={{fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', letterSpacing: '0.05em'}}
            />
            <button onClick={() => setShowApiKey(v => !v)} className="btn-icon" type="button" style={{width: '22px', height: '22px'}} title={showApiKey ? "Nascondi" : "Mostra"}>
              {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="btn-icon" style={{width: '22px', height: '22px'}} title="Ottieni API Key">
              <HelpCircle className="w-3 h-3" />
            </a>
          </div>

          {/* Language toggle */}
          <div className="flex items-center rounded-full p-0.5" style={{background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)'}}>
            {(["it", "en"] as const).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className="px-3 py-1 rounded-full cursor-pointer transition-all"
                style={lang === l ? {background: 'linear-gradient(135deg,#06b6d4,#6366f1)', color: '#fff', fontFamily: 'JetBrains Mono', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', boxShadow: '0 0 12px rgba(34,211,238,0.25)'} : {color: '#64748b', fontFamily: 'JetBrains Mono', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em'}}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Wiki link */}
          <a
            href="https://it.wikipedia.org/wiki/Manoscritto_Voynich"
            target="_blank"
            rel="noreferrer"
            className="btn-icon hidden sm:inline-flex"
            title={lang === "it" ? "Documentazione Storica" : "Historical Docs"}
          >
            <BookOpen className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Warning banner for incorrect port or protocol */}
      {(isLocalFile || isWrongPort) && (
        <div className="relative z-20 bg-amber-500/10 border-b border-amber-500/20 px-5 sm:px-8 py-3 text-amber-300 text-xs flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>
              {isLocalFile ? (
                lang === "it"
                  ? "Attenzione: L'applicazione è aperta come file locale (file://). Per far funzionare l'analisi con l'IA, devi avviarla da terminale ed aprirla all'indirizzo http://localhost:3000."
                  : "Warning: The application is open as a local file (file://). To run AI analysis, start the server and access it at http://localhost:3000."
              ) : (
                lang === "it"
                  ? `Attenzione: Sei collegato sulla porta di sviluppo di Vite (porta ${window.location.port}). L'analisi con l'IA non funzionerà se non accedi tramite la porta del server Express (http://localhost:3000).`
                  : `Warning: You are connected to the Vite development port (port ${window.location.port}). AI analysis will not function unless you access the app via the Express server port (http://localhost:3000).`
              )}
            </span>
          </div>
          <a
            href="http://localhost:3000"
            className="px-3 py-1 bg-amber-500 text-black font-bold font-mono rounded hover:bg-amber-400 text-[10px] uppercase shrink-0 transition-colors"
          >
            {lang === "it" ? "Vai a porta 3000" : "Go to port 3000"}
          </a>
        </div>
      )}

      {/* ── Main Grid ───────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch relative z-10">

        {/* LEFT COLUMN */}
        <section className="lg:col-span-5 flex flex-col h-full min-h-[500px]" id="manuscript-stage-col">
          {/* Source selector + Zoom button */}
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <div className="flex flex-1 items-center gap-1.5 p-1.5 rounded-2xl no-scrollbar" style={{background: 'rgba(8,14,26,0.70)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)'}}>
              <span className="section-label ml-1 shrink-0">
                {lang === "it" ? "Sorgente" : "Source"}
              </span>
              <div className="flex gap-1 overflow-x-auto no-scrollbar ml-auto">
                {(["voynich_pdf", "custom"] as const).map(src => (
                  <button
                    key={src}
                    onClick={() => { setDocumentSource(src); setAiResponse(""); }}
                    className="cursor-pointer whitespace-nowrap rounded-xl transition-all px-3 py-1.5"
                    style={documentSource === src
                      ? {background: 'linear-gradient(135deg,#06b6d4,#4f46e5)', color: '#fff', fontFamily: 'JetBrains Mono', fontSize: '9px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', boxShadow: '0 0 14px rgba(34,211,238,0.22)'}
                      : {color: '#64748b', fontFamily: 'JetBrains Mono', fontSize: '9px', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase'}}
                  >
                    {src === "voynich_pdf" ? (lang === "it" ? "PDF Voynich" : "Full PDF MS") : (lang === "it" ? "Carica Altro" : "Upload Other")}
                  </button>
                ))}
              </div>
            </div>
            {/* Zoom button */}
            <button
              onClick={() => { setZoomLevel(100); setZoomOpen(true); }}
              className="btn-secondary shrink-0 gap-1.5"
              title={lang === "it" ? "Apri visualizzatore zoom pagina" : "Open zoom viewer"}
              style={{borderRadius: '14px', padding: '8px 14px'}}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline" style={{fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.10em', textTransform: 'uppercase', fontWeight: 700}}>Zoom</span>
            </button>
          </div>

          {/* Document loader */}
          <DocumentLoader
            key={documentSource}
            language={lang}
            onAnalyzePage={handleAnalyzeCustomPage}
            onAnalyzeAll={handleAnalyzeCustomAll}
            aiLoading={aiLoading}
            onSelectExternalActiveStatus={setIsCustomActive}
            onActiveImageChange={(img, all) => {
              setActiveUploadedImage(img);
              setAllUploadedImages(all);
            }}
            initialUrl={documentSource === "voynich_pdf" ? voynichPdfUrl : undefined}
          />
        </section>

        {/* RIGHT COLUMN */}
        <section className="lg:col-span-7 flex flex-col overflow-hidden" id="decryption-workbench-col" style={{background: 'rgba(6,11,22,0.82)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', boxShadow: '0 8px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)'}}>
          {/* Tab bar */}
          <div className="flex overflow-x-auto no-scrollbar" style={{background: 'rgba(4,8,18,0.60)', borderBottom: '1px solid rgba(255,255,255,0.06)'}}>
            {([
              {id: 'analyzer', icon: Brain, labelIt: 'Analisi IA', labelEn: 'AI Analyzer', color: 'cyan'},
              {id: 'sandbox', icon: Sliders, labelIt: 'Crittanalisi', labelEn: 'Cipher Sandbox', color: 'indigo'},
              {id: 'keyboard', icon: Keyboard, labelIt: 'Tastiera EVA', labelEn: 'EVA Writer', color: 'cyan'},
            ] as const).map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id as any;
              const accent = tab.color === 'indigo' ? '#818cf8' : '#22d3ee';
              const accentBg = tab.color === 'indigo' ? 'rgba(99,102,241,0.08)' : 'rgba(34,211,238,0.06)';
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id as any); scrollToWorkbench(); }}
                  className="flex-1 min-w-[80px] flex flex-col xs:flex-row items-center justify-center gap-1 xs:gap-2 py-3 xs:py-4 cursor-pointer transition-all"
                  style={active
                    ? {borderBottom: `2px solid ${accent}`, color: accent, background: accentBg, fontFamily: 'JetBrains Mono', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase'}
                    : {borderBottom: '2px solid transparent', color: '#475569', fontFamily: 'JetBrains Mono', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase'}}
                >
                  <Icon className="w-3.5 h-3.5 xs:w-4 xs:h-4 shrink-0" style={{color: active ? accent : '#334155'}} />
                  <span className="text-[9px] xs:text-[10px] sm:text-xs text-center xs:text-left">{lang === "it" ? tab.labelIt : tab.labelEn}</span>
                </button>
              );
            })}
          </div>

          {/* ── ANALYZER TAB ──────────────────────── */}
          {activeTab === "analyzer" && (
            <div className="flex-1 p-5 overflow-y-auto space-y-5 max-h-[72vh] flex flex-col justify-between">
              <div className="space-y-4">
                {/* Selected element card */}
                <div className="p-5 relative overflow-hidden group" style={{background: 'rgba(10,18,34,0.60)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)'}}>
                  <div className="absolute top-0 right-0 p-4 opacity-[0.04] pointer-events-none transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
                    <Compass className="w-24 h-24 text-cyan-400" />
                  </div>
                  <div className="section-label mb-3">
                    {lang === "it" ? "Elemento Selezionato" : "Active Component"}
                  </div>
                  <h2 className="text-base font-bold text-white mb-2" style={{fontFamily: 'Cinzel, Georgia, serif', letterSpacing: '0.04em'}}>
                    {documentSource === "voynich_pdf"
                      ? (lang === "it" ? "Manoscritto Voynich (PDF Intero)" : "Full Voynich Manuscript (PDF)")
                      : documentSource === "custom"
                        ? (lang === "it" ? "Sorgente Documento Esterno" : "External Document Source")
                        : selectedHotspot
                          ? (lang === "it" ? selectedHotspot.nameIt : selectedHotspot.name)
                          : (lang === "it" ? "Clicca sulla Tavola a sinistra" : "Click on the Left Folio Map")}
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {(documentSource === "custom" || documentSource === "voynich_pdf")
                      ? (lang === "it" ? "Richiedi l'analisi euristica e paleografica d'avanguardia su questa pagina. Clicca sui pulsanti della scheda a sinistra per analizzare con Gemini." : "Query an in-depth scan of this folio. Use the navigation panel on the left to trigger Gemini core validation.")
                      : selectedHotspot
                        ? (lang === "it" ? selectedHotspot.descriptionIt : selectedHotspot.description)
                        : (lang === "it" ? "Seleziona fusti, fiori o frammenti d'erbario medievale per avviarne l'autopsia linguistica automatizzata." : "Select plant nodes, stems or paragraphs on the image to activate real-time paleographic study.")}
                  </p>
                  {!(documentSource === "custom" || documentSource === "voynich_pdf") && selectedHotspot?.evaTranscription && (
                    <div className="mt-4 p-3.5 relative overflow-hidden rounded-xl" style={{background: 'rgba(2,6,12,0.70)', border: '1px solid rgba(34,211,238,0.10)'}}>
                      <div className="absolute left-0 right-0 h-px scan-beam" style={{background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.3), transparent)'}} />
                      <span className="text-[9px] font-mono text-cyan-400/70 uppercase font-bold tracking-widest block mb-2">Trascrizione EVA Originale:</span>
                      <div className="font-mono text-xs text-slate-200 whitespace-pre-line leading-relaxed italic">{selectedHotspot.evaTranscription}</div>
                    </div>
                  )}
                </div>

                {/* Analyze button */}
                {!(documentSource === "custom" || documentSource === "voynich_pdf") && (
                  <div className="space-y-2.5">
                    <button
                      onClick={() => handleConsultAi(selectedHotspot)}
                      disabled={aiLoading}
                      className="btn-primary w-full py-3.5"
                    >
                      {aiLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                          <span>{lang === "it" ? "Elaborazione AI in corso..." : "Decrypting via AI Core..."}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>{lang === "it" ? "Avvia Analisi IA Regione" : "Query Region Integrity"}</span>
                        </>
                      )}
                    </button>
                    <p className="text-[9px] text-slate-500 text-center uppercase tracking-wider" style={{fontFamily: 'JetBrains Mono'}}>
                      {lang === "it" ? "⚡ Analisi euristica avanzata · Erbario medievale · Morfologia" : "⚡ Advanced heuristic · Medieval herbarium · Morphology"}
                    </p>
                  </div>
                )}

                {/* AI response */}
                {(aiResponse || aiLoading) && (
                  <div className="p-4 relative overflow-hidden rounded-2xl" style={{background: 'rgba(2,8,20,0.70)', border: '1px solid rgba(34,211,238,0.18)', boxShadow: 'inset 0 0 30px rgba(34,211,238,0.02)'}}>
                    <div className="absolute left-0 right-0 h-px scan-beam" style={{background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.25), transparent)'}} />
                    <div className="flex items-center justify-between mb-3 pb-2" style={{borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                      <div className="section-label">
                        {lang === "it" ? "Risposta Paleografo IA" : "Decoded AI Answer"}
                      </div>
                      <button onClick={() => setAiResponse("")} className="btn-danger" style={{padding: '4px 12px'}}>
                        <X className="w-3 h-3" />
                        {lang === "it" ? "Cancella" : "Clear"}
                      </button>
                    </div>
                    {aiLoading ? (
                      <div className="py-4 flex flex-col gap-2.5">
                        {[4, 5, 3].map((w, i) => <div key={i} className="h-3 bg-white/5 rounded-full animate-pulse" style={{width: `${w * 20}%`, animationDelay: `${i * 0.15}s`}} />)}
                      </div>
                    ) : (
                      <div className="text-xs sm:text-sm text-slate-200 leading-relaxed max-h-[300px] overflow-y-auto pr-1 whitespace-pre-line space-y-2 select-text" style={{fontFamily: 'Georgia, serif'}}>
                        {aiResponse}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Custom query form */}
              <div className="pt-4 mt-4" style={{borderTop: '1px solid rgba(255,255,255,0.07)'}}>
                <div className="section-label mb-3">
                  {lang === "it" ? "Domanda Personalizzata" : "Custom Query"}
                </div>
                <form
                  onSubmit={e => { e.preventDefault(); if (customQuestion.trim()) handleConsultAi(null, customQuestion); }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={customQuestion}
                    onChange={e => setCustomQuestion(e.target.value)}
                    placeholder={lang === "it" ? "es. Quali teorie associano questo foglio alla Satureja?" : "e.g., Does this leaf match Ruta graveolens?"}
                    className="flex-1 rounded-xl px-4 py-3 text-xs text-white placeholder:text-slate-600 focus:outline-none transition-all"
                    style={{background: 'rgba(4,8,18,0.70)', border: '1px solid rgba(255,255,255,0.09)', fontFamily: 'JetBrains Mono', caretColor: '#22d3ee'}}
                    onFocus={e => { e.target.style.borderColor = 'rgba(34,211,238,0.35)'; e.target.style.boxShadow = '0 0 0 3px rgba(34,211,238,0.06)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button type="submit" disabled={aiLoading || !customQuestion.trim()} className="btn-indigo shrink-0">
                    {lang === "it" ? "Invia" : "Send"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ── SANDBOX TAB ───────────────────────── */}
          {activeTab === "sandbox" && (
            <div className="flex-1 overflow-y-auto p-5 max-h-[72vh] flex flex-col space-y-5">
              <div className="space-y-5">
                
                {/* 1. Dottrina di Interpretazione */}
                <div>
                  <div className="section-label mb-2">
                    {lang === "it" ? "Dottrina di Interpretazione" : "Applied Cipher Theory"}
                  </div>
                  <div className="relative">
                    <select
                      value={selectedTheory.id}
                      onChange={e => {
                        const found = DECRYPTION_THEORIES.find(t => t.id === e.target.value);
                        if (found) setSelectedTheory(found);
                      }}
                      className="w-full cursor-pointer appearance-none focus:outline-none transition-all"
                      style={{background: 'rgba(4,8,18,0.80)', border: '1px solid rgba(34,211,238,0.18)', borderRadius: '14px', padding: '11px 16px', fontFamily: 'JetBrains Mono', fontSize: '12px', fontWeight: 700, color: '#e2e8f0', boxShadow: '0 0 0 0 transparent'}}
                    >
                      {DECRYPTION_THEORIES.map(t => (
                        <option key={t.id} value={t.id} style={{background: '#080b10', color: '#cbd5e1'}}>
                          {lang === "it" ? t.nameIt : t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. TEORIA SELEZIONATA */}
                <div className="p-4 flex items-start gap-3 relative overflow-hidden" style={{background: 'rgba(10,18,40,0.60)', border: '1px solid rgba(99,102,241,0.18)', borderLeft: '3px solid #6366f1', borderRadius: '14px', boxShadow: 'inset 0 0 20px rgba(99,102,241,0.03)'}}>
                  <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <div className="badge badge-indigo">{lang === "it" ? "Teoria Selezionata" : "Selected Theory"}</div>
                    <p className="text-[11px] font-semibold" style={{color: '#a5b4fc'}}>{selectedTheory.proponent}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {lang === "it" ? selectedTheory.descriptionIt : selectedTheory.description}
                    </p>
                    <p className="text-[10px] text-slate-500 leading-relaxed" style={{fontFamily: 'JetBrains Mono'}}>
                      <span className="text-slate-300 font-semibold">{lang === "it" ? "Concetto: " : "Concept: "}</span>
                      {lang === "it" ? selectedTheory.conceptIt : selectedTheory.concept}
                    </p>
                  </div>
                </div>

                {/* 3. Lettere Voynich (EVA Render) */}
                <div className="p-4 space-y-3 rounded-2xl" style={{background: 'rgba(8,14,28,0.55)', border: '1px solid rgba(255,255,255,0.07)'}}>
                  <div className="section-label">
                    {lang === "it" ? "Lettere Voynich (EVA Render)" : "Voynich Glyph String (EVA)"}
                  </div>
                  <div className="p-3.5 rounded-xl max-h-[160px] overflow-y-auto pr-1" style={{background: 'rgba(2,5,12,0.70)', border: '1px solid rgba(255,255,255,0.05)'}}>
                    {pageEvaTranscription ? (
                      <VoynichText text={pageEvaTranscription} size={16} />
                    ) : (
                      <span className="text-xs italic text-slate-600" style={{fontFamily: 'JetBrains Mono'}}>
                        {lang === "it" ? "Trascrizione vuota. Esegui la scansione per caricare i dati." : "Transcription empty. Scan page to view glyph render."}
                      </span>
                    )}
                  </div>
                </div>

                {/* 4. Decodificato (Theory name) */}
                <div className="relative overflow-hidden rounded-2xl" style={{background: 'rgba(4,10,22,0.80)', border: '1px solid rgba(34,211,238,0.14)', boxShadow: 'inset 0 0 30px rgba(34,211,238,0.02)'}}>
                  <div className="absolute left-0 right-0 h-px scan-beam" style={{background: 'linear-gradient(90deg,transparent,rgba(34,211,238,0.25),transparent)'}} />
                  <div className="px-4 py-3 flex items-center justify-between" style={{borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(2,6,14,0.50)'}}>
                    <div className="section-label" style={{color: '#818cf8'}}>
                      {lang === "it" ? `Decodificato · ${selectedTheory.nameIt}` : `Decoded · ${selectedTheory.name}`}
                    </div>
                    <button onClick={handleResetMapping} className="btn-secondary" style={{padding: '5px 12px', fontSize: '9px'}}>
                      <RotateCcw className="w-3 h-3" />
                      {lang === "it" ? "Ripristina" : "Reset Key"}
                    </button>
                  </div>
                  <div className="p-4 max-h-[160px] overflow-y-auto pr-1">
                    {pageEvaTranscription ? (
                      <pre className="text-xs whitespace-pre-line leading-relaxed italic select-all" style={{fontFamily: 'JetBrains Mono', color: '#34d399'}}>
                        {applyMapping(pageEvaTranscription)}
                      </pre>
                    ) : (
                      <span className="text-xs italic text-slate-600" style={{fontFamily: 'JetBrains Mono'}}>
                        {lang === "it" ? "Testo decodificato non disponibile. Avvia scansione." : "Decoded text not available. Query active scan."}
                      </span>
                    )}
                  </div>
                </div>

                {/* 5. TRADUZIONE IPOTETICA DELLA PAGINA */}
                <div className="relative overflow-hidden rounded-2xl p-5 space-y-4" style={{background: 'rgba(4,10,24,0.65)', border: '1px solid rgba(34,211,238,0.12)', boxShadow: 'inset 0 0 30px rgba(34,211,238,0.02)'}}>
                  <div className="absolute top-0 right-0 p-4 opacity-[0.04] pointer-events-none">
                    <Languages className="w-16 h-16 text-cyan-400" />
                  </div>
                  <div className="flex items-center gap-2.5 pb-3" style={{borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                    <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" style={{boxShadow: '0 0 8px #22d3ee'}} />
                    <div className="section-label">
                      {lang === "it" ? "Traduzione Ipotetica della Pagina" : "Hypothetical Page Translation"}
                    </div>
                  </div>
                  {activeParagraphs.length === 0 || !pageEvaTranscription ? (
                    <div className="text-center py-6 rounded-xl" style={{border: '1px dashed rgba(255,255,255,0.08)'}}>
                      <span className="text-xs italic text-slate-600" style={{fontFamily: 'JetBrains Mono'}}>
                        {lang === "it" ? "Nessun paragrafo tradotto disponibile. Avvia scansione." : "No translated paragraphs available. Launch scan."}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeParagraphs.map((p, idx) => {
                        const name = lang === "it" ? p.nameIt : p.name;
                        const translation = lang === "it" ? (p.translationIt || p.translationEn) : (p.translationEn || p.translationIt);
                        const label = lang === "it" ? `${idx + 1}° Paragrafo` : `Paragraph #${idx + 1}`;
                        return (
                          <div key={p.id} className="p-4 rounded-xl space-y-2 transition-all" style={{background: 'rgba(4,8,18,0.60)', border: '1px solid rgba(255,255,255,0.06)'}}>
                            <div className="flex flex-wrap items-center gap-2 pb-1.5" style={{borderBottom: '1px solid rgba(255,255,255,0.04)'}}>
                              <span className="badge badge-cyan">{label}</span>
                              <span className="text-xs font-semibold text-slate-300">{name}</span>
                            </div>
                            <div className="pl-3" style={{borderLeft: '2px solid rgba(34,211,238,0.25)'}}>
                              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic select-text" style={{fontFamily: 'Georgia, serif'}}>
                                &ldquo;{translation || (lang === "it" ? "Traduzione non disponibile." : "Translation not available.")}&rdquo;
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 6. GLOSSARIO PAROLA PER PAROLA (TRADUZIONE DETTAGLIATA) */}
                <div className="relative overflow-hidden rounded-2xl p-5 space-y-4" style={{background: 'rgba(8,12,30,0.65)', border: '1px solid rgba(99,102,241,0.14)', boxShadow: 'inset 0 0 30px rgba(99,102,241,0.02)'}}>
                  <div className="absolute top-0 right-0 p-4 opacity-[0.04] pointer-events-none">
                    <FileText className="w-16 h-16 text-indigo-400" />
                  </div>
                  <div className="flex items-center gap-2.5 pb-3" style={{borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" style={{boxShadow: '0 0 8px #6366f1'}} />
                    <div className="section-label" style={{color: '#818cf8'}}>
                      {lang === "it" ? "Glossario Parola per Parola" : "Word-by-Word Glossary"}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {lang === "it"
                      ? "Analisi dettagliata e riscontro semantico di ogni parola presente nel testo della pagina."
                      : "Detailed word-level mapping of each token in the page script."}
                  </p>
                  {buildWordList().length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
                      {buildWordList().map((word, idx) => (
                        <div key={word.id} className="p-3 flex flex-col gap-2 relative overflow-hidden transition-all rounded-xl" style={{background: 'rgba(4,8,20,0.60)', border: '1px solid rgba(255,255,255,0.06)'}} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.28)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}>
                          <div className="absolute top-2 right-2 badge badge-indigo">#{idx + 1}</div>
                          <div className="flex items-center gap-2.5">
                            <div className="px-2 py-1 rounded-lg shrink-0 flex items-center justify-center" style={{background: 'rgba(0,0,0,0.40)', border: '1px solid rgba(255,255,255,0.06)'}}>
                              <VoynichText text={word.original} size={16} />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[8px] font-bold uppercase tracking-widest block leading-none mb-1 truncate max-w-[120px]" style={{fontFamily: 'JetBrains Mono', color: '#475569'}}>
                                {word.paragraphName}
                              </span>
                              <span className="text-xs font-bold text-slate-300 truncate" style={{fontFamily: 'JetBrains Mono'}}>{word.original}</span>
                            </div>
                          </div>
                          <div className="h-px" style={{background: 'rgba(255,255,255,0.05)'}} />
                          <div className="space-y-1">
                            <span className="text-[8px] font-bold uppercase tracking-widest block leading-none" style={{fontFamily: 'JetBrains Mono', color: '#818cf8'}}>
                              {lang === "it" ? "Traduzione" : "Translation"}
                            </span>
                            {word.translation
                              ? <span className="text-xs font-bold italic" style={{fontFamily: 'Georgia, serif', color: '#34d399'}}>&ldquo;{word.translation}&rdquo;</span>
                              : <span className="text-xs italic" style={{fontFamily: 'JetBrains Mono', color: '#475569'}}>{word.deciphered ? `"${word.deciphered}" (Caratteri)` : "-"}</span>
                            }
                          </div>
                          {(word.explanation || word.translation) && (
                            <p className="text-[10px] text-slate-500 leading-relaxed italic pt-1.5 mt-0.5" style={{borderTop: '1px solid rgba(255,255,255,0.05)'}}>
                              {word.explanation || (lang === "it" ? "Abbinamento basato sulla tabella di sostituzione." : "Substitution-based character lookup.")}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 rounded-xl" style={{border: '1px dashed rgba(255,255,255,0.07)'}}>
                      <span className="text-xs italic text-slate-600" style={{fontFamily: 'JetBrains Mono'}}>
                        {lang === "it" ? "Trascrizione vuota. Nessun termine rilevato." : "Transcription empty. No words detected."}
                      </span>
                    </div>
                  )}
                </div>

                {/* 7. MATRICE DI SOSTITUZIONE MANUALE */}
                <div className="space-y-3 p-5 rounded-2xl" style={{background: 'rgba(6,10,24,0.60)', border: '1px solid rgba(255,255,255,0.07)'}}>
                  <div className="flex items-center justify-between">
                    <div className="section-label">
                      {lang === "it" ? "Matrice di Sostituzione Manuale" : "Manual Substitution Matrix"}
                    </div>
                    <span className="text-[9px] uppercase tracking-widest" style={{fontFamily: 'JetBrains Mono', color: '#334155'}}>EVA → Sostituto</span>
                  </div>
                  <div className="grid grid-cols-4 xs:grid-cols-5 sm:grid-cols-7 gap-1.5 sm:gap-2">
                    {EVA_ALPHABET.map(letter => {
                      const val = letterMapping[letter.eva] || "";
                      return (
                        <div key={letter.eva} className="flex flex-col rounded-xl p-1.5 sm:p-2 items-center justify-center gap-1 sm:gap-1.5 transition-all" style={{background: 'rgba(4,8,18,0.60)', border: '1px solid rgba(255,255,255,0.07)'}} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(34,211,238,0.30)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}>
                          <div className="flex items-center gap-1 select-none">
                            <span className="text-xs font-bold" style={{fontFamily: 'JetBrains Mono', color: '#22d3ee'}}>{letter.eva}</span>
                          </div>
                          <input
                            type="text"
                            maxLength={3}
                            value={val}
                            placeholder="·"
                            onChange={e => handleMappingChange(letter.eva, e.target.value)}
                            className="select-all text-center text-xs font-bold focus:outline-none rounded-lg p-0.5 sm:p-1 w-8 sm:w-9"
                            style={{background: 'rgba(2,5,12,0.70)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'JetBrains Mono', color: '#34d399', caretColor: '#22d3ee'}}
                            onFocus={e => { e.target.style.borderColor = 'rgba(34,211,238,0.40)'; }}
                            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 8 & 9. Stats panels */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 8. FREQUENZA CARATTERI TOP */}
                  <div className="p-4 flex flex-col justify-between rounded-2xl" style={{background: 'rgba(4,10,24,0.65)', border: '1px solid rgba(255,255,255,0.07)'}}>
                    <div className="section-label mb-3">
                      {lang === "it" ? "Frequenza Caratteri Top" : "Top Char Frequencies"}
                    </div>
                    {charFreq.length > 0 ? (
                      <div className="space-y-2.5">
                        {charFreq.slice(0, 4).map(f => (
                          <div key={f.char} className="flex items-center text-xs gap-3">
                            <span className="w-4 font-bold" style={{fontFamily: 'JetBrains Mono', color: '#22d3ee'}}>{f.char}</span>
                            <div className="flex-1 rounded-full overflow-hidden" style={{background: 'rgba(255,255,255,0.06)', height: '6px'}}>
                              <div className="h-full rounded-full" style={{width: `${Math.min(100, parseFloat(f.percent) * 3)}%`, background: 'linear-gradient(90deg, #22d3ee, #6366f1)', boxShadow: '0 0 6px rgba(34,211,238,0.4)'}} />
                            </div>
                            <span className="w-10 text-right" style={{fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#64748b'}}>{f.percent}%</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs italic text-slate-600" style={{fontFamily: 'JetBrains Mono'}}>
                        {lang === "it" ? "Nessun dato." : "No data."}
                      </span>
                    )}
                  </div>

                  {/* 9. INDICE DI COINCIDENZA */}
                  <div className="p-4 flex flex-col justify-between rounded-2xl" style={{background: 'rgba(8,10,32,0.65)', border: '1px solid rgba(99,102,241,0.12)'}}>
                    <div className="section-label mb-3" style={{color: '#818cf8'}}>
                      {lang === "it" ? "Indice di Coincidenza" : "Index of Coincidence"}
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold" style={{fontFamily: 'JetBrains Mono', background: 'linear-gradient(135deg,#818cf8,#22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>
                          {coincidenceIndex.toFixed(4)}
                        </span>
                        <span className="badge badge-indigo">IC</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        {lang === "it"
                          ? "I testi normali variano tra 0.065 e 0.080. L'entropia Voynich insolitamente bassa indica un sistema di abbreviazioni fitte o un falso artificiale."
                          : "Standard text ranges from 0.065 to 0.080. Voynich's lower index suggests extreme abbreviation rules or generative artificial patterns."}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ── KEYBOARD TAB ──────────────────────── */}
          {activeTab === "keyboard" && (
            <div className="flex-1 overflow-y-auto p-5 max-h-[72vh] flex flex-col justify-between space-y-5">
              <div className="space-y-5">
                <div className="p-4 rounded-2xl" style={{background: 'rgba(8,14,28,0.60)', border: '1px solid rgba(255,255,255,0.07)'}}>
                  <div className="section-label mb-2">
                    {lang === "it" ? "Editor Scrittura Voynich" : "Manual Code Editor"}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {lang === "it"
                      ? "Digita caratteri EVA standard o clicca sulla matrice di tasti per visualizzare in tempo reale la scrittura vettoriale del manoscritto."
                      : "Type normal letters or click keys below to render real-time vector Voynich glyphs."}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="section-label mb-2">
                      {lang === "it" ? "Input EVA" : "EVA Input"}
                    </div>
                    <input
                      type="text"
                      value={typedText}
                      onChange={e => setTypedText(e.target.value)}
                      placeholder="Scrivi qui usando lettere EVA..."
                      className="w-full rounded-xl px-4 py-3 text-sm text-emerald-400 focus:outline-none transition-all"
                      style={{background: 'rgba(4,8,18,0.70)', border: '1px solid rgba(255,255,255,0.09)', fontFamily: 'JetBrains Mono', caretColor: '#22d3ee'}}
                      onFocus={e => { e.target.style.borderColor = 'rgba(34,211,238,0.35)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; }}
                    />
                  </div>
                  <div className="p-5 flex flex-col gap-2 min-h-[100px] relative overflow-hidden rounded-2xl" style={{background: 'rgba(4,10,22,0.80)', border: '1px solid rgba(34,211,238,0.14)', boxShadow: 'inset 0 0 30px rgba(34,211,238,0.02)'}}>
                    <div className="absolute left-0 right-0 h-px scan-beam" style={{background: 'linear-gradient(90deg,transparent,rgba(34,211,238,0.25),transparent)'}} />
                    <span className="text-[8px] font-bold uppercase tracking-widest absolute top-2 right-3" style={{fontFamily: 'JetBrains Mono', color: 'rgba(34,211,238,0.40)'}}>Caratteri Vettoriali</span>
                    <div className="section-label mb-1">
                      {lang === "it" ? "Resa Grafica Voynich" : "Handwritten Render Output"}
                    </div>
                    {typedText.trim() ? (
                      <div className="p-2 select-text rounded-lg leading-loose" style={{background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(255,255,255,0.05)'}}>
                        <VoynichText text={typedText} size={24} />
                      </div>
                    ) : (
                      <span className="text-xs italic text-slate-600" style={{fontFamily: 'JetBrains Mono'}}>
                        {lang === "it" ? "Vuoto. Clicca sui tasti per generare grafi..." : "Empty. Click key switches below to output glyphs..."}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="section-label">
                      {lang === "it" ? "Tastiera Virtuale Voynich" : "Virtual Glyph Keypad"}
                    </div>
                    <button onClick={() => setTypedText("")} className="btn-danger">
                      <X className="w-3 h-3" />
                      Clear
                    </button>
                  </div>
                  <div className="grid grid-cols-3 xs:grid-cols-4 gap-1.5 xs:gap-2">
                    {EVA_ALPHABET.map(letter => (
                      <button
                        key={letter.eva}
                        onClick={() => setTypedText(prev => prev + letter.eva)}
                        className="flex flex-col xs:flex-row items-center text-center xs:text-left gap-1 xs:gap-2.5 p-1.5 xs:p-2 sm:p-2.5 rounded-xl cursor-pointer transition-all"
                        style={{background: 'rgba(6,12,26,0.60)', border: '1px solid rgba(255,255,255,0.07)'}}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(34,211,238,0.28)'; (e.currentTarget as HTMLElement).style.background = 'rgba(34,211,238,0.05)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.background = 'rgba(6,12,26,0.60)'; }}
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{background: 'rgba(0,0,0,0.40)', border: '1px solid rgba(255,255,255,0.06)'}}>
                          <VoynichText text={letter.eva} size={15} />
                        </div>
                        <div className="flex flex-col items-center xs:items-start min-w-0">
                          <span className="text-[10px] xs:text-xs font-bold text-slate-200" style={{fontFamily: 'JetBrains Mono'}}>
                            {letter.name.split(" ")[0]}
                            <span className="text-[8px] xs:text-[9px] ml-0.5 xs:ml-1" style={{color: '#475569'}}>({letter.eva})</span>
                          </span>
                          <span className="text-[9px] text-slate-500 uppercase truncate max-w-[90px] hidden xs:block">{letter.approxSound}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 flex items-start gap-2.5 italic" style={{borderTop: '1px solid rgba(255,255,255,0.07)'}}>
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  {lang === "it"
                    ? "La combinazione 'daiin' (EVA: 8an) costituisce circa il 25% del vocabolario erboristico. Spesso interpretato come desinenza sacramentale."
                    : "The word 'daiin' (EVA: 8an) represents up to 25% of herbal sections vocabulary. Identified as sacramental indicators."}
                </p>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* ── Footer ──────────────────────────────── */}
      <footer className="h-12 flex items-center justify-between px-6 sm:px-8 relative z-20 shrink-0" style={{background: 'rgba(4,8,18,0.88)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(255,255,255,0.06)'}}>
        <div className="flex gap-5 items-center">
          <span className="hidden md:inline" style={{fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(255,255,255,0.20)', letterSpacing: '0.12em', textTransform: 'uppercase'}}>Voynich Decipherer · v4.0.2</span>
          <span className="font-semibold uppercase" style={{fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.12em', background: 'linear-gradient(135deg,#22d3ee,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>
            Castro Massimo · DevTools
          </span>
        </div>
        <div className="flex gap-4 items-center">
          <a
            href="mailto:castromassimo@gmail.com"
            className="transition-all"
            style={{fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#6366f1', letterSpacing: '0.08em', textTransform: 'uppercase'}}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#22d3ee'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6366f1'; }}
          >
            castromassimo@gmail.com
          </a>
          <span className="hidden xs:inline" style={{fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(255,255,255,0.20)', letterSpacing: '0.08em'}}>© 2026</span>
        </div>
      </footer>

      {/* ── ZOOM MODAL OVERLAY ────────────────── */}
      {zoomOpen && (
        <div className="zoom-overlay">
          {/* Zoom Toolbar */}
          <div className="zoom-toolbar">
            <span style={{fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#22d3ee', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700}}>
              {lang === "it" ? "Zoom Pagina" : "Page Zoom"}
            </span>
            <div style={{width: '1px', height: '20px', background: 'rgba(255,255,255,0.10)'}} />
            <button
              onClick={() => setZoomLevel(z => Math.max(50, z - 25))}
              className="btn-icon"
              title="Zoom Out"
              disabled={zoomLevel <= 50}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min={50}
              max={250}
              step={10}
              value={zoomLevel}
              onChange={e => setZoomLevel(Number(e.target.value))}
              className="zoom-slider"
              title={`${zoomLevel}%`}
            />
            <button
              onClick={() => setZoomLevel(z => Math.min(250, z + 25))}
              className="btn-icon"
              title="Zoom In"
              disabled={zoomLevel >= 250}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <span style={{fontFamily: 'JetBrains Mono', fontSize: '12px', fontWeight: 700, color: '#e2e8f0', minWidth: '42px', textAlign: 'center'}}>
              {zoomLevel}%
            </span>
            <div style={{width: '1px', height: '20px', background: 'rgba(255,255,255,0.10)'}} />
            <button
              onClick={() => setZoomLevel(100)}
              className="btn-secondary"
              style={{padding: '5px 12px', fontSize: '9px', borderRadius: '20px'}}
              title="Reset zoom"
            >
              <RotateCcw className="w-3 h-3" />
              100%
            </button>
            <button
              onClick={() => setZoomOpen(false)}
              className="btn-icon"
              style={{background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171'}}
              title={lang === "it" ? "Chiudi Zoom" : "Close Zoom"}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom Content */}
          <div className="zoom-content-wrapper">
            {activeUploadedImage ? (
              <img
                src={activeUploadedImage}
                alt={lang === "it" ? "Pagina del manoscritto" : "Manuscript page"}
                style={{transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center', transition: 'transform 0.2s ease', maxWidth: '100%'}}
              />
            ) : documentSource === "voynich_pdf" ? (
              <div className="flex flex-col items-center gap-6 w-full" style={{transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center', transition: 'transform 0.2s ease'}}>
                <div className="w-full max-w-2xl rounded-2xl overflow-hidden" style={{background: 'rgba(4,8,18,0.80)', border: '1px solid rgba(34,211,238,0.15)', padding: '32px'}}>
                  <div className="section-label mb-4">{lang === "it" ? "Trascrizione EVA della Pagina" : "Page EVA Transcription"}</div>
                  <pre className="whitespace-pre-line leading-loose text-sm" style={{fontFamily: 'JetBrains Mono', color: '#e2e8f0'}}>{pageEvaTranscription || (lang === "it" ? "Nessun testo disponibile." : "No text available.")}</pre>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <Maximize2 className="w-12 h-12 text-slate-600 mx-auto" />
                  <p className="text-sm text-slate-500" style={{fontFamily: 'JetBrains Mono'}}>
                    {lang === "it" ? "Carica un documento per usare lo zoom." : "Upload a document to use zoom."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
