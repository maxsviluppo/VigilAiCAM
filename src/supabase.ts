import { createClient } from '@supabase/supabase-js';

// Vite espone le variabili tramite import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bdcryhunzdemuficudws.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';


if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("ATTENZIONE: Credenziali Supabase mancanti. Verifica il file .env o le impostazioni Vercel.");
}

let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} catch (e) {
  console.error("[Supabase] Failed to initialize client:", e);
  // Fallback dummy client to prevent total crash
  supabase = {
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) },
    from: () => ({ select: () => ({ order: () => ({ limit: () => ({ data: [], error: null }) }) }) })
  } as any;
}

export { supabase };

