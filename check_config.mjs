
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://xrbjvisgcrsdbdalpmlw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyYmp2aXNnY3JzZGJkYWxwbWx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzcxODksImV4cCI6MjA4OTUxMzE4OX0.v7lAgk8_0WZcronEAXQnzcIKg-FjktEEQZwTHLXNz2w');

async function checkConfig() {
  const { data, error } = await supabase.from('system_config').select('*');
  if (error) {
    console.error('Error fetching config:', error);
  } else {
    console.log('Current Database Config:', JSON.stringify(data, null, 2));
  }
}

checkConfig();
