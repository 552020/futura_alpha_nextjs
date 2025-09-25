import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sendEmail } from '@/utils/mailgun';
import { createLogger } from '@/utils/logger';

const logger = createLogger('Email Send');

type EmailRequest = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  templateName?: string;
  templateVars?: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(2, 9);
  logger.info(`[${requestId}] Starting email send request`);

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', requestId },
        { status: 401 }
      );
    }

    const body: EmailRequest = await request.json();
    const { to, subject, text, html, templateName, templateVars } = body;

    if (!to || !subject || (!text && !html)) {
      return NextResponse.json(
        { error: 'Missing required fields', requestId },
        { status: 400 }
      );
    }

    const emailData: {
      to: string | string[];
      subject: string;
      text?: string;
      html?: string;
      'h:X-Mailgun-Variables'?: string;
    } = {
      to,
      subject,
      ...(text && { text: text.trim() }),
      ...(html && { html: html.trim() }),
    };

    if (templateName || templateVars) {
      emailData['h:X-Mailgun-Variables'] = JSON.stringify({
        ...templateVars,
        templateName,
        requestId,
        userId: session.user.id,
      });
    }

    const emailResponse = await sendEmail(emailData);
    
    return NextResponse.json({
      success: true,
      requestId,
      emailId: emailResponse.id,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[${requestId}] Error: ${errorMessage}`);
    
    return NextResponse.json(
      { error: 'Failed to process request', requestId },
      { status: 500 }
    );
  }
}
