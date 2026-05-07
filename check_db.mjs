import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read config from src/supabase.ts
const supabaseTs = fs.readFileSync(path.join(process.cwd(), 'src', 'supabase.ts'), 'utf8');
const urlMatch = supabaseTs.match(/const supabaseUrl = ['"](.+?)['"]/);
const keyMatch = supabaseTs.match(/const supabaseAnonKey = ['"](.+?)['"]/);

if (!urlMatch || !keyMatch) {
  console.error("Could not find Supabase credentials in src/supabase.ts");
  process.exit(1);
}

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function checkData() {
  console.log("Checking Clients...");
  const { data: clients, error: cErr } = await supabase.from('clients').select('*');
  if (cErr) console.error("Error fetching clients:", cErr.message);
  else console.table(clients);

  console.log("\nChecking System Users...");
  const { data: users, error: uErr } = await supabase.from('system_users').select('*');
  if (uErr) console.error("Error fetching users:", uErr.message);
  else console.table(users);

  // Check if accounting_payments exist
  console.log("\nChecking Accounting Payments Table...");
  const { error: pErr } = await supabase.from('accounting_payments').select('id').limit(1);
  if (pErr) console.log("Table 'accounting_payments' does NOT exist.");
  else console.log("Table 'accounting_payments' exists.");
}

await checkData();
process.exit(0);
