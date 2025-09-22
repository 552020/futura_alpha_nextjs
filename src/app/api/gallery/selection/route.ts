import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sendEmail } from '@/utils/mailgun';

const TO_EMAIL = process.env.SALIH_EMAIL || 'l.mangallon@gmail.com';
const LOG_PREFIX = '[Gallery Selection]';

function log(level: 'info' | 'error' | 'warn', message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const logData = data ? `\n${JSON.stringify(data, null, 2)}` : '';
  console[level](`${timestamp} ${LOG_PREFIX} ${message}${logData}`);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 9);

  log('info', `[${requestId}] Starting gallery selection request`);

  try {
    // Authentication
    const session = await auth();
    if (!session?.user) {
      log('warn', `[${requestId}] Unauthorized access attempt`);
      return NextResponse.json(
        { error: 'Unauthorized', requestId },
        { status: 401, headers: { 'X-Request-ID': requestId } }
      );
    }

    // Request validation
    let body;
    try {
      body = await request.json();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log('error', `[${requestId}] Invalid JSON payload`, { error: errorMessage });
      return NextResponse.json(
        { error: 'Invalid JSON payload', requestId },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      );
    }

    const { images } = body;
    if (!images || !Array.isArray(images) || images.length === 0) {
      log('warn', `[${requestId}] Invalid or empty images array`, { images });
      return NextResponse.json(
        {
          error: 'Invalid request: images array is required and cannot be empty',
          requestId,
        },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      );
    }

    log('info', `[${requestId}] Processing selection`, {
      userId: session.user.id,
      imageCount: images.length,
    });

    // Prepare email content
    const subject = `New Photo Selection (${images.length} images)`;
    const text = `
Hello Salih,

A new selection of ${images.length} photos has been made by ${session.user.email || 'a user'}.

Selected Images:
${images.map((img, i) => `${i + 1}. ${img}`).join('\n')}

---
This is an automated message. Please do not reply directly to this email.
`;

    // Send email
    log('info', `[${requestId}] Sending email to ${TO_EMAIL}`, { subject });

    const emailStartTime = Date.now();
    const response = await sendEmail({
      to: TO_EMAIL,
      subject,
      text: text.trim(),
    });

    const emailDuration = Date.now() - emailStartTime;
    log('info', `[${requestId}] Email sent successfully`, {
      emailId: response.id,
      duration: `${emailDuration}ms`,
    });

    const totalDuration = Date.now() - startTime;
    return NextResponse.json(
      {
        success: true,
        requestId,
        emailId: response.id,
        duration: `${totalDuration}ms`,
      },
      {
        status: 200,
        headers: { 'X-Request-ID': requestId },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : undefined;

    log('error', `[${requestId}] Error processing request`, {
      error: errorMessage,
      stack,
      duration: `${Date.now() - startTime}ms`,
    });

    return NextResponse.json(
      {
        error: 'Failed to process photo selection',
        requestId,
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: { 'X-Request-ID': requestId },
      }
    );
  }
}
