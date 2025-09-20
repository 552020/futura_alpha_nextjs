import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';

const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY || '',
  url: 'https://api.eu.mailgun.net',
});

const DOMAIN = process.env.MAILGUN_DOMAIN || '';
const FROM_EMAIL = process.env.FROM_EMAIL || `hello@${DOMAIN}`;

export async function POST(request: NextRequest) {
  const session = await auth();

  // Check if user is admin or dev
  //   if (!session?.user?.role || !["admin", "developer", "superadmin"].includes(session.user.role)) {
  if (!session?.user.role || !['admin', 'developer', 'superadmin'].includes(session.user.role)) {
    // console.log("Current session role:", session?.user?.role);
    // console.log("Current session user:", session?.user);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { to, subject, content } = await request.json();

    // Basic validation
    if (!to || !subject || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const response = await mg.messages.create(DOMAIN, {
      from: FROM_EMAIL,
      to,
      subject,
      text: content,
    });

    return NextResponse.json({ success: true, id: response.id });
  } catch (error) {
    console.error('Mailgun test error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
