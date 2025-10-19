import { NextRequest, NextResponse } from 'next/server';
import { createUserWithPassword } from '@/services/user/user-operations';
import type { DBUser } from '@/db/types';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    // Use service function to create user
    const result = await createUserWithPassword({ email, password });

    if (!result.success) {
      const statusCode = result.error?.includes('already exists') ? 409 : 500;
      return NextResponse.json({ error: result.error }, { status: statusCode });
    }

    const { user } = result.data as { user: DBUser };

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
