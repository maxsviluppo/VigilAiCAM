import { createClient } from '@supabase/supabase-js';

const otherUrl = 'https://xrbjvisgcrsdbdalpmlw.supabase.co';
const otherKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyYmp2aXNnY3JzZGJkYWxwbWx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzcxODksImV4cCI6MjA8OTUxMzE4OX0.v7lAgk8_0WZcronEAXQnzcIKg-FjktEEQZwTHLXNz2w'; // Wait, let's use the exact key from check_config.mjs
const otherKeyCorrect = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyYmp2aXNnY3JzZGJkYWxwbWx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzcxODksImV4cCI6MjA5Mzc2MDgzN30.hlqDNRSqgV12o3lFDFnB7wL5ve04JIk8T_VyjydLGh0'; // Oh wait, let's view check_config.mjs key:
// 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyYmp2aXNnY3JzZGJkYWxwbWx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzcxODksImV4cCI6MjA4OTUxMzE4OX0.v7lAgk8_0WZcronEAXQnzcIKg-FjktEEQZwTHLXNz2w'

const supabase = createClient(otherUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyYmp2aXNnY3JzZGJkYWxwbWx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzcxODksImV4cCI6MjA4OTUxMzE4OX0.v7lAgk8_0WZcronEAXQnzcIKg-FjktEEQZwTHLXNz2w');

async function test() {
  try {
    const { data: system_config, error: scErr } = await supabase.from('system_config').select('*');
    console.log('system_config:', system_config, 'Error:', scErr);

    const { data: settings, error: sErr } = await supabase.from('settings').select('*');
    console.log('Settings:', settings, 'Error:', sErr);
  } catch (e) {
    console.error(e);
  }
}
test();
