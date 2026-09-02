-- ====================================================================
-- VigilAI - Script di Sicurezza e Risoluzione Vulnerabilità Supabase
-- ====================================================================
-- Risolve gli avvisi di sicurezza:
-- 1. rls_disabled_in_public (Attivazione Row-Level Security)
-- 2. sensitive_columns_exposed (Protezione password telecamere, credenziali SMTP e chiavi API)
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. TABELLA: cameras
-- --------------------------------------------------------------------
-- Contiene le password RTSP, gli IP locali e le configurazioni delle telecamere.
ALTER TABLE IF EXISTS cameras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cameras_user_select" ON cameras;
DROP POLICY IF EXISTS "cameras_user_insert" ON cameras;
DROP POLICY IF EXISTS "cameras_user_update" ON cameras;
DROP POLICY IF EXISTS "cameras_user_delete" ON cameras;
DROP POLICY IF EXISTS "cameras_service_role_all" ON cameras;

-- Consenti la lettura SOLO all'utente proprietario della telecamera
CREATE POLICY "cameras_user_select" ON cameras
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Consenti l'inserimento SOLO per il proprio user_id
CREATE POLICY "cameras_user_insert" ON cameras
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Consenti la modifica SOLO delle proprie telecamere
CREATE POLICY "cameras_user_update" ON cameras
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Consenti la cancellazione SOLO delle proprie telecamere
CREATE POLICY "cameras_user_delete" ON cameras
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Il backend locale VigilAI (Raspberry / server locale con service_role) ha accesso completo
CREATE POLICY "cameras_service_role_all" ON cameras
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);


-- --------------------------------------------------------------------
-- 2. TABELLA: global_settings
-- --------------------------------------------------------------------
-- Contiene credenziali SMTP Gmail, Telegram Token ed email destinatari.
ALTER TABLE IF EXISTS global_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "global_settings_auth_select" ON global_settings;
DROP POLICY IF EXISTS "global_settings_auth_update" ON global_settings;
DROP POLICY IF EXISTS "global_settings_auth_insert" ON global_settings;
DROP POLICY IF EXISTS "global_settings_service_all" ON global_settings;

CREATE POLICY "global_settings_auth_select" ON global_settings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "global_settings_auth_update" ON global_settings
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "global_settings_auth_insert" ON global_settings
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "global_settings_service_all" ON global_settings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);


-- --------------------------------------------------------------------
-- 3. TABELLA: settings
-- --------------------------------------------------------------------
-- Contiene il backup della chiave Gemini API (gemini_part1 / gemini_part2).
ALTER TABLE IF EXISTS settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_auth_select" ON settings;
DROP POLICY IF EXISTS "settings_auth_update" ON settings;
DROP POLICY IF EXISTS "settings_auth_insert" ON settings;
DROP POLICY IF EXISTS "settings_service_all" ON settings;

CREATE POLICY "settings_auth_select" ON settings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "settings_auth_update" ON settings
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "settings_auth_insert" ON settings
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "settings_service_all" ON settings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);


-- --------------------------------------------------------------------
-- 4. TABELLA: alert_triggers
-- --------------------------------------------------------------------
-- Contiene l'elenco dei trigger AI (intrusione, fumo, violenza, ecc.).
ALTER TABLE IF EXISTS alert_triggers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alert_triggers_select_all" ON alert_triggers;
DROP POLICY IF EXISTS "alert_triggers_admin_all" ON alert_triggers;

-- Lettura consentita sia ad anon che authenticated per consentire la visualizzazione delle icone
CREATE POLICY "alert_triggers_select_all" ON alert_triggers
  FOR SELECT TO anon, authenticated, service_role
  USING (true);

-- Modifiche permesse solo a utenti autenticati e service_role
CREATE POLICY "alert_triggers_admin_all" ON alert_triggers
  FOR ALL TO authenticated, service_role
  USING (true)
  WITH CHECK (true);


-- --------------------------------------------------------------------
-- 5. TABELLA: alerts
-- --------------------------------------------------------------------
-- Contiene la cronologia degli eventi di allarme rilevati.
ALTER TABLE IF EXISTS alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alerts_user_all" ON alerts;
DROP POLICY IF EXISTS "alerts_service_all" ON alerts;

CREATE POLICY "alerts_user_all" ON alerts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "alerts_service_all" ON alerts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);


-- --------------------------------------------------------------------
-- 6. TABELLA: profiles
-- --------------------------------------------------------------------
-- Contiene i profili utente.
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_user_all" ON profiles;
DROP POLICY IF EXISTS "profiles_service_all" ON profiles;

CREATE POLICY "profiles_user_all" ON profiles
  FOR ALL TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_service_all" ON profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);


-- --------------------------------------------------------------------
-- 7. TABELLE COMPLEMENTARI (HACCP / ERP, se presenti)
-- --------------------------------------------------------------------
-- Attiva RLS e protegge tutte le tabelle opzionali presenti nel database pubblico
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN (
        'clients', 'system_users', 'checklist_records', 'documents', 
        'messages', 'message_replies', 'equipment', 'production_records', 
        'accounting_payments', 'journal_entries', 'accounting_reminders', 
        'non_conformities', 'system_config', 'ingredients_book'
      )
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', tbl || '_auth_all', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);', tbl || '_auth_all', tbl);
  END LOOP;
END $$;
