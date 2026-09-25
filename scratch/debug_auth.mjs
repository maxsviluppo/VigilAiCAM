import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const email = 'castromassimo@gmail.com';
  const password = "Password123!";

  console.log(`1. Signing up existing email: ${email}`);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
  if (signUpError) {
    console.error("SignUp Error:", signUpError.status, signUpError.code, signUpError.message);
  } else {
    console.log("SignUp Success! Identities count:", signUpData.user?.identities?.length);
  }
}

test();
