import { createClient } from '@supabase/supabase-js';

// Funzione per ottenere le variabili di ambiente a runtime (iniettate dal server) o build-time (Vite)
const getEnv = (key: string, fallback: string = ''): string => {
  if (typeof window !== 'undefined' && (window as any).__VIGILAI_ENV__) {
    const val = (window as any).__VIGILAI_ENV__[key];
    if (val) return val;
  }
  return (import.meta.env as any)[key] || fallback;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL', 'https://bdcryhunzdemuficudws.supabase.co');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY', '');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("ATTENZIONE: Credenziali Supabase mancanti. Verifica il file .env o le impostazioni Vercel.");
}

let supabase: any;
try {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL o Anon Key mancante");
  }
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} catch (e) {
  console.error("[Supabase] Failed to initialize client, using dummy fallback:", e);
  // Fallback dummy client to prevent total crash and show descriptive errors in forms
  supabase = {
    auth: { 
      getSession: async () => ({ data: { session: null }, error: null }), 
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({ 
        data: { session: null, user: null }, 
        error: new Error("Supabase non configurato. Inserisci le chiavi nel file .env o completa il Setup.") 
      }),
      signUp: async () => ({ 
        data: { session: null, user: null }, 
        error: new Error("Supabase non configurato. Inserisci le chiavi nel file .env o completa il Setup.") 
      }),
      signOut: async () => ({ error: null })
    },
    from: () => ({ select: () => ({ order: () => ({ limit: () => ({ data: [], error: null }) }) }) })
  } as any;
}

export { supabase };
