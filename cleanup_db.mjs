import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read config from src/supabase.ts
const supabaseTs = fs.readFileSync(path.join(process.cwd(), 'src', 'supabase.ts'), 'utf8');
const urlMatch = supabaseTs.match(/const supabaseUrl = ['"](.+?)['"]/);
const keyMatch = supabaseTs.match(/const supabaseAnonKey = ['"](.+?)['"]/);

if (!urlMatch || !keyMatch) {
  process.exit(1);
}

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function cleanup() {
  console.log("Cleaning up users (excluding dev-admin)...");
  const { error: uErr } = await supabase.from('system_users').delete().neq('id', 'dev-admin');
  if (uErr) console.error("Error deleting users:", uErr.message);
  
  console.log("Cleaning up clients...");
  const { error: cErr } = await supabase.from('clients').delete().neq('id', 'non-existent-id'); // Delete all
  if (cErr) console.error("Error deleting clients:", cErr.message);

  console.log("Cleanup complete.");
}

await cleanup();
process.exit(0);
