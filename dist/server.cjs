var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// api/index.ts
var import_express = __toESM(require("express"), 1);
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
app.use(import_express.default.json({ limit: "15mb" }));
var getGeminiClient = (customApiKey) => {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not defined in environment secrets. AI deciphering will be mock-simulated.");
    return null;
  }
  return new import_genai.GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
};
app.get("/api/proxy-pdf", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "URL is required" });
  }
  try {
    console.log(`[PROXY] Requesting PDF from: ${url}`);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "application/pdf,application/octet-stream,*/*",
        "Referer": "https://archive.org/"
      }
    });
    if (!response.ok) {
      console.error(`[PROXY] Remote server returned ${response.status}: ${response.statusText}`);
      const errorText = await response.text().catch(() => "Unknown error body");
      console.error(`[PROXY] Error body: ${errorText.slice(0, 200)}`);
      return res.status(response.status).json({
        error: `Remote server error: ${response.statusText} (${response.status})`
      });
    }
    const contentType = response.headers.get("Content-Type");
    console.log(`[PROXY] Success! Content-Type: ${contentType}`);
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    } else {
      res.setHeader("Content-Type", "application/pdf");
    }
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("PDF Proxy error:", error);
    res.status(500).json({ error: error.message || "Failed to proxy PDF" });
  }
});
app.post("/api/analyze", async (req, res) => {
  try {
    const { elementId, label, imageBase64, imagesBase64, customQuestion, language = "it" } = req.body;
    const userApiKey = req.headers["x-api-key"] || req.body.apiKey;
    const ai = getGeminiClient(userApiKey);
    if (!ai) {
      const mockParagraphs = [
        {
          id: "par_top_left",
          nameIt: "Paragrafo A (In Alto a Sinistra)",
          name: "Paragraph A (Top Left)",
          descriptionIt: "Paragrafo di apertura a sinistra del fusto. Contiene termini corti con la classica frequenza ripetitiva tipica dei paragrafi erboristici Voynich.",
          description: "Introductory paragraph surrounding the left side of the stem, featuring common Voynich beginnings and repetitive syllable grids.",
          evaTranscription: "tfccy dready or\no tteeo dyedy ot oorg\n8o ttey otteotey oty\n8or dtoltco 8an 8an",
          translationIt: "Raccogli le foglie bicolore mature e falle bollire nel vaso all'alba. Posa tre gocce sul ciglio dell'occhio malato per riposare l'anima tormentata.",
          translationEn: "Gather mature bi-colored leaves and boil them in the morning vessel. Place three drops upon the ailing eye to soothe the restless mind.",
          wordByWord: [
            { voynichWord: "tfccy", translation: "Raccogli ed estrai", explanation: "Verbo d'azione iniziale tipico dei ricettari medievali." },
            { voynichWord: "dready", translation: "le foglie fresche", explanation: "Termine indicante fogliame o parti verdi della pianta." },
            { voynichWord: "or", translation: "di colore verde e ocra", explanation: "Congiunzione o aggettivo descrittivo del bicolore." },
            { voynichWord: "o", translation: "pienamente sviluppate", explanation: "Indicatore di maturit\xE0 biologica o stato della foglia." },
            { voynichWord: "tteeo", translation: "lessa o riscalda", explanation: "Termine tecnico correlato all'ebollizione o infusione calda." },
            { voynichWord: "dyedy", translation: "nel vaso di terracotta", explanation: "Contenitore alchemico o mortaio per la preparazione." },
            { voynichWord: "ot", translation: "al sorgere del sole", explanation: "Riferimento orario legato al mattino o rugiada mattutina." },
            { voynichWord: "oorg", translation: "e versa delicatamente", explanation: "Azione di dosaggio del liquido ottenuto." },
            { voynichWord: "8o", translation: "esattamente tre gocce", explanation: "Prefisso numerico quantitativo o frazione alchemica." },
            { voynichWord: "ttey", translation: "sulla palpebra o bordo", explanation: "Indicazione anatomica della zona d'applicazione." },
            { voynichWord: "otteotey", translation: "della cavit\xE0 oculare", explanation: "Organo bersaglio del trattamento lenitivo." },
            { voynichWord: "oty", translation: "affetto da infiammazione", explanation: "Stato patologico (dolore, calore o arrossamento)." },
            { voynichWord: "8or", translation: "per alleviare il dolore", explanation: "Scopo terapeutico dell'infuso preparato." },
            { voynichWord: "dtoltco", translation: "lo spirito vitale", explanation: "Riferimento al benessere animico o sollievo generale." },
            { voynichWord: "8an", translation: "agitata dal delirio", explanation: "Stato d'inquietudine o febbre alta del paziente." },
            { voynichWord: "8an", translation: "e restituire la quiete", explanation: "Formula augurale di chiusura della ricetta." }
          ]
        },
        {
          id: "par_top_right",
          nameIt: "Paragrafo B (In Alto a Destra)",
          name: "Paragraph B (Top Right)",
          descriptionIt: "Paragrafo a destra dello stelo. Fornisce parole lunghe e ricche di lettere 'gallows' a doppia asola (caratteri t e k).",
          description: "Paragraph on the right side of the main stem, featuring double-loop cursive-like glyphs ('gallows').",
          evaTranscription: "ot tteey oror dtan\n8oro dttoda ottoda8 cro8y\n8 ttooddy ettey totteorody 8an\n2ooudy eeolto8a",
          translationIt: "Unisci gli steli secchi del fiore d'oro con l'acqua sorgiva del monte sacro. Mescola lentamente finch\xE9 la pozione non rilascia una fitta nebbia argentea.",
          translationEn: "Mix the withered golden stems with spring water from the high mount. Stir slowly until the liquor emits a thick, silvery mist.",
          wordByWord: [
            { voynichWord: "ot", translation: "Unisci / Mescola insieme", explanation: "Azione di combinazione di ingredienti secchi." },
            { voynichWord: "tteey", translation: "le parti legnose dello stelo", explanation: "Riferimento ai rami o legnetti del fiore." },
            { voynichWord: "oror", translation: "disidratati o appassiti", explanation: "Stato di essiccazione della materia vegetale." },
            { voynichWord: "dtan", translation: "del bocciolo", explanation: "Inflorescenza o calice superiore della pianta." },
            { voynichWord: "8oro", translation: "dorato", explanation: "Colore giallo brillante o valore nobile solare." },
            { voynichWord: "dttoda", translation: "con l'elemento liquido purificato", explanation: "Veicolo acquoso per l'estrazione dei princ\xECpi." },
            { voynichWord: "ottoda8", translation: "proveniente dalla sorgente", explanation: "Indicatore di acqua pura o rugiada pura." },
            { voynichWord: "cro8y", translation: "del monte", explanation: "Riferimento alla provenienza dell'ingrediente." },
            { voynichWord: "8", translation: "consacrato agli dei", explanation: "Carattere singoli indicante purificazione o sacralit\xE0." },
            { voynichWord: "ttooddy", translation: "Mescola lentamente in senso orario", explanation: "Tecnica di miscelazione della pozione." },
            { voynichWord: "ettey", translation: "senza fretta, con pazienza", explanation: "Avverbio di modalit\xE0 per l'infusione." },
            { voynichWord: "totteorody", translation: "fino a che il decotto", explanation: "Indicatore temporale del processo chimico." },
            { voynichWord: "8an", translation: "non produce o esala", explanation: "Emissione di sostanze volatili." },
            { voynichWord: "2ooudy", translation: "una densa o spessa", explanation: "Propriet\xE0 visuale del vapore rilasciato." },
            { voynichWord: "eeolto8a", translation: "nebbia argentea e lucente", explanation: "Esito della reazione alchemica finale." }
          ]
        },
        {
          id: "par_bottom_left",
          nameIt: "Paragrafo C (In Basso a Sinistra)",
          name: "Paragraph C (Bottom Left)",
          descriptionIt: "Grande blocco in basso a sinistra contenente sequenze di lettere concatenate ('ch', 'sh', 'ol'). Lo stile richiama molto le abbreviazioni notarili del XV secolo.",
          description: "Large paragraph on lower-left containing complex ligature clusters. Notice the highly nested letters resembling 15th-century abbreviations.",
          evaTranscription: "totla8 dror 8and dteoa8\ncrotly cror dteor 8tor ottas\nte or tteee occor 8or tteey\nottorteor llot tltey cror lta\ndor ottor cror 8ody lta 8an\ntlan ctotloccy 8as croda",
          translationIt: "L'autunno ritira la linfa dai rami inferiori per raccoglierla nel fusto grasso. Cuoci il rizoma scaglioso sul fuoco lento fino a ridurlo in pasta lenitiva per le infezioni della pelle.",
          translationEn: "Autumn draws the sap down from the lower branches into the swollen stalk. Roast the scaly rhizome over a slow flame for a soothing ointment against dermal plagues.",
          wordByWord: [
            { voynichWord: "totla8", translation: "Il tempo freddo del raccolto", explanation: "Riferimento alla stagione autunnale." },
            { voynichWord: "dror", translation: "richiama o nasconde", explanation: "Azione naturale di riflusso della linfa." },
            { voynichWord: "8and", translation: "il fluido vitale", explanation: "Sostanza nutritiva della pianta (linfa)." },
            { voynichWord: "dteoa8", translation: "dai rami", explanation: "Riferimento ai rami e foglie esterne." },
            { voynichWord: "crotly", translation: "pi\xF9 vicine alla terra", explanation: "Posizione inferiore dei rami." },
            { voynichWord: "cror", translation: "per concentrarla e conservarla", explanation: "Processo protettivo del vegetale." },
            { voynichWord: "dteor", translation: "nella parte centrale", explanation: "Il midollo o stelo portante." },
            { voynichWord: "8tor", translation: "dello stelo rigonfio", explanation: "Caratteristica fisica del fusto carnoso." },
            { voynichWord: "ottas", translation: "Riscalda sopra i carboni", explanation: "Metodo di cottura della radice." },
            { voynichWord: "te", translation: "il rizoma", explanation: "Tubercolo o radice scagliosa." },
            { voynichWord: "or", translation: "coperto di scaglie legnose", explanation: "Morfologia esteriore del rizoma." },
            { voynichWord: "tteee", translation: "sopra la fiamma viva", explanation: "Elemento fuoco per la trasformazione." },
            { voynichWord: "occor", translation: "regolata a bassa intensit\xE0", explanation: "Modalit\xE0 di riscaldamento moderato." },
            { voynichWord: "8or", translation: "fino al momento in cui", explanation: "Raggiungimento dello stato desiderato." },
            { voynichWord: "tteey", translation: "si ammorbidisce o sfalda", explanation: "Cambiamento di consistenza della polpa." },
            { voynichWord: "ottorteor", translation: "in una consistenza densa (unguento)", explanation: "Formato finale del preparato oleoso." },
            { voynichWord: "llot", translation: "capace di lenire il bruciore", explanation: "Propriet\xE0 lenitiva o rinfrescante." },
            { voynichWord: "tltey", translation: "delle ferite aperte", explanation: "Indicazione clinica per piaghe o tagli." },
            { voynichWord: "cror", translation: "ed eruzioni cutanee", explanation: "Stati infiammatori dell'epidermide." },
            { voynichWord: "lta", translation: "del derma", explanation: "Zona anatomica superficiale." },
            { voynichWord: "dor", translation: "Spalma delicatamente con un panno", explanation: "Istruzioni per l'applicazione topica." },
            { voynichWord: "ottor", translation: "durante le ore notturne", explanation: "Momento preferenziale per l'efficacia." },
            { voynichWord: "cror", translation: "subito prima", explanation: "Indicazione di sequenza temporale." },
            { voynichWord: "8ody", translation: "del riposo", explanation: "Coricamento o sonno del paziente." },
            { voynichWord: "lta", translation: "sulla zona arrossata", explanation: "Punto esatto di stesura." },
            { voynichWord: "8an", translation: "colpita dal male", explanation: "Tessuto infetto o dolorante." },
            { voynichWord: "tlan", translation: "per indurre rapida guarigione", explanation: "Azione terapeutica attesa." },
            { voynichWord: "ctotloccy", translation: "dei tessuti molli deteriorati", explanation: "Rigenerazione cellulare della carne." },
            { voynichWord: "8as", translation: "prevenendo la formazione", explanation: "Azione preventiva antimicrobica." },
            { voynichWord: "croda", translation: "di segni o piaghe permanenti", explanation: "Chiusura estetica della cicatrice." }
          ]
        },
        {
          id: "par_bottom_right",
          nameIt: "Paragrafo D (In Basso a Destra)",
          name: "Paragraph D (Bottom Right)",
          descriptionIt: "Blocco conclusivo sulla destra. Termina con la tipica formula ripetitiva 'tor cro8ad', ricorrente nelle chiusure di decine di capitoli botanici.",
          description: "The concluding block on the right, ending with the standard 'tor cro8ad' formula, found in many Voynich herbal pages.",
          evaTranscription: "8an crty tlo8a olland crofdy\n8o rccca crodo qor cry ttey\nottos 8or 8oro qttos 8or cro8y\ncror etteor crody ctor 8and\ncroy sotol ottor 8ad croda\n2crody tor cro8ad",
          translationIt: "Conserva la miscela al riparo dal sole d'inverno. Somministra due cucchiai per lenire la tosse cupa ed indurre un sonno ristoratore privo di incubi molesti. Sigilla con cera vergine.",
          translationEn: "Store this mixture safe from the harsh winter sun. Administer two spoonfuls to quiet the heavy cough and induce a blessed sleep free of bad dreams. Seal with virgin wax.",
          wordByWord: [
            { voynichWord: "8an", translation: "Custodisci in luogo asciutto", explanation: "Istruzioni di conservazione a lungo termine." },
            { voynichWord: "crty", translation: "il preparato filtrato", explanation: "Oggetto della conservazione." },
            { voynichWord: "tlo8a", translation: "lontano dalla luce diretta", explanation: "Protezione dai raggi solari." },
            { voynichWord: "olland", translation: "dei caldi raggi solari", explanation: "Fattore di degradazione chimica." },
            { voynichWord: "crofdy", translation: "durante la stagione fredda", explanation: "Periodo di stoccaggio ottimale." },
            { voynichWord: "8o", translation: "Fai bere al malato", explanation: "Istruzioni per il dosaggio per via orale." },
            { voynichWord: "rccca", translation: "esattamente due dosi", explanation: "Quantit\xE0 prescritta." },
            { voynichWord: "crodo", translation: "in cucchiai di legno", explanation: "Strumento di misurazione e assunzione." },
            { voynichWord: "qor", translation: "per calmare o addolcire", explanation: "Effetto espettorante o lenitivo." },
            { voynichWord: "cry", translation: "l'irritazione dei bronchi", explanation: "Sintomatologia della tosse." },
            { voynichWord: "ttey", translation: "profonda e insistente", explanation: "Carattere della tosse (tosse cupa)." },
            { voynichWord: "ottos", translation: "e favorire lo scivolamento", explanation: "Passaggio dello spirito verso lo stato ipnotico." },
            { voynichWord: "8or", translation: "in uno stato di riposo profondo", explanation: "Il sonno indotto dalle erbe." },
            { voynichWord: "8oro", translation: "rigenerante per le membra", explanation: "Qualit\xE0 del sonno ristoratore." },
            { voynichWord: "qttos", translation: "completamente privo", explanation: "Esclusione di disturbi notturni." },
            { voynichWord: "8or", translation: "di visioni terrificanti", explanation: "Prevenzione di incubi o visioni febbrili." },
            { voynichWord: "cro8y", translation: "che turbano la notte", explanation: "Elemento di disturbo del riposo." },
            { voynichWord: "cror", translation: "Permetti al corpo", explanation: "Istruzioni post-somministrazione." },
            { voynichWord: "etteor", translation: "di sudare e riposare", explanation: "Reazione fisica indotta dalle erbe." },
            { voynichWord: "crody", translation: "sotto coperte calde", explanation: "Termoregolazione del paziente." },
            { voynichWord: "ctor", translation: "fino al mattino", explanation: "Durata dell'effetto del sonnifero." },
            { voynichWord: "8and", translation: "Poi al risveglio", explanation: "Fase successiva del trattamento." },
            { voynichWord: "croy", translation: "chiudi ermeticamente", explanation: "Istruzioni di conservazione post-apertura." },
            { voynichWord: "sotol", translation: "l'imboccatura del vaso", explanation: "Parte dell'ampolla da sigillare." },
            { voynichWord: "ottor", translation: "utilizzando cera fusa", explanation: "Materiale sigillante alchemico." },
            { voynichWord: "8ad", translation: "di api purissima", explanation: "Qualit\xE0 della cera." },
            { voynichWord: "croda", translation: "raccolta nei boschi sacri", explanation: "Origine biologico-rituale della cera." },
            { voynichWord: "2crody", translation: "in modo che il preparato", explanation: "Scopo del sigillo ermetico." },
            { voynichWord: "tor", translation: "preservi intatta", explanation: "Mantenimento dei princ\xECpi attivi." },
            { voynichWord: "cro8ad", translation: "la sua virt\xF9 medicamentosa", explanation: "Efficacia curativa nel tempo." }
          ]
        }
      ];
      return res.json({
        success: true,
        text: `[Modalit\xE0 Demo - Chiave API non configurata]

Questo \xE8 un feedback simulato per l'elemento: **${label || elementId}**.

Hai chiesto: "${customQuestion || "Analisi generale"}"

Nello studio storico del Manoscritto Voynich, questa sezione rappresenta un tipico campione di erbario medievale. Le foglie bicolore alternate indicano un possibile significato medicinale o alchemico. Per sbloccare l'analisi in tempo reale basata su intelligenza artificiale con Gemini, inserisci una corretta chiave API nel pannello dei Secrets.

\`\`\`json
${JSON.stringify(mockParagraphs, null, 2)}
\`\`\``
      });
    }
    let systemInstruction = `Sei un paleografo esperto, glottologo e appassionato decifratore del Manoscritto Voynich. Il tuo compito \xE8 analizzare dettagliatamente le immagini delle pagine e dei testi forniti dall'utente o dal sistema. IMPORTANTE: Per soddisfare le richieste dell'utente, a seguito di ogni analisi botanica, crittografica o paleografica, DEVI SEMPRE includere due sezioni finali ben evidenziate in Markdown:

### \u{1F52E} DECIFRAZIONE E TRADUZIONE IPOTETICA
Qui devi decifrare in modo audace, concreto e creativo il testo Voynich adiacente all'elemento analizzato (o quello fornito, come la trascrizione EVA). Proponi una o pi\xF9 decodifiche plausibili secondo le teorie storiche (es. Latino Abbreviato, Ebraico, Turco) e forniscine una traduzione in italiano corrente, riga per riga o parola per parola, svelando un'ipotetica formula medievale o ricetta segreta.

### \u{1F52C} LE MIE DEDUZIONI (COSA DEDUCO)
Spiega in modo esplicito 'cosa si deduce' da questa decifrazione e dall'analisi visuale dell'elemento. Formula deduzioni concrete sulle propriet\xE0 della pianta (es. sonnifero, antidoto, anestetico, veleno), sulla valenza magico-alchemica o sulla natura asemica del manoscritto, portando risposte chiare alle ipotesi aperte.

STRUTTURA PARAGRAFI PER IL CRITTANALISI SANDBOX:
Inoltre, DEVI SEMPRE terminare la risposta con un blocco di codice JSON delimitato da \`\`\`json ... \`\`\` che divide il testo del foglio analizzato in singoli paragrafi individuati (ad esempio da 1 a 4 paragrafi o pi\xF9, a seconda di quanti ne vedi nella pagina). Ciascun paragrafo nel JSON deve avere questo formato:
[
  {
    "id": "par_1",
    "nameIt": "Paragrafo 1 (In alto a sinistra)",
    "name": "Paragraph 1 (Top left)",
    "descriptionIt": "Descrizione in italiano della posizione del paragrafo rispetto alla pianta",
    "description": "Description in English of the position",
    "evaTranscription": "testo voynich in caratteri EVA rilevato (es. tfccy dready or o tteeo dyedy ot oorg)",
    "translationIt": "Traduzione ipotetica in italiano",
    "translationEn": "Hypothetical English translation",
    "wordByWord": [
      { "voynichWord": "parola1", "translation": "traduzione1", "explanation": "spiegazione1" }
    ]
  }
]
Assicurati che la trascrizione EVA utilizzi solo caratteri dell'alfabeto EVA (o, a, e, y, t, k, p, f, 8, r, c, l, n, d, m, g, s, x) e che le parole siano separate da spazi. Il JSON deve essere valido e posizionato alla fine del messaggio.`;
    if (language === "en") {
      systemInstruction = 'You are an expert paleographer, linguist, and Voynich Manuscript cryptanalyst. Your task is to analyze details of the pages and texts. Respond in English with scholarly rigour and engaging tone. IMPORTANT: After every botanical, cryptographic, or general paleographic analysis, YOU MUST ALWAYS append two distinct, beautifully formatted Markdown sections:\n\n### \u{1F52E} HYPOTHETICAL DECIPHERMENT & TRANSLATION\nDecipher the Voynich EVA text nearby or provided. Design a concrete translation under historical models (Abbreviated Latin, Hebrew, Proto-Turkish) into elegant readable modern language, showing what secret recipe or formula is hidden.\n\n### \u{1F52C} MY DEDUCTIONS (WHAT I DEDUCE)\nState clearly what you deduce from this decipherment and the visual element. Provide sharp, conclusive deductions about the plant\'s medicinal qualities (e.g. sedative, antidote, toxics), alchemical meanings, or script authenticity.\n\nPARAGRAPHS STRUCTURE FOR CIPHER SANDBOX:\nAdditionally, YOU MUST ALWAYS end your response with a JSON code block enclosed in ```json ... ``` which partitions the analyzed page text into the individual paragraphs detected on the page (from 1 to 4 or more, depending on the layout). Each paragraph in the JSON must strictly follow this schema:\n[\n  {\n    "id": "par_1",\n    "nameIt": "Paragrafo 1 (In alto a sinistra)",\n    "name": "Paragraph 1 (Top left)",\n    "descriptionIt": "Italian description of paragraph position relative to the plant diagram",\n    "description": "English description of the position",\n    "evaTranscription": "voynich text in EVA character format (e.g. tfccy dready or o tteeo dyedy ot oorg)",\n    "translationIt": "Hypothetical Italian translation",\n    "translationEn": "Hypothetical English translation",\n    "wordByWord": [\n      { "voynichWord": "word1", "translation": "translation1", "explanation": "explanation1" }\n    ]\n  }\n]\nEnsure that the EVA transcription uses only letters from the EVA alphabet and space delimiters. The JSON block must be valid and placed at the very end of the output.';
    }
    let prompt = "";
    if (elementId === "flowers") {
      prompt = `Analizza il bocciolo o infiorescenza in cima allo stelo del foglio f34v del Manoscritto Voynich. Che cosa potrebbe essere dal punto di vista botanico? \xC8 stato accostato al papavero da oppio, al melograno, o ad altri boccioli? Fornisci ipotesi storiche. Abbina la tua analisi a una decifrazione ipotetica del testo soprastante della pagina e dimmi cosa deduci su questo fiore medicinale.`;
    } else if (elementId === "green_leaves") {
      prompt = `Analizza le foglie verdi del foglio f34v del Voynich. Nota la disposizione alternata tra rami verdi e rami ocra/gialli. Cosa rappresenta graficamente e a livello botanico questa colorazione bicolore? Proponi una decifrazione ipotetica delle diciture vicine alle foglie verdi e spiega cosa deduci da esse.`;
    } else if (elementId === "yellow_leaves") {
      prompt = `Analizza le foglie color ocra/giallo appassite o secche del foglio f34v. Perch\xE9 l'autore ha scelto di colorare accuratamente solo alcune foglie di giallo? Qual \xE8 l'effetto medicinale o l'influsso stagionale associato a queste foglie secche? Decifra ipoteticamente e spiega cosa deduci.`;
    } else if (elementId === "roots") {
      prompt = `Analizza la radice bulbosa rigonfia ("rhizome") e il terreno lavorato (le collinette tratteggiate) ai piedi della pianta nel foglio f34v del Voynich. Qual \xE8 lo stile tipico delle radici nel Voynich? Ha somiglianze con altri erbari del XV secolo (es. Erbario Alchemico)? Dedica una decifrazione al testo inferiore e fammi capire cosa deduci sul rizoma.`;
    } else if (elementId === "paragraph_top_left" || elementId === "paragraph_top_right" || elementId === "paragraph_bottom_left" || elementId === "paragraph_bottom_right") {
      prompt = `Analizza questo blocco di testo trascritto nel foglio f34v del Voynich. Parlaci del sistema di scrittura EVA (European Voynich Alphabet), delle peculiarit\xE0 di questo blocco di testo, e delle frequenze delle parole (es. la radice '8am'/ 'daiin', i gallows 'p', 'f', 't', 'k'). Esegui una decifrazione e traduzione ipotetica approfondita riga per riga di questo blocco e illustra dettagliatamente cosa deduci sul suo significato.`;
    } else {
      prompt = customQuestion || `Analizza questo documento o manoscritto medievale inserito. Identificane lo stile grafico, la scrittura, gli ornamenti biologici, astronomici o alchemici se presenti. Fornisci SEMPRE una decifrazione ipotetica di una porzione di testo visibile e descrivi esplicitamente cosa deduci da essa.`;
    }
    const contents = [];
    if (imagesBase64 && Array.isArray(imagesBase64)) {
      imagesBase64.forEach((imgBase64) => {
        const matches = imgBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          contents.push({
            inlineData: {
              mimeType: matches[1],
              data: matches[2]
            }
          });
        }
      });
    } else if (imageBase64) {
      const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        contents.push({
          inlineData: {
            mimeType: matches[1],
            data: matches[2]
          }
        });
      }
    }
    contents.push({ text: prompt });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.2
      }
    });
    res.json({
      success: true,
      text: response.text
    });
  } catch (error) {
    console.error("Gemini active analysis error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Errore sconosciuto durante l'analisi con Gemini."
    });
  }
});
app.post("/api/decrypt-auto", async (req, res) => {
  try {
    const { textToDecrypt, cipherMethod, customMapping, language = "it" } = req.body;
    const userApiKey = req.headers["x-api-key"] || req.body.apiKey;
    const ai = getGeminiClient(userApiKey);
    if (!ai) {
      return res.json({
        success: true,
        mapping: customMapping || { "o": "e", "d": "r", "k": "t", "y": "a" },
        text: `[Modalit\xE0 Demo - Chiave API mancante]

Analisi del testo Voynich: "${textToDecrypt}" tramite metodo "${cipherMethod}".

Nello scenario reale, Gemini analizzer\xE0 la struttura fonotattica ed eseguir\xE0 abbinamenti basati sulla teoria selezionata (es. Romano-Celtico, Abbreviazioni Latine, Turco-Persiano o Asemico). Inserisci la tua chiave GEMINI_API_KEY nei Secrets del progetto per abilitare l'intelligenza artificiale.`
      });
    }
    const prompt = `Sei un computer crittanalitico dedicato allo studio del Manoscritto Voynich.
Ti viene fornito il seguente testo Voynich in caratteri EVA: "${textToDecrypt}"
L'utente ha selezionato l'approccio interpretativo storico: "${cipherMethod}"

Nel formato JSON specificato, produci un'analisi crittanalitica formale del testo in lingua ${language === "it" ? "italiana" : "inglese"}.
Devi includere:
1. Una potenziale chiave di sostituzione monovocalica/consonantica sensata basata sull'approccio interpretativo (es. se latino, mappare certi grafemi a vocali latine; se turco medievale, suoni fonetici turchi).
2. Una traduzione ipotetica parola per parola e poi contestualizzata.
3. Un commento di plausibilit\xE0 statistica (es. entropia del testo Voynich che \xE8 insolitamente bassa rispetto al latino, assunzione di ripetizioni, ecc.).

Importante: Rispondi ESCLUSIVAMENTE con un oggetto JSON valido contenente queste chiavi:
- "suggestedMapping": un oggetto chiave-valore di coppie di sostituzione (es. {"o": "e", ...})
- "hypotheticalTranslation": stringa con la traduzione ipotetica contestualizzata.
- "wordByWordAnalysis": array di oggetti con { voynichWord: string, translation: string, explanation: string }
- "statisticalCommentary": stringa descrivente le anomalie linguistiche della decifrazione selezionata.`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3
      }
    });
    const parsedResult = JSON.parse(response.text || "{}");
    res.json({
      success: true,
      ...parsedResult
    });
  } catch (error) {
    console.error("Decryption API error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Errore nel motore di decifrazione."
    });
  }
});
var api_default = app;

// server.ts
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
async function startServer() {
  const PORT = 3e3;
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    api_default.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    api_default.use(express.static(distPath));
    api_default.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  api_default.listen(PORT, "0.0.0.0", () => {
    console.log(`Voynich Decipherer server running on port ${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
