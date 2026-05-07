import { createClient } from '@supabase/supabase-client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Try to find .env or config
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// In this project, supabase is likely configured in src/supabase.ts
// I'll try to read it to get URL and KEY
const supabaseTs = fs.readFileSync(path.join(process.cwd(), 'src', 'supabase.ts'), 'utf8');
const urlMatch = supabaseTs.match(/const supabaseUrl = ['"](.+?)['"]/);
const keyMatch = supabaseTs.match(/const supabaseKey = ['"](.+?)['"]/);

if (!urlMatch || !keyMatch) {
  console.error("Could not find Supabase credentials in src/supabase.ts");
  process.exit(1);
}

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function checkData() {
  console.log("Checking Clients...");
  const { data: clients, error: cErr } = await supabase.from('clients').select('*');
  if (cErr) console.error(cErr);
  else console.table(clients);

  console.log("\nChecking System Users...");
  const { data: users, error: uErr } = await supabase.from('system_users').select('*');
  if (uErr) console.error(uErr);
  else console.table(users);
}

checkData();
