export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * POST /api/admin/set-password
 * 
 * Sets password for an admin user (one-time setup)
 * Request body: { email: string, password: string }
 * 
 * This is a temporary endpoint for initial admin setup
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Email and password are required' 
      }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ 
        error: 'Password must be at least 6 characters' 
      }, { status: 400 });
    }

    // Use Supabase admin client to get user by email
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });
    
    if (userError) {
      console.error('Error fetching users:', userError);
      return NextResponse.json({ 
        error: 'Failed to fetch users' 
      }, { status: 500 });
    }

    // Find user by email
    const user = users.find(u => u.email === email);
    
    if (!user) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Check if user has admin role
    const userRole = user.user_metadata?.role;
    if (userRole !== 'admin') {
      return NextResponse.json({ 
        error: 'User is not an admin' 
      }, { status: 403 });
    }

    // Update user password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: password
    });

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json({ 
        error: 'Failed to set password' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Password set successfully' 
    }, { status: 200 });

  } catch (err: any) {
    console.error('[API] /api/admin/set-password error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
