import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tables = [
  'clients',
  'system_users',
  'checklist_records',
  'documents',
  'messages',
  'equipment',
  'production_records',
  'non_conformities',
  'accounting_payments',
  'system_config'
];

async function check() {
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('count', { count: 'exact', head: true });
    if (error) {
      console.log(`Table '${table}': ERROR (${error.message})`);
    } else {
      console.log(`Table '${table}': EXISTS`);
    }
  }
}

check();
