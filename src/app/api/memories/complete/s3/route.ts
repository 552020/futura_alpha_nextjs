import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { handleS3UploadCompletion } from '@/lib/s3-service';
import { isS3Configured } from '@/lib/s3';

export async function POST(req: NextRequest) {
  try {
    if (!isS3Configured()) {
      return NextResponse.json(
        { error: 'S3 storage is not configured' },
        { status: 500 }
      );
    }

    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { url } = await handleS3UploadCompletion(req);
    
    return NextResponse.json({
      success: true,
      url,
    });
  } catch (error: unknown) {
    console.error('Error completing S3 upload:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        error: 'Failed to complete upload',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight
// This is needed for the browser to make the preflight request
// when using the fetch API with custom headers
// https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#preflighted_requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400', // 24 hours
      'Vary': 'Origin',
    },
  });
}
