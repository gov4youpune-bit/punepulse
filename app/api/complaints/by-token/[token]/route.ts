export const dynamic = "force-dynamic";
export const revalidate = 0;



import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  const { data, error } = await supabaseAdmin
    .from('complaints')
    .select('*')
    .eq('token', token)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}
