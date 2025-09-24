import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sendEmail } from '@/utils/mailgun';
import { createLogger } from '@/utils/logger';
import { renderGallerySelectionEmail } from '@/utils/email/gallerySelectionTemplate';

const TO_EMAIL = process.env.NEXT_PUBLIC_PHOTOGRAPHER_EMAIL || 'default@example.com';
const logger = createLogger('Gallery Selection');

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 9);

  logger.info(`[${requestId}] Starting gallery selection request`);

  try {
    // Authentication
    const session = await auth();
    if (!session?.user) {
      logger.warn(`[${requestId}] Unauthorized access attempt`);
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
      logger.error(`[${requestId}] Invalid JSON payload`, { error: errorMessage });
      return NextResponse.json(
        { error: 'Invalid JSON payload', requestId },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      );
    }

    const { images, message: userMessage, timestamp } = body;
    if (!images || !Array.isArray(images) || images.length === 0) {
      logger.warn(`[${requestId}] Invalid or empty images array`, { images });
      return NextResponse.json(
        {
          error: 'Invalid request: images array is required and cannot be empty',
          requestId,
        },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      );
    }

    // Sort images by rating (highest first) and get top 35
    const sortedImages = [...images].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 35);

    logger.info(`[${requestId}] Processing selection`, {
      userId: session.user.id,
      imageCount: images.length,
    });

    // Generate email content using the template
    const userName = session.user.name || session.user.email?.split('@')[0] || 'a user';
    
    const { subject, html, text } = renderGallerySelectionEmail({
      userName,
      images: sortedImages,
      message: userMessage,
      timestamp: timestamp || new Date().toISOString(),
      requestId,
    });

    // Validate email
    if (!TO_EMAIL) {
      throw new Error('Recipient email address is not configured');
    }

    // Send email
    logger.info(`[${requestId}] Sending email to ${TO_EMAIL}`, { subject });

    const emailStartTime = Date.now();

    try {
      const selectionDate = timestamp || new Date().toISOString();
      const emailResponse = await sendEmail({
        to: TO_EMAIL,
        subject,
        text: text.trim(),
        html: html.trim(),
        'h:X-Mailgun-Variables': JSON.stringify({
          userName,
          imageCount: sortedImages.length,
          selectionDate,
          userMessage,
          images: sortedImages.map((img, i) => ({
            ...img,
            position: i + 1,
            ratingStars: '★'.repeat(Math.round(img.rating || 0)) + '☆'.repeat(5 - Math.round(img.rating || 0)),
          })),
          selectionId: requestId,
          appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://futura.now',
        }),
      });

      const emailDuration = Date.now() - emailStartTime;
      logger.info(`[${requestId}] Email sent successfully`, {
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
      // Define a type for the error with optional details
      type ErrorWithDetails = Error & {
        details?: unknown;
      };

      // Extract detailed error information
      const errorDetails = {
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'UnknownError',
        stack: error instanceof Error ? error.stack : undefined,
        // Include any additional details if available
        details: (error as ErrorWithDetails)?.details ?? 'No additional details',
      };

      logger.error(`[${requestId}] Error sending email`, { 
        error: errorDetails,
        emailConfig: {
          to: TO_EMAIL,
          domain: process.env.MAILGUN_DOMAIN,
          region: process.env.MAILGUN_REGION || 'US (default)',
        }
      });
      
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send email',
          requestId,
          // In development, include more error details
          ...(process.env.NODE_ENV === 'development' ? { details: errorDetails } : {}),
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

    logger.error(`[${requestId}] Error processing request`, {
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
