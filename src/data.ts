import { Hotspot, Theory, LetterMap } from "./types";

export const DECRYPTION_THEORIES: Theory[] = [
  {
    id: "abbreviated_latin",
    name: "Abbreviated Latin Shorthand",
    nameIt: "Latino Medievale Abbreviato (Sgografia)",
    proponent: "Dr. Albert C. Beck, Edith Sherwood",
    description: "The text is medieval Latin where most vowels and terminal sounds are replaced by astrological, medical, or standard scribal abbreviations (Sigla). Perfect fit for 15th-century Northern Italian scripts.",
    descriptionIt: "Il testo è latino medievale ultra-abbreviato, dove gran parte delle vocali e delle desinenze è soppressa o sostituita da sigle notarili medievali e glifi astronomici. Molto diffuso negli uffici amministrativi del Nord Italia nel 1400.",
    concept: "EVA Glyphs map to medieval Latin contractions: e.g. 8 (d), a (a), i (i), o (u), y (us). Words like 'daiin' are read as 'dominus' or 'dei'.",
    conceptIt: "I caratteri EVA mappano contrazioni latine: es. 8 (d), a (a), e (e), o (u), y (us). Termini ricorrenti come 'daiin' verrebbero letti come abbreviazioni di 'dominum' o 'daya'.",
    plausibility: 65,
    exampleSubstitution: {
      "o": "u",
      "e": "e",
      "a": "a",
      "8": "d",
      "y": "s",
      "t": "t",
      "r": "r",
      "c": "c",
      "l": "l",
      "n": "m",
      "h": "h",
      "d": "i"
    }
  },
  {
    id: "anatolian_turkish",
    name: "Proto-Turkish Phonetic Cipher",
    nameIt: "Codificazione Turco-Anatolica Antica",
    proponent: "Ahmet Ardıç (2018)",
    description: "Argues that Voynich symbols form a phonetic transcription of Old Anatolian Turkish dialect written without vocalic fillers and based on rhythmic syllabary.",
    descriptionIt: "Ipotizza che il testo sia un dialetto del Turco Anatolico Antico scritto foneticamente. La ritmicità estrema è legata alla presenza insolita del dialetto lirico e poetico del periodo oghuz.",
    concept: "Words are read phonetically according to a custom agglutinative mapping, where post-fixes determine plant properties like 'soothing' or 'toxic'.",
    conceptIt: "Le parole sono lette foneticamente e decodificate secondo suoni oghuz. I suffissi ripetitivi definiscono proprietà mediche specifiche del vegetale come astringente, amaro o digestivo.",
    plausibility: 45,
    exampleSubstitution: {
      "o": "a",
      "e": "e",
      "8": "b",
      "y": "r",
      "t": "t",
      "r": "l",
      "c": "s",
      "l": "n",
      "n": "m",
      "d": "k",
      "a": "u"
    }
  },
  {
    id: "sephardic_hebrew",
    name: "Encrypted Sephardic Hebrew",
    nameIt: "Ebraico Sefardita Cifrato",
    proponent: "Stephen Skinner, Gerard Cheshire (partially)",
    description: "A substitution cipher representing early Judeo-Spanish, Sephardic Hebrew, or Ladino dialect containing medicinal recipes written to preserve kabbalistic secrecy.",
    descriptionIt: "Una cifratura a sostituzione che nasconde l'Ebraico Sefardita medievale o il Ladino giudaico-spagnolo. Veniva utilizzato dagli speziali ebrei per tramandare formule mediche alchemiche preservandone la segretezza.",
    concept: "Voynich letters are consonant skeletons of Hebrew, readable from right to left or rearranged under Kabbalistic anagram grids (Gematria).",
    conceptIt: "Le lettere Voynich fungono da scheletro consonantico ebraico (abjad), da leggersi con vocalizzazione facoltativa o anagrammi cabalistici (Gematria).",
    plausibility: 55,
    exampleSubstitution: {
      "o": "aleph",
      "e": "he",
      "8": "daleth",
      "y": "yod",
      "t": "tav",
      "r": "resh",
      "c": "tsadi",
      "l": "lamed",
      "n": "nun",
      "d": "kaph",
      "a": "ayin"
    }
  },
  {
    id: "hoax_asemic",
    name: "Medieval Counterfeit / Asemic Art",
    nameIt: "Falso d'Autore / Scrittura Asemica",
    proponent: "Gordon Rugg, Herb Rydahl",
    description: "Suggests the manuscript possesses NO semantic meaning. It is an asexual or asemic masterpiece made using a Cardan Grille to generate random word structures, sold to Emperor Rudolf II as a premium mystic artifact.",
    descriptionIt: "Sostiene che il testo non contenga ALCUN messaggio reale. È una mirabile scrittura asemica, un falso capolavoro costruito tramite griglie di Cardano da falsari poliglotti (come Edward Kelley e John Dee) per spillare monete d'oro all'Imperatore Rodolfo II.",
    concept: "Substitution is meaningless as the letters were systematically combined to simulate a real syntax using pseudo-linguistic rules (low entropy).",
    conceptIt: "Ogni decodifica è illusoria: l'ordinamento matematico è un effetto collaterale di una stringa autogenerata tramite schemi cartacei prefissati.",
    plausibility: 80,
    exampleSubstitution: {}
  }
];

export const EVA_ALPHABET: LetterMap[] = [
  { eva: "o", char: "o", name: "El (o)", ipa: "o", approxSound: "Italian 'o' or Greek omicron" },
  { eva: "a", char: "a", name: "Al (a)", ipa: "a", approxSound: "Open front unrounded 'a'" },
  { eva: "e", char: "e", name: "Ee (e)", ipa: "e", approxSound: "Short vowel sound 'e'" },
  { eva: "y", char: "y", name: "Yod (y)", ipa: "i/j", approxSound: "Consonantal 'y' or final diphtong" },
  { eva: "t", char: "t", name: "Tall Gallows-T", ipa: "t", approxSound: "Crisp dental plosive 't' with loop" },
  { eva: "k", char: "k", name: "Tall Gallows-K", ipa: "k", approxSound: "Gallows 'k' with loop" },
  { eva: "p", char: "p", name: "Gallows-P", ipa: "p", approxSound: "Symmetric gallows 'p'" },
  { eva: "f", char: "f", name: "Gallows-F", ipa: "f", approxSound: "Symmetric gallows 'f'" },
  { eva: "8", char: "8", name: "Dai (8)", ipa: "d", approxSound: "Dental plosive or 'd' abbreviation" },
  { eva: "r", char: "r", name: "Ror (r)", ipa: "r", approxSound: "Trilled or flapped liquid 'r'" },
  { eva: "c", char: "c", name: "Chor (c)", ipa: "c", approxSound: "Sibilant glide or half-abbreviation" },
  { eva: "l", char: "l", name: "Lil (l)", ipa: "l", approxSound: "Lateral liquid 'l'" },
  { eva: "n", char: "n", name: "Nin (n)", ipa: "n", approxSound: "Nasal dental consonant 'n'" },
  { eva: "d", char: "d", name: "Du (d)", ipa: "d/ð", approxSound: "Glottal modifier or phonetic friction" }
];
