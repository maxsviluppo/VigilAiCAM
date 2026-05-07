import { createClient } from '@supabase/supabase-js';

// Sostituire con le credenziali reali tramite .env o variabili d'ambiente Vercel
const supabaseUrl = (import.meta as any).env?.['VITE_SUPABASE_URL'] || 'https://xrbjvisgcrsdbdalpmlw.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.['VITE_SUPABASE_ANON_KEY'] || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyYmp2aXNnY3JzZGJkYWxwbWx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzcxODksImV4cCI6MjA4OTUxMzE4OX0.v7lAgk8_0WZcronEAXQnzcIKg-FjktEEQZwTHLXNz2w';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
