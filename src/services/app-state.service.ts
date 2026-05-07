 import { Injectable, signal, computed, inject, effect } from '@angular/core';
 import { ToastService } from './toast.service';
 import { supabase } from '../supabase';

export type UserRole = 'ADMIN' | 'COLLABORATOR' | null;

export interface AdminCompany {
  name: string;
  piva: string;
  address: string;
  phone: string;
  cellphone: string;
  whatsapp: string;
  email: string;
  pec: string;
  sdi: string;
  licenseNumber: string;
  logo?: string;
  labelFormat?: '62mm' | '29mm' | '12mm';
}

export interface ClientEntity {
  id: string;
  name: string;
  piva: string;
  address: string;
  phone: string;
  cellphone?: string;
  whatsapp?: string;
  email: string;
  licenseNumber: string;
  suspended: boolean; // Service suspension for non-payment
  paymentBalanceDue?: boolean; // New: Banner info for balance payment due
  licenseExpiryDate?: string;
  logo?: string;
  printerModel?: string;
  labelFormat?: '62mm' | '29mm' | '12mm';
  printerDriverUrl?: string;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  active: boolean;
  avatar: string;
  initials?: string;
  clientId?: string; // Link to the specific Company/Client
  username?: string;
  password?: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  initials?: string;
  department?: string;
  clientId?: string;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  category: 'dashboard' | 'operations' | 'history' | 'monitoring' | 'config' | 'communication' | 'production' | 'documentation' | 'hardware';
  adminOnly?: boolean;
  operatorOnly?: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  recipientType: 'ALL' | 'SINGLE';
  recipientId?: string; // clientId if SINGLE
  recipientUserId?: string; // specific userId if SINGLE
  subject: string;
  content: string;
  attachmentUrl?: string;
  attachmentName?: string;
  fileData?: string; // Base64 data stored in DB
  timestamp: Date;
  read: boolean;
  replies: MessageReply[];
}

export interface MessageReply {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  attachmentUrl?: string;
  attachmentName?: string;
  fileData?: string;
  timestamp: Date;
}

export interface AppDocument {
  id: string;
  clientId: string;
  category: string; // e.g., 'regolarita-documentazione'
  type: string; // e.g., 'scia', 'camerale', etc.
  fileName: string;
  fileType: string;
  fileData?: string; // base64
  uploadDate: Date;
  expiryDate?: string; // For PEE
  userId?: string; // Specific unit/collaborator association
}

export interface ProductionIngredient {
  id: string;
  name: string;
  packingDate: string;
  expiryDate: string;
  lotto: string; // or invoice ref
  photo?: string; // base64 jpg
  allergens?: string[];
}

export interface ProductionRecord {
  id: string;
  recordedDate: string; // day of record (archive date)
  mainProductName: string;
  packagingDate: string;
  expiryDate: string;
  lotto: string;
  ingredients: ProductionIngredient[];
  userId: string;
  clientId: string;
}
export interface RecipeIngredient {
  name: string;
  percentage: number;
  allergens: string[];
}

export interface Recipe {
  id: string;
  clientId: string;
  name: string;
  category?: string;
  description?: string;
  ingredients: RecipeIngredient[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  clientId: string;
  amount: number;
  frequency: string;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  paidDate?: string;
  notes?: string;
}

export interface JournalEntry {
  id: string;
  clientId: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  category: string;
}

export interface Reminder {
  id: string;
  clientId: string;
  type: string;
  message: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  dismissed: boolean;
}

export interface AllergenDef {
  id: string;
  label: string;
  code: string;
  icon: string;
  color: string;
  bg: string;
  text: string;
  active: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppStateService {

  readonly ALLERGEN_LIST: AllergenDef[] = [
    { id: 'Glutine', label: 'Glutine', code: 'GLU', icon: 'fa-wheat-awn', color: 'amber', bg: 'bg-amber-50', text: 'text-amber-700', active: 'bg-amber-100 border-amber-400 text-amber-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]' },
    { id: 'Crostacei', label: 'Crostacei', code: 'CRO', icon: 'fa-shrimp', color: 'rose', bg: 'bg-rose-50', text: 'text-rose-700', active: 'bg-rose-100 border-rose-400 text-rose-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]' },
    { id: 'Uova', label: 'Uova', code: 'UOV', icon: 'fa-egg', color: 'yellow', bg: 'bg-yellow-50', text: 'text-yellow-700', active: 'bg-yellow-100 border-yellow-400 text-yellow-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]' },
    { id: 'Pesce', label: 'Pesce', code: 'PES', icon: 'fa-fish', color: 'blue', bg: 'bg-blue-50', text: 'text-blue-700', active: 'bg-blue-100 border-blue-400 text-blue-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]' },
    { id: 'Arachidi', label: 'Arachidi', code: 'ARA', icon: 'fa-heart-crack', color: 'orange', bg: 'bg-orange-50', text: 'text-orange-700', active: 'bg-orange-200 border-orange-500 text-orange-950 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]' },
    { id: 'Soia', label: 'Soia', code: 'SOI', icon: 'fa-leaf', color: 'green', bg: 'bg-green-50', text: 'text-green-700', active: 'bg-green-100 border-green-400 text-green-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]' },
    { id: 'Latte', label: 'Latte', code: 'LAT', icon: 'fa-cow', color: 'sky', bg: 'bg-sky-50', text: 'text-sky-700', active: 'bg-sky-100 border-sky-400 text-sky-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]' },
    { id: 'Frutta a guscio', label: 'Frutta G.', code: 'FRU', icon: 'fa-box-open', color: 'amber', bg: 'bg-amber-100/50', text: 'text-amber-900', active: 'bg-amber-200 border-amber-600 text-amber-950 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]' },
    { id: 'Sedano', label: 'Sedano', code: 'SED', icon: 'fa-carrot', color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', active: 'bg-emerald-100 border-emerald-400 text-emerald-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]' },
    { id: 'Senape', label: 'Senape', code: 'SEN', icon: 'fa-jar', color: 'yellow', bg: 'bg-yellow-100', text: 'text-yellow-800', active: 'bg-yellow-200 border-yellow-500 text-yellow-950 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]' },
    { id: 'Sesamo', label: 'Sesamo', code: 'SES', icon: 'fa-ellipsis-vertical', color: 'slate', bg: 'bg-slate-50', text: 'text-slate-700', active: 'bg-slate-200 border-slate-400 text-slate-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]' },
    { id: 'Solfiti', label: 'Solfiti', code: 'SOL', icon: 'fa-wine-glass', color: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-700', active: 'bg-indigo-100 border-indigo-400 text-indigo-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]' },
    { id: 'Lupini', label: 'Lupini', code: 'LUP', icon: 'fa-circle-dot', color: 'lime', bg: 'bg-lime-50', text: 'text-lime-700', active: 'bg-lime-100 border-lime-400 text-lime-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]' },
    { id: 'Molluschi', label: 'Molluschi', code: 'MOL', icon: 'fa-otter', color: 'cyan', bg: 'bg-cyan-50', text: 'text-cyan-700', active: 'bg-cyan-100 border-cyan-400 text-cyan-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]' }
  ];
  // --- Auth State ---
  readonly currentUser = signal<User | null>(null);

  // --- GLOBAL INGREDIENTS DATABASE (Memorized List) ---
  readonly baseIngredients = signal<string[]>([
    'Pane', 'Pane Bianco', 'Pane Integrale', 'Pane ai Cereali', 'Focaccia', 'Pizza', 'Panino', 'Piadina', 'Grissini', 'Pangrattato',
    'Acqua Minerale Naturale (0.5L)', 'Acqua Minerale Naturale (1L)', 'Acqua Frizzante (0.5L)', 'Acqua Frizzante (1L)', 'Acqua Effervescente Naturale', 'Acqua Tonica Premium', 'Acqua Tonica al Pompelmo', 'Ginger Beer artigianale', 'Ginger Ale', 'Soda Water', 'Limonata amara', 'Cedrata', 'Chinotto', 'Spuma Bionda', 'Gazzosa Antica Ricetta', 'Cola Classica', 'Cola Zero Zuccheri', 'Aranciata Classica', 'Aranciata Amara', 'Tè Freddo al Limone', 'Tè Freddo alla Pesca', 'Te Freddo Verde', 'Succo di Arancia 100%', 'Succo di Mela torbido', 'Succo di Pera (Nettare)', 'Succo di Pesca (Nettare)', 'Succo di Albicocca', 'Succo di Mirtillo', 'Succo di Ananas', 'Succo di Pompelmo Rosa', 'Succo di Pomodoro (Mix)', 'Sciroppo di Zucchero', 'Sciroppo di Grenadine', 'Sciroppo di Orzata', 'Sciroppo di Menta', 'Latte di Cocco (Cocktail)', 'Crema di Cocco',
    'Birra Chiara alla Spina', 'Birra Rossa alla Spina', 'Birra Doppio Malto', 'Birra IPA Artigianale', 'Birra APA', 'Birra Blanche', 'Birra Stout', 'Birra Analcolica', 'Cidro di Mele',
    'Vino Bianco Fermo (DOC)', 'Vino Bianco Mosso', 'Vino Rosso di Struttura', 'Vino Rosso Novello', 'Vino Rosato Salento', 'Prosecco DOCG', 'Franciacorta Brut', 'Champagne Cuvée', 'Metodo Classico Pas Dosé', 'Lambrusco Mantovano', 'Passito di Pantelleria', 'Vin Santo', 'Moscato d\'Asti', 'Vermouth Rosso', 'Vermouth Bianco', 'Vermouth Dry', 'Bitter Campari', 'Aperol', 'Select', 'Cynar',
    'Gin London Dry', 'Gin Distilled (Botanical)', 'Vodka Grain', 'Vodka Potato', 'Rum Bianco Antille', 'Rum Scuro Invecchiato', 'Tequila Blanco', 'Tequila Reposado', 'Mezcal Espadin', 'Whisky Scotch (Single Malt)', 'Whiskey Irish', 'Bourbon Whiskey', 'Grappa Bianca Barrique', 'Grappa Invecchiata', 'Cognac VSOP', 'Armagnac', 'Calvados', 'Limoncello artigianale', 'Mirto di Sardegna', 'Amaro Lucano', 'Amaro del Capo', 'Amaro Averna', 'Amaro Montenegro', 'Sambuca', 'Anisetta', 'Maraschino', 'Triple Sec', 'Cointreau', 'Grand Marnier', 'Kahlúa (Liquore Caffè)', 'Baileys Irish Cream',
    'Caffè in Grani Miscela 100% Arabica', 'Caffè in Grani Miscela Bar', 'Caffè Decaffeinato', 'Caffè al Ginseng', 'Orzo solubile', 'Tè Nero in foglia', 'Tè Verde Matcha', 'Camomilla (Fiori interi)', 'Infuso ai Frutti di Bosco', 'Karkadè',
    'Farina 00 (Pasta Frolla)', 'Farina 00 (Pan di Spagna)', 'Farina Manitoba', 'Farina di Mais', 'Farina di Riso', 'Farina di Ceci', 'Fecola di Patate', 'Amido di Mais (Maizena)', 'Amido di Frumento (Frumina)', 'Fecola di Maranta (Arrowroot)', 'Fruttosio', 'Zucchero Muscovado', 'Zucchero Demerara', 'Zucchero Candito', 'Zucchero Invertito', 'Glucosio in sciroppo', 'Maltodestrine', 'Isomalto', 'Eritritolo', 'Stevia', 'Sciroppo d\'Agave', 'Melata di Bosco', 'Miele di Castagno', 'Miele di Sulla', 'Miele di Zagara',
    'Cioccolato Fondente 70%', 'Cioccolato Fondente 85%', 'Cioccolato al Latte Extra', 'Cioccolato Bianco (Pasticceria)', 'Cioccolato Ruby', 'Burro di Cacao', 'Cacao Amaro in Polvere', 'Cacao Alcalinizzato', 'Granella di Cacao (Nibs)', 'Pasta di Nocciola 100%', 'Pasta di Pistacchio Pura', 'Pasta di Mandorla (Panetto)', 'Pasta di Arancia (Flavor)', 'Estratto di Vaniglia Bourbon', 'Bacche di Vaniglia (Madagascar)', 'Fava Tonka', 'Essenza di Mandorla Amara', 'Essenza di Arancia', 'Essenza di Cedro', 'Acqua di Rose (Alimentare)', 'Acqua di Fiori d\'Arancio',
    'Fogli di Gelatina (Colla di Pesce)', 'Gelatina in Polvere', 'Agar Agar', 'Pectina NH', 'Pectina Gialla', 'Gomma di Xanthano', 'Gomma Guar', 'Lecitina di Soia', 'Bicarbonato d\'Ammonio', 'Cremor Tartaro', 'Lievito Madre Fresco (Pasticceria)', 'Lievito Chimico per Dolci',
    'Frutti di Bosco Surgelati', 'Passata di Lamponi', 'Purea di Mango', 'Purea di Passiflora (Maracuja)', 'Purea di Fragola', 'Amarene Sciroppate', 'Ciliegie Candite', 'Scorze di Arancia Candite', 'Cedro Candito', 'Macedonia Candita', 'Marron Glacé', 'Zenzero Candito', 'Zeste di Limone Essiccate', 'Limone grattugiato fresco',
    'Granella di Meringa', 'Meringhette', 'Gocce di Cioccolato', 'Scaglie di Cioccolato Bianco', 'Zuccherini colorati (Sprinkles)', 'Perle di Zucchero argento', 'Foglia d\'Oro alimentare', 'Foglia d\'Argento alimentare', 'Cialde per Gelato', 'Biscotti Lotus (granella)', 'Polvere di Caffè solubile', 'Latte Condensato intero', 'Latte Condensato zuccherato', 'Dulce de Leche', 'Crema Spalmabile alle Nocciole', 'Crema Spalmabile al Pistacchio',
    'Savoiardi Sardi', 'Biscotti tipo Digestive', 'Pasta Sfoglia (Rotolo)', 'Pasta Frolla (Rotolo)', 'Pasta Brisée', 'Pan di Spagna Pronto', 'Basi per Crostate', 'Bignè vuoti', 'Cannoli Siciliani (Cialde)', 'Cialdine per tartellette', 'Granella di Amaretto', 'Lingue di Gatto', 'Cialde per gelato (Coni)',
    'Farina 00', 'Farina Intera', 'Farina Manitoba', 'Farina di Mais', 'Farina di Riso', 'Farina di Ceci', 'Fecola di Patate', 'Amido di Mais', 'Amido di Frumento', 'Farina di Grano Saraceno', 'Farina di Castagne', 'Farina di Farro', 'Farina di Segale', 'Semola di Grano Duro', 'Semola Rimacinata',
    'Zucchero Semolato', 'Zucchero a Velo (Idrorepellente)', 'Zucchero a Velo classico', 'Zucchero di Canna', 'Miele di Acacia', 'Miele di Millefiori', 'Sciroppo d\'Acero',
    'Latte Intero', 'Latte Parzialmente Scremato', 'Latte di Soia', 'Latte di Mandorla', 'Latte di Riso', 'Latte di Cocco', 'Panna fresca da montare', 'Panna da cucina', 'Panna Vegetale (Dolci)',
    'Uova Fresche', 'Uova Pastorizzate (Albume)', 'Uova Pastorizzate (Tuorlo)', 'Uovo in Polvere',
    'Burro', 'Burro Chiarificato', 'Margarina Vegetale', 'Olio Extravergine di Oliva', 'Olio di Semi di Girasole', 'Olio di Arachidi', 'Olio di Mais', 'Olio di Sesamo',
    'Sale Fino', 'Sale Grosso', 'Pepe Nero', 'Pepe Bianco', 'Pepe Verde', 'Peperoncino', 'Origano', 'Rosmarino', 'Salvia', 'Basilico', 'Prezzemolo', 'Timo', 'Maggiorana', 'Erba Cipollina', 'Menta Fresca', 'Alloro', 'Chiodi di Garofano', 'Cannella in polvere', 'Cannella in stecche', 'Noce Moscata', 'Zafferano in fili', 'Curcuma', 'Zenzero Fresco', 'Paprika Dolce', 'Paprika Affumicata', 'Curry',
    'Mozzarella Fior di Latte', 'Mozzarella di Bufala', 'Burrata', 'Provola Affumicata', 'Scamorza', 'Parmigiano Reggiano', 'Grana Padano', 'Pecorino Romano', 'Pecorino Sardo', 'Gorgonzola', 'Taleggio', 'Mascarpone (Alta qualità)', 'Ricotta Vaccina', 'Ricotta di Pecora', 'Formaggio Spalmabile', 'Fontina', 'Emmental', 'Caciocavallo', 'Asiago', 'Montasio', 'Gorgonzola Dolce', 'Stracchino', 'Squacquerone', 'Robiola', 'Feta', 'Edam', 'Gouda', 'Cheddar', 'Philadelphia',
    'Spaghetti n.5', 'Spaghettini', 'Spaghettoni', 'Bucatini', 'Linguine', 'Bavette', 'Penne Rigate', 'Penne Lisce', 'Pennoni', 'Fusilli', 'Fusilli Bucati', 'Rigatoni', 'Tortiglioni', 'Mezze Maniche', 'Paccheri', 'Calamarata', 'Casarecce', 'Trofie', 'Orecchiette', 'Strascinati', 'Malloreddus', 'Culingionis', 'Pici', 'Bigoli', 'Ziti', 'Mafaldine', 'Farfalle', 'Piperigate', 'Conchiglie', 'Conchiglioni', 'Radiatori', 'Gnocchetti Sardi', 'Fregola sarda', 'Anelletti', 'Ditali', 'Ditalini', 'Stelline', 'Risoni', 'Grattoni', 'Quadrucci', 'Spaghetti alla Chitarra',
    'Tagliatelle all\'uovo', 'Tagliolini all\'uovo', 'Pappardelle all\'uovo', 'Fettuccine all\'uovo', 'Lasagne all\'uovo', 'Cannelloni', 'Tortellini alla carne', 'Ravioli di magro', 'Ravioli alla carne', 'Agnolotti del plin', 'Cappelletti', 'Anolini', 'Tortelli di zucca', 'Culurgiones', 'Passatelli', 'Canederli', 'Spätzle',
    'Gnocchi di Patate', 'Gnocchi di Zucca', 'Gnocchi alla Romana', 'Chicche di patate',
    'Riso Carnaroli', 'Riso Arborio', 'Riso Vialone Nano', 'Riso Roma', 'Riso Basmati', 'Riso Venere (Nero)', 'Riso Ermes (Rosso)', 'Riso Integrale', 'Riso Parboiled', 'Riso Originario', 'Riso per Sushi',
    'Pane Bianco (Pagnotta)', 'Pane Integrale', 'Pane ai Cereali', 'Pane di Segale', 'Pane Arabo', 'Pane per Hamburger (Bun)', 'Pane a Cassetta', 'Pan Bauletto', 'Pan Carré', 'Panini all\'Olio', 'Panini al Latte', 'Ciabatta', 'Baguette', 'Focaccia Liscia', 'Focaccia Genovese', 'Focaccia Barese', 'Pizza (Base bianca)', 'Pizza (Base rossa)', 'Piadina Romagnola', 'Tigelle Emiliane', 'Crescentine', 'Gnocco Fritto', 'Grissini Torinesi', 'Crostini di Pane', 'Pangrattato', 'Basi per Bruschetta', 'Taralli Pugliesi', 'Friselle', 'Schiacciata Toscana', 'Pane di Altamura DOP', 'Pane Carasau', 'Pane Guttiau',
    'Orzo Perlato', 'Farro Dicocco', 'Grano Saraceno in chicchi', 'Quinoa Bianca', 'Quinoa Rossa', 'Quinoa Nera', 'Couscous Mezzo Grosso', 'Cuscus Integrale', 'Bulgur', 'Polenta Istantanea', 'Polenta Taragna',
    'Brodo Vegetale (preparato)', 'Brodo di Carne (preparato)', 'Brodo di Pesce (Fumetto)', 'Dadò Vegetale', 'Dado di Carne', 'Estratto di Carne',
    'Ossobuco di Bovino', 'Filetto di Manzo (Taglio)', 'Controfiletto (Entrecôte)', 'Fesa di Manzo', 'Noce di Manzo', 'Girello di Manzo (Magatello)', 'Scamone', 'Cappello del Prete (Aletta)', 'Biancostato', 'Lingua di Bovino', 'Fegato di Vitello', 'Animelle', 'Trippa', 'Guancia di Manzo', 'Fiorentina (T-Bone)', 'Arista di Maiale', 'Braciole di Maiale', 'Costine di Maiale (Ribs)', 'Filetto di Maiale', 'Coppa di Maiale Fresca', 'Stinco di Maiale', 'Pancetta di Maiale Fresca', 'Porchetta (tronchetto)', 'Coniglio Intero', 'Cosce di Coniglio', 'Sella di Coniglio', 'Petto d\'Anatra', 'Cosce d\'Anatra (Confit)', 'Faraona', 'Quaglie', 'Piccione', 'Cinghiale (Polpa)', 'Capriolo', 'Cervo', 'Agnello (Coscia)', 'Costolette d\'Agnello', 'Coratella d\'Agnello', 'Arrosticini', 'Hamburger di Chianina', 'Hamburger di Scottona', 'Hamburger di Black Angus', 'Salsiccia di Pollo e Tacchino', 'Wurstel di Suino', 'Wurstel di Pollo', 'Galletto Vallespluga',
    'Orata di Mare', 'Branzino (Spigola)', 'Rombo Chiodato', 'Sogliola Fresca', 'Cernia (Filetto)', 'Dentice', 'Mormora', 'Gallinella di Mare (Mazzola)', 'Scorfano Fresco', 'Pesce San Pietro', 'Filetto di Sarago', 'Ricciola Fresca', 'Palamita', 'Tonno Rosso (Abbattuto)', 'Tataki di Tonno', 'Pesce Spada (Trance)', 'Salmone Norvegese Fresco', 'Trota Salmonata', 'Trota Iridea', 'Merluzzo Nordico (Skrei)', 'Filetto di Platessa', 'Pesce Nasello', 'Filetto di Persico', 'Triglia di Scoglio', 'Alici Fresche (Marinate)', 'Gambero Rosso di Mazara', 'Gambero Viola', 'Scampo Reale', 'Astice Blu', 'Astice Americano', 'Granseola', 'Mazzancolla Tropicale', 'Coda di Rospo (Rana Pescatrice)', 'Sepia (Nostrana)', 'Calamaro Nazionale', 'Totano Fresco', 'Moscardini', 'Polpo Verace', 'Gran fritto misto (Pesce)', 'Fiori di Zucca con Acciuga', 'Polpette di Pesce', 'Bastoncini di Pesce',
    'Tofu al Naturale', 'Tofu Affumicato', 'Seitan alla Piastra', 'Seitan al Naturale', 'Tempeh di Soia', 'Mopur (Carne Vegetale)', 'Burger Vegetale (Soia)', 'Burger di Verdure', 'Cotoletta di Soia', 'Nuggets di Soia', 'Spezzatino di Soia', 'Muscolo di Grano', 'Lenticchie Secche', 'Ceci in Scatola', 'Ceci Secchi', 'Fagioli Borlotti Freschi', 'Fagioli Borlotti Secchi', 'Fagioli Cannellini', 'Fagioli Bianchi di Spagna', 'Fagioli Azuki', 'Lupini in Salamoia', 'Hummus di Ceci', 'Falafel',
    'Uova Sode', 'Uova in camicia', 'Frittata alle Erbe', 'Omelette al Formaggio', 'Polpette di Pane', 'Polpettone di Carne', 'Involtini di Vitello (Messinesi)', 'Involtini di Pollo', 'Cordon Bleu', 'Cotoletta alla Milanese', 'Saltimbocca alla Romana', 'Straccetti di Manzo', 'Tagliata di Manzo', 'Vitello Tonnato (Girello)', 'Pollo allo Spiedo', 'Nuggets di Pollo', 'Alette di Pollo Piccanti', 'Spiedini Misti (Carni)', 'Spiedini di Pesce', 'Tataki di Salmone', 'Tartare di Manzo', 'Tartare di Pesce (Salmone/Tonno)', 'Carpaccio di Pesce Spada', 'Zuppa di Pesce (Cacciucco)', 'Brodetto di Pesce',
    'Mela Golden Delicious', 'Mela Fuji', 'Mela Annurca', 'Mela Granny Smith', 'Mela Stark', 'Pera Abate Fetel', 'Pera William', 'Pera Kaiser', 'Pera Coscia', 'Pesca Gialla', 'Pesca Bianca', 'Pesca Noce (Nettarina)', 'Albicocca Vesuviana', 'Susina Claudia', 'Susina Goccia d\'Oro', 'Ciliegia Ferrovia', 'Ciliegia di Marostica', 'Amarena Fresca', 'Fico Dottato', 'Fico d\'India', 'Uva Italia', 'Uva Pizzutella', 'Uva Fragola', 'Banana Chiquita', 'Banana Platano (da cottura)', 'Mango Ready-to-eat', 'Avocado Hass', 'Avocado Fuerte', 'Ananas Del Monte', 'Papaya Formosa', 'Maracuja (Frutto della Passione)', 'Granadilla', 'Litchi', 'Dragon Fruit (Pitaya)', 'Alchechengi', 'Mango filippino', 'Frutto del Drago Rosso', 'Kumquat (Mandarino Cinese)', 'Lime Messicano', 'Limone di Sorrento IGP', 'Limone di Siracusa', 'Mandarino Tardivo di Ciaculli', 'Clementina di Calabria', 'Arancia Tarocco', 'Arancia Sanguinello', 'Arancia Navel', 'Pompelmo Giallo', 'Pompelmo Rosa', 'Bergamotto di Calabria', 'Cedro di Diamante', 'Chinotto Fresco',
    'Fragola della Basilicata', 'Fragolina di Bosco', 'Lampone Fresco', 'Mirtillo Nero', 'Mirtillo Rosso', 'Mora di Rovo', 'Ribes Rosso', 'Ribes Nero', 'Alkekengi', 'Ribes Bianco',
    'Pomodoro Ciliegino di Pachino', 'Pomodoro Datterino IGP', 'Pomodoro San Marzano DOP', 'Pomodoro Cuore di Bue', 'Pomodoro Costoluto', 'Pomodoro Camone', 'Pomodoro Giallo', 'Pomodoro Nero (Crimea)', 'Pomodoro Piccadilly', 'Sugo Pronto di Pomodoro',
    'Cipolla Rossa di Tropea', 'Cipolla Bianca di Margherita', 'Cipolla Borrettana', 'Cipolla Ramata di Montoro', 'Cipollotto Nocerino', 'Porro di Cervere', 'Scalogno di Romagna', 'Aglio di Voghiera', 'Aglio Nero (Fermentato)', 'Erba Cipollina Fresca',
    'Zucchina Romanesche (col fiore)', 'Zucchina Trombetta d\'Albenga', 'Melanzana Tonda Calvi', 'Peperone di Carmagnola', 'Peperino di Senise (Crusco)', 'Friggitello Napoletano', 'Pepe Verde Fresco', 'Cetriolo Carosello', 'Barattiere', 'Zucca Delica', 'Zucca Butternut (Violina)', 'Zucca Musquée de Provence',
    'Patata di Avezzano', 'Patata della Sila', 'Patata Dolce (Americana)', 'Patata Viola (Vitelotte)', 'Topinambur', 'Ravanello Rosso', 'Daikon (Rapa Bianca)', 'Barbabietola Rossa Cotta', 'Barbabietola Rossa Fresca', 'Pastinaca', 'Radice di loto', 'Sedano Rapa',
    'Carciofo Romanesco (Mammola)', 'Carciofo Spinoso di Sardegna', 'Carciofo di Paestum', 'Asparago Verde di Altedo', 'Asparago Bianco di Bassano', 'Asparago Selvatico', 'Broccolo Fiolaro', 'Cima di Rapa', 'Friariello Campano', 'Cavolo Nero Toscano', 'Cavolo Kale', 'Cavolo Pak Choi', 'Cavolo Cinese', 'Cavolo Cappuccio Viola', 'Cavolo di Bruxelles', 'Finocchio Maschio', 'Sedano Bianco di Sperlonga',
    'Lattuga Romana', 'Lattuga Gentilina', 'Insatala Salanova', 'Valeriana (Songino)', 'Misticanza di campo', 'Spinacio Baby (Novello)', 'Rucola della Piana del Sele', 'Radicchio Tardivo di Treviso', 'Radicchio di Castelfranco', 'Belga (Indivia)', 'Scarola Riccia', 'Escarola Liscia', 'Portulaca', 'Agretto (Barba di Frate)',
    'Fungo Cardoncello', 'Fungo Pleurotus', 'Fungo Pioppino', 'Fungo Shiitake Fresco', 'Tartufo Nero Estivo (Scorzone)', 'Tartufo Bianco d\'Alba', 'Prugnolo', 'Gallinaccio (Finferlo)',
    'Zenzero Fresco (Radice)', 'Curcuma Fresca', 'Rafano (Armoracia)', 'Wasabi Originale', 'Citronella (Lemongrass)'
  ]);

  addBaseIngredient(name: string) {
    const clean = name.trim();
    if (!clean) return;
    const current = this.baseIngredients();
    if (!current.some(i => i.toLowerCase() === clean.toLowerCase())) {
      const newList = [...current, clean].sort((a, b) => a.localeCompare(b));
      this.baseIngredients.set(newList);
      localStorage.setItem('haccp_base_ingredients', JSON.stringify(newList));
    }
  }

  private loadBaseIngredients() {
      const hardcodedDefaults = this.baseIngredients();
      const saved = localStorage.getItem('haccp_base_ingredients');
      if (saved) {
          try {
              const savedList = JSON.parse(saved);
              // Merge defaults with saved items, ensuring no duplicates
              const merged = [...new Set([...hardcodedDefaults, ...savedList])].sort((a, b) => a.localeCompare(b));
              this.baseIngredients.set(merged);
              console.log('[HACCP-STATE] Base Ingredients loaded and merged. Total:', merged.length);
          } catch(e) {
              console.error('Error parsing saved ingredients', e);
          }
      }
  }

  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(() => this.currentUser()?.role === 'ADMIN');

  // --- Navigation State ---
  readonly currentModuleId = signal<string>('dashboard');

  // --- Accounting / Payments State ---
  readonly payments = signal<Payment[]>([]);
  readonly journalEntries = signal<JournalEntry[]>([]);
  readonly reminders = signal<Reminder[]>([]);

  // --- Global Filter State ---
  readonly filterCollaboratorId = signal<string>(''); // '' means All
  readonly filterDate = signal<string>(new Date().toISOString().split('T')[0]); // Default Today
  readonly reportRecipientEmail = signal<string>('amministrazione@haccppro.it');

  // Filter state for firms/companies
  readonly filterClientId = signal<string | null>(null);

  // Automatically switches between logged operator or filter for administrator.
  readonly activeTargetClientId = computed(() => {
    const user = this.currentUser();
    const filterId = this.filterClientId();

    if (user?.role === 'ADMIN') {
      return filterId || user.clientId || 'demo';
    }

    // Role == COLLABORATOR
    return user?.clientId || 'demo';
  });

  // Returns list of unique brands for initial filtering
  readonly groupedViewClients = computed(() => {
    const all = this.clients();
    const seen = new Set<string>();
    const brands: ClientEntity[] = [];

    all.forEach(c => {
      // Identify brand by PIVA or base name before space
      const brandKey = c.piva || c.name.split(' ')[0].toLowerCase();
      if (!seen.has(brandKey)) {
        seen.add(brandKey);
        brands.push(c);
      }
    });
    return brands;
  });

  // Returns list of units belonging to the same brand as the selected filterClientId
  readonly activeBrandUnits = computed(() => {
    const all = this.clients();
    const filterId = this.filterClientId();
    if (!filterId) return [];

    const selected = all.find(c => c.id === filterId);
    if (!selected) return [];

    const brandKey = selected.piva || selected.name.split(' ')[0].toLowerCase();
    
    return all.filter(c => {
      const cKey = c.piva || c.name.split(' ')[0].toLowerCase();
      return cKey === brandKey;
    });
  });

  // Returns list of companies filtered if administrator has selection.
  readonly filteredClients = computed(() => {
    const clients = this.clients();
    const filterId = this.filterClientId();
    if (this.currentUser()?.role === 'ADMIN' && filterId) {
      return clients.filter(c => c.id === filterId);
    }
    return clients;
  });

  // Returns list of users filtered by the active company selection.
  readonly filteredSystemUsers = computed(() => {
    const users = this.systemUsers();
    const activeClientId = this.activeTargetClientId();
    if (this.isAdmin() && activeClientId) {
      return users.filter(u => u.clientId === activeClientId);
    }
    return users;
  });

  readonly currentLogo = computed(() => {
    if (this.isAdmin()) {
      return this.adminCompany().logo || '/logo.png';
    }
    return this.companyConfig().logo || '/logo.png';
  });

  // --- Admin Company / Master Data ---
  readonly adminCompany = signal<AdminCompany>({
    name: 'HACCP PRO - Sede Centrale',
    piva: '01234567890',
    address: 'Via dell\'Innovazione 10, Milano (MI)',
    phone: '02 99887766',
    cellphone: '333 1234567',
    whatsapp: '333 1234567',
    email: 'amministrazione@haccppro.it',
    pec: 'haccppro@legalmail.it',
    sdi: 'M5UXCR1',
    licenseNumber: 'HQ-RE-2024-001',
    logo: '/logo.png'
  });

  // Editing Permission Logic
  readonly isContextEditable = computed(() => {
    // If not admin (Operator via login), they can always edit their current view (which is their own)
    if (!this.isAdmin()) return true;

    const activeMod = this.currentModuleId();
    const menuItem = this.menuItems.find(m => m.id === activeMod);

    if (menuItem?.category === 'monitoring' || menuItem?.category === 'operations' || menuItem?.category === 'config' || menuItem?.category === 'documentation') {
      return true;
    }

    return false;
  });


  // Services
  private toastService = inject(ToastService);

  constructor() {
    this.loadState();
    this.initSupabase();
    this.loadBaseIngredients();

    // Auto-save State when critical data changes
    effect(() => {
      this.saveState();
    });
  }

  private saveState() {
    const state = {
      documents: this.documents(),
      selectedEquipment: this.selectedEquipment(),
      disabledDocs: this.disabledDocs(),
      checklistRecords: this.checklistRecords(),
      productionRecords: this.productionRecords(),
      messages: this.messages()
    };
    localStorage.setItem('haccp_pro_persistence', JSON.stringify(state));
  }

  private syncInterval: any;
  async initSupabase() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    
    await this.refreshAllData();

    // Comprehensive Real-time Subscriptions - Optimized for immediate sync
    // Ensure we only have one channel subscription
    supabase.removeAllChannels();

    supabase.channel('haccp-realtime-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => this.syncClients())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_records' }, (payload) => this.syncChecklistRecords())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => this.syncMessages())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_users' }, () => this.syncUsers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, (payload) => this.syncDocuments())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_records' }, () => this.syncProductionRecords())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'non_conformities' }, () => this.refreshAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment' }, () => this.syncEquipment())
      .subscribe((status) => {
          console.log('[HACCP-SYNC] Supabase Status:', status);
      });

    // Polling Fallback: Guaranteed background sync every 30s
    this.syncInterval = setInterval(() => {
        this.refreshAllData();
    }, 30000);
  }

  private handleEquipmentInsert(newEq: any) {
    this.selectedEquipment.update(list => {
        if (list.some(e => e.id === newEq.id)) return list; // Already added optimistically
        return [...list, {
            id: newEq.id,
            clientId: newEq.client_id,
            name: newEq.name,
            area: newEq.area,
            type: newEq.type
        }];
    });
  }

  private handleEquipmentUpdate(newEq: any) {
    this.selectedEquipment.update(list => list.map(e => e.id === newEq.id ? {
        id: newEq.id,
        clientId: newEq.client_id,
        name: newEq.name,
        area: newEq.area,
        type: newEq.type
    } : e));
  }

  private handleEquipmentDelete(id: string) {
    this.selectedEquipment.update(list => list.filter(e => e.id !== id));
  }

  private isRefreshingData = false;
  async refreshAllData() {
    if (this.isRefreshingData) return;
    this.isRefreshingData = true;

    try {
      // Must sync clients FIRST because other syncs depend on validClientIds filtering
      await this.syncClients();
      
      await Promise.all([
        this.syncUsers(),
        this.syncChecklistRecords(),
        this.syncProductionRecords(),
        this.syncDocuments(),
        this.syncEquipment(),
        this.syncMessages(),
        this.syncAccounting(),
        this.syncNonConformities(),
        this.syncRecipes(),
        this.syncConfig()
      ]);

      await this.syncSuspenseStatuses();
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      this.isRefreshingData = false;
    }
  }

  async syncClients() {
    const { data: dbClients } = await supabase.from('clients').select('*');
    if (dbClients) {
      this.clients.set(dbClients.map((c: any) => ({
        id: c.id,
        name: c.name,
        piva: c.piva,
        address: c.address,
        phone: c.phone,
        cellphone: c.cellphone,
        whatsapp: c.whatsapp,
        email: c.email,
        licenseNumber: c.license_number,
        suspended: c.suspended,
        paymentBalanceDue: !!c.payment_balance_due,
        licenseExpiryDate: c.license_expiry_date,
        logo: c.logo,
        printerModel: c.printer_model,
        labelFormat: c.label_format,
        printerDriverUrl: c.printer_driver_url
      })));
    }
  }

  async syncUsers() {
    const validClientIds = this.clients().map(c => c.id);
    const { data: dbUsers } = await supabase.from('system_users').select('*');
    if (dbUsers) {
      this.systemUsers.set(dbUsers
        .filter((u: any) => {
          const isDemo = u.name.toLowerCase().includes('demo') || u.name.toLowerCase().includes('sviluppatore');
          const isOrphaned = u.role !== 'ADMIN' && !validClientIds.includes(u.client_id);
          return !isDemo && !isOrphaned;
        })
        .map((u: any) => ({
          id: u.id,
          clientId: u.client_id,
          name: u.name,
          email: u.email,
          role: u.role,
          department: u.department,
          active: u.active,
          avatar: u.avatar,
          initials: this.generateInitials(u.name),
          username: u.username,
          password: u.password
        })));
    }
  }

  async syncChecklistRecords() {
    const validClientIds = this.clients().map(c => c.id);
    const { data: dbRecords } = await supabase.from('checklist_records').select('*');
    if (dbRecords) {
      this.checklistRecords.set(dbRecords
        .filter((r: any) => r.client_id === 'demo' || validClientIds.includes(r.client_id))
        .map((r: any) => ({
          id: r.id,
          moduleId: r.module_id,
          userId: r.user_id,
          clientId: r.client_id,
          date: r.date,
          data: r.data,
          timestamp: r.timestamp
        })));
    }
  }

  async syncDocuments() {
    const validClientIds = this.clients().map(c => c.id);
    const { data: dbDocs } = await supabase
      .from('documents')
      .select('*')
      .order('upload_date', { ascending: false });

    if (dbDocs) {
      this.documents.set(dbDocs
        .filter((d: any) => d.client_id === 'demo' || validClientIds.includes(d.client_id))
        .map((d: any) => ({
          id: d.id,
          clientId: d.client_id,
          category: d.category,
          type: d.type,
          fileName: d.file_name,
          fileType: d.file_type,
          fileData: d.file_data,
          uploadDate: new Date(d.upload_date),
          expiryDate: d.expiry_date,
          userId: d.user_id
        })));
    }
  }

  async syncProductionRecords() {
    const validClientIds = this.clients().map(c => c.id);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateLimit = thirtyDaysAgo.toISOString().split('T')[0];

    const { data: dbProdRecords } = await supabase.from('production_records').select('*');
    if (dbProdRecords) {
      this.productionRecords.set(dbProdRecords
        .filter((r: any) => (r.client_id === 'demo' || validClientIds.includes(r.client_id)) && r.recorded_date >= dateLimit)
        .map((r: any) => ({
          id: r.id,
          recordedDate: r.recorded_date,
          mainProductName: r.main_product_name,
          packagingDate: r.packaging_date,
          expiryDate: r.expiry_date,
          lotto: r.lotto,
          ingredients: r.ingredients || [],
          userId: r.user_id,
          clientId: r.client_id
        })));
    }
  }

  async syncEquipment() {
     const { data: equip } = await supabase.from('equipment').select('*');
     if (equip) {
       this.selectedEquipment.set(equip.map((e: any) => ({
         id: e.id,
         clientId: e.client_id,
         name: e.name,
         area: e.area,
         type: e.type
       })));
     }
  }

  async syncMessages() {
    try {
      const { data: dbMsgs, error: msgsError } = await supabase
        .from('messages')
        .select('*')
        .order('timestamp', { ascending: false });

      if (msgsError) throw msgsError;

      if (dbMsgs) {
        const mappedMsgs = dbMsgs.map((m: any) => ({
          id: m.id,
          senderId: m.senderId || m.sender_id,
          senderName: m.senderName || m.sender_name,
          recipientType: m.recipientType || m.recipient_type,
          recipientId: m.recipientId || m.recipient_id,
          recipientUserId: m.recipientUserId || m.recipient_user_id,
          subject: m.subject,
          content: m.content,
          attachmentUrl: m.attachmentUrl || m.attachment_url,
          attachmentName: m.attachmentName || m.attachment_name,
          fileData: m.fileData || m.file_data,
          timestamp: new Date(m.timestamp),
          read: m.read,
          replies: (m.replies || []).map((r: any) => ({
            id: r.id,
            senderId: r.senderId || r.sender_id,
            senderName: r.senderName || r.sender_name,
            content: r.content,
            timestamp: new Date(r.timestamp)
          }))
        }));
        this.messages.set(mappedMsgs);
      }
    } catch (e) {
      console.error('Error syncing messages:', e);
    }
  }
  async syncAccounting() {
    // Payments
    const { data: payData } = await supabase.from('accounting_payments').select('*');
    if (payData) {
      this.payments.set(payData.map((p: any) => ({
        id: p.id,
        clientId: p.client_id,
        amount: parseFloat(p.amount) || 0,
        frequency: p.frequency,
        dueDate: p.due_date,
        status: p.status,
        paidDate: p.paid_date,
        notes: p.notes
      })));
    }

    // Journal
    const { data: journalData } = await supabase.from('journal_entries').select('*');
    if (journalData) {
      this.journalEntries.set(journalData.map((j: any) => ({
        id: j.id,
        clientId: j.client_id,
        date: j.date,
        description: j.description,
        debit: parseFloat(j.debit) || 0,
        credit: parseFloat(j.credit) || 0,
        category: j.category
      })));
    }

    // Reminders
    const { data: reminderData } = await supabase.from('accounting_reminders').select('*');
    if (reminderData) {
      this.reminders.set(reminderData.map((r: any) => ({
        id: r.id,
        clientId: r.client_id,
        type: r.type,
        message: r.message,
        dueDate: r.due_date,
        priority: r.priority,
        dismissed: !!r.dismissed
      })));
    }
  }

  async syncConfig() {
    const { data: config } = await supabase.from('system_config').select('*').eq('id', 'master').single();
    if (config) {
      if (config.report_email) this.reportRecipientEmail.set(config.report_email);
      if (config.master_data) this.adminCompany.set(config.master_data);
    }
  }

  async syncNonConformities() {
    const { data: ncData } = await supabase.from('non_conformities').select('*').order('created_at', { ascending: false });
    if (ncData) {
      this.nonConformities.set(ncData.map((nc: any) => ({
        id: nc.id,
        clientId: nc.client_id,
        moduleId: nc.module_id,
        date: nc.date,
        description: nc.description,
        itemName: nc.item_name,
        responsibleId: nc.responsible_id,
        status: nc.status || 'OPEN',
        createdAt: nc.created_at ? new Date(nc.created_at) : undefined
      })));
    }
  }

  async syncRecipes() {
    const { data: recipeData } = await supabase.from('ingredients_book').select('*');
    if (recipeData) {
      this.recipes.set(recipeData.map((r: any) => ({
        id: r.id,
        clientId: r.client_id,
        name: r.name,
        category: r.category,
        description: r.description,
        ingredients: r.ingredients || [],
        createdAt: new Date(r.created_at || r.updated_at),
        updatedAt: new Date(r.updated_at)
      })));
    }
  }

  /**
   * Automates the suspension and reactivation of clients based on payment regularity.
   * Rules: 
   * - Overdue > 5 days: SUSPEND
   * - All settled: REACTIVATE
   */
  private async syncSuspenseStatuses() {
    const clients = this.clients();
    const payments = this.payments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const client of clients) {
      // Skip internal demo context
      if (client.id === 'demo' || client.name.toLowerCase().includes('demo')) continue;

      // Check for any "blocking debt": not paid and past due date by more than 5 days
      const hasBlockingDebt = payments.some(p => {
        if (p.clientId !== client.id || p.status === 'paid') return false;
        
        const dueDate = new Date(p.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        const diffTime = today.getTime() - dueDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays > 5;
      });

      // Update if state changes
      if (client.suspended !== hasBlockingDebt) {
        console.log(`[HACCP-PRO] Auto-suspense change for ${client.name}: ${hasBlockingDebt}`);
        // We call updateClient directly which handles DB sync
        await this.updateClient(client.id, { suspended: hasBlockingDebt });
      }
    }
  }

  private loadState() {
    const saved = localStorage.getItem('haccp_pro_persistence');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.documents) this.documents.set(data.documents);
        if (data.selectedEquipment) this.selectedEquipment.set(data.selectedEquipment);
        if (data.disabledDocs) this.disabledDocs.set(data.disabledDocs);
        if (data.checklistRecords) {
          // Restore dates correctly
          const restoredRecords = data.checklistRecords.map((r: any) => ({
            ...r,
            timestamp: new Date(r.timestamp)
          }));
          this.checklistRecords.set(restoredRecords);
        }
        if (data.productionRecords) this.productionRecords.set(data.productionRecords);
        if (data.messages) {
          this.messages.set(data.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          })));
        }
      } catch (e) {
        console.error('Failed to load local state', e);
      }
    }
  }

  // --- Data Store (Mock Database) ---
  // Stores all checks from all users
  readonly checklistRecords = signal<{
    id: string;
    moduleId: string;
    userId: string;
    clientId: string;
    date: string;
    data: any;
    timestamp: any;
  }[]>([]);

  readonly recipes = signal<Recipe[]>([]);
  readonly filteredRecipes = computed(() => {
    const targetClientId = this.activeTargetClientId();
    return this.recipes().filter(r => r.clientId === targetClientId);
  });

  readonly documents = signal<AppDocument[]>([]);
  readonly disabledDocs = signal<Record<string, boolean>>({}); // Map doc ID to disabled boolean
  readonly selectedEquipment = signal<{ id: string; name: string; area: string; type?: string }[]>([]);
  readonly groupedEquipment = computed(() => {
    const targetClientId = this.activeTargetClientId();
    const all = this.selectedEquipment();
    
    // Debug log for troubleshooting immediately in browser console
    if (this.isAdmin()) {
        console.log('[HACCP] Current Filter:', targetClientId, 'Total Equipment:', all.length);
    }

    return all.filter(e => {
        const cid = (e as any).client_id || (e as any).clientId;
        return String(cid) === String(targetClientId);
    });
  });
  readonly productionRecords = signal<ProductionRecord[]>([]);
  readonly nonConformities = signal<{
    id: string;
    clientId: string;
    moduleId: string;
    date: string;
    description: string;
    itemName?: string;
    responsibleId?: string;
    status: 'OPEN' | 'CLOSED' | 'IN_PROGRESS';
    createdAt?: Date;
  }[]>([]);

  readonly filteredNonConformities = computed(() => {
    const targetClientId = this.activeTargetClientId();
    return this.nonConformities()
      .filter(nc => nc.clientId === targetClientId || !targetClientId)
      .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
  });

  // Global Filtered Documents for Admin View
  readonly filteredDocuments = computed(() => {
    const user = this.currentUser();
    const targetClientId = this.activeTargetClientId();
    if (!targetClientId) return [];

    const allClients = this.clients();
    const target = allClients.find(c => c.id === targetClientId);
    if (!target) return this.documents().filter(d => d.clientId === targetClientId && d.category !== 'microbio');

    // Group by Brand (PIVA or name prefix)
    const brandKey = target.piva || target.name.split(' ')[0].toLowerCase();
    const brandUnitIds = allClients
      .filter(c => {
        const cKey = c.piva || c.name.split(' ')[0].toLowerCase();
        return cKey === brandKey;
      })
      .map(c => c.id);

    return this.documents()
      .filter(d => brandUnitIds.includes(d.clientId))
      .filter(d => d.category !== 'microbio'); // Keep separated from general archive
  });

  readonly microbioDocuments = computed(() => {
    const targetClientId = this.activeTargetClientId();
    if (!targetClientId) return [];
    
    return this.documents().filter(d => d.clientId === targetClientId && d.category === 'microbio');
  });

  // Global Filtered Checklists for Admin View
  readonly filteredChecklistRecords = computed(() => {
    const targetClientId = this.activeTargetClientId();
    if (!targetClientId) return [];

    return this.checklistRecords().filter(r => r.clientId === targetClientId);
  });

  getEquipmentIcon(name: string): string {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('congelatore')) return 'fa-icicles';
    if (nameLower.includes('pozzetto')) return 'fa-box-archive';
    if (nameLower.includes('frigo') || nameLower.includes('cella') || nameLower.includes('snowflake')) return 'fa-snowflake';
    if (nameLower.includes('piano cottura') || nameLower.includes('forno') || nameLower.includes('griglie') || nameLower.includes('fuochi') || nameLower.includes('friggitrice')) return 'fa-fire';
    if (nameLower.includes('lavello') || nameLower.includes('lavastoviglie')) return 'fa-sink';
    if (nameLower.includes('cappa')) return 'fa-fan';
    if (nameLower.includes('tavolo') || nameLower.includes('piano lavoro')) return 'fa-table';
    if (nameLower.includes('affettatrice')) return 'fa-shredder'; // or fa-circle-notch
    if (nameLower.includes('bilancia')) return 'fa-weight-hanging';
    return 'fa-microchip';
  }

  // --- Clients / Companies Database (New) ---
  readonly clients = signal<ClientEntity[]>([]);

  // --- System Users State ---
  readonly systemUsers = signal<SystemUser[]>([]);

  // --- Current Active Company Config ---
  // Automatically follows the activeTargetClientId (global Firm filter for Admin)
  readonly companyConfig = computed<ClientEntity>(() => {
    const targetId = this.activeTargetClientId();
    const allClients = this.clients();
    
    const found = allClients.find(c => c.id === targetId);
    if (found) return found;

    // Fallback/Default
    return allClients[0] || {
      id: 'demo',
      name: 'Demo Company S.r.l.',
      piva: '00000000000',
      address: 'Via Demo 1',
      phone: '',
      email: '',
      licenseNumber: '',
      suspended: false,
      paymentBalanceDue: false
    };
  });

  // --- Current Active Editing Session ---
  readonly recordToEdit = signal<any>(null);

  // --- Messages Database ---
  readonly messages = signal<Message[]>([]);

  readonly unreadMessagesCount = computed(() => {
    const user = this.currentUser();
    if (!user) return 0;

    return this.messages().filter(msg => {
      // Admin sees all messages
      if (user.role === 'ADMIN') {
        return !msg.read && msg.senderId !== user.id;
      }
      // Collaborator sees messages for their company or broadcast
      return !msg.read &&
        msg.senderId !== user.id &&
        (msg.recipientType === 'ALL' ||
          (msg.recipientId === user.clientId && (!msg.recipientUserId || msg.recipientUserId === user.id)));
    }).length;
  });

  // --- New: Operational Phases Configuration ---
  readonly operationalPhasesConfig = computed(() => {
    const targetClientId = this.activeTargetClientId();
    const records = this.checklistRecords().filter(r => 
        r.moduleId === 'operative-phases-config' && 
        r.clientId === targetClientId
    );
    
    // Default: all enabled
    if (records.length === 0) {
      return { 
        'pre-op-checklist': { enabled: true, activities: {} }, 
        'operative-checklist': { enabled: true, activities: {} }, 
        'post-op-checklist': { enabled: true, activities: {} }
      };
    }

    return records[0].data;
  });

  isActivityEnabled(moduleId: string, activityId: string): boolean {
    const config = this.operationalPhasesConfig();
    const modConfig = config[moduleId];
    if (!modConfig) return true;
    if (modConfig.enabled === false) return false;
    if (modConfig.activities && modConfig.activities[activityId] === false) return false;
    return true;
  }

  async updateOperationalPhases(config: any) {
    const targetClientId = this.activeTargetClientId();
    await this.saveChecklist({
      moduleId: 'operative-phases-config',
      clientId: targetClientId,
      data: config
    });
  }

  // --- Menu Definitions ---
  readonly menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie', category: 'dashboard', adminOnly: true },
    { id: 'operator-dashboard', label: 'Dashboard', icon: 'fa-chart-pie', category: 'dashboard', operatorOnly: true },
    { id: 'general-checks', label: 'Controlli Generali', icon: 'fa-list-check', category: 'dashboard', adminOnly: true },

    // --- ARCHIVIO DOCUMENTALE ---
    { id: 'documentation', label: 'Archivio Documentale', icon: 'fa-folder-tree', category: 'documentation' },
    { id: 'micro-bio', label: 'Analisi Microbiologiche', icon: 'fa-vial-virus', category: 'documentation' },

    // --- REGISTRI E FASI OPERATIVE ---
    { id: 'pre-op-checklist', label: 'Fase Pre-operativa', icon: 'fa-clipboard-check', category: 'operations', operatorOnly: true },
    { id: 'operative-checklist', label: 'Fase Operativa', icon: 'fa-briefcase', category: 'operations', operatorOnly: true },
    { id: 'production-log', label: 'Rintracciabilità Prodotti', icon: 'fa-barcode', category: 'operations' },
    { id: 'post-op-checklist', label: 'Fase Post-operativa', icon: 'fa-hourglass-end', category: 'operations', operatorOnly: true },
    { id: 'non-compliance', label: 'Non Conformità', icon: 'fa-circle-exclamation', category: 'operations', operatorOnly: true },

    // --- PRODUZIONE ---
    { id: 'ingredients-book', label: 'Libro Ingredienti', icon: 'fa-book-open', category: 'production' },


    // --- CONSUMABILI E MESSAGGI ---
    { id: 'messages', label: 'Messaggistica', icon: 'fa-comments', category: 'communication', adminOnly: false },

    // Config
    { id: 'equipment-census', label: 'Censimento Attrezzature', icon: 'fa-microchip', category: 'config', adminOnly: true },
    { id: 'operative-phases-config', label: 'Gestione Fasi Operative', icon: 'fa-toggle-on', category: 'config', adminOnly: true },

    { id: 'suppliers', label: 'Anagrafica Fornitori', icon: 'fa-truck-field', category: 'config', operatorOnly: true },

    { id: 'collaborators', label: 'Gestioni Aziende', icon: 'fa-users-gear', category: 'config', adminOnly: true },
    { id: 'accounting', label: 'Contabilità', icon: 'fa-calculator', category: 'config', adminOnly: true },
    { id: 'settings', label: 'Impostazioni Sistema', icon: 'fa-gears', category: 'config', adminOnly: false }
  ];

  loginWithCredentials(username: string, pass: string): boolean {
    // Master Admin Access (Only via dev/dev)
    if (username === 'dev' && pass === 'dev') {
      this.currentUser.set({
        id: 'dev-admin',
        name: this.adminCompany().name,
        role: 'ADMIN',
        avatar: this.adminCompany().logo || '',
        initials: 'Adm',
        clientId: 'demo' // Default to demo context
      });
      this.currentModuleId.set('dashboard');
      return true;
    }

    // Standard User Access (Collaborators only)
    const user = this.systemUsers().find(u => u.username === username && u.password === pass && u.active);

    if (user) {
      // BLOCK: Admins cannot log in through this standard path
      if (user.role === 'ADMIN') {
        this.toastService.error(
          'Accesso Negato',
          'L\'account amministratore non è accessibile con queste credenziali.'
        );
        return false;
      }

      // Check if user's company is suspended
      const userClient = this.clients().find(c => c.id === user.clientId);
      if (userClient?.suspended) {
        this.toastService.error(
          'Accesso Negato',
          'Servizio sospeso per mancato pagamento. Contattare l\'amministrazione.'
        );
        return false;
      }

      this.loginAsUser(user);
      return true;
    }
    return false;
  }

  loginAsUser(user: SystemUser) {
    if (user.active) {
      this.currentUser.set({
        id: user.id,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        clientId: user.clientId,
        department: user.department
      });

      // Determine company config (Admin -> First or demo, Collab -> Their Client)
      // companyConfig is now computed and will follow automatically
      // The computed signal `companyConfig` will automatically react to changes in `activeTargetClientId` and `clients`.
      // No manual setting needed here.

      this.currentModuleId.set(user.role === 'ADMIN' ? 'dashboard' : 'operator-dashboard');
    }
  }

  login(role: UserRole) {
    if (role === 'ADMIN') {
      const adminUser = this.systemUsers().find(u => u.role === 'ADMIN');
      if (adminUser) {
        this.currentUser.set({ id: adminUser.id, name: adminUser.name, role: 'ADMIN', avatar: adminUser.avatar, clientId: adminUser.clientId });
        // companyConfig is now computed
      }
    } else {
      // Login as the first active collaborator found for demo
      const collabUser = this.systemUsers().find(u => u.role === 'COLLABORATOR' && u.active);
      if (collabUser) {
        this.currentUser.set({
          id: collabUser.id,
          name: collabUser.name,
          role: 'COLLABORATOR',
          avatar: collabUser.avatar,
          clientId: collabUser.clientId,
          department: collabUser.department
        });
        // companyConfig is now computed
      }
    }
    this.currentModuleId.set(role === 'ADMIN' ? 'dashboard' : 'operator-dashboard');
  }

  logout() {
    this.currentUser.set(null);
    this.currentModuleId.set('dashboard');
    this.filterCollaboratorId.set('');
    this.filterDate.set(new Date().toISOString().split('T')[0]);
  }

  setModule(id: string) {
    this.currentModuleId.set(id);
  }

  setCollaboratorFilter(id: string) {
    this.filterCollaboratorId.set(id);
  }

  setClientIdFilter(id: string | null) {
    this.filterClientId.set(id);
    // When changing company, reset the collaborator/unit filter
    this.filterCollaboratorId.set('');
  }

  setDateFilter(date: string) {
    this.filterDate.set(date);
  }

  async setReportRecipientEmail(email: string) {
    this.reportRecipientEmail.set(email);
    const { error } = await supabase.from('system_config').upsert({ 
      id: 'master', 
      report_email: email,
      master_data: this.adminCompany() 
    });
    if (!error) {
      this.toastService.success('Indirizzo Aggiornato', `Il nuovo indirizzo per i report è: ${email}`);
    } else {
      console.error('Error syncing report email:', error);
      this.toastService.error('Errore Sync', 'Impossibile salvare l\'email nel database.');
    }
  }

  async updateAdminCompany(data: AdminCompany) {
    this.adminCompany.set(data);
    const { error } = await supabase.from('system_config').upsert({ 
      id: 'master', 
      master_data: data,
      report_email: this.reportRecipientEmail()
    });
    if (!error) {
      this.toastService.success('Anagrafica Salvata', 'I dati dell\'azienda amministratore sono stati aggiornati.');
    } else {
      console.error('Error syncing admin company:', error);
      this.toastService.error('Errore Sync', 'Impossibile salvare i dati aziendali nel database.');
    }
  }

  // --- Data Access Methods ---

  saveChecklist(moduleIdOrObj: string | any, data?: any) {
    const user = this.currentUser();
    if (!user) return;

    let moduleId: string;
    let actualData: any;
    let forcedId: string | undefined;
    let forcedDate: string | undefined;

    if (typeof moduleIdOrObj === 'object' && moduleIdOrObj !== null && !data) {
      moduleId = moduleIdOrObj.moduleId;
      actualData = moduleIdOrObj.data;
      forcedId = moduleIdOrObj.id;
      forcedDate = moduleIdOrObj.date;
    } else {
      moduleId = moduleIdOrObj;
      actualData = data;
    }

    // Determine target company context
    const targetClientId = this.activeTargetClientId();
    
    // Determine the specific user identity (if admin is recording on behalf of a collaborator)
    const targetUserId = (this.isAdmin() && this.filterCollaboratorId()) 
      ? this.filterCollaboratorId() 
      : user.id;

    const record = {
      id: forcedId || Math.random().toString(36).substring(2, 9),
      userId: targetUserId,
      clientId: targetClientId || user.clientId || 'demo',
      moduleId,
      date: forcedDate || this.filterDate(),
      timestamp: new Date().toISOString(),
      data: actualData
    };

    // Logic to prevent duplicates and ensure updates
    const existingIndex = this.checklistRecords().findIndex(r => 
      r.moduleId === moduleId && r.userId === targetUserId && (r as any).date === record.date
    );

    if (existingIndex > -1) {
      record.id = this.checklistRecords()[existingIndex].id;
    }

    this.checklistRecords.update(records => {
      const filtered = records.filter(r => r.id !== record.id);
      return [...filtered, record as any];
    });

    // Supabase Sync
    supabase.from('checklist_records').upsert({
      id: record.id,
      user_id: record.userId,
      client_id: record.clientId,
      module_id: record.moduleId,
      date: record.date,
      timestamp: record.timestamp,
      data: record.data
    }).then(({ error }) => {
        if (error) console.error('Error syncing checklist record:', error);
    });

    this.toastService.success('Registrazione Salvata', 'I dati sono stati archiviati correttamente.');

    // Feed to Operator if Admin is editing
    if (this.isAdmin() && this.filterCollaboratorId()) {
      const targetUser = this.systemUsers().find(u => u.id === targetUserId);
      const menuItem = this.menuItems.find(m => m.id === moduleId);

      this.toastService.success(
        'Feedback Inviato',
        `Le modifiche al modulo "${menuItem?.label}" sono state salvate e notificate a ${targetUser?.name}.`
      );

      // Optionally we could add a system message to their chat
      this.addMessage({
        id: Date.now().toString(),
        senderId: user.id,
        senderName: 'Amministrazione (Revisione)',
        recipientType: 'SINGLE',
        recipientId: targetUser?.clientId,
        recipientUserId: targetUserId,
        subject: `Aggiornamento: ${menuItem?.label}`,
        content: `L'amministratore ha revisionato e aggiornato i dati inseriti in data ${record.date} per il modulo ${menuItem?.label}.`,
        timestamp: new Date(),
        read: false,
        replies: []
      });
    }
  }

  saveRecord(moduleId: string, data: any) {
    return this.saveChecklist(moduleId, data);
  }

  // --- New Historical Methods ---

  saveChecklistOld(record: { id?: string, moduleId: string, data: any, date?: string }) {
    const user = this.currentUser();
    if (!user) return;

    const recordId = record.id || Math.random().toString(36).substr(2, 9);
    const date = record.date || new Date().toISOString().split('T')[0]; // Use provided date or today (not filterDate necessarily)

    const newEntry = {
      id: recordId,
      moduleId: record.moduleId,
      userId: user.id,
      clientId: user.clientId || 'demo',
      date: date,
      data: record.data,
      timestamp: new Date()
    };

    this.checklistRecords.update(records => {
      const others = records.filter(r => r.id !== recordId);
      return [newEntry, ...others];
    });
  }

  deleteChecklist(id: string) {
    this.checklistRecords.update(records => records.filter(r => r.id !== id));
    this.toastService.success('Record Eliminato', 'La registrazione è stata rimossa.');
  }

  getChecklistHistory(moduleId: string) {
    const targetClientId = this.activeTargetClientId();
    if (!targetClientId) return [];

    return this.checklistRecords()
      .filter(r => r.moduleId === moduleId && r.clientId === targetClientId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getRecord(moduleId: string) {
    // Determine context
    let targetUserId = this.currentUser()?.id;
    const targetDate = this.filterDate();

    if (this.isAdmin() && this.filterCollaboratorId()) {
      targetUserId = this.filterCollaboratorId();
    }

    // If admin has NO filter selected, maybe show nothing or aggregate?
    // User requested: "selezionando ... un collaboratore e la data ... mi deve apparire"
    // So if no collaborator is selected, we might return null or empty to indicate "Select a user".
    // Or we return the Admin's own data (if they want to do checks). 
    // Let's default to Admin's own data if no filter, OR if admin wants to see "All" that's harder for a Detail view.
    // For now, simple: returns record for targetUserId + targetDate

    if (!targetUserId) return null;

    return this.checklistRecords().find(r =>
      r.moduleId === moduleId && r.userId === targetUserId && r.date === targetDate
    )?.data || null;
  }

  // --- Client/Company Management Methods ---

  async addClient(client: Omit<ClientEntity, 'id'>) {
    const existing = this.clients().find(c => c.name.toLowerCase() === client.name.toLowerCase());
    if (existing) {
      this.toastService.warning(
        'Nome Già In Uso',
        `Esiste già un'azienda con il nome "${client.name}". Per favore, scegli un nome differente o aggiungi un riferimento per distinguerla (es. sede, città).`
      );
      return;
    }

    const newClient = { ...client, id: Math.random().toString(36).substr(2, 9) };
    console.log('[HACCP] Attempting to create new client:', newClient);
    this.clients.update(c => [...c, newClient]);
      const { error } = await supabase.from('clients').insert({
      id: newClient.id,
      name: newClient.name,
      piva: newClient.piva,
      address: newClient.address,
      phone: newClient.phone,
      cellphone: (newClient as any).cellphone,
      whatsapp: (newClient as any).whatsapp,
      email: newClient.email,
      license_number: newClient.licenseNumber,
      suspended: newClient.suspended,
      payment_balance_due: false,
      license_expiry_date: newClient.licenseExpiryDate,
      logo: newClient.logo,
      printer_model: newClient.printerModel,
      label_format: newClient.labelFormat,
      printer_driver_url: newClient.printerDriverUrl
    });

    if (!error) {
      this.toastService.success('Azienda Registrata', `${newClient.name} è stata aggiunta correttamente.`);
    } else {
      console.error('Error adding client:', error);
      this.toastService.error('Errore', 'Impossibile salvare l\'azienda sul database.');
    }
  }

  async deleteClient(id: string) {
    const client = this.clients().find(c => c.id === id);
    if (!client) return;

    // 1. Get all user IDs to clean up user-related records (like messages)
    const userIds = this.systemUsers()
      .filter(u => u.clientId === id)
      .map(u => u.id);

    // 2. Optimistic local update immediately (UI responds at once)
    this.clients.update(list => list.filter(c => c.id !== id));
    this.systemUsers.update(list => list.filter(u => u.clientId !== id));
    this.selectedEquipment.update(list => list.filter((e: any) => {
      const cid = e.client_id || e.clientId;
      return cid !== id;
    }));
    this.checklistRecords.update(list => list.filter(r => r.clientId !== id));
    this.documents.update(list => list.filter(d => d.clientId !== id));
    this.productionRecords.update(list => list.filter(p => (p as any).client_id !== id && (p as any).clientId !== id));
    this.payments.update(list => list.filter(p => p.clientId !== id));
    this.journalEntries.update(list => list.filter(j => j.clientId !== id));
    this.reminders.update(list => list.filter(r => r.clientId !== id));
    this.nonConformities.update(list => list.filter(nc => nc.clientId !== id));
    this.messages.update(list => list.filter(m => 
      m.recipientId !== id && !userIds.includes(m.senderId)
    ));

    // Reset filter if we deleted the selected client
    if (this.filterClientId() === id) {
      this.filterClientId.set(null);
    }

    try {
      console.log(`Starting full cleanup for client: ${id} (${client.name})`);
      
      // 3. Cascade delete in Supabase (order matters for FK constraints)
      // Delete child records from all dependent tables first
      
      const tablesToDelete = [
        { name: 'checklist_records', col: 'client_id' },
        { name: 'equipment', col: 'client_id' },
        { name: 'documents', col: 'client_id' },
        { name: 'production_records', col: 'client_id' },
        { name: 'accounting_payments', col: 'client_id' },
        { name: 'journal_entries', col: 'client_id' },
        { name: 'accounting_reminders', col: 'client_id' },
        { name: 'non_conformities', col: 'client_id' }
      ];

      for (const table of tablesToDelete) {
        console.log(`Deleting from ${table.name}...`);
        const { error: tableError } = await supabase.from(table.name).delete().eq(table.col, id);
        if (tableError) {
          console.error(`Error deleting from ${table.name}:`, tableError);
          throw new Error(`Errore durante la pulizia di ${table.name}: ${tableError.message}`);
        }
      }
      
      // Cleanup messages related to the client or its users
      console.log('Cleaning up messages...');
      await supabase.from('messages').delete().eq('recipient_id', id);
      if (userIds.length > 0) {
        await supabase.from('messages').delete().in('sender_id', userIds);
        await supabase.from('messages').delete().in('recipient_user_id', userIds);
      }

      // Now delete system users (depends on messages being gone)
      console.log('Deleting system users...');
      const { error: userError } = await supabase.from('system_users').delete().eq('client_id', id);
      if (userError) throw new Error(`Errore durante l'eliminazione dei collaboratori: ${userError.message}`);
      
      // Finally delete the client themselves
      console.log('Deleting primary client record...');
      const { error: clientError } = await supabase.from('clients').delete().eq('id', id);

      if (clientError) throw clientError;

      this.toastService.success('Azienda Eliminata', `"${client.name}" è stata rimossa definitivamente.`);
    } catch (e: any) {
      // Rollback: re-fetch from DB to restore consistent state
      console.error('Critical failure during client deletion:', e);
      this.toastService.error('Errore Eliminazione', 
        e.message || 'Impossibile eliminare l\'azienda. Alcuni dati potrebbero essere protetti o in uso.');
      
      // Attempt to restore state
      await this.refreshAllData();
    }
  }

  async updateClient(id: string, updates: Partial<ClientEntity>) {
    this.clients.update(clients =>
      clients.map(c => c.id === id ? { ...c, ...updates } : c)
    );
    // Sync with Supabase
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.piva !== undefined) dbUpdates.piva = updates.piva;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.cellphone !== undefined) dbUpdates.cellphone = updates.cellphone;
    if (updates.whatsapp !== undefined) dbUpdates.whatsapp = updates.whatsapp;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.licenseNumber !== undefined) dbUpdates.license_number = updates.licenseNumber;
    if (updates.suspended !== undefined) dbUpdates.suspended = updates.suspended;
    if (updates.paymentBalanceDue !== undefined) dbUpdates.payment_balance_due = updates.paymentBalanceDue;
    if (updates.licenseExpiryDate !== undefined) dbUpdates.license_expiry_date = updates.licenseExpiryDate;
    if (updates.logo !== undefined) dbUpdates.logo = updates.logo;
    if (updates.printerModel !== undefined) dbUpdates.printer_model = updates.printerModel;
    if (updates.labelFormat !== undefined) dbUpdates.label_format = updates.labelFormat;
    if (updates.printerDriverUrl !== undefined) dbUpdates.printer_driver_url = updates.printerDriverUrl;

    const { error } = await supabase.from('clients').update(dbUpdates).eq('id', id);
    if (error) {
      console.error('Error updating client:', error);
      this.toastService.error('Errore Sync', 'Impossibile aggiornare i dati nel database.');
    }
  }

  // Toggle company suspension (for non-payment)
  toggleClientSuspension(id: string, suspended: boolean) {
    this.updateClient(id, { suspended });

    // If reactivating, ensure at least one user is active
    if (!suspended) {
      const clientUsers = this.systemUsers().filter(u => u.clientId === id);
      if (clientUsers.length > 0 && clientUsers.every(u => !u.active)) {
        // Reactivate first user to allow access
        this.updateSystemUser(clientUsers[0].id, { active: true });
      }
    }
  }

  // Auto-suspend company if all users are disabled
  checkAutoSuspendClient(clientId: string) {
    const clientUsers = this.systemUsers().filter(u => u.clientId === clientId && u.role !== 'ADMIN');

    // If all operational users are inactive, auto-suspend the company
    if (clientUsers.length > 0 && clientUsers.every(u => !u.active)) {
      this.updateClient(clientId, { suspended: true });
    }
  }

  // --- User Management Methods ---

  async addSystemUser(user: Omit<SystemUser, 'id' | 'avatar'>) {
    const newUser: SystemUser = {
      ...user,
      id: Math.random().toString(36).substr(2, 9),
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff`
    };
    
    this.systemUsers.update(users => [...users, newUser]);
    
    const { error } = await supabase.from('system_users').insert({
      id: newUser.id,
      client_id: newUser.clientId,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      department: newUser.department,
      active: newUser.active,
      avatar: newUser.avatar,
      username: newUser.username,
      password: newUser.password
    });
    
    if (!error) {
      this.toastService.success('Unità Creata', `L'unità operativa ${newUser.name} è stata registrata.`);
    } else {
      console.error('Error adding user:', error);
      this.toastService.error('Errore', 'Impossibile salvare il collaboratore sul database.');
    }
  }

  async updateSystemUser(id: string, updates: Partial<SystemUser>) {
    this.systemUsers.update(users =>
      users.map(u => u.id === id ? { ...u, ...updates } : u)
    );

    const { error } = await supabase.from('system_users').update(updates).eq('id', id);

    // Auto-suspend company if all users are now disabled
    if (updates.active === false) {
      const user = this.systemUsers().find(u => u.id === id);
      if (user?.clientId) {
        this.checkAutoSuspendClient(user.clientId);
      }
    }

    if (!error) {
      this.toastService.success('Aggiornato', 'I dati del collaboratore sono stati salvati.');
    }
  }

  async deleteSystemUser(id: string) {
    const user = this.systemUsers().find(u => u.id === id);
    if (!user) return;

    this.systemUsers.update(users => users.filter(u => u.id !== id));
    const { error } = await supabase.from('system_users').delete().eq('id', id);
    
    if (!error) {
      this.toastService.success('Eliminato', 'Il collaboratore è stato rimosso correttamente.');
    } else {
      this.toastService.error('Errore', 'Impossibile eliminare dal database.');
    }
  }

  updateCurrentCompany(updates: Partial<ClientEntity>) {
    const currentId = this.companyConfig().id;
    if (currentId) {
      this.updateClient(currentId, updates);
      this.toastService.success('Dati Aggiornati', 'Le informazioni della tua azienda sono state aggiornate.');
    }
  }

  async saveDocument(doc: Partial<AppDocument>) {
    const user = this.currentUser();
    if (!user) {
        this.toastService.error('Errore Sessione', 'Devi essere loggato per salvare documenti.');
        return;
    }

    const targetClientId = this.activeTargetClientId();
    if (!targetClientId && !doc.clientId) {
        this.toastService.error('Errore Selezione', 'Seleziona un\'azienda o unità operativa prima di procedere.');
        return;
    }

    // CHECK FILE SIZE (Limit to 10MB raw file size, approx 14MB Base64)
    const MAX_SIZE = 14 * 1024 * 1024; // ~10.5MB file limit in Base64
    if (doc.fileData && doc.fileData.length > MAX_SIZE) {
        this.toastService.error('File troppo grande', 'Il file supera i 10MB consentiti. Riduci la risoluzione del PDF o dell\'immagine.');
        return;
    }

    const newDoc: AppDocument = {
      clientId: doc.clientId || targetClientId || user.clientId || 'demo',
      userId: user.id || 'system',
      category: doc.category || 'general',
      type: doc.type || 'unknown',
      fileName: doc.fileName || 'documento.pdf',
      fileType: doc.fileType || 'application/pdf',
      fileData: doc.fileData || '',
      id: doc.id || Math.random().toString(36).substring(2, 9),
      uploadDate: doc.uploadDate || new Date(),
      expiryDate: doc.expiryDate
    };

    // Optimistic UI Update
    this.documents.update(docs => {
      const filtered = docs.filter(d => d.id !== newDoc.id);
      return [newDoc, ...filtered];
    });

    // Supabase Sync
    try {
        const payload = {
            id: newDoc.id,
            client_id: newDoc.clientId,
            category: newDoc.category,
            type: newDoc.type,
            file_name: newDoc.fileName,
            file_type: newDoc.fileType,
            file_data: newDoc.fileData,
            upload_date: newDoc.uploadDate instanceof Date ? newDoc.uploadDate.toISOString() : newDoc.uploadDate,
            expiry_date: newDoc.expiryDate,
            user_id: newDoc.userId
        };

        console.log('Sending document payload to Supabase:', { ...payload, file_data: '(base64...)' });
        const { error } = await supabase.from('documents').upsert(payload);

        if (error) {
            console.error('Error syncing document:', error);
            // Better error reporting
            const detail = error.message || error.details || 'Sincronizzazione fallita (CORS, RLS or Network)';
            this.toastService.error('Errore Cloud', `Dettaglio: ${detail}`);
        } else {
            console.log('Document successfully synced with Supabase.');
        }
    } catch (err: any) {
        console.error('Unexpected error saving document:', err);
        if (err.message && err.message.includes('Failed to fetch')) {
            this.toastService.error('Errore di Caricamento', 'Il file è troppo pesante o la connessione è stata interrotta. Prova a caricare un file più piccolo (< 10MB).');
        } else {
            this.toastService.error('Errore Critico', err.message || 'Errore imprevisto durante il salvataggio.');
        }
    }
  }

  async deleteDocument(id: string) {
    // Optimistic UI
    this.documents.update(docs => docs.filter(doc => doc.id !== id));
    
    // DB Sync
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (!error) {
       this.toastService.success('Eliminato', 'Documento rimosso permanentemente.');
    } else {
       console.error('Error deleting document:', error);
       this.toastService.error('Errore', 'Impossibile completare l\'eliminazione nel cloud.');
    }
  }

  async updateDocumentName(id: string, newName: string) {
    // Local Update
    this.documents.update(allDocs => allDocs.map(d => {
        if (d.id === id) {
            return { ...d, fileName: newName };
        }
        return d;
    }));

    // DB Update
    const { error } = await supabase.from('documents')
        .update({ file_name: newName })
        .eq('id', id);

    if (error) {
        console.error('Error updating file name:', error);
        this.toastService.error('Errore Sync', 'Impossibile rinominare il file nel cloud.');
    } else {
        this.toastService.success('Rinomina Completata', 'Il nome del file è stato aggiornato.');
    }
  }

  async updateDocumentExpiry(type: string, clientId: string, expiryDate: string) {
    // Local Update
    this.documents.update(allDocs => allDocs.map(d => {
        if (d.type === type && d.clientId === clientId) {
            return { ...d, expiryDate };
        }
        return d;
    }));

    // DB Update for all documents of this type for this client
    const { error } = await supabase.from('documents')
        .update({ expiry_date: expiryDate })
        .eq('type', type)
        .eq('client_id', clientId);

    if (error) {
        console.error('Error updating expiry date:', error);
        this.toastService.error('Errore Sync', 'Impossibile aggiornare la scadenza nel cloud.');
    }
  }

  // --- Equipment Census Methods ---
  async addEquipment(area: string, name: string, type: string = 'Altro') {
    const id = Math.random().toString(36).substring(2, 10);
    const filterId = this.filterClientId();
    
    if (this.isAdmin() && !filterId) {
      this.toastService.warning('Selezione Richiesta', 'Seleziona prima un\'azienda/sede per associare l\'attrezzatura.');
      return;
    }

    const clientId = filterId || this.currentUser()?.clientId || 'demo';
    
    // Explicit signal update with string coercion for safety
    const newItem = { 
        id, 
        area, 
        name, 
        type, 
        clientId: String(clientId) 
    };

    this.selectedEquipment.update(list => [...list, newItem as any]);
    
    // DB sync
    try {
        const { error } = await supabase.from('equipment').insert({
            id,
            area,
            name,
            type,
            client_id: clientId
        });
        
        if (error) {
            console.error('[HACCP] DB Error:', error);
            this.toastService.error('Errore DB', 'L\'attrezzatura è stata aggiunta localmente ma il salvataggio remoto è fallito.');
        }
    } catch (err) {
      console.error('Final flush error:', err);
    }
  }

  async removeEquipment(id: string) {
    // 1. Optimistic Local Update
    this.selectedEquipment.update(list => list.filter(e => e.id !== id));
    
    // 2. DB Sync
    const { error } = await supabase.from('equipment').delete().eq('id', id);
    if (error) {
      console.error('Error deleting equipment:', error);
      this.toastService.error('Errore Sync', 'Impossibile rimuovere l\'attrezzatura dal database.');
    }
  }

  getDocumentsByClient(clientId: string, category?: string) {
    return computed(() => {
      let docs = this.documents().filter(d => d.clientId === clientId);
      if (category) {
        docs = docs.filter(d => d.category === category);
      }
      return docs;
    });
  }

  // --- Editing State Methods ---
  startEditingRecord(record: any) {
    this.recordToEdit.set(record);
    this.setModule(record.moduleId);
    this.toastService.info('Caricamento...', 'Sto aprendo la registrazione selezionata.');
  }

  completeEditing() {
    this.recordToEdit.set(null);
  }

  /**
   * Sends a new message and persists it to Supabase.
   * Improved with error handling and async feedback.
   */
  async sendMessage(subject: string, content: string, recipientType: 'ALL' | 'SINGLE', recipientId?: string, recipientUserId?: string, attachment?: { url: string, name: string }) {
    const user = this.currentUser();
    if (!user) return;

    // Generate a robust unique ID
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newMessage: Message = {
      id: messageId,
      senderId: user.id,
      senderName: user.name,
      recipientType,
      recipientId,
      recipientUserId,
      subject,
      content,
      attachmentUrl: attachment?.url,
      attachmentName: attachment?.name,
      fileData: attachment?.url,
      timestamp: new Date(),
      read: false,
      replies: []
    };

    // Strict size check for attachments (Limit to 10MB raw file, approx 13.5MB Base64)
    if (newMessage.fileData && newMessage.fileData.length > 13.5 * 1024 * 1024) {
      this.toastService.error('Allegato troppo grande', 'Il file supera il limite di 10MB.');
      return;
    }

    // Optimistic Update
    this.messages.update(msgs => [newMessage, ...msgs]);

    try {
      const { error } = await supabase.from('messages').insert({
        id: newMessage.id,
        senderId: newMessage.senderId,
        senderName: newMessage.senderName,
        recipientType: newMessage.recipientType,
        recipientId: newMessage.recipientId,
        recipientUserId: newMessage.recipientUserId,
        subject: newMessage.subject,
        content: newMessage.content,
        attachmentUrl: newMessage.attachmentUrl,
        attachmentName: newMessage.attachmentName,
        fileData: newMessage.fileData,
        timestamp: newMessage.timestamp.toISOString(),
        read: newMessage.read,
        replies: []
      });

      if (error) throw error;

      // Show specific toast notification
      if (recipientType === 'ALL') {
        this.toastService.success('Messaggio inviato', 'Inviato a tutte le aziende');
      } else if (recipientId === 'ADMIN_OFFICE') {
        this.toastService.success('Messaggio inviato', 'Inviato all\'Amministrazione');
      } else {
        const client = this.clients().find(c => c.id === recipientId);
        this.toastService.success('Messaggio inviato', `Inviato a ${client?.name || 'Azienda'}`);
      }
    } catch (err: any) {
      console.error('Error saving message to Supabase:', err);
      const detail = err.message || err.details || 'Errore sconosciuto (Check RLS o Connessione)';
      this.toastService.error('Errore Cloud', `Dettaglio: ${detail}`);
    }
  }

  /**
   * Adds a reply to an existing message.
   * Improved to handle JSON serialization and persistence errors.
   */
  async replyToMessage(messageId: string, content: string, attachment?: { url: string, name: string }) {
    const user = this.currentUser();
    if (!user) return;

    const reply: MessageReply = {
      id: `rep_${Date.now()}`,
      senderId: user.id,
      senderName: user.name,
      content,
      attachmentUrl: attachment?.url,
      attachmentName: attachment?.name,
      timestamp: new Date()
    };

    let targetMessage = this.messages().find(m => m.id === messageId);
    if (!targetMessage) return;

    const updatedReplies = [...targetMessage.replies, reply];

    // Optimistic update
    this.messages.update(msgs =>
      msgs.map(msg => msg.id === messageId ? { ...msg, replies: updatedReplies, read: false } : msg)
    );

    try {
      // Map replies for Supabase JSON storage
      const dbReplies = updatedReplies.map(r => ({
        id: r.id,
        senderId: r.senderId,
        senderName: r.senderName,
        content: r.content,
        attachmentUrl: r.attachmentUrl,
        attachmentName: r.attachmentName,
        timestamp: r.timestamp.toISOString()
      }));

      const { error } = await supabase
        .from('messages')
        .update({ 
          replies: dbReplies,
          read: false // Notify receiver
        })
        .eq('id', messageId);

      if (error) throw error;
      
      this.toastService.success('Risposta inviata', 'La tua risposta è stata registrata.');
    } catch (err: any) {
      console.error('Error replying to message:', err);
      const detail = err.message || 'Errore di sincronizzazione';
      this.toastService.error('Errore Sync Risposta', `Dettaglio: ${detail}`);
    }
  }

  markMessageAsRead(messageId: string) {
    this.messages.update(msgs =>
      msgs.map(msg =>
        msg.id === messageId ? { ...msg, read: true } : msg
      )
    );

    supabase.from('messages').update({ read: true }).eq('id', messageId).then();
  }


  deleteMessage(id: string) {
    this.messages.update(msgs => msgs.filter(m => m.id !== id));
    supabase.from('messages').delete().eq('id', id).then();
    this.toastService.success('Messaggio Eliminato', 'Il messaggio è stato rimosso correttamente.');
  }

  getMessagesForCurrentUser() {
    const user = this.currentUser();
    if (!user) return [];

    if (user.role === 'ADMIN') {
      return this.messages();
    }

    // Collaborators see:
    // 1. Messages they sent
    // 2. Messages sent to everyone (broadcast)
    // 3. Messages sent to their specific company (if not targeted to someone else)
    // 4. Messages sent specifically to them
    return this.messages().filter(msg =>
      msg.senderId === user.id ||
      msg.recipientType === 'ALL' ||
      (msg.recipientId === user.clientId && (!msg.recipientUserId || msg.recipientUserId === user.id))
    );
  }

  /**
   * Internal helper to add a message (usually automated notifications)
   * and sync it to the cloud.
   */
  async addMessage(msg: any) {
    // Ensure ID and timestamp
    const fullMsg = {
        ...msg,
        id: msg.id || `auto_${Date.now()}`,
        timestamp: msg.timestamp || new Date(),
        read: msg.read || false,
        replies: msg.replies || []
    };

    this.messages.update(msgs => [fullMsg, ...msgs]);
    
    try {
        await supabase.from('messages').insert({
            id: fullMsg.id,
            senderId: fullMsg.senderId,
            senderName: fullMsg.senderName,
            recipientType: fullMsg.recipientType,
            recipientId: fullMsg.recipientId,
            recipientUserId: fullMsg.recipientUserId,
            subject: fullMsg.subject,
            content: fullMsg.content,
            timestamp: fullMsg.timestamp instanceof Date ? fullMsg.timestamp.toISOString() : fullMsg.timestamp,
            read: fullMsg.read,
            replies: fullMsg.replies
        });
    } catch (err) {
        console.error('Failed to sync automated message:', err);
    }
  }

  // --- Production Records Methods ---
  async saveProductionRecord(record: ProductionRecord) {
    // Optimistic UI
    this.productionRecords.update(list => {
      const others = list.filter(r => r.id !== record.id);
      return [record, ...others];
    });

    // DB Sync
    const { error } = await supabase.from('production_records').upsert({
      id: record.id,
      recorded_date: record.recordedDate,
      main_product_name: record.mainProductName,
      packaging_date: record.packagingDate,
      expiry_date: record.expiryDate,
      lotto: record.lotto,
      ingredients: record.ingredients,
      user_id: record.userId,
      client_id: record.clientId
    });

    if (error) {
      console.error('Error syncing production record:', error);
      this.toastService.error('Errore Cloud', `Impossibile salvare la scheda: ${error.message || 'Controlla dimensione foto o permessi'}`);
    }
  }

  async deleteProductionRecord(id: string) {
    // Optimistic UI
    this.productionRecords.update(list => list.filter(r => r.id !== id));

    // DB Sync
    const { error } = await supabase.from('production_records').delete().eq('id', id);
    if (error) {
        console.error('Error deleting production record:', error);
        this.toastService.error('Errore', 'Impossibile eliminare la scheda dal cloud.');
    } else {
        this.toastService.success('Eliminato', 'Scheda di produzione rimossa correttamente.');
    }
  }

  private generateInitials(name: string): string {
    if (!name) return '??';
    return name
      .split(' ')
      .filter(part => part.length > 0)
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  // --- Accounting Persistence Methods ---
  async syncPayment(payment: Payment) {
    try {
      const { error } = await supabase.from('accounting_payments').upsert({
        id: payment.id,
        client_id: payment.clientId,
        amount: payment.amount,
        frequency: payment.frequency,
        due_date: payment.dueDate,
        status: payment.status,
        paid_date: payment.paidDate,
        notes: payment.notes
      });
      if (error) throw error;
      this.refreshAllData();
    } catch (e) {
      console.error('Error syncing payment:', e);
      this.toastService.error('Errore Database', 'Impossibile salvare il pagamento.');
    }
  }

  async syncJournalEntry(entry: JournalEntry) {
    try {
      const { error } = await supabase.from('journal_entries').upsert({
        id: entry.id,
        client_id: entry.clientId,
        date: entry.date,
        description: entry.description,
        debit: entry.debit,
        credit: entry.credit,
        category: entry.category
      });
      if (error) throw error;
      this.refreshAllData();
    } catch (e) {
      console.error('Error syncing journal entry:', e);
      this.toastService.error('Errore Database', 'Impossibile salvare la voce in prima nota.');
    }
  }

  async syncReminder(reminder: Reminder) {
    try {
      const { error } = await supabase.from('accounting_reminders').upsert({
        id: reminder.id,
        client_id: reminder.clientId,
        type: reminder.type,
        message: reminder.message,
        due_date: reminder.dueDate,
        priority: reminder.priority,
        dismissed: reminder.dismissed
      });
      if (error) throw error;
      this.refreshAllData();
    } catch (e) {
      console.error('Error syncing reminder:', e);
      this.toastService.error('Errore Database', 'Impossibile salvare il promemoria.');
    }
  }

  async deletePayment(id: string) {
    try {
      const { error } = await supabase.from('accounting_payments').delete().eq('id', id);
      if (error) throw error;
      this.refreshAllData();
    } catch (e) {
      console.error('Error deleting payment:', e);
      this.toastService.error('Errore Database', 'Impossibile eliminare il pagamento.');
    }
  }

  async deleteJournalEntry(id: string) {
    try {
      const { error } = await supabase.from('journal_entries').delete().eq('id', id);
      if (error) throw error;
      this.refreshAllData();
    } catch (e) {
      console.error('Error deleting journal entry:', e);
      this.toastService.error('Errore Database', 'Impossibile eliminare la voce dalla prima nota.');
    }
  }

  async deleteReminder(id: string) {
    try {
      const { error } = await supabase.from('accounting_reminders').delete().eq('id', id);
      if (error) throw error;
      this.refreshAllData();
    } catch (e) {
      console.error('Error deleting reminder:', e);
      this.toastService.error('Errore Database', 'Impossibile eliminare il promemoria.');
    }
  }

  // --- Recipe Management ---
  async syncRecipe(recipe: Recipe) {
    this.recipes.update(list => {
      const filtered = list.filter(r => r.id !== recipe.id);
      return [recipe, ...filtered];
    });

    const { error } = await supabase.from('ingredients_book').upsert({
      id: recipe.id,
      client_id: recipe.clientId,
      name: recipe.name,
      category: recipe.category,
      description: recipe.description,
      ingredients: recipe.ingredients,
      updated_at: new Date().toISOString()
    });

    if (error) {
       console.error('Error syncing recipe:', error);
       this.toastService.error('Errore Sync', `Salvataggio fallito: ${error.message}`);
    } else {
       this.toastService.success('Salvato', `Scheda "${recipe.name}" aggiornata.`);
    }
  }

  async deleteRecipe(id: string) {
    this.recipes.update(list => list.filter(r => r.id !== id));
    const { error } = await supabase.from('ingredients_book').delete().eq('id', id);
    if (!error) this.toastService.success('Eliminato', 'Ricetta rimossa.');
  }

  async saveNonConformity(nc: { 
    id: string, 
    moduleId: string, 
    date: string, 
    description: string, 
    itemName?: string,
    responsibleId?: string 
  }) {
    try {
        const client_id = this.activeTargetClientId() || 'demo';
        const { error } = await supabase.from('non_conformities').insert({
            id: nc.id,
            client_id: client_id,
            module_id: nc.moduleId,
            date: nc.date,
            description: nc.description,
            item_name: nc.itemName,
            responsible_id: nc.responsibleId || this.currentUser()?.id,
            status: 'OPEN',
            created_at: new Date()
        });
        if (error) throw error;
        
        // Also send a message to Admin
        await supabase.from('messages').insert({
            id: Math.random().toString(36).substring(2, 9),
            senderId: this.currentUser()?.id,
            recipientId: client_id,
            recipientType: 'ADMIN',
            content: `NUOVA NON CONFORMITÀ: ${nc.itemName || ''} - ${nc.description}`,
            category: 'ALERT',
            timestamp: new Date().toISOString()
        });

        this.refreshAllData();
    } catch (e) {
        console.error('Error saving non-conformity:', e);
    }
  }

  async updateNonConformityStatus(id: string, status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED') {
    // Optimistic local update
    this.nonConformities.update(list =>
      list.map(nc => nc.id === id ? { ...nc, status } : nc)
    );
    // Persist to Supabase
    try {
      const { error } = await supabase.from('non_conformities').update({ status }).eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error('Error updating non-conformity status:', e);
    }
  }

  // Helper for dashboard display
  readonly latestActivePayment = computed(() => {
    const user = this.currentUser();
    if (!user || !user.clientId) return null;

    return this.payments()
      .filter(p => p.clientId === user.clientId && p.status !== 'paid')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0] || null;
  });

  readonly recentPaidPayment = computed(() => {
    const user = this.currentUser();
    if (!user || !user.clientId) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Check for settlements in payments table
    const fromPayments = this.payments().find(p => {
      if (p.clientId !== user.clientId || p.status !== 'paid' || !p.paidDate) return false;
      
      const paidDate = new Date(p.paidDate);
      paidDate.setHours(0,0,0,0);
      const diffTime = Math.abs(today.getTime() - paidDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 3;
    });

    if (fromPayments) return fromPayments;

    // 2. Check for recent "payment" entries in Journal (in case they didn't link it to a specific payment)
    const fromJournal = this.journalEntries().find(j => {
      if (j.clientId !== user.clientId || j.category !== 'payment' || j.credit <= 0) return false;
      const entryDate = new Date(j.date);
      entryDate.setHours(0,0,0,0);
      const diffTime = Math.abs(today.getTime() - entryDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 3;
    });

    if (fromJournal) {
      return { 
        id: fromJournal.id, 
        clientId: fromJournal.clientId, 
        amount: fromJournal.credit, 
        status: 'paid', 
        paidDate: fromJournal.date,
        dueDate: fromJournal.date,
        frequency: 'once'
      } as Payment;
    }

    return null;
  });

  getDaysRemaining(dateStr: string): number {
    if (!dateStr) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
