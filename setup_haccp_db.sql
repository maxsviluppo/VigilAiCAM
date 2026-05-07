-- Clients Table
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
  suspended BOOLEAN DEFAULT false,
  payment_balance_due BOOLEAN DEFAULT false,
  license_expiry_date TEXT,
  logo TEXT,
  printer_model TEXT,
  label_format TEXT,
  printer_driver_url TEXT
);

-- System Users Table
CREATE TABLE IF NOT EXISTS system_users (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id),
  name TEXT NOT NULL,
  email TEXT,
  role TEXT, -- 'ADMIN' | 'COLLABORATOR'
  department TEXT,
  active BOOLEAN DEFAULT true,
  avatar TEXT,
  username TEXT,
  password TEXT
);

-- Checklist Records Table
CREATE TABLE IF NOT EXISTS checklist_records (
  id TEXT PRIMARY KEY,
  module_id TEXT,
  user_id TEXT,
  client_id TEXT,
  date TEXT,
  data JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id),
  user_id TEXT REFERENCES system_users(id),
  category TEXT,
  type TEXT,
  file_name TEXT,
  file_type TEXT,
  file_data TEXT,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  expiry_date TEXT
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT,
  sender_name TEXT,
  recipient_type TEXT, -- 'ALL' | 'SINGLE'
  recipient_id TEXT,
  recipient_user_id TEXT,
  subject TEXT,
  content TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT false,
  replies JSONB DEFAULT '[]'
);

-- Message Replies Table (Nested replies)
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

-- Non-Conformities Table
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

-- Equipment Census
CREATE TABLE IF NOT EXISTS equipment (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  area TEXT,
  name TEXT,
  type TEXT DEFAULT 'Altro'
);

-- Production Records
CREATE TABLE IF NOT EXISTS production_records (
  id TEXT PRIMARY KEY,
  recorded_date TEXT,
  main_product_name TEXT,
  packaging_date TEXT,
  expiry_date TEXT,
  lotto TEXT,
  ingredients JSONB,
  user_id TEXT,
  client_id TEXT
);

-- Accounting Tables
CREATE TABLE IF NOT EXISTS accounting_payments (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id),
  amount NUMERIC,
  frequency TEXT,
  due_date TEXT,
  status TEXT,
  paid_date TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id),
  date TEXT,
  description TEXT,
  debit NUMERIC,
  credit NUMERIC,
  category TEXT
);

CREATE TABLE IF NOT EXISTS accounting_reminders (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id),
  type TEXT,
  message TEXT,
  due_date TEXT,
  priority TEXT,
  dismissed BOOLEAN DEFAULT false
);

-- System Config Table
CREATE TABLE IF NOT EXISTS system_config (
  id TEXT PRIMARY KEY,
  report_email TEXT,
  master_data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for development
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_replies DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipment DISABLE ROW LEVEL SECURITY;
ALTER TABLE production_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE non_conformities DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_config DISABLE ROW LEVEL SECURITY;

-- Initialize system config if missing
INSERT INTO system_config (id, report_email, master_data)
SELECT 'master', 'amministrazione@haccppro.it', '{"name": "HACCP PRO - Sede Centrale", "piva": "01234567890", "address": "Via dell''Innovazione 10, Milano (MI)", "pec": "haccppro@legalmail.it", "sdi": "M5UXCR1"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE id = 'master');
