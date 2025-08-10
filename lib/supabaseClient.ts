// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // In browser builds process.env will be replaced at build time — this safeguard is fine.
  console.warn('Supabase client missing env vars; client requests may fail.');
}

export const supabaseClient = createClient(url ?? '', anon ?? '');
