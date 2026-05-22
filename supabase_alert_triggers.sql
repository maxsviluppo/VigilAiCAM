-- ====================================================================
-- VigilAI - Script di Migrazione per Trigger AI Dinamici
-- ====================================================================
-- Esegui questo script nell'SQL Editor di Supabase per creare la
-- tabella necessaria per configurare in modo dinamico i trigger AI.
-- ====================================================================

-- 1. Creazione della tabella alert_triggers se non esiste
CREATE TABLE IF NOT EXISTS alert_triggers (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_name TEXT DEFAULT 'AlertTriangle',
  color_class TEXT DEFAULT 'text-amber-500',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Disattivazione di RLS per questa tabella in modo da consentire
-- letture rapide dal client in rete locale/dev
ALTER TABLE alert_triggers DISABLE ROW LEVEL SECURITY;

-- 3. Inserimento dei trigger predefiniti storici (se non esistono già)
INSERT INTO alert_triggers (id, label, description, icon_name, color_class)
VALUES 
  ('intrusion', 'Intrusione', 'Intrusione non autorizzata o presenza sospetta di intrusi.', 'Eye', 'text-blue-400'),
  ('violence', 'Violenza', 'Rapine, aggressioni, atti vandalici o armi (pistole, coltelli, mazze).', 'ShieldAlert', 'text-red-500'),
  ('fire', 'Incendio', 'Fiamme libere, principio di incendio o presenza di fuoco.', 'Flame', 'text-orange-500'),
  ('smoke', 'Fumo', 'Fumo denso o fumo anomalo negli ambienti.', 'Wind', 'text-slate-300'),
  ('safety_gear', 'DPI', 'Mancato uso di caschi di protezione, giubbotti catarifrangenti o abbigliamento protettivo obbligatorio.', 'UserCheck', 'text-green-400'),
  ('fall', 'Cadute', 'Persone a terra, svenimenti o cadute accidentali.', 'Activity', 'text-purple-400'),
  ('flooding', 'Allagamento', 'Presenza di acqua o liquidi sul pavimento, allagamenti, pozze o perdite da tubature.', 'Waves', 'text-cyan-400'),
  ('earthquake', 'Terremoto', 'Vibrazioni, oscillazioni continue o scuotimento dell''inquadratura compatibili con un terremoto/scossa tellurica (da distinguere da urti singoli al tavolo/supporto).', 'Zap', 'text-amber-500')
ON CONFLICT (id) DO UPDATE SET 
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  icon_name = EXCLUDED.icon_name,
  color_class = EXCLUDED.color_class;
