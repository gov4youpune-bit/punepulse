// scripts/create-admins.js
// Run this locally only. Do NOT paste passwords in chat or share this file publicly.
// Usage (example):
//   SUPABASE_URL=https://xyz.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node ./scripts/create-admins.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import process from 'process';

dotenv.config({ path: '.env.local.admins' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Admins list: set emails & passwords in .env.local.admins
const ADMINS = [
  { email: process.env.ADMIN1_EMAIL, password: process.env.ADMIN1_PASSWORD },
  { email: process.env.ADMIN2_EMAIL, password: process.env.ADMIN2_PASSWORD },
  { email: process.env.ADMIN3_EMAIL, password: process.env.ADMIN3_PASSWORD }
];

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in env');
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function createAdminUser(email, password) {
  try {
    // Supabase admin API: create user and set metadata
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'admin' }
    });

    if (error) {
      // Note: in older SDKs admin.createUser may be under admin API differently - adjust if needed.
      console.error('createUser error for', email, error);
      return null;
    }

    console.log('Created user:', email, 'id:', data.id);
    return data;
  } catch (err) {
    console.error('Unexpected error creating user', email, err);
    return null;
  }
}

(async () => {
  for (const a of ADMINS) {
    if (!a.email || !a.password) {
      console.warn('Skipping admin entry with missing email/password', a);
      continue;
    }
    await createAdminUser(a.email, a.password);
  }
  console.log('Done creating admins. Remove .env.local.admins after verifying accounts created.');
  process.exit(0);
})();
