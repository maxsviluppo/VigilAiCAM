import { createClient } from '@supabase/supabase-js';

/** Progetto Supabase HACCP PRO — usato se .env / Vercel non hanno variabili valide */
const DEFAULT_SUPABASE_URL = 'https://xrbjvisgcrsdbdalpmlw.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyYmp2aXNnY3JzZGJkYWxwbWx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzcxODksImV4cCI6MjA4OTUxMzE4OX0.v7lAgk8_0WZcronEAXQnzcIKg-FjktEEQZwTHLXNz2w';

function resolveEnv(key: string, fallback: string): string {
  const raw = (import.meta as any).env?.[key];
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    // Ignora stringhe vuote o placeholder Vercel — evita connessione “spezzata” dopo deploy
    if (trimmed.length > 10 && !trimmed.includes('your_') && trimmed !== 'undefined') {
      return trimmed;
    }
  }
  return fallback;
}

export const supabaseUrl = resolveEnv('VITE_SUPABASE_URL', DEFAULT_SUPABASE_URL);
export const supabaseAnonKey = resolveEnv('VITE_SUPABASE_ANON_KEY', DEFAULT_SUPABASE_ANON_KEY);

if (typeof window !== 'undefined') {
  console.info('[HACCP] Supabase endpoint:', supabaseUrl);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
