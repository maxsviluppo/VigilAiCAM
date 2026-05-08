import { createClient } from '@supabase/supabase-js';

// Sostituire con le credenziali reali tramite .env o variabili d'ambiente Vercel
const supabaseUrl = (import.meta as any).env?.['VITE_SUPABASE_URL'] || 'https://bdcryhunzdemuficudws.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.['VITE_SUPABASE_ANON_KEY'] || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkY3J5aHVuemRlbXVmaWN1ZHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxODQ4MzcsImV4cCI6MjA5Mzc2MDgzN30.hlqDNRSqgV12o3lFDFnB7wL5ve04JIk8T_VyjydLGh0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
