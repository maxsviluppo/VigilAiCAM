-- ====================================================================
-- VigilAI - Script di Migrazione per Backup API Key
-- ====================================================================
-- Esegui questo script nell'SQL Editor di Supabase per creare la
-- tabella necessaria per il salvataggio sicuro dell'API Key Gemini.
-- ====================================================================

-- 1. Creazione della tabella settings se non esiste
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  gemini_part1 TEXT,
  gemini_part2 TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Disattivazione di RLS per questa tabella in modo da consentire
-- letture e scritture rapide dal client in rete locale/dev
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- 3. Inserimento del record master predefinito (se non esiste già)
INSERT INTO settings (id, gemini_part1, gemini_part2)
SELECT 'gemini_key_backup', '', ''
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE id = 'gemini_key_backup');
