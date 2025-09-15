export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  // Get complaint first
  const { data: complaint, error } = await supabaseAdmin
    .from('complaints')
    .select('*')
    .eq('token', token)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  // Parse location coordinates if available
  let lat: number | null = null;
  let lng: number | null = null;

  if (complaint.location_text && typeof complaint.location_text === 'string') {
    const coords = complaint.location_text.trim().match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (coords) {
      lat = parseFloat(coords[1]);
      lng = parseFloat(coords[2]);
    }
  }

  // Add parsed coordinates to response
  const response = {
    ...complaint,
    lat,
    lng
  };

  return NextResponse.json(response);
}
