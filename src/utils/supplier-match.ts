export interface SupplierRecord {
  id: string;
  ragioneSociale: string;
  piva?: string;
  responsabile?: string;
  telefono?: string;
  email?: string;
  indirizzo?: string;
  status?: string;
  note?: string;
}

export interface PantryLoadRecord {
  id: string;
  supplierId?: string;
  supplierName?: string;
  entryDate?: string;
  ddtImageUrl?: string;
  ingredientName?: string;
  items?: PantryLoadRecord[];
}

export const DDT_AI_PROMPT = `Sei un operatore HACCP che legge un DDT / Documento di Trasporto / Bolla di consegna italiana.

FORNITORE (OBBLIGATORIO):
- Il MITTENTE / FORNITORE è nel riquadro in ALTO A SINISTRA.
- Il DESTINATARIO / CLIENTE è in ALTO A DESTRA: NON usarlo come fornitore.
- supplierName = ragione sociale del mittente (sinistra).
- supplierPiva = Partita IVA del mittente se visibile.

DATA:
- entryDate = data del documento (preferibilmente YYYY-MM-DD).

PRODOTTI (PARTE PIÙ IMPORTANTE):
- Estrai TUTTE le righe della tabella prodotti al centro del documento.
- Ogni riga merce = un oggetto in "items".
- ingredientName = colonna Descrizione / Prodotto / Articolo / Merce / Denominazione (testo principale della riga).
- lotto = Lotto / Lot / Batch / Codice lotto (stringa vuota se assente).
- quantity = Quantità / Q.tà / Qta / U.M. / Kg / Pezzi (es. "10 KG", "6 CT").
- expiryDate = Scadenza / Data scadenza (YYYY-MM-DD o stringa vuota).
- NON saltare righe: se vedi 5 prodotti, items deve avere 5 elementi.
- Ignora righe di intestazione tabella, totali, IVA, trasporto.

Se un campo non è leggibile usa "" (stringa vuota) ma compila sempre ingredientName se la riga prodotto è visibile.`;

export const DDT_AI_SCHEMA = {
  type: 'OBJECT',
  properties: {
    supplierName: { type: 'STRING' },
    supplierPiva: { type: 'STRING' },
    entryDate: { type: 'STRING' },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          ingredientName: { type: 'STRING' },
          lotto: { type: 'STRING' },
          quantity: { type: 'STRING' },
          expiryDate: { type: 'STRING' }
        }
      }
    }
  },
  required: ['supplierName', 'entryDate', 'items']
};

export function normalizeSupplierName(name: string): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(s\.?r\.?l\.?|s\.?p\.?a\.?|s\.?n\.?c\.?|s\.?a\.?s\.?|s\.?r\.?l\.?s\.?)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function normalizePiva(piva: string): string {
  return (piva || '').replace(/\D/g, '').replace(/^IT/i, '');
}

export function findMatchingSupplier(
  suppliers: SupplierRecord[],
  name: string,
  piva?: string
): SupplierRecord | null {
  if (!suppliers?.length) return null;

  const normPiva = normalizePiva(piva || '');
  if (normPiva.length >= 11) {
    const byPiva = suppliers.find(s => normalizePiva(s.piva || '') === normPiva);
    if (byPiva) return byPiva;
  }

  const normName = normalizeSupplierName(name);
  if (!normName) return null;

  const exact = suppliers.find(s => normalizeSupplierName(s.ragioneSociale) === normName);
  if (exact) return exact;

  const partial = suppliers.find(s => {
    const sn = normalizeSupplierName(s.ragioneSociale);
    if (!sn || sn.length < 4 || normName.length < 4) return false;
    return sn.includes(normName) || normName.includes(sn);
  });

  return partial || null;
}

export function groupPantryLoadsByDocument(
  pantry: PantryLoadRecord[],
  supplier: SupplierRecord
): PantryLoadRecord[] {
  const normSupplier = normalizeSupplierName(supplier.ragioneSociale);
  const normPiva = normalizePiva(supplier.piva || '');

  const loads = pantry.filter(item => {
    if (item.supplierId && item.supplierId === supplier.id) return true;
    const nameMatch = normalizeSupplierName(item.supplierName || '') === normSupplier;
    if (nameMatch) return true;
    return normPiva.length >= 11 && normalizePiva((item as any).supplierPiva || '') === normPiva;
  });

  const grouped = new Map<string, PantryLoadRecord>();

  for (const item of loads) {
    const key = `${item.entryDate || ''}_${item.ddtImageUrl || 'no-img'}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: item.id,
        entryDate: item.entryDate,
        ddtImageUrl: item.ddtImageUrl,
        supplierId: item.supplierId,
        supplierName: item.supplierName,
        items: [item]
      });
    } else {
      grouped.get(key)!.items!.push(item);
    }
  }

  return Array.from(grouped.values()).sort((a, b) =>
    (b.entryDate || '').localeCompare(a.entryDate || '')
  );
}

export function countSupplierLoads(pantry: PantryLoadRecord[], supplier: SupplierRecord): number {
  return groupPantryLoadsByDocument(pantry, supplier).length;
}

export interface DdtFormItem {
  ingredientName: string;
  lotto: string;
  quantity: string;
  expiryDate: string;
}

export interface NormalizedDdtParse {
  supplierName: string;
  supplierPiva: string;
  entryDate: string;
  items: DdtFormItem[];
}

const PRODUCT_NAME_KEYS = [
  'ingredientName', 'productName', 'nome', 'name', 'descrizione', 'description',
  'prodotto', 'articolo', 'item', 'label', 'denominazione', 'merce', 'desc',
  'descrizioneArticolo', 'descrizioneMerce', 'articoloDescrizione', 'product',
  'nomeProdotto', 'nomeArticolo', 'descrizioneProdotto', 'text', 'title'
];

const LOTTO_KEYS = [
  'lotto', 'lotNumber', 'lot', 'batch', 'lottoProduzione', 'codiceLotto',
  'numeroLotto', 'lottoNumero', 'codLotto', 'nLotto'
];

const QTY_KEYS = [
  'quantity', 'qta', 'quantita', 'qty', 'amount', 'pezzi', 'um', 'unitaMisura',
  'quantitaTrasportata', 'qtaTrasportata', 'colli', 'peso', 'unita', 'uom'
];

const EXPIRY_KEYS = [
  'expiryDate', 'scadenza', 'expirationDate', 'dataScadenza', 'dataScadenzaProdotto',
  'scadenzaProdotto', 'dataScad'
];

const ITEM_ARRAY_KEYS = [
  'items', 'products', 'prodotti', 'righe', 'lines', 'articoli', 'productList',
  'dettaglio', 'dettagli', 'righeDocumento', 'lineItems', 'rows', 'merci',
  'voci', 'body', 'content', 'documentLines', 'listaProdotti', 'elencoProdotti'
];

const HEADER_WORDS = /^(descrizione|prodotto|articolo|qty|quantit|lotto|scadenza|codice|u\.m\.|n\.|totale|iva|importo|prezzo)$/i;

function pickValue(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const val = obj[key];
    if (val !== undefined && val !== null) {
      const str = String(val).trim();
      if (str) return str;
    }
  }
  return '';
}

function inferProductName(row: Record<string, unknown>): string {
  const explicit = pickValue(row, PRODUCT_NAME_KEYS);
  if (explicit) return explicit;

  const stringValues = Object.entries(row)
    .filter(([key, val]) => typeof val === 'string' && String(val).trim().length > 1)
    .filter(([key]) => !LOTTO_KEYS.includes(key) && !QTY_KEYS.includes(key) && !EXPIRY_KEYS.includes(key))
    .map(([, val]) => String(val).trim())
    .filter(val => !HEADER_WORDS.test(val) && !/^\d+([.,]\d+)?$/.test(val));

  if (stringValues.length === 0) return '';

  return stringValues.sort((a, b) => b.length - a.length)[0];
}

function rowToItem(raw: any): DdtFormItem | null {
  if (typeof raw === 'string' && raw.trim()) {
    const name = raw.trim();
    if (HEADER_WORDS.test(name)) return null;
    return { ingredientName: name, lotto: '', quantity: '', expiryDate: '' };
  }

  if (!raw || typeof raw !== 'object') return null;

  const row = raw as Record<string, unknown>;
  const ingredientName = inferProductName(row);
  if (!ingredientName || ingredientName.length < 2) return null;
  if (HEADER_WORDS.test(ingredientName)) return null;

  return {
    ingredientName,
    lotto: pickValue(row, LOTTO_KEYS),
    quantity: pickValue(row, QTY_KEYS),
    expiryDate: pickValue(row, EXPIRY_KEYS)
  };
}

function normalizeArray(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') return Object.values(raw);
  return [];
}

function mapItemArray(arr: unknown): DdtFormItem[] {
  const items: DdtFormItem[] = [];
  for (const raw of normalizeArray(arr)) {
    const item = rowToItem(raw);
    if (item) items.push(item);
  }
  return items;
}

function extractItemsDeeply(obj: any, depth = 0, seen = new Set<any>()): DdtFormItem[] {
  if (!obj || depth > 6 || seen.has(obj)) return [];
  seen.add(obj);

  if (Array.isArray(obj)) {
    const mapped = mapItemArray(obj);
    if (mapped.length > 0) return mapped;
    for (const entry of obj) {
      const nested = extractItemsDeeply(entry, depth + 1, seen);
      if (nested.length > 0) return nested;
    }
    return [];
  }

  if (typeof obj !== 'object') return [];

  for (const key of ITEM_ARRAY_KEYS) {
    if (obj[key] !== undefined) {
      const mapped = mapItemArray(obj[key]);
      if (mapped.length > 0) return mapped;
    }
  }

  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) {
      const mapped = mapItemArray(value);
      if (mapped.length >= 2) return mapped;
      if (mapped.length === 1) {
        const more = extractItemsDeeply(obj, depth + 1, seen);
        if (more.length > mapped.length) return more;
        if (mapped.length > 0) return mapped;
      }
    }
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') {
      const nested = extractItemsDeeply(value, depth + 1, seen);
      if (nested.length > 0) return nested;
    }
  }

  return [];
}

export function normalizeParsedDdt(parsed: any): NormalizedDdtParse {
  if (!parsed || typeof parsed !== 'object') {
    return { supplierName: '', supplierPiva: '', entryDate: '', items: [] };
  }

  const root = parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;

  let items = extractItemsDeeply(root);

  if (items.length === 0) {
    const singleName = pickValue(root, PRODUCT_NAME_KEYS);
    if (singleName) {
      items = [{
        ingredientName: singleName,
        lotto: pickValue(root, LOTTO_KEYS),
        quantity: pickValue(root, QTY_KEYS),
        expiryDate: pickValue(root, EXPIRY_KEYS)
      }];
    }
  }

  return {
    supplierName: pickValue(root, ['supplierName', 'supplier', 'mittente', 'fornitore', 'vendor', 'ragioneSociale', 'emittente']),
    supplierPiva: pickValue(root, ['supplierPiva', 'piva', 'partitaIva', 'vatNumber', 'vat', 'pivaMittente']),
    entryDate: pickValue(root, ['entryDate', 'date', 'documentDate', 'data', 'dataDocumento', 'dataDDT']),
    items
  };
}
