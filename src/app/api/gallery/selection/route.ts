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

    const { images, message: userMessage, timestamp } = body;
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

    // Sort images by rating (highest first) and get top 35
    const sortedImages = [...images]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 35);

    log('info', `[${requestId}] Processing selection`, {
      userId: session.user.id,
      imageCount: images.length,
    });

    // Prepare email content
    const userName = session.user.name || session.user.email?.split('@')[0] || 'a user';
    const subject = `🎨 New Photo Selection from ${userName} (${sortedImages.length} images)`;
    
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    // Create HTML email content
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .message { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
        .image-card { border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
        .image-card img { width: 100%; height: 120px; object-fit: cover; }
        .image-info { padding: 10px; font-size: 14px; }
        .rating { color: #ffc107; margin-top: 5px; }
        .footer { margin-top: 30px; font-size: 12px; color: #777; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>New Photo Selection</h1>
        <p>${sortedImages.length} photos selected by ${userName}</p>
        <p>${formatDate(timestamp || new Date().toISOString())}</p>
      </div>
      
      ${userMessage ? `
      <div class="message">
        <h3>Message from ${userName}:</h3>
        <p>${userMessage}</p>
      </div>
      ` : ''}
      
      <h3>Selected Images (${sortedImages.length}):</h3>
      <div class="image-grid">
        ${sortedImages.map((img, i) => `
          <div class="image-card">
            <img src="${img.url}" alt="${img.name}" />
            <div class="image-info">
              <div><strong>#${i + 1}</strong> ${img.name}</div>
              ${img.rating ? `<div class="rating">${'★'.repeat(Math.round(img.rating))}${'☆'.repeat(5 - Math.round(img.rating))}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
      
      <div class="footer">
        <p>This is an automated message. Please do not reply directly to this email.</p>
        <p>Selection ID: ${requestId}</p>
      </div>
    </body>
    </html>
    `;
    
    // Fallback text content
    const text = `
New Photo Selection from ${userName}
${'='.repeat(50)}

${userMessage ? `Message from ${userName}:
${userMessage}

` : ''}Selected ${sortedImages.length} images:

${sortedImages.map((img, i) => {
  const rating = img.rating ? ' '.repeat(10) + 'Rating: ' + '★'.repeat(Math.round(img.rating)) + '☆'.repeat(5 - Math.round(img.rating)) : '';
  return `${i + 1}. ${img.name}${rating}`;
}).join('\n')}

View the images at: ${process.env.NEXT_PUBLIC_APP_URL || 'https://futura.now'}

---
This is an automated message. Please do not reply directly to this email.
Selection ID: ${requestId}
`;

    // Send email
    log('info', `[${requestId}] Sending email to ${TO_EMAIL}`, { subject });

    const emailStartTime = Date.now();
    
    try {
      const emailResponse = await sendEmail({
        to: TO_EMAIL,
        subject,
        text: text.trim(),
        html: html.trim(),
        'h:X-Mailgun-Variables': JSON.stringify({
          userName,
          imageCount: sortedImages.length,
          selectionDate: formatDate(timestamp || new Date().toISOString()),
          userMessage,
          images: sortedImages.map((img, i) => ({
            ...img,
            position: i + 1,
            ratingStars: '★'.repeat(Math.round(img.rating || 0)) + '☆'.repeat(5 - Math.round(img.rating || 0))
          })),
          selectionId: requestId,
          appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://futura.now'
        })
      });

      const emailDuration = Date.now() - emailStartTime;
      log('info', `[${requestId}] Email sent successfully`, {
        emailId: emailResponse.id,
        duration: `${emailDuration}ms`,
      });

      const totalDuration = Date.now() - startTime;
      return NextResponse.json(
        {
          success: true,
          requestId,
          emailId: emailResponse.id,
          selectionId: requestId,
          imageCount: sortedImages.length,
          duration: `${totalDuration}ms`,
        },
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      log('error', `[${requestId}] Error sending email`, { error });
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send email',
          requestId,
        },
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
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
