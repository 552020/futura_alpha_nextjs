'use server';

import { cookies } from 'next/headers';

export async function setSegmentCookie(segment: string) {
  const cookieStore = await cookies();
  cookieStore.set('segment', segment, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
    sameSite: 'lax',
  });
}
