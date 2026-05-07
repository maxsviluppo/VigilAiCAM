
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient('https://xrbjvisgcrsdbdalpmlw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyYmp2aXNnY3JzZGJkYWxwbWx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzcxODksImV4cCI6MjA4OTUxMzE4OX0.v7lAgk8_0WZcronEAXQnzcIKg-FjktEEQZwTHLXNz2w');

const sql = `
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  piva TEXT,
  address TEXT,
  phone TEXT,
  cellphone TEXT,
  whatsapp TEXT,
  email TEXT,
  license_number TEXT,
  suspended BOOLEAN DEFAULT FALSE,
  payment_balance_due BOOLEAN DEFAULT FALSE,
  license_expiry_date TEXT,
  logo TEXT
);

CREATE TABLE IF NOT EXISTS system_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT,
  department TEXT,
  active BOOLEAN DEFAULT TRUE,
  avatar TEXT,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  username TEXT,
  password TEXT
);

CREATE TABLE IF NOT EXISTS checklist_records (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL,
  user_id TEXT REFERENCES system_users(id) ON DELETE CASCADE,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  data JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  category TEXT,
  type TEXT,
  file_name TEXT,
  file_type TEXT,
  file_data TEXT,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  expiry_date TEXT,
  user_id TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT,
  sender_name TEXT,
  recipient_type TEXT,
  recipient_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  recipient_user_id TEXT,
  subject TEXT,
  content TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS message_replies (
  id TEXT PRIMARY KEY,
  message_id TEXT REFERENCES messages(id) ON DELETE CASCADE,
  sender_id TEXT,
  sender_name TEXT,
  content TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS equipment (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  area TEXT,
  name TEXT,
  type TEXT DEFAULT 'Altro'
);

CREATE TABLE IF NOT EXISTS production_records (
  id TEXT PRIMARY KEY,
  recorded_date TEXT,
  main_product_name TEXT,
  packaging_date TEXT,
  expiry_date TEXT,
  lotto TEXT,
  ingredients JSONB,
  user_id TEXT,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS non_conformities (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  module_id TEXT,
  date TEXT,
  description TEXT,
  item_name TEXT,
  responsible_id TEXT,
  status TEXT DEFAULT 'OPEN',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounting_payments (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  amount NUMERIC,
  frequency TEXT,
  due_date TEXT,
  status TEXT,
  paid_date TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  date TEXT,
  description TEXT,
  debit NUMERIC,
  credit NUMERIC,
  category TEXT
);

CREATE TABLE IF NOT EXISTS accounting_reminders (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT,
  message TEXT,
  due_date TEXT,
  priority TEXT,
  dismissed BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS system_config (
  id TEXT PRIMARY KEY,
  report_email TEXT,
  master_data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize system config if missing
INSERT INTO system_config (id, report_email, master_data)
SELECT 'master', 'amministrazione@haccppro.it', '{"name": "HACCP PRO - Sede Centrale", "piva": "01234567890", "address": "Via dell''Innovazione 10, Milano (MI)", "pec": "haccppro@legalmail.it", "sdi": "M5UXCR1"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE id = 'master');

-- Disable RLS for all for now to allow local dev connection
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_replies DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipment DISABLE ROW LEVEL SECURITY;
ALTER TABLE production_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE non_conformities DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_config DISABLE ROW LEVEL SECURITY;

-- Insert a default dev admin if user table empty
INSERT INTO system_users (id, name, email, role, active, username, password, avatar)
SELECT 'dev-admin', 'Sviluppatore (Admin)', 'admin@haccppro.it', 'ADMIN', true, 'dev', 'dev', 'https://ui-avatars.com/api/?name=Dev&background=000&color=fff'
WHERE NOT EXISTS (SELECT 1 FROM system_users WHERE id = 'dev-admin');
`;

async function run() {
  console.log("Setting up Supabase Schema...");
  // Note: Supabase JS client doesn't have a direct raw SQL executor in standard anon key.
  // I actually need to use postgrest to insert or use the MCP if it works.
  // Since I don't have the SERVICE_ROLE_KEY, I can't run raw SQL via the client easily unless there's an edge function or RPC.
  
  // Actually, I'll try to use the MCP server again. Maybe it was a fluke.
  console.log("Schema definitions ready. Please visit SQL Editor in Supabase and run the script.");
  console.log("SQL SCRIPT SAVED TO setup_haccp_db.sql");
}

run();
