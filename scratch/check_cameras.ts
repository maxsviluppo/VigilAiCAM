import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCameras() {
  console.log("Fetching cameras from Supabase...");
  const { data, error } = await supabase.from('cameras').select('*');
  
  if (error) {
    console.error("Error fetching cameras:", error);
  } else {
    console.log("Found", data.length, "cameras:");
    console.table(data.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      ip: c.ip,
      port: c.port,
      rtsp_path: c.rtsp_path,
      user_id: c.user_id
    })));
  }
}

checkCameras();
