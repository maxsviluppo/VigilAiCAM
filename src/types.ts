export interface Hotspot {
  id: string;
  name: string;
  nameIt: string;
  x: number; // percentage from left
  y: number; // percentage from top
  width: number;
  height: number;
  description: string;
  descriptionIt: string;
  evaTranscription?: string;
  translationIt?: string;
  translationEn?: string;
  wordByWord?: WordAnalysis[];
}

export interface Theory {
  id: string;
  name: string;
  nameIt: string;
  proponent: string;
  description: string;
  descriptionIt: string;
  concept: string;
  conceptIt: string;
  plausibility: number; // 1-100%
  exampleSubstitution?: Record<string, string>;
}

export interface LetterMap {
  eva: string;
  char: string;
  name: string;
  ipa?: string;
  approxSound?: string;
}

export interface WordAnalysis {
  voynichWord: string;
  translation: string;
  explanation: string;
}

export interface DecryptionResult {
  suggestedMapping?: Record<string, string>;
  hypotheticalTranslation?: string;
  wordByWordAnalysis?: WordAnalysis[];
  statisticalCommentary?: string;
}
