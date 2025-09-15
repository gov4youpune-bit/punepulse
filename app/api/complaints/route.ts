
export const dynamic = "force-dynamic";
export const revalidate = 0;
// app/api/complaints/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendComplaintNotification } from '@/lib/email';

export async function POST(request: Request) {
  try {
    console.log('[API] /api/complaints POST invoked'); // check server logs
    const body = await request.json();

    const {
      category,
      subtype,
      description,
      lat,
      lng,
      location_text,
      email,
      attachments = []
    } = body;

    if (!category || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const payload: any = {
      category,
      subtype,
      description,
      location_text: location_text || '',
      email: email || null,
      attachments,
      source: 'web'
    };

    if (typeof lat === 'number' && typeof lng === 'number') {
      // Use SRID if you prefer: `SRID=4326;POINT(lng lat)`
      payload.location_point = `SRID=4326;POINT(${lng} ${lat})`;
    }

    const { data, error } = await supabaseAdmin
      .from('complaints')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('[DB] insert error', error);
      return NextResponse.json({ error: 'Failed to create complaint' }, { status: 500 });
    }

    // insert audit log
    await supabaseAdmin.from('audit_logs').insert({
      complaint_id: data.id,
      actor: 'citizen',
      action: 'complaint_submitted',
      payload: {
        source: 'web',
        user_agent: request.headers.get('user-agent') ?? null
      }
    });

    // Send email notification (fire and forget)
    if (email) {
      sendComplaintNotification({
        type: 'complaint_created',
        complaint: data
      }).catch(error => {
        console.error('[EMAIL] Failed to send complaint created notification:', error);
      });
    }

    return NextResponse.json({ id: data.id, token: data.token, status: data.status }, { status: 201 });
  } catch (err: any) {
    console.error('[API] /api/complaints error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);
    const status = url.searchParams.get('status');
    const category = url.searchParams.get('category');

    let query = supabaseAdmin
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') query = query.eq('status', status);
    if (category && category !== 'all') query = query.eq('category', category);

    const { data, error } = await query;

    if (error) {
      console.error('[DB] fetch complaints error', error);
      return NextResponse.json({ error: 'Failed to fetch complaints' }, { status: 500 });
    }

    // Parse location coordinates for each complaint
    const complaintsWithCoords = data.map((complaint: any) => {
      let lat: number | null = null;
      let lng: number | null = null;

      if (complaint.location_text && typeof complaint.location_text === 'string') {
        const coords = complaint.location_text.trim().match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
        if (coords) {
          lat = parseFloat(coords[1]);
          lng = parseFloat(coords[2]);
        }
      }

      return {
        ...complaint,
        lat,
        lng
      };
    });

    return NextResponse.json({ complaints: complaintsWithCoords });
  } catch (err: any) {
    console.error('[API] /api/complaints GET error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
